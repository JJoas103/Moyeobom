const express = require("express");
const router = express.Router();
const feedService = require("../../services/feedService");
const userService = require("../../services/userService");
const commentService = require("../../services/commentService");
const Activity = require("../../models/Activity");
const Notification = require("../../models/Notification");
const Meeting = require("../../models/Meeting");
const User = require("../../models/User");
const Feed = require("../../models/Feed");
const { uploadBoard } = require("../../config/upload");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답하기
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 제보 목록 조회 (JSON)
router.get("/list", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const { feeds, totalPages } = await feedService.getAllFeeds(page);
    res.json({ success: true, feeds, totalPages, currentPage: page });
  } catch (error) {
    next(error);
  }
});

// 제보 상세 조회 (JSON)
// 핵심 데이터 + 댓글 1페이지를 함께 내려주기
router.get("/info/:id", async (req, res, next) => {
  try {
    const feed = await feedService.getFeedById(req.params.id);
    const commentPage = parseInt(req.query.commentPage) || 1;
    const { comments, totalCommentPages, currentCommentPage } = await commentService.getCommentsByBoardId(
      req.params.id,
      commentPage,
    );
    res.json({ success: true, feed, comments, totalCommentPages, currentCommentPage });
  } catch (error) {
    next(error);
  }
});

// 댓글 다음 페이지 조회 (JSON, 무한스크롤용)
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

// 제보 작성 (JSON)
// 매너 점수 상승(+1)/활동 기록, 같은 장소·시간대 모임 관련자 + 동네 회원에게
// 알림(Notification) 생성 및 Socket.IO 알림까지 그대로 재사용하기
router.post("/write", requireAuth, uploadBoard.single("uploadFile"), async (req, res, next) => {
  try {
    const userId = req.user.id;
    const feedData = {
      ...req.body,
      author: userId,
      image: req.file ? req.file.filename : null,
    };

    const newFeed = await feedService.createFeed(feedData);

    const { actualChange } = await userService.updateMannerScore(userId, 1);
    await Activity.create({
      user: userId,
      type: "feed_write",
      message: `실시간 제보 작성`,
      scoreChange: actualChange,
      relatedLink: `/feed/info/${newFeed._id}`,
    });

    const io = req.app.get("io");
    const district = newFeed.locationTag;

    if (io && district) {
      const now = new Date();
      const oneHourBefore = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const twoHoursAfter = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const relatedMeetings = await Meeting.find({
        area: district,
        meetingDate: { $gte: oneHourBefore, $lte: twoHoursAfter },
      });

      const targetUserIds = new Set();
      relatedMeetings.forEach((meeting) => {
        if (meeting.author) targetUserIds.add(meeting.author.toString());
        meeting.participants.forEach((participantId) => targetUserIds.add(participantId.toString()));
      });

      const sameAddressUsers = await User.find({ address: district, alert_meeting: true });
      sameAddressUsers.forEach((user) => targetUserIds.add(user._id.toString()));

      targetUserIds.delete(userId);

      for (const targetUserId of targetUserIds) {
        await Notification.create({
          user: targetUserId,
          type: "system",
          message: `${district}에 새로운 실시간 제보가 등록되었습니다.`,
          relatedLink: `/feed/info/${newFeed._id}`,
        });
        io.to(`user:${targetUserId}`).emit("newFeedAlert", {
          title: "새 실시간 제보",
          district,
          content: newFeed.content,
          feedId: newFeed._id,
          message: `${district}에 새로운 실시간 제보가 등록되었습니다.`,
        });
      }

      io.to(district).emit("newReportInDistrict", {
        feedId: newFeed._id,
        content: newFeed.content,
        authorNickname: req.user.nickname,
        authorEmoji: req.user.avatar_emoji,
        createdAt: newFeed.createdAt,
        image: newFeed.image,
        locationTag: newFeed.locationTag,
      });
    }

    res.json({ success: true, feed: newFeed });
  } catch (error) {
    next(error);
  }
});

// 제보 수정 (JSON)
// 수정 권한 확인은 feedService.updateFeed 내부에서 처리하기
router.post("/modify/:id", requireAuth, uploadBoard.single("uploadFile"), async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.file) updateData.image = req.file.filename;

    const updatedFeed = await feedService.updateFeed(req.params.id, updateData, req.user.id);
    res.json({ success: true, feed: updatedFeed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 제보 삭제 (JSON)
router.post("/delete/:id", requireAuth, async (req, res, next) => {
  try {
    await feedService.deleteFeed(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 제보 추천 (JSON)
// 비즈니스 규칙 실패는 200 상태의 { success: false, message } 로 내려주기
router.post("/like/:id", requireAuth, async (req, res, next) => {
  try {
    const feedId = req.params.id;
    const feed = await Feed.findById(feedId);

    if (!feed) return res.json({ success: false, message: "제보를 찾을 수 없습니다" });

    if (feed.likedBy.includes(req.user.id)) {
      return res.json({ success: false, message: "추천한 게시글 입니다." });
    }

    if (feed.author && feed.author.toString() === req.user.id) {
      return res.json({ success: false, message: "본인의 제보에는 추천할 수 없습니다" });
    }

    feed.reactions.like += 1;
    feed.likedBy.push(req.user.id);
    await feed.save();

    if (feed.author) {
      const { actualChange } = await userService.updateMannerScore(feed.author, 2);

      await Notification.create({
        user: feed.author,
        type: "like",
        message: `실시간 제보에 추천을 받아 매너점수가 ${actualChange.toFixed(1)}점이 올랐어요.`,
        relatedLink: `/feed/info/${feedId}`,
      });

      await Activity.create({
        user: feed.author,
        type: "like_received",
        message: `제보 추천 받음`,
        scoreChange: actualChange,
        relatedLink: `/feed/info/${feedId}`,
      });
    }

    res.json({ success: true, likeCount: feed.reactions.like });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
