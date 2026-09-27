const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { uploadProfile } = require("../../config/upload");
const { joinValidationRules } = require("../../middlewares/validationMiddleware");
const userService = require("../../services/userService");
const Notification = require("../../models/Notification");
const Favorite = require("../../models/Favorite");
const Place = require("../../models/Place");
const Activity = require("../../models/Activity");
const Meeting = require("../../models/Meeting");
const Feed = require("../../models/Feed");
const kakaoLocalService = require("../../services/kakaoLocalService");

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 회원가입 (JSON 응답용)
router.post("/join", uploadProfile.single("uploadFile"), joinValidationRules, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const fieldErrors = {};
    errors.array().forEach((err) => {
      fieldErrors[err.path] = err.msg;
    });
    return res.status(400).json({ success: false, fieldErrors });
  }

  try {
    await userService.createUser({ ...req.body, uploadFile: req.file });
    res.json({ success: true });
  } catch (error) {
    if (error.code === "NICKNAME_DUPLICATE") {
      return res.status(400).json({ success: false, fieldErrors: { nickname: error.message } });
    }
    if (error.code === 11000) {
      // MongoDB 고유 인덱스 충돌 (email unique)
      return res.status(400).json({ success: false, fieldErrors: { email: "이미 사용 중인 이메일입니다" } });
    }
    next(error);
  }
});

// 이메일 중복 확인
router.get("/check-email", async (req, res, next) => {
  try {
    const available = await userService.checkEmail(req.query.email);
    res.json({ available });
  } catch (error) {
    next(error);
  }
});

// 회원정보 수정 (JSON 응답용)
// 비밀번호는 입력했을 때만 변경되고, 프로필 이미지도 새로 올렸을 때만 교체된다(userService.updateUser 그대로 재사용)
router.post("/modify", requireAuth, uploadProfile.single("uploadFile"), async (req, res, next) => {
  try {
    await userService.updateUser(req.user.id, { ...req.body, uploadFile: req.file });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 알림 설정 저장 (JSON 응답용)
router.post("/notify-settings", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { congestion_alert, notify_start, notify_end, alert_meeting, alert_comment, alert_badge, alert_marketing } =
      req.body;

    await userService.updateNotifySettings(userId, {
      congestion_alert,
      notify_start,
      notify_end,
      alert_meeting: !!alert_meeting,
      alert_comment: !!alert_comment,
      alert_badge: !!alert_badge,
      alert_marketing: !!alert_marketing,
    });

    res.json({ success: true, message: "설정이 저장되었습니다." });
  } catch (error) {
    next(error);
  }
});

// 회원 탈퇴 (JSON 응답용)
// 비밀번호가 틀리면(로컬 가입자만 검사) success:false로 메시지를 내려주고,
// 성공하면 회원 삭제 후 세션도 로그아웃 처리한 뒤 완료 메시지를 내려주기
router.post("/delete", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    const result = await userService.deleteUser(userId, password);
    if (!result.success) {
      return res.json({ success: false, message: result.message });
    }

    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true, message: "탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다." });
    });
  } catch (error) {
    next(error);
  }
});

// 마이페이지 정보 조회 (JSON 응답용)
// 내가 참여 중인/개설한 모임, 내가 작성한 제보, 최근 활동, 최근 점수 변동 내역을 한 번에 내려주기
router.get("/info", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [myMeetings, myFeeds, activities, scoreActivities] = await Promise.all([
      Meeting.find({ $or: [{ author: userId }, { participants: userId }] })
        .populate("author", "nickname avatar_emoji")
        .sort({ createdAt: -1 }),
      Feed.find({ author: userId }).sort({ createdAt: -1 }),
      Activity.find({ user: userId }).sort({ createdAt: -1 }).limit(6),
      Activity.find({ user: userId, scoreChange: { $exists: true, $ne: 0 } }).sort({ createdAt: -1 }).limit(6),
    ]);

    const meetingCount = myMeetings.length;
    const feedCount = myFeeds.length;

    res.json({ success: true, meetingCount, feedCount, myMeetings, myFeeds, activities, scoreActivities });
  } catch (error) {
    next(error);
  }
});

// 알림 내역 조회
router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;

    const [notifications, totalNotifications] = await Promise.all([
      Notification.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments({ user: userId }),
    ]);

    const totalPages = Math.ceil(totalNotifications / limit);
    res.json({ success: true, notifications, currentPage: page, totalPages });
  } catch (error) {
    next(error);
  }
});

// 선택한 알림 읽음 처리
router.patch("/notifications/read", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    await Notification.updateMany({ _id: { $in: ids }, user: req.user.id }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 선택한 알림 삭제
router.delete("/notifications", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    await Notification.deleteMany({ _id: { $in: ids }, user: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 현재 페이지의 읽은 알림 전체 삭제
router.delete("/notifications/read", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    await Notification.deleteMany({ _id: { $in: ids }, user: req.user.id, isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 찜한 장소 목록 조회
router.get("/favorites", requireAuth, async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id });

    const placeDetails = await Promise.all(
      favorites.map(async (fav) => {
        const place = await Place.findOne({ area_cd: fav.place_id });
        if (!place) return null;

        const imageUrl = await kakaoLocalService.getPlaceImage(place.name);
        return {
          ...place.toObject(),
          imageUrl,
          reason: fav.reason,
        };
      })
    );

    res.json({ success: true, places: placeDetails.filter((p) => p !== null) });
  } catch (error) {
    next(error);
  }
});

// 장소 찜하기 추가 (JSON 응답용)
router.post("/favorites", requireAuth, async (req, res, next) => {
  try {
    const { place_id, reason } = req.body;
    const userId = req.user.id;

    const existing = await Favorite.findOne({ user: userId, place_id });
    if (existing) {
      return res.json({ success: false, message: "이미 찜한 장소입니다." });
    }

    await Favorite.create({ user: userId, place_id, reason: reason || "" });

    const { actualChange } = await userService.updateMannerScore(userId, 1);

    await Activity.create({
      user: userId,
      type: "favorite_add",
      message: `장소 찜하기 추가`,
      scoreChange: actualChange,
      relatedLink: `/place/${place_id}`,
    });

    res.json({ success: true, message: `"${reason}" 이유로 찜한 장소에 추가되었습니다! 매너 점수가 상승했습니다.` });
  } catch (error) {
    next(error);
  }
});

// 장소 찜하기 해제 (JSON 응답용)
router.delete("/favorites", requireAuth, async (req, res, next) => {
  try {
    const { place_id } = req.body;
    await Favorite.findOneAndDelete({ user: req.user.id, place_id });
    res.json({ success: true, message: "찜한 장소에서 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
