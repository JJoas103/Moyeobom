// 모임 만들기.
//
// 게시판과 다른 지점 하나가 여기서 드러난다 — **입력이 아니라 선택이다.**
// 왼쪽은 행사에서 따라온 것이고(고칠 수 없다), 오른쪽만 사람이 채운다.
// 그 대비를 색면이 아니라 패널과 레이블로 만든다.
//
// 오른쪽은 시안 v2 를 따라 세 묶음이다.
//   이야기 자리           언제 만나 언제 헤어지는지, 어디서
//   신청 전에 공개할 조건   술·예산·정원 — 신청하기 전에 알아야 결정할 수 있는 것
//   관람도 함께 (선택)     관람부터 같이 갈지. 이미 본 사람도 들어올 수 있게 선택으로 둔다
//
// 목업 단계라 저장은 하지 않는다. 채워지는 동선만 확인한다.

import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import EmptyState from '../../components/common/EmptyState'
import { fetchEvent } from '../../data/events'
import { expectedEndLabel, formatEventPeriodFull, toTimeInput } from '../../utils/formatEventDate'

const BUDGETS = ['1만 원 이하', '1~2만 원', '2~3만 원', '3만 원 이상']

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
  // 시안 v2 에서 들어온 것들 — 신청 전에 공개되는 조건
  const [endAt, setEndAt] = useState('')
  const [place, setPlace] = useState('')
  const [drinking, setDrinking] = useState('없음')
  const [budget, setBudget] = useState('1~2만 원')
  const [withViewing, setWithViewing] = useState(false)
  const [viewingSpot, setViewingSpot] = useState('')
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
        const start = suggestMeetTime(res.event)
        setMeetAt(toLocalInput(start))
        // 이야기 자리는 보통 한 시간 반. 신청 전에 공개되므로 기본값을 넣어 둔다
        setEndAt(toTimeInput(new Date(start.getTime() + 90 * 60 * 1000)))
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

      <header className="mv-headline mb-4">
        <h1 className="mv-display">모임 만들기</h1>
      </header>

      <div className="row g-5">
        {/* ── 자동으로 채워진 것 ── */}
        <div className="col-12 col-lg-5">
          <div className="mv-panel">
            <div className="d-flex justify-content-between align-items-baseline mb-3">
              <p className="mv-label mb-0">행사에서 가져온 정보</p>
              <span className="mv-micro">입력 불필요</span>
            </div>

            <div className="d-flex gap-3 mb-4">
              <div style={{ width: 72, flexShrink: 0 }}>
                <Poster src={event.posterUrl} category={event.category} title={event.title} />
              </div>
              <div className="min-width-0">
                <p className="mv-micro mb-1">
                  {event.category}
                  {event.isSeries && ' · 회차형'}
                </p>
                <p className="mb-0" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>
                  {event.title}
                </p>
              </div>
            </div>

            <dl className="mv-dl mb-0" style={{ borderTop: '1px solid var(--rule)', paddingTop: 16 }}>
              <dt>기간</dt>
              <dd className="mv-num">{formatEventPeriodFull(event.startAt, event.endAt)}</dd>
              {event.schedule && (
                <>
                  <dt>회차</dt>
                  <dd className="mv-num">{event.schedule}</dd>
                  <dt>예상 종료</dt>
                  <dd className="mv-num">{expectedEndLabel(event)}</dd>
                </>
              )}
              <dt>장소</dt>
              <dd>{event.venue}</dd>
              <dt>지역</dt>
              <dd>{event.area}</dd>
              <dt>요금</dt>
              <dd>{event.price || '무료'}</dd>
            </dl>
          </div>

          <p className="mv-help mt-2 mb-0">공공데이터에서 가져온 정보라 여기서는 고칠 수 없어요.</p>
        </div>

        {/* ── 사람이 쓰는 것 ── */}
        <div className="col-12 col-lg-7">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setSubmitted(true)
            }}
          >
            <div
              className="d-flex justify-content-between align-items-baseline pb-2 mb-4"
              style={{ borderBottom: '1px solid var(--rule)' }}
            >
              <p className="mv-label mb-0" style={{ color: 'var(--ink)' }}>
                여기만 채우면 됩니다
              </p>
              <span className="mv-micro mv-num">필수 4 · 선택 1</span>
            </div>

            <div className="mv-field">
              <label htmlFor="mtg-title">모임 제목</label>
              <input
                id="mtg-title"
                type="text"
                className="mv-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={40}
                required
              />
              <p className="mv-help text-end mv-num">{title.length} / 40</p>
            </div>

            <div className="mv-field">
              <label htmlFor="mtg-content">한두 줄 소개</label>
              <textarea
                id="mtg-content"
                className="mv-textarea"
                placeholder="예: 각자 보고 끝나고 얘기만 해요. 처음 오셔도 괜찮아요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={200}
              />
              <p className="mv-help text-end mv-num">{content.length} / 200</p>
            </div>

            {/* ── 이야기 자리 ── */}
            <fieldset className="mv-group">
              <legend className="mv-group__title">이야기 자리</legend>

              <div className="row g-4">
                <div className="col-12 col-sm-7">
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
                    <p className="mv-help">관람이 끝날 즈음으로 제안해 두었어요.</p>
                  </div>
                </div>
                <div className="col-12 col-sm-5">
                  <div className="mv-field">
                    <label htmlFor="mtg-end">종료 예정 시각</label>
                    <input
                      id="mtg-end"
                      type="time"
                      className="mv-input mv-num"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                    />
                    <p className="mv-help">신청 전에 공개돼요.</p>
                  </div>
                </div>
              </div>

              <div className="mv-field mb-0">
                <label htmlFor="mtg-place">장소</label>
                <input
                  id="mtg-place"
                  type="text"
                  className="mv-input"
                  placeholder="가게 이름이나 주소"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                />
                <p className="mv-help">
                  정확한 장소는 승인된 참여자에게만 보여요. 목록에는 ‘{nearLabel(place, event)}’로 표시돼요.
                </p>
              </div>
            </fieldset>

            {/* ── 신청 전에 공개할 조건 ──
                신청하기 전에 알아야 결정할 수 있는 것들이다. */}
            <fieldset className="mv-group">
              <legend className="mv-group__title">신청 전에 공개할 조건</legend>

              <div className="row g-4">
                <div className="col-12 col-sm-4">
                  <div className="mv-field mb-0">
                    <span className="mv-field__label">술</span>
                    <div className="mv-choice" role="radiogroup" aria-label="술">
                      {['없음', '있음'].map((v) => (
                        <label key={v} className="mv-choice__item" data-on={drinking === v}>
                          <input
                            type="radio"
                            name="drink"
                            checked={drinking === v}
                            onChange={() => setDrinking(v)}
                          />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="mv-field mb-0">
                    <label htmlFor="mtg-budget">대략 예산</label>
                    <select
                      id="mtg-budget"
                      className="mv-input"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                    >
                      {BUDGETS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="col-6 col-sm-4">
                  <div className="mv-field mb-0">
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
                    <p className="mv-help">신청을 받고 호스트가 승인해요.</p>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ── 관람도 함께 (선택) ──
                이야기 자리를 기본으로 두고 관람 동행은 선택으로 둔다.
                이미 본 사람도 들어올 수 있어야 하기 때문이다. */}
            <fieldset className="mv-fieldset mb-4">
              <legend>
                관람도 함께{' '}
                <span className="mv-micro" style={{ fontWeight: 500 }}>
                  선택
                </span>
              </legend>

              <label className="d-flex align-items-center gap-2" style={{ fontSize: 15 }}>
                <input
                  type="checkbox"
                  checked={withViewing}
                  onChange={(e) => setWithViewing(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--ink)' }}
                />
                관람부터 함께할 사람도 받을게요
              </label>

              {withViewing && (
                <div className="row g-4 mt-1">
                  {event.schedule && (
                    <div className="col-12 col-sm-6">
                      <div className="mv-field mb-0">
                        <label htmlFor="mtg-round">관람 회차</label>
                        <select id="mtg-round" className="mv-input mv-num">
                          <option>{event.schedule}</option>
                        </select>
                      </div>
                    </div>
                  )}
                  <div className={event.schedule ? 'col-12 col-sm-6' : 'col-12'}>
                    <div className="mv-field mb-0">
                      <label htmlFor="mtg-spot">만나는 곳</label>
                      <input
                        id="mtg-spot"
                        type="text"
                        className="mv-input"
                        placeholder="예: 공연장 로비"
                        value={viewingSpot}
                        onChange={(e) => setViewingSpot(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="mv-help mt-3 mb-0">
                티켓은 각자 예매해요. 이미 본 사람은 이야기 자리만 신청할 수 있어요.
              </p>
            </fieldset>

            {submitted && (
              <p className="mv-note mv-note--accent mv-meta mb-4">
                화면 확인용입니다. 서버 저장은 다음 단계에서 붙입니다.
              </p>
            )}

            <div className="d-flex gap-2 align-items-center flex-wrap">
              <button type="submit" className="mv-btn">
                모임 만들기
              </button>
              <button type="button" className="mv-btn mv-btn--ghost" onClick={() => navigate(-1)}>
                취소
              </button>
              <span className="mv-help ms-2 mb-0">만들면 모임 채팅방이 자동으로 열려요.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 목록에 보이는 대략 위치.
//
// 정확한 장소는 승인된 참여자에게만 보이므로, 입력한 장소에서 앞부분만 떼어
// "혜화역 근처" 처럼 만든다. 아직 아무것도 안 썼으면 행사 지역으로 대신한다.
function nearLabel(place, event) {
  const first = (place || '').trim().split(/[\s,]+/)[0]
  if (first) return `${first} 근처`
  return `${event.area || '행사장'} 근처`
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
