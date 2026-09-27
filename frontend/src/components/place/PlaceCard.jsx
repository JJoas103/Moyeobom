import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../api'

// views/place/search_result.ejs 의 카드 반복 영역(results.forEach)을 옮긴 컴포넌트.
// place.imageUrl은 백엔드(kakaoLocalService.getPlaceImage)가 내려주는 상대경로라, meeting.imageUrl/
// feed.image와 동일하게 렌더링 시점에 API_BASE_URL을 붙여줘야 실제 이미지를 찾는다.
function congestionChipClass(level) {
  if (level === '여유') return 'chip-green'
  if (level === '보통') return 'chip-yellow'
  return 'chip-red'
}

function congestionDotClass(level) {
  if (level === '여유') return 'dot-green'
  if (level === '보통') return 'dot-yellow'
  return 'dot-red'
}

function PlaceCard({ place }) {
  return (
    <div className="col-md-4 col-6">
      <Link to={`/place/${place.area_cd}`} className="text-decoration-none text-dark">
        <div className="card h-100 shadow-sm">
          {place.imageUrl ? (
            <img
              src={`${API_BASE_URL}${place.imageUrl}`}
              className="card-img-top"
              style={{ height: 120, objectFit: 'cover' }}
              alt={place.name}
            />
          ) : (
            <div className="placeholder-img">🌳</div>
          )}
          <div className="card-body">
            <h6 className="card-title mb-1">{place.name}</h6>
            <span className={`chip ${congestionChipClass(place.congest_lvl)}`}>
              <span className={`dot ${congestionDotClass(place.congest_lvl)}`}></span>
              {place.congest_lvl}
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default PlaceCard
