const mongoose = require('mongoose');

// 상호 동의 친구 관계.
// 한쪽만 신청한 pending 상태는 상대에게 절대 노출하지 않는다 (거절이 보이지 않는 구조).
// 양쪽이 모두 서로를 지목했을 때만 accepted로 전환된다.
const friendshipSchema = new mongoose.Schema(
    {
        // 항상 _id 문자열 오름차순으로 정렬해 저장한다 (A-B와 B-A를 같은 문서로 취급)
        users: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length === 2,
                message: '친구 관계는 두 명으로만 구성됩니다'
            }
        },
        // 먼저 친구 희망을 누른 쪽 (pending 상태에서 누가 신청자인지 구분)
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        // 어느 모임에서 만나 성립했는지 — 친구 목록에 "OO 모임에서 만남"으로 표시
        sourceMeeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Meeting'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        },
        respondedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

// 같은 쌍에 대한 관계 문서는 하나만 존재한다
friendshipSchema.index({ users: 1 }, { unique: true });

// 정렬된 users 배열을 만들어 주는 헬퍼 — 모든 조회/생성이 이걸 거쳐야 유니크 인덱스가 동작한다
friendshipSchema.statics.pairKey = function (userA, userB) {
    return [String(userA), String(userB)].sort();
};

const Friendship = mongoose.model('Friendship', friendshipSchema);
module.exports = Friendship;
