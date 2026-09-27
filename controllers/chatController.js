const chatService = require('../services/chatService');

// 대화방 목록
const getList = async (req, res, next) => {
    try {
        const rooms = await chatService.getRooms(req.user.id);
        res.render('chat/list', { rooms });
    } catch (error) {
        next(error);
    }
};

// 대화방 — 친구가 아니거나 참여자가 아니면 assertMember에서 막힌다
const getRoom = async (req, res, next) => {
    try {
        const room = await chatService.assertMember(req.params.roomId, req.user.id);
        const { messages, hasMore, nextCursor } = await chatService.getMessages(req.params.roomId);

        await chatService.markAsRead(req.params.roomId, req.user.id);

        const partner = room.participants.find((p) => String(p._id) !== String(req.user.id));

        res.render('chat/room', { room, partner, messages, hasMore, nextCursor });
    } catch (error) {
        error.status = 400;
        next(error);
    }
};

// 이전 메시지 더 불러오기 (무한 스크롤용 JSON)
const getMoreMessages = async (req, res, next) => {
    try {
        await chatService.assertMember(req.params.roomId, req.user.id);
        const result = await chatService.getMessages(req.params.roomId, { cursor: req.query.cursor });
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 메시지 전송 — Socket.IO가 막혔을 때를 대비한 폼/AJAX 경로.
// 저장과 브로드캐스트 로직은 소켓 핸들러와 동일하게 chatService를 거친다.
const postMessage = async (req, res, next) => {
    try {
        const { message, partnerId } = await chatService.sendMessage(
            req.params.roomId,
            req.user.id,
            req.body.text
        );

        const io = req.app.get('io');
        if (io) {
            io.to(`chat:${req.params.roomId}`).emit('chatMessage', message);
            io.to(`user:${partnerId}`).emit('chatNotice', {
                roomId: req.params.roomId,
                preview: message.text.slice(0, 40)
            });
        }

        await chatService.notifyIfIdle(partnerId, req.user.nickname, req.params.roomId);

        if (req.accepts(['html', 'json']) === 'json') {
            return res.json({ success: true, message });
        }
        res.redirect(`/chat/${req.params.roomId}`);
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getList, getRoom, getMoreMessages, postMessage };
