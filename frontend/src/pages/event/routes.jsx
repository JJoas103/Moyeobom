import { Route } from 'react-router-dom'
import List from './List'
import Detail from './Detail'

// /event/* 하위 라우트
const eventRoutes = (
  <>
    <Route index element={<List />} />
    <Route path=":id" element={<Detail />} />
  </>
)

export default eventRoutes
