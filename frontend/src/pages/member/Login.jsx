import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { API_BASE_URL } from '../../api'

// views/member/login.ejs 를 옮긴 로그인 페이지
function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <div style={{ fontSize: 48 }}>🌿</div>
              <h4 className="mt-2">모여봄 로그인</h4>
              <p className="text-muted small">모임 만들기·참여·제보 시 로그인이 필요합니다</p>
            </div>

            {errorMessage && <div className="alert alert-danger py-2 small">{errorMessage}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="member_email" className="form-label">
                  이메일
                </label>
                <input
                  type="email"
                  className="form-control"
                  id="member_email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="member_pass" className="form-label">
                  비밀번호
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="member_pass"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="d-grid gap-2 mb-4">
                <button type="submit" className="btn btn-brand btn-lg" disabled={submitting}>
                  {submitting ? '로그인 중...' : '로그인'}
                </button>
              </div>

              <div className="d-grid gap-2 mb-3">
                <a href={`${API_BASE_URL}/api/auth/google`} className="btn btn-outline-danger">
                  Google로 로그인
                </a>
                <a href={`${API_BASE_URL}/api/auth/naver`} className="btn btn-success">
                  네이버로 로그인
                </a>
              </div>

              <hr className="my-3" />

              <div className="text-center small">
                <span className="text-muted">아직 회원이 아니신가요?</span>{' '}
                <Link to="/member/join" className="text-decoration-none fw-bold" style={{ color: 'var(--brand)' }}>
                  회원가입
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
