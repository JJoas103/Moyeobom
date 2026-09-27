import { Routes, Route, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorMessage from './components/ErrorMessage'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import eventRoutes from './pages/event/routes'
import gatheringRoutes from './pages/gathering/routes'
import meRoutes from './pages/me/routes'
import memberRoutes from './pages/member/routes'
import { useAuth } from './context/AuthContext'

// 행사 기반으로 화면을 다시 짜면서 라우팅도 교체했다.
// 이전 기획(혼잡도·지도·제보)의 pages/feed, pages/place, pages/meeting 은 파일은 남아 있지만
// 여기서 내렸다. 지금 기획과 맞지 않는 화면이라 열려 있으면 오히려 혼란스럽다.
function App() {
  const { authLoading } = useAuth()

  // 최초 로그인 세션 확인이 끝나기 전까지는 잠깐 대기 화면을 보여주기
  if (authLoading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  return (
    <>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="event" element={<Outlet />}>
            {eventRoutes}
          </Route>
          <Route path="meeting" element={<Outlet />}>
            {gatheringRoutes}
          </Route>
          <Route path="me" element={<Outlet />}>
            {meRoutes}
          </Route>
          <Route path="member" element={<Outlet />}>
            {memberRoutes}
          </Route>
          <Route path="*" element={<ErrorMessage />} />
        </Routes>
      </Layout>
    </>
  )
}

export default App
