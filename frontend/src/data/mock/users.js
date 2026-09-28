// 목업 사용자. models/User.js 의 화면에서 쓰는 필드만 추렸다.
// (nickname / avatar_emoji / manner_score / preferences / onboardedAt)

export const ME = {
  _id: 'usr-me',
  nickname: '현우',
  avatar_emoji: '🌿',
  manner_score: 62,
  // genres 는 config/onboardingOptions.js 의 선택지이자 Event.genres 와 맞물리는 값이다.
  // mock/reasons.js 의 "○○ 고르셨어요" 와 어긋나면 화면이 스스로 모순된다.
  preferences: {
    genres: ['전시', '연극', '국악'],
    hobbies: [],
    personality: [],
    preferredTime: ['평일 저녁', '주말 저녁'],
    preferredAreas: ['성동구', '종로구'],
  },
  onboardedAt: new Date().toISOString(),
}

export const USERS = {
  'usr-me': ME,
  'usr-jisu': { _id: 'usr-jisu', nickname: '지수', avatar_emoji: '🎐', manner_score: 64 },
  'usr-minjae': { _id: 'usr-minjae', nickname: '민재', avatar_emoji: '🍋', manner_score: 58 },
  'usr-hayun': { _id: 'usr-hayun', nickname: '하윤', avatar_emoji: '🫧', manner_score: 71 },
  'usr-seoyeon': { _id: 'usr-seoyeon', nickname: '서연', avatar_emoji: '🌙', manner_score: 55 },
  'usr-doyul': { _id: 'usr-doyul', nickname: '도율', avatar_emoji: '🧭', manner_score: 60 },
  'usr-eunbi': { _id: 'usr-eunbi', nickname: '은비', avatar_emoji: '🌾', manner_score: 67 },
  'usr-taeho': { _id: 'usr-taeho', nickname: '태호', avatar_emoji: '🪵', manner_score: 53 },
}

export const user = (id) => USERS[id] || { _id: id, nickname: '알 수 없음', avatar_emoji: '👤', manner_score: 50 }
