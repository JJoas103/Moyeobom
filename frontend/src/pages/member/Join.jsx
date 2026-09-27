import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiGet, apiPostForm } from '../../api'

// views/member/join.ejs 를 옮긴 회원가입 페이지
function Join() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [nickname, setNickname] = useState('')
  const [city, setCity] = useState('서울')
  const [address, setAddress] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('')

  const [emailChecked, setEmailChecked] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState(null) // { type: 'success' | 'danger', text }
  const [checkingEmail, setCheckingEmail] = useState(false)

  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // 형식이 맞는지 실시간으로 체크
  const isValidEmailFormat = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleEmailChange = (e) => {
    // 중복확인까지 통과했던 이메일을 수정하ㄴ는 거면, 조용히 지우지 말고 다시 확인하라고 경고를 남기기
    if (emailChecked) {
      setEmailFeedback({ type: 'danger', text: '이메일을 수정했습니다. 다시 중복확인을 해주세요' })
    } else {
      setEmailFeedback(null)
    }
    setEmail(e.target.value)
    setEmailChecked(false)
  }

  const handleCheckEmail = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      alert('이메일을 입력해주세요')
      return
    }
    if (!isValidEmailFormat) {
      alert('올바른 이메일 형식이 아닙니다')
      return
    }
    setCheckingEmail(true)
    try {
      const data = await apiGet('/api/member/check-email', { params: { email: trimmed } })
      if (data.available) {
        setEmailFeedback({ type: 'success', text: '사용 가능한 이메일입니다' })
        setEmailChecked(true)
      } else {
        setEmailFeedback({ type: 'danger', text: '이미 가입된 이메일입니다' })
        setEmailChecked(false)
      }
    } catch {
      setEmailFeedback({ type: 'danger', text: '서버 오류가 발생했습니다' })
      setEmailChecked(false)
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!emailChecked) {
      alert('이메일 중복확인을 해주세요')
      return
    }

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('password2', password2)
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
      await apiPostForm('/api/member/join', formData)
      navigate('/member/login')
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
            <h4 className="mb-3">회원가입</h4>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">
                    이메일 <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="이메일을 입력하세요"
                      value={email}
                      onChange={handleEmailChange}
                      required
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={handleCheckEmail} disabled={checkingEmail}>
                      {checkingEmail ? '확인 중...' : '중복확인'}
                    </button>
                  </div>
                  {email && !isValidEmailFormat ? (
                    <div className="small mt-1 text-danger">올바른 이메일 형식이 아닙니다</div>
                  ) : (
                    emailFeedback && <div className={`small mt-1 text-${emailFeedback.type}`}>{emailFeedback.text}</div>
                  )}
                  {fieldErrors.email && <div className="form-text text-danger">{fieldErrors.email}</div>}
                </div>

                <div className="col-md-12">
                  <label className="form-label">
                    비밀번호 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <small className="text-muted">영문, 숫자, 특수문자 조합 8자 이상</small>
                  {fieldErrors.password && <div className="form-text text-danger">{fieldErrors.password}</div>}
                </div>

                <div className="col-md-12">
                  <label className="form-label">
                    비밀번호 확인 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                  />
                  {password2 &&
                    (password === password2 ? (
                      <div className="small mt-1 text-success">비밀번호가 일치합니다</div>
                    ) : (
                      <div className="small mt-1 text-danger">비밀번호가 일치하지 않습니다</div>
                    ))}
                  {fieldErrors.password2 && <div className="form-text text-danger">{fieldErrors.password2}</div>}
                </div>

                <div className="col-12">
                  <label className="form-label">
                    닉네임 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="모임에서 사용할 닉네임"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
                  {fieldErrors.nickname && <div className="form-text text-danger">{fieldErrors.nickname}</div>}
                </div>

                <div className="col-12">
                  <label className="form-label">주 활동 지역</label>
                  <select className="form-select" value={city} onChange={(e) => setCity(e.target.value)}>
                    <option value="서울">서울</option>
                    <option value="경기">경기</option>
                    <option value="인천">인천</option>
                    <option value="기타">기타</option>
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
                  <div className="form-text">이모지 하나를 직접 입력해보세요</div>
                </div>

                <div className="col-12">
                  <label className="form-label">프로필 이미지</label>
                  <input type="file" className="form-control" accept="image/*" ref={fileInputRef} />
                </div>
              </div>

              <div className="d-grid mt-4">
                <button type="submit" className="btn btn-brand btn-lg" disabled={submitting}>
                  {submitting ? '가입 중...' : '가입하기'}
                </button>
              </div>

              <div className="text-center small mt-3">
                <span className="text-muted">이미 계정이 있으신가요?</span>{' '}
                <Link to="/member/login" className="text-decoration-none fw-bold" style={{ color: 'var(--brand)' }}>
                  로그인
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Join
