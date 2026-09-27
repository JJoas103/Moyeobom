const mongoose = require('mongoose');

// 모임 종료 후 "좋은 모임이 되셨나요?" 응답.
// satisfied가 true일 때만 targets(같이 참여한 사람별 친구 희망 여부)를 받는다.
const meetingReviewSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Meeting',
            required: true
        },
        reviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        satisfied: {
            type: Boolean,
            required: true
        },
        targets: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
                wantFriend: { type: Boolean, default: false },
                _id: false
            }
        ]
    },
    {
        timestamps: true
    }
);

// 1인 1회 — 같은 모임에 두 번 평가할 수 없다
meetingReviewSchema.index({ meeting: 1, reviewer: 1 }, { unique: true });

const MeetingReview = mongoose.model('MeetingReview', meetingReviewSchema);
module.exports = MeetingReview;
