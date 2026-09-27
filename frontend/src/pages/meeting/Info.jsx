import { Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPost, API_BASE_URL } from '../../api'
import ErrorMessage from '../../components/ErrorMessage'

// views/meeting/info.ejs 를 옮긴 모임 상세 페이지
function Info() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [meeting, setMeeting] = useState(null)
  const [comments, setComments] = useState([])
  const [totalCommentPages, setTotalCommentPages] = useState(1)
  const [currentCommentPage, setCurrentCommentPage] = useState(1)
  const [parkingCount, setParkingCount] = useState(0)
  const [restroomCount, setRestroomCount] = useState(0)
  const [recentFeeds, setRecentFeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)
  const [commentContent, setCommentContent] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)
  const commentSentinelRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setMeeting(null)
    setComments([])
    setTotalCommentPages(1)
    setCurrentCommentPage(1)
    setParkingCount(0)
    setRestroomCount(0)
    setRecentFeeds([])

    apiGet(`/api/meeting/info/${id}`)
      .then((data) => {
        if (cancelled) return
        setMeeting(data.meeting)
        setComments(data.comments)
        setTotalCommentPages(data.totalCommentPages)
        setCurrentCommentPage(data.currentCommentPage)
        setParkingCount(data.parkingCount || 0)
        setRestroomCount(data.restroomCount || 0)
        setRecentFeeds(data.recentFeeds || [])
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

  // 로그인 상태 + 모임 정보 로드가 끝나면 해당 지역 방에 입장해서 새 제보를 실시간으로 받기
  useEffect(() => {
    if (!user || !meeting?.area) return undefined

    const socket = io(API_BASE_URL, { withCredentials: true })
    socket.emit('joinDistrict', meeting.area)

    socket.on('newReportInDistrict', (data) => {
      setRecentFeeds((prev) => {
        const next = [
          {
            _id: data.feedId,
            content: data.content,
            author: { nickname: data.authorNickname, avatar_emoji: data.authorEmoji },
            createdAt: data.createdAt,
          },
          ...prev,
        ]
        return next.slice(0, 5)
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [user, meeting?.area])

  const loadMoreComments = async () => {
    if (loadingMoreComments || !meeting || currentCommentPage >= totalCommentPages) return
    setLoadingMoreComments(true)
    try {
      const nextPage = currentCommentPage + 1
      const data = await apiGet(`/api/meeting/${meeting._id}/comments`, { params: { commentPage: nextPage } })
      setComments((prev) => [...prev, ...data.comments])
      setCurrentCommentPage(data.currentCommentPage)
      setTotalCommentPages(data.totalCommentPages)
    } catch (err) {
      console.warn('댓글 추가 로드 실패:', err.message)
    } finally {
      setLoadingMoreComments(false)
    }
  }

  // 댓글 목록 아래 sentinel이 화면에 보이면 다음 페이지를 이어붙이기
  useEffect(() => {
    if (!meeting || !commentSentinelRef.current || currentCommentPage >= totalCommentPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreComments()
      },
      { rootMargin: '200px' },
    )
    observer.observe(commentSentinelRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, currentCommentPage, totalCommentPages, loadingMoreComments])

  const handleJoinToggle = async () => {
    setJoining(true)
    try {
      const data = await apiPost(`/api/meeting/join/${meeting._id}`)
      setMeeting(data.meeting)
    } catch (err) {
      alert(err.message)
    } finally {
      setJoining(false)
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentContent.trim()) return

    setCommentSubmitting(true)
    try {
      await apiPost('/api/comment/write', { content: commentContent, boardId: meeting._id, onModel: 'Meeting' })
      setCommentContent('')
      // 등록 후 댓글 목록을 처음부터 다시 불러오기(최신순 정렬이라 맨 위에 보임)
      const data = await apiGet(`/api/meeting/info/${id}`)
      setComments(data.comments)
      setTotalCommentPages(data.totalCommentPages)
      setCurrentCommentPage(data.currentCommentPage)
    } catch (err) {
      alert(err.message || '댓글 등록에 실패했습니다')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const handleMeetingDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    try {
      await apiPost(`/api/meeting/delete/${meeting._id}`)
      navigate('/meeting/list')
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다')
    }
  }

  const handleCommentDelete = async (commentId) => {
    try {
      await apiPost('/api/comment/delete', { commentId, boardId: meeting._id, onModel: 'Meeting' })
      // 이미 스크롤로 불러온 목록은 그대로 두고, 삭제된 댓글만 화면에서 제거하기
      setComments((prev) => prev.filter((c) => c._id !== commentId))
    } catch (err) {
      alert(err.message || '댓글 삭제에 실패했습니다')
    }
  }

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  if (error || !meeting) {
    return <ErrorMessage statusCode={error?.status || 404} message={error?.message || '모임을 찾을 수 없습니다'} />
  }

  const now = new Date()
  const isExpired = new Date(meeting.meetingDate) < now
  const isClosingSoon = !isExpired && new Date(meeting.meetingDate) <= new Date(now.getTime() + 24 * 60 * 60 * 1000)

  let chipClass = 'chip-green'
  let dotClass = 'dot-green'
  if (isExpired) {
    chipClass = 'chip-secondary'
    dotClass = 'dot-secondary'
  } else if (['혼잡', '붐빔', '약간 붐빔'].includes(meeting.congestionLevel)) {
    chipClass = 'chip-red'
    dotClass = 'dot-red'
  } else if (meeting.congestionLevel === '보통') {
    chipClass = 'chip-yellow'
    dotClass = 'dot-yellow'
  }

  const isAuthor = user && user.id === meeting.author._id
  const isParticipant = user && meeting.participants.some((p) => p._id === user.id)
  const isFull = meeting.status === 'full' || meeting.participants.length >= meeting.maxParticipants
  const percent = (meeting.participants.length / meeting.maxParticipants) * 100

  return (
    <div>
      <Link to="/meeting/list" className="text-decoration-none text-muted small mb-3 d-inline-block">
        ← 목록으로
      </Link>
      <div className="row g-4">
        <div className="col-lg-8">
          <article className="card shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h3 className="mb-1">
                    {meeting.title}
                    {isExpired && <span className="badge bg-secondary ms-1">기간만료</span>}
                    {!isExpired && isClosingSoon && <span className="badge bg-warning text-dark ms-1">마감임박</span>}
                  </h3>
                  <div className="small text-muted">
                    주최자: <strong>{meeting.author.nickname}</strong>{' '}
                    <span className="badge bg-light text-dark ms-1" style={{ border: '1px solid #ddd' }}>
                      {meeting.author.manner_score.toFixed(1)}°C
                    </span>{' '}
                    · 작성일: {new Date(meeting.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <span className={`chip ${chipClass}`}>
                  📍 {meeting.area} · {isExpired ? '종료됨' : meeting.congestionLevel}
                </span>
              </div>

              <div className="row g-2 mb-4">
                <div className="col-md-4">
                  <div className="p-3 rounded" style={{ background: 'var(--surface2)' }}>
                    <div className="small text-muted">장소</div>
                    <div className="fw-bold text-brand">{meeting.area}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 rounded" style={{ background: 'var(--surface2)' }}>
                    <div className="small text-muted">일시</div>
                    <div className="fw-bold">
                      {new Date(meeting.meetingDate).toLocaleDateString()}{' '}
                      {new Date(meeting.meetingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="p-3 rounded" style={{ background: 'var(--surface2)' }}>
                    <div className="small text-muted">인원</div>
                    <div className="fw-bold">
                      <span className="text-brand">{meeting.participants.length}</span> / {meeting.maxParticipants}명
                    </div>
                  </div>
                </div>
              </div>

              <div className="post-content fs-5 mb-4">
                <div className="ratio ratio-16x9 mb-3" style={{ maxWidth: 600 }}>
                  <img
                    src={`${API_BASE_URL}/images/upload/${meeting.imageUrl}`}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = 'https://placehold.co/500x300/e0e0e0/666666?text=No+Image'
                    }}
                    className="rounded"
                    style={{ objectFit: 'cover' }}
                    alt="모임 이미지"
                  />
                </div>

                <div
                  className="alert mb-4 p-3"
                  style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-border)', color: 'var(--ink)', borderRadius: 12 }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <strong className="fs-6">📎 자동 첨부된 장소 정보</strong>
                    <Link
                      to={`/feed/list?place_name=${encodeURIComponent(meeting.area)}`}
                      className="small text-decoration-none"
                      style={{ color: 'var(--brand)', fontWeight: 600 }}
                    >
                      제보 더보기 →
                    </Link>
                  </div>

                  <div className="d-flex gap-2 flex-wrap mb-3">
                    <span className={`chip ${chipClass}`} title="혼잡도">
                      <span className={`dot ${dotClass}`}></span> {meeting.congestionLevel}
                    </span>
                    <span className="chip chip-brand">📍 {meeting.area}</span>
                    {parkingCount > 0 && <span className="chip chip-soft">🚗 주차장 {parkingCount}</span>}
                    {restroomCount > 0 && <span className="chip chip-soft">🚻 화장실 {restroomCount}</span>}
                  </div>

                  <div
                    className="bg-white bg-opacity-50 rounded p-2"
                    style={{ maxHeight: 200, overflowY: 'auto', border: '1px dashed var(--brand-border)' }}
                  >
                    {recentFeeds.length > 0 ? (
                      recentFeeds.map((feed) => (
                        <div key={feed._id} className="p-2 mb-1 bg-white rounded small border-bottom">
                          <div className="d-flex justify-content-between mb-0">
                            <span className="fw-bold" style={{ fontSize: '0.8rem' }}>
                              {feed.author.avatar_emoji} {feed.author.nickname}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date(feed.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}{' '}
                              {new Date(feed.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          </div>
                          <p className="mb-0 text-truncate" style={{ fontSize: '0.85rem' }}>
                            {feed.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-2 text-muted small">현재 이 장소에 등록된 제보가 없습니다.</div>
                    )}
                  </div>
                </div>

                {meeting.content}
              </div>

              <div className="mb-4">
                {meeting.tags.map((tag) => (
                  <span key={tag} className="tag-soft">
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="d-flex gap-2">
                <Link className="btn btn-outline-secondary" to="/meeting/list">
                  목록으로
                </Link>
                {isAuthor && (
                  <>
                    <Link className="btn btn-brand" to={`/meeting/modify/${meeting._id}`}>
                      수정
                    </Link>
                    <button type="button" className="btn btn-outline-danger" onClick={handleMeetingDelete}>
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>

          <section className="mt-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5>
                  참여자 ({meeting.participants.length} / {meeting.maxParticipants})
                </h5>
                <ul className="list-group list-group-flush">
                  {meeting.participants.map((p) => (
                    <li key={p._id} className="list-group-item d-flex align-items-center gap-3 px-0">
                      <div style={{ fontSize: '1.5rem' }}>{p.avatar_emoji}</div>
                      <div>
                        <strong>
                          {p.nickname} {p._id === meeting.author._id && <span className="badge bg-brand small text-dark">주최자</span>}
                        </strong>
                        <div className="small text-muted">매너온도 {p.manner_score.toFixed(1)}°C</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <h5 className="mb-3">댓글</h5>

            {user ? (
              <div className="card mb-4">
                <div className="card-body">
                  <form onSubmit={handleCommentSubmit}>
                    <div className="mb-3">
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="댓글을 입력하세요"
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-brand" disabled={commentSubmitting}>
                      {commentSubmitting ? '등록 중...' : '댓글 등록'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted small mb-4">
                댓글을 작성하려면 <Link to="/member/login">로그인</Link>이 필요합니다.
              </div>
            )}

            <ul className="list-group mb-4">
              {comments.length === 0 ? (
                <li className="list-group-item text-center text-muted py-4">아직 댓글이 없습니다.</li>
              ) : (
                comments.map((comment) => (
                  <li key={comment._id} className="list-group-item p-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold">
                        {comment.author.avatar_emoji} {comment.author.nickname}{' '}
                        <span className="badge bg-light text-dark ms-1" style={{ border: '1px solid #ddd' }}>
                          {comment.author.manner_score.toFixed(1)}°C
                        </span>
                        {comment.author._id === meeting.author._id && (
                          <span className="badge bg-brand small ms-1 text-dark" style={{ fontSize: '0.7rem' }}>
                            주최자
                          </span>
                        )}
                      </span>
                      <span className="small text-muted ms-auto">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mb-1">{comment.content}</p>
                    {user && user.id === comment.author._id && (
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
          </section>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm sticky-top" style={{ top: 20 }}>
            <div className="card-body">
              <h5 className="mb-3">참여 신청</h5>
              <div className="mb-3 p-3 rounded bg-light">
                <div className="small text-muted">현재 모집 인원</div>
                <h4>
                  <span style={{ color: 'var(--brand)' }}>{meeting.participants.length}</span> / {meeting.maxParticipants}명
                </h4>
                <div className="progress mt-2" style={{ height: 6 }}>
                  <div
                    className="progress-bar"
                    style={{ width: `${percent}%`, backgroundColor: 'var(--brand)' }}
                    role="progressbar"
                  ></div>
                </div>
              </div>

              {isExpired ? (
                <>
                  <div className="d-grid">
                    <button type="button" className="btn btn-secondary btn-lg" disabled>
                      모집 마감
                    </button>
                  </div>
                  <div className="alert alert-secondary mt-3 mb-0 small text-center">
                    날짜가 지난 모임은 참여 신청 및 취소가 불가능합니다.
                  </div>
                </>
              ) : !user ? (
                <div className="d-grid">
                  <Link to="/member/login" className="btn btn-outline-secondary btn-lg">
                    로그인 후 참여 가능
                  </Link>
                </div>
              ) : isAuthor ? (
                <div className="alert alert-info text-center mb-0">내가 만든 모임입니다.</div>
              ) : (
                <>
                  <div className="d-grid">
                    {isParticipant ? (
                      <button type="button" className="btn btn-outline-danger btn-lg" onClick={handleJoinToggle} disabled={joining}>
                        {joining ? '처리 중...' : '참여 취소하기'}
                      </button>
                    ) : isFull ? (
                      <button type="button" className="btn btn-secondary btn-lg" disabled>
                        모집 마감
                      </button>
                    ) : (
                      <button type="button" className="btn btn-brand btn-lg" onClick={handleJoinToggle} disabled={joining}>
                        {joining ? '처리 중...' : '참여 신청하기'}
                      </button>
                    )}
                  </div>
                  <hr />
                  <div className="small text-muted">
                    모임 24시간 전까지 취소 가능합니다
                    <br />
                    매너 있는 모임 문화를 위해 노쇼에 주의해 주세요.
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Info
