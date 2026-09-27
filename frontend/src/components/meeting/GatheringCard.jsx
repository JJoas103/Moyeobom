// 모임 카드 (행사 기반).
//
// 기존 components/meeting/MeetingCard.jsx 는 혼잡도 기반 기획의 것이라 쓰지 않는다.
// 여기서 중요한 건 정원이다 — 몇 자리 남았는지가 보여야 "게시판 글"이 아니라
// "상태가 있는 모임"으로 읽힌다.

import { Link } from 'react-router-dom'
import { formatMeetingDate } from '../../utils/formatMeetingDate'

const STATUS = {
  recruit: { label: '모집중', tone: 'chip-green' },
  full: { label: '마감', tone: 'chip-yellow' },
  completed: { label: '종료', tone: 'chip-red' },
}

function GatheringCard({ meeting, showEvent = false }) {
  const status = STATUS[meeting.status] || STATUS.recruit
  const joined = meeting.participants?.length || 0
  const max = meeting.maxParticipants || 1
  const ratio = Math.min(100, Math.round((joined / max) * 100))
  const left = Math.max(0, max - joined)

  return (
    <Link to={`/meeting/${meeting._id}`} className="text-decoration-none text-dark d-block h-100">
      <div className="card h-100 shadow-sm">
        <div className="card-body d-flex flex-column gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className={`chip ${status.tone}`}>{status.label}</span>
            {meeting.status === 'recruit' && left > 0 && (
              <span className="small text-muted">{left}자리 남음</span>
            )}
          </div>

          {showEvent && meeting.event && (
            <div className="small text-truncate" style={{ color: 'var(--brand)' }} title={meeting.event.title}>
              🎫 {meeting.event.title}
            </div>
          )}

          <h6 className="card-title mb-0 text-truncate" title={meeting.title}>
            {meeting.title}
          </h6>

          <p className="small text-muted mb-0" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {meeting.content}
          </p>

          <div className="small text-muted">
            🕘 {formatMeetingDate(meeting.meetingDate)} · 📍 {meeting.area}
          </div>

          {meeting.afterPlace?.name && (
            <div className="small" style={{ color: 'var(--brand)' }}>
              ☕ 2차 · {meeting.afterPlace.name}
            </div>
          )}

          <div className="mt-auto pt-1">
            <div className="d-flex justify-content-between align-items-center small text-muted mb-1">
              <span>
                {meeting.author?.avatar_emoji} {meeting.author?.nickname}
              </span>
              <span>
                {joined} / {max}
              </span>
            </div>
            <div className="manner-bar-bg">
              <div className="manner-bar-fill" style={{ width: `${ratio}%` }} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default GatheringCard
