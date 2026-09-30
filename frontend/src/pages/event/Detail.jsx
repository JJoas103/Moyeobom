// 행사 상세. 시안 v2.
//
// 교수님이 "지도든 목록이든 데이터는 같다. 그걸 선택했을 때 무엇을 보여줄 것인가"라고
// 물은 자리가 여기다. 목록 화면이 아니라 이 화면이 답이어야 해서 가장 넓게 쓴다.
//
// 본문 + 스티키 사이드바 2단. 사이드바가 "지금 어떤 상태인지"와 주 동작을 한곳에 모아,
// 스크롤을 내리지 않아도 모임을 만들 수 있게 한다.
//
//   1) 표제 — 포스터·기간·장소·회차, 그리고 왜 당신에게 이게 떴는지
//   2) 이 행사로 열린 모임 — 없으면 "첫 모임 만들기"가 크게 뜬다
//   3) 행사 정보 — 훑는 자리가 아니라 확인하는 자리
//   4) 장소 — 지도와 주소
//   5) 비슷한 행사 — 여기서 못 고르면 다음 후보로
//
// 이 화면은 실제 API(/api/recommend/event/:id)를 본다. 응답에 impressions(감상)는
// 없다 — 백엔드에 모델도 라우트도 없고, 시안 v2 에서 감상 섹션도 빠졌다.

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import EmptyState from '../../components/common/EmptyState'
import EventCard from '../../components/event/EventCard'
import EventMeetingCard from '../../components/event/EventMeetingCard'
import EventVenueMap from '../../components/event/EventVenueMap'
import { fetchEvent, fetchSimilarEvents } from '../../data/events'
import { categoryColor, categoryDetail, categoryEng, categoryGroup } from '../../utils/eventCategory'
import {
  eventTimingBadge,
  expectedEndLabel,
  formatEventPeriod,
  formatEventPeriodFull,
  formatMeetingDateLines,
} from '../../utils/formatEventDate'

const TONE_CLASS = {
  now: 'mv-card__status--open',
  soon: 'mv-card__status--soon',
  later: 'mv-card__status--plan',
  ended: 'mv-card__status--closed',
}

// 행사 정보 줄 앞의 선 아이콘. 이모지를 아이콘으로 쓰지 않는다
const ICONS = {
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  moon: <path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  ticket: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
}

function Icon({ name }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-sub)"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  )
}

const KIND_FILTERS = [
  { value: '', label: '전체' },
  { value: 'with', label: '관람부터 함께 가능' },
  { value: 'talk', label: '이야기 자리만' },
]

function Detail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [similar, setSimilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [kind, setKind] = useState('')
  const [onlyOpen, setOnlyOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSimilar([])
    setKind('')
    setOnlyOpen(false)

    fetchEvent(id)
      .then((res) => {
        if (cancelled) return
        setData(res)
        // 비슷한 행사는 본문이 뜬 뒤 따라온다. 이것 때문에 상세가 늦어지면 안 되고,
        // 실패해도 상세는 그대로 보여야 하므로 에러를 위로 던지지 않는다.
        fetchSimilarEvents(res.event)
          .then((list) => {
            if (!cancelled) setSimilar(list)
          })
          .catch(() => {})
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

  // data?.meetings || [] 를 그대로 쓰면 매 렌더 새 배열이라 아래 useMemo 가 무의미해진다
  const meetings = useMemo(() => data?.meetings || [], [data])

  // 조건 칩은 withViewing 을 가진 모임이 있을 때만 쓴다.
  // 실제 API 로 받은 모임에는 이 필드가 없어서(models/Meeting.js 에 없다) 필터를
  // 걸면 항상 0건이 된다.
  const hasKindData = useMemo(() => meetings.some((m) => m.withViewing !== undefined), [meetings])

  const visibleMeetings = useMemo(
    () =>
      meetings.filter((m) => {
        if (onlyOpen && m.status !== 'recruit') return false
        if (!kind || !hasKindData) return true
        return kind === 'with' ? Boolean(m.withViewing) : !m.withViewing
      }),
    [meetings, kind, onlyOpen, hasKindData],
  )

  if (loading) return <div className="mv-skeleton mt-5" style={{ height: 560 }} />

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

  const { event, reasons = [] } = data
  const openMeetings = meetings.filter((m) => m.status !== 'completed')
  // 사이드바의 "가장 빠른 모임" — 아직 안 지난 것 중 가장 이른 것
  const nextMeeting = [...openMeetings].sort(
    (a, b) => new Date(a.meetingDate) - new Date(b.meetingDate),
  )[0]
  const nextLines = nextMeeting ? formatMeetingDateLines(nextMeeting.meetingDate) : null

  const timing = eventTimingBadge(event.startAt, event.endAt)
  const group = categoryGroup(event.category)
  const detail = categoryDetail(event.category)
  const scheduleLine = [event.schedule, event.runtimeMin && `${event.runtimeMin}분`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mv-event-wide">
      <nav className="mv-crumbs" aria-label="현재 위치">
        <Link to="/event">행사</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/event?category=${encodeURIComponent(group)}`}>{group}</Link>
        {detail && (
          <>
            <span aria-hidden="true">›</span>
            <span>{detail}</span>
          </>
        )}
      </nav>

      <div className="mv-detail">
        <div className="mv-detail__main">
          {/* ── 표제 ── */}
          <section className="mv-hero">
            <div className="mv-hero__poster">
              <Poster
                src={event.posterUrl}
                category={event.category}
                title={event.title}
                overlay={
                  <span className="mv-card__overlay">
                    <span className="mv-card__eng">{categoryEng(event.category)}</span>
                    <span className="mv-card__postertitle mv-card__postertitle--lg">
                      {event.title}
                    </span>
                  </span>
                }
              />
              <span className="mv-card__badge">
                <span className="mv-card__dot" style={{ background: categoryColor(group) }} />
                {group}
              </span>
            </div>

            <div className="mv-hero__body">
              <p className="mv-hero__chips">
                {timing && (
                  <span className={`mv-card__status ${TONE_CLASS[timing.tone]}`}>
                    {timing.label}
                  </span>
                )}
                <span className="mv-tag">{detail ? `${group} · ${detail}` : group}</span>
                {event.isSeries && <span className="mv-tag">회차형</span>}
              </p>

              <h1 className="mv-title mb-0">{event.title}</h1>

              <div className="mv-hero__lines">
                <span className="mv-num">
                  {formatEventPeriodFull(event.startAt, event.endAt)}
                  {event.venue && ` · ${event.venue}`}
                </span>
                {scheduleLine && <span className="mv-num">{scheduleLine}</span>}
              </div>

              {reasons.length > 0 && (
                <div className="mv-reason-card">
                  <span className="mv-reason-card__label">추천 이유</span>
                  {reasons.slice(0, 5).map((r, i) => (
                    // 서버는 { factor, label, detail }, 목업은 { kind, text } 로 준다
                    <span key={r.factor || r.kind || i}>
                      <strong>{r.label || r.kind}</strong> {r.detail || r.text}
                    </span>
                  ))}
                </div>
              )}

              <div className="mv-hero__foot">
                {event.organizer && (
                  <span className="mv-help">행사 정보 출처 · {event.organizer}</span>
                )}
                {event.detailUrl && (
                  <a className="mv-btn--line" href={event.detailUrl} target="_blank" rel="noreferrer">
                    행사 원문 보기
                    <ExternalIcon />
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── 이 행사로 열린 모임 ── */}
          <section>
            <div className="mv-h2">
              <h2>이 행사로 열린 모임</h2>
              <span className="mv-h2__count mv-num">{meetings.length}</span>
              <span className="mv-h2__gap" />
              {meetings.length > 0 && (
                <Link className="mv-h2__action" to={`/meeting?event=${event._id}`}>
                  모임 {meetings.length}개 모두 보기 ›
                </Link>
              )}
            </div>

            {meetings.length > 0 && (
              <div className="mv-chip-row mv-chip-row--tight">
                {hasKindData &&
                  KIND_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      className={kind === f.value ? 'mv-chip mv-chip--on' : 'mv-chip'}
                      aria-pressed={kind === f.value}
                      onClick={() => setKind(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}

                <span className="mv-filters__gap" />

                <button
                  type="button"
                  className="mv-switchlabel"
                  role="switch"
                  aria-checked={onlyOpen}
                  onClick={() => setOnlyOpen((v) => !v)}
                >
                  모집 중만 보기
                  <span
                    className={onlyOpen ? 'mv-switch mv-switch--on' : 'mv-switch'}
                    aria-hidden="true"
                  >
                    <span className="mv-switch__knob" />
                  </span>
                </button>
              </div>
            )}

            {meetings.length === 0 ? (
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
            ) : visibleMeetings.length === 0 ? (
              <EmptyState title="조건에 맞는 모임이 없습니다" description="필터를 줄여 보세요." />
            ) : (
              <div className="mv-grid--3">
                {visibleMeetings.map((meeting) => (
                  <EventMeetingCard key={meeting._id} meeting={meeting} event={event} />
                ))}
              </div>
            )}
          </section>

          {/* ── 행사 정보 ──
              위 표제는 훑어보는 자리이고 여기는 확인하는 자리다. */}
          <section>
            <div className="mv-h2">
              <h2>행사 정보</h2>
            </div>

            <ul className="mv-info">
              <li>
                <Icon name="tag" />
                <span className="mv-info__key">분류</span>
                <span>{[group, detail, event.isSeries && '회차형'].filter(Boolean).join(' · ')}</span>
              </li>
              <li>
                <Icon name="calendar" />
                <span className="mv-info__key">기간</span>
                <span className="mv-num">{formatEventPeriodFull(event.startAt, event.endAt)}</span>
              </li>
              {event.isSeries && event.schedule && (
                <>
                  <li>
                    <Icon name="clock" />
                    <span className="mv-info__key">회차</span>
                    <span className="mv-num">{scheduleLine}</span>
                  </li>
                  <li>
                    <Icon name="moon" />
                    <span className="mv-info__key">예상 종료</span>
                    <span className="mv-num">
                      {expectedEndLabel(event)}
                      <span className="mv-info__note"> (시작 시각 + 러닝타임 예상값)</span>
                    </span>
                  </li>
                </>
              )}
              <li>
                <Icon name="pin" />
                <span className="mv-info__key">장소</span>
                <span>
                  {event.venue || '—'}
                  {event.area && <span className="mv-info__note"> · {event.area}</span>}
                </span>
              </li>
              <li>
                <Icon name="ticket" />
                <span className="mv-info__key">요금</span>
                <span>
                  {event.price || '무료'}
                  <span className="mv-info__note"> · 티켓은 각자 예매해요</span>
                </span>
              </li>
            </ul>
          </section>

          {/* ── 장소 ── */}
          <section>
            <div className="mv-h2">
              <h2>장소</h2>
            </div>
            <EventVenueMap event={event} />
          </section>

          {/* ── 비슷한 행사 ── */}
          {similar.length > 0 && (
            <section>
              <div className="mv-h2">
                <h2>비슷한 행사</h2>
                <span className="mv-h2__gap" />
                <Link className="mv-h2__action" to="/event">
                  행사 전체 ›
                </Link>
              </div>
              <div className="mv-grid--3">
                {similar.map((e) => (
                  <EventCard key={e._id} event={e} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── 사이드바 ── */}
        <aside className="mv-detail__aside">
          <h2 className="mv-aside__title">{event.title}</h2>
          <span className="mv-meta mv-num">
            {formatEventPeriod(event.startAt, event.endAt)}
            {event.area && ` · ${event.area}`}
          </span>

          <div className="mv-aside__rule" />

          <dl className="mv-aside__dl">
            <dt>열린 모임</dt>
            <dd className="mv-num">{meetings.length}개</dd>
            <dt>지금 모집 중</dt>
            <dd className="mv-num mv-aside__dd--accent">{openMeetings.length}개</dd>
            {nextLines && (
              <>
                <dt>가장 빠른 모임</dt>
                <dd className="mv-num">
                  {nextLines.day} {nextLines.sub}
                </dd>
              </>
            )}
          </dl>

          <div className="mv-aside__actions">
            {/* 찜은 아직 저장되는 곳이 없다. 자리만 잡고 가짜 숫자는 붙이지 않는다 */}
            <button type="button" className="mv-aside__like" aria-label="이 행사 찜하기">
              <HeartIcon />
            </button>
            <Link to={`/meeting/new?event=${event._id}`} className="mv-btn--primary">
              이 행사로 모임 만들기
            </Link>
          </div>

          <span className="mv-help">
            티켓은 각자 예매해요. 모임 참여는 호스트가 승인하면 확정돼요. 이미 본 행사도 괜찮아요.
          </span>
        </aside>
      </div>
    </div>
  )
}

export default Detail
