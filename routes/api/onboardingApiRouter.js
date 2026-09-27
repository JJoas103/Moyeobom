const express = require("express");
const router = express.Router();
const User = require("../../models/User");
const options = require("../../config/onboardingOptions");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답한다.
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 온보딩 설문 데이터 (JSON)
// 고를 수 있는 보기와, 이미 고른 값을 함께 내려준다.
// 다시 들어온 경우(isRedo)에는 프론트가 "다시 하기" 문구로 바꿔 보여주면 된다.
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("preferences onboardedAt").lean();

    res.json({
      success: true,
      options: {
        genres: options.GENRES,
        hobbies: options.HOBBIES,
        personalities: options.PERSONALITIES,
        timeSlots: options.TIME_SLOTS,
        areas: options.AREAS,
      },
      saved: (user && user.preferences) || {},
      isRedo: Boolean(user && user.onboardedAt),
    });
  } catch (error) {
    next(error);
  }
});

// 설문 저장 (JSON)
// sanitize로 정해진 보기 밖의 값은 걸러낸다 — 추천 가중치에 그대로 들어가는 값이라
// 임의의 문자열이 섞이면 매칭이 조용히 빗나간다.
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const preferences = {
      genres: options.sanitize(req.body.genres, options.GENRES),
      hobbies: options.sanitize(req.body.hobbies, options.HOBBIES),
      personality: options.sanitize(req.body.personality, options.PERSONALITIES),
      preferredTime: options.sanitize(req.body.preferredTime, options.TIME_SLOTS),
      preferredAreas: options.sanitize(req.body.preferredAreas, options.AREAS),
    };

    await User.findByIdAndUpdate(req.user.id, {
      $set: { preferences, onboardedAt: new Date() },
    });

    res.json({ success: true, preferences });
  } catch (error) {
    next(error);
  }
});

// 건너뛰기 (JSON)
// 다시 묻지 않도록 완료로 기록하되 선호는 비워 둔다.
// 이 경우 추천은 지역·시간·혼잡도만으로 순위를 매긴다.
router.post("/skip", requireAuth, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $set: { onboardedAt: new Date() } });
    res.json({ success: true, skipped: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
