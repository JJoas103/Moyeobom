const mongoose = require('mongoose');

// 친구(Friendship.status === 'accepted')끼리만 생성되는 1:1 대화방
const chatRoomSchema = new mongoose.Schema(
    {
        // Friendship.users와 같은 규칙으로 정렬 저장
        participants: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length === 2,
                message: '1:1 대화방은 두 명으로만 구성됩니다'
            }
        },
        friendship: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Friendship'
        },
        lastMessage: { type: String, default: '' },
        lastMessageAt: { type: Date },
        // key: userId 문자열, value: 안 읽은 메시지 수
        unreadCount: {
            type: Map,
            of: Number,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

chatRoomSchema.index({ participants: 1 }, { unique: true });
chatRoomSchema.index({ lastMessageAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
module.exports = ChatRoom;
