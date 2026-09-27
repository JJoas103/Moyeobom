// 추천 이유 칩.
//
// "그거 결국 필터링 아니냐"에 대한 답이 이 컴포넌트다.
// 걸러낸 목록이 아니라 점수로 매긴 순위이고, 왜 이게 떴는지가 카드마다 붙는다.
// 말로 "가중치를 씁니다"라고 하면 화면상으로는 필터와 구별이 안 된다.
//
// kind 는 services/recommendService.js 의 BASE_WEIGHTS 키를 따른다.

import { REASON_LABEL } from '../../data/mock/reasons'

// 근거의 종류가 색으로 구분돼야 "여러 요소를 합쳐 계산했다"가 한눈에 보인다.
const TONE = {
  taste: 'chip-brand',
  history: 'chip-green',
  social: 'chip-blue',
  area: 'chip-yellow',
  time: 'chip-yellow',
  calm: 'chip-green',
}

function ReasonChips({ reasons = [], max = 3 }) {
  if (reasons.length === 0) return null
  const shown = reasons.slice(0, max)
  const rest = reasons.length - shown.length

  return (
    <div className="d-flex flex-wrap gap-1">
      {shown.map((r, i) => (
        <span key={`${r.kind}-${i}`} className={`chip ${TONE[r.kind] || 'chip-brand'}`}>
          {REASON_LABEL[r.kind] || '추천'} · {r.text}
        </span>
      ))}
      {rest > 0 && <span className="chip chip-brand">+{rest}</span>}
    </div>
  )
}

export default ReasonChips
