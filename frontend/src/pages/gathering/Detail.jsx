// 모임 상세.
//
// 이 화면의 중심은 **2차 장소 확정**이다. 교수님이 "클릭하면 뭐가 나오냐"고 물은 자리이고,
// 끝나고 "어디 갈까요" 하다가 흩어지는 실패를 모이기 전에 막는 기능이다.
// 행사 좌표를 기준으로 카카오 로컬이 주변 카페를 찾아 주고, 호스트가 한 곳을 고르면 확정된다.
//
// 참여는 선착순이다. 승인제는 호스트가 계속 앱을 붙들고 있어야 해서 번개 모임 성격과 맞지 않는다.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import EmptyState from '../../components/common/EmptyState'
import { fetchMeeting } from '../../data/meetings'
import { ME } from '../../data/me'
import { formatMeetingDate } from '../../utils/formatMeetingDate'
import { formatEventPeriod } from '../../utils/formatEventDate'

const STATUS = {
  recruit: { label: '모집중', tone: 'chip-green' },
  full: { label: '마감', tone: 'chip-yellow' },
  completed: { label: '종료', tone: 'chip-red' },
}

function Detail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 목업 단계라 참여/2차 장소 선택은 화면 안에서만 반영한다.
  // 서버 연결은 다음 단계 — 지금은 동선이 맞는지 확인하는 게 목적이다.
  const [joined, setJoined] = useState(false)
  const [afterPlace, setAfterPlace] = useState(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMeeting(id)
      .then((res) => {
        if (cancelled) return
        setData(res)
        setAfterPlace(res.meeting.afterPlace || null)
        setJoined(res.meeting.participants.some((p) => p._id === ME._id))
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
  }, [id])

  if (loading) return <div className="text-center text-muted py-5">불러오는 중...</div>

  if (error) {
    return (
      <EmptyState
        emoji="😶"
        title={error}
        action={
          <Link to="/meeting" className="btn btn-outline-brand">
            모임 목록으로
          </Link>
        }
      />
    )
  }

  const { meeting, cafeCandidates } = data
  const status = STATUS[meeting.status] || STATUS.recruit
  const isHost = meeting.author._id === ME._id
  const isEnded = meeting.status === 'completed'

  const participants = joined
    ? meeting.participants
    : meeting.participants.filter((p) => p._id !== ME._id)
  const joinedCount = joined
    ? meeting.participants.length
    : meeting.participants.filter((p) => p._id !== ME._id).length
  const left = Math.max(0, meeting.maxParticipants - joinedCount)

  return (
    <div>
      <nav className="small mb-3">
        <Link to="/meeting" className="text-decoration-none text-muted">
          ← 모임
        </Link>
      </nav>

      <div className="row g-4">
        <div className="col-12 col-lg-8">
          {/* ── 모임 본문 ── */}
          <section className="card p-4 mb-4">
            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
              <span className={`chip ${status.tone}`}>{status.label}</span>
              {!isEnded && left > 0 && <span className="small text-muted">{left}자리 남음</span>}
              {isHost && <span className="chip chip-blue">내가 만든 모임</span>}
            </div>

            <h1 className="h4 mb-3">{meeting.title}</h1>

            <dl className="event-meta mb-3">
              <dt>일시</dt>
              <dd>{formatMeetingDate(meeting.meetingDate)}</dd>
              <dt>지역</dt>
              <dd>{meeting.area}</dd>
              <dt>정원</dt>
              <dd>
                {joinedCount} / {meeting.maxParticipants}명
              </dd>
            </dl>

            <p className="mb-3" style={{ whiteSpace: 'pre-line' }}>
              {meeting.content}
            </p>

            {meeting.tags?.length > 0 && (
              <div className="d-flex flex-wrap gap-1">
                {meeting.tags.map((t) => (
                  <span key={t} className="tag-soft">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* ── 2차 장소 확정 ── */}
          <section className="card p-4 mb-4">
            <h2 className="h6 mb-1">보고 나서 갈 곳</h2>
            <p className="small text-muted mb-3">
              행사장 주변에서 호스트가 한 곳을 고릅니다. 끝나고 &ldquo;어디 갈까요&rdquo; 하다가
              흩어지지 않게, 모이기 전에 정해 둡니다.
            </p>

            {afterPlace ? (
              <div className="after-place">
                <div className="flex-grow-1 min-width-0">
                  <div className="fw-semibold text-truncate">☕ {afterPlace.name}</div>
                  <div className="small text-muted text-truncate">{afterPlace.address}</div>
                </div>
                <span className="chip chip-green flex-shrink-0">확정</span>
                {isHost && !isEnded && (
                  <button type="button" className="btn btn-sm btn-link text-muted" onClick={() => setPicking(true)}>
                    변경
                  </button>
                )}
              </div>
            ) : (
              <div className="alert alert-light border small mb-3">아직 정해지지 않았습니다.</div>
            )}

            {/* 후보는 참여자에게도 보여준다. 고르는 건 호스트지만, 어디로 갈 수 있는지는
                참여를 결정하는 정보라 감춰 둘 이유가 없다. */}
            {!isEnded && (!afterPlace || picking) && (
              <>
                <div className="small text-muted mb-2">
                  {meeting.event?.venue || meeting.area} 주변 · 카카오 로컬 검색 결과
                  {!isHost && <span className="ms-1">— 호스트가 이 중에서 고릅니다</span>}
                </div>
                <ul className="cafe-list mb-0">
                  {cafeCandidates.map((cafe) => (
                    <li key={cafe.place_name}>
                      <button
                        type="button"
                        className="cafe-item"
                        disabled={!isHost}
                        onClick={() => {
                          setAfterPlace({ ...cafe, name: cafe.place_name, address: cafe.road_address_name })
                          setPicking(false)
                        }}
                      >
                        <span className="flex-grow-1 min-width-0">
                          <span className="d-block fw-semibold text-truncate">{cafe.place_name}</span>
                          <span className="d-block small text-muted text-truncate">{cafe.road_address_name}</span>
                        </span>
                        <span className="small text-muted flex-shrink-0">{cafe.distance}m</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* ── 끝난 모임: 다음 한 바퀴로 ── */}
          {isEnded && (
            <section className="card p-4 mb-4 loop-next">
              <h2 className="h6 mb-2">모임은 끝났습니다</h2>
              <p className="small text-muted mb-3">
                감상을 한 줄 남기면 행사 페이지에 쌓입니다. 같이 있던 사람 중 또 보고 싶은 사람을
                고르면, <strong>양쪽이 서로를 골랐을 때만</strong> 친구가 됩니다.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/me" className="btn btn-brand">
                  감상 남기고 평가하기
                </Link>
                {meeting.event && (
                  <Link to={`/event/${meeting.event._id}`} className="btn btn-outline-brand">
                    행사 페이지 보기
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── 사이드: 행사 + 참여자 + 참여 버튼 ── */}
        <div className="col-12 col-lg-4">
          {meeting.event && (
            <Link to={`/event/${meeting.event._id}`} className="card p-3 mb-3 text-decoration-none text-dark d-block">
              <div className="small text-muted mb-2">이 모임이 시작된 행사</div>
              <div className="d-flex gap-3">
                <div style={{ width: 64, flexShrink: 0 }}>
                  <Poster
                    src={meeting.event.posterUrl}
                    category={meeting.event.category}
                    alt={meeting.event.title}
                    ratio="1 / 1"
                    rounded="all"
                  />
                </div>
                <div className="min-width-0">
                  <div className="fw-semibold text-truncate">{meeting.event.title}</div>
                  <div className="small text-muted text-truncate">
                    {formatEventPeriod(meeting.event.startAt, meeting.event.endAt)}
                  </div>
                  <div className="small text-muted text-truncate">{meeting.event.venue}</div>
                </div>
              </div>
            </Link>
          )}

          <section className="card p-3 mb-3">
            <div className="small text-muted mb-2">
              참여자 {joinedCount} / {meeting.maxParticipants}
            </div>
            <ul className="participant-list mb-0">
              <li>
                <span aria-hidden="true">{meeting.author.avatar_emoji}</span>
                <span className="fw-semibold">{meeting.author.nickname}</span>
                <span className="chip chip-brand ms-1">호스트</span>
                <span className="small text-muted ms-auto">매너 {meeting.author.manner_score}</span>
              </li>
              {participants
                .filter((p) => p._id !== meeting.author._id)
                .map((p) => (
                  <li key={p._id}>
                    <span aria-hidden="true">{p.avatar_emoji}</span>
                    <span>{p.nickname}</span>
                    <span className="small text-muted ms-auto">매너 {p.manner_score}</span>
                  </li>
                ))}
            </ul>
            <p className="small text-muted mt-3 mb-0">
              닉네임으로만 표시됩니다. 번호나 아이디는 주고받지 않습니다.
            </p>
          </section>

          {!isEnded && (
            <button
              type="button"
              className={`btn w-100 btn-lg ${joined ? 'btn-outline-brand' : 'btn-brand'}`}
              disabled={!joined && left === 0}
              onClick={() => setJoined((prev) => !prev)}
            >
              {joined ? '참여 취소' : left === 0 ? '정원이 찼습니다' : '참여하기'}
            </button>
          )}
          {!isEnded && (
            <p className="small text-muted mt-2 mb-0 text-center">선착순입니다. 승인 절차는 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Detail
