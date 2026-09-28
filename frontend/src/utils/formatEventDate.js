// 행사 날짜 표기.
//
// 모임(formatMeetingDate)은 "언제 만나나"라 시각이 중요하지만, 행사는 기간이 중요하다.
// 전시처럼 두 달 열리는 것과 하루짜리 공연을 같은 형식으로 쓰면 둘 다 읽기 나빠진다.

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

const pad = (n) => String(n).padStart(2, '0')
const md = (d) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
const ymd = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const hasTime = (d) => d.getHours() !== 0 || d.getMinutes() !== 0

/**
 * 목록 왼쪽 날짜 열에 쓰는 두 줄.
 * 기간 행사는 시작일 + "— 종료일", 하루짜리는 날짜 + 요일·시각.
 * 두 줄로 나눠야 자리가 고정돼 목록에서 세로로 줄이 선다.
 * @returns {{day: string, sub: string}}
 */
export function formatEventDateLines(startAt, endAt) {
  if (!startAt) return { day: '', sub: '' }
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null

  if (!end || start.toDateString() === end.toDateString()) {
    // 서울 API 는 공연 시각을 따로 주지 않아 대부분 00:00 으로 들어온다.
    // 자정을 "00:00" 이라고 적으면 새벽에 하는 행사처럼 읽히므로 요일만 쓴다.
    return { day: md(start), sub: hasTime(start) ? `${DAYS[start.getDay()]} ${hm(start)}` : DAYS[start.getDay()] }
  }
  return { day: md(start), sub: `— ${md(end)}` }
}

/** "09.14 — 10.26" / "10.01 (수) 19:30" — 한 줄로 쓸 때 */
export function formatEventPeriod(startAt, endAt) {
  if (!startAt) return ''
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null

  if (!end || start.toDateString() === end.toDateString()) {
    return `${md(start)} (${DAYS[start.getDay()]})${hasTime(start) ? ` ${hm(start)}` : ''}`
  }
  return `${md(start)} — ${md(end)}`
}

/** 상세 화면용 — 연도까지 */
export function formatEventPeriodFull(startAt, endAt) {
  if (!startAt) return ''
  const start = new Date(startAt)
  const end = endAt ? new Date(endAt) : null
  if (!end || start.toDateString() === end.toDateString()) {
    return `${ymd(start)} (${DAYS[start.getDay()]})${hasTime(start) ? ` ${hm(start)}` : ''}`
  }
  return `${ymd(start)} — ${ymd(end)}`
}

/**
 * 지금 이 행사가 어떤 상태인지.
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
    // 이미 시작해서 진행 중. 곧 끝나는 건 따로 알려 준다
    if (daysToEnd <= 7) return { tone: 'soon', label: `${daysToEnd}일 남음` }
    return { tone: 'now', label: '진행 중' }
  }

  const daysToStart = Math.ceil((start - now) / DAY)
  if (daysToStart === 0) return { tone: 'now', label: '오늘' }
  if (daysToStart === 1) return { tone: 'soon', label: '내일' }
  if (daysToStart <= 7) return { tone: 'soon', label: `${daysToStart}일 뒤` }
  return { tone: 'later', label: '예정' }
}

/** 마스트헤드에 쓰는 오늘 날짜 — "9월 28일 일요일" */
export function todayLabel() {
  const d = new Date()
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`
}

/**
 * 모임 날짜의 두 줄. 행사(formatEventDateLines)와 같은 MM.DD 형식으로 맞춘다.
 * 목록에서 행사 행과 모임 행이 섞여 나오는데 한쪽만 "수요일"이면 세로줄이 어긋난다.
 * 모임은 만나는 시각이 핵심이라 둘째 줄에 요일과 시각을 같이 둔다.
 * @returns {{day: string, sub: string}}
 */
export function formatMeetingDateLines(date) {
  if (!date) return { day: '', sub: '' }
  const d = new Date(date)
  return { day: md(d), sub: `${DAYS[d.getDay()]} ${hm(d)}` }
}

/**
 * 행사의 예상 종료 시각 — "약 22:00".
 *
 * 서울 문화행사 API 는 종료 시각을 주지 않아 시작 시각에 러닝타임을 더해 계산한다.
 * 추정값이므로 화면에서도 "(시작 시각 + 러닝타임 예상값)"이라고 밝힌다.
 * 시각이 없는 행사(자정으로 들어온다)는 저녁 공연을 가정해 19:30 기준으로 잡는다.
 */
export function expectedEndLabel(event) {
  if (!event?.runtimeMin || !event.startAt) return '—'
  const start = new Date(event.startAt)
  if (start.getHours() === 0 && start.getMinutes() === 0) start.setHours(19, 30, 0, 0)
  const end = new Date(start.getTime() + event.runtimeMin * 60 * 1000)
  return `약 ${hm(end)}`
}

/** <input type="time"> 이 요구하는 형식 — "21:30" */
export function toTimeInput(date) {
  return hm(date)
}
