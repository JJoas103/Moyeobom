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
import LikeButton from '../../components/common/LikeButton'
import MeetingRow from '../../components/meeting/MeetingRow'
import EmptyState from '../../components/common/EmptyState'
import { fetchEvent } from '../../data/events'
import {
  eventTimingBadge,
  expectedEndLabel,
  formatEventPeriod,
  formatEventPeriodFull,
} from '../../utils/formatEventDate'
import { formatMeetingDate } from '../../utils/formatMeetingDate'

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
  // 사이드바의 "가장 빠른 모임" — 아직 안 지난 것 중 가장 이른 것
  const nextMeeting = [...openMeetings].sort(
    (a, b) => new Date(a.meetingDate) - new Date(b.meetingDate),
  )[0]
  const timing = eventTimingBadge(event.startAt, event.endAt)

  return (
    <div>
      <nav className="pt-4 pb-3">
        <Link to="/event" className="mv-micro" style={{ color: 'var(--ink-dim)', textDecoration: 'none' }}>
          ← 행사
        </Link>
      </nav>

      {/* ── 표제 ──
          시안 v2 처럼 포스터 · 본문 · 요약 사이드바 3단. 사이드바가 "지금 어떤 상태인지"와
          주 동작을 한곳에 모아, 스크롤을 내리지 않아도 모임을 만들 수 있게 한다. */}
      <header className="row g-4 g-lg-5 pb-5 align-items-start">
        <div className="col-7 col-md-4 col-lg-3">
          <Poster src={event.posterUrl} category={event.category} title={event.title} />
        </div>

        <div className="col-12 col-md-8 col-lg-5">
          <p className="mv-meta mv-dotsep mb-2">
            {timing && <Status tone={timing.tone === 'ended' ? 'done' : 'open'}>{timing.label}</Status>}
            <span className="mv-tag">{event.category}</span>
            {event.isSeries && <span className="mv-tag">회차형</span>}
          </p>

          <h1 className="mv-title mb-3">{event.title}</h1>

          <p className="mv-meta mb-1 mv-num">
            {formatEventPeriodFull(event.startAt, event.endAt)} · {event.venue}
          </p>
          {event.schedule && (
            <p className="mv-meta mb-0 mv-num">
              {event.schedule}
              {event.runtimeMin && ` · ${event.runtimeMin}분`}
            </p>
          )}

          {reasons.length > 0 && (
            <div className="mv-note mv-note--accent mt-4">
              <p className="mv-micro mb-1">추천 이유</p>
              <ReasonLine reasons={reasons} max={5} />
            </div>
          )}

          {event.organizer && <p className="mv-help mt-4 mb-0">행사 정보 출처 · {event.organizer}</p>}
        </div>

        <div className="col-12 col-lg-4">
          <aside className="mv-aside">
            <p className="mb-1" style={{ fontWeight: 600 }}>
              {event.title}
            </p>
            <p className="mv-meta mb-3 mv-num">
              {formatEventPeriod(event.startAt, event.endAt)} · {event.area}
            </p>

            <div style={{ borderTop: '1px solid var(--rule)', paddingTop: 10, marginBottom: 14 }}>
              <div className="mv-aside__row">
                <span style={{ color: 'var(--ink-sub)' }}>열린 모임</span>
                <strong className="mv-num">{meetings.length}개</strong>
              </div>
              <div className="mv-aside__row">
                <span style={{ color: 'var(--ink-sub)' }}>지금 모집 중</span>
                <strong className="mv-num" style={{ color: 'var(--accent)' }}>
                  {openMeetings.length}개
                </strong>
              </div>
              {nextMeeting && (
                <div className="mv-aside__row">
                  <span style={{ color: 'var(--ink-sub)' }}>가장 빠른 모임</span>
                  <strong className="mv-num">{formatMeetingDate(nextMeeting.meetingDate)}</strong>
                </div>
              )}
            </div>

            <div className="d-flex gap-2">
              <LikeButton count={event.likeCount ?? 0} label="이 행사 찜" />
              <Link to={`/meeting/new?event=${event._id}`} className="mv-btn flex-grow-1">
                이 행사로 모임 만들기
              </Link>
            </div>

            <p className="mv-help mt-3 mb-0">
              티켓은 각자 예매해요. 모임 참여는 호스트가 승인하면 확정돼요.
            </p>
          </aside>
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
          <ul className="mv-list mv-list--meeting">
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

      {/* ── 행사 정보 ──
          위 표제는 훑어보는 자리이고 여기는 확인하는 자리다. 분류·기간·회차처럼
          정확한 값이 필요한 것을 모아 둔다. */}
      <section className="mv-section">
        <SectionHead label="행사 정보" />
        <dl className="mv-dl mt-3" style={{ gridTemplateColumns: '80px minmax(0, 1fr)' }}>
          <dt>분류</dt>
          <dd>
            {event.category}
            {event.isSeries && ' · 회차형'}
          </dd>
          <dt>기간</dt>
          <dd className="mv-num">{formatEventPeriodFull(event.startAt, event.endAt)}</dd>
          {event.schedule && (
            <>
              <dt>회차</dt>
              <dd className="mv-num">
                {event.schedule}
                {event.runtimeMin && ` · ${event.runtimeMin}분`}
              </dd>
              <dt>예상 종료</dt>
              <dd className="mv-num">
                {expectedEndLabel(event)}
                <span style={{ color: 'var(--ink-dim)' }}> (시작 시각 + 러닝타임 예상값)</span>
              </dd>
            </>
          )}
          <dt>장소</dt>
          <dd>
            {event.venue}
            {event.area && <span style={{ color: 'var(--ink-dim)' }}> · {event.area}</span>}
          </dd>
          <dt>요금</dt>
          <dd>
            {event.price || '무료'}
            <span style={{ color: 'var(--ink-dim)' }}> · 티켓은 각자 예매해요</span>
          </dd>
          {event.detailUrl && (
            <>
              <dt>원문</dt>
              <dd>
                <a href={event.detailUrl} target="_blank" rel="noreferrer" className="mv-link">
                  행사 정보 원문 보기
                </a>
              </dd>
            </>
          )}
        </dl>
      </section>
    </div>
  )
}

export default Detail
