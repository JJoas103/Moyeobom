// 추천 이유.
//
// "그거 결국 필터링 아니냐"에 대한 답이 이 데이터다. 걸러낸 목록이 아니라 점수로 매긴
// 순위이고, 왜 이게 떴는지가 항목마다 붙는다. 이유를 못 보여주면 화면상으로는 필터와
// 구별되지 않는다 — 교수 피드백 [4]가 정확히 그 지적이었다.
//
// kind 는 services/recommendService.js 의 BASE_WEIGHTS 키와 맞춘다.
//   taste 30 / history 25 / social 20 / area 12 / time 8 / calm 5
//
// 근거의 내용은 mock/users.js 의 ME.preferences 와 어긋나면 안 된다.
// 취향에 없는 장르를 "고르셨어요"로 적으면 화면이 스스로 모순된다.

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
  // 섬유기획전 [안식의 결] — 전시 · 성동구
  'evt-009': {
    score: 87,
    reasons: [
      { kind: 'taste', text: '전시 고르셨어요' },
      { kind: 'history', text: '지난 전시 모임에 만족' },
      { kind: 'area', text: '성동구' },
    ],
  },
  // 26세종시즌 [스미레 미용실] — 연극 · 종로구
  'evt-010': {
    score: 81,
    reasons: [
      { kind: 'taste', text: '연극 고르셨어요' },
      { kind: 'social', text: '지수님이 참여 중' },
      { kind: 'time', text: '평일 저녁' },
    ],
  },
  // 경기시나위 [해금가락을 爲하다] — 국악 · 종로구
  'evt-030': {
    score: 74,
    reasons: [
      { kind: 'taste', text: '국악 고르셨어요' },
      { kind: 'area', text: '종로구' },
      { kind: 'calm', text: '돈화문 일대 한산함' },
    ],
  },
  // 강민수 달항아리 Moon Jar — 전시 · 종로구
  'evt-013': {
    score: 69,
    reasons: [
      { kind: 'taste', text: '전시 고르셨어요' },
      { kind: 'history', text: '지난 공예 전시에 만족' },
      { kind: 'area', text: '종로구' },
    ],
  },
  // DDP 협력전시 [SPECTRUM] — 전시 · 중구
  'evt-014': {
    score: 66,
    reasons: [
      { kind: 'taste', text: '전시 고르셨어요' },
      { kind: 'social', text: '태호님이 참여 중' },
    ],
  },
  // 라이브 퀘스트 뮤지컬 [코드네임X] — 뮤지컬 · 용산구
  'evt-015': {
    score: 61,
    reasons: [
      { kind: 'social', text: '서연님이 참여 중' },
      { kind: 'time', text: '주말 저녁' },
    ],
  },
  // Autumn in Jazz — 콘서트 · 서초구
  'evt-031': {
    score: 57,
    reasons: [
      { kind: 'social', text: '민재님이 참여 중' },
      { kind: 'time', text: '평일 저녁' },
    ],
  },
  // 2026 인사동 엔틱&아트페어 — 축제 · 종로구
  'evt-033': {
    score: 54,
    reasons: [
      { kind: 'area', text: '종로구' },
      { kind: 'time', text: '주말 낮' },
      { kind: 'calm', text: '오전 시간대 여유' },
    ],
  },
}

export const reasonsOfEvent = (eventId) => MOCK_REASONS[eventId]?.reasons || []
export const scoreOfEvent = (eventId) => MOCK_REASONS[eventId]?.score ?? null
