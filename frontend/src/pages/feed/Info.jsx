import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPost, API_BASE_URL } from '../../api'
import ErrorMessage from '../../components/ErrorMessage'

// views/feed/info.ejs 를 옮긴 제보 상세 페이지
function Info() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [feed, setFeed] = useState(null)
  const [comments, setComments] = useState([])
  const [totalCommentPages, setTotalCommentPages] = useState(1)
  const [currentCommentPage, setCurrentCommentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentContent, setCommentContent] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const commentSentinelRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setFeed(null)
    setComments([])
    setTotalCommentPages(1)
    setCurrentCommentPage(1)

    apiGet(`/api/feed/info/${id}`)
      .then((data) => {
        if (cancelled) return
        setFeed(data.feed)
        setComments(data.comments)
        setTotalCommentPages(data.totalCommentPages)
        setCurrentCommentPage(data.currentCommentPage)
      })
      .catch((err) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const loadMoreComments = async () => {
    if (loadingMoreComments || !feed || currentCommentPage >= totalCommentPages) return
    setLoadingMoreComments(true)
    try {
      const nextPage = currentCommentPage + 1
      const data = await apiGet(`/api/feed/${feed._id}/comments`, { params: { commentPage: nextPage } })
      setComments((prev) => [...prev, ...data.comments])
      setCurrentCommentPage(data.currentCommentPage)
      setTotalCommentPages(data.totalCommentPages)
    } catch (err) {
      console.warn('댓글 추가 로드 실패:', err.message)
    } finally {
      setLoadingMoreComments(false)
    }
  }

  useEffect(() => {
    if (!feed || !commentSentinelRef.current || currentCommentPage >= totalCommentPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreComments()
      },
      { rootMargin: '200px' },
    )
    observer.observe(commentSentinelRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, currentCommentPage, totalCommentPages, loadingMoreComments])

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentContent.trim()) return

    setCommentSubmitting(true)
    try {
      await apiPost('/api/comment/write', { content: commentContent, boardId: feed._id, onModel: 'Feed' })
      setCommentContent('')
      const data = await apiGet(`/api/feed/info/${id}`)
      setComments(data.comments)
      setTotalCommentPages(data.totalCommentPages)
      setCurrentCommentPage(data.currentCommentPage)
    } catch (err) {
      alert(err.message || '댓글 등록에 실패했습니다')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleCommentDelete = async (commentId) => {
    try {
      await apiPost('/api/comment/delete', { commentId, boardId: feed._id, onModel: 'Feed' })
      setComments((prev) => prev.filter((c) => c._id !== commentId))
    } catch (err) {
      alert(err.message || '댓글 삭제에 실패했습니다')
    }
  }

  const handleLike = async () => {
    if (!user) {
      if (confirm('로그인이 필요합니다.')) navigate('/member/login')
      return
    }
    try {
      const data = await apiPost(`/api/feed/like/${feed._id}`)
      if (data.success) {
        setFeed((prev) => ({ ...prev, reactions: { ...prev.reactions, like: data.likeCount } }))
        alert('추천되었습니다! 작성자의 매너 점수가 상승했습니다.')
      } else {
        alert(data.message)
      }
    } catch (err) {
      alert(err.message || '처리 중 오류가 발생했습니다.')
    }
  }

  const handleFeedDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await apiPost(`/api/feed/delete/${feed._id}`)
      navigate('/feed/list')
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다')
    }
  }

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  if (error || !feed) {
    return <ErrorMessage statusCode={error?.status || 404} message={error?.message || '제보를 찾을 수 없습니다'} />
  }

  const isAuthor = user && feed.author && user.id === feed.author._id

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <Link to="/feed/list" className="text-decoration-none text-muted small mb-3 d-inline-block">
          ← 목록으로
        </Link>

        <div className="card shadow-sm mb-4">
          {feed.image && (
            <div className="feed-detail-image-wrap">
              <img src={`${API_BASE_URL}/images/upload/${feed.image}`} className="feed-detail-image" alt="제보 이미지" />
            </div>
          )}
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <span className="fs-2 me-2">{feed.author ? feed.author.avatar_emoji : '👤'}</span>
              <div>
                <div className="fw-bold">
                  {feed.author ? feed.author.nickname : '탈퇴한 사용자'}
                  {feed.author && typeof feed.author.manner_score === 'number' && (
                    <span className="manner-temp-badge ms-1">{feed.author.manner_score.toFixed(1)}℃</span>
                  )}
                </div>
                <div className="text-muted small">
                  📍 {feed.locationTag} · {new Date(feed.createdAt).toLocaleString()}
                </div>
              </div>
              {isAuthor && (
                <div className="ms-auto">
                  <Link to={`/feed/modify/${feed._id}`} className="btn btn-sm btn-outline-secondary">
                    수정
                  </Link>{' '}
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleFeedDelete}>
                    삭제
                  </button>
                </div>
              )}
            </div>
            <p className="fs-5">{feed.content}</p>

            <div className="mt-4 border-top pt-3 d-flex gap-3">
              <button type="button" className="btn btn-outline-brand" onClick={handleLike}>
                👍 추천 <span>{feed.reactions.like}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            <h6 className="mb-3">댓글</h6>

            {user ? (
              <form className="mb-4" onSubmit={handleCommentSubmit}>
                <div className="input-group">
                  <textarea
                    className="form-control"
                    placeholder="댓글을 남겨보세요"
                    rows={2}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-brand" disabled={commentSubmitting}>
                    {commentSubmitting ? '등록 중...' : '등록'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center text-muted small mb-4">
                댓글을 작성하려면 <Link to="/member/login">로그인</Link>이 필요합니다.
              </div>
            )}

            <ul className="list-group list-group-flush">
              {comments.length === 0 ? (
                <li className="list-group-item text-center text-muted py-3">첫 댓글을 남겨보세요!</li>
              ) : (
                comments.map((comment) => (
                  <li key={comment._id} className="list-group-item px-0">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold small">
                        {comment.author ? comment.author.avatar_emoji : '👤'} {comment.author ? comment.author.nickname : '탈퇴한 사용자'}
                        {comment.author && typeof comment.author.manner_score === 'number' && (
                          <span className="manner-temp-badge ms-1">{comment.author.manner_score.toFixed(1)}℃</span>
                        )}
                      </span>
                      <span className="text-muted small">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mb-1">{comment.content}</p>
                    {user && comment.author && user.id === comment.author._id && (
                      <div className="text-end">
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                          onClick={() => handleCommentDelete(comment._id)}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>

            {currentCommentPage < totalCommentPages && (
              <div ref={commentSentinelRef} className="comment-sentinel text-center text-muted small py-3">
                {loadingMoreComments && (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    댓글 불러오는 중...
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Info
