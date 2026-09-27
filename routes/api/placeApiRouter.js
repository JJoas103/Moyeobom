const express = require("express");
const router = express.Router();
const placeService = require("../../services/placeService");
const kakaoLocalService = require("../../services/kakaoLocalService");
const meetingService = require("../../services/meetingService");
const weatherService = require("../../services/weatherService");
const Favorite = require("../../models/Favorite");
const User = require("../../models/User");
const VisitLog = require("../../models/VisitLog");
const Activity = require("../../models/Activity");

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 지도에 뿌릴 마커 전체 목록
router.get("/markers", async (req, res, next) => {
  try {
    const markers = await placeService.getAllMarker();
    res.json({ success: true, markers });
  } catch (error) {
    next(error);
  }
});

// 장소 이름으로 상세 정보(혼잡도) + 주변 주차장/화장실 개수 조회
router.get("/info", async (req, res, next) => {
  try {
    const area = req.query.area || "";
    let placeInfo = null;
    let parkingCount = 0;
    let restroomCount = 0;

    if (area) {
      placeInfo = await placeService.getPlaceByName(area);
      if (placeInfo) {
        const [parkingInfo, restroomInfo] = await Promise.all([
          kakaoLocalService.getNearbyParking(placeInfo.latitude, placeInfo.longitude),
          kakaoLocalService.getNearbyRestrooms(placeInfo.latitude, placeInfo.longitude),
        ]);
        parkingCount = parkingInfo.length;
        restroomCount = restroomInfo.length;
      }
    }

    res.json({ success: true, placeInfo, parkingCount, restroomCount });
  } catch (error) {
    next(error);
  }
});

// 장소 검색 (JSON 응답용)
// 결과가 정확히 1곳이면 res.redirect(`/place/${area_cd}`)와 동일한 효과를 내도록
// singleResult:true와 area_cd를 내려주고, 프론트에서 바로 상세 페이지로 이동시키기
router.get("/search", async (req, res, next) => {
  try {
    const keyword = (req.query.keyword || "").trim();
    if (!keyword) {
      return res.json({ success: false, redirect: "/" });
    }

    const results = await placeService.searchPlacesByName(keyword);
    if (results.length === 1) {
      return res.json({ success: true, singleResult: true, area_cd: results[0].area_cd });
    }
    if (results.length === 0) {
      return res.json({ success: true, keyword, places: [] });
    }

    const imagesArr = await Promise.all(results.map((r) => kakaoLocalService.getPlaceImage(r.name)));
    const places = results.map((r, i) => ({ ...r.toObject(), imageUrl: imagesArr[i] }));
    res.json({ success: true, keyword, places });
  } catch (error) {
    next(error);
  }
});

// 전체 장소 (JSON 응답용)
router.get("/all", async (req, res, next) => {
  try {
    const markerInfo = await placeService.getAllMarker();
    const imagesArr = await Promise.all(markerInfo.map((r) => kakaoLocalService.getPlaceImage(r.name)));
    const places = markerInfo.map((r, i) => {
      const obj = typeof r.toObject === "function" ? r.toObject() : r;
      return { ...obj, imageUrl: imagesArr[i] };
    });
    res.json({ success: true, keyword: "전체 장소", places });
  } catch (error) {
    next(error);
  }
});

// 한산한 명소 (JSON 응답용)
router.get("/quiet", async (req, res, next) => {
  try {
    const quietPlaces = await placeService.getAllQuietPlaces();
    const imagesArr = await Promise.all(quietPlaces.map((r) => kakaoLocalService.getPlaceImage(r.name)));
    const places = quietPlaces.map((r, i) => {
      const obj = typeof r.toObject === "function" ? r.toObject() : r;
      return { ...obj, imageUrl: imagesArr[i] };
    });
    res.json({ success: true, keyword: "한산한 명소", places });
  } catch (error) {
    next(error);
  }
});

// 장소 코드(area_cd)로 장소 상세 조회
router.get("/:area_cd", async (req, res, next) => {
  try {
    const place = await placeService.getPlaceByAreaCd(req.params.area_cd);

    // 주변 주차장/화장실, 이 장소 모임 목록,
    // 날씨, 가까운 대중교통, 대표 이미지를 함께 조회하기
    const [parkingInfo, restroomInfo, meetings, weather, transitInfo, placeImage] = await Promise.all([
      kakaoLocalService.getNearbyParking(place.latitude, place.longitude),
      kakaoLocalService.getNearbyRestrooms(place.latitude, place.longitude),
      meetingService.getMeetingsByArea(place.name),
      weatherService.getWeather(place.latitude, place.longitude),
      kakaoLocalService.getNearbyTransit(place.latitude, place.longitude),
      kakaoLocalService.getPlaceImage(place.name),
    ]);

    // 로그인 상태일 때만 찜 여부를 함께 내려주기
    let isFavorite = false;
    if (req.isAuthenticated()) {
      const favorite = await Favorite.findOne({ user: req.user.id, place_id: req.params.area_cd });
      isFavorite = !!favorite;
    }

    res.json({ success: true, place, isFavorite, parkingInfo, restroomInfo, meetings, weather, transitInfo, placeImage });
  } catch (error) {
    next(error);
  }
});

// 방문 인증 (하루 한 번, 매너점수 +2 최대 100)
router.post("/:area_cd/visit", requireAuth, async (req, res, next) => {
  try {
    const place_id = req.params.area_cd;
    const { place_name } = req.body;
    const userId = req.user._id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const alreadyVisited = await VisitLog.findOne({
      userId,
      placeId: place_id,
      createdAt: { $gte: todayStart },
    });

    if (alreadyVisited) {
      return res.json({ success: false, message: "오늘 이미 방문 인증한 장소입니다." });
    }

    const currentScore = req.user.manner_score || 50;
    const pointsToAdd = 2;
    const newScore = Math.min(100, currentScore + pointsToAdd);
    const actualGained = newScore - currentScore;

    const updatedUser = await User.findByIdAndUpdate(userId, { manner_score: newScore }, { new: true });

    await VisitLog.create({
      userId,
      placeId: place_id,
      placeName: place_name || "",
      pointsEarned: actualGained,
    });

    await Activity.create({
      user: userId,
      type: "visit_verify",
      message: `${place_name || "장소"} 방문 인증`,
      scoreChange: actualGained,
      relatedLink: `/place/${place_id}`,
    });

    res.json({ success: true, message: "방문 인증 완료! 매너 점수 +2", newScore: updatedUser.manner_score });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
