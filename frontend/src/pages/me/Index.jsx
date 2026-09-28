// 내 기록.
//
// 한 바퀴가 돌고 나서 남는 것들이다 — 참여한 모임, 남긴 감상, 그리고 친구.
// 모임은 일회성이지만 기록과 관계는 남는다는 것이 이 화면의 주장이다.
//
// 평가 대기 중인 모임을 맨 위에 둔다. "또 보고 싶어요"가 시작되는 자리이고,
// 마감이 72시간이라 놓치면 관계가 성립할 기회 자체가 사라진다.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Masthead from '../../components/common/Masthead'
import Poster from '../../components/common/Poster'
import EmptyState from '../../components/common/EmptyState'
import Status from '../../components/common/Status'
import { ME, fetchFriends, fetchMyEvents, fetchMyImpressions } from '../../data/me'
import { formatEventPeriod, formatMeetingDateLines } from '../../utils/formatEventDate'
import { useAuth } from '../../context/AuthContext'

const TABS = [
  { value: 'events', label: '내 모임' },
  { value: 'impressions', label: '남긴 감상' },
  { value: 'friends', label: '친구' },
]

function hoursLeft(iso) {
  return Math.max(0, Math.floor((new Date(iso) - Date.now()) / (60 * 60 * 1000)))
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
      <Masthead
        title={`${profile.nickname}님의 기록`}
        aside={`매너 ${profile.manner_score} · 모임 ${myEvents.length} · 친구 ${friends.length}`}
      />

      {/* ── 평가 대기 ── */}
      {pending.length > 0 && (
        <section className="mv-note mv-note--accent mb-5">
          <p className="mv-label mb-2" style={{ color: 'var(--accent)' }}>
            좋은 모임이 되셨나요?
          </p>
          {pending.map((p) => (
            <div key={p._id} className="d-flex align-items-baseline gap-3 flex-wrap mb-2">
              <div className="flex-grow-1 min-width-0">
                <p className="mb-0" style={{ fontWeight: 600 }}>
                  {p.meetingTitle}
                </p>
                <p className="mv-meta mb-0 mv-truncate">
                  {p.eventTitle} · {p.others.map((o) => o.nickname).join(', ')}님과 함께
                </p>
              </div>
              <span className="mv-micro mv-num flex-shrink-0">{hoursLeft(p.deadlineAt)}시간 남음</span>
              <Link to={`/meeting/${p._id}`} className="mv-btn mv-btn--sm flex-shrink-0">
                평가하기
              </Link>
            </div>
          ))}
          <p className="mv-help mb-0">
            양쪽이 서로를 골랐을 때만 친구가 됩니다. 한쪽만 고른 건 상대에게 보이지 않습니다.
          </p>
        </section>
      )}

      <div className="mv-tabs mb-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            className="mv-tab"
            aria-current={tab === t.value}
            onClick={() => setSearchParams(t.value === 'events' ? {} : { tab: t.value })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mv-skeleton mt-4" style={{ height: 240 }} />
      ) : (
        <>
          {tab === 'events' &&
            (myEvents.length === 0 ? (
              <EmptyState
                title="아직 참여한 모임이 없습니다"
                description="행사를 고르고 모임에 참여하면 여기에 쌓입니다."
                action={
                  <Link to="/event" className="mv-btn">
                    행사 둘러보기
                  </Link>
                }
              />
            ) : (
              <ul className="mv-list">
                {myEvents.map((item) => (
                  <li key={item.meetingId}>
                    <Link to={`/meeting/${item.meetingId}`} className="mv-row" style={{ gridTemplateColumns: '48px minmax(0,1fr) auto' }}>
                      <div style={{ width: 48 }}>
                        <Poster src={item.event?.posterUrl} category={item.event?.category} alt="" />
                      </div>
                      <div>
                        <p className="mv-micro mb-1 mv-truncate">{item.event?.title}</p>
                        <p className="mv-row__title mb-1">{item.meetingTitle}</p>
                        <p className="mv-meta mb-0 mv-num">
                          {formatMeetingDateLines(item.meetingDate).day}{' '}
                          {formatMeetingDateLines(item.meetingDate).sub}
                        </p>
                      </div>
                      {item.status === 'completed' && <Status tone="done">종료</Status>}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}

          {tab === 'impressions' &&
            (impressions.length === 0 ? (
              <EmptyState
                title="아직 남긴 감상이 없습니다"
                description={
                  '보고 나서 한 줄 남기면 그 행사 페이지에 쌓입니다.\n다음에 그 행사를 볼 사람에게 보입니다.'
                }
              />
            ) : (
              <ul className="mv-list">
                {impressions.map((imp) => (
                  <li key={imp._id} style={{ borderBottom: '1px solid var(--rule)', padding: '18px 0' }}>
                    {imp.event && (
                      <Link to={`/event/${imp.event._id}`} className="mv-meta mv-dotsep d-block mb-1" style={{ color: 'var(--ink-sub)', textDecoration: 'none' }}>
                        <span>{imp.event.title}</span>
                        <span className="mv-num">{formatEventPeriod(imp.event.startAt, imp.event.endAt)}</span>
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
                title="아직 친구가 없습니다"
                description={
                  '모임이 끝나고 서로를 고른 사람끼리만 친구가 됩니다.\n한쪽만 고른 건 상대에게 보이지 않습니다.'
                }
                action={
                  <Link to="/meeting" className="mv-btn">
                    모임 둘러보기
                  </Link>
                }
              />
            ) : (
              <ul className="mv-list">
                {friends.map((f) => (
                  <li
                    key={f._id}
                    className="d-flex align-items-baseline gap-3 flex-wrap"
                    style={{ borderBottom: '1px solid var(--rule)', padding: '18px 0' }}
                  >
                    <div className="flex-grow-1 min-width-0">
                      <p className="mb-0">
                        <span style={{ fontWeight: 600 }}>{f.user.nickname}</span>
                        {f.isNew && (
                          <span className="ms-2">
                            <Status>새 친구</Status>
                          </span>
                        )}
                      </p>
                      <p className="mv-meta mb-0 mv-truncate">
                        {f.sourceEventTitle} 모임에서 만남 · 같이 본 행사 {f.sharedEventCount}개
                      </p>
                    </div>
                    <button type="button" className="mv-btn mv-btn--sm mv-btn--ghost is-disabled" disabled>
                      1:1 대화
                    </button>
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
