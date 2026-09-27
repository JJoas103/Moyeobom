// 행사 날짜 표기.
//
// 모임(formatMeetingDate)은 "언제 만나나"라 시각이 중요하지만, 행사는 기간이 중요하다.
// 전시처럼 두 달 열리는 것과 하루짜리 공연을 같은 형식으로 쓰면 둘 다 읽기 나빠진다.

const pad = (n) => String(n).padStart(2, '0')
const md = (d) => `${d.getMonth() + 1}.${d.getDate()}`
const ymd = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`

/** "9.14 ~ 10.26" / "9.19 (금) 19:30" */
export function formatEventPeriod(startAt, endAt) {
  if (!startAt) return ''
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null

  const sameDay = end && start.toDateString() === end.toDateString()
  if (!end || sameDay) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const time = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    return `${md(start)} (${dayNames[start.getDay()]}) ${time}`
  }

  return `${md(start)} ~ ${md(end)}`
}

/** 상세 화면용 — 연도까지 */
export function formatEventPeriodFull(startAt, endAt) {
  if (!startAt) return ''
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null
  if (!end || start.toDateString() === end.toDateString()) return ymd(start)
  return `${ymd(start)} – ${ymd(end)}`
}

/**
 * 지금 이 행사가 어떤 상태인지. 카드 구석의 작은 뱃지에 쓴다.
 * @returns {{tone: 'now'|'soon'|'later'|'ended', label: string} | null}
 */
export function eventTimingBadge(startAt, endAt) {
  if (!startAt) return null
  const now = new Date()
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : start

  if (end < now) return { tone: 'ended', label: '종료' }

  const DAY = 24 * 60 * 60 * 1000
  const daysToEnd = Math.ceil((end - now) / DAY)

  if (start <= now) {
    // 이미 시작해서 진행 중. 곧 끝나는 건 따로 알려 준다.
    if (daysToEnd <= 7) return { tone: 'soon', label: `${daysToEnd}일 남음` }
    return { tone: 'now', label: '진행 중' }
  }

  const daysToStart = Math.ceil((start - now) / DAY)
  if (daysToStart === 0) return { tone: 'now', label: '오늘' }
  if (daysToStart === 1) return { tone: 'soon', label: '내일' }
  if (daysToStart <= 7) return { tone: 'soon', label: `${daysToStart}일 뒤` }
  return { tone: 'later', label: `${md(start)} 시작` }
}
