// 모임 목록.
//
// 게시판과 다른 지점이 레이아웃으로 드러나야 한다 — 모임이 최신순으로 쭉 나열되는 게
// 아니라 **행사 단위로 묶인다**. 같은 행사를 본 사람들이 한 곳에 모이는 구조라서다.
// 그래서 목록의 1단계는 모임이 아니라 행사다.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Masthead from '../../components/common/Masthead'
import MeetingRow from '../../components/meeting/MeetingRow'
import EmptyState from '../../components/common/EmptyState'
import Poster from '../../components/common/Poster'
import { fetchMeetings } from '../../data/meetings'
import { formatEventPeriod } from '../../utils/formatEventDate'

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'recruit', label: '모집중' },
  { value: 'full', label: '마감' },
  { value: 'completed', label: '종료' },
]

function List() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') || ''
  const keyword = searchParams.get('keyword') || ''

  const [keywordInput, setKeywordInput] = useState(keyword)
  const [groups, setGroups] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setKeywordInput(keyword)
  }, [keyword])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMeetings({ status, keyword })
      .then((data) => {
        if (cancelled) return
        setGroups(data.groups)
        setTotalCount(data.totalCount)
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
  }, [status, keyword])

  const updateParams = (next) => {
    const merged = { status, keyword, ...next }
    const params = {}
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params[k] = v
    })
    setSearchParams(params)
  }

  return (
    <div>
      <Masthead
        title="모임"
        aside={loading ? '' : `행사 ${groups.length} · 모임 ${totalCount}`}
      />

      <div className="mv-search mb-4">
        <input
          type="text"
          placeholder="모임 제목 · 행사명 · 지역"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && updateParams({ keyword: keywordInput })}
          aria-label="모임 검색"
        />
      </div>

      <div className="d-flex justify-content-between align-items-center gap-3 mb-4 flex-wrap">
        <div className="mv-tabs" style={{ flex: '1 1 260px' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className="mv-tab"
              aria-current={status === f.value}
              onClick={() => updateParams({ status: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link to="/event" className="mv-btn mv-btn--sm">
          행사 고르고 모임 만들기
        </Link>
      </div>

      {error && <p className="mv-note mv-note--dim mv-meta mb-4">{error}</p>}

      {loading ? (
        <div className="mv-skeleton" style={{ height: 380 }} />
      ) : groups.length === 0 ? (
        <EmptyState
          title="조건에 맞는 모임이 없습니다"
          description="행사를 먼저 고르면 거기서 모임을 열 수 있습니다."
          action={
            <Link to="/event" className="mv-btn">
              행사 둘러보기
            </Link>
          }
        />
      ) : (
        <div>
          {groups.map((group) => (
            <section key={group.event?._id || 'none'} className="mb-5">
              {group.event && (
                <Link
                  to={`/event/${group.event._id}`}
                  className="d-flex align-items-center gap-3 pb-2 mb-1 text-decoration-none"
                  style={{ borderBottom: '1px solid var(--ink)', color: 'inherit' }}
                >
                  <div style={{ width: 34, flexShrink: 0 }}>
                    <Poster src={group.event.posterUrl} category={group.event.category} title={group.event.title} />
                  </div>
                  <div className="mv-truncate flex-grow-1">
                    <p className="mv-micro mb-0">{group.event.category}</p>
                    <p className="mb-0 mv-truncate" style={{ fontWeight: 600, letterSpacing: '-0.025em' }}>
                      {group.event.title}
                    </p>
                  </div>
                  <span className="mv-micro mv-num flex-shrink-0">
                    {formatEventPeriod(group.event.startAt, group.event.endAt)}
                  </span>
                </Link>
              )}

              <ul className="mv-list mv-list--meeting">
                {group.meetings.map((meeting) => (
                  <MeetingRow key={meeting._id} meeting={meeting} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

export default List
