// 모임 목록.
//
// 게시판과 다른 지점이 레이아웃으로 드러나야 한다 — 모임이 최신순으로 쭉 나열되는 게
// 아니라 **행사 단위로 묶인다**. 같은 행사를 본 사람들이 한 곳에 모이는 구조라서다.
// 그래서 목록의 1단계는 모임이 아니라 행사다.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import GatheringCard from '../../components/meeting/GatheringCard'
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
      <section className="hero p-4 mb-4">
        <h1 className="h4 mb-2">모임</h1>
        <p className="mb-0 small" style={{ color: 'var(--ink-sub)' }}>
          행사별로 묶여 있습니다. 같은 걸 보러 가는 사람끼리 한 곳에 모입니다.
        </p>
      </section>

      <form
        className="mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          updateParams({ keyword: keywordInput })
        }}
      >
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="🔍 모임 제목 · 행사명 · 지역 검색"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
          <button type="submit" className="btn btn-brand">
            검색
          </button>
        </div>
      </form>

      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`btn btn-sm ${status === f.value ? 'btn-brand' : 'btn-outline-brand'}`}
              onClick={() => updateParams({ status: f.value })}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Link to="/event" className="btn btn-sm btn-brand">
          + 행사 고르고 모임 만들기
        </Link>
      </div>

      {error && <div className="alert alert-warning">{error}</div>}

      {loading ? (
        <div className="text-center text-muted py-5">불러오는 중...</div>
      ) : groups.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="조건에 맞는 모임이 없습니다"
          description={'행사를 먼저 고르면 거기서 모임을 열 수 있습니다.'}
          action={
            <Link to="/event" className="btn btn-brand">
              행사 둘러보기
            </Link>
          }
        />
      ) : (
        <>
          <p className="small text-muted mb-3">
            행사 {groups.length}개 · 모임 {totalCount}개
          </p>

          <div className="d-flex flex-column gap-4">
            {groups.map((group) => (
              <section key={group.event?._id || 'none'} className="event-group">
                {group.event && (
                  <Link
                    to={`/event/${group.event._id}`}
                    className="event-group-head text-decoration-none text-dark"
                  >
                    <div className="event-group-thumb">
                      <Poster
                        src={group.event.posterUrl}
                        category={group.event.category}
                        alt={group.event.title}
                        ratio="1 / 1"
                        rounded="all"
                      />
                    </div>
                    <div className="flex-grow-1 min-width-0">
                      <div className="small" style={{ color: 'var(--brand)' }}>
                        {group.event.category}
                      </div>
                      <div className="fw-semibold text-truncate">{group.event.title}</div>
                      <div className="small text-muted text-truncate">
                        {formatEventPeriod(group.event.startAt, group.event.endAt)} · {group.event.venue}
                      </div>
                    </div>
                    <span className="chip chip-brand flex-shrink-0">모임 {group.meetings.length}</span>
                  </Link>
                )}

                {/* 행사 아래에 모임을 한 칸 들여 쌓는다. 들여쓰기가 없으면 행사 머리글과
                    모임 카드가 같은 높이로 나열돼 묶여 있다는 게 안 읽힌다. */}
                <div className="event-group-body">
                  <div className="row g-3">
                    {group.meetings.map((meeting) => (
                      <div key={meeting._id} className="col-12 col-xl-6">
                        <GatheringCard meeting={meeting} />
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default List
