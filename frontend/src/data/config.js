// 화면이 목업을 볼지 실제 API를 볼지 한 곳에서 정한다.
//
// 플래그가 도메인별로 둘인 이유 — 백엔드가 영역마다 진행도가 다르다.
// 행사는 목록 조회(/api/event/list)와 적재가 끝나 실데이터로 넘어갔다. 모임·마이페이지는
// 아직 목업이 필요하다. 마이페이지가 부르는 /api/member/me · /events · /impressions 는
// 백엔드에 라우트 자체가 없어서(memberApiRouter 에 /info 만 있다) 같이 끄면 404 가 뜬다.
// 홈 추천(/api/recommend)은 requireAuth 라 비로그인 홈이 401 이 되고, 화면이 읽는
// totalOpenEvents 를 서버가 내려주지 않는다.
//
// 그래서 하나를 끌 때 나머지가 같이 끌려가지 않게 나눠 두었다.
// 목업 객체의 필드 이름은 models/Event.js 스키마와 똑같이 맞춰 두었으므로, 남은 도메인도
// 라우트가 생기면 해당 플래그만 바꾸면 화면 코드는 그대로 둔 채 넘어간다.

// 되돌리려면 이 값을 true 로 바꾼다 — 목록·상세·비슷한 행사가 한꺼번에 목업으로 돌아간다.
// 데이터를 갱신할 때는 Moyeobom-main 에서 npm run seed:events 를 다시 돌린다.
/** 행사 — 목록·상세·비슷한 행사. 실데이터다 */
export const USE_MOCK_EVENTS = false

/** 모임 · 마이페이지 · 홈 추천. 아직 목업이다 */
export const USE_MOCK = true

// 목업을 즉시 돌려주면 로딩 상태를 한 번도 못 그려 보고 넘어간다.
// 실제 네트워크처럼 약간 늦춰서, 스켈레톤·로딩 문구가 실제로 동작하는지 확인할 수 있게 한다.
export const MOCK_DELAY_MS = 260

export function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
