import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 카카오 지도 JS SDK 는 개발자 콘솔에 등록된 사이트 도메인에서만 동작한다.
  // 등록된 도메인이 http://localhost:5173 이라, 포트가 밀려서 지도가 조용히
  // 깨지지 않도록 strictPort 로 고정한다 (포트가 쓰이고 있으면 아예 실행 실패).
  // 다른 포트로 띄우려면 콘솔의 사이트 도메인과 백엔드 .env 의 FRONTEND_URL 을
  // 같이 바꿔야 한다.
  server: { port: 5173, strictPort: true },
})
