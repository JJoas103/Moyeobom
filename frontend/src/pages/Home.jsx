// 홈.
//
// 첫 화면에서 서비스 정의를 먼저 준다 — "이 서비스가 뭔지 모르는 채로 들었다"는 지적이
// 교수님 피드백 [2]였다. 배경 설명은 그 다음이다.
//
// 그 아래는 추천이다. 같은 화면을 열어도 사람마다 목록이 다르고, 카드마다 왜 떴는지가
// 붙는다. 목록만 예쁘게 뿌리면 "목록이냐 지도냐는 표시 방법 차이"라는 지적이 반복된다.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/event/EventCard'
import GatheringCard from '../components/meeting/GatheringCard'
import EmptyState from '../components/common/EmptyState'
import { fetchRecommendedEvents } from '../data/events'
import { fetchMeetings } from '../data/meetings'
import { ME } from '../data/me'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { user } = useAuth()
  const displayName = user?.nickname || ME.nickname

  const [recommended, setRecommended] = useState([])
  const [isColdStart, setColdStart] = useState(false)
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchRecommendedEvents({ limit: 4 }), fetchMeetings({ status: 'recruit' })])
      .then(([rec, meet]) => {
        if (cancelled) return
        setRecommended(rec.items)
        setColdStart(rec.isColdStart)
        // 여러 행사에 걸친 모임을 시간순으로 펴서 앞의 세 개만 보여준다
        setUpcoming(meet.groups.flatMap((g) => g.meetings).slice(0, 3))
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

  return (
    <div>
      {/* ── 서비스 정의 ── */}
      <section className="hero p-4 p-lg-5 mb-4">
        <div className="row align-items-center g-3">
          <div className="col-lg-8">
            <h1 className="h3 h1-lg mb-3">게시판은 글이 남고, 모여봄은 약속이 남습니다</h1>
            <p className="lead mb-3" style={{ color: 'var(--ink-sub)' }}>
              같은 행사를 본 사람과, 여운이 식기 전에, 한 번 모입니다.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <span className="chip chip-brand">행사 단위</span>
              <span className="chip chip-brand">관람 직후</span>
              <span className="chip chip-brand">일회성</span>
            </div>
          </div>
          <div className="col-lg-4 d-none d-lg-block text-center">
            <div style={{ fontSize: 88 }} aria-hidden="true">
              🎟️
            </div>
          </div>
        </div>
      </section>

      {error && <div className="alert alert-warning">{error}</div>}

      {/* ── 추천 ── */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-1 flex-wrap gap-2">
          <h2 className="h5 mb-0">{displayName}님에게 맞는 행사</h2>
          <Link to="/event" className="small text-decoration-none" style={{ color: 'var(--brand)' }}>
            행사 전체 보기 →
          </Link>
        </div>
        <p className="small text-muted mb-3">
          같은 화면이라도 사람마다 순서가 다릅니다. 카드에 왜 떴는지를 함께 표시합니다.
        </p>

        {isColdStart && (
          <div className="alert alert-light border small mb-3">
            아직 참여 이력이 없어 <strong>이력·친구 가중치를 빼고</strong> 취향·지역·시간만으로 계산했습니다.
          </div>
        )}

        {loading ? (
          <div className="row g-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="col-6 col-lg-3">
                <div className="card h-100 skeleton-card" />
              </div>
            ))}
          </div>
        ) : recommended.length === 0 ? (
          <EmptyState
            emoji="🧭"
            title="아직 추천할 행사가 없습니다"
            description={'취향을 알려주시면 첫날부터 순서를 매겨 보여드립니다.'}
            action={
              <Link to="/event" className="btn btn-brand">
                행사 둘러보기
              </Link>
            }
          />
        ) : (
          <div className="row g-3">
            {recommended.map((item) => (
              <div key={item.event._id} className="col-6 col-lg-3">
                <EventCard event={item.event} reasons={item.reasons} score={item.score} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 곧 열리는 모임 ── */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-3 flex-wrap gap-2">
          <h2 className="h5 mb-0">곧 열리는 모임</h2>
          <Link to="/meeting" className="small text-decoration-none" style={{ color: 'var(--brand)' }}>
            모임 전체 보기 →
          </Link>
        </div>

        {loading ? (
          <div className="row g-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="col-12 col-lg-4">
                <div className="card h-100 skeleton-card" style={{ minHeight: 170 }} />
              </div>
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title="열려 있는 모임이 없습니다"
            description={'행사를 고르고 첫 모임을 만들어 보세요.'}
            action={
              <Link to="/event" className="btn btn-brand">
                행사 고르기
              </Link>
            }
          />
        ) : (
          <div className="row g-3">
            {upcoming.map((meeting) => (
              <div key={meeting._id} className="col-12 col-lg-4">
                <GatheringCard meeting={meeting} showEvent />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 한 바퀴 ── */}
      <section className="card p-4 mb-2">
        <h2 className="h6 mb-3">모여봄은 한 바퀴를 돕니다</h2>
        <ol className="loop-steps mb-0">
          <li>
            <strong>행사를 고른다</strong>
            <span>제목·날짜·장소가 이미 채워져 있습니다</span>
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
