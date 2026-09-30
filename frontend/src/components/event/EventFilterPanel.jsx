// 행사 필터. 시안 v2 의 두 단 구성을 따른다.
//
//   1) 분류 칩 한 줄 — 전체 · 공연 · 연극 · 영화 · 전시 · 축제 · 클래식 · 국악
//   2) 가라앉은 박스 — 지역 · 분야 · 기간 · 비용 드롭다운 + "모임 있는 행사만" 스위치
//
// 칩은 굵은 분류(CODENAME 을 여섯으로 접은 것), 박스의 "분야"는 그 안의 세부 장르다
// (models/Event.js 의 genres — GENRE_MAP 이 채운 '뮤지컬' '오페라' '공연' 같은 태그).
// 굵게 한 번 좁히고 세부로 한 번 더 좁히는 순서라 둘이 겹쳐 보이지 않는다.
//
// 선택값은 컴포넌트 state 가 아니라 전부 URL 쿼리다. 새로고침·뒤로가기가 동작하고
// 필터가 걸린 목록을 그대로 공유할 수 있어야 한다.

import { CATEGORY_GROUPS } from '../../utils/eventCategory'
import { FEE_OPTIONS, PERIOD_OPTIONS } from '../../data/eventOptions'

function EventFilterPanel({
  category,
  area,
  genre,
  period,
  fee,
  hasMeeting,
  areas = [],
  genres = [],
  onChange,
}) {
  return (
    <div>
      <div className="mv-chip-row" role="group" aria-label="행사 분류">
        <button
          type="button"
          className={category ? 'mv-chip' : 'mv-chip mv-chip--on'}
          aria-pressed={!category}
          onClick={() => onChange({ category: '' })}
        >
          전체
        </button>
        {CATEGORY_GROUPS.map((c) => (
          <button
            key={c}
            type="button"
            className={category === c ? 'mv-chip mv-chip--on' : 'mv-chip'}
            aria-pressed={category === c}
            // 켜져 있는 칩을 다시 누르면 꺼진다 — "전체"로 돌아가려고 눈을 옮기지 않아도 된다
            onClick={() => onChange({ category: category === c ? '' : c, genre: '' })}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mv-filters">
        <select
          className="mv-pillselect"
          value={area || ''}
          onChange={(e) => onChange({ area: e.target.value })}
          aria-label="지역 선택"
        >
          <option value="">지역 전체</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          className="mv-pillselect"
          value={genre || ''}
          onChange={(e) => onChange({ genre: e.target.value })}
          aria-label="분야 선택"
        >
          <option value="">분야 전체</option>
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          className="mv-pillselect"
          value={period || ''}
          onChange={(e) => onChange({ period: e.target.value })}
          aria-label="기간 선택"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          className="mv-pillselect"
          value={fee || ''}
          onChange={(e) => onChange({ fee: e.target.value })}
          aria-label="비용 선택"
        >
          {FEE_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <span className="mv-filters__gap" />

        <button
          type="button"
          className="mv-switchlabel"
          role="switch"
          aria-checked={Boolean(hasMeeting)}
          onClick={() => onChange({ hasMeeting: hasMeeting ? '' : '1' })}
        >
          모임 있는 행사만
          <span className={hasMeeting ? 'mv-switch mv-switch--on' : 'mv-switch'} aria-hidden="true">
            <span className="mv-switch__knob" />
          </span>
        </button>
      </div>
    </div>
  )
}

export default EventFilterPanel
