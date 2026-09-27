// 모임 데이터 접근.
//
// 모든 모임은 행사(event)를 참조한다. 제목·날짜·장소가 행사에서 따라오는 구조라
// 화면에서도 모임 단독이 아니라 "어느 행사의 모임"으로 보여야 한다.

import { apiGet } from '../api'
import { USE_MOCK, delay } from './config'
import { MOCK_MEETINGS } from './mock/meetings'
import { cafesNear } from './mock/cafes'
import { expandMeeting } from './events'

const STATUS_LABEL = {
  recruit: '모집중',
  full: '마감',
  completed: '종료',
}

/** 모임 목록 — 행사 단위로 묶어서 돌려준다 */
export async function fetchMeetings({ status, keyword } = {}) {
  if (!USE_MOCK) {
    return apiGet('/api/meeting/list', { params: { status, keyword } })
  }

  await delay()

  const filtered = MOCK_MEETINGS.filter((m) => {
    if (status && m.status !== status) return false
    if (!keyword) return true
    const haystack = `${m.title} ${m.content} ${m.area} ${m.event?.title || ''} ${(m.tags || []).join(' ')}`
    return haystack.toLowerCase().includes(keyword.toLowerCase())
  }).sort((a, b) => {
    // 끝난 모임은 뒤로 보낸다. 앞에 두면 목록을 열자마자 '종료'부터 보여 서비스가 죽은 것처럼 읽힌다.
    const ended = (m) => (m.status === 'completed' ? 1 : 0)
    if (ended(a) !== ended(b)) return ended(a) - ended(b)
    return new Date(a.meetingDate) - new Date(b.meetingDate)
  })

  // 같은 행사의 모임이 한 덩어리로 보이는 것이 게시판과 다른 지점이다.
  // 화면에서 그렇게 그릴 수 있도록 여기서 미리 묶는다.
  const groups = []
  const indexByEvent = new Map()

  for (const meeting of filtered) {
    const eventId = meeting.event?._id || 'none'
    if (!indexByEvent.has(eventId)) {
      indexByEvent.set(eventId, groups.length)
      groups.push({ event: meeting.event || null, meetings: [] })
    }
    groups[indexByEvent.get(eventId)].meetings.push(expandMeeting(meeting))
  }

  return { success: true, groups, totalCount: filtered.length }
}

/** 모임 상세 — 참여자, 2차 장소 후보까지 */
export async function fetchMeeting(meetingId) {
  if (!USE_MOCK) {
    return apiGet(`/api/meeting/info/${meetingId}`)
  }

  await delay()

  const meeting = MOCK_MEETINGS.find((m) => m._id === meetingId)
  if (!meeting) {
    const error = new Error('모임을 찾을 수 없습니다')
    error.status = 404
    throw error
  }

  return {
    success: true,
    meeting: expandMeeting(meeting),
    // 실제로는 행사 좌표를 기준으로 카카오 로컬 API가 검색한다
    cafeCandidates: cafesNear(meeting.area),
  }
}

export { STATUS_LABEL }
