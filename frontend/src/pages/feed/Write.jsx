import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet, apiPostForm, API_BASE_URL } from '../../api'
import { loadKakaoMaps } from '../../utils/loadKakaoMaps'

// views/feed/write.ejs 를 옮긴 제보 작성 페이지
const CATEGORIES = ['혼잡도', '주차', '맛집', '날씨', '기타']

// 마커 이미지
const MARKER_IMAGES = {
  혼잡: `${API_BASE_URL}/images/marker_crowdede.png`,
  '약간 붐빔': `${API_BASE_URL}/images/marker_little_crowded.png`,
  보통: `${API_BASE_URL}/images/marker_normal.png`,
}
const DEFAULT_MARKER_IMAGE = `${API_BASE_URL}/images/marker_available.png`

function Write() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const prePlace = searchParams.get('place_id')
    ? { id: searchParams.get('place_id'), name: decodeURIComponent(searchParams.get('place_name') || '') }
    : null

  const [placeName, setPlaceName] = useState(prePlace ? prePlace.name : '')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [mapError, setMapError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const mapContainerRef = useRef(null)
  const fileInputRef = useRef(null)

  // prePlace가 있으면 지도 자체를 띄우지 않는다(원본과 동일).
  useEffect(() => {
    if (prePlace) return
    let cancelled = false

    async function init() {
      try {
        const [kakao, markerData] = await Promise.all([loadKakaoMaps(), apiGet('/api/place/markers').then((data) => data.markers)])
        if (cancelled || !mapContainerRef.current) return

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center: new kakao.maps.LatLng(37.5665, 126.978),
          level: 8,
        })

        const imageSize = new kakao.maps.Size(35, 35)
        markerData.forEach((p) => {
          const markerImage = new kakao.maps.MarkerImage(MARKER_IMAGES[p.congest_lvl] || DEFAULT_MARKER_IMAGE, imageSize)
          const marker = new kakao.maps.Marker({
            map,
            position: new kakao.maps.LatLng(p.latitude, p.longitude),
            title: p.name,
            image: markerImage,
          })
          kakao.maps.event.addListener(marker, 'click', () => {
            setPlaceName(p.name)
            alert(`${p.name} 장소가 선택되었습니다.`)
          })
        })
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

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!placeName) {
      alert('장소를 선택해주세요')
      return
    }
    if (!category) {
      alert('카테고리를 선택해주세요')
      return
    }

    const formData = new FormData()
    formData.append('place_id', prePlace ? prePlace.id : placeName)
    formData.append('place_name', placeName)
    formData.append('locationTag', placeName)
    formData.append('category', category)
    formData.append('content', content)
    if (fileInputRef.current?.files[0]) {
      formData.append('uploadFile', fileInputRef.current.files[0])
    }

    setSubmitting(true)
    try {
      await apiPostForm('/api/feed/write', formData)
      navigate('/feed/list')
    } catch (err) {
      alert(err.message || '제보 등록에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="mb-1">📡 실시간 제보하기</h4>
            <p className="text-muted small mb-4">제보한 내용은 실시간 제보 목록에 반영됩니다.</p>

            <form onSubmit={handleSubmit}>
              {prePlace ? (
                <div className="mb-3">
                  <label className="form-label">📍 장소 태그</label>
                  <div className="form-control bg-light text-muted d-flex align-items-center gap-2">
                    <span>📍</span> <strong>{prePlace.name}</strong>
                    <span className="ms-2 badge bg-secondary">이 장소 기준 제보</span>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label">
                    📍 장소 선택 <span className="text-danger">* 필수</span>
                  </label>
                  {mapError ? (
                    <div className="map-wrap d-flex align-items-center justify-content-center text-muted mb-2" style={{ height: 300 }}>
                      지도를 불러올 수 없습니다 ({mapError})
                    </div>
                  ) : (
                    <div ref={mapContainerRef} className="mb-2" style={{ width: '100%', height: 300 }} />
                  )}
                  <input
                    type="text"
                    className="form-control"
                    value={placeName}
                    placeholder="지도에서 장소를 선택하세요"
                    readOnly
                    required
                  />
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">
                  카테고리 <span className="text-danger">*</span>
                </label>
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
                  <option value="">카테고리를 선택하세요</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  내용 <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="현재 장소의 분위기, 혼잡도 등을 공유해주세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">사진 첨부</label>
                <input type="file" className="form-control" accept="image/*" ref={fileInputRef} />
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-brand btn-lg" disabled={submitting}>
                  {submitting ? '등록 중...' : '제보 등록'}
                </button>
                {prePlace ? (
                  <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                    취소
                  </button>
                ) : (
                  <Link to="/feed/list" className="btn btn-outline-secondary">
                    취소
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Write
