// 모임 만들기.
//
// 게시판과 다른 지점 하나가 여기서 드러난다 — **입력이 아니라 선택이다.**
// 행사를 고르면 제목·날짜·장소·좌표·요금이 이미 채워져 있고, 사람이 쓰는 건 두세 칸뿐이다.
// 빈 칸에 글을 쓰는 게시판과 개설 비용이 다르다는 걸 화면으로 보여주는 자리다.
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
        // 행사에서 따라오는 값으로 기본 제목을 채워 둔다. 그대로 써도 되고 고쳐도 된다.
        setTitle(`${res.event.title} 보고 이야기해요`)
        const start = new Date(res.event.startAt)
        start.setHours(start.getHours() + 2)
        setMeetAt(toLocalInput(start))
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
        emoji="🎫"
        title="먼저 행사를 고르세요"
        description={'모여봄의 모임은 항상 행사에서 시작합니다.\n행사를 고르면 제목·날짜·장소가 자동으로 채워집니다.'}
        action={
          <Link to="/event" className="btn btn-brand">
            행사 탐색으로
          </Link>
        }
      />
    )
  }

  if (loading) return <div className="text-center text-muted py-5">불러오는 중...</div>

  if (error || !event) {
    return (
      <EmptyState
        emoji="😶"
        title={error || '행사를 찾을 수 없습니다'}
        action={
          <Link to="/event" className="btn btn-outline-brand">
            행사 목록으로
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <nav className="small mb-3">
        <Link to={`/event/${event._id}`} className="text-decoration-none text-muted">
          ← {event.title}
        </Link>
      </nav>

      <h1 className="h4 mb-3">모임 만들기</h1>

      <div className="row g-4">
        {/* ── 자동으로 채워진 것 ── */}
        <div className="col-12 col-lg-5">
          <section className="card p-3 prefilled">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="small fw-semibold">행사에서 자동으로 채워진 정보</span>
              <span className="chip chip-green">입력 불필요</span>
            </div>

            <div className="d-flex gap-3 mb-3">
              <div style={{ width: 72, flexShrink: 0 }}>
                <Poster src={event.posterUrl} category={event.category} alt={event.title} ratio="1 / 1" rounded="all" />
              </div>
              <div className="min-width-0">
                <div className="small" style={{ color: 'var(--brand)' }}>
                  {event.category}
                </div>
                <div className="fw-semibold">{event.title}</div>
              </div>
            </div>

            <dl className="event-meta mb-0">
              <dt>기간</dt>
              <dd>{formatEventPeriodFull(event.startAt, event.endAt)}</dd>
              <dt>장소</dt>
              <dd>{event.venue}</dd>
              <dt>주소</dt>
              <dd className="text-muted">{event.address}</dd>
              <dt>지역</dt>
              <dd>{event.area}</dd>
              <dt>좌표</dt>
              <dd className="text-muted">
                {event.coords?.lat?.toFixed(4)}, {event.coords?.lng?.toFixed(4)}
              </dd>
              <dt>요금</dt>
              <dd>{event.price || '무료'}</dd>
            </dl>
          </section>
        </div>

        {/* ── 사람이 쓰는 것 ── */}
        <div className="col-12 col-lg-7">
          <form
            className="card p-4"
            onSubmit={(e) => {
              e.preventDefault()
              setSubmitted(true)
            }}
          >
            <div className="small fw-semibold mb-3">여기만 채우면 됩니다</div>

            <div className="mb-3">
              <label className="form-label small" htmlFor="mtg-title">
                모임 제목
              </label>
              <input
                id="mtg-title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label small" htmlFor="mtg-content">
                한두 줄 소개
              </label>
              <textarea
                id="mtg-content"
                className="form-control"
                rows={3}
                placeholder="관람만 따로 하고 끝나고 이야기만 함께해요. 처음 오셔도 괜찮습니다."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={200}
              />
              <div className="form-text text-end">{content.length} / 200</div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-7">
                <label className="form-label small" htmlFor="mtg-when">
                  만나는 시각
                </label>
                <input
                  id="mtg-when"
                  type="datetime-local"
                  className="form-control"
                  value={meetAt}
                  onChange={(e) => setMeetAt(e.target.value)}
                  required
                />
                <div className="form-text">관람이 끝나는 시각 근처로 제안해 두었습니다.</div>
              </div>
              <div className="col-5">
                <label className="form-label small" htmlFor="mtg-max">
                  정원
                </label>
                <select
                  id="mtg-max"
                  className="form-select"
                  value={maxParticipants}
                  onChange={(e) => setMax(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}명
                    </option>
                  ))}
                </select>
                <div className="form-text">선착순입니다.</div>
              </div>
            </div>

            {submitted && (
              <div className="alert alert-success small">
                화면 확인용입니다. 서버 저장은 다음 단계에서 붙입니다.
              </div>
            )}

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-brand">
                모임 만들기
              </button>
              <button type="button" className="btn btn-outline-brand" onClick={() => navigate(-1)}>
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// <input type="datetime-local"> 은 로컬 시간 문자열을 요구한다 (toISOString은 UTC라 어긋난다)
function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default New
