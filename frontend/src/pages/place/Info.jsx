import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPost, apiDelete, API_BASE_URL } from '../../api'
import { loadKakaoMaps } from '../../utils/loadKakaoMaps'
import ErrorMessage from '../../components/ErrorMessage'

// views/place/place_info.ejs 를 옮긴 장소 상세 페이지.
// GET /api/place/:area_cd 로 실제 장소 정보(이름/카테고리/혼잡도/위도경도/찜 여부/주변 주차장·화장실/
// 이 장소 모임 목록/날씨/가까운 대중교통/대표 이미지)를 모두 불러오고, 그 좌표로 카카오 지도(마커 1개,
// 원본과 동일하게 level 4)를 띄운다. 찜하기/찜 해제, 방문 인증(+2 매너점수)도 실제로 연결되어 있어
// 이 페이지는 이제 원본과 거의 동일하게 동작한다.

function congestionText(level) {
  if (level === '여유') return { className: 'text-success', chipClass: 'chip-green', dotClass: 'dot-green', hint: '지금 적합' }
  if (level === '보통') return { className: 'text-warning', chipClass: 'chip-yellow', dotClass: 'dot-yellow', hint: '보통 수준' }
  return { className: 'text-danger', chipClass: 'chip-red', dotClass: 'dot-red', hint: '혼잡 주의' }
}

function Info() {
  const { area_cd } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()

  const [place, setPlace] = useState(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [parkingInfo, setParkingInfo] = useState([])
  const [restroomInfo, setRestroomInfo] = useState([])
  const [meetings, setMeetings] = useState([])
  const [weather, setWeather] = useState(null)
  const [transitInfo, setTransitInfo] = useState(null)
  const [placeImage, setPlaceImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mapError, setMapError] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const mapContainerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPlace(null)

    apiGet(`/api/place/${area_cd}`)
      .then((data) => {
        if (!cancelled) {
          setPlace(data.place)
          setIsFavorite(data.isFavorite)
          setParkingInfo(data.parkingInfo)
          setRestroomInfo(data.restroomInfo)
          setMeetings(data.meetings)
          setWeather(data.weather)
          setTransitInfo(data.transitInfo)
          setPlaceImage(data.placeImage)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [area_cd])

  // views/place/place_info.ejs 의 handleFavorite()와 동일 - 찜 이유를 prompt로 받아서 등록한다.
  const handleAddFavorite = async () => {
    const reason = prompt('이 장소를 찜하는 이유를 입력해주세요 (예: 한산해서 좋아요, 풍경이 예뻐요):')
    if (reason === null) return
    if (reason.trim() === '') {
      alert('이유를 입력해야 찜할 수 있습니다.')
      return
    }

    try {
      const result = await apiPost('/api/member/favorites', { place_id: place.area_cd, reason })
      alert(result.message)
      if (result.success) setIsFavorite(true)
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  const handleRemoveFavorite = async () => {
    if (!confirm('찜한 장소에서 삭제하시겠습니까?')) return
    try {
      const result = await apiDelete('/api/member/favorites', { place_id: place.area_cd })
      if (result.success) {
        alert(result.message)
        // 원본(favoriteController.deleteFavorite)도 항상 찜한 장소 목록으로 이동한다.
        navigate('/member/favorites')
      }
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  // views/place/place_info.ejs 의 방문 인증 AJAX 처리와 동일 - 하루 한 번, 매너점수 +2(최대 100).
  // 원본은 로그인 안 된 상태에서도 버튼/모달은 열리고, 제출 시 서버가 authRequired를 내려주면
  // confirm 후 로그인 페이지로 보냈다 - 여기서는 다른 페이지들과 같은 방식으로 클릭 시점에 먼저 확인한다.
  const handleVerifyVisit = async () => {
    if (!user) {
      if (confirm('로그인이 필요합니다.')) navigate('/member/login')
      return
    }

    setVerifying(true)
    try {
      const result = await apiPost(`/api/place/${place.area_cd}/visit`, { place_name: place.name })
      alert(result.message)
      if (result.success) {
        await refreshUser()
        window.bootstrap?.Modal?.getInstance(document.getElementById('verifyModal'))?.hide()
      }
    } catch {
      alert('오류가 발생했습니다.')
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (!place) return
    let cancelled = false

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapContainerRef.current) return
        const center = new kakao.maps.LatLng(place.latitude, place.longitude)
        const map = new kakao.maps.Map(mapContainerRef.current, { center, level: 4 })
        new kakao.maps.Marker({ map, position: center })
      })
      .catch((err) => {
        if (!cancelled) setMapError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [place])

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  if (error || !place) {
    return <ErrorMessage statusCode={error?.status || 404} message={error?.message || '장소를 찾을 수 없습니다'} />
  }

  const congestion = congestionText(place.congest_lvl)

  return (
    <div>
      <Link to="/" className="text-decoration-none text-muted small mb-3 d-inline-block">
        ← 지도로 돌아가기
      </Link>

      <div className="card shadow-sm mb-4">
        {/* placeImage는 백엔드가 내려주는 상대경로라, 다른 이미지들과 동일하게 API_BASE_URL을 붙여야 한다 */}
        {placeImage && (
          <img
            src={`${API_BASE_URL}${placeImage}`}
            className="card-img-top"
            style={{ height: 200, objectFit: 'cover' }}
            alt={place.name}
          />
        )}
        <div className="card-body p-4 d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <div className="small text-muted mb-1">{place.category}</div>
            <h2 className="mb-2">{place.name}</h2>
            <div className="d-flex gap-2 flex-wrap">
              <span className={`chip ${congestion.chipClass}`}>
                <span className={`dot ${congestion.dotClass}`}></span> 현재 {place.congest_lvl}
              </span>
              {parkingInfo.length > 0 && <span className="chip chip-brand">🅿️ 주차 {parkingInfo.length}곳</span>}
              {restroomInfo.length > 0 && <span className="chip chip-blue">🚻 화장실 {restroomInfo.length}곳</span>}
            </div>
          </div>
          <div className="d-flex flex-column gap-2 align-items-end">
            <Link
              to={`/meeting/write?area=${encodeURIComponent(place.name)}`}
              className="btn btn-brand btn-lg w-100"
              onClick={(e) => {
                if (user) return
                e.preventDefault()
                if (confirm('로그인이 필요합니다.')) navigate('/member/login')
              }}
            >
              이 장소에서 모임 만들기
            </Link>
            {!user ? (
              <Link to="/member/login" className="btn btn-outline-brand btn-lg w-100">
                ⭐ 찜하기 (로그인 필요)
              </Link>
            ) : isFavorite ? (
              <button type="button" className="btn btn-success btn-lg w-100" onClick={handleRemoveFavorite}>
                ✅ 이미 찜한 장소
              </button>
            ) : (
              <button type="button" className="btn btn-outline-brand btn-lg w-100" onClick={handleAddFavorite}>
                ⭐ 찜한 장소에 추가
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-3">
            <div className="card-body p-4">
              <div className="small text-muted mb-2">실시간 혼잡도</div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <h3 className={`mb-0 ${congestion.className}`}>{place.congest_lvl}</h3>
                <span className={`chip ${congestion.chipClass}`}>{congestion.hint}</span>
              </div>
              <p className="text-muted mb-0">서울 실시간 도시데이터 기준 혼잡도입니다.</p>
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body p-4">
              <h5 className="mb-3">
                🅿️ 주변 주차장 <span className="text-muted fs-6 fw-normal">(반경 500m)</span>
              </h5>
              {parkingInfo.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {parkingInfo.map((p, i) => (
                    <li key={i} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{p.place_name}</div>
                        <div className="small text-muted">{p.road_address_name || p.address_name}</div>
                      </div>
                      {p.distance && <span className="small text-primary">{p.distance}m</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">반경 500m 이내 주차장 정보가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body p-4">
              <h5 className="mb-3">
                🚻 주변 화장실 <span className="text-muted fs-6 fw-normal">(반경 500m)</span>
              </h5>
              {restroomInfo.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {restroomInfo.map((r, i) => (
                    <li key={i} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-semibold">{r.place_name}</div>
                        <div className="small text-muted">{r.road_address_name || r.address_name}</div>
                      </div>
                      {r.distance && <span className="small text-primary">{r.distance}m</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">반경 500m 이내 화장실 정보가 없습니다.</p>
              )}
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">📌 이 장소 모임</h5>
                <Link
                  to={`/meeting/write?area=${encodeURIComponent(place.name)}`}
                  className="btn btn-sm btn-brand"
                  onClick={(e) => {
                    if (user) return
                    e.preventDefault()
                    if (confirm('로그인이 필요합니다.')) navigate('/member/login')
                  }}
                >
                  + 모임 만들기
                </Link>
              </div>
              {meetings.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {meetings.map((m) => (
                    <li key={m._id} className="list-group-item px-0">
                      <Link to={`/meeting/info/${m._id}`} className="text-decoration-none text-dark">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{m.title}</strong>
                            <div className="small text-muted mt-1">
                              {m.status === 'recruit' ? '모집중' : '마감'}
                              {m.author && <> · {m.author.nickname}</>}
                            </div>
                          </div>
                          <span className="small text-muted">
                            {m.participants ? m.participants.length : 0}/{m.maxParticipants}명
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted mb-0">이 장소에 등록된 모임이 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div style={{ fontSize: 22 }}>🌤️</div>
              <div className="small text-muted fw-bold mt-1">오늘 날씨</div>
              {weather ? (
                <>
                  <h3 className="text-warning mb-0">{weather.tempC}°C</h3>
                  <div className="small text-muted">{weather.desc}</div>
                </>
              ) : (
                <div className="small text-muted mt-1">날씨 정보를 불러올 수 없습니다</div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div style={{ fontSize: 22 }}>🚌</div>
              <div className="small text-muted fw-bold mt-1">가까운 대중교통</div>
              {transitInfo ? (
                <>
                  <h5 className="mb-0 mt-1">{transitInfo.name}</h5>
                  <div className="small text-muted">
                    {transitInfo.type} · {transitInfo.distance}m
                  </div>
                </>
              ) : (
                <div className="small text-muted mt-1">주변 대중교통 정보가 없습니다</div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body p-2">
              <h6 className="mb-2 px-2 pt-1">📍 위치</h6>
              {mapError ? (
                <div
                  className="map-wrap d-flex align-items-center justify-content-center text-muted"
                  style={{ height: 200, borderRadius: 8 }}
                >
                  지도를 불러올 수 없습니다 ({mapError})
                </div>
              ) : (
                <div ref={mapContainerRef} style={{ width: '100%', height: 200, borderRadius: 8, overflow: 'hidden' }} />
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="card-title mb-2">📍 위치 정보</h6>
              <div className="small text-muted">위도: {place.latitude}</div>
              <div className="small text-muted">경도: {place.longitude}</div>
            </div>
          </div>

          <div className="d-grid gap-2">
            <button type="button" className="btn btn-brand btn-lg" data-bs-toggle="modal" data-bs-target="#verifyModal">
              📍 방문 인증하기
            </button>
            <Link
              to={`/feed/write?place_id=${place.area_cd}&place_name=${encodeURIComponent(place.name)}`}
              className="btn btn-outline-secondary w-100"
              onClick={(e) => {
                if (user) return
                e.preventDefault()
                if (confirm('로그인이 필요합니다.')) {
                  navigate('/member/login')
                }
              }}
            >
              📡 이 장소 실시간 제보하기
            </Link>
          </div>
        </div>
      </div>

      {/* 방문 인증 모달 — 열고 닫히는 것은 Bootstrap 자체 JS(data-bs-toggle/dismiss)가 담당하고, 인증하기 버튼만 실제 API를 호출한다 */}
      <div className="modal fade" id="verifyModal" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">방문 인증 📍</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body text-center">
              <p className="text-muted">현재 위치를 확인하고 인증합니다</p>
              <div className="p-3 rounded" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-border)' }}>
                <h5 className="mb-1">{place.name}</h5>
                <div className="small" style={{ color: 'var(--brand)' }}>
                  GPS: {place.latitude}° N, {place.longitude}° E
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-brand w-100" onClick={handleVerifyVisit} disabled={verifying}>
                {verifying ? '인증 처리 중...' : '인증하기 (+2 매너점수)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Info
