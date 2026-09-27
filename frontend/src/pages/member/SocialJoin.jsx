import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPostForm } from '../../api'

// views/member/social_join.ejs 를 옮긴 소셜 가입 추가정보 입력 페이지
const CITIES = ['서울', '경기', '인천', '기타']

function SocialJoin() {
  const { refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [socialData, setSocialData] = useState(null)
  const [loading, setLoading] = useState(true)

  const [nickname, setNickname] = useState('')
  const [city, setCity] = useState('서울')
  const [address, setAddress] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('')

  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    apiGet('/api/auth/social-data')
      .then((data) => {
        if (cancelled) return
        if (!data.socialData) {
          navigate('/member/login')
          return
        }
        setSocialData(data.socialData)
        setNickname(data.socialData.nickname || '')
      })
      .catch(() => {
        if (!cancelled) navigate('/member/login')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [navigate])

  if (loading || !socialData) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append('nickname', nickname)
    formData.append('city', city)
    formData.append('address', address)
    formData.append('avatar_emoji', avatarEmoji)
    if (fileInputRef.current?.files[0]) {
      formData.append('uploadFile', fileInputRef.current.files[0])
    }

    setFieldErrors({})
    setSubmitting(true)
    try {
      await apiPostForm('/api/auth/social-join', formData)
      await refreshUser()
      navigate('/')
    } catch (err) {
      setFieldErrors(err.fieldErrors || {})
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-7 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="mb-3">소셜 계정 설정</h4>
            <p className="text-muted small mb-4">
              서비스 이용을 위해 추가 정보를 입력해주세요. (이메일: {socialData.email})
            </p>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">
                    닉네임 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="모임에서 사용할 닉네임"
                    required
                  />
                  <div className="form-text">다른 사용자와 중복되지 않는 닉네임을 설정해주세요.</div>
                  {fieldErrors.nickname && <div className="form-text text-danger">{fieldErrors.nickname}</div>}
                </div>

                <div className="col-12">
                  <label className="form-label">주 활동 지역</label>
                  <select className="form-select" value={city} onChange={(e) => setCity(e.target.value)}>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-12">
                  <label className="form-label">상세 주소</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="주소를 입력하세요"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">프로필 이모지 (선택)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="😊"
                    maxLength={2}
                    value={avatarEmoji}
                    onChange={(e) => setAvatarEmoji(e.target.value)}
                  />
                  <div className="form-text">이모지 하나로 프로필을 표현해보세요</div>
                </div>

                <div className="col-12">
                  <label className="form-label">프로필 이미지</label>
                  <input type="file" className="form-control" accept="image/*" ref={fileInputRef} />
                  <div className="form-text">설정하지 않으면 기본 이미지가 사용됩니다.</div>
                </div>
              </div>

              <div className="d-grid mt-4">
                <button type="submit" className="btn btn-brand btn-lg" disabled={submitting}>
                  {submitting ? '처리 중...' : '시작하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SocialJoin
