import { Route } from 'react-router-dom'
import List from './List'
import Write from './Write'
import Info from './Info'
import Modify from './Modify'

// /meeting/* 하위 라우트 목록
const meetingRoutes = (
  <>
    <Route path="list" element={<List />} />
    <Route path="write" element={<Write />} />
    <Route path="info/:id" element={<Info />} />
    <Route path="modify/:id" element={<Modify />} />
  </>
)

export default meetingRoutes
