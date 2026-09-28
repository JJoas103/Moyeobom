// 모임 한 줄.
//
// 정원을 진행 막대로 그리지 않는다. 막대는 "얼마나 찼나"를 보여주지만 여기서 중요한 건
// "들어갈 자리가 있나"다. 숫자와 상태 한 줄이면 충분하고, 목록이 훨씬 조용해진다.
//
// 기존 components/meeting/MeetingCard.jsx 는 이전 기획(혼잡도)의 것이라 쓰지 않는다.

import { Link } from 'react-router-dom'
import Status from '../common/Status'
import { formatMeetingDateLines } from '../../utils/formatEventDate'

const STATUS = {
  recruit: { label: '모집중', tone: 'open' },
  full: { label: '마감', tone: 'full' },
  completed: { label: '종료', tone: 'done' },
}

function MeetingRow({ meeting, showEvent = false }) {
  const status = STATUS[meeting.status] || STATUS.recruit
  const { day, sub } = formatMeetingDateLines(meeting.meetingDate)
  const joined = meeting.participants?.length || 0
  const max = meeting.maxParticipants || 1
  const left = Math.max(0, max - joined)

  return (
    <li>
      <Link to={`/meeting/${meeting._id}`} className="mv-row">
        <div className="mv-row__date">
          <span className="mv-row__day">{day}</span>
          <span className="mv-row__sub">{sub}</span>
        </div>

        <div>
          {showEvent && meeting.event && (
            <p className="mv-micro mv-truncate mb-1">{meeting.event.title}</p>
          )}

          <p className="mv-row__title">{meeting.title}</p>

          {meeting.content && (
            <p className="mv-meta mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {meeting.content}
            </p>
          )}

          <p className="mv-meta mv-dotsep mb-0">
            <Status tone={status.tone}>{status.label}</Status>
            <span className="mv-num">
              {joined} / {max}
            </span>
            {meeting.status === 'recruit' && left > 0 && <span>{left}자리 남음</span>}
            <span>{meeting.area}</span>
          </p>

          {meeting.afterPlace?.name && (
            <p className="mv-meta mb-0 mt-1">
              <span className="mv-micro me-2">2차</span>
              {meeting.afterPlace.name}
            </p>
          )}
        </div>

        <div className="mv-micro text-end">
          {meeting.author?.nickname}
        </div>
      </Link>
    </li>
  )
}

export default MeetingRow
