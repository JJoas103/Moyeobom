import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// 탭은 행사 → 모임 → 내 기록 순서다. 서비스가 도는 순서와 같게 둔다.
// 좁은 화면에서는 접는 대신 가로로 흐르게 둔다 — 탭이 넷뿐이라 햄버거를 열게 할 이유가 없다.
const TABS = [
  { to: '/', label: '홈', match: (p) => p === '/' },
  { to: '/event', label: '행사', match: (p) => p.startsWith('/event') },
  { to: '/meeting', label: '모임', match: (p) => p.startsWith('/meeting') },
  { to: '/me', label: '내 기록', match: (p) => p.startsWith('/me') },
]

function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <nav className="mv-nav">
      <div className="mv-page mv-page--wide">
        <div className="mv-nav__inner">
          <Link className="mv-nav__brand" to="/">
            모여봄
          </Link>

          <div className="mv-nav__links">
            {TABS.map((tab) => (
              <Link
                key={tab.to}
                className="mv-nav__link"
                to={tab.to}
                aria-current={tab.match(pathname) ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="mv-nav__right">
            {user ? (
              <>
                <Link className="mv-nav__link" to="/member/info">
                  {user.nickname}
                </Link>
                <button type="button" className="mv-nav__link" style={{ border: 0, background: 'none' }} onClick={logout}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="mv-nav__link" to="/member/login">
                  로그인
                </Link>
                <Link className="mv-nav__link" to="/member/join">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
