import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, API_BASE_URL } from '../api'
import { loadKakaoMaps } from '../utils/loadKakaoMaps'

// views/index.ejs 를 옮긴 메인(지도 탐색) 페이지
const MARKER_IMAGES = {
  혼잡: `${API_BASE_URL}/images/marker_crowdede.png`,
  '약간 붐빔': `${API_BASE_URL}/images/marker_little_crowded.png`,
  보통: `${API_BASE_URL}/images/marker_normal.png`,
}
const DEFAULT_MARKER_IMAGE = `${API_BASE_URL}/images/marker_available.png`

const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function Home() {
  const navigate = useNavigate()
  const [congestion, setCongestion] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [mainMeetings, setMainMeetings] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')

  const mapContainerRef = useRef(null)
  const mapObjRef = useRef(null)
  const kakaoRef = useRef(null)
  const markersRef = useRef([])

  const renderMarkers = (positions) => {
    const kakao = kakaoRef.current
    const map = mapObjRef.current
    if (!kakao || !map) return

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const imageSize = new kakao.maps.Size(50, 50)
    positions.forEach((pos) => {
      const markerImage = new kakao.maps.MarkerImage(MARKER_IMAGES[pos.congest_lvl] || DEFAULT_MARKER_IMAGE, imageSize)
      const marker = new kakao.maps.Marker({
        map,
        position: new kakao.maps.LatLng(pos.latitude, pos.longitude),
        title: pos.name,
        image: markerImage,
      })
      kakao.maps.event.addListener(marker, 'click', () => navigate(`/place/${pos.area_cd}`))
      markersRef.current.push(marker)
    })
  }

  // 최초 진입: 지도 초기화 + 첫 혼잡도 데이터 로드
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const [kakao, data] = await Promise.all([loadKakaoMaps(), apiGet('/api/congestion')])
        if (cancelled || !mapContainerRef.current) return

        kakaoRef.current = kakao
        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 8,
        })
        mapObjRef.current = map

        setCongestion(data)
        renderMarkers(data.markerInfo)
      } catch (err) {
        if (!cancelled) setMapError(err.message)
      }
    }

    init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 최신 모임 6개 로드
  useEffect(() => {
    let cancelled = false

    apiGet('/api/meeting/main')
      .then((data) => {
        if (!cancelled) setMainMeetings(data.meetings)
      })
      .catch((err) => {
        console.warn('메인 데이터를 가져오는데 실패했습니다: ', err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 5분마다 자동 갱신
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const data = await apiGet('/api/congestion')
        setCongestion(data)
        renderMarkers(data.markerInfo)
      } catch (err) {
        console.warn('혼잡도 갱신 실패:', err.message)
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const surgePlace = congestion?.surgePlace || []
  const congestPlaceTopFive = congestion?.congestPlaceTopFive || []
  const placeInfoLimt = congestion?.placeInfoLimt || []

  // views/index.ejs 의 form action="/place/search" method="get"과 동일한 동작
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const trimmed = searchKeyword.trim()
    if (!trimmed) return
    navigate(`/place/search?keyword=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div>
      <section className="hero p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-lg-7">
            <h1 className="display-5 mb-3">지금, 여유로운 서울을 만나다</h1>
            <p className="lead">실시간 혼잡도와 모임 정보로 편안한 동네를 찾아보세요</p>
          </div>
          <div className="col-lg-5 d-none d-lg-block text-center">
            <div style={{ fontSize: 100 }}>🗺️</div>
          </div>
        </div>
      </section>

      <div className="mb-4">
        <form onSubmit={handleSearchSubmit}>
          <div className="input-group input-group-lg">
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="🔍 지역·장소·모임 검색"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <button type="submit" className="btn btn-brand btn-lg">
              검색
            </button>
          </div>
        </form>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-lg-9">
          {mapError ? (
            <div className="map-wrap d-flex align-items-center justify-content-center text-muted">
              지도를 불러올 수 없습니다 ({mapError})
              <div className="map-legend">
                <span>
                  <span className="dot dot-green"></span> 여유
                </span>
                <span>
                  <span className="dot dot-yellow"></span> 보통
                </span>
                <span>
                  <span className="dot dot-red"></span> 혼잡
                </span>
              </div>
            </div>
          ) : (
            <div className="map-wrap">
              <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
              <div className="map-legend">
                <span>
                  <span className="dot dot-green"></span> 여유
                </span>
                <span>
                  <span className="dot dot-yellow"></span> 보통
                </span>
                <span>
                  <span className="dot dot-red"></span> 혼잡
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="col-lg-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title mb-3">🔥 실시간 급증 TOP</h6>
              <ul className="list-group list-group-flush">
                {surgePlace.map((surge) => (
                  <li key={surge.area_nm} className="list-group-item d-flex justify-content-between">
                    <span>{surge.area_nm}</span>
                    <span className="text-danger fw-bold">{surge.surge_pct}%</span>
                  </li>
                ))}
              </ul>
              <br />
              <h6 className="card-title mb-3">🔥 혼잡붐빔 TOP 5</h6>
              <ul className="list-group list-group-flush">
                {congestPlaceTopFive.map((congest) => (
                  <li key={congest.area_nm} className="list-group-item d-flex justify-content-between">
                    <span>{congest.area_nm}</span>
                    <span className="text-danger fw-bold">{congest.area_congest_lvl}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">🌿 지금 한산한 명소</h5>
        <div>
          <Link to="/place/quiet" className="small text-decoration-none me-2" style={{ color: 'var(--brand)' }}>
            한산한 명소
          </Link>
          <Link to="/place" className="small text-decoration-none text-muted">
            전체 장소
          </Link>
        </div>
      </div>
      <div className="row g-3 mb-4">
        {placeInfoLimt.map((place) => (
          <div key={place.area_cd} className="col-md-3 col-6">
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
                  <span className="chip chip-green">
                    <span className="dot dot-green"></span>
                    {place.congest_lvl}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <hr className="my-4" />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">📌 최신 모임</h5>
        <Link to="/meeting/list" className="small text-decoration-none" style={{ color: 'var(--brand)' }}>
          전체보기
        </Link>
      </div>
      <div className="row g-3">
        {mainMeetings.map((meeting) => (
          <div key={meeting._id} className="col-md-4">
            <Link to={`/meeting/info/${meeting._id}`} className="text-decoration-none text-dark">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title mb-2">{meeting.title}</h6>
                  <div className="small text-muted mb-2">
                    📍 {meeting.area} · {meeting.status === 'recruit' ? '모집중' : '마감'}
                  </div>
                  <div className="small text-muted">작성자: {meeting.author.nickname}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Home
