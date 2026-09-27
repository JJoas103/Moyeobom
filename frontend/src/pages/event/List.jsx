// 행사 탐색.
//
// 필터 상태는 URL 쿼리에 둔다 — meeting/List.jsx 가 쓰던 useSearchParams 패턴과 같다.
// 목록 자체는 어느 서비스나 비슷하므로, 여기서 승부를 보려 하지 않는다.
// 이 화면의 일은 "고르게 하는 것"이고, 고른 다음 화면(행사 상세)이 진짜다.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventCard from '../../components/event/EventCard'
import EventFilterBar from '../../components/event/EventFilterBar'
import EmptyState from '../../components/common/EmptyState'
import { fetchEvents } from '../../data/events'

function List() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const area = searchParams.get('area') || ''
  const period = searchParams.get('period') || ''
  const keyword = searchParams.get('keyword') || ''

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [events, setEvents] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const sentinelRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    setKeywordInput(keyword)
  }, [keyword])

  // 타이핑을 멈추고 0.3초가 지나면 keyword 쿼리에 반영
  useEffect(() => {
    if (keywordInput === keyword) return
    debounceRef.current = setTimeout(() => {
      updateParams({ keyword: keywordInput })
    }, 300)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput])

  // 필터가 바뀌면 처음부터 다시
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setEvents([])
    setPage(1)

    fetchEvents({ category, area, period, keyword, page: 1 })
      .then((data) => {
        if (cancelled) return
        setEvents(data.events)
        setTotalPages(data.totalPages)
        setTotalCount(data.totalCount)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [category, area, period, keyword])

  // 2페이지부터는 뒤에 이어 붙인다
  useEffect(() => {
    if (page === 1) return
    let cancelled = false

    fetchEvents({ category, area, period, keyword, page })
      .then((data) => {
        if (cancelled) return
        setEvents((prev) => [...prev, ...data.events])
        setTotalPages(data.totalPages)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingMore(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const hasMore = page < totalPages

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && !loadingMore) {
          setLoadingMore(true)
          setPage((prev) => prev + 1)
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore])

  // 바뀐 값만 덮어쓰고 나머지 필터는 유지한다
  function updateParams(next) {
    clearTimeout(debounceRef.current)
    const merged = { category, area, period, keyword, ...next }
    const params = {}
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params[k] = v
    })
    setSearchParams(params)
  }

  const hasFilter = Boolean(category || area || period || keyword)

  return (
    <div>
      <section className="hero p-4 mb-4">
        <h1 className="h4 mb-2">행사 탐색</h1>
        <p className="mb-0 small" style={{ color: 'var(--ink-sub)' }}>
          서울시 문화행사를 매일 받아옵니다. 마음에 드는 행사를 고르면 거기서 모임이 시작됩니다.
        </p>
      </section>

      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          updateParams({ keyword: keywordInput })
        }}
      >
        <div className="input-group input-group-lg">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 행사명 · 장소 · 지역 검색"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
          <button type="submit" className="btn btn-brand">
            검색
          </button>
        </div>
      </form>

      <div className="mb-3">
        <EventFilterBar category={category} area={area} period={period} onChange={updateParams} />
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="small text-muted">
          {loading ? '불러오는 중...' : `${totalCount}개의 행사`}
        </span>
        {hasFilter && (
          <button type="button" className="btn btn-sm btn-link text-muted text-decoration-none" onClick={() => setSearchParams({})}>
            필터 초기화
          </button>
        )}
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {loading ? (
        <div className="row g-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="col-6 col-lg-4 col-xl-3">
              <div className="card h-100 skeleton-card" />
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title="조건에 맞는 행사가 없습니다"
          description={'필터를 줄이거나 다른 검색어로 찾아보세요.'}
          action={
            hasFilter && (
              <button type="button" className="btn btn-outline-brand" onClick={() => setSearchParams({})}>
                필터 초기화
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="row g-3">
            {events.map((event) => (
              <div key={event._id} className="col-6 col-lg-4 col-xl-3">
                <EventCard event={event} />
              </div>
            ))}
          </div>

          {loadingMore && <div className="text-center text-muted py-4">더 불러오는 중...</div>}
          {!loadingMore && !hasMore && <div className="text-center text-muted small py-4">모든 행사를 확인했습니다.</div>}
          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
      )}
    </div>
  )
}

export default List
