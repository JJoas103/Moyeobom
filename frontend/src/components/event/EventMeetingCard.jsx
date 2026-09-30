// 상세의 "이 행사로 열린 모임" 카드. 시안 v2 의 3열 그리드.
//
// 카드 위쪽에는 만나는 날짜가 배지로 붙는다 — 이 화면에서 모임을 고르는 기준은
// 제목이 아니라 "언제 가는가"여서다. 마감된 모임은 지우지 않고 베일을 덮어 남긴다.
// 몇 개나 이미 찼는지가 "이 행사에 사람이 모인다"는 신호이기 때문이다.
//
// 조건 줄(관람부터 함께 가능 · 술 없음 · 1~2만 원 · 23:00 종료)은 값이 있을 때만 쓴다.
// withViewing · drinking · budget · endAt 은 models/Meeting.js 에 없는 목업 전용 필드라
// 실제 API 로 받은 모임에는 비어 있다. 빈 칸을 남기는 대신 줄 자체를 뺀다.

import { Link } from 'react-router-dom'
import Poster from '../common/Poster'
import { categoryEng } from '../../utils/eventCategory'
import { formatMeetingDateLines } from '../../utils/formatEventDate'
import { endLabel } from '../meeting/MeetingTerms'

/** 남은 자리로 상태를 정한다. status 가 completed 면 그게 먼저다 */
function seatState(meeting) {
  const joined = meeting.participants?.length || 0
  const max = meeting.maxParticipants || 1
  const left = Math.max(0, max - joined)

  if (meeting.status === 'completed') return { tone: 'closed', label: '종료', left, joined, max }
  if (meeting.isFull || meeting.status === 'full' || left === 0)
    return { tone: 'closed', label: '마감', left, joined, max }
  if (left <= 1) return { tone: 'soon', label: '1자리 남음', left, joined, max }
  return { tone: 'open', label: `${left}자리 남음`, left, joined, max }
}

/** 신청 전에 공개되는 조건 — 있는 것만 모은다 */
function visibleTerms(meeting) {
  return [
    meeting.drinking && `술 ${meeting.drinking}`,
    meeting.budget,
  ].filter(Boolean)
}

function EventMeetingCard({ meeting, event }) {
  const { day, sub } = formatMeetingDateLines(meeting.meetingDate)
  const seat = seatState(meeting)
  const ratio = Math.min(100, Math.round((seat.joined / seat.max) * 100))
  const closed = seat.tone === 'closed'

  // 모임 사진이 있으면 그걸, 없으면 행사 포스터를 쓴다 (모임은 이 행사에서 파생됐다)
  const image = meeting.imageUrl || event?.posterUrl
  const kind =
    meeting.withViewing === undefined
      ? ''
      : meeting.withViewing
        ? '관람부터 함께 가능'
        : '이야기 자리만'
  const terms = visibleTerms(meeting)
  const end = endLabel(meeting.endAt)

  return (
    <Link to={`/meeting/${meeting._id}`} className="mv-card mv-card__link">
      <div className="mv-card__img">
        <Poster
          src={image}
          category={event?.category}
          title={event?.title || meeting.title}
          overlay={
            <span className="mv-card__overlay">
              <span className="mv-card__eng">{categoryEng(event?.category)}</span>
              <span className="mv-card__postertitle">{event?.title || meeting.title}</span>
            </span>
          }
        />

        <span className="mv-card__badge mv-card__badge--date mv-num">
          {day} {sub}
        </span>

        {closed && <span className="mv-card__veil">{seat.label === '종료' ? '종료된 모임' : '마감된 모임'}</span>}
      </div>

      <span className="mv-card__statusline">
        <span className={`mv-card__status mv-card__status--${seat.tone}`}>{seat.label}</span>
        {kind && <span className="mv-card__kind mv-one">{kind}</span>}
      </span>

      <h3 className="mv-card__title mv-clamp2">{meeting.title}</h3>

      <span className="mv-card__meta mv-one">
        {[meeting.area, end].filter(Boolean).join(' · ')}
      </span>

      <span className="mv-card__seats">
        <span className="mv-gauge" aria-hidden="true">
          <span className={`mv-gauge__fill mv-gauge__fill--${seat.tone}`} style={{ width: `${ratio}%` }} />
        </span>
        <strong className="mv-num">
          {seat.joined}/{seat.max}
        </strong>
        {terms.length > 0 && <span className="mv-one">{terms.join(' · ')}</span>}
      </span>
    </Link>
  )
}

export default EventMeetingCard
