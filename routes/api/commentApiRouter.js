const express = require("express");
const router = express.Router();
const commentService = require("../../services/commentService");
const Notification = require("../../models/Notification");
const Feed = require("../../models/Feed");
const Meeting = require("../../models/Meeting");

// API 전용 로그인 체크: 안 돼있으면 항상 401 JSON으로 응답하기
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: "로그인이 필요합니다" });
}

// 댓글 작성 (JSON)
// 댓글 생성 + 게시글 작성자에게 알림. redirect 대신 생성된 댓글을 JSON으로 내려주기
router.post("/write", requireAuth, async (req, res, next) => {
  try {
    const { content, boardId, onModel } = req.body;

    const newComment = await commentService.createComment({
      content,
      author: req.user.id,
      board: boardId,
      onModel,
    });

    let board;
    if (onModel === "Feed") {
      board = await Feed.findById(boardId);
    } else if (onModel === "Meeting") {
      board = await Meeting.findById(boardId);
    }

    if (board && board.author && board.author.toString() !== req.user.id) {
      const boardTitle = board.title || board.locationTag || "게시글";
      await Notification.create({
        user: board.author,
        type: "comment",
        message: `[${boardTitle}]에 새로운 댓글이 달렸어요.`,
        relatedLink: `/${onModel.toLowerCase()}/info/${boardId}`,
      });
    }

    // 화면에 바로 반영할 수 있도록 작성자 정보를 populate해서 내려주기
    await newComment.populate("author", "nickname profileImage avatar_emoji manner_score");

    res.json({ success: true, comment: newComment });
  } catch (error) {
    next(error);
  }
});

// 댓글 삭제 (JSON)
router.post("/delete", requireAuth, async (req, res, next) => {
  try {
    const { commentId } = req.body;
    await commentService.deleteComment(commentId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
