import { Route } from 'react-router-dom'
import Index from './Index'

// /me/* 하위 라우트
const meRoutes = (
  <>
    <Route index element={<Index />} />
  </>
)

export default meRoutes
