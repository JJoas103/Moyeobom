import { Route } from 'react-router-dom'
import List from './List'
import New from './New'
import Detail from './Detail'

// /meeting/* 하위 라우트
// "new"를 ":id" 보다 먼저 둬야 모임 id로 잡히지 않는다.
const gatheringRoutes = (
  <>
    <Route index element={<List />} />
    <Route path="new" element={<New />} />
    <Route path=":id" element={<Detail />} />
  </>
)

export default gatheringRoutes
