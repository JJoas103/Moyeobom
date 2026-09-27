const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        email : {
            type : String,
            require : true,
            unique : true
        },
        password : {
            type : String,
            require : true
        },     
        nickname : {
            type : String,
            require : true,
            unique : true
        },
        city : {
            type : String,
            enum : ['서울', '경기', '인천', '기타'],
            default : '서울'
        },
        address : {
            type : String,
            default : ''
        },
        avatar_emoji : {
            type : String,
            default : '😊'
        },
        manner_score : {
            type : Number,
            default : 50.00
        },
        manner_rank : {
            type : String,
            default : null
        },
        profileImage: {
            type: String,
            default: 'default-profile.png'
        },
        provider: {
            type: String,
            enum: ['local', 'google', 'naver'],
            default: 'local'
        },
        // 알림 설정 필드 추가
        congestion_alert: { type: String, default: 'uncrowded' },
        notify_start: { type: String, default: '08:00' },
        notify_end: { type: String, default: '22:00' },
        alert_meeting: { type: Boolean, default: true },
        alert_comment: { type: Boolean, default: true },
        alert_badge: { type: Boolean, default: true },
        alert_marketing: { type: Boolean, default: false },
        badges: { type: [String], default: [] },

        // 온보딩 설문 결과 — 행사 추천의 초기 입력값
        preferences: {
            hobbies: { type: [String], default: [] },
            personality: { type: [String], default: [] },
            genres: { type: [String], default: [] },
            preferredTime: { type: [String], default: [] },   // 평일저녁 / 주말낮 / 주말저녁 ...
            preferredAreas: { type: [String], default: [] }
        },
        // 온보딩 완료 시각 (건너뛰기도 완료로 기록 — 매번 다시 묻지 않기 위함)
        onboardedAt: { type: Date, default: null },
        // 참여 이력으로 갱신되는 취향 가중치. key: 장르/카테고리, value: 누적 점수
        tasteVector: {
            type: Map,
            of: Number,
            default: {}
        }
    },{
        timestamps : true
    }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
