// 화면이 목업을 볼지 실제 API를 볼지 한 곳에서 정한다.
//
// 지금은 목업이다. 서울 열린데이터광장 문화행사 API 연동(services/eventApiService.js)과
// MongoDB가 붙으면 이 값만 false로 바꾸면 화면 코드는 그대로 둔 채 실제 데이터로 넘어간다.
// 그래서 목업 객체의 필드 이름을 models/Event.js 스키마와 똑같이 맞춰 뒀다.
export const USE_MOCK = true

// 목업을 즉시 돌려주면 로딩 상태를 한 번도 못 그려 보고 넘어간다.
// 실제 네트워크처럼 약간 늦춰서, 스켈레톤·로딩 문구가 실제로 동작하는지 확인할 수 있게 한다.
export const MOCK_DELAY_MS = 260

export function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
