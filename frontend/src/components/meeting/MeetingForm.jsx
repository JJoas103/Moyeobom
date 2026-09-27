import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, API_BASE_URL } from '../../api'
import { loadKakaoMaps } from '../../utils/loadKakaoMaps'

// 모임 태그
export const MEETING_TAGS = [
  { value: '주차가능', label: '주차 가능' },
  { value: '조용한카페', label: '조용한 카페' },
  { value: '반려동물', label: '반려동물 동반' },
  { value: '야외활동', label: '야외 활동' },
  { value: '실내위주', label: '실내 위주' },
  { value: '대중교통', label: '대중교통 추천' },
  { value: '2시간이내', label: '2시간 이내' },
  { value: '식사포함', label: '식사 포함' },
]

// 마커 이미지
const MARKER_IMAGES = {
  혼잡: `${API_BASE_URL}/images/marker_crowdede.png`,
  '약간 붐빔': `${API_BASE_URL}/images/marker_little_crowded.png`,
  보통: `${API_BASE_URL}/images/marker_normal.png`,
}
const DEFAULT_MARKER_IMAGE = `${API_BASE_URL}/images/marker_available.png`

function congestionChip(level) {
  if (level === '여유') return { chipClass: 'chip-green', dotClass: 'dot-green' }
  if (level === '보통') return { chipClass: 'chip-yellow', dotClass: 'dot-yellow' }
  if (['약간 붐빔', '혼잡', '붐빔'].includes(level)) return { chipClass: 'chip-red', dotClass: 'dot-red' }
  return { chipClass: 'chip-soft', dotClass: '' }
}

// 모임 폼
function MeetingForm({ heading, initialValues, submitLabel, cancelTo, onSubmit }) {
  const {
    title: initialTitle = '',
    area: initialArea = '',
    congestionLevel: initialCongestionLevel = '보통',
    content: initialContent = '',
    date: initialDate = '',
    time: initialTime = '',
    maxParticipants: initialMaxParticipants = 4,
    tags: initialTags = [],
    existingImageUrl,
  } = initialValues

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [title, setTitle] = useState(initialTitle)
  const [area, setArea] = useState(initialArea)
  const [congestionLevel, setCongestionLevel] = useState(initialCongestionLevel)
  const [content, setContent] = useState(initialContent)
  const [date, setDate] = useState(initialDate || today)
  const [time, setTime] = useState(initialTime)
  const [maxParticipants, setMaxParticipants] = useState(initialMaxParticipants)
  const [tags, setTags] = useState(initialTags)

  const [placeInfo, setPlaceInfo] = useState(null)
  const [parkingCount, setParkingCount] = useState(0)
  const [restroomCount, setRestroomCount] = useState(0)
  const [mapError, setMapError] = useState(null)

  const [submitting, setSubmitting] = useState(false)

  const mapContainerRef = useRef(null)
  const fileInputRef = useRef(null)


  // 지도 초기화
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const tasks = [loadKakaoMaps(), apiGet('/api/place/markers').then((data) => data.markers)]
        if (initialArea) {
          tasks.push(apiGet('/api/place/info', { params: { area: initialArea } }))
        }
        const [kakao, markerData, placeData] = await Promise.all(tasks)
        if (cancelled || !mapContainerRef.current) return

        if (placeData) {
          setPlaceInfo(placeData.placeInfo)
          setParkingCount(placeData.parkingCount)
          setRestroomCount(placeData.restroomCount)
          if (placeData.placeInfo) setCongestionLevel(placeData.placeInfo.congest_lvl)
        }

        const center = placeData?.placeInfo
          ? new kakao.maps.LatLng(placeData.placeInfo.latitude, placeData.placeInfo.longitude)
          : new kakao.maps.LatLng(37.5665, 126.978)
        const map = new kakao.maps.Map(mapContainerRef.current, { center, level: placeData?.placeInfo ? 5 : 8 })

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
            setArea(p.name)
            setCongestionLevel(p.congest_lvl)
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

  const toggleTag = (value) => {
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]))
  }

  // 모임 날짜 블러
  const handleDateBlur = (e) => {
    const val = e.target.value
    if (!val) return
    const year = parseInt(val.split('-')[0], 10)
    const MAX_ALLOWED_YEAR = 2030
    if (year > MAX_ALLOWED_YEAR) {
      alert(`${MAX_ALLOWED_YEAR}년 이전만 선택 가능합니다`)
      setDate(today)
    }
  }

  // 모임 제출
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!onSubmit) return

    if (!area) {
      alert('장소를 선택해주세요')
      return
    }
    if (date && time && new Date(`${date}T${time}`) < new Date()) {
      alert('과거 시간으로 모임을 설정할 수 없습니다.')
      return
    }
    if (!existingImageUrl && !fileInputRef.current?.files[0]) {
      alert('이미지를 첨부해주세요')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('area', area)
    formData.append('congestionLevel', congestionLevel)
    formData.append('content', content)
    formData.append('meeting_date', date)
    formData.append('meeting_time', time)
    formData.append('maxParticipants', maxParticipants)
    tags.forEach((tag) => formData.append('tags', tag))
    if (fileInputRef.current?.files[0]) {
      formData.append('imageUrl', fileInputRef.current.files[0])
    }

    setSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (err) {
      alert(err.message || '처리 중 오류가 발생했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  // 혼잡도 칩
  const { chipClass, dotClass } = congestionChip(placeInfo?.congest_lvl)

  // 모임 폼 반환
  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="mb-3">{heading}</h4>
            <p className="text-muted small mb-4">장소를 선택하면 주차장·화장실 정보가 자동으로 첨부됩니다</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  모임 제목 <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="어떤 모임인지 간단히 적어주세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  장소 선택 <span className="text-danger">*</span>
                </label>
                {mapError ? (
                  <div className="map-wrap d-flex align-items-center justify-content-center text-muted mb-2" style={{ height: 300 }}>
                    지도를 불러올 수 없습니다 ({mapError})
                  </div>
                ) : (
                  <div ref={mapContainerRef} className="mb-2" style={{ width: '100%', height: 300 }} />
                )}
                <input type="text" className="form-control" value={area} placeholder="지도에서 마커를 클릭해 장소를 선택하세요" readOnly required />
              </div>

              {placeInfo && (
                <div className="mt-2 mb-3 p-3 rounded" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-border)' }}>
                  <div className="small fw-bold mb-2">선택된 장소의 현재 정보</div>
                  <div className="d-flex gap-2 flex-wrap">
                    <span className={`chip ${chipClass}`}>
                      <span className={`dot ${dotClass}`}></span> {placeInfo.congest_lvl}
                    </span>
                    {parkingCount > 0 && <span className="chip chip-brand">🅿️ 주변 주차장 {parkingCount}곳</span>}
                    {restroomCount > 0 && <span className="chip chip-blue">🚻 주변 화장실 {restroomCount}곳</span>}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">
                  소개글 <span className="text-danger">*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="모임을 소개해주세요. 어떤 활동을 하나요? 준비물은 무엇인가요?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                />
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label">
                    모임 날짜 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    min={today}
                    max={maxDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    onBlur={handleDateBlur}
                    required
                  />
                  <div className="form-text">모임은 오늘부터 2주 이내만 개설 가능합니다.</div>
                </div>
                <div className="col-md-3">
                  <label className="form-label">
                    시간 <span className="text-danger">*</span>
                  </label>
                  <input type="time" className="form-control" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>
                <div className="col-md-3">
                  <label className="form-label">
                    모집 인원 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(e.target.value)}
                    min={2}
                    max={20}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">태그 (복수 선택)</label>
                <div className="d-flex flex-wrap gap-2">
                  {MEETING_TAGS.map((tag) => (
                    <div key={tag.value} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`tag-${tag.value}`}
                        checked={tags.includes(tag.value)}
                        onChange={() => toggleTag(tag.value)}
                      />
                      <label className="form-check-label" htmlFor={`tag-${tag.value}`}>
                        {tag.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">{existingImageUrl ? '첨부 이미지 변경' : '첨부 이미지 (필수)'}</label>
                {existingImageUrl && (
                  <div className="mb-2">
                    <img
                      src={`${API_BASE_URL}/images/upload/${existingImageUrl}`}
                      alt="현재 이미지"
                      style={{ maxWidth: 200, display: 'block' }}
                    />
                    <small className="text-muted">현재 이미지</small>
                  </div>
                )}
                <input type="file" className="form-control" accept="image/*" ref={fileInputRef} required={!existingImageUrl} />
              </div>

              <div className="d-flex gap-2 mt-4">
                <button type="submit" className="btn btn-brand btn-lg" disabled={submitting}>
                  {submitting ? '처리 중...' : submitLabel}
                </button>
                <Link className="btn btn-outline-secondary btn-lg" to={cancelTo}>
                  취소
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingForm
