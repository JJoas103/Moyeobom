const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/authMiddleware');
const { requireOnboarding } = require('../middlewares/authMiddleware');
const recommendController = require('../controllers/recommendController');

// 행사 검색 — 모임 개설 시 행사를 고르는 진입점이라 비로그인도 열어 둔다
router.get('/search', recommendController.getSearch);

// 개인화 추천 홈 (설문을 안 했으면 온보딩으로 먼저 보낸다)
router.get('/', isLoggedIn, requireOnboarding, recommendController.getIndex);

// 행사 상세 — 이 행사의 모임 목록 + 모임 만들기 진입점
router.get('/event/:id', recommendController.getEventDetail);

module.exports = router;
