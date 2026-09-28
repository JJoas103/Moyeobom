const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const Notification = require('../models/Notification');

const PAGE_SIZE = 30;

const sortedPair = (a, b) => [String(a), String(b)].sort();

// 친구(accepted)인 경우에만 방을 열어 준다.
// 카카오 오픈채팅이 '모임 단체방'이라면, 이쪽은 '친구 간 대화'로 역할이 다르다.
const openRoom = async (userId, friendId) => {
    if (String(userId) === String(friendId)) {
        throw new Error('자기 자신과는 대화할 수 없습니다');
    }

    const friendship = await Friendship.findOne({
        users: sortedPair(userId, friendId),
        status: 'accepted'
    });
    if (!friendship) {
        throw new Error('친구인 경우에만 1:1 대화를 시작할 수 있습니다');
    }

    const participants = sortedPair(userId, friendId);
    let room = await ChatRoom.findOne({ participants });

    if (!room) {
        room = await ChatRoom.create({
            participants,
            friendship: friendship._id,
            unreadCount: { [String(userId)]: 0, [String(friendId)]: 0 }
        });
    }

    return room;
};

// 방 접근 권한 확인 — roomId를 주소창에 직접 입력하는 경우를 막는다
const assertMember = async (roomId, userId) => {
    const room = await ChatRoom.findById(roomId)
        .populate('participants', 'nickname profileImage avatar_emoji manner_score')
        .lean();

    if (!room) throw new Error('대화방을 찾을 수 없습니다');

    const isMember = room.participants.some((p) => String(p._id) === String(userId));
    if (!isMember) throw new Error('이 대화방에 접근할 권한이 없습니다');

    // 친구 관계가 끊기면 더 이상 대화할 수 없다
    const stillFriends = await Friendship.findOne({
        users: room.participants.map((p) => String(p._id)).sort(),
        status: 'accepted'
    }).lean();
    if (!stillFriends) throw new Error('친구 관계가 해제된 대화방입니다');

    return room;
};

const getRooms = async (userId) => {
    const rooms = await ChatRoom.find({ participants: userId })
        .populate('participants', 'nickname profileImage avatar_emoji')
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .lean();

    return rooms.map((room) => {
        const unread = room.unreadCount ? room.unreadCount[String(userId)] || 0 : 0;
        return {
            roomId: room._id,
            partner: room.participants.find((p) => String(p._id) !== String(userId)),
            lastMessage: room.lastMessage,
            lastMessageAt: room.lastMessageAt,
            unread
        };
    });
};

// 커서 기반 페이지네이션 — cursor는 더 불러올 기준이 되는 메시지의 createdAt
const getMessages = async (roomId, options = {}) => {
    const { cursor = null, limit = PAGE_SIZE } = options;

    const query = { room: roomId };
    if (cursor) query.createdAt = { $lt: new Date(cursor) };

    // 최신순으로 limit+1개를 읽어 다음 페이지 존재 여부를 판단한다
    const rows = await Message.find(query)
        .populate('sender', 'nickname profileImage avatar_emoji')
        .sort({ createdAt: -1 })
        .limit(limit + 1)
        .lean();

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
        // 화면에는 오래된 것부터 표시한다
        messages: page.reverse(),
        hasMore,
        nextCursor: hasMore && page.length > 0 ? page[0].createdAt : null
    };
};

// 메시지 저장 + 방 요약 갱신. 실시간 전송(emit)은 호출부에서 담당한다.
const sendMessage = async (roomId, senderId, text) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) throw new Error('빈 메시지는 보낼 수 없습니다');
    if (trimmed.length > 1000) throw new Error('메시지는 1000자를 넘을 수 없습니다');

    const room = await assertMember(roomId, senderId);
    const partner = room.participants.find((p) => String(p._id) !== String(senderId));

    const message = await Message.create({
        room: roomId,
        sender: senderId,
        text: trimmed
    });

    // 상대방의 안 읽은 수만 증가시킨다
    await ChatRoom.findByIdAndUpdate(roomId, {
        $set: { lastMessage: trimmed.slice(0, 100), lastMessageAt: message.createdAt },
        $inc: { [`unreadCount.${String(partner._id)}`]: 1 }
    });

    const populated = await Message.findById(message._id)
        .populate('sender', 'nickname profileImage avatar_emoji')
        .lean();

    return { message: populated, partnerId: String(partner._id), room };
};

// 방에 들어오거나 포커스를 얻었을 때 호출 — 내 안 읽은 수를 0으로 만든다
const markAsRead = async (roomId, userId) => {
    const now = new Date();

    await Message.updateMany(
        { room: roomId, sender: { $ne: userId }, readAt: null },
        { $set: { readAt: now } }
    );

    await ChatRoom.findByIdAndUpdate(roomId, {
        $set: { [`unreadCount.${String(userId)}`]: 0 }
    });

    return now;
};

const getTotalUnread = async (userId) => {
    const rooms = await ChatRoom.find({ participants: userId }).select('unreadCount').lean();
    return rooms.reduce((sum, room) => {
        const count = room.unreadCount ? room.unreadCount[String(userId)] || 0 : 0;
        return sum + count;
    }, 0);
};

// 상대가 접속 중이 아닐 수도 있으므로 알림도 함께 남긴다.
// 같은 방에서 연속으로 보낼 때 알림이 쌓이지 않도록, 읽지 않은 최근 알림이 있으면 건너뛴다.
const notifyIfIdle = async (partnerId, senderNickname, roomId) => {
    const recent = await Notification.findOne({
        user: partnerId,
        type: 'message',
        relatedLink: `/chat/${roomId}`,
        isRead: false
    }).lean();

    if (recent) return null;

    return await Notification.create({
        user: partnerId,
        type: 'message',
        message: `${senderNickname}님이 메시지를 보냈습니다.`,
        relatedLink: `/chat/${roomId}`
    });
};

module.exports = {
    openRoom,
    assertMember,
    getRooms,
    getMessages,
    sendMessage,
    markAsRead,
    getTotalUnread,
    notifyIfIdle,
    PAGE_SIZE
};
