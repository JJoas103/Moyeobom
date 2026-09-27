import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { apiGet } from '../../api'
import PlaceCard from '../../components/place/PlaceCard'

// views/place/search_result.ejs 를 옮긴 장소 목록/검색결과 페이지.
// 원본은 검색어 입력(/place/search), 전체 장소 보기(/place), 한산한 명소만 보기(/place/quiet)
// 세 경로가 전부 이 화면을 재사용하는데, React 라우팅도 동일하게 세 경로 모두 이 컴포넌트를 쓴다
// (pages/place/routes.jsx 참고) - 그래서 현재 경로를 보고 어떤 API를 호출할지 결정한다.
// 검색어가 비어있으면 원본처럼 홈으로 보내고, 결과가 정확히 1곳이면 원본의
// res.redirect(`/place/${area_cd}`)와 동일하게 바로 상세 페이지로 이동시킨다.
function SearchResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [keyword, setKeyword] = useState('')
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    let endpoint = null
    if (location.pathname === '/place/quiet') {
      endpoint = '/api/place/quiet'
    } else if (location.pathname === '/place/search') {
      const rawKeyword = (searchParams.get('keyword') || '').trim()
      if (!rawKeyword) {
        navigate('/', { replace: true })
        return undefined
      }
      endpoint = `/api/place/search?keyword=${encodeURIComponent(rawKeyword)}`
    } else {
      endpoint = '/api/place/all'
    }

    setLoading(true)
    apiGet(endpoint)
      .then((data) => {
        if (cancelled) return
        if (data.singleResult) {
          navigate(`/place/${data.area_cd}`, { replace: true })
          return
        }
        setKeyword(data.keyword || '')
        setPlaces(data.places || [])
      })
      .catch(() => {
        if (!cancelled) setPlaces([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [location.pathname, searchParams, navigate])

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  return (
    <div>
      <Link to="/" className="text-decoration-none text-muted small mb-3 d-inline-block">
        ← 지도로 돌아가기
      </Link>

      <h4 className="mb-4">
        {keyword === '전체 장소' || keyword === '한산한 명소'
          ? `${keyword} — ${places.length}곳`
          : `"${keyword}" 검색 결과 — ${places.length}곳`}
      </h4>

      <div className="row g-3">
        {places.length === 0 ? (
          <div className="col-12 text-center py-5 text-muted">
            <h4>검색된 장소가 없습니다.</h4>
            <p>다른 검색어로 다시 시도해 보세요.</p>
          </div>
        ) : (
          places.map((place) => <PlaceCard key={place.area_cd} place={place} />)
        )}
      </div>
    </div>
  )
}

export default SearchResult
