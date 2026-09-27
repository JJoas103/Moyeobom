const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/authMiddleware');
const friendController = require('../controllers/friendController');

// 친구 목록 + 아직 평가하지 않은 모임 안내
router.get('/list', isLoggedIn, friendController.getList);

// 친구와 1:1 대화 시작 (없으면 방 생성 후 이동)
router.post('/chat/:id', isLoggedIn, friendController.postChat);

// 친구 해제
router.post('/delete/:id', isLoggedIn, friendController.postDelete);

module.exports = router;
