// 추천 이유.
//
// "그거 결국 필터링 아니냐"에 대한 답이 이 데이터다. 걸러낸 목록이 아니라 점수로 매긴
// 순위이고, 왜 이게 떴는지가 카드마다 붙는다. 이유를 못 보여주면 화면상으로는 필터와
// 구별되지 않는다 — 교수 피드백 [4]가 정확히 그 지적이었다.
//
// kind 는 services/recommendService.js 의 BASE_WEIGHTS 키와 맞춘다.
//   taste 30 / history 25 / social 20 / area 12 / time 8 / calm 5

export const REASON_LABEL = {
  taste: '취향',
  history: '이력',
  social: '친구',
  area: '동네',
  time: '시간',
  calm: '여유',
}

// 이벤트별 추천 근거와 점수 (서버 recommendService.scoreEvent 의 반환값과 같은 모양)
export const MOCK_REASONS = {
  'evt-001': {
    score: 87,
    reasons: [
      { kind: 'taste', text: '전시 고르셨어요' },
      { kind: 'history', text: '지난 전시 모임에 만족' },
      { kind: 'area', text: '성동구' },
    ],
  },
  'evt-002': {
    score: 81,
    reasons: [
      { kind: 'taste', text: '연극 고르셨어요' },
      { kind: 'social', text: '지수님이 참여 중' },
      { kind: 'time', text: '평일 저녁' },
    ],
  },
  'evt-003': {
    score: 74,
    reasons: [
      { kind: 'taste', text: '클래식 고르셨어요' },
      { kind: 'time', text: '주말 저녁' },
      { kind: 'calm', text: '서촌 일대 한산함' },
    ],
  },
  'evt-021': {
    score: 69,
    reasons: [
      { kind: 'area', text: '성동구' },
      { kind: 'social', text: '민재님이 참여 중' },
      { kind: 'time', text: '평일 저녁' },
    ],
  },
  'evt-013': {
    score: 66,
    reasons: [
      { kind: 'taste', text: '전시 고르셨어요' },
      { kind: 'area', text: '종로구' },
    ],
  },
  'evt-014': {
    score: 63,
    reasons: [
      { kind: 'taste', text: '연극 고르셨어요' },
      { kind: 'area', text: '종로구' },
    ],
  },
  'evt-004': {
    score: 58,
    reasons: [
      { kind: 'taste', text: '전시 고르셨어요' },
      { kind: 'calm', text: '덕수궁 일대 여유' },
    ],
  },
  'evt-016': {
    score: 54,
    reasons: [
      { kind: 'taste', text: '클래식 고르셨어요' },
      { kind: 'time', text: '평일 저녁' },
    ],
  },
}

export const reasonsOfEvent = (eventId) => MOCK_REASONS[eventId]?.reasons || []
export const scoreOfEvent = (eventId) => MOCK_REASONS[eventId]?.score ?? null
