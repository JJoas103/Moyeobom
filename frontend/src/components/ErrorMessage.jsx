import { Link } from 'react-router-dom'

// 오류 메시지 컴포넌트
function ErrorMessage({ statusCode = 404, message = '페이지를 찾을 수 없습니다.' }) {
  return (
    <div className="text-center py-5">
      <div style={{ fontSize: 48 }}>⚠️</div>
      <h1 className="h4 mt-3">{statusCode}</h1>
      <p className="text-muted">{message}</p>
      <Link to="/" className="btn btn-brand">
        메인으로 이동
      </Link>
    </div>
  )
}

export default ErrorMessage
