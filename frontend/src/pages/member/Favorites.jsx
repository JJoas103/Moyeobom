import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiGet, apiPost, apiPatch, apiDelete, API_BASE_URL } from '../../api'

// views/member/favorites.ejs 를 옮긴 찜한 장소 · 알림 설정 페이지
function congestBadgeClass(level) {
  if (level === '여유') return 'bg-success'
  if (level === '보통') return 'bg-warning'
  return 'bg-danger'
}

function notiTypeBadge(type) {
  if (type === 'like') return <span className="badge bg-success-subtle text-success">추천</span>
  if (type === 'comment') return <span className="badge bg-primary-subtle text-primary">댓글</span>
  return <span className="badge bg-secondary-subtle text-secondary">알림</span>
}

function Favorites() {
  const { user, refreshUser } = useAuth()

  const [places, setPlaces] = useState([])
  const [placesLoading, setPlacesLoading] = useState(true)

  const [notifications, setNotifications] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [notiLoading, setNotiLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState([])

  // views/member/favorites.ejs 의 알림 설정 폼과 동일
  const [congestionAlert, setCongestionAlert] = useState(user?.congestion_alert || 'uncrowded')
  const [notifyStart, setNotifyStart] = useState(user?.notify_start || '08:00')
  const [notifyEnd, setNotifyEnd] = useState(user?.notify_end || '22:00')
  const [alertMeeting, setAlertMeeting] = useState(user?.alert_meeting ?? true)
  const [alertComment, setAlertComment] = useState(user?.alert_comment ?? true)
  const [alertBadge, setAlertBadge] = useState(user?.alert_badge ?? true)
  const [alertMarketing, setAlertMarketing] = useState(user?.alert_marketing ?? false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setPlacesLoading(true)

    apiGet('/api/member/favorites')
      .then((data) => {
        if (!cancelled) setPlaces(data.places)
      })
      .catch(() => {
        if (!cancelled) setPlaces([])
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const refetchPlaces = () => {
    apiGet('/api/member/favorites')
      .then((data) => setPlaces(data.places))
      .catch(() => {})
  }

  const handleDeleteFavorite = async (place) => {
    if (!confirm('찜을 해제하시겠습니까?')) return
    try {
      const result = await apiDelete('/api/member/favorites', { place_id: place.area_cd })
      if (result.success) {
        alert(result.message)
        refetchPlaces()
      }
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setNotiLoading(true)
    setSelectedIds([])

    apiGet('/api/member/notifications', { params: { page: currentPage } })
      .then((data) => {
        if (cancelled) return
        setNotifications(data.notifications)
        setTotalPages(data.totalPages)
      })
      .catch(() => {
        if (!cancelled) setNotifications([])
      })
      .finally(() => {
        if (!cancelled) setNotiLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, currentPage])

  const refetchNotifications = () => {
    apiGet('/api/member/notifications', { params: { page: currentPage } })
      .then((data) => {
        setNotifications(data.notifications)
        setTotalPages(data.totalPages)
        setSelectedIds([])
      })
      .catch(() => {})
  }

  const toggleSelectAll = (e) => {
    setSelectedIds(e.target.checked ? notifications.map((n) => n._id) : [])
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))
  }

  const handleMarkAsRead = async () => {
    if (selectedIds.length === 0) return alert('선택된 알림이 없습니다.')
    try {
      const result = await apiPatch('/api/member/notifications/read', { ids: selectedIds })
      if (result.success) refetchNotifications()
      else alert('처리에 실패했습니다.')
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return alert('선택된 알림이 없습니다.')
    if (!confirm('선택한 알림을 삭제하시겠습니까?')) return
    try {
      const result = await apiDelete('/api/member/notifications', { ids: selectedIds })
      if (result.success) refetchNotifications()
      else alert('삭제에 실패했습니다.')
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDeletePageRead = async () => {
    const readIds = notifications.filter((n) => n.isRead).map((n) => n._id)
    if (readIds.length === 0) return alert('현재 페이지에 읽은 알림이 없습니다.')
    if (!confirm('현재 페이지의 읽은 알림을 모두 삭제하시겠습니까?')) return
    try {
      const result = await apiDelete('/api/member/notifications/read', { ids: readIds })
      if (result.success) refetchNotifications()
      else alert('삭제에 실패했습니다.')
    } catch {
      alert('오류가 발생했습니다.')
    }
  }

  // views/member/favorites.ejs 의 알림 설정 저장(POST /member/notify-settings)과 동일 로직
  const handleSaveNotifySettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const result = await apiPost('/api/member/notify-settings', {
        congestion_alert: congestionAlert,
        notify_start: notifyStart,
        notify_end: notifyEnd,
        alert_meeting: alertMeeting,
        alert_comment: alertComment,
        alert_badge: alertBadge,
        alert_marketing: alertMarketing,
      })
      alert(result.message)
      await refreshUser()
    } catch {
      alert('오류가 발생했습니다.')
    } finally {
      setSavingSettings(false)
    }
  }

  const allSelected = notifications.length > 0 && selectedIds.length === notifications.length

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

  return (
    <div>
      <Link to="/member/info" className="text-decoration-none text-muted small mb-3 d-inline-block">
        ← 마이페이지로
      </Link>

      <h4 className="mb-4">⭐ 찜한 장소 · 알림 설정</h4>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="card-title mb-0">찜한 장소 ({places.length}곳)</h6>
                <small className="text-muted">혼잡도 변화 시 알림</small>
              </div>

              {placesLoading ? (
                <div className="text-center text-muted py-5">불러오는 중...</div>
              ) : places.length > 0 ? (
                <div className="row g-3 mb-4">
                  {places.map((place) => (
                    <div key={place.area_cd} className="col-12">
                      <div className="d-flex align-items-center gap-3 p-3 border rounded bg-white shadow-sm">
                        <div style={{ flexShrink: 0 }}>
                          {place.imageUrl ? (
                            <img
                              src={`${API_BASE_URL}${place.imageUrl}`}
                              alt={place.name}
                              className="rounded"
                              style={{ width: 70, height: 70, objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="rounded d-flex align-items-center justify-content-center bg-light text-muted"
                              style={{ width: 70, height: 70, fontSize: 24 }}
                            >
                              🌳
                            </div>
                          )}
                        </div>

                        <div style={{ width: 140 }}>
                          <div className="fw-bold text-truncate" title={place.name}>
                            {place.name}
                          </div>
                          <div className={`badge ${congestBadgeClass(place.congest_lvl)} mt-1`}>{place.congest_lvl}</div>
                        </div>

                        <div className="flex-grow-1 text-center border-start border-end px-3">
                          <div className="small text-muted mb-1" style={{ fontSize: 11 }}>
                            나의 찜 이유
                          </div>
                          <div className="fw-semibold text-brand text-break">&quot;{place.reason || '좋아하는 장소에요'}&quot;</div>
                        </div>

                        <div className="d-flex flex-column gap-1" style={{ width: 70, flexShrink: 0 }}>
                          <Link to={`/place/${place.area_cd}`} className="btn btn-sm btn-outline-brand">
                            이동
                          </Link>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger w-100"
                            onClick={() => handleDeleteFavorite(place)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  찜 한 장소가 없습니다. <br /> 장소 탐색에서 마음에 드는 곳을 추가해 보세요!
                </div>
              )}

              <div className="text-center mt-3">
                <Link to="/" className="btn btn-outline-brand">
                  + 장소 찜하러 가기
                </Link>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mt-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="card-title mb-0">💬 알림 내역</h6>
                {notifications.length > 0 && (
                  <div className="form-check small">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="selectAllNoti"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                    <label className="form-check-label text-muted" htmlFor="selectAllNoti">
                      전체선택
                    </label>
                  </div>
                )}
              </div>

              {notiLoading ? (
                <div className="text-center text-muted py-5">불러오는 중...</div>
              ) : notifications.length > 0 ? (
                <>
                  <div className="list-group list-group-flush border-top border-bottom mb-3">
                    {notifications.map((noti) => (
                      <div key={noti._id} className={`list-group-item px-0 py-3 ${noti.isRead ? 'opacity-50' : ''}`}>
                        <div className="d-flex align-items-start gap-3">
                          <div className="form-check mt-1">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={selectedIds.includes(noti._id)}
                              onChange={() => toggleSelectOne(noti._id)}
                            />
                          </div>
                          <Link to={noti.relatedLink || '#'} className="text-decoration-none flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  {notiTypeBadge(noti.type)}
                                  <small className="text-muted">{new Date(noti.createdAt).toLocaleString()}</small>
                                  {!noti.isRead && (
                                    <span className="badge bg-danger rounded-pill" style={{ fontSize: 8 }}>
                                      N
                                    </span>
                                  )}
                                </div>
                                <div className="text-dark">{noti.message}</div>
                              </div>
                              <span className="text-muted small">〉</span>
                            </div>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between align-items-start mt-3">
                    <nav aria-label="Notification pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setCurrentPage((p) => p - 1)}>
                            이전
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                            <button type="button" className="page-link" onClick={() => setCurrentPage(p)}>
                              {p}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button type="button" className="page-link" onClick={() => setCurrentPage((p) => p + 1)}>
                            다음
                          </button>
                        </li>
                      </ul>
                    </nav>

                    <div className="d-flex gap-1">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleMarkAsRead}>
                        읽음
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleDeleteSelected}>
                        삭제
                      </button>
                      <button type="button" className="btn btn-sm btn-danger" onClick={handleDeletePageRead}>
                        전체삭제
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">새로운 알림이 없습니다.</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body">
              <h6 className="card-title mb-3">🔔 알림 설정</h6>

              <form onSubmit={handleSaveNotifySettings}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">혼잡도 알림 조건</label>
                  <select
                    className="form-select form-select-sm"
                    value={congestionAlert}
                    onChange={(e) => setCongestionAlert(e.target.value)}
                  >
                    <option value="any">모든 변화 알림</option>
                    <option value="uncrowded">여유 → 한산해졌을 때만</option>
                    <option value="crowded">혼잡 알림만</option>
                    <option value="off">알림 끔</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-bold">알림 시간대</label>
                  <div className="input-group input-group-sm">
                    <input
                      type="time"
                      className="form-control"
                      value={notifyStart}
                      onChange={(e) => setNotifyStart(e.target.value)}
                    />
                    <span className="input-group-text">~</span>
                    <input
                      type="time"
                      className="form-control"
                      value={notifyEnd}
                      onChange={(e) => setNotifyEnd(e.target.value)}
                    />
                  </div>
                </div>

                <hr />

                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="alertMeeting"
                    checked={alertMeeting}
                    onChange={(e) => setAlertMeeting(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="alertMeeting">
                    내 모임 참여 요청 알림
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="alertComment"
                    checked={alertComment}
                    onChange={(e) => setAlertComment(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="alertComment">
                    댓글·반응 알림
                  </label>
                </div>
                <div className="form-check form-switch mb-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="alertBadge"
                    checked={alertBadge}
                    onChange={(e) => setAlertBadge(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="alertBadge">
                    배지 획득 알림
                  </label>
                </div>
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="alertMarketing"
                    checked={alertMarketing}
                    onChange={(e) => setAlertMarketing(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="alertMarketing">
                    이벤트·마케팅 알림
                  </label>
                </div>

                <button type="submit" className="btn btn-brand w-100" disabled={savingSettings}>
                  {savingSettings ? '저장 중...' : '저장'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Favorites
