import { Route } from 'react-router-dom'
import Login from './Login'
import Join from './Join'
import SocialJoin from './SocialJoin'
import MyPage from './MyPage'
import EditProfile from './EditProfile'
import Favorites from './Favorites'
import DeleteAccount from './DeleteAccount'

// /member/* 하위 라우트 목록
const memberRoutes = (
  <>
    <Route path="login" element={<Login />} />
    <Route path="join" element={<Join />} />
    <Route path="social-join" element={<SocialJoin />} />
    <Route path="info" element={<MyPage />} />
    <Route path="modify" element={<EditProfile />} />
    <Route path="favorites" element={<Favorites />} />
    <Route path="delete" element={<DeleteAccount />} />
  </>
)

export default memberRoutes
