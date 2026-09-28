const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['meeting_join', 'meeting_create', 'visit_verify', 'feed_write', 'favorite_add', 'like_received', 'comment_write', 'review_submit', 'friend_matched'],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    scoreChange: {
        type: Number
    },
    relatedLink: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
