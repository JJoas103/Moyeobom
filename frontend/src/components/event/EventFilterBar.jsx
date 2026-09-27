// 행사 필터.
//
// 선택값은 컴포넌트 state가 아니라 URL 쿼리에 싣는다 (meeting/List.jsx 와 같은 방식).
// 새로고침·뒤로가기가 동작하고, 필터가 걸린 목록을 그대로 공유할 수 있어야 하기 때문이다.

import { EVENT_AREAS, EVENT_CATEGORIES } from '../../data/mock/events'

const PERIODS = [
  { value: '', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '한 달 내' },
]

function EventFilterBar({ category, area, period, onChange }) {
  return (
    <div className="d-flex flex-column gap-2">
      {/* 카테고리는 가장 많이 쓰는 축이라 토글 버튼으로 바로 보이게 둔다.
          좁은 화면에서는 줄바꿈 대신 가로 스크롤이 낫다 — 버튼이 3줄로 쌓이면 화면을 다 먹는다 */}
      <div className="filter-scroll d-flex gap-2 pb-1">
        <button
          type="button"
          className={`btn btn-sm flex-shrink-0 ${!category ? 'btn-brand' : 'btn-outline-brand'}`}
          onClick={() => onChange({ category: '' })}
        >
          전체
        </button>
        {EVENT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`btn btn-sm flex-shrink-0 ${category === c ? 'btn-brand' : 'btn-outline-brand'}`}
            onClick={() => onChange({ category: category === c ? '' : c })}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 지역·기간은 선택지가 많아 드롭다운으로 접어 둔다 */}
      <div className="d-flex gap-2">
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 160 }}
          value={area || ''}
          onChange={(e) => onChange({ area: e.target.value })}
          aria-label="지역 선택"
        >
          <option value="">전체 지역</option>
          {EVENT_AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 160 }}
          value={period || ''}
          onChange={(e) => onChange({ period: e.target.value })}
          aria-label="기간 선택"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default EventFilterBar
