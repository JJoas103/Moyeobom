// 행사 데이터 접근.
//
// 화면은 여기만 부른다. USE_MOCK 이 켜져 있으면 목업을, 꺼지면 /api/event 를 부른다.
// 반환 모양이 같아서 화면 코드는 어느 쪽이든 그대로 동작한다.

import { apiGet } from '../api'
import { USE_MOCK, delay } from './config'
import { MOCK_EVENTS } from './mock/events'
import { impressionsOfEvent } from './mock/impressions'
import { meetingsOfEvent } from './mock/meetings'
import { MOCK_REASONS, reasonsOfEvent, scoreOfEvent } from './mock/reasons'
import { user } from './mock/users'

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

/** 목록 조회 — 필터·검색·페이지네이션 */
export async function fetchEvents({ category, area, period, keyword, page = 1, limit = 12 } = {}) {
  if (!USE_MOCK) {
    return apiGet('/api/event/list', { params: { category, area, period, keyword, page, limit } })
  }

  await delay()

  const filtered = MOCK_EVENTS.filter(
    (e) =>
      isOngoingOrUpcoming(e) &&
      (!category || e.category === category) &&
      (!area || e.area === area) &&
      matchPeriod(e, period) &&
      matchKeyword(e, keyword),
  ).sort((a, b) => new Date(a.startAt) - new Date(b.startAt))

  const start = (page - 1) * limit
  const events = filtered.slice(start, start + limit).map(withCounts)

  return {
    success: true,
    events,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
    totalCount: filtered.length,
    currentPage: page,
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

/** 상세 조회 — 이 행사에 열린 모임과 쌓인 감상까지 한 번에 */
export async function fetchEvent(eventId) {
  if (!USE_MOCK) {
    return apiGet(`/api/recommend/event/${eventId}`)
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
    event: withCounts(event),
    meetings: meetingsOfEvent(eventId).map(expandMeeting),
    impressions,
    reasons: reasonsOfEvent(eventId),
    score: scoreOfEvent(eventId),
  }
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
