// 내 기록 — 본 행사 · 남긴 감상 · 친구.
//
// 재참여 루프가 한 바퀴 돌고 나서 남는 것들이다.
// 관람 → 감상 → 상호 매칭 → 친구 → 친구가 가는 행사가 다시 추천에 뜸.

import { apiGet } from '../api'
import { USE_MOCK, delay } from './config'
import { ME, user } from './mock/users'
import { MOCK_FRIENDS, MOCK_PENDING_REVIEWS } from './mock/friends'
import { MOCK_IMPRESSIONS } from './mock/impressions'
import { MOCK_MEETINGS } from './mock/meetings'
import { MOCK_EVENTS } from './mock/events'

export async function fetchMyProfile() {
  if (!USE_MOCK) return apiGet('/api/member/me')
  await delay()
  return { success: true, user: ME }
}

/** 내가 참여했던 모임과 그 행사 */
export async function fetchMyEvents() {
  if (!USE_MOCK) return apiGet('/api/member/events')
  await delay()

  const mine = MOCK_MEETINGS.filter((m) => m.participants.includes(ME._id)).sort(
    (a, b) => new Date(b.meetingDate) - new Date(a.meetingDate),
  )

  return {
    success: true,
    items: mine.map((m) => ({
      meetingId: m._id,
      meetingTitle: m.title,
      meetingDate: m.meetingDate,
      status: m.status,
      event: m.event,
    })),
  }
}

/** 내가 남긴 감상 */
export async function fetchMyImpressions() {
  if (!USE_MOCK) return apiGet('/api/member/impressions')
  await delay()

  const mine = MOCK_IMPRESSIONS.filter((i) => i.author === ME._id).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )

  return {
    success: true,
    items: mine.map((i) => ({
      ...i,
      event: MOCK_EVENTS.find((e) => e._id === i.event) || null,
    })),
  }
}

/** 친구 목록 + 아직 평가하지 않은 모임 */
export async function fetchFriends() {
  if (!USE_MOCK) return apiGet('/api/friend/list')
  await delay()

  return {
    success: true,
    friends: MOCK_FRIENDS.map((f) => ({ ...f, user: user(f.user) })),
    pendingReviews: MOCK_PENDING_REVIEWS.map((p) => ({ ...p, others: p.others.map(user) })),
  }
}

export { ME }
