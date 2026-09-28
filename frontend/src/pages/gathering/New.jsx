// 모임 만들기.
//
// 게시판과 다른 지점 하나가 여기서 드러난다 — **입력이 아니라 선택이다.**
// 행사를 고르면 제목·날짜·장소·좌표·요금이 이미 채워져 있고, 사람이 쓰는 건 세 칸뿐이다.
// 그 대비를 색면이 아니라 괘선과 레이블로 만든다.
//
// 목업 단계라 저장은 하지 않는다. 채워지는 동선만 확인한다.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import EmptyState from '../../components/common/EmptyState'
import { fetchEvent } from '../../data/events'
import { formatEventPeriodFull } from '../../utils/formatEventDate'

function New() {
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('event')
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(Boolean(eventId))
  const [error, setError] = useState(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [maxParticipants, setMax] = useState(4)
  const [meetAt, setMeetAt] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (!eventId) return
    let cancelled = false

    fetchEvent(eventId)
      .then((res) => {
        if (cancelled) return
        setEvent(res.event)
        // 행사에서 따라오는 값으로 기본 제목을 채워 둔다. 그대로 써도 되고 고쳐도 된다
        setTitle(`${res.event.title} 보고 이야기해요`)
        setMeetAt(toLocalInput(suggestMeetTime(res.event)))
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
  }, [eventId])

  if (!eventId) {
    return (
      <EmptyState
        title="먼저 행사를 고르세요"
        description={
          '모여봄의 모임은 항상 행사에서 시작합니다.\n행사를 고르면 제목 · 날짜 · 장소가 자동으로 채워집니다.'
        }
        action={
          <Link to="/event" className="mv-btn">
            행사 탐색으로
          </Link>
        }
      />
    )
  }

  if (loading) return <div className="mv-skeleton mt-5" style={{ height: 340 }} />

  if (error || !event) {
    return (
      <EmptyState
        title={error || '행사를 찾을 수 없습니다'}
        action={
          <Link to="/event" className="mv-btn mv-btn--ghost">
            행사 목록으로
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <nav className="pt-4 pb-3">
        <Link to={`/event/${event._id}`} className="mv-micro" style={{ color: 'var(--ink-dim)', textDecoration: 'none' }}>
          ← {event.title}
        </Link>
      </nav>

      <header className="mv-masthead">
        <h1 className="mv-display">모임 만들기</h1>
      </header>

      <div className="row g-5">
        {/* ── 자동으로 채워진 것 ── */}
        <div className="col-12 col-lg-5">
          <div className="d-flex justify-content-between align-items-baseline pb-2 mb-3" style={{ borderBottom: '1px solid var(--rule-strong)' }}>
            <p className="mv-label mb-0">행사에서 가져온 정보</p>
            <span className="mv-micro">입력 불필요</span>
          </div>

          <div className="d-flex gap-3 mb-4">
            <div style={{ width: 72, flexShrink: 0 }}>
              <Poster src={event.posterUrl} category={event.category} title={event.title} />
            </div>
            <div className="min-width-0">
              <p className="mv-micro mb-1">{event.category}</p>
              <p className="mb-0" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>
                {event.title}
              </p>
            </div>
          </div>

          <dl className="mv-dl">
            <dt>기간</dt>
            <dd className="mv-num">{formatEventPeriodFull(event.startAt, event.endAt)}</dd>
            <dt>장소</dt>
            <dd>{event.venue}</dd>
            <dt>주소</dt>
            <dd style={{ color: 'var(--ink-sub)' }}>{event.address}</dd>
            <dt>지역</dt>
            <dd>{event.area}</dd>
            <dt>좌표</dt>
            <dd className="mv-num" style={{ color: 'var(--ink-sub)' }}>
              {event.coords?.lat?.toFixed(4)}, {event.coords?.lng?.toFixed(4)}
            </dd>
            <dt>요금</dt>
            <dd>{event.price || '무료'}</dd>
          </dl>
        </div>

        {/* ── 사람이 쓰는 것 ── */}
        <div className="col-12 col-lg-7">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSubmitted(true)
            }}
          >
            <div className="d-flex justify-content-between align-items-baseline pb-2 mb-4" style={{ borderBottom: '1px solid var(--ink)' }}>
              <p className="mv-label mb-0" style={{ color: 'var(--ink)' }}>
                여기만 채우면 됩니다
              </p>
              <span className="mv-micro mv-num">3칸</span>
            </div>

            <div className="mv-field">
              <label htmlFor="mtg-title">모임 제목</label>
              <input
                id="mtg-title"
                type="text"
                className="mv-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="mv-field">
              <label htmlFor="mtg-content">한두 줄 소개</label>
              <textarea
                id="mtg-content"
                className="mv-textarea"
                rows={3}
                placeholder="관람만 따로 하고 끝나고 이야기만 함께해요. 처음 오셔도 괜찮습니다."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={200}
              />
              <p className="mv-help text-end mv-num">{content.length} / 200</p>
            </div>

            <div className="row g-4">
              <div className="col-7">
                <div className="mv-field">
                  <label htmlFor="mtg-when">만나는 시각</label>
                  <input
                    id="mtg-when"
                    type="datetime-local"
                    className="mv-input mv-num"
                    value={meetAt}
                    onChange={(e) => setMeetAt(e.target.value)}
                    required
                  />
                  <p className="mv-help">관람이 끝날 즈음으로 제안해 두었습니다.</p>
                </div>
              </div>
              <div className="col-5">
                <div className="mv-field">
                  <label htmlFor="mtg-max">정원</label>
                  <select
                    id="mtg-max"
                    className="mv-input"
                    value={maxParticipants}
                    onChange={(e) => setMax(Number(e.target.value))}
                  >
                    {[2, 3, 4, 5, 6, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}명
                      </option>
                    ))}
                  </select>
                  <p className="mv-help">선착순입니다.</p>
                </div>
              </div>
            </div>

            {submitted && (
              <p className="mv-note mv-note--accent mv-meta mb-4">
                화면 확인용입니다. 서버 저장은 다음 단계에서 붙입니다.
              </p>
            )}

            <div className="d-flex gap-2">
              <button type="submit" className="mv-btn">
                모임 만들기
              </button>
              <button type="button" className="mv-btn mv-btn--ghost" onClick={() => navigate(-1)}>
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 만나는 시각의 기본값.
//
// 서울 문화행사 API 는 공연 시각을 따로 주지 않아 대부분 자정으로 들어온다.
// 그걸 그대로 쓰면 "오전 2시에 만나기"가 제안되므로, 시각이 없는 행사는
// 저녁 7시로 둔다. 시각이 있으면 관람이 끝날 즈음인 두 시간 뒤로 제안한다.
function suggestMeetTime(event) {
  const now = new Date()
  const start = new Date(event.startAt)
  // 이미 시작한 전시라면 오늘 기준으로 잡는다 — 지난 날짜를 제안할 수는 없다
  const base = start < now ? now : start

  const hasTime = start.getHours() !== 0 || start.getMinutes() !== 0
  const suggested = new Date(base)
  if (hasTime) {
    suggested.setHours(suggested.getHours() + 2)
  } else {
    suggested.setHours(19, 0, 0, 0)
  }
  // 그래도 지난 시각이면 다음 날로 민다
  if (suggested < now) suggested.setDate(suggested.getDate() + 1)
  return suggested
}

// <input type="datetime-local"> 은 로컬 시간 문자열을 요구한다 (toISOString은 UTC라 어긋난다)
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default New
