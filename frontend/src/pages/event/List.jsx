// 행사 탐색.
//
// 이 화면의 일은 "고르게 하는 것"이고, 고른 다음 화면(행사 상세)이 진짜다.
// 그래서 여기서 화려하게 만들지 않는다 — 도록 목차처럼 훑고 지나가게 둔다.
//
// 필터 상태는 URL 쿼리에 둔다. 새로고침·뒤로가기가 동작해야 한다.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Masthead from '../../components/common/Masthead'
import EventRow from '../../components/event/EventRow'
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
    debounceRef.current = setTimeout(() => updateParams({ keyword: keywordInput }), 300)
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
      { rootMargin: '400px' },
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
      <Masthead title="행사" aside={loading ? '' : `${totalCount}건`} />

      <div className="mv-search mb-4">
        <input
          type="text"
          placeholder="행사명 · 장소 · 지역"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          aria-label="행사 검색"
        />
        {hasFilter && (
          <button type="button" className="mv-micro" style={{ border: 0, background: 'none', color: 'var(--ink-dim)' }} onClick={() => setSearchParams({})}>
            초기화
          </button>
        )}
      </div>

      <div className="mb-4">
        <EventFilterBar category={category} area={area} period={period} onChange={updateParams} />
      </div>

      {error && <p className="mv-note mv-note--dim mv-meta mb-4">{error}</p>}

      {loading ? (
        <div className="mv-skeleton" style={{ height: 420 }} />
      ) : events.length === 0 ? (
        <EmptyState
          title="조건에 맞는 행사가 없습니다"
          description="필터를 줄이거나 다른 검색어로 찾아보세요."
          action={
            hasFilter && (
              <button type="button" className="mv-btn mv-btn--ghost" onClick={() => setSearchParams({})}>
                필터 초기화
              </button>
            )
          }
        />
      ) : (
        <>
          <ul className="mv-list">
            {events.map((event) => (
              <EventRow key={event._id} event={event} />
            ))}
          </ul>

          {loadingMore && <p className="mv-micro text-center py-4 mb-0">더 불러오는 중</p>}
          {!loadingMore && !hasMore && (
            <p className="mv-micro text-center py-4 mb-0">모든 행사를 확인했습니다</p>
          )}
          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
      )}
    </div>
  )
}

export default List
