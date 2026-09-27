import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import MeetingCard from '../../components/meeting/MeetingCard'
import { apiGet } from '../../api'
import { formatMeetingDate } from '../../utils/formatMeetingDate'

// views/meeting/list.ejs 를 옮긴 모임 게시판 목록 페이지
function List() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentStatus = searchParams.get('status') || ''
  const currentKeyword = searchParams.get('keyword') || ''
  const currentCongestion = searchParams.get('congestion') || ''

  const [keywordInput, setKeywordInput] = useState(currentKeyword)
  const [meetings, setMeetings] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true) // 첫 페이지 로딩
  const [loadingMore, setLoadingMore] = useState(false) // 다음 페이지 로딩(스크롤로 추가)
  const [error, setError] = useState(null)

  const sentinelRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    setKeywordInput(currentKeyword)
  }, [currentKeyword])

  // 검색창 입력: 타이핑을 멈추고 0.3초가 지나면 자동으로 keyword 쿼리에 반영하기
  useEffect(() => {
    if (keywordInput === currentKeyword) return

    debounceRef.current = setTimeout(() => {
      const params = {}
      if (currentStatus) params.status = currentStatus
      if (currentCongestion) params.congestion = currentCongestion
      if (keywordInput) params.keyword = keywordInput
      setSearchParams(params)
    }, 300)

    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keywordInput])

  // 필터/검색이 바뀌면 목록을 처음부터 다시 불러오기
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setMeetings([])
    setPage(1)
    setTotalPages(1)

    apiGet('/api/meeting/list', {
      params: { page: 1, status: currentStatus, keyword: currentKeyword, congestion: currentCongestion },
    })
      .then((data) => {
        if (cancelled) return
        setMeetings(data.meetings)
        setTotalPages(data.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentStatus, currentKeyword, currentCongestion])

  // page가 2 이상으로 늘어나면 이어서 불러와 기존 목록 뒤에 붙이기
  useEffect(() => {
    if (page === 1) return // 첫 페이지는 위 effect가 처리

    let cancelled = false
    apiGet('/api/meeting/list', {
      params: { page, status: currentStatus, keyword: currentKeyword, congestion: currentCongestion },
    })
      .then((data) => {
        if (cancelled) return
        setMeetings((prev) => [...prev, ...data.meetings])
        setTotalPages(data.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
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

  // 스크롤이 목록 하단 근처에 닿으면 다음 페이지 요청
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

  // 필터 버튼: status/congestion을 바꾸되 (디바운스 대기 중이던 값 포함) keyword는 유지
  const applyFilter = (next) => {
    clearTimeout(debounceRef.current)
    const params = {}
    if (keywordInput) params.keyword = keywordInput
    Object.assign(params, next)
    setSearchParams(params)
  }

  // Enter/검색 버튼: 디바운스를 기다리지 않고 즉시 반영
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    const params = {}
    if (currentStatus) params.status = currentStatus
    if (currentCongestion) params.congestion = currentCongestion
    if (keywordInput) params.keyword = keywordInput
    setSearchParams(params)
  }

  return (
    <div>
      <section className="hero p-5 mb-4">
        <div className="row align-items-center">
          <div className="col-lg-7">
            <h1 className="display-5 mb-3">모임 게시판</h1>
            <p className="lead">여유로운 시간대, 한산한 동네에서 함께할 사람을 찾아보세요</p>
          </div>
          <div className="col-lg-5 d-none d-lg-block text-center">
            <div style={{ fontSize: 100 }}>🤝</div>
          </div>
        </div>
      </section>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className={`btn ${!currentStatus && !currentCongestion ? 'btn-brand active-board' : 'btn-outline-brand'}`}
            onClick={() => applyFilter({})}
          >
            전체
          </button>
          <button
            type="button"
            className={`btn ${currentStatus === 'recruit' ? 'btn-brand active-board' : 'btn-outline-brand'}`}
            onClick={() => applyFilter({ status: 'recruit' })}
          >
            모집중
          </button>
          <button
            type="button"
            className={`btn ${currentStatus === 'full' ? 'btn-brand active-board' : 'btn-outline-brand'}`}
            onClick={() => applyFilter({ status: 'full' })}
          >
            마감임박
          </button>
          <button
            type="button"
            className={`btn ${currentCongestion === 'uncrowded' ? 'btn-brand active-board' : 'btn-outline-brand'}`}
            onClick={() => applyFilter({ congestion: 'uncrowded' })}
          >
            🌿 한산한 지역만
          </button>
        </div>
        <Link className="btn btn-lg btn-brand" to="/meeting/write">
          + 모임 만들기
        </Link>
      </div>

      <form className="d-flex gap-2 mb-4" onSubmit={handleSearchSubmit}>
        <div className="input-group input-group-lg">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 모임 제목·지역·태그 검색"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
          <button type="submit" className="btn btn-brand">
            검색
          </button>
        </div>
      </form>

      {keywordInput !== currentKeyword && <div className="small text-muted mb-2">검색어를 입력하는 중...</div>}

      <hr className="my-4" />

      {loading && <div className="text-center text-muted py-5">불러오는 중...</div>}

      {!loading && error && <div className="text-center text-danger py-5">{error}</div>}

      {!loading && !error && (
        <>
          {meetings.length === 0 ? (
            <div className="col-12 text-center py-5">
              <p className="text-muted">현재 등록된 모임이 없습니다.</p>
            </div>
          ) : (
            <div className="row g-3">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting._id}
                  meeting={{ ...meeting, meetingDateLabel: formatMeetingDate(meeting.meetingDate) }}
                />
              ))}
            </div>
          )}

          {loadingMore && <div className="text-center text-muted py-4">더 불러오는 중...</div>}

          {!loadingMore && !hasMore && meetings.length > 0 && (
            <div className="text-center text-muted small py-4">모든 모임을 확인했습니다.</div>
          )}
          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
      )}
    </div>
  )
}

export default List
