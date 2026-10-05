// 카카오 지도 API 로드.
//
// libraries=services 는 좌표가 없는 행사를 주소·장소명으로 찾기 위한 것이다
// (EventVenueMap 이 Geocoder/Places 를 쓴다). 라이브러리 추가는 가산적이라
// 다른 지도 화면의 동작은 그대로다.
let loadPromise = null

export function loadKakaoMaps() {
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao)
  }

  if (loadPromise) {
    return loadPromise
  }

  const appKey = import.meta.env.VITE_KAKAO_MAP_API

  loadPromise = new Promise((resolve, reject) => {
    if (!appKey) {
      reject(new Error('카카오 지도 API 키(VITE_KAKAO_MAP_API)가 설정되지 않았습니다.'))
      return
    }

    const script = document.createElement('script')
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao))
    }
    script.onerror = () => reject(new Error('카카오 지도 스크립트를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })

  return loadPromise
}
