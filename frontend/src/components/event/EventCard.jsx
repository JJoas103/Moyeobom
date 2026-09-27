// 행사 카드.
//
// 목록에서 한 행사에 대해 알려주는 것은 네 가지뿐이다 — 무엇을, 언제, 어디서,
// 그리고 여기에 사람이 모여 있는지. 그 이상 담으면 카드가 읽히지 않는다.
// 추천 화면에서는 reasons 가 함께 붙어 "왜 떴는지"가 카드 안에서 끝난다.

import { Link } from 'react-router-dom'
import Poster from '../common/Poster'
import ReasonChips from './ReasonChips'
import { eventTimingBadge, formatEventPeriod } from '../../utils/formatEventDate'

const TIMING_TONE = {
  now: 'chip-green',
  soon: 'chip-yellow',
  later: 'chip-brand',
  ended: 'chip-red',
}

function EventCard({ event, reasons = [], score = null }) {
  const timing = eventTimingBadge(event.startAt, event.endAt)
  const openMeetingCount = event.openMeetingCount ?? 0
  const impressionCount = event.impressionCount ?? 0

  return (
    <Link to={`/event/${event._id}`} className="text-decoration-none text-dark d-block h-100">
      <div className="card h-100 shadow-sm overflow-hidden">
        <div className="position-relative">
          <Poster src={event.posterUrl} category={event.category} alt={event.title} />
          {timing && (
            <span
              className={`chip ${TIMING_TONE[timing.tone]} position-absolute`}
              style={{ top: 10, left: 10, background: '#fff' }}
            >
              {timing.label}
            </span>
          )}
          {score !== null && (
            <span
              className="chip position-absolute fw-bold"
              style={{ top: 10, right: 10, background: '#fff', color: 'var(--brand)', border: '1px solid var(--brand-border)' }}
            >
              추천 {score}
            </span>
          )}
        </div>

        <div className="card-body d-flex flex-column gap-2">
          <div>
            <span className="chip chip-brand mb-2">{event.category}</span>
            <h6 className="card-title mb-1 text-truncate" title={event.title}>
              {event.title}
            </h6>
            <div className="small text-muted text-truncate">
              {formatEventPeriod(event.startAt, event.endAt)} · {event.area}
            </div>
            <div className="small text-muted text-truncate">{event.venue}</div>
          </div>

          {reasons.length > 0 && <ReasonChips reasons={reasons} />}

          {/* 카드 하단은 항상 같은 자리에 오도록 mt-auto 로 밀어 둔다.
              좁은 카드에서 "35,000 / 원" 으로 끊기지 않게 각 항목을 nowrap 으로 묶는다 */}
          <div className="small text-muted d-flex flex-wrap gap-2 mt-auto pt-1">
            <span className="text-nowrap">
              🤝 모임 <strong className="text-dark">{openMeetingCount}</strong>
            </span>
            <span className="text-nowrap">
              💬 감상 <strong className="text-dark">{impressionCount}</strong>
            </span>
            <span className="ms-auto text-nowrap">{event.price || '무료'}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default EventCard
