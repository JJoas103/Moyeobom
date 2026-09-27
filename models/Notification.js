const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['like', 'comment', 'badge', 'system', 'review', 'friend', 'message'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedLink: {
        type: String // 클릭 시 이동할 링크 (예: /feed/info/...)
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
