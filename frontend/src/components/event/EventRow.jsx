// 행사 한 줄.
//
// 도록의 기본 단위다 — 날짜 | 본문 | 포스터.
// 날짜를 왼쪽 열에 고정해 tabular-nums 로 자리를 맞추면 목록 전체에서 세로로 줄이 선다.
// 그게 카드 그리드와 가장 크게 달라지는 지점이다.

import { Link } from 'react-router-dom'
import Poster from '../common/Poster'
import Status from '../common/Status'
import ReasonLine from './ReasonLine'
import { eventTimingBadge, formatEventDateLines } from '../../utils/formatEventDate'

function EventRow({ event, reasons = [] }) {
  const { day, sub } = formatEventDateLines(event.startAt, event.endAt)
  const timing = eventTimingBadge(event.startAt, event.endAt)
  const openMeetingCount = event.openMeetingCount ?? 0
  const impressionCount = event.impressionCount ?? 0

  return (
    <li>
      <Link to={`/event/${event._id}`} className="mv-row">
        <div className="mv-row__date">
          <span className="mv-row__day">{day}</span>
          <span className="mv-row__sub">{sub}</span>
        </div>

        <div>
          <p className="mv-row__title">{event.title}</p>
          <p className="mv-meta mv-dotsep mv-meta--oneline mb-1">
            <span>{event.venue}</span>
            <span>{event.area}</span>
            <span>{event.price || '무료'}</span>
          </p>

          <p className="mv-meta mv-dotsep mb-0">
            <span className="mv-tag">{event.category}</span>
            {timing && <Status tone={timing.tone === 'ended' ? 'done' : 'open'}>{timing.label}</Status>}
            {openMeetingCount > 0 && <span className="mv-num">모임 {openMeetingCount}</span>}
            {impressionCount > 0 && <span className="mv-num">감상 {impressionCount}</span>}
          </p>

          {reasons.length > 0 && (
            <div className="mt-2">
              <ReasonLine reasons={reasons} />
            </div>
          )}
        </div>

        <div className="mv-row__poster">
          <Poster src={event.posterUrl} category={event.category} alt={event.title} />
        </div>
      </Link>
    </li>
  )
}

export default EventRow
