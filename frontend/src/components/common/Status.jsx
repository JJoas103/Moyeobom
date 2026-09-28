// 상태 표시 — 모집중 / 마감 / 종료 / 진행 중.
//
// 색 칩을 쓰지 않는다. 점 하나와 글자면 충분하고, 목록에 칩이 여러 개 깔리면
// 그게 화면의 주인공이 되어 버린다.
//
// 점을 ::before 로 그리지 않고 실제 요소로 둔다. 부모의 .mv-dotsep 이 구분점을
// ::before 로 넣기 때문에, 같은 가상 요소를 두고 둘이 충돌한다.

function Status({ tone = 'open', children }) {
  return (
    <span className={`mv-status mv-status--${tone}`}>
      <i className="mv-status__dot" aria-hidden="true" />
      {children}
    </span>
  )
}

export default Status
