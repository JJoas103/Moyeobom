import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiPost } from '../../api'

// views/member/delete.ejs 를 옮긴 회원 탈퇴 페이지
function DeleteAccount() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [confirmChecked, setConfirmChecked] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (!user) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-3">로그인이 필요한 페이지입니다.</p>
        <Link to="/member/login" className="btn btn-brand">
          로그인하러 가기
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!confirm('정말로 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    setErrorMessage(null)
    setSubmitting(true)
    try {
      const result = await apiPost('/api/member/delete', { password, reason })
      if (result.success) {
        alert(result.message)
        await refreshUser()
        navigate('/')
      } else {
        setErrorMessage(result.message)
      }
    } catch {
      setErrorMessage('오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-7 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="mb-3">회원 탈퇴</h4>

            <div className="alert alert-warning">
              <strong>⚠️ 탈퇴 전 확인해주세요</strong>
              <ul className="mb-0 mt-2 small">
                <li>작성하신 모임·제보·댓글은 함께 삭제됩니다</li>
                <li>획득한 배지와 매너점수는 복구되지 않습니다</li>
                <li>방문 기록은 30일 후 영구 삭제됩니다</li>
                <li>동일 이메일로 재가입 시 기존 데이터는 복구되지 않습니다</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  비밀번호 확인 <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {errorMessage && <div className="form-text text-danger">{errorMessage}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">탈퇴 사유 (선택)</label>
                <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">선택하지 않음</option>
                  <option value="unused">자주 사용하지 않음</option>
                  <option value="similar">다른 서비스 이용</option>
                  <option value="privacy">개인정보 보호</option>
                  <option value="etc">기타</option>
                </select>
              </div>

              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="confirmChk"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  required
                />
                <label className="form-check-label small" htmlFor="confirmChk">
                  위 안내사항을 모두 확인했으며, 탈퇴에 동의합니다 <span className="text-danger">*</span>
                </label>
              </div>

              <div className="d-grid gap-2 mt-4">
                <button type="submit" className="btn btn-outline-danger" disabled={submitting}>
                  {submitting ? '처리 중...' : '탈퇴하기'}
                </button>
                <Link to="/member/info" className="btn btn-outline-secondary">
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

export default DeleteAccount
