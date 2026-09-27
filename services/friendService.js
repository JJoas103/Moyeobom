const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const MeetingReview = require('../models/MeetingReview');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const userService = require('./userService');
const recommendService = require('./recommendService');

// 평가 마감 — 모임 종료(completedAt) 후 72시간
const REVIEW_WINDOW_HOURS = 72;
// 친구가 성립했을 때 양쪽에 주는 매너 점수
const MATCH_SCORE = 2;

const sortedPair = (a, b) => [String(a), String(b)].sort();

// 평가 가능 여부 + 평가 화면에 필요한 정보를 한 번에 계산한다
const getReviewContext = async (meetingId, userId) => {
    const meeting = await Meeting.findById(meetingId)
        .populate('participants', 'nickname profileImage avatar_emoji manner_score')
        .populate('author', 'nickname profileImage avatar_emoji manner_score')
        .populate('event', 'title category genres')
        .lean();

    if (!meeting) throw new Error('모임을 찾을 수 없습니다');

    const participantIds = (meeting.participants || []).map((p) => String(p._id));
    if (!participantIds.includes(String(userId))) {
        throw new Error('참여하지 않은 모임은 평가할 수 없습니다');
    }

    if (meeting.status !== 'completed') {
        throw new Error('아직 종료되지 않은 모임입니다');
    }

    const closedAt = meeting.completedAt || meeting.meetingDate;
    const deadline = new Date(new Date(closedAt).getTime() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000);
    if (new Date() > deadline) {
        throw new Error('평가 기간이 지났습니다 (모임 종료 후 72시간)');
    }

    const existing = await MeetingReview.findOne({ meeting: meetingId, reviewer: userId }).lean();

    // 나를 제외한 같이 참여한 사람들
    const others = (meeting.participants || []).filter((p) => String(p._id) !== String(userId));

    return { meeting, others, deadline, existingReview: existing };
};

// ---------------------------------------------------------------------------
// 평가 제출 → 상호 친구 매칭
//
// 한쪽만 지목한 상태(pending)는 상대에게 어떤 알림도 보내지 않는다.
// 양쪽이 서로를 지목했을 때만 accepted로 바뀌고, 그때 비로소 양쪽에 알린다.
// 거절이 상대에게 보이지 않는 구조라 부담 없이 응답할 수 있다.
// ---------------------------------------------------------------------------
const submitReview = async (meetingId, userId, satisfied, targetIds = []) => {
    const { meeting, others } = await getReviewContext(meetingId, userId);

    const otherIds = new Set(others.map((p) => String(p._id)));
    // 실제 참여자가 아닌 id가 폼으로 넘어오는 경우를 걸러낸다
    const wanted = [...new Set(targetIds.map(String))].filter((id) => otherIds.has(id));

    const targets = others.map((p) => ({
        user: p._id,
        wantFriend: satisfied && wanted.includes(String(p._id))
    }));

    let review;
    try {
        review = await MeetingReview.create({
            meeting: meetingId,
            reviewer: userId,
            satisfied,
            targets
        });
    } catch (err) {
        if (err.code === 11000) throw new Error('이미 평가를 제출한 모임입니다');
        throw err;
    }

    // 활동 이력 (매너 점수 변동은 없음 — 평가 자체는 보상하지 않는다)
    await Activity.create({
        user: userId,
        type: 'review_submit',
        message: `"${meeting.title}" 모임 평가 완료`,
        relatedLink: `/meeting/info/${meetingId}`
    });

    // 만족한 모임의 행사 장르를 취향 벡터에 누적 → 다음 추천에 반영된다
    if (satisfied && meeting.event) {
        const tags = [...(meeting.event.genres || []), meeting.event.category].filter(Boolean);
        await recommendService.reinforceTaste(userId, tags);
    }

    if (!satisfied || wanted.length === 0) {
        return { review, matched: [] };
    }

    const matched = [];
    for (const targetId of wanted) {
        const result = await linkFriendship(userId, targetId, meetingId);
        if (result.matched) matched.push(result.friendship);
    }

    return { review, matched };
};

// 한 쌍에 대한 친구 관계 갱신. 상호 지목이면 accepted로 승격한다.
const linkFriendship = async (userId, targetId, meetingId) => {
    const users = sortedPair(userId, targetId);
    let friendship = await Friendship.findOne({ users });

    // 이미 친구면 아무것도 하지 않는다
    if (friendship && friendship.status === 'accepted') {
        return { matched: false, friendship };
    }

    // 상대가 먼저 나를 지목해 둔 상태인지 확인 (pending의 신청자가 상대인 경우)
    const counterpartWaiting =
        friendship &&
        friendship.status === 'pending' &&
        String(friendship.requester) !== String(userId);

    if (counterpartWaiting) {
        friendship.status = 'accepted';
        friendship.respondedAt = new Date();
        await friendship.save();

        await celebrateMatch(friendship, userId, targetId, meetingId);
        return { matched: true, friendship };
    }

    if (friendship) {
        // 내가 이미 신청해 둔 상태 — 중복 신청은 무시
        return { matched: false, friendship };
    }

    friendship = await Friendship.create({
        users,
        requester: userId,
        sourceMeeting: meetingId,
        status: 'pending'
    });

    // 여기서는 상대에게 알림을 보내지 않는다 (일방 지목 비노출이 설계의 핵심)
    return { matched: false, friendship };
};

// 친구 성립 시 양쪽에 알림 + 매너 점수 + 활동 기록
const celebrateMatch = async (friendship, userIdA, userIdB, meetingId) => {
    const [userA, userB] = await Promise.all([
        mongoose.model('User').findById(userIdA).select('nickname').lean(),
        mongoose.model('User').findById(userIdB).select('nickname').lean()
    ]);

    const pairs = [
        { me: userIdA, other: userB },
        { me: userIdB, other: userA }
    ];

    for (const { me, other } of pairs) {
        const otherName = other ? other.nickname : '상대방';

        await Notification.create({
            user: me,
            type: 'friend',
            message: `${otherName}님과 친구가 되었습니다. 이제 1:1 대화를 나눌 수 있어요.`,
            relatedLink: '/friend/list'
        });

        const { actualChange } = (await userService.updateMannerScore(me, MATCH_SCORE)) || {};

        await Activity.create({
            user: me,
            type: 'friend_matched',
            message: `${otherName}님과 친구 맺기 성공`,
            scoreChange: actualChange,
            relatedLink: '/friend/list'
        });
    }

    return friendship;
};

// 친구 성립을 실시간으로 알린다 (양쪽 개인 룸). 컨트롤러에서 io를 넘겨 호출한다.
const emitMatch = (io, friendship) => {
    if (!io || !friendship) return;
    for (const userId of friendship.users) {
        io.to(`user:${String(userId)}`).emit('friendMatched', {
            friendshipId: String(friendship._id),
            message: '새 친구가 생겼습니다!'
        });
    }
};

const getFriends = async (userId) => {
    const friendships = await Friendship.find({ users: userId, status: 'accepted' })
        .populate('users', 'nickname profileImage avatar_emoji manner_score address')
        .populate('sourceMeeting', 'title meetingDate')
        .sort({ respondedAt: -1 })
        .lean();

    return friendships.map((f) => ({
        friendshipId: f._id,
        friend: f.users.find((u) => String(u._id) !== String(userId)),
        sourceMeeting: f.sourceMeeting,
        since: f.respondedAt || f.updatedAt
    }));
};

const areFriends = async (userIdA, userIdB) => {
    const friendship = await Friendship.findOne({
        users: sortedPair(userIdA, userIdB),
        status: 'accepted'
    }).lean();
    return Boolean(friendship);
};

const removeFriend = async (userId, friendId) => {
    const friendship = await Friendship.findOne({ users: sortedPair(userId, friendId) });
    if (!friendship) throw new Error('친구 관계를 찾을 수 없습니다');
    if (!friendship.users.some((u) => String(u) === String(userId))) {
        throw new Error('권한이 없습니다');
    }
    await Friendship.findByIdAndDelete(friendship._id);
    return friendship;
};

// 아직 평가하지 않은, 기간이 남은 종료 모임 목록 (마이페이지·알림용)
const getPendingReviews = async (userId) => {
    const since = new Date(Date.now() - REVIEW_WINDOW_HOURS * 60 * 60 * 1000);

    const meetings = await Meeting.find({
        participants: userId,
        status: 'completed',
        completedAt: { $gte: since }
    })
        .select('title meetingDate completedAt area')
        .sort({ completedAt: -1 })
        .lean();

    if (meetings.length === 0) return [];

    const reviewed = await MeetingReview.find({
        reviewer: userId,
        meeting: { $in: meetings.map((m) => m._id) }
    })
        .select('meeting')
        .lean();

    const reviewedIds = new Set(reviewed.map((r) => String(r.meeting)));
    return meetings.filter((m) => !reviewedIds.has(String(m._id)));
};

module.exports = {
    getReviewContext,
    submitReview,
    linkFriendship,
    emitMatch,
    getFriends,
    areFriends,
    removeFriend,
    getPendingReviews,
    sortedPair,
    REVIEW_WINDOW_HOURS,
    MATCH_SCORE
};
