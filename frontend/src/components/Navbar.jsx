import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// views/partials/header.ejs 의 <nav> 영역을 옮긴 공통 컴포넌트
function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container">
        <Link className="navbar-brand" to="/">
          🌿 모여봄
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#nav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="nav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className={`nav-link ${pathname === '/' ? 'active' : ''}`} to="/">
                지도 탐색
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${pathname.startsWith('/meeting') ? 'active' : ''}`} to="/meeting/list">
                모임 게시판
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${pathname.startsWith('/feed') ? 'active' : ''}`} to="/feed/list">
                실시간 제보
              </Link>
            </li>
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
