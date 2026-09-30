// 실제 API 가 주지 않는 행사 필드를 채운다.
//
// models/Event.js 에는 organizer · runtimeMin · isSeries · schedule 이 없다.
// 서울 문화행사 API 가 러닝타임과 회차를 아예 주지 않기 때문이다. 시안 v2 는 "150분",
// "화–금 19:30 · 토·일 14:00, 18:30", "회차형" 을 쓰고 있어 분류별 기본값으로 채운다.
// 실제 값은 KOPIS 같은 공연 API 를 붙여야 나오므로, 추정값이라는 점을 화면에서 숨기지
// 않는다 (상세의 "예상 종료"에 "(시작 시각 + 러닝타임 예상값)" 을 계속 붙인다).
//
// 표는 frontend/scripts/fetchMockEvents.mjs 와 같은 값이다. 한쪽만 고치면 목업 화면과
// 실데이터 화면이 달라지므로, 바꿀 때는 두 곳을 같이 본다.
//
// likeCount 는 여기서 만들지 않는다. 목업은 index 로 그럴듯한 숫자를 지어내지만
// 실제로는 찜을 세는 곳이 없다. 없는 값을 지어내는 대신 화면에서 숫자를 뺀다.

const RUNTIME_BY_CATEGORY = {
  연극: 110,
  '뮤지컬/오페라': 150,
  클래식: 100,
  국악: 90,
  무용: 80,
  콘서트: 120,
  영화: 105,
  '독주/독창회': 90,
}

// 같은 공연을 여러 번 올리는 분류. 전시·축제는 상시 관람이라 회차가 없다
const SERIES_CATEGORIES = new Set([
  '연극',
  '뮤지컬/오페라',
  '클래식',
  '국악',
  '무용',
  '콘서트',
  '독주/독창회',
])

const SCHEDULE_SAMPLES = [
  '화–금 19:30 · 토·일 14:00, 18:30',
  '수–금 20:00 · 주말 15:00, 19:00',
  '목–금 19:30 · 토 14:00, 18:00 · 일 15:00',
  '금 19:30 · 토·일 14:00',
]

// 제목 앞에 주최 기관이 대괄호로 붙어 온다 — "[서울시립 북서울미술관] 2026 타이틀 매치".
// 목록에서는 작품명이 먼저 읽혀야 하므로 떼어내고, 뗀 이름은 organizer 로 살린다.
function splitOrganizer(rawTitle = '') {
  const m = rawTitle.trim().match(/^[[(【]([^\])】]{2,40})[\])】]\s*(.+)$/)
  if (!m) return { title: rawTitle.trim(), bracket: '' }
  const [, bracket, rest] = m
  // 떼고 나서 남는 게 너무 짧으면 그 대괄호는 기관명이 아니라 제목의 일부다
  return rest.trim().length >= 4
    ? { title: rest.trim(), bracket: bracket.trim() }
    : { title: rawTitle.trim(), bracket: '' }
}

// 장소에 이미 기관 이름이 들어 있는 경우가 많다 ("노화랑 1,2층 전시장" ↔ "노화랑").
// 그대로 두면 같은 이름이 두 줄에 걸쳐 반복된다.
function isRedundant(organizer, venue) {
  const squash = (v) => (v || '').replace(/[\s·()[\]]/g, '')
  const o = squash(organizer)
  const p = squash(venue)
  if (!o || !p) return false
  return p.includes(o) || o.includes(p)
}

// 회차 문구는 네 가지 중 하나를 고른다. 목업은 배열 index 로 고르지만 실제 행사에는
// index 가 없으니 id 로 고른다 — 같은 행사가 새로고침마다 다른 회차를 보이면 안 된다.
function pickSchedule(seed = '') {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  return SCHEDULE_SAMPLES[hash % SCHEDULE_SAMPLES.length]
}

/**
 * 행사 한 건에 파생 필드를 붙인다.
 * 목업은 이미 갖고 있는 필드라 덮어쓰지 않는다 — 실제 API 문서에만 채워진다.
 */
export function normalizeEvent(event) {
  if (!event) return event

  const category = event.category || '기타'
  const { title, bracket } = splitOrganizer(event.title || '')
  const venue = event.venue || ''
  const rawOrganizer = event.organizer ?? bracket
  const isSeries = event.isSeries ?? SERIES_CATEGORIES.has(category)

  return {
    ...event,
    title,
    organizer: isRedundant(rawOrganizer, venue) ? '' : rawOrganizer,
    runtimeMin: event.runtimeMin ?? RUNTIME_BY_CATEGORY[category] ?? null,
    isSeries,
    schedule: event.schedule ?? (isSeries ? pickSchedule(String(event._id || event.sourceId || title)) : ''),
  }
}

/** 목록용 — 배열 전체에 적용 */
export function normalizeEvents(events = []) {
  return events.map(normalizeEvent)
}
