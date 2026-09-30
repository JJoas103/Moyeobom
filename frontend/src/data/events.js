// 행사 데이터 접근.
//
// 화면은 여기만 부른다.
//
//   fetchEvents            목록 — 목업. /api/event/list 가 백엔드에 아직 없다
//   fetchRecommendedEvents 홈 추천 — USE_MOCK 토글
//   fetchEvent             상세 — id 모양으로 실제 API / 목업을 가른다 (아래 주석)
//   fetchSimilarEvents     상세의 "비슷한 행사"

import { apiGet } from '../api'
import { USE_MOCK, delay } from './config'
import { MOCK_EVENTS } from './mock/events'
import { impressionsOfEvent } from './mock/impressions'
import { meetingsOfEvent } from './mock/meetings'
import { MOCK_REASONS, reasonsOfEvent, scoreOfEvent } from './mock/reasons'
import { user } from './mock/users'
import { normalizeEvent, normalizeEvents } from './normalizeEvent'
import { categoryGroup } from '../utils/eventCategory'
import { SEOUL_AREAS } from './eventOptions'

// 실제 행사 _id 는 MongoDB ObjectId(24자 hex)고, 목업은 'evt-001' 이다.
// 목록이 목업이라 상세로 넘어오는 id 가 두 종류 섞이는데, 목업 id 를 실제 API 로 보내면
// Event.findById('evt-001') 이 CastError 를 내서 404 도 아닌 500 이 된다.
// 목록까지 실제 API 로 넘긴 뒤에는 이 분기를 지우면 된다.
const isRealId = (id) => /^[0-9a-f]{24}$/i.test(String(id || ''))

const isOngoingOrUpcoming = (event) => !event.endAt || new Date(event.endAt) >= new Date()

const matchKeyword = (event, keyword) => {
  if (!keyword) return true
  const haystack = `${event.title} ${event.venue} ${event.area} ${event.category}`.toLowerCase()
  return haystack.includes(keyword.toLowerCase())
}

// 기간 필터 — 오늘 / 이번 주 / 이번 달
const matchPeriod = (event, period) => {
  if (!period) return true
  const now = new Date()
  const start = new Date(event.startAt)
  const end = event.endAt ? new Date(event.endAt) : start

  const bound = new Date(now)
  bound.setHours(23, 59, 59, 999)
  if (period === 'week') bound.setDate(bound.getDate() + 7)
  if (period === 'month') bound.setDate(bound.getDate() + 30)

  // 기간 중인 행사도 포함해야 한다 (오늘 시작한 게 아니어도 오늘 볼 수 있으므로)
  return start <= bound && end >= now
}

// 서울 API 의 price 는 자유 문자열이라 무료 여부만 가른다
const matchFee = (event, fee) => {
  if (!fee) return true
  const free = !event.price || event.price === '무료'
  return fee === 'free' ? free : !free
}

/** 목록 조회 — 필터·검색·정렬·페이지네이션 */
export async function fetchEvents({
  category,
  area,
  genre,
  period,
  keyword,
  fee,
  hasMeeting,
  page = 1,
  limit = 15,
} = {}) {
  if (!USE_MOCK) {
    // 주의 — 이 엔드포인트는 백엔드에 아직 없다 (routes/api 에 event 라우터 미구현).
    // USE_MOCK 을 끄기 전에 먼저 만들어야 한다.
    return apiGet('/api/event/list', {
      params: { category, area, genre, period, keyword, fee, hasMeeting, page, limit },
    })
  }

  await delay()

  // 정원·모임 수로 걸러내고 정렬하므로 집계를 먼저 붙인다
  const all = MOCK_EVENTS.map(withCounts)

  const filtered = all
    .filter(
      (e) =>
        isOngoingOrUpcoming(e) &&
        // 필터 칩은 표시 분류(공연 · 전시 …)를 보내고, 데이터는 CODENAME 을 갖고 있다
        (!category || categoryGroup(e.category) === category) &&
        (!area || e.area === area) &&
        // 세부 장르 — models/Event.js 의 genres (GENRE_MAP 이 채운 태그)
        (!genre || (e.genres || []).includes(genre)) &&
        matchPeriod(e, period) &&
        matchFee(e, fee) &&
        matchKeyword(e, keyword) &&
        (!hasMeeting || e.openMeetingCount > 0),
    )
    // "모임이 많은 순" — 같은 수면 곧 시작하는 것을 앞에 둔다
    .sort(
      (a, b) =>
        b.openMeetingCount - a.openMeetingCount || new Date(a.startAt) - new Date(b.startAt),
    )

  const start = (page - 1) * limit
  const events = normalizeEvents(filtered.slice(start, start + limit))

  return {
    success: true,
    events,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    totalCount: filtered.length,
    currentPage: page,
  }
}

/**
 * 필터 드롭다운에 채울 선택지 — 지금 데이터에 실제로 있는 지역과 세부 장르.
 *
 * 서울 25개 구를 다 늘어놓으면 골라도 0건인 항목이 대부분이다. 있는 것만 보여준다.
 * 지역 순서는 eventOptions.SEOUL_AREAS(구 이름 가나다순)를 따른다 — 데이터에서 뽑은
 * 순서를 그대로 쓰면 목록이 바뀔 때마다 드롭다운 순서가 흔들린다.
 */
export async function fetchEventFacets() {
  if (!USE_MOCK) {
    return apiGet('/api/event/facets')
  }

  const live = MOCK_EVENTS.filter(isOngoingOrUpcoming)
  const areaSet = new Set(live.map((e) => e.area).filter(Boolean))
  const genreSet = new Set(live.flatMap((e) => e.genres || []))

  return {
    success: true,
    areas: SEOUL_AREAS.filter((a) => areaSet.has(a)),
    genres: [...genreSet].sort((a, b) => a.localeCompare(b, 'ko')),
  }
}

/** 개인화 추천 — 점수 순. 각 행사에 왜 떴는지가 함께 붙는다 */
export async function fetchRecommendedEvents({ limit = 4 } = {}) {
    if (!USE_MOCK) {
    return apiGet('/api/recommend', { params: { limit } })
  }

  await delay()

  const items = Object.keys(MOCK_REASONS)
    .map((id) => MOCK_EVENTS.find((e) => e._id === id))
    .filter((e) => e && isOngoingOrUpcoming(e))
    .map((event) => ({
      event: withCounts(event),
      score: scoreOfEvent(event._id),
      reasons: reasonsOfEvent(event._id),
      openMeetingCount: meetingsOfEvent(event._id).filter((m) => m.status !== 'completed').length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return {
    success: true,
    items,
    // 마스트헤드에 "열려 있는 행사 N" 으로 쓴다
    totalOpenEvents: MOCK_EVENTS.filter(isOngoingOrUpcoming).length,
    // 참여 이력도 친구도 없는 신규 유저는 이력·소셜 가중치를 0으로 두고 다시 계산한다.
    // 빈 화면이 나오지 않게 하기 위한 것이고, 화면에서도 숨기지 않고 알려 준다.
    isColdStart: false,
    hasPreferences: true,
  }
}

/**
 * 상세 조회 — 이 행사에 열린 모임과 추천 근거까지 한 번에.
 *
 * 실제 API 응답은 { success, event, meetings, reasons } 다. impressions(감상) 는
 * 백엔드에 모델도 라우트도 없어서 오지 않는다 — 시안 v2 에서 감상 섹션이 빠졌으니
 * 화면도 그 키를 읽지 않는다.
 */
export async function fetchEvent(eventId) {
  if (isRealId(eventId)) {
    const data = await apiGet(`/api/recommend/event/${eventId}`)
    return {
      ...data,
      event: normalizeEvent(data.event),
      meetings: data.meetings || [],
      reasons: data.reasons || [],
    }
  }

  await delay()

  const event = MOCK_EVENTS.find((e) => e._id === eventId)
  if (!event) {
    const error = new Error('행사를 찾을 수 없습니다')
    error.status = 404
    throw error
  }

  const impressions = impressionsOfEvent(eventId).map((i) => ({ ...i, author: user(i.author) }))

  return {
    success: true,
    event: normalizeEvent(withCounts(event)),
    meetings: meetingsOfEvent(eventId).map(expandMeeting),
    impressions,
    reasons: reasonsOfEvent(eventId),
    score: scoreOfEvent(eventId),
  }
}

/**
 * 같은 분류의 다른 행사 — 상세 맨 아래 "비슷한 행사".
 *
 * 실제 행사는 /api/recommend/search 를 쓴다. eventApiService.searchEvents 가 keyword 를
 * title·venue·area·category 에 regex 로 걸기 때문에 CODENAME 을 넘기면 같은 분류가 온다.
 * 목록 엔드포인트가 없어도 되고 백엔드를 고칠 필요도 없다.
 */
export async function fetchSimilarEvents(event, { limit = 3 } = {}) {
  if (!event) return []

  if (isRealId(event._id)) {
    const data = await apiGet('/api/recommend/search', { params: { keyword: event.category } })
    return normalizeEvents(
      (data.events || []).filter((e) => String(e._id) !== String(event._id)).slice(0, limit),
    )
  }

  await delay()

  return normalizeEvents(
    MOCK_EVENTS.filter(
      (e) => e._id !== event._id && e.category === event.category && isOngoingOrUpcoming(e),
    )
      .map(withCounts)
      .sort((a, b) => b.openMeetingCount - a.openMeetingCount)
      .slice(0, limit),
  )
}

// 카드에 바로 쓰도록 집계 두 개를 붙여 둔다.
// 서버에서는 recommendService 가 같은 값을 계산해 내려준다.
function withCounts(event) {
  return {
    ...event,
    openMeetingCount: meetingsOfEvent(event._id).filter((m) => m.status !== 'completed').length,
    impressionCount: impressionsOfEvent(event._id).length,
  }
}

function expandMeeting(meeting) {
  return {
    ...meeting,
    author: user(meeting.author),
    participants: meeting.participants.map(user),
  }
}

export { withCounts, expandMeeting }
