import { Link } from 'react-router-dom'

// 모임 카드 컴포넌트
function MeetingCard({ meeting }) {
  let chipClass = 'chip-green'
  let dotClass = 'dot-green'
  if (meeting.isExpired) {
    chipClass = 'chip-secondary'
    dotClass = 'dot-secondary'
  } else if (['혼잡', '붐빔', '약간 붐빔'].includes(meeting.congestionLevel)) {
    chipClass = 'chip-red'
    dotClass = 'dot-red'
  } else if (meeting.congestionLevel === '보통') {
    chipClass = 'chip-yellow'
    dotClass = 'dot-yellow'
  }

  return (
    <div className="col-md-6">
      <Link
        to={`/meeting/info/${meeting._id}`}
        className={`text-decoration-none text-dark`}
      >
        <div className={`card h-100 shadow-sm ${meeting.isExpired ? 'opacity-50' : meeting.isFull ? 'opacity-75' : ''}`}>
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <h6 className="card-title mb-0">
                {meeting.title}
                {meeting.isExpired && <span className="badge bg-secondary ms-1">기간만료</span>}
                {!meeting.isExpired && meeting.isFull && <span className="badge bg-danger ms-1">정원마감</span>}
                {!meeting.isExpired && !meeting.isFull && meeting.isClosingSoon && (
                  <span className="badge bg-warning text-dark ms-1">마감임박</span>
                )}
              </h6>
              <span className={`chip ${chipClass}`}>
                <span className={`dot ${dotClass}`}></span>
                {meeting.isExpired ? '종료' : meeting.congestionLevel}
              </span>
            </div>
            <div className="small text-muted mb-2">
              <span>
                {meeting.author.avatar_emoji} {meeting.author.nickname}
              </span>
              <span className="badge bg-light text-dark ms-1" style={{ border: '1px solid #ddd' }}>
                {meeting.author.manner_score.toFixed(1)}°C
              </span>
            </div>
            <div className="small text-muted mb-2">
              📍 {meeting.area} · {meeting.meetingDateLabel} · {meeting.participants.length}/{meeting.maxParticipants}명
            </div>
            <p className="small mb-2 text-truncate">{meeting.content}</p>
            <div>
              {meeting.tags.map((tag) => (
                <span key={tag} className="tag-soft">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default MeetingCard
