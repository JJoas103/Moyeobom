// app.js의 res.locals.formatMeetingDate(EJS 전역 헬퍼)를 그대로 옮긴 함수
// 목록 카드에서 "오늘 19:00" / "내일 09:00" / "토요일 14:00" 같은 상대적 표기에 사용
export function formatMeetingDate(date) {
  if (!date) return ''
  const now = new Date()
  const target = new Date(date)

  // 날짜 부분만 비교하기 위해 시간 초기화
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate())

  const diffTime = targetDay - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  const timeStr = target.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

  if (diffDays === 0) return `오늘 ${timeStr}`
  if (diffDays === 1) return `내일 ${timeStr}`
  if (diffDays > 1 && diffDays < 7) {
    return `${dayNames[target.getDay()]} ${timeStr}`
  }
  if (diffDays >= 7 && diffDays < 14) {
    return `다음주 ${dayNames[target.getDay()]} ${timeStr}`
  }
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')} ${timeStr}`
}
