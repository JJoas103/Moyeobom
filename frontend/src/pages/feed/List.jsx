import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import FeedCard from '../../components/feed/FeedCard'
import { useAuth } from '../../context/AuthContext'
import { apiGet } from '../../api'

// views/feed/list.ejs 를 옮긴 실시간 제보 피드 목록 페이지
function List() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [feeds, setFeeds] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const sentinelRef = useRef(null)

  // 첫 페이지 로드
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    apiGet('/api/feed/list', { params: { page: 1 } })
      .then((data) => {
        if (cancelled) return
        setFeeds(data.feeds)
        setTotalPages(data.totalPages)
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
  }, [])

  // page가 2 이상으로 늘어나면 이어서 불러와 기존 목록 뒤에 붙인다
  useEffect(() => {
    if (page === 1) return

    let cancelled = false
    apiGet('/api/feed/list', { params: { page } })
      .then((data) => {
        if (cancelled) return
        setFeeds((prev) => [...prev, ...data.feeds])
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

    // 비로그인 상태에서 "제보하기" 클릭 시 원본(footer.ejs의 requireLogin)과 동일하게 동작한다.
  const handleWriteClick = (e) => {
    if (user) return
    e.preventDefault()
    if (confirm('로그인이 필요합니다.')) {
      navigate('/member/login')
    }
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>📡 실시간 제보 피드</h4>
        <Link to="/feed/write" className="btn btn-brand" onClick={handleWriteClick}>
          제보하기
        </Link>
      </div>

      {loading && <div className="text-center text-muted py-5">불러오는 중...</div>}

      {!loading && error && <div className="text-center text-danger py-5">{error}</div>}

      {!loading && !error && (
        <>
          {feeds.length === 0 ? (
            <div className="col-12 text-center py-5">
              <p className="text-muted">아직 제보가 없습니다. 첫 제보를 남겨보세요!</p>
            </div>
          ) : (
            <div className="row g-3">
              {feeds.map((feed) => (
                <FeedCard key={feed._id} feed={feed} />
              ))}
            </div>
          )}

          {loadingMore && <div className="text-center text-muted py-4">더 불러오는 중...</div>}

          {!loadingMore && !hasMore && feeds.length > 0 && (
            <div className="text-center text-muted small py-4">모든 제보를 확인했습니다.</div>
          )}

          {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        </>
      )}
    </div>
  )
}

export default List
