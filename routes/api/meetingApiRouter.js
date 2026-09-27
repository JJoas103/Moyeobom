const express = require("express");
const router = express.Router();
const meetingService = require("../../services/meetingService");
const userService = require("../../services/userService");
const commentService = require("../../services/commentService");
const placeService = require("../../services/placeService");
const kakaoLocalService = require("../../services/kakaoLocalService");
const feedService = require("../../services/feedService");
const Activity = require("../../models/Activity");
const { uploadBoard } = require("../../config/upload");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답한다.
// (기존 isLoggedIn 미들웨어는 Accept 헤더에 따라 confirm 스크립트를 내려주기도 해서,
//  /api 아래에서는 항상 JSON만 내려주는 별도 체크를 둔다)
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 홈 화면 "최신 모임" 섹션 조회.
// 기존 mainController.getMain이 index.ejs에 내려주던 meetingService.getMainMeetings()
// (최신순 6개, 작성자 닉네임 populate)와 완전히 동일한 로직을 재사용한다.
router.get("/main", async (req, res, next) => {
  try {
    const meetings = await meetingService.getMainMeetings();
    res.json({ success: true, meetings });
  } catch (error) {
    next(error);
  }
});

// 모임 목록 조회 (JSON)
router.get("/list", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const { status, keyword, congestion } = req.query;

    const filters = { status, keyword, congestion };
    const { meetings, totalPages } = await meetingService.getAllMeetings(page, filters);

    res.json({
      success: true,
      meetings,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    next(error);
  }
});

// 모임 상세 조회 (JSON)
// 해당 지역의 부가 정보(주차장/화장실 개수)와 자동 첨부된 실시간 제보(최근 5개)까지 함께 내려주기
router.get("/info/:id", async (req, res, next) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id);
    const commentPage = parseInt(req.query.commentPage) || 1;
    const { comments, totalCommentPages, currentCommentPage } = await commentService.getCommentsByBoardId(
      req.params.id,
      commentPage,
    );

    let parkingCount = 0;
    let restroomCount = 0;
    const placeInfo = await placeService.getPlaceByName(meeting.area);
    if (placeInfo) {
      const [parkingInfo, restroomInfo] = await Promise.all([
        kakaoLocalService.getNearbyParking(placeInfo.latitude, placeInfo.longitude),
        kakaoLocalService.getNearbyRestrooms(placeInfo.latitude, placeInfo.longitude),
      ]);
      parkingCount = parkingInfo.length;
      restroomCount = restroomInfo.length;
    }

    const recentFeeds = await feedService.getRecentFeedsByLocation(meeting.area, 5);

    res.json({
      success: true,
      meeting,
      comments,
      totalCommentPages,
      currentCommentPage,
      parkingCount,
      restroomCount,
      recentFeeds,
    });
  } catch (error) {
    next(error);
  }
});

// 댓글 다음 페이지 조회 (JSON, 무한스크롤용)
// GET /info/:id가 내려주는 1페이지 이후, 댓글 목록을 스크롤할 때마다 이 엔드포인트로 다음 페이지를 이어받기
router.get("/:id/comments", async (req, res, next) => {
  try {
    const commentPage = parseInt(req.query.commentPage) || 1;
    const { comments, totalCommentPages, currentCommentPage } = await commentService.getCommentsByBoardId(
      req.params.id,
      commentPage,
    );
    res.json({ success: true, comments, totalCommentPages, currentCommentPage });
  } catch (error) {
    next(error);
  }
});

// 모임 작성 (JSON)
// 기존 POST /meeting/write(meetingController.postWrite)와 동일한 로직 —
// 이미지 필수 검증, 과거 시간 검증, 모임 생성, 매너 점수 상승(+5)/활동 기록,
// 근처 시간대 모임이면 같은 동네 사용자에게 Socket.IO 알림까지 그대로 재사용하기
router.post("/write", requireAuth, uploadBoard.single("imageUrl"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "잘못된 접근입니다" });
    }

    const meetingDate = new Date(`${req.body.meeting_date}T${req.body.meeting_time}`);

    if (meetingDate < new Date()) {
      return res.status(400).json({ success: false, message: "과거 시간으로 모임을 생성할 수 없습니다." });
    }

    const meetingData = {
      ...req.body,
      meetingDate,
      author: req.user.id,
    };

    const imageUrl = req.file.filename;

    const newMeeting = await meetingService.createMeeting(meetingData, imageUrl);

    const { actualChange } = await userService.updateMannerScore(req.user.id, 5);

    await Activity.create({
      user: req.user.id,
      type: "meeting_create",
      message: `"${newMeeting.title}" 모임 개설`,
      scoreChange: actualChange,
      relatedLink: `/meeting/info/${newMeeting._id}`,
    });

    const io = req.app.get("io");
    const now = new Date();
    const oneHourBefore = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    const twoHoursAfter = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const isInTimeRange = newMeeting.meetingDate >= oneHourBefore && newMeeting.meetingDate <= twoHoursAfter;
    const district = newMeeting.area;

    if (io && isInTimeRange && district) {
      io.to(district).emit("newMeetingAlert", {
        title: newMeeting.title,
        district,
        meetingDate: newMeeting.meetingDate.toLocaleString("ko-KR"),
        message: `${district} 근처에 곧 진행되는 새 모임이 등록되었습니다.`,
      });
    }

    res.json({ success: true, meeting: newMeeting });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
});

// 모임 수정 (JSON)
// 수정 권한 확인(meetingService.updateMeeting 내부), 과거 시간 검증, 이미지는 선택적으로 교체하기
router.post("/modify/:id", requireAuth, uploadBoard.single("imageUrl"), async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.imageUrl = req.file.filename;
    }

    if (req.body.meeting_date && req.body.meeting_time) {
      const meetingDate = new Date(`${req.body.meeting_date}T${req.body.meeting_time}`);

      if (meetingDate < new Date()) {
        return res.status(400).json({ success: false, message: "과거 시간으로 수정할 수 없습니다." });
      }
      updateData.meetingDate = meetingDate;
    }

    await meetingService.updateMeeting(req.params.id, updateData, req.user.id);
    const updatedMeeting = await meetingService.getMeetingById(req.params.id);
    res.json({ success: true, meeting: updatedMeeting });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 모임 삭제 (JSON)
// 삭제 권한 확인은 meetingService.deleteMeeting 내부에서 처리하기
router.post("/delete/:id", requireAuth, async (req, res, next) => {
  try {
    await meetingService.deleteMeeting(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 모임 참여/취소 토글 (JSON)
// 참여 시 매너 점수 상승/활동 기록을 그대로 재사용하기
router.post("/join/:id", requireAuth, async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { meeting, action } = await meetingService.toggleMeetingParticipation(meetingId, req.user.id);

    if (action === "join") {
      const { actualChange } = await userService.updateMannerScore(req.user.id, 2);

      await Activity.create({
        user: req.user.id,
        type: "meeting_join",
        message: `"${meeting.title}" 모임 가입`,
        scoreChange: actualChange,
        relatedLink: `/meeting/info/${meetingId}`,
      });
    }

    // 참여자 목록을 화면에 바로 반영할 수 있도록 populate된 최신 모임 정보를 함께 내려주기
    const updatedMeeting = await meetingService.getMeetingById(meetingId);

    res.json({
      success: true,
      action,
      message: action === "join" ? "모임에 참여했습니다" : "참여를 취소했습니다",
      meeting: updatedMeeting,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
