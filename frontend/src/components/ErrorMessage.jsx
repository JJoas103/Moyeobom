import { Link } from 'react-router-dom'

// 없는 주소로 들어왔을 때. App.jsx 의 catch-all 라우트(path="*")라 실제로 보이는 화면이므로
// 나머지 화면과 같은 톤으로 둔다 — 괘선 위 문장 하나와 돌아갈 길 하나.
function ErrorMessage({ statusCode = 404, message = '페이지를 찾을 수 없습니다.' }) {
  return (
    <div className="mv-empty" style={{ marginTop: 60 }}>
      <p className="mv-micro mv-num mb-2">{statusCode}</p>
      <p className="mv-empty__title">{message}</p>
      <p className="mv-empty__desc">주소가 바뀌었거나 삭제된 페이지일 수 있습니다.</p>
      <Link to="/" className="mv-btn">
        홈으로
      </Link>
    </div>
  )
}

export default ErrorMessage
