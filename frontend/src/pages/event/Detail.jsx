// 행사 상세.
//
// 교수님이 "지도든 목록이든 데이터는 같다. 그걸 선택했을 때 무엇을 보여줄 것인가"라고
// 물은 자리가 여기다. 목록 화면이 아니라 이 화면이 답이어야 해서, 여백을 가장 크게 잡고
// 세 덩어리로 답한다.
//
//   1) 이 행사에 열린 모임 — 없으면 "첫 모임 만들기"가 크게 뜬다
//   2) 남겨진 감상 — 시간이 지날수록 쌓여 페이지가 두꺼워진다. 게시판과 다른 지점
//   3) 추천 이유 — 왜 당신에게 이게 떴는지

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import SectionHead from '../../components/common/SectionHead'
import Status from '../../components/common/Status'
import ReasonLine from '../../components/event/ReasonLine'
import MeetingRow from '../../components/meeting/MeetingRow'
import EmptyState from '../../components/common/EmptyState'
import { fetchEvent } from '../../data/events'
import { eventTimingBadge, formatEventPeriodFull } from '../../utils/formatEventDate'

function timeAgo(iso) {
  const hour = Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000))
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

  if (loading) return <div className="mv-skeleton mt-5" style={{ height: 420 }} />

  if (error) {
    return (
      <EmptyState
        title={error}
        action={
          <Link to="/event" className="mv-btn mv-btn--ghost">
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
      <nav className="pt-4 pb-3">
        <Link to="/event" className="mv-micro" style={{ color: 'var(--ink-dim)', textDecoration: 'none' }}>
          ← 행사
        </Link>
      </nav>

      {/* ── 표제 ── */}
      <header className="row g-4 g-lg-5 pb-5 align-items-start" style={{ borderBottom: '1px solid var(--ink)' }}>
        <div className="col-7 col-md-4 col-lg-3">
          <Poster src={event.posterUrl} category={event.category} title={event.title} />
        </div>

        <div className="col-12 col-md-8 col-lg-9">
          <p className="mv-meta mv-dotsep mb-2">
            <span className="mv-tag">{event.category}</span>
            {timing && <Status tone={timing.tone === 'ended' ? 'done' : 'open'}>{timing.label}</Status>}
          </p>

          <h1 className="mv-title mb-4">{event.title}</h1>

          <dl className="mv-dl mb-4">
            <dt>기간</dt>
            <dd className="mv-num">{formatEventPeriodFull(event.startAt, event.endAt)}</dd>
            <dt>장소</dt>
            <dd>
              {event.venue}
              {event.area && <span style={{ color: 'var(--ink-dim)' }}> · {event.area}</span>}
            </dd>
            <dt>주소</dt>
            <dd style={{ color: 'var(--ink-sub)' }}>{event.address}</dd>
            <dt>요금</dt>
            <dd>{event.price || '무료'}</dd>
          </dl>

          {reasons.length > 0 && (
            <div className="mv-note mv-note--accent mb-4">
              <p className="mv-micro mb-1">이 행사가 왜 떴나</p>
              <ReasonLine reasons={reasons} max={5} />
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 align-items-center">
            <Link to={`/meeting/new?event=${event._id}`} className="mv-btn">
              이 행사로 모임 만들기
            </Link>
            {event.detailUrl && (
              <a href={event.detailUrl} target="_blank" rel="noreferrer" className="mv-btn mv-btn--ghost">
                행사 정보 원문
              </a>
            )}
          </div>
          <p className="mv-help mt-3 mb-0">
            모임을 만들면 제목 · 날짜 · 장소 · 좌표가 이 행사에서 자동으로 채워집니다.
          </p>
        </div>
      </header>

      {/* ── 이 행사에 열린 모임 ── */}
      <section className="mv-section pt-5">
        <SectionHead
          label="같이 갈 모임"
          count={openMeetings.length}
          action={
            openMeetings.length > 0 && (
              <Link to={`/meeting/new?event=${event._id}`} className="mv-link mv-micro">
                모임 만들기
              </Link>
            )
          }
        />

        {openMeetings.length === 0 ? (
          // 콜드스타트 — 초기에는 이 상태가 대부분이라 "덜 만든 화면"으로 보이면 안 된다
          <EmptyState
            title="아직 모임이 없습니다"
            description={
              '이 행사를 보러 가는 첫 사람이 되어 보세요.\n제목 · 날짜 · 장소는 이미 채워져 있어 두 줄만 쓰면 됩니다.'
            }
            action={
              <Link to={`/meeting/new?event=${event._id}`} className="mv-btn">
                이 행사 첫 모임 만들기
              </Link>
            }
          />
        ) : (
          <ul className="mv-list">
            {openMeetings.map((meeting) => (
              <MeetingRow key={meeting._id} meeting={meeting} />
            ))}
          </ul>
        )}
      </section>

      {/* ── 남겨진 감상 ── */}
      <section className="mv-section">
        <SectionHead
          label="이 행사를 본 사람들"
          count={impressions.length}
          note="모임에 참여하지 않아도 한 줄 남길 수 있습니다. 다음에 이 행사를 볼 사람에게 보입니다."
        />

        {impressions.length === 0 ? (
          <EmptyState
            title="아직 남겨진 감상이 없습니다"
            description="보고 나서 한 줄 남기면 다음 사람에게 도움이 됩니다."
          />
        ) : (
          <ul className="mv-list mt-2">
            {impressions.map((imp) => (
              <li key={imp._id} style={{ borderBottom: '1px solid var(--rule)', padding: '18px 0' }}>
                <p className="mv-meta mv-dotsep mb-1">
                  <span>{imp.author.nickname}</span>
                  <span>{timeAgo(imp.createdAt)}</span>
                </p>
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
