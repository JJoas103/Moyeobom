const mongoose = require('mongoose');

// 1:1 채팅 메시지 — Socket.IO로 실시간 전달하되 DB에 영속화한다.
// 새로고침 후에도 대화가 남고, 신고 시 근거로 조회할 수 있다.
const messageSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ChatRoom',
            required: true
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            required: true,
            maxlength: 1000
        },
        readAt: { type: Date, default: null }
    },
    {
        timestamps: true
    }
);

// 방 단위 최신순 조회 (커서 페이지네이션)
messageSchema.index({ room: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
