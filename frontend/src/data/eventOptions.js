// 행사 필터의 선택지.
//
// 전에는 components/event/EventFilterBar.jsx 가 data/mock/events 에서 가져다 썼다.
// 실제 데이터로 넘어갈 화면이 목업 모듈을 import 하면, 목업을 지우는 순간 필터가 죽는다.
// 화면에 쓰이는 고정 선택지는 목업과 무관하므로 여기로 옮겼다.

/** 서울 25개 자치구. 서울 API 의 GUNAME 과 같은 표기 */
export const SEOUL_AREAS = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구',
]

export const PERIOD_OPTIONS = [
  { value: '', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '한 달 내' },
]

// 서울 API 의 price 는 자유 문자열이다 ("무료", "전석 40,000원", ""). 무료 여부만 가른다.
export const FEE_OPTIONS = [
  { value: '', label: '전체 비용' },
  { value: 'free', label: '무료' },
  { value: 'paid', label: '유료' },
]

/** 요약 줄에 쓰는 라벨 — 값이 없으면 '전체 기간' 같은 기본 문구를 돌려준다 */
export function labelOf(options, value) {
  return options.find((o) => o.value === (value || ''))?.label || ''
}
