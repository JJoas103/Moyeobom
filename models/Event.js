const mongoose = require('mongoose');

// 문화행사 — 외부 공공 API(서울시 문화행사 정보 등)에서 동기화해 저장한다.
// 모임(Meeting)은 이 행사를 참조해 제목/날짜/장소/좌표/포스터를 자동으로 채운다.
const eventSchema = new mongoose.Schema(
    {
        sourceId: {
            type: String,
            required: true,
            unique: true   // 외부 API 식별자 — 스케줄러 재실행 시 중복 저장 방지
        },
        title: { type: String, required: true },
        category: { type: String, default: '기타' },     // 연극, 전시, 영화, 콘서트 ...
        genres: { type: [String], default: [] },          // 세부 장르 태그 (추천 매칭용)
        venue: { type: String, default: '' },             // 공연장/전시관 이름
        address: { type: String, default: '' },
        area: { type: String, default: '' },              // 동네 단위 — Meeting.area와 맞춘다
        coords: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null }
        },
        startAt: { type: Date },
        endAt: { type: Date },
        price: { type: String, default: '' },
        posterUrl: { type: String, default: '' },
        detailUrl: { type: String, default: '' }
    },
    {
        timestamps: true
    }
);

// 추천 시 "아직 안 끝난 행사" 조회가 가장 잦다
eventSchema.index({ endAt: 1 });
eventSchema.index({ area: 1, startAt: 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
