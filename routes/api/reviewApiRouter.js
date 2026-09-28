const express = require("express");
const router = express.Router();
const friendService = require("../../services/friendService");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답한다.
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 모임 평가 화면 데이터 (JSON)
// 같이 있었던 사람 목록과 마감 시각을 내려준다.
// 이미 제출했으면 existingReview가 채워져 오므로, 프론트는 제출 화면 대신 결과를 보여주면 된다.
// 평가 불가 사유(기간 만료, 미참여)는 서비스가 메시지로 던지므로 400으로 내려보낸다.
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const { meeting, others, deadline, existingReview } = await friendService.getReviewContext(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      meeting,
      others,
      deadline,
      existingReview: existingReview || null,
      alreadyReviewed: Boolean(existingReview),
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 평가 제출 (JSON) → 상호 지목이면 친구 성립
// 한쪽만 고른 경우에는 상대에게 아무것도 가지 않는다. 거절이 보이면 아무도
// 솔직하게 고르지 않기 때문에, 알림은 양쪽이 서로를 고른 건에 대해서만 보낸다.
router.post("/:id", requireAuth, async (req, res) => {
  try {
    const satisfied = req.body.satisfied === true || req.body.satisfied === "yes";

    let targetIds = req.body.targets || [];
    if (!Array.isArray(targetIds)) targetIds = [targetIds];

    const { matched } = await friendService.submitReview(
      req.params.id,
      req.user.id,
      satisfied,
      targetIds,
    );

    const io = req.app.get("io");
    for (const friendship of matched) {
      friendService.emitMatch(io, friendship);
    }

    res.json({ success: true, matchedCount: matched.length, satisfied });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
