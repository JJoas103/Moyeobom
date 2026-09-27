const express = require("express");
const router = express.Router();
const friendService = require("../../services/friendService");
const chatService = require("../../services/chatService");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답한다.
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 친구 목록 (JSON)
// 어느 모임에서 만났는지가 함께 내려간다. 아직 평가하지 않은 모임(pendingReviews)도
// 같이 주어서, 프론트가 "평가하면 친구가 될 수 있다"를 같은 화면에서 안내할 수 있게 한다.
router.get("/list", requireAuth, async (req, res, next) => {
  try {
    const [friends, pendingReviews] = await Promise.all([
      friendService.getFriends(req.user.id),
      friendService.getPendingReviews(req.user.id),
    ]);

    res.json({ success: true, friends, pendingReviews });
  } catch (error) {
    next(error);
  }
});

// 친구와의 1:1 대화방 열기 (JSON)
// 방이 없으면 만들고 roomId를 돌려준다. 프론트는 이 id로 /chat/:roomId 로 이동하면 된다.
// 친구(accepted)가 아니면 chatService.openRoom이 막는다.
router.post("/chat/:id", requireAuth, async (req, res, next) => {
  try {
    const room = await chatService.openRoom(req.user.id, req.params.id);
    res.json({ success: true, roomId: String(room._id) });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 친구 해제 (JSON)
// 관계가 끊기면 chatService 쪽에서 해당 대화방 접근도 함께 막힌다.
router.post("/delete/:id", requireAuth, async (req, res, next) => {
  try {
    await friendService.removeFriend(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
