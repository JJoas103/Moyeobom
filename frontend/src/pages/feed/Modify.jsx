import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPostForm, API_BASE_URL } from '../../api'
import ErrorMessage from '../../components/ErrorMessage'

// views/feed/modify.ejs 를 옮긴 제보 수정 페이지
const PLACES = ['연남동', '북촌', '강남역', '서래마을', '잠실', '서울숲', '성수동', '익선동']
const CATEGORIES = ['혼잡도', '주차', '맛집', '날씨', '기타']

function Modify() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [feed, setFeed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [placeId, setPlaceId] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setFeed(null)

    apiGet(`/api/feed/info/${id}`)
      .then((data) => {
        if (cancelled) return
        setFeed(data.feed)
        setPlaceId(data.feed.locationTag || '')
        setContent(data.feed.content || '')
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
  }, [id])

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  if (error || !feed) {
    return <ErrorMessage statusCode={error?.status || 404} message={error?.message || '제보를 찾을 수 없습니다'} />
  }

  if (!user || !feed.author || user.id !== feed.author._id) {
    return <ErrorMessage statusCode={403} message="권한이 없습니다" />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!placeId) {
      alert('장소를 선택해주세요')
      return
    }
    if (!category) {
      alert('카테고리를 선택해주세요')
      return
    }

    const formData = new FormData()
    formData.append('place_id', placeId)
    formData.append('locationTag', placeId)
    formData.append('category', category)
    formData.append('content', content)
    if (fileInputRef.current?.files[0]) {
      formData.append('uploadFile', fileInputRef.current.files[0])
    }

    setSubmitting(true)
    try {
      await apiPostForm(`/api/feed/modify/${id}`, formData)
      navigate(`/feed/info/${id}`)
    } catch (err) {
      alert(err.message || '수정에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="mb-1">📡 제보 수정</h4>
            <p className="text-muted small mb-4">내용을 수정한 뒤 저장해주세요.</p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  📍 장소 태그 <span className="text-danger">*</span>
                </label>
                <select className="form-select" value={placeId} onChange={(e) => setPlaceId(e.target.value)} required>
                  <option value="">장소를 선택하세요</option>
                  {PLACES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label">
                  제보 카테고리 <span className="text-danger">*</span>
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
                <textarea className="form-control" rows={5} value={content} onChange={(e) => setContent(e.target.value)} required />
              </div>

              <div className="mb-3">
                <label className="form-label">사진 첨부</label>
                {feed.image && (
                  <div className="mb-2">
                    <img
                      src={`${API_BASE_URL}/images/upload/${feed.image}`}
                      alt="현재 이미지"
                      style={{ height: 120, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                    />
                    <p className="small text-muted mt-1">새 파일을 선택하면 기존 이미지가 교체됩니다.</p>
                  </div>
                )}
                <input type="file" className="form-control" accept="image/*" ref={fileInputRef} />
              </div>

              <div className="d-grid gap-2">
                <button type="submit" className="btn btn-brand btn-lg" disabled={submitting}>
                  {submitting ? '저장 중...' : '수정 저장'}
                </button>
                <Link to={`/feed/info/${id}`} className="btn btn-outline-secondary">
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

export default Modify
