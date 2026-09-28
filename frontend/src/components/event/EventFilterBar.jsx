// 행사 필터.
//
// 선택값은 컴포넌트 state 가 아니라 URL 쿼리에 싣는다. 새로고침·뒤로가기가 동작하고,
// 필터가 걸린 목록을 그대로 공유할 수 있어야 하기 때문이다.
//
// 버튼 무리를 늘어놓지 않는다. 카테고리는 밑줄 탭, 나머지는 밑줄만 있는 셀렉트로 둬서
// 필터가 목록보다 시각적으로 앞서지 않게 한다.

import { EVENT_AREAS, EVENT_CATEGORIES } from '../../data/mock/events'

const PERIODS = [
  { value: '', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '한 달 내' },
]

function EventFilterBar({ category, area, period, onChange }) {
  return (
    <div>
      <div className="mv-tabs" role="tablist" aria-label="행사 분류">
        <button
          type="button"
          role="tab"
          className="mv-tab"
          aria-current={!category}
          onClick={() => onChange({ category: '' })}
        >
          전체
        </button>
        {EVENT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            className="mv-tab"
            aria-current={category === c}
            onClick={() => onChange({ category: category === c ? '' : c })}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="d-flex gap-4 mt-3">
        <select
          className="mv-select"
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
          className="mv-select"
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
