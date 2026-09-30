// 행사 탐색. 시안 v2.
//
// 이 화면의 일은 "고르게 하는 것"이고, 고른 다음 화면(행사 상세)이 진짜다.
// 포스터 그리드로 훑고 지나가게 두고, 판단에 필요한 것만 카드 아래 네 줄로 적는다.
//
// 필터 상태는 전부 URL 쿼리에 둔다. 새로고침·뒤로가기가 동작해야 하고, 필터가 걸린
// 목록을 그대로 공유할 수 있어야 한다.
//
// 더 보기는 버튼이다. 무한스크롤이면 "행사 더 보기"를 누르는 순간이 없어서 페이지 끝의
// "모든 행사를 확인했습니다"까지 못 가고, 푸터에도 닿지 못한다.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import EventCard from '../../components/event/EventCard'
import EventFilterPanel from '../../components/event/EventFilterPanel'
import EmptyState from '../../components/common/EmptyState'
import { fetchEventFacets, fetchEvents } from '../../data/events'
import { FEE_OPTIONS, PERIOD_OPTIONS, labelOf } from '../../data/eventOptions'

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

function List() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const area = searchParams.get('area') || ''
  const genre = searchParams.get('genre') || ''
  const period = searchParams.get('period') || ''
  const keyword = searchParams.get('keyword') || ''
  const fee = searchParams.get('fee') || ''
  const hasMeeting = searchParams.get('hasMeeting') || ''

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [events, setEvents] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [facets, setFacets] = useState({ areas: [], genres: [] })

  const debounceRef = useRef(null)

  useEffect(() => {
    setKeywordInput(keyword)
  }, [keyword])

  // 드롭다운 선택지는 필터와 무관하게 한 번만 받는다
  useEffect(() => {
    let cancelled = false
    fetchEventFacets()
      .then((data) => {
        if (!cancelled) setFacets({ areas: data.areas || [], genres: data.genres || [] })
      })
      .catch(() => {
        // 선택지를 못 받아도 목록 자체는 보여야 한다. 드롭다운만 "전체"로 남는다
      })
    return () => {
      cancelled = true
    }
  }, [])

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

    fetchEvents({ category, area, genre, period, keyword, fee, hasMeeting, page: 1 })
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
  }, [category, area, genre, period, keyword, fee, hasMeeting])

  // 2페이지부터는 뒤에 이어 붙인다
  useEffect(() => {
    if (page === 1) return
    let cancelled = false

    fetchEvents({ category, area, genre, period, keyword, fee, hasMeeting, page })
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

  // 바뀐 값만 덮어쓰고 나머지 필터는 유지한다
  function updateParams(next) {
    clearTimeout(debounceRef.current)
    const merged = { category, area, genre, period, keyword, fee, hasMeeting, ...next }
    const params = {}
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params[k] = v
    })
    setSearchParams(params)
  }

  const hasFilter = Boolean(category || area || genre || period || keyword || fee || hasMeeting)

  // 표제 아래 한 줄 — 지금 무엇을 보고 있는지. 정렬은 고정이라 그냥 적는다
  const summary = [
    area || '서울 전체',
    genre,
    labelOf(PERIOD_OPTIONS, period),
    fee && labelOf(FEE_OPTIONS, fee),
    hasMeeting && '모임 있는 행사',
    '모임이 많은 순',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mv-event-wide">
      <div className="mv-head">
        <h1 className="mv-head__title">
          행사 {!loading && <span className="mv-head__count mv-num">{totalCount}</span>}
        </h1>

        <label className="mv-search--pill">
          <SearchIcon />
          <input
            type="text"
            placeholder="행사 이름으로 찾기"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            aria-label="행사 검색"
          />
        </label>
      </div>

      <EventFilterPanel
        category={category}
        area={area}
        genre={genre}
        period={period}
        fee={fee}
        hasMeeting={hasMeeting}
        areas={facets.areas}
        genres={facets.genres}
        onChange={updateParams}
      />

      <p className="mv-summary">
        {summary}
        {hasFilter && (
          <button type="button" className="mv-summary__reset" onClick={() => setSearchParams({})}>
            초기화
          </button>
        )}
      </p>

      {error && <p className="mv-note mv-note--dim mv-meta mb-4">{error}</p>}

      {loading ? (
        <div className="mv-skeleton" style={{ height: 560 }} />
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
          <div className="mv-grid--poster">
            {events.map((event) => (
              <EventCard key={event._id} event={event} />
            ))}
          </div>

          <div className="mv-more">
            {hasMore ? (
              <button
                type="button"
                className="mv-btn--line mv-btn--line-lg"
                disabled={loadingMore}
                onClick={() => {
                  setLoadingMore(true)
                  setPage((prev) => prev + 1)
                }}
              >
                {loadingMore ? '불러오는 중' : '행사 더 보기'}
              </button>
            ) : (
              <p className="mv-micro mb-0">모든 행사를 확인했습니다</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default List
