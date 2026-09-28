// 모임이 신청 전에 공개하는 조건.
//
// 시안 v2 가 "관람부터 함께 가능 · 술 없음 · 1~2만 원 · 23:00 종료 예정" 형태로 쓴다.
// 신청하기 전에 알아야 결정할 수 있는 것들이라 목록에도 상세에도 같은 문구로 나와야 한다.
// 목록과 상세가 각자 문구를 만들면 한쪽만 고쳐지는 일이 생기므로 여기로 모았다.

/** "23:00 종료 예정" — 날짜는 빼고 시각만 */
export function endLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())} 종료 예정`
}

/** 조건을 순서대로 담은 배열. 화면에 따라 이어 붙이거나 하나씩 쓴다 */
export function meetingTerms(meeting) {
  return [
    meeting.withViewing ? '관람부터 함께 가능' : '이야기 자리만',
    `술 ${meeting.drinking || '없음'}`,
    meeting.budget,
    endLabel(meeting.endAt),
  ].filter(Boolean)
}

/**
 * 한 줄로 이어 붙인 조건.
 * @param {object} meeting
 * @param {string} [className] 감쌀 <p> 의 클래스
 */
function MeetingTerms({ meeting, className = 'mv-meta mv-meta--oneline mb-0' }) {
  return <p className={className}>{meetingTerms(meeting).join(' · ')}</p>
}

export default MeetingTerms
