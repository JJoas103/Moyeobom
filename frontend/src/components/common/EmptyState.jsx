// 비어 있는 화면.
//
// 목록이 0건일 때 그냥 비워 두면 "안 만든 화면"으로 읽힌다. 특히 서비스 초기에는
// 모임이 0개인 행사가 대부분이라, 빈 상태에서 다음 행동이 보이는지가 곧 콜드스타트 대응이다.

function EmptyState({ emoji = '🌿', title, description, action }) {
  return (
    <div className="text-center py-5 px-3">
      <div style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">
        {emoji}
      </div>
      <p className="fw-semibold mt-3 mb-1">{title}</p>
      {description && (
        <p className="text-muted small mb-3" style={{ whiteSpace: 'pre-line' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  )
}

export default EmptyState
