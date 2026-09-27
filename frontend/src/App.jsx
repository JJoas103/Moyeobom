import { Routes, Route, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorMessage from './components/ErrorMessage'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import meetingRoutes from './pages/meeting/routes'
import feedRoutes from './pages/feed/routes'
import memberRoutes from './pages/member/routes'
import placeRoutes from './pages/place/routes'
import { useAuth } from './context/AuthContext'

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
          <Route path="member" element={<Outlet />}>
            {memberRoutes}
          </Route>
          <Route path="meeting" element={<Outlet />}>
            {meetingRoutes}
          </Route>
          <Route path="feed" element={<Outlet />}>
            {feedRoutes}
          </Route>
          <Route path="place" element={<Outlet />}>
            {placeRoutes}
          </Route>
          <Route path="*" element={<ErrorMessage />} />
        </Routes>
      </Layout>
    </>
  )
}

export default App
