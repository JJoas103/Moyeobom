// 행사 장소. 시안 v2 의 지도 240px + 주소 + 주소 복사.
//
// 좌표가 없는 행사가 꽤 있다 (서울 API 의 LOT/LAT 가 비거나 서울 범위를 벗어나면
// eventApiService.normalizeCoords 가 null 로 돌려보낸다). 그런 행사는 주소·장소명으로
// 한 번 더 찾아본다 — 서울 API 는 address 에도 "서울여성플라자" 처럼 지번이 아닌
// 장소 이름을 넣어 주기 때문에(eventApiService.mapRow) 주소 검색보다 키워드 검색이
// 실제로 맞는 수단이다.
//
// 그래도 못 찾으면, 또는 키가 없어 SDK 를 못 받으면 빈 네모를 남기지 않도록
// 시안의 회색 플레이스홀더를 보여준다. 이때 왜 못 띄웠는지를 문구로 구분해 둔다 —
// "좌표가 없다" 와 "키가 없다" 는 고치는 사람이 할 일이 다르다.

import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../../utils/loadKakaoMaps'

function PinIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}

const isNum = (v) => typeof v === 'number' && isFinite(v)

// CustomOverlay 는 content 를 HTML 문자열로 받는다. 장소 이름은 외부 공공 API 에서
// 온 값이라 그대로 넣지 않는다.
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/** 주소 검색 → 실패 시 장소명 키워드 검색. 둘 다 실패하면 null */
function searchCoords(kakao, { address, venue }) {
  const services = kakao.maps.services
  if (!services) return Promise.resolve(null)

  const byAddress = () =>
    new Promise((resolve) => {
      if (!address) return resolve(null)
      new services.Geocoder().addressSearch(address, (result, status) => {
        resolve(status === services.Status.OK && result[0]
          ? { lat: Number(result[0].y), lng: Number(result[0].x) }
          : null)
      })
    })

  const byKeyword = () =>
    new Promise((resolve) => {
      const keyword = venue || address
      if (!keyword) return resolve(null)
      new services.Places().keywordSearch(keyword, (result, status) => {
        resolve(status === services.Status.OK && result[0]
          ? { lat: Number(result[0].y), lng: Number(result[0].x) }
          : null)
      })
    })

  return byAddress().then((hit) => hit || byKeyword())
}

function EventVenueMap({ event }) {
  const boxRef = useRef(null)
  // 'loading' 동안에도 컨테이너가 DOM 에 있어야 한다 — 주소 검색으로 좌표를 늦게
  // 얻는 경로에서 컨테이너가 없으면 지도를 만들 수 없다.
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [pin, setPin] = useState(null)
  const [copied, setCopied] = useState(false)

  const venue = event?.venue || ''
  const rawAddress = event?.address || ''
  const address = [venue, rawAddress]
    // venue 와 address 는 서울 API 가 같은 값을 주는 경우가 많다 (eventApiService.mapRow)
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(' · ')

  const lat = event?.coords?.lat
  const lng = event?.coords?.lng

  useEffect(() => {
    let cancelled = false
    const box = boxRef.current
    setStatus('loading')
    setPin(null)

    loadKakaoMaps()
      .then(async (kakao) => {
        if (cancelled) return

        const coords = isNum(lat) && isNum(lng)
          ? { lat, lng }
          : await searchCoords(kakao, { address: rawAddress, venue })
        if (cancelled) return

        if (!coords) {
          setStatus('nocoords')
          return
        }
        if (!boxRef.current) return

        const center = new kakao.maps.LatLng(coords.lat, coords.lng)
        // scrollwheel: false — 240px 박스 위에서 휠을 굴렸을 때 지도가 페이지
        // 스크롤을 가로채지 않게 한다. setZoomable(false) 로 막으면 휠뿐 아니라
        // 모바일 핀치 줌까지 같이 죽어서 작은 지도가 더 답답해진다.
        const map = new kakao.maps.Map(boxRef.current, { center, level: 3, scrollwheel: false })

        // 휠을 막은 대신 ± 버튼을 둔다. 드래그로 주변을 둘러보는 것은 그대로 허용한다.
        map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT)

        new kakao.maps.Marker({ map, position: center, title: venue })

        const label = venue || event?.area
        if (label) {
          new kakao.maps.CustomOverlay({
            map,
            position: center,
            yAnchor: 2.1,
            content: `<div class="mv-map__label">${escapeHtml(label)}</div>`,
          })
        }

        setPin(coords)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setErrorMessage(err.message)
        setStatus('error')
      })

    return () => {
      cancelled = true
      // 카카오 Map 에는 destroy 가 없다. StrictMode 의 두 번째 마운트에서 같은
      // div 에 지도 레이어가 겹치지 않도록 컨테이너를 비운다.
      if (box) box.innerHTML = ''
    }
  }, [lat, lng, rawAddress, venue, event?.area])

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // http 로 띄운 개발 환경 등에서는 클립보드가 막힌다. 조용히 넘기지 않고 알려 준다
      setCopied(false)
      window.prompt('주소를 복사해 주세요', address)
    }
  }

  const showMap = status === 'loading' || status === 'ready'
  // 별도 키가 필요 없는 카카오맵 공개 링크 규격
  const linkTarget = pin && `${encodeURIComponent(venue || address)},${pin.lat},${pin.lng}`

  return (
    <div className="mv-venue">
      {showMap ? (
        <div ref={boxRef} className="mv-map" />
      ) : (
        <div className="mv-map mv-map--empty">
          <PinIcon />
          {status === 'nocoords' ? '위치를 찾을 수 없는 행사입니다' : errorMessage || '지도를 불러오지 못했습니다'}
        </div>
      )}

      {address && (
        <div className="mv-venue__row">
          <span>{address}</span>
          <button type="button" className="mv-btn--line" onClick={copyAddress}>
            {copied ? '복사됨' : '주소 복사'}
          </button>
          {linkTarget && (
            <>
              <a
                className="mv-btn--line"
                href={`https://map.kakao.com/link/map/${linkTarget}`}
                target="_blank"
                rel="noreferrer"
              >
                카카오맵에서 보기
                <ExternalIcon />
              </a>
              <a
                className="mv-btn--line"
                href={`https://map.kakao.com/link/to/${linkTarget}`}
                target="_blank"
                rel="noreferrer"
              >
                길찾기
                <ExternalIcon />
              </a>
            </>
          )}
        </div>
      )}

      <span className="mv-help">모임 장소는 호스트가 정하고, 승인된 참여자에게만 보여요.</span>
    </div>
  )
}

export default EventVenueMap
