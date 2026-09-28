import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// 탭은 시안 v2 를 따른다 — 홈 · 행사 · 내 모임 · 마이.
// 좁은 화면에서는 접는 대신 가로로 흐르게 둔다. 넷뿐이라 햄버거를 열게 할 이유가 없다.
const TABS = [
  { to: '/', label: '홈', match: (p) => p === '/' },
  { to: '/event', label: '행사', match: (p) => p.startsWith('/event') },
  { to: '/meeting', label: '내 모임', match: (p) => p.startsWith('/meeting') || p.startsWith('/me') },
  { to: '/member/info', label: '마이', match: (p) => p.startsWith('/member') },
]

// 알림 종. 시안의 선 아이콘을 그대로 옮겼다 — 이모지를 쓰지 않는다
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

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
                {/* 알림은 자리만 잡아 둔다. 동작은 다음 작업 */}
                <button type="button" className="mv-nav__icon" aria-label="알림">
                  <BellIcon />
                </button>
                <Link to="/member/info" aria-label={`${user.nickname} 마이페이지`}>
                  <span className="mv-avatar" />
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
