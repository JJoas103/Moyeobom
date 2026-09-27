import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// 탭은 행사 → 모임 → 내 기록 순서다. 서비스가 도는 순서와 같게 둔다.
const TABS = [
  { to: '/', label: '홈', match: (p) => p === '/' },
  { to: '/event', label: '행사 탐색', match: (p) => p.startsWith('/event') },
  { to: '/meeting', label: '모임', match: (p) => p.startsWith('/meeting') },
  { to: '/me', label: '내 기록', match: (p) => p.startsWith('/me') },
]

function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/">
          🌿 모여봄
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto">
            {TABS.map((tab) => (
              <li className="nav-item" key={tab.to}>
                <Link className={`nav-link ${tab.match(pathname) ? 'active' : ''}`} to={tab.to}>
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="navbar-nav ms-auto">
            {user ? (
              <>
                <li className="nav-item d-flex align-items-center">
                  <span className="me-2">{user.avatar_emoji}</span>
                  <Link className="nav-link" to="/member/info">
                    {user.nickname}님
                  </Link>
                </li>
                <li className="nav-item">
                  <button type="button" className="nav-link btn btn-link border-0 bg-transparent" onClick={logout}>
                    로그아웃
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/member/login">
                    로그인
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/member/join">
                    회원가입
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
