// 홈.
//
// 히어로 문구를 걸지 않는다. 서비스 설명은 한 번 읽으면 그만이고, 매번 화면 위쪽을
// 차지하면 정작 볼 것(오늘 열려 있는 행사)이 아래로 밀린다.
// 대신 날짜 마스트헤드로 지금 상태를 알려주고 바로 추천으로 들어간다.
//
// 추천은 첫 항목만 크게 펼친다. 넷을 같은 크기로 늘어놓으면 순위가 있다는 게 안 보인다.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Masthead from '../components/common/Masthead'
import SectionHead from '../components/common/SectionHead'
import EmptyState from '../components/common/EmptyState'
import Poster from '../components/common/Poster'
import Status from '../components/common/Status'
import EventRow from '../components/event/EventRow'
import ReasonLine from '../components/event/ReasonLine'
import MeetingRow from '../components/meeting/MeetingRow'
import { fetchRecommendedEvents } from '../data/events'
import { fetchMeetings } from '../data/meetings'
import { eventTimingBadge, formatEventPeriod, todayLabel } from '../utils/formatEventDate'

function Home() {
  const [recommended, setRecommended] = useState([])
  const [isColdStart, setColdStart] = useState(false)
  const [upcoming, setUpcoming] = useState([])
  const [openCount, setOpenCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchRecommendedEvents({ limit: 5 }), fetchMeetings({ status: 'recruit' })])
      .then(([rec, meet]) => {
        if (cancelled) return
        setRecommended(rec.items)
        setColdStart(rec.isColdStart)
        setOpenCount(rec.totalOpenEvents ?? null)
        setUpcoming(meet.groups.flatMap((g) => g.meetings).slice(0, 4))
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
  }, [])

  const [lead, ...rest] = recommended

  return (
    <div>
      <Masthead title={todayLabel()} aside={openCount === null ? '' : `열려 있는 행사 ${openCount}`} />

      {error && (
        <p className="mv-note mv-note--dim mv-meta mb-4">{error}</p>
      )}

      {/* ── 추천 ── */}
      <section className="mv-section">
        <SectionHead
          label="추천 행사"
          action={
            <Link to="/event" className="mv-link mv-micro">
              행사 전체
            </Link>
          }
        />

        {isColdStart && (
          <p className="mv-note mv-note--accent mv-meta my-3">
            아직 참여 이력이 없어 이력·친구 가중치를 빼고 취향·지역·시간만으로 계산했습니다.
          </p>
        )}

        {loading ? (
          <div className="mv-skeleton mt-3" style={{ height: 290 }} />
        ) : recommended.length === 0 ? (
          <EmptyState
            title="아직 추천할 행사가 없습니다"
            description="취향을 알려주시면 첫날부터 순서를 매겨 보여드립니다."
            action={
              <Link to="/event" className="mv-btn">
                행사 둘러보기
              </Link>
            }
          />
        ) : (
          <>
            {/* 1위는 포스터를 크게 펼친다 — 순위가 있다는 걸 레이아웃으로 말한다 */}
            <Link to={`/event/${lead.event._id}`} className="mv-feature">
              <Poster src={lead.event.posterUrl} category={lead.event.category} title={lead.event.title} />
              <div>
                <p className="mv-meta mv-dotsep mb-0">
                  <span className="mv-tag">{lead.event.category}</span>
                  {eventTimingBadge(lead.event.startAt, lead.event.endAt) && (
                    <Status>{eventTimingBadge(lead.event.startAt, lead.event.endAt).label}</Status>
                  )}
                </p>
                <h3 className="mv-feature__title">{lead.event.title}</h3>
                <p className="mv-meta mv-dotsep mb-3">
                  <span className="mv-num">{formatEventPeriod(lead.event.startAt, lead.event.endAt)}</span>
                  <span>{lead.event.venue}</span>
                  <span>{lead.event.area}</span>
                </p>
                <ReasonLine reasons={lead.reasons} max={4} />
                <p className="mv-meta mv-dotsep mt-3 mb-0">
                  <span className="mv-num">모임 {lead.openMeetingCount}</span>
                  <span className="mv-num">감상 {lead.event.impressionCount ?? 0}</span>
                </p>
              </div>
            </Link>

            <ul className="mv-list">
              {rest.map((item) => (
                <EventRow key={item.event._id} event={item.event} reasons={item.reasons} />
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ── 곧 열리는 모임 ── */}
      <section className="mv-section">
        <SectionHead
          label="곧 열리는 모임"
          action={
            <Link to="/meeting" className="mv-link mv-micro">
              모임 전체
            </Link>
          }
        />

        {loading ? (
          <div className="mv-skeleton mt-3" style={{ height: 180 }} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="열려 있는 모임이 없습니다"
            description="행사를 고르면 거기서 첫 모임을 만들 수 있습니다."
            action={
              <Link to="/event" className="mv-btn">
                행사 고르기
              </Link>
            }
          />
        ) : (
          <ul className="mv-list">
            {upcoming.map((meeting) => (
              <MeetingRow key={meeting._id} meeting={meeting} showEvent />
            ))}
          </ul>
        )}
      </section>

      {/* ── 한 바퀴 ── */}
      <section className="mv-section">
        <SectionHead label="모여봄은 한 바퀴를 돕니다" />
        <ol className="mv-steps mt-2">
          <li>
            <strong>행사를 고른다</strong>
            <span>제목 · 날짜 · 장소가 이미 채워져 있습니다</span>
          </li>
          <li>
            <strong>관람하고 모인다</strong>
            <span>같은 걸 방금 본 사람끼리, 한 번</span>
          </li>
          <li>
            <strong>감상을 남긴다</strong>
            <span>행사 페이지에 쌓여 다음 사람에게 보입니다</span>
          </li>
          <li>
            <strong>또 보고 싶은 사람만 친구가 된다</strong>
            <span>양쪽이 서로를 골랐을 때만</span>
          </li>
        </ol>
      </section>
    </div>
  )
}

export default Home
