import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiGet, API_BASE_URL } from '../../api'

// views/member/info.ejs 를 옮긴 마이페이지
const BASE_BADGES = [
  { id: 'yeonnam', name: '연남동 정복', emoji: '🌳' },
  { id: 'cafe', name: '카페 탐험가', emoji: '☕' },
  { id: 'first_feed', name: '첫 제보', emoji: '📡' },
  { id: 'seoul', name: '서울 탐험가', emoji: '🏙️' },
  { id: 'districts', name: '25개 구 완주', emoji: '🗺️' },
  { id: 'legend', name: '레전드', emoji: '🌟' },
]

// 원본 getMemberInfo/info.ejs와 동일한 활동 타입 -> 아이콘 매핑
function activityIcon(type) {
  if (type === 'meeting_join') return '🤝'
  if (type === 'meeting_create') return '🆕'
  if (type === 'visit_verify') return '🌳'
  if (type === 'feed_write') return '📡'
  if (type === 'like_received') return '👍'
  if (type === 'comment_write') return '💬'
  return '⭐'
}

// 원본과 동일한 "n일 전 / n시간 전 / n분 전 / 방금 전" 상대 시간 표기
function timeAgoLabel(createdAt) {
  const diff = new Date() - new Date(createdAt)
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}일 전`
  if (hours > 0) return `${hours}시간 전`
  if (mins > 0) return `${mins}분 전`
  return '방금 전'
}

// 원본과 동일하게, 기본 배지 목록 중 획득한 것 + 매너 점수 배지(금/은/동) + 모임 활동 배지를 함께 구성
function buildDisplayBadges(user, meetingCount) {
  const userBadges = user.badges || []
  const display = BASE_BADGES.filter((b) => userBadges.includes(b.id)).map((b) => ({ ...b, earned: true }))

  let mannerBadge = null
  if (user.manner_score >= 100) mannerBadge = { id: 'manner_gold', name: '금배지', emoji: '🥇' }
  else if (user.manner_score >= 90) mannerBadge = { id: 'manner_silver', name: '은배지', emoji: '🥈' }
  else if (user.manner_score >= 80) mannerBadge = { id: 'manner_bronze', name: '동배지', emoji: '🥉' }
  if (mannerBadge) display.push({ ...mannerBadge, earned: true })

  let meetingBadge = null
  if (meetingCount >= 15) meetingBadge = { id: 'meeting_active', name: '활발한 활동', emoji: '🔥' }
  else if (meetingCount >= 10) meetingBadge = { id: 'meeting_steady', name: '성실한 활동', emoji: '🏅' }
  else if (meetingCount >= 7) meetingBadge = { id: 'meeting_consistent', name: '꾸준한 활동', emoji: '🌱' }
  if (meetingBadge) display.push({ ...meetingBadge, earned: true })

  return display
}

function MyPage() {
  const { user } = useAuth()

  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    setLoading(true)

    apiGet('/api/member/info')
      .then((data) => {
        if (!cancelled) setInfo(data)
      })
      .catch((err) => {
        console.warn('마이페이지 정보를 가져오는데 실패했습니다:', err.message)
        if (!cancelled) {
          setInfo({ meetingCount: 0, feedCount: 0, myMeetings: [], myFeeds: [], activities: [], scoreActivities: [] })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) {
    return (
      <div className="text-center py-5">
        <p className="text-muted mb-3">로그인이 필요한 페이지입니다.</p>
        <Link to="/member/login" className="btn btn-brand">
          로그인하러 가기
        </Link>
      </div>
    )
  }

  if (loading || !info) {
    return <div className="text-center text-muted py-5">불러오는 중...</div>
  }

  const { meetingCount, feedCount, myMeetings, myFeeds, activities, scoreActivities } = info
  const displayBadges = buildDisplayBadges(user, meetingCount)

  return (
    <div>
      <div className="card shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row align-items-center g-3">
            <div className="col-md-auto text-center">
              <div className="position-relative d-inline-block">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                  style={{ width: 120, height: 120, fontSize: 48 }}
                >
                  🙂
                </div>
                <span
                  className="position-absolute bottom-0 end-0 bg-white rounded-circle p-1 shadow-sm"
                  style={{ fontSize: 24 }}
                >
                  {user.avatar_emoji}
                </span>
              </div>
            </div>
            <div className="col-md">
              <h4 className="mb-1">{user.nickname}</h4>
              <div className="small text-muted mb-2">
                📍 {user.city} · {user.address || '주소 미설정'}
              </div>
              <div className="d-flex gap-4">
                <div className="text-center">
                  <div className="fw-bold fs-4">{meetingCount}</div>
                  <div className="small text-muted">모임</div>
                </div>
                <div className="text-center">
                  <div className="fw-bold fs-4">{feedCount}</div>
                  <div className="small text-muted">제보</div>
                </div>
              </div>
            </div>
            <div className="col-md-auto">
              <div className="d-flex flex-column gap-2">
                <Link to="/member/modify" className="btn btn-outline-brand btn-sm">
                  회원정보 수정
                </Link>
                <Link to="/member/favorites" className="btn btn-outline-brand btn-sm">
                  ⭐ 찜·알림
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h6 className="card-title mb-3">🤝 내가 참여 중인 모임</h6>
            {myMeetings.length === 0 ? (
              <p className="text-muted mb-0 text-center py-4">참여 중인 모임이 없습니다.</p>
            ) : (
              <div className="row g-3">
                {myMeetings.map((meeting) => (
                  <div key={meeting._id} className="col-md-6">
                    <Link to={`/meeting/info/${meeting._id}`} className="text-decoration-none text-dark">
                      <div className="card h-100 border-0 bg-light">
                        <div className="card-body p-3">
                          <div className="d-flex justify-content-between mb-1">
                            <span className="fw-bold small text-truncate">{meeting.title}</span>
                            <span className="badge bg-white text-success border border-success small">
                              {meeting.congestionLevel}
                            </span>
                          </div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            📍 {meeting.area} · {new Date(meeting.meetingDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="card shadow-sm">
          <div className="card-body">
            <h6 className="card-title mb-3">📡 내가 작성한 제보</h6>
            {myFeeds.length === 0 ? (
              <p className="text-muted mb-0 text-center py-4">작성한 제보가 없습니다.</p>
            ) : (
              <div className="row g-3">
                {myFeeds.map((feed) => (
                  <div key={feed._id} className="col-md-4">
                    <Link to={`/feed/info/${feed._id}`} className="text-decoration-none text-dark">
                      <div className="card h-100 border-0 bg-light overflow-hidden">
                        {feed.image && (
                          <img
                            src={`${API_BASE_URL}/images/upload/${feed.image}`}
                            className="card-img-top"
                            style={{ height: 100, objectFit: 'cover' }}
                            alt=""
                          />
                        )}
                        <div className="card-body p-2">
                          <p className="small text-truncate mb-1">{feed.content}</p>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            📍 {feed.locationTag}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title mb-3">⭐ 매너 점수</h6>
              <div className="d-flex justify-content-between align-items-end mb-2">
                <div>
                  <h1 className="mb-0 text-success">{user.manner_score.toFixed(1)}</h1>
                  <div className="small text-muted">
                    {user.manner_score >= 80
                      ? '상위 5% · 매너왕'
                      : user.manner_score >= 60
                        ? '상위 15% · 우수 활동자'
                        : '일반 등급'}
                  </div>
                </div>
                <span className="chip chip-green">점수 현황</span>
              </div>
              <div className="manner-bar-bg mt-3 mb-4">
                <div className="manner-bar-fill" style={{ width: `${user.manner_score}%` }}></div>
              </div>

              <div className="mt-4">
                <h6 className="small fw-bold text-muted mb-2">최근 점수 변동</h6>
                <ul className="list-group list-group-flush">
                  {scoreActivities.length === 0 ? (
                    <li className="list-group-item px-0 py-2 text-center text-muted small">
                      점수 변동 내역이 없습니다.
                    </li>
                  ) : (
                    scoreActivities.map((item) => (
                      <li
                        key={item._id}
                        className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center"
                        style={{ fontSize: 13 }}
                      >
                        <span className="text-truncate" style={{ maxWidth: '70%' }}>
                          {item.message}
                        </span>
                        <span className={`fw-bold ${item.scoreChange > 0 ? 'text-success' : 'text-danger'}`}>
                          {item.scoreChange > 0 ? '+' : ''}
                          {item.scoreChange}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h6 className="card-title mb-3">📍 최근 활동</h6>
              <ul className="list-group list-group-flush">
                {activities.length === 0 ? (
                  <li className="list-group-item px-0 text-center py-4 text-muted small">최근 활동이 없습니다.</li>
                ) : (
                  activities.map((activity) => (
                    <li key={activity._id} className="list-group-item px-0 d-flex align-items-center gap-2">
                      <span style={{ fontSize: 20 }}>{activityIcon(activity.type)}</span>
                      <div className="flex-grow-1">
                        <div className="fw-bold small">
                          {activity.relatedLink ? (
                            <Link to={activity.relatedLink} className="text-decoration-none text-dark">
                              {activity.message}
                            </Link>
                          ) : (
                            activity.message
                          )}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                          {timeAgoLabel(activity.createdAt)}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h6 className="card-title mb-3">🏅 획득 배지</h6>
          {displayBadges.length === 0 ? (
            <p className="text-muted small mb-0 text-center py-4">
              아직 획득한 배지가 없습니다. 활동을 통해 배지를 모아보세요!
            </p>
          ) : (
            <div className="badge-grid d-flex flex-wrap gap-3 justify-content-start text-center">
              {displayBadges.map((badge) => (
                <div key={badge.id} className="badge-item earned" style={{ width: 80, flexShrink: 0 }}>
                  <div className="badge-emoji mb-1" style={{ fontSize: 32 }}>
                    {badge.emoji}
                  </div>
                  <div className="badge-name small text-muted" style={{ fontSize: 11 }}>
                    {badge.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="text-end">
        <Link to="/member/delete" className="small text-muted text-decoration-none">
          회원 탈퇴
        </Link>
      </div>
    </div>
  )
}

export default MyPage
