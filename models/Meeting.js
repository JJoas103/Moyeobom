const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    area: { type: String, required: true }, // 📍 연남동, 성수동 등
    meetingDate: { type: Date, required: true },
    maxParticipants: { type: Number, required: true, default: 2 },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    status: {
      type: String,
      enum: ["recruit", "full", "completed"],
      default: "recruit",
    },
    tags: [String], // ['조용한카페', '주차가능']
    congestionLevel: {
      type: String,
      enum: ["여유", "보통", "약간 붐빔", "혼잡"],
      default: "보통",
    },
    imageUrl: {
      type: String
    },
    // 이 모임이 어떤 문화행사에서 파생됐는지. 행사를 고르면 제목·날짜·장소·좌표가 자동으로 채워진다.
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    // 2차 장소(뒤풀이) 확정 정보 — 카카오 로컬 검색 결과 중 호스트가 고른 한 곳
    afterPlace: {
      name: { type: String },
      address: { type: String },
      x: { type: String },          // 경도 (카카오 응답 필드명 그대로)
      y: { type: String },          // 위도
      kakaoUrl: { type: String },
      confirmedAt: { type: Date }
    },
    // 스케줄러가 모임을 종료 처리한 시각. 평가 마감(72시간) 기준점이 된다.
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

const Meeting = mongoose.model("Meeting", meetingSchema);
module.exports = Meeting;
