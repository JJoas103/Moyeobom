// 모임 상세.
//
// 이 화면의 중심은 **2차 장소 확정**이다. 교수님이 "클릭하면 뭐가 나오냐"고 물은 자리이고,
// 끝나고 "어디 갈까요" 하다가 흩어지는 실패를 모이기 전에 막는 기능이다.
// 행사 좌표를 기준으로 카카오 로컬이 주변 카페를 찾아 주고, 호스트가 한 곳을 고르면 확정된다.
//
// 참여는 선착순이다. 승인제는 호스트가 계속 앱을 붙들고 있어야 해서 번개 모임과 맞지 않는다.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import SectionHead from '../../components/common/SectionHead'
import Status from '../../components/common/Status'
import EmptyState from '../../components/common/EmptyState'
import { fetchMeeting } from '../../data/meetings'
import { ME } from '../../data/me'
import { formatMeetingDate } from '../../utils/formatMeetingDate'
import { formatEventPeriod } from '../../utils/formatEventDate'

const STATUS = {
  recruit: { label: '모집중', tone: 'open' },
  full: { label: '마감', tone: 'full' },
  completed: { label: '종료', tone: 'done' },
}

function Detail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 목업 단계라 참여·2차 장소 선택은 화면 안에서만 반영한다.
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

  if (loading) return <div className="mv-skeleton mt-5" style={{ height: 380 }} />

  if (error) {
    return (
      <EmptyState
        title={error}
        action={
          <Link to="/meeting" className="mv-btn mv-btn--ghost">
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

  const others = meeting.participants.filter((p) => p._id !== ME._id)
  const joinedCount = others.length + (joined ? 1 : 0)
  const left = Math.max(0, meeting.maxParticipants - joinedCount)

  return (
    <div>
      <nav className="pt-4 pb-3">
        <Link to="/meeting" className="mv-micro" style={{ color: 'var(--ink-dim)', textDecoration: 'none' }}>
          ← 모임
        </Link>
      </nav>

      {/* ── 표제 ── */}
      <header className="pb-4" style={{ borderBottom: '1px solid var(--ink)' }}>
        <p className="mv-meta mv-dotsep mb-2">
          <Status tone={status.tone}>{status.label}</Status>
          {!isEnded && left > 0 && <span>{left}자리 남음</span>}
          {isHost && <span>내가 만든 모임</span>}
        </p>
        <h1 className="mv-title mb-3">{meeting.title}</h1>
        <dl className="mv-dl">
          <dt>일시</dt>
          <dd className="mv-num">{formatMeetingDate(meeting.meetingDate)}</dd>
          <dt>지역</dt>
          <dd>{meeting.area}</dd>
          <dt>정원</dt>
          <dd className="mv-num">
            {joinedCount} / {meeting.maxParticipants}명
          </dd>
        </dl>
      </header>

      <div className="row g-5 pt-4">
        <div className="col-12 col-lg-7">
          {meeting.content && (
            <p className="mb-4" style={{ whiteSpace: 'pre-line' }}>
              {meeting.content}
            </p>
          )}

          {meeting.tags?.length > 0 && (
            <p className="mv-meta mv-dotsep mb-5">
              {meeting.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
          )}

          {/* ── 2차 장소 확정 ── */}
          <section className="mv-section">
            <SectionHead
              label="보고 나서 갈 곳"
              note="행사장 주변에서 호스트가 한 곳을 고릅니다. 끝나고 어디 갈지 정하다 흩어지지 않게, 모이기 전에 정해 둡니다."
            />

            {afterPlace && (
              <div className="mv-note mv-note--accent my-4">
                <p className="mb-0" style={{ fontWeight: 600 }}>
                  {afterPlace.name}
                </p>
                <p className="mv-meta mb-0">{afterPlace.address}</p>
                {isHost && !isEnded && (
                  <button
                    type="button"
                    className="mv-micro mt-1"
                    style={{ border: 0, background: 'none', color: 'var(--ink-dim)', padding: 0 }}
                    onClick={() => setPicking(true)}
                  >
                    다시 고르기
                  </button>
                )}
              </div>
            )}

            {/* 후보는 참여자에게도 보여준다. 고르는 건 호스트지만, 어디로 갈 수 있는지는
                참여를 결정하는 정보라 감춰 둘 이유가 없다 */}
            {!isEnded && (!afterPlace || picking) && (
              <>
                <p className="mv-micro mt-3 mb-1">
                  {meeting.event?.venue || meeting.area} 주변 · 카카오 로컬 검색
                  {!isHost && ' · 호스트가 이 중에서 고릅니다'}
                </p>
                <ul className="mv-list">
                  {cafeCandidates.map((cafe) => (
                    <li key={cafe.place_name}>
                      <button
                        type="button"
                        className="mv-pick"
                        disabled={!isHost}
                        onClick={() => {
                          setAfterPlace({ ...cafe, name: cafe.place_name, address: cafe.road_address_name })
                          setPicking(false)
                        }}
                      >
                        <span className="mv-pick__name mv-truncate">{cafe.place_name}</span>
                        <span className="mv-meta mv-truncate flex-grow-1">{cafe.road_address_name}</span>
                        <span className="mv-micro mv-num flex-shrink-0">{cafe.distance}m</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {/* ── 끝난 모임: 다음 한 바퀴로 ── */}
          {isEnded && (
            <section className="mv-section">
              <SectionHead label="모임은 끝났습니다" />
              <p className="mv-meta my-3">
                감상을 한 줄 남기면 행사 페이지에 쌓입니다. 같이 있던 사람 중 또 보고 싶은 사람을
                고르면, 양쪽이 서로를 골랐을 때만 친구가 됩니다.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/me" className="mv-btn">
                  감상 남기고 평가하기
                </Link>
                {meeting.event && (
                  <Link to={`/event/${meeting.event._id}`} className="mv-btn mv-btn--ghost">
                    행사 페이지
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>

        {/* ── 사이드 ── */}
        <div className="col-12 col-lg-5">
          {meeting.event && (
            <Link
              to={`/event/${meeting.event._id}`}
              className="d-flex gap-3 pb-4 mb-4 text-decoration-none"
              style={{ borderBottom: '1px solid var(--rule)', color: 'inherit' }}
            >
              <div style={{ width: 62, flexShrink: 0 }}>
                <Poster src={meeting.event.posterUrl} category={meeting.event.category} alt="" />
              </div>
              <div className="min-width-0">
                <p className="mv-micro mb-1">이 모임이 시작된 행사</p>
                <p className="mb-1" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>
                  {meeting.event.title}
                </p>
                <p className="mv-meta mb-0 mv-num">
                  {formatEventPeriod(meeting.event.startAt, meeting.event.endAt)}
                </p>
              </div>
            </Link>
          )}

          <p className="mv-label mb-3">참여자</p>
          <ul className="mv-list mb-4">
            <li className="d-flex align-items-baseline gap-2 py-2" style={{ borderBottom: '1px solid var(--rule)' }}>
              <span style={{ fontWeight: 600 }}>{meeting.author.nickname}</span>
              <span className="mv-micro">호스트</span>
              <span className="mv-micro mv-num ms-auto">매너 {meeting.author.manner_score}</span>
            </li>
            {others
              .filter((p) => p._id !== meeting.author._id)
              .map((p) => (
                <li key={p._id} className="d-flex align-items-baseline gap-2 py-2" style={{ borderBottom: '1px solid var(--rule)' }}>
                  <span>{p.nickname}</span>
                  <span className="mv-micro mv-num ms-auto">매너 {p.manner_score}</span>
                </li>
              ))}
            {joined && (
              <li className="d-flex align-items-baseline gap-2 py-2" style={{ borderBottom: '1px solid var(--rule)' }}>
                <span>{ME.nickname}</span>
                <span className="mv-micro">나</span>
              </li>
            )}
          </ul>

          <p className="mv-help mb-4">닉네임으로만 표시됩니다. 번호나 아이디는 주고받지 않습니다.</p>

          {!isEnded && (
            <>
              <button
                type="button"
                className={`mv-btn mv-btn--block ${joined ? 'mv-btn--ghost' : ''}`}
                disabled={!joined && left === 0}
                onClick={() => setJoined((prev) => !prev)}
              >
                {joined ? '참여 취소' : left === 0 ? '정원이 찼습니다' : '참여하기'}
              </button>
              <p className="mv-help text-center mt-2">선착순입니다. 승인 절차는 없습니다.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Detail
