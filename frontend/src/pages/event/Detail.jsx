// 행사 상세.
//
// 교수님이 "지도든 목록이든 데이터는 같다. 그걸 선택했을 때 무엇을 보여줄 것인가"라고
// 물은 자리가 여기다. 목록 화면이 아니라 이 화면이 답이어야 한다.
//
// 세 덩어리로 답한다.
//   1) 이 행사에 열린 모임 — 없으면 "첫 모임 만들기"가 크게 뜬다 (콜드스타트를 숨기지 않는다)
//   2) 남겨진 감상 — 시간이 지날수록 쌓여서 페이지가 두꺼워진다. 게시판과 다른 지점
//   3) 추천 이유 — 왜 당신에게 이게 떴는지

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import ReasonChips from '../../components/event/ReasonChips'
import GatheringCard from '../../components/meeting/GatheringCard'
import EmptyState from '../../components/common/EmptyState'
import { fetchEvent } from '../../data/events'
import { eventTimingBadge, formatEventPeriodFull } from '../../utils/formatEventDate'

const TIMING_TONE = { now: 'chip-green', soon: 'chip-yellow', later: 'chip-brand', ended: 'chip-red' }

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const hour = Math.floor(diff / (60 * 60 * 1000))
  if (hour < 1) return '방금'
  if (hour < 24) return `${hour}시간 전`
  const day = Math.floor(hour / 24)
  if (day < 30) return `${day}일 전`
  return `${Math.floor(day / 30)}개월 전`
}

function Detail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchEvent(id)
      .then((res) => {
        if (!cancelled) setData(res)
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

  if (loading) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  if (error) {
    return (
      <EmptyState
        emoji="😶"
        title={error}
        action={
          <Link to="/event" className="btn btn-outline-brand">
            행사 목록으로
          </Link>
        }
      />
    )
  }

  const { event, meetings, impressions, reasons } = data
  const openMeetings = meetings.filter((m) => m.status !== 'completed')
  const timing = eventTimingBadge(event.startAt, event.endAt)

  return (
    <div>
      <nav className="small mb-3">
        <Link to="/event" className="text-decoration-none text-muted">
          ← 행사 탐색
        </Link>
      </nav>

      {/* ── 행사 기본 정보 ── */}
      <section className="card overflow-hidden mb-4">
        <div className="row g-0">
          <div className="col-12 col-md-4">
            <Poster src={event.posterUrl} category={event.category} alt={event.title} ratio="4 / 3" rounded="none" />
          </div>
          <div className="col-12 col-md-8">
            <div className="p-4 d-flex flex-column h-100 gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                  <span className="chip chip-brand">{event.category}</span>
                  {timing && <span className={`chip ${TIMING_TONE[timing.tone]}`}>{timing.label}</span>}
                </div>
                <h1 className="h4 mb-2">{event.title}</h1>
                <dl className="event-meta mb-0">
                  <dt>기간</dt>
                  <dd>{formatEventPeriodFull(event.startAt, event.endAt)}</dd>
                  <dt>장소</dt>
                  <dd>
                    {event.venue} <span className="text-muted">· {event.area}</span>
                  </dd>
                  <dt>주소</dt>
                  <dd className="text-muted">{event.address}</dd>
                  <dt>요금</dt>
                  <dd>{event.price || '무료'}</dd>
                </dl>
              </div>

              {reasons.length > 0 && (
                <div className="reason-box">
                  <div className="small fw-semibold mb-2">이 행사가 왜 떴나</div>
                  <ReasonChips reasons={reasons} max={5} />
                </div>
              )}

              <div className="mt-auto d-flex flex-wrap gap-2">
                <Link to={`/meeting/new?event=${event._id}`} className="btn btn-brand">
                  이 행사로 모임 만들기
                </Link>
                {/* 원문 링크는 서울시 API가 준 경우에만. 없는데 비활성 버튼을 두면 고장난 것처럼 보인다 */}
                {event.detailUrl && (
                  <a
                    href={event.detailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline-brand"
                  >
                    행사 정보 원문
                  </a>
                )}
              </div>
              <p className="small text-muted mb-0">
                모임을 만들면 제목·날짜·장소·좌표가 이 행사에서 자동으로 채워집니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 이 행사에 열린 모임 ── */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <h2 className="h5 mb-0">
            같이 갈 모임 <span className="text-muted fw-normal">{openMeetings.length}</span>
          </h2>
          {openMeetings.length > 0 && (
            <Link to={`/meeting/new?event=${event._id}`} className="small text-decoration-none" style={{ color: 'var(--brand)' }}>
              + 모임 만들기
            </Link>
          )}
        </div>

        {openMeetings.length === 0 ? (
          // 콜드스타트 — 초기에는 이 상태가 대부분이다. 비워 두지 않고 첫 모임을 권한다
          <div className="card cold-start p-4">
            <EmptyState
              emoji="🪑"
              title="아직 모임이 없습니다"
              description={'이 행사를 보러 가는 첫 사람이 되어 보세요.\n제목·날짜·장소는 이미 채워져 있어 두 줄만 쓰면 됩니다.'}
              action={
                <Link to={`/meeting/new?event=${event._id}`} className="btn btn-brand">
                  이 행사 첫 모임 만들기
                </Link>
              }
            />
          </div>
        ) : (
          <div className="row g-3">
            {openMeetings.map((meeting) => (
              <div key={meeting._id} className="col-12 col-lg-6">
                <GatheringCard meeting={meeting} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 남겨진 감상 ── */}
      <section className="mb-4">
        <div className="d-flex justify-content-between align-items-end mb-1">
          <h2 className="h5 mb-0">
            이 행사를 본 사람들 <span className="text-muted fw-normal">{impressions.length}</span>
          </h2>
        </div>
        <p className="small text-muted mb-3">
          모임에 참여하지 않아도 한 줄 남길 수 있습니다. 다음에 이 행사를 볼 사람에게 보입니다.
        </p>

        {impressions.length === 0 ? (
          <div className="card p-4">
            <EmptyState
              emoji="💬"
              title="아직 남겨진 감상이 없습니다"
              description={'보고 나서 한 줄 남기면 다음 사람에게 도움이 됩니다.'}
            />
          </div>
        ) : (
          <ul className="impression-list">
            {impressions.map((imp) => (
              <li key={imp._id} className="card p-3">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span aria-hidden="true">{imp.author.avatar_emoji}</span>
                  <span className="small fw-semibold">{imp.author.nickname}</span>
                  <span className="small text-muted ms-auto">{timeAgo(imp.createdAt)}</span>
                </div>
                <p className="mb-0">{imp.text}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default Detail
