import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiPostForm } from '../../api'

// views/member/modify.ejs 를 옮긴 회원정보 수정 페이지
const CITIES = ['서울', '경기', '인천', '기타']

function EditProfile() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [city, setCity] = useState(user?.city || '서울')
  const [address, setAddress] = useState(user?.address || '')
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatar_emoji || '')
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
    if (nickname.trim() === '') {
      alert('닉네임을 입력해주세요.')
      return
    }

    const formData = new FormData()
    if (password.trim() !== '') formData.append('password', password)
    formData.append('nickname', nickname)
    formData.append('city', city)
    formData.append('address', address)
    formData.append('avatar_emoji', avatarEmoji)
    if (fileInputRef.current?.files[0]) {
      formData.append('uploadFile', fileInputRef.current.files[0])
    }

    setSubmitting(true)
    try {
      await apiPostForm('/api/member/modify', formData)
      await refreshUser()
      navigate('/member/info')
    } catch {
      alert('오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-7 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body p-4">
            <h4 className="mb-3">회원수정</h4>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-12">
                  <label className="form-label">이메일</label>
                  <input type="email" className="form-control" value={user.email} readOnly />
                </div>

                <div className="col-md-12">
                  <label className="form-label">새 비밀번호 (변경 시에만 입력)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="새 비밀번호를 입력하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">
                    닉네임 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                  />
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
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">프로필 이모지</label>
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
                  <label className="form-label">프로필 이미지 변경</label>
                  <input type="file" className="form-control" accept="image/*" ref={fileInputRef} />
                </div>
              </div>

              <div className="d-grid mt-4">
                <button type="submit" className="btn btn-brand" disabled={submitting}>
                  {submitting ? '저장 중...' : '수정하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditProfile
