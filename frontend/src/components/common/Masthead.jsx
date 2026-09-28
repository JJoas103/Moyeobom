// 화면 머리글.
//
// 히어로 배너 대신 쓴다. 서비스를 설명하는 문구를 크게 거는 대신, 오늘 날짜와 지금
// 상태를 알려준다 — 광고 문구는 한 번 읽고 나면 매번 자리만 차지한다.

/**
 * @param {string} title  왼쪽 큰 글자
 * @param {string} aside  오른쪽에 붙는 상태 한 줄 (건수 등)
 */
function Masthead({ title, aside }) {
  return (
    <header className="mv-masthead">
      <div className="mv-masthead__line">
        <h1 className="mv-display">{title}</h1>
        {aside && <p className="mv-micro mv-num mb-0">{aside}</p>}
      </div>
    </header>
  )
}

export default Masthead
