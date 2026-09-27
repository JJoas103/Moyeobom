import { Route } from 'react-router-dom'
import SearchResult from './SearchResult'
import Info from './Info'

// /place/* 하위 라우트 목록 — App.jsx의 <Route path="place"> 안에 그대로 펼쳐 넣는다.
// (placeRouter.js 의 GET 라우트: /(전체), /search, /quiet, /:area_cd 와 1:1로 대응.
//  원본은 전체/검색/한산한명소 세 경로가 전부 같은 목록 화면을 재사용한다.)
const placeRoutes = (
  <>
    <Route index element={<SearchResult />} />
    <Route path="search" element={<SearchResult />} />
    <Route path="quiet" element={<SearchResult />} />
    <Route path=":area_cd" element={<Info />} />
  </>
)

export default placeRoutes
