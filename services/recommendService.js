const Event = require('../models/Event');
const Meeting = require('../models/Meeting');
const Place = require('../models/Place');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { expandHobbies } = require('../config/onboardingOptions');

// ---------------------------------------------------------------------------
// 행사 추천 엔진
//
// 단순 필터링과의 차이는 두 가지다.
//   1) 여러 요소에 가중치를 매겨 "순위"를 만든다 (조건에 맞는 것만 걸러내는 게 아니다)
//   2) 각 행사가 왜 추천됐는지 근거(reasons)를 함께 반환해 화면에 노출한다
//
// 참여 이력이 없는 신규 유저(콜드스타트)는 이력·소셜 가중치를 0으로 두고
// 나머지 가중치를 정규화해 설문만으로도 순위가 나오게 한다.
// ---------------------------------------------------------------------------

const BASE_WEIGHTS = {
    taste: 30,    // 설문 취향 ∩ 행사 장르
    history: 25,  // 과거 만족했던 모임의 장르 (tasteVector)
    social: 20,   // 친구 / 친구의 친구가 참여 중
    area: 12,     // 선호 지역 / 내 동네
    time: 8,      // 선호 시간대
    calm: 5       // 주변 혼잡도 여유
};

// 이력 가중치의 시간 감쇠 — 최근 취향일수록 크게 반영
const TASTE_DECAY = 0.9;
const TASTE_GAIN = 1.0;

const EARTH_R = 6371;

const haversineKm = (lat1, lng1, lat2, lng2) => {
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return EARTH_R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const overlap = (a = [], b = []) => {
    if (!a.length || !b.length) return [];
    const setB = new Set(b.map((v) => String(v).trim()).filter(Boolean));
    return [...new Set(a.map((v) => String(v).trim()).filter((v) => v && setB.has(v)))];
};

// Mongoose Map / 일반 객체 / lean() 결과를 모두 평범한 객체로 통일
const toPlainVector = (vector) => {
    if (!vector) return {};
    if (typeof vector.entries === 'function' && !Array.isArray(vector)) {
        return Object.fromEntries(vector.entries());
    }
    return { ...vector };
};

// ---------------------------------------------------------------------------
// 컨텍스트 — 행사마다 다시 조회하지 않도록 한 번에 모아둔다
// ---------------------------------------------------------------------------
const buildContext = async (user) => {
    const userId = String(user._id);

    // 1) 내 친구 (accepted만)
    const friendships = await Friendship.find({ users: user._id, status: 'accepted' }).lean();
    const friendIds = friendships.map((f) => String(f.users.find((u) => String(u) !== userId)));

    // 2) 친구의 친구 — 내 친구와 이미 친구인 사람 (나 자신과 내 친구는 제외)
    let fofIds = [];
    if (friendIds.length > 0) {
        const secondDegree = await Friendship.find({
            users: { $in: friendIds },
            status: 'accepted'
        }).lean();
        const exclude = new Set([userId, ...friendIds]);
        fofIds = [
            ...new Set(
                secondDegree
                    .flatMap((f) => f.users.map(String))
                    .filter((id) => !exclude.has(id))
            )
        ];
    }

    // 3) 아직 안 끝난 모임을 행사별로 묶어 참여자 목록을 만든다
    const now = new Date();
    const openMeetings = await Meeting.find({
        event: { $ne: null },
        meetingDate: { $gte: now },
        status: { $ne: 'completed' }
    })
        .select('event participants title status maxParticipants')
        .lean();

    const meetingsByEvent = new Map();
    for (const meeting of openMeetings) {
        const key = String(meeting.event);
        if (!meetingsByEvent.has(key)) meetingsByEvent.set(key, []);
        meetingsByEvent.get(key).push(meeting);
    }

    // 4) 혼잡도 — 좌표 기준으로 가장 가까운 장소의 현재 혼잡도를 쓴다
    const places = await Place.find({ latitude: { $ne: null }, longitude: { $ne: null } })
        .select('name latitude longitude congest_lvl')
        .lean();

    const historySize = Object.keys(toPlainVector(user.tasteVector)).length;

    return {
        userId,
        friendIds: new Set(friendIds),
        fofIds: new Set(fofIds),
        meetingsByEvent,
        places,
        // 이력도 친구도 없으면 콜드스타트로 간주
        isColdStart: historySize === 0 && friendIds.length === 0,
        now
    };
};

// 콜드스타트면 이력·소셜을 빼고 나머지를 합계 100으로 재정규화
const resolveWeights = (isColdStart) => {
    if (!isColdStart) return { ...BASE_WEIGHTS };

    const active = { ...BASE_WEIGHTS, history: 0, social: 0 };
    const total = Object.values(active).reduce((sum, v) => sum + v, 0);
    if (total === 0) return active;

    const scale = 100 / total;
    return Object.fromEntries(Object.entries(active).map(([k, v]) => [k, v * scale]));
};

const nearestPlace = (places, lat, lng) => {
    if (lat == null || lng == null) return null;
    let best = null;
    let bestDist = Infinity;
    for (const place of places) {
        const dist = haversineKm(lat, lng, place.latitude, place.longitude);
        if (dist < bestDist) {
            bestDist = dist;
            best = place;
        }
    }
    return best && bestDist <= 3 ? { place: best, distanceKm: bestDist } : null;
};

// 행사 시작 시각 -> '평일낮' / '평일저녁' / '주말낮' / '주말저녁'
const timeSlotOf = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dayPart = d.getHours() >= 17 ? '저녁' : '낮';
    const weekPart = isWeekend ? '주말' : '평일';
    return weekPart + dayPart;
};

// ---------------------------------------------------------------------------
// 행사 1건 채점
// ---------------------------------------------------------------------------
const scoreEvent = (user, event, ctx) => {
    const weights = resolveWeights(ctx.isColdStart);
    const prefs = user.preferences || {};
    const taste = toPlainVector(user.tasteVector);
    const reasons = [];
    let score = 0;

    const eventTags = [...(event.genres || []), event.category].filter(Boolean);

    // --- 1. 설문 취향 매칭 -------------------------------------------------
    // 취미는 행사 태그로 펼쳐서 장르와 같은 축에서 비교한다
    const declared = [...(prefs.genres || []), ...expandHobbies(prefs.hobbies || [])];
    const matchedTags = overlap(declared, eventTags);
    if (matchedTags.length > 0) {
        // 1개 맞으면 0.6, 2개 0.85, 3개 이상 1.0 — 하나만 맞아도 충분히 인정
        const ratio = Math.min(1, 0.6 + (matchedTags.length - 1) * 0.25);
        score += weights.taste * ratio;
        reasons.push({
            factor: 'taste',
            label: '취향',
            detail: matchedTags.join(' · ') + ' 선택함',
            weight: Math.round(weights.taste * ratio)
        });
    }

    // --- 2. 이력 가중 (과거 만족한 모임의 장르) ----------------------------
    if (weights.history > 0) {
        const hits = eventTags.filter((tag) => taste[tag] > 0);
        if (hits.length > 0) {
            const raw = hits.reduce((sum, tag) => sum + taste[tag], 0);
            // 누적 점수를 0~1로 눌러 담는다 (3점이면 거의 만점)
            const ratio = Math.min(1, raw / 3);
            score += weights.history * ratio;
            reasons.push({
                factor: 'history',
                label: '이력',
                detail: '지난 ' + hits.join(' · ') + ' 모임에 만족함',
                weight: Math.round(weights.history * ratio)
            });
        }
    }

    // --- 3. 소셜 (친구 / 친구의 친구가 참여 중) ----------------------------
    if (weights.social > 0) {
        const meetings = ctx.meetingsByEvent.get(String(event._id)) || [];
        const participantIds = new Set(meetings.flatMap((m) => (m.participants || []).map(String)));

        const friendCount = [...participantIds].filter((id) => ctx.friendIds.has(id)).length;
        const fofCount = [...participantIds].filter((id) => ctx.fofIds.has(id)).length;

        if (friendCount > 0) {
            const ratio = Math.min(1, 0.7 + (friendCount - 1) * 0.15);
            score += weights.social * ratio;
            reasons.push({
                factor: 'social',
                label: '친구',
                detail: '친구 ' + friendCount + '명이 참여 중',
                weight: Math.round(weights.social * ratio)
            });
        } else if (fofCount > 0) {
            const ratio = Math.min(0.5, 0.3 + (fofCount - 1) * 0.1);
            score += weights.social * ratio;
            reasons.push({
                factor: 'social',
                label: '친구의 친구',
                detail: '아는 사람의 친구 ' + fofCount + '명이 참여 중',
                weight: Math.round(weights.social * ratio)
            });
        }
    }

    // --- 4. 지역 ----------------------------------------------------------
    const myAreas = [...(prefs.preferredAreas || [])];
    if (user.address) myAreas.push(user.address);
    const areaHit = myAreas.find(
        (area) => area && event.area && (event.area.includes(area) || area.includes(event.area))
    );
    if (areaHit) {
        score += weights.area;
        reasons.push({
            factor: 'area',
            label: '지역',
            detail: event.area + ' — 자주 가는 지역',
            weight: Math.round(weights.area)
        });
    }

    // --- 5. 시간대 --------------------------------------------------------
    // 장기 전시처럼 7일 넘게 이어지는 행사는 아무 때나 갈 수 있으므로 중립 처리
    const spanDays =
        event.startAt && event.endAt
            ? (new Date(event.endAt) - new Date(event.startAt)) / (1000 * 60 * 60 * 24)
            : 0;
    const slot = timeSlotOf(event.startAt);
    const preferredTimes = prefs.preferredTime || [];
    if (spanDays > 7) {
        score += weights.time * 0.5;
    } else if (slot && preferredTimes.includes(slot)) {
        score += weights.time;
        reasons.push({
            factor: 'time',
            label: '시간대',
            detail: slot + '에 열림',
            weight: Math.round(weights.time)
        });
    }

    // --- 6. 주변 혼잡도 여유 ------------------------------------------------
    const near = nearestPlace(ctx.places, event.coords && event.coords.lat, event.coords && event.coords.lng);
    if (near && near.place.congest_lvl === '여유') {
        score += weights.calm;
        reasons.push({
            factor: 'calm',
            label: '여유',
            detail: near.place.name + ' 일대가 한산함',
            weight: Math.round(weights.calm)
        });
    }

    // --- 7. 신선도 (감점) ---------------------------------------------------
    // 이미 시작한 행사는 소폭, 곧 끝나는 행사는 크게 깎는다
    if (event.endAt) {
        const daysLeft = (new Date(event.endAt) - ctx.now) / (1000 * 60 * 60 * 24);
        if (daysLeft < 0) {
            score = 0;
        } else if (daysLeft < 2) {
            score *= 0.7;
        }
    }
    // 하루짜리 행사가 이미 지났으면 후보에서 제외
    if (event.startAt && new Date(event.startAt) < ctx.now && spanDays <= 1) {
        score = 0;
    }

    return {
        score: Math.round(score * 100) / 100,
        reasons: reasons.sort((a, b) => b.weight - a.weight)
    };
};

// ---------------------------------------------------------------------------
// 추천 목록
// ---------------------------------------------------------------------------
const recommendEvents = async (user, options = {}) => {
    const { limit = 12, category = null, candidatePool = 300 } = options;

    const now = new Date();
    const query = { $or: [{ endAt: { $gte: now } }, { endAt: null }] };
    if (category) query.category = category;

    const [events, ctx] = await Promise.all([
        Event.find(query).sort({ startAt: 1 }).limit(candidatePool).lean(),
        buildContext(user)
    ]);

    const scored = events
        .map((event) => {
            const { score, reasons } = scoreEvent(user, event, ctx);
            const meetings = ctx.meetingsByEvent.get(String(event._id)) || [];
            return { event, score, reasons, openMeetingCount: meetings.length };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    const prefs = user.preferences || {};

    return {
        items: scored,
        isColdStart: ctx.isColdStart,
        // 설문을 아예 안 한 사용자에게는 화면에서 온보딩을 다시 권한다
        hasPreferences: Boolean((prefs.genres || []).length || (prefs.hobbies || []).length)
    };
};

// ---------------------------------------------------------------------------
// 이력 반영 — 만족한 모임의 장르를 tasteVector에 누적한다.
// 기존 값은 TASTE_DECAY로 감쇠시켜 최근 취향이 더 크게 반영되도록 한다.
// ---------------------------------------------------------------------------
const reinforceTaste = async (userId, tags = [], gain = TASTE_GAIN) => {
    if (!tags.length) return null;

    const user = await User.findById(userId);
    if (!user) return null;

    const current = toPlainVector(user.tasteVector);
    const next = {};

    for (const [key, value] of Object.entries(current)) {
        const decayed = value * TASTE_DECAY;
        // 먼지값은 버려서 벡터가 무한히 커지지 않게 한다
        if (decayed >= 0.05) next[key] = Math.round(decayed * 1000) / 1000;
    }
    for (const tag of [...new Set(tags.filter(Boolean))]) {
        next[tag] = Math.round(((next[tag] || 0) + gain) * 1000) / 1000;
    }

    user.tasteVector = next;
    await user.save();
    return next;
};

module.exports = {
    recommendEvents,
    scoreEvent,
    buildContext,
    reinforceTaste,
    toPlainVector,
    resolveWeights,
    timeSlotOf,
    BASE_WEIGHTS
};
