// 내 기록.
//
// 한 바퀴가 돌고 나서 남는 것들이다 — 본 행사, 남긴 감상, 그리고 친구.
// 모임은 일회성이지만 기록과 관계는 남는다는 것이 이 화면의 주장이다.
//
// 평가 대기 중인 모임을 맨 위에 둔다. "또 보고 싶어요"가 시작되는 자리이고,
// 마감이 72시간이라 놓치면 관계가 성립할 기회 자체가 사라진다.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Poster from '../../components/common/Poster'
import EmptyState from '../../components/common/EmptyState'
import { ME, fetchFriends, fetchMyEvents, fetchMyImpressions } from '../../data/me'
import { formatEventPeriod } from '../../utils/formatEventDate'
import { formatMeetingDate } from '../../utils/formatMeetingDate'
import { useAuth } from '../../context/AuthContext'

const TABS = [
  { value: 'events', label: '내 모임' },
  { value: 'impressions', label: '남긴 감상' },
  { value: 'friends', label: '친구' },
]

function hoursLeft(iso) {
  const diff = new Date(iso) - Date.now()
  return Math.max(0, Math.floor(diff / (60 * 60 * 1000)))
}

function Index() {
  const { user } = useAuth()
  const profile = user || ME

  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === searchParams.get('tab')) ? searchParams.get('tab') : 'events'

  const [myEvents, setMyEvents] = useState([])
  const [impressions, setImpressions] = useState([])
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchMyEvents(), fetchMyImpressions(), fetchFriends()])
      .then(([ev, imp, fr]) => {
        if (cancelled) return
        setMyEvents(ev.items)
        setImpressions(imp.items)
        setFriends(fr.friends)
        setPending(fr.pendingReviews)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      {/* ── 프로필 ── */}
      <section className="hero p-4 mb-4">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div style={{ fontSize: 40 }} aria-hidden="true">
            {profile.avatar_emoji}
          </div>
          <div>
            <h1 className="h5 mb-1">{profile.nickname}님의 기록</h1>
            <div className="small" style={{ color: 'var(--ink-sub)' }}>
              매너 점수 {profile.manner_score} · 참여한 모임 {myEvents.length} · 친구 {friends.length}
            </div>
          </div>
        </div>
      </section>

      {/* ── 평가 대기 ── */}
      {pending.length > 0 && (
        <section className="card p-4 mb-4 pending-review">
          <h2 className="h6 mb-3">좋은 모임이 되셨나요?</h2>
          {pending.map((p) => (
            <div key={p._id} className="d-flex align-items-center gap-3 flex-wrap">
              <div className="flex-grow-1 min-width-0">
                <div className="fw-semibold text-truncate">{p.meetingTitle}</div>
                <div className="small text-muted text-truncate">
                  {p.eventTitle} · {p.others.map((o) => o.nickname).join(', ')}님과 함께
                </div>
              </div>
              <span className="chip chip-yellow flex-shrink-0">{hoursLeft(p.deadlineAt)}시간 남음</span>
              <Link to={`/meeting/${p._id}`} className="btn btn-sm btn-brand flex-shrink-0">
                평가하기
              </Link>
            </div>
          ))}
          <p className="small text-muted mb-0 mt-3">
            양쪽이 서로를 골랐을 때만 친구가 됩니다. 한쪽만 고른 건 상대에게 보이지 않습니다.
          </p>
        </section>
      )}

      {/* ── 탭 ── */}
      <div className="d-flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className={`btn btn-sm ${tab === t.value ? 'btn-brand' : 'btn-outline-brand'}`}
            onClick={() => setSearchParams(t.value === 'events' ? {} : { tab: t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted py-5">불러오는 중...</div>
      ) : (
        <>
          {tab === 'events' &&
            (myEvents.length === 0 ? (
              <EmptyState
                emoji="🎫"
                title="아직 참여한 모임이 없습니다"
                description={'행사를 고르고 모임에 참여하면 여기에 쌓입니다.'}
                action={
                  <Link to="/event" className="btn btn-brand">
                    행사 둘러보기
                  </Link>
                }
              />
            ) : (
              <ul className="record-list">
                {myEvents.map((item) => (
                  <li key={item.meetingId} className="card p-3">
                    <div className="d-flex gap-3">
                      <div style={{ width: 56, flexShrink: 0 }}>
                        <Poster
                          src={item.event?.posterUrl}
                          category={item.event?.category}
                          alt={item.event?.title || ''}
                          ratio="1 / 1"
                          rounded="all"
                        />
                      </div>
                      <div className="min-width-0 flex-grow-1">
                        <div className="small text-muted text-truncate">{item.event?.title}</div>
                        <Link to={`/meeting/${item.meetingId}`} className="fw-semibold text-decoration-none text-dark d-block text-truncate">
                          {item.meetingTitle}
                        </Link>
                        <div className="small text-muted">{formatMeetingDate(item.meetingDate)}</div>
                      </div>
                      {item.status === 'completed' && <span className="chip chip-red flex-shrink-0">종료</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'impressions' &&
            (impressions.length === 0 ? (
              <EmptyState
                emoji="💬"
                title="아직 남긴 감상이 없습니다"
                description={'보고 나서 한 줄 남기면 그 행사 페이지에 쌓입니다.\n다음에 그 행사를 볼 사람에게 보입니다.'}
              />
            ) : (
              <ul className="record-list">
                {impressions.map((imp) => (
                  <li key={imp._id} className="card p-3">
                    {imp.event && (
                      <Link
                        to={`/event/${imp.event._id}`}
                        className="small text-decoration-none d-block mb-1"
                        style={{ color: 'var(--brand)' }}
                      >
                        🎫 {imp.event.title}
                        <span className="text-muted ms-2">
                          {formatEventPeriod(imp.event.startAt, imp.event.endAt)}
                        </span>
                      </Link>
                    )}
                    <p className="mb-0">{imp.text}</p>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'friends' &&
            (friends.length === 0 ? (
              <EmptyState
                emoji="🫱"
                title="아직 친구가 없습니다"
                description={'모임이 끝나고 서로를 고른 사람끼리만 친구가 됩니다.\n한쪽만 고른 건 상대에게 보이지 않습니다.'}
                action={
                  <Link to="/meeting" className="btn btn-brand">
                    모임 둘러보기
                  </Link>
                }
              />
            ) : (
              <ul className="record-list">
                {friends.map((f) => (
                  <li key={f._id} className="card p-3">
                    <div className="d-flex align-items-center gap-3">
                      <span style={{ fontSize: 26 }} aria-hidden="true">
                        {f.user.avatar_emoji}
                      </span>
                      <div className="min-width-0 flex-grow-1">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold">{f.user.nickname}</span>
                          {f.isNew && <span className="chip chip-green">새 친구</span>}
                        </div>
                        <div className="small text-muted text-truncate">
                          {f.sourceEventTitle} 모임에서 만남 · 같이 본 행사 {f.sharedEventCount}개
                        </div>
                      </div>
                      <span className="btn btn-sm btn-outline-brand flex-shrink-0 disabled" aria-disabled="true">
                        1:1 대화
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
        </>
      )}
    </div>
  )
}

export default Index
