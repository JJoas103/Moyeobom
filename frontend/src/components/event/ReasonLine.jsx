// 추천 근거.
//
// "그거 결국 필터링 아니냐"에 대한 답이 이 줄이다. 걸러낸 목록이 아니라 점수로 매긴
// 순위이고, 왜 이게 떴는지가 항목마다 붙는다.
//
// 칩으로 알록달록하게 만들면 장식으로 읽혀서 근거라는 게 전달되지 않는다.
// 근거의 종류만 작게 강조하고 나머지는 본문 흐름에 둔다.
//
// kind 는 services/recommendService.js 의 BASE_WEIGHTS 키를 따른다.
//   taste 30 / history 25 / social 20 / area 12 / time 8 / calm 5

import { REASON_LABEL } from '../../data/mock/reasons'

function ReasonLine({ reasons = [], max = 3 }) {
  if (reasons.length === 0) return null
  const shown = reasons.slice(0, max)

  return (
    <p className="mv-reasons mb-0">
      {shown.map((r, i) => (
        <span key={`${r.kind}-${i}`}>
          <span className="mv-reason__kind">{REASON_LABEL[r.kind] || '추천'}</span>
          {r.text}
        </span>
      ))}
    </p>
  )
}

export default ReasonLine
