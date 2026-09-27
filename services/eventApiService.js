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

module.exports = {
    syncEvents,
    getUpcomingEvents,
    getEventById,
    searchEvents,
    // 테스트/검증용 내부 함수 노출
    mapRow,
    normalizeCoords,
    GENRE_MAP
};
