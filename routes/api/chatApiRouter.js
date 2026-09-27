const express = require("express");
const router = express.Router();
const chatService = require("../../services/chatService");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답한다.
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 대화방 목록 (JSON)
// 친구가 된 사람만 여기에 나온다.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const rooms = await chatService.getRooms(req.user.id);
    res.json({ success: true, rooms });
  } catch (error) {
    next(error);
  }
});

// 안 읽은 메시지 총합 (JSON)
// Navbar 뱃지용. ":roomId" 라우트보다 먼저 선언해야 "unread"가 방 id로 잡히지 않는다.
router.get("/unread", requireAuth, async (req, res, next) => {
  try {
    const count = await chatService.getTotalUnread(req.user.id);
    res.json({ success: true, count });
  } catch (error) {
    next(error);
  }
});

// 이전 메시지 더 불러오기 (JSON, 무한 스크롤용)
// ":roomId" 단독 라우트보다 먼저 선언한다.
router.get("/:roomId/messages", requireAuth, async (req, res) => {
  try {
    await chatService.assertMember(req.params.roomId, req.user.id);
    const result = await chatService.getMessages(req.params.roomId, { cursor: req.query.cursor });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 대화방 열기 (JSON)
// 친구가 아니거나 참여자가 아니면 assertMember에서 막힌다.
// 방 주소를 직접 입력해 들어오는 경우를 여기서 걸러낸다.
router.get("/:roomId", requireAuth, async (req, res) => {
  try {
    const room = await chatService.assertMember(req.params.roomId, req.user.id);
    const { messages, hasMore, nextCursor } = await chatService.getMessages(req.params.roomId);

    await chatService.markAsRead(req.params.roomId, req.user.id);

    const partner = room.participants.find((p) => String(p._id) !== String(req.user.id));

    res.json({ success: true, room, partner, messages, hasMore, nextCursor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 메시지 전송 (JSON)
// 평소에는 Socket.IO로 주고받지만, 소켓이 막힌 환경을 대비한 경로다.
// 저장과 브로드캐스트는 소켓 핸들러와 똑같이 chatService를 거친다.
router.post("/:roomId/message", requireAuth, async (req, res) => {
  try {
    const { message, partnerId } = await chatService.sendMessage(
      req.params.roomId,
      req.user.id,
      req.body.text,
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`chat:${req.params.roomId}`).emit("chatMessage", message);
      io.to(`user:${partnerId}`).emit("chatNotice", {
        roomId: req.params.roomId,
        preview: message.text.slice(0, 40),
      });
    }

    await chatService.notifyIfIdle(partnerId, req.user.nickname, req.params.roomId);

    res.json({ success: true, message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
