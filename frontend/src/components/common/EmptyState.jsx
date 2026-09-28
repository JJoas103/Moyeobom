// 비어 있는 화면.
//
// 서비스 초기에는 모임이 0개인 행사가 대부분이다. 빈 목록을 그냥 두면 "안 만든 화면"으로
// 읽히므로, 왜 비었는지와 다음에 할 일을 한 줄씩 준다.

function EmptyState({ title, description, action }) {
  return (
    <div className="mv-empty">
      <p className="mv-empty__title">{title}</p>
      {description && <p className="mv-empty__desc">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState
