const axios = require('axios');
const Event = require('../models/Event');

// 서울 열린데이터광장 — 문화행사 정보 (culturalEventInfo)
// placeApiService와 같은 API 키/호출 패턴을 사용한다.
const API_KEY = process.env.SEOUL_RTD_API;
const API_BASE = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/culturalEventInfo`;
const PAGE_SIZE = 1000;   // 서울 API 1회 최대 요청 건수
const MAX_PAGES = 5;      // 한 번 동기화에 최대 5000건
const DELAY_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// CODENAME(대분류) → 추천에 쓸 세부 장르 태그
const GENRE_MAP = {
    '연극': ['연극', '공연'],
    '뮤지컬/오페라': ['뮤지컬', '오페라', '공연'],
    '클래식': ['클래식', '음악', '공연'],
    '국악': ['국악', '음악', '공연'],
    '무용': ['무용', '공연'],
    '콘서트': ['콘서트', '음악', '공연'],
    '독주/독창회': ['클래식', '음악', '공연'],
    '전시/미술': ['전시', '미술'],
    '영화': ['영화'],
    '축제-문화/예술': ['축제', '문화'],
    '축제-전통/역사': ['축제', '역사'],
    '축제-자연/경관': ['축제', '자연'],
    '축제-시민화합': ['축제', '문화'],
    '축제-기타': ['축제'],
    '교육/체험': ['체험', '교육'],
    '기타': ['문화']
};

// 서울 API의 LOT/LAT는 데이터셋에 따라 뒤바뀌어 들어오는 경우가 있다.
// 서울 위경도 범위(위도 37.4~37.7 / 경도 126.7~127.2)로 판별해 바로잡는다.
const normalizeCoords = (rawLot, rawLat) => {
    const a = parseFloat(rawLot);
    const b = parseFloat(rawLat);
    if (!isFinite(a) || !isFinite(b)) return { lat: null, lng: null };

    const looksLikeLat = (v) => v > 37.0 && v < 38.0;
    const looksLikeLng = (v) => v > 126.0 && v < 128.0;

    if (looksLikeLat(a) && looksLikeLng(b)) return { lat: a, lng: b };
    if (looksLikeLat(b) && looksLikeLng(a)) return { lat: b, lng: a };
    return { lat: null, lng: null };
};

const parseDate = (value) => {
    if (!value) return null;
    const d = new Date(String(value).trim().replace(/\./g, '-'));
    return isNaN(d.getTime()) ? null : d;
};

// 서울 API 응답 1건 → Event 문서 형태
const mapRow = (row) => {
    const codename = row.CODENAME || '기타';
    const { lat, lng } = normalizeCoords(row.LOT, row.LAT);
    const startAt = parseDate(row.STRTDATE);
    const endAt = parseDate(row.END_DATE);

    // 서울 API에는 고유 ID 필드가 없어 제목+시작일+장소로 식별자를 만든다
    const sourceId = `seoul:${row.TITLE}|${row.STRTDATE}|${row.PLACE}`.slice(0, 300);

    return {
        sourceId,
        title: (row.TITLE || '').trim(),
        category: codename,
        genres: GENRE_MAP[codename] || GENRE_MAP['기타'],
        venue: (row.PLACE || '').trim(),
        address: (row.PLACE || '').trim(),
        area: (row.GUNAME || '').trim(),
        coords: { lat, lng },
        startAt,
        endAt,
        price: row.IS_FREE === '무료' ? '무료' : (row.USE_FEE || '').trim(),
        posterUrl: (row.MAIN_IMG || '').trim(),
        detailUrl: (row.ORG_LINK || row.HMPG_ADDR || '').trim()
    };
};

const fetchPage = async (start, end) => {
    const url = `${API_BASE}/${start}/${end}/`;
    const response = await axios.get(url, { timeout: 15000 });
    const body = response.data?.culturalEventInfo;
    if (!body) {
        const code = response.data?.RESULT?.CODE || 'UNKNOWN';
        throw new Error(`문화행사 API 응답 이상 (${code})`);
    }
    return body.row || [];
};

// 전체 동기화 — 스케줄러와 수동 스크립트가 함께 쓴다
const syncEvents = async () => {
    if (!API_KEY) {
        console.warn('[문화행사] SEOUL_RTD_API 키가 없어 동기화를 건너뜁니다');
        return { fetched: 0, upserted: 0 };
    }

    let fetched = 0;
    let upserted = 0;

    for (let page = 0; page < MAX_PAGES; page++) {
        const start = page * PAGE_SIZE + 1;
        const end = start + PAGE_SIZE - 1;

        let rows;
        try {
            rows = await fetchPage(start, end);
        } catch (err) {
            console.error(`[문화행사] ${start}~${end} 조회 실패:`, err.message);
            break;
        }

        if (rows.length === 0) break;
        fetched += rows.length;

        const operations = rows
            .map(mapRow)
            .filter((doc) => doc.title && doc.sourceId)
            .map((doc) => ({
                updateOne: {
                    filter: { sourceId: doc.sourceId },
                    update: { $set: doc },
                    upsert: true
                }
            }));

        if (operations.length > 0) {
            const result = await Event.bulkWrite(operations, { ordered: false });
            upserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);
        }

        if (rows.length < PAGE_SIZE) break;
        await sleep(DELAY_MS);
    }

    console.log(`[문화행사] 동기화 완료 — 수신 ${fetched}건, 반영 ${upserted}건`);
    return { fetched, upserted };
};

// 아직 끝나지 않은 행사만 (추천 후보군)
const getUpcomingEvents = async (limit = 300) => {
    const now = new Date();
    return await Event.find({
        $or: [{ endAt: { $gte: now } }, { endAt: null }]
    })
        .sort({ startAt: 1 })
        .limit(limit)
        .lean();
};

const getEventById = async (id) => {
    return await Event.findById(id).lean();
};

const searchEvents = async (keyword, limit = 30) => {
    const now = new Date();
    const query = {
        $or: [{ endAt: { $gte: now } }, { endAt: null }]
    };
    if (keyword) {
        query.$and = [
            {
                $or: [
                    { title: { $regex: keyword, $options: 'i' } },
                    { venue: { $regex: keyword, $options: 'i' } },
                    { area: { $regex: keyword, $options: 'i' } },
                    { category: { $regex: keyword, $options: 'i' } }
                ]
            }
        ];
    }
    return await Event.find(query).sort({ startAt: 1 }).limit(limit).lean();
};

// ──────────────────────────────────────────────────────────────
// 목록 조회 — GET /api/event/list · /api/event/facets 가 쓴다
// ──────────────────────────────────────────────────────────────

// 화면의 표시 분류(여섯 갈래) → 서울 CODENAME 집합.
//
// frontend/src/utils/eventCategory.js 의 GROUP_BY_CODENAME 과 쌍이다. CODENAME 은
// "뮤지컬/오페라" 처럼 길고 많아서 화면이 여섯 개로 접어 쓰는데, 필터 칩이 보내는 값은
// 그 접힌 이름이다. 서버는 그걸 다시 CODENAME 으로 펼쳐야 한다.
// 한쪽만 고치면 필터가 0건을 내므로 바꿀 때는 두 곳을 같이 본다.
//
// '축제' 는 '축제-문화/예술' 처럼 접두사로 묶인 분류라 표에 넣지 않고 buildCategoryFilter
// 에서 정규식으로 받는다.
const CODENAMES_BY_GROUP = {
    '공연': ['뮤지컬/오페라', '콘서트', '무용'],
    '연극': ['연극'],
    '영화': ['영화'],
    '전시': ['전시/미술'],
    '클래식 · 국악': ['클래식', '국악', '독주/독창회']
};

// "아직 안 끝난 행사" — getUpcomingEvents · searchEvents 와 같은 조건이다.
// 종료일이 없는 상설 행사도 남긴다.
const liveCondition = (now = new Date()) => ({
    $or: [{ endAt: { $gte: now } }, { endAt: null }]
});

// 표시 분류 → $match 조각
const buildCategoryFilter = (group) => {
    const name = String(group || '').trim();
    if (!name) return null;
    if (name === '축제') return { category: { $regex: '^축제' } };

    const codenames = CODENAMES_BY_GROUP[name];
    // 표에 없으면 CODENAME 을 직접 보낸 것으로 보고 그대로 맞춘다
    return codenames ? { category: { $in: codenames } } : { category: name };
};

// 기간 필터의 시작일 상한. 프론트 data/events.js 의 matchPeriod 와 같은 경계다.
// "종료일이 지금보다 뒤" 쪽은 liveCondition 이 이미 담당하므로 여기서는 상한만 만든다.
const periodBound = (period, now = new Date()) => {
    if (!period) return null;

    const bound = new Date(now);
    bound.setHours(23, 59, 59, 999);          // 'today' 는 오늘 끝까지
    if (period === 'week') bound.setDate(bound.getDate() + 7);
    if (period === 'month') bound.setDate(bound.getDate() + 30);
    return bound;
};

// 서울 API 의 price 는 자유 문자열이다 ("무료", "전석 40,000원", ""). 무료 여부만 가른다.
// 프론트 matchFee 가 값이 없는 것을 무료로 보므로 서버도 빈 문자열·null·필드 없음을 무료로 둔다.
const FREE_PRICES = ['', '무료', null];

const buildFeeFilter = (fee) => {
    if (fee === 'free') return { price: { $in: FREE_PRICES } };
    if (fee === 'paid') return { price: { $nin: FREE_PRICES } };
    return null;
};

// 검색어가 그대로 정규식이 되면 사용자가 '(' 하나만 쳐도 조회가 터진다
// 메타문자 앞에 역슬래시를 붙여 글자 그대로 찾게 한다.
const BACKSLASH = String.fromCharCode(92);
const REGEX_META = new Set(['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', BACKSLASH]);

const escapeRegex = (value) =>
    String(value)
        .split('')
        .map((ch) => (REGEX_META.has(ch) ? BACKSLASH + ch : ch))
        .join('');

// searchEvents 와 같은 네 필드를 본다
const buildKeywordFilter = (keyword) => {
    const text = String(keyword || '').trim();
    if (!text) return null;

    const rx = { $regex: escapeRegex(text), $options: 'i' };
    return { $or: [{ title: rx }, { venue: rx }, { area: rx }, { category: rx }] };
};

const isTruthyFlag = (value) =>
    value === true || value === 'true' || value === '1' || value === 'on';

const LIST_LIMIT_DEFAULT = 15;   // 목록이 한 페이지에 15건 (프론트 fetchEvents 와 같다)
const LIST_LIMIT_MAX = 60;

/**
 * 행사 목록 — 필터 6종 · 모임 많은 순 정렬 · 페이지네이션.
 *
 * 프론트 data/events.js 의 fetchEvents 가 목업으로 하던 일을 그대로 옮긴 것이라
 * 응답 모양도 그쪽에 맞춘다: { events, totalCount, totalPages, currentPage }
 */
const listEvents = async (query = {}) => {
    const { category, area, genre, period, keyword, fee, hasMeeting } = query;
    const now = new Date();

    const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
    const limitNum = Math.min(
        LIST_LIMIT_MAX,
        Math.max(1, parseInt(query.limit, 10) || LIST_LIMIT_DEFAULT)
    );

    // liveCondition · fee · keyword 가 모두 $or 를 쓴다. 한 객체에 겹쳐 담으면 뒤 $or 가
    // 앞을 덮어 조건이 조용히 사라지므로 $and 로 모은다.
    const conditions = [liveCondition(now)];

    const categoryFilter = buildCategoryFilter(category);
    if (categoryFilter) conditions.push(categoryFilter);
    if (area) conditions.push({ area });
    if (genre) conditions.push({ genres: genre });      // 배열 필드 — 요소 하나만 맞으면 된다

    const bound = periodBound(period, now);
    if (bound) conditions.push({ startAt: { $lte: bound } });

    const feeFilter = buildFeeFilter(fee);
    if (feeFilter) conditions.push(feeFilter);

    const keywordFilter = buildKeywordFilter(keyword);
    if (keywordFilter) conditions.push(keywordFilter);

    const pipeline = [
        { $match: { $and: conditions } },
        // 이 행사로 열린 모임 수. 카드에 적고 정렬 기준으로도 쓴다.
        // 페이지를 자른 뒤에 세면 "모임 많은 순"이 그 페이지 안에서만 맞으므로 먼저 센다.
        {
            $lookup: {
                from: 'meetings',
                localField: '_id',
                foreignField: 'event',
                as: 'openMeetings',
                pipeline: [{ $match: { status: { $ne: 'completed' } } }]
            }
        },
        { $addFields: { openMeetingCount: { $size: '$openMeetings' } } },
        { $project: { openMeetings: 0 } }
    ];

    if (isTruthyFlag(hasMeeting)) {
        pipeline.push({ $match: { openMeetingCount: { $gt: 0 } } });
    }

    // 프론트 fetchEvents 의 정렬과 같다 — 모임이 많은 순, 같으면 곧 시작하는 것 먼저.
    // _id 를 마지막에 두는 것은 동점끼리 순서가 흔들려 페이지 사이에 같은 행사가
    // 두 번 나오거나 빠지는 것을 막기 위해서다.
    pipeline.push({ $sort: { openMeetingCount: -1, startAt: 1, _id: 1 } });

    // 목록과 전체 건수를 한 번의 조회로 받는다
    pipeline.push({
        $facet: {
            items: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
            total: [{ $count: 'count' }]
        }
    });

    const [result] = await Event.aggregate(pipeline);
    const events = (result && result.items) || [];
    const totalCount = (result && result.total[0] && result.total[0].count) || 0;

    return {
        events,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limitNum)),
        currentPage: pageNum
    };
};

/**
 * 필터 드롭다운에 채울 선택지 — 지금 데이터에 실제로 있는 지역과 세부 장르.
 *
 * 서울 25개 구를 다 늘어놓으면 골라도 0건인 항목이 대부분이라 있는 것만 준다.
 * 지역 표기 순서는 프론트 data/eventOptions.js 의 SEOUL_AREAS 를 따라야 하는데 그 표가
 * 화면 쪽에만 있다. 여기서는 목록만 주고 순서는 화면이 맞춘다.
 */
const getEventFacets = async () => {
    const live = liveCondition();

    const [areas, genres] = await Promise.all([
        Event.distinct('area', live),
        Event.distinct('genres', live)
    ]);

    const byKorean = (a, b) => a.localeCompare(b, 'ko');

    return {
        areas: areas.filter(Boolean).sort(byKorean),
        genres: genres.filter(Boolean).sort(byKorean)
    };
};

module.exports = {
    syncEvents,
    getUpcomingEvents,
    getEventById,
    searchEvents,
    listEvents,
    getEventFacets,
    // 테스트/검증용 내부 함수 노출
    mapRow,
    normalizeCoords,
    GENRE_MAP,
    CODENAMES_BY_GROUP
};
