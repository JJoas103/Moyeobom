// 문화행사 시드 — 서울 열린데이터광장 culturalEventInfo 를 Event 컬렉션에 적재한다.
//
//   npm run seed:events
//
// 수집·변환·upsert 로직은 services/eventApiService.js 의 syncEvents() 가 이미 갖고 있다.
// (페이지네이션 · 좌표 LOT/LAT 뒤바뀜 보정 · GENRE_MAP · sourceId 중복 방지)
// 여기서는 DB 를 열고 그걸 한 번 돌리고 닫는 일만 한다.
//
// 스케줄러(schedulers/congestionScheduler.js)는 혼잡도만 돌리고 있어서, 이 스크립트가
// 지금은 Event 컬렉션을 채우는 유일한 경로다. 행사 상세 화면(/event/:id)이 실제 API를
// 보므로 최소 한 번은 돌려야 화면에 내용이 찬다.

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Event = require('../models/Event');
const eventApiService = require('../services/eventApiService');

async function seed() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI 가 .env 에 없습니다.');
        process.exit(1);
    }
    if (!process.env.SEOUL_RTD_API) {
        // syncEvents() 스스로도 경고하고 건너뛰지만, 여기서 먼저 알려주는 편이 낫다
        console.warn('SEOUL_RTD_API 키가 .env 에 없습니다 — 수집이 0건으로 끝납니다.');
        console.warn('키 발급: https://data.seoul.go.kr → 인증키 신청 (무료, 즉시)\n');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('DB 연결 성공');

    const before = await Event.countDocuments();
    console.log(`동기화 전 Event ${before}건\n`);

    const { fetched, upserted } = await eventApiService.syncEvents();

    const after = await Event.countDocuments();
    const now = new Date();
    const live = await Event.countDocuments({
        $or: [{ endAt: { $gte: now } }, { endAt: null }]
    });

    console.log(`\n수신 ${fetched}건 · 반영 ${upserted}건`);
    console.log(`Event ${before} → ${after}건 (아직 안 끝난 행사 ${live}건)`);

    if (live === 0) {
        console.warn('\n아직 안 끝난 행사가 0건입니다. 행사 화면이 비어 보입니다.');
    }

    await mongoose.disconnect();
}

seed().catch(async (err) => {
    console.error('시드 오류:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
