const express = require("express");
const router = express.Router();
const recommendService = require("../../services/recommendService");
const eventApiService = require("../../services/eventApiService");
const Meeting = require("../../models/Meeting");
const User = require("../../models/User");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답한다.
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 행사 검색 (JSON)
// 모임 개설 시 행사를 고르는 진입점이라 비로그인도 열어 둔다.
// :id 라우트보다 먼저 선언해야 "search"가 행사 id로 잡히지 않는다.
router.get("/search", async (req, res, next) => {
  try {
    const keyword = req.query.keyword || "";
    const events = await eventApiService.searchEvents(keyword, 40);
    res.json({ success: true, events, keyword });
  } catch (error) {
    next(error);
  }
});

// 개인화 추천 홈 (JSON)
// 사용자마다 다른 목록이 내려가고, 각 항목에 추천 근거(reasons)가 함께 붙는다.
// 설문을 아직 안 한 사용자는 needsOnboarding으로 내려보내 프론트가 온보딩으로 보내게 한다.
// (EJS 시절에는 미들웨어가 리다이렉트했지만, API에서는 상태만 알려주는 편이 낫다)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("onboardedAt").lean();
    if (user && !user.onboardedAt) {
      return res.json({ success: true, needsOnboarding: true, items: [] });
    }

    const category = req.query.category || null;
    const { items, isColdStart, hasPreferences } = await recommendService.recommendEvents(req.user, {
      limit: parseInt(req.query.limit) || 12,
      category,
    });

    res.json({
      success: true,
      needsOnboarding: false,
      items,
      isColdStart,
      hasPreferences,
      currentCategory: category || "",
    });
  } catch (error) {
    next(error);
  }
});

// 행사 상세 (JSON)
// "행사를 선택했을 때 무엇을 보여줄 것인가"에 대한 답.
// 이 행사에 이미 열려 있는 모임 목록을 함께 내려주고, 로그인한 사용자에게는
// 이 행사가 왜 추천됐는지(reasons)도 같이 붙인다.
router.get("/event/:id", async (req, res, next) => {
  try {
    const event = await eventApiService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "행사를 찾을 수 없습니다" });
    }

    const meetings = await Meeting.find({ event: event._id })
      .populate("author", "nickname profileImage avatar_emoji manner_score")
      .sort({ meetingDate: 1 })
      .lean();

    const now = new Date();
    const processed = meetings.map((meeting) => ({
      ...meeting,
      isExpired: new Date(meeting.meetingDate) < now,
      isFull:
        meeting.status === "full" || (meeting.participants || []).length >= meeting.maxParticipants,
    }));

    let reasons = [];
    if (req.user) {
      const ctx = await recommendService.buildContext(req.user);
      reasons = recommendService.scoreEvent(req.user, event, ctx).reasons;
    }

    res.json({ success: true, event, meetings: processed, reasons });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
