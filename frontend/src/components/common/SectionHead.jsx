// 섹션 머리.
//
// 제목을 크게 키우지 않는다. 작고 자간 넓은 레이블 + 아래 괘선이 도록의 문법이고,
// 그래야 목록 자체가 화면의 주인공이 된다.

function SectionHead({ label, count, action, note }) {
  return (
    <>
      <div className="mv-section__head">
        <h2 className="mv-label">
          {label}
          {count !== undefined && <span className="mv-num"> {count}</span>}
        </h2>
        {action}
      </div>
      {note && <p className="mv-section__note">{note}</p>}
    </>
  )
}

export default SectionHead
