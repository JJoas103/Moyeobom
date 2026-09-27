const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middlewares/authMiddleware');
const chatController = require('../controllers/chatController');

// 대화방 목록
router.get('/', isLoggedIn, chatController.getList);

// 이전 메시지 더 불러오기 (무한 스크롤)
router.get('/:roomId/messages', isLoggedIn, chatController.getMoreMessages);

// 대화방
router.get('/:roomId', isLoggedIn, chatController.getRoom);

// 메시지 전송 (소켓이 막혔을 때의 대체 경로)
router.post('/:roomId/message', isLoggedIn, chatController.postMessage);

module.exports = router;
