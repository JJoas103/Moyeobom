import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api'

// views/feed/list.ejs 의 카드 반복 영역(feeds.forEach) 컴포넌트.
function FeedCard({ feed }) {
  return (
    <div className="col-md-6 col-lg-4">
      <div className="card h-100 shadow-sm">
        {feed.image && (
          <img
            src={`${API_BASE_URL}/images/upload/${feed.image}`}
            className="card-img-top"
            alt="제보 이미지"
            style={{ height: 200, objectFit: 'cover' }}
          />
        )}
        <div className="card-body">
          <div className="d-flex align-items-center mb-2">
            <span className="me-2">{feed.author ? feed.author.avatar_emoji : '👤'}</span>
            <span className="fw-bold small">{feed.author ? feed.author.nickname : '탈퇴한 사용자'}</span>
            {feed.author && typeof feed.author.manner_score === 'number' && (
              <span className="manner-temp-badge ms-1">{feed.author.manner_score.toFixed(1)}℃</span>
            )}
            <span className="ms-auto text-muted small">{new Date(feed.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="card-text text-truncate">{feed.content}</p>
          <div className="d-flex justify-content-between align-items-center">
            <span className="tag-soft">📍 {feed.locationTag}</span>
            <Link to={`/feed/info/${feed._id}`} className="btn btn-sm btn-outline-brand">
              상세보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedCard
