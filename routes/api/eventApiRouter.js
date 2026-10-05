const express = require("express");
const router = express.Router();
const eventApiService = require("../../services/eventApiService");

// 행사 목록 (JSON)
//
// 행사 탐색은 로그인 전 진입점이라 비로그인도 열어 둔다.
// (recommendApiRouter 의 /search 가 같은 이유로 열려 있다)
//
// 필터 여섯 가지 — category(표시 분류) · area · genre · period · fee · keyword 와
// "모임 있는 행사만" 토글(hasMeeting)을 받는다. 정렬은 모임이 많은 순으로 고정이다.
// 행사를 고르는 기준이 "언제 하느냐"가 아니라 "같이 갈 사람이 있느냐"라고 봤기 때문이다.
router.get("/list", async (req, res, next) => {
  try {
    const result = await eventApiService.listEvents(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// 필터 드롭다운 선택지 (JSON)
//
// 지금 데이터에 실제로 있는 지역과 세부 장르만 내려준다. 서울 25개 구를 다 늘어놓으면
// 골라도 0건인 항목이 대부분이다. 목록 조회와 무관하게 화면이 한 번만 부른다.
router.get("/facets", async (req, res, next) => {
  try {
    const { areas, genres } = await eventApiService.getEventFacets();
    res.json({ success: true, areas, genres });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
