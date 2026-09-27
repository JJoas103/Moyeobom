const friendService = require('../services/friendService');
const chatService = require('../services/chatService');

// 친구 목록 — 어느 모임에서 만났는지 함께 보여준다
const getList = async (req, res, next) => {
    try {
        const [friends, pendingReviews] = await Promise.all([
            friendService.getFriends(req.user.id),
            friendService.getPendingReviews(req.user.id)
        ]);

        res.render('friend/list', { friends, pendingReviews });
    } catch (error) {
        next(error);
    }
};

// 친구 해제
const postDelete = async (req, res, next) => {
    try {
        await friendService.removeFriend(req.user.id, req.params.id);
        res.redirect('/friend/list');
    } catch (error) {
        error.status = 400;
        next(error);
    }
};

// 친구와의 1:1 대화방으로 이동 (없으면 생성)
const postChat = async (req, res, next) => {
    try {
        const room = await chatService.openRoom(req.user.id, req.params.id);
        res.redirect(`/chat/${room._id}`);
    } catch (error) {
        error.status = 400;
        next(error);
    }
};

module.exports = { getList, postDelete, postChat };
