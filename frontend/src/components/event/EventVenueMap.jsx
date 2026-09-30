// 행사 장소. 시안 v2 의 지도 240px + 주소 + 주소 복사.
//
// 좌표가 없는 행사가 꽤 있다 (서울 API 의 LOT/LAT 가 비거나 서울 범위를 벗어나면
// eventApiService.normalizeCoords 가 null 로 돌려보낸다). 키가 없는 개발 환경도 있다.
// 그럴 때 빈 네모를 남기지 않도록 시안의 회색 플레이스홀더를 그대로 보여준다.

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

function EventVenueMap({ event }) {
  const boxRef = useRef(null)
  const [failed, setFailed] = useState(false)
  const [copied, setCopied] = useState(false)

  const lat = event?.coords?.lat
  const lng = event?.coords?.lng
  const hasCoords = typeof lat === 'number' && typeof lng === 'number'
  const address = [event?.venue, event?.address]
    // venue 와 address 는 서울 API 가 같은 값을 주는 경우가 많다 (eventApiService.mapRow)
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(' · ')

  useEffect(() => {
    if (!hasCoords) return
    let cancelled = false

    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !boxRef.current) return
        const center = new kakao.maps.LatLng(lat, lng)
        const map = new kakao.maps.Map(boxRef.current, { center, level: 4 })
        new kakao.maps.Marker({ map, position: center })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [hasCoords, lat, lng])

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

  return (
    <div className="mv-venue">
      {hasCoords && !failed ? (
        <div ref={boxRef} className="mv-map" />
      ) : (
        <div className="mv-map mv-map--empty">
          <PinIcon />
          {hasCoords ? '지도를 불러오지 못했습니다' : '좌표 정보가 없는 행사입니다'}
        </div>
      )}

      {address && (
        <div className="mv-venue__row">
          <span>{address}</span>
          <button type="button" className="mv-btn--line" onClick={copyAddress}>
            {copied ? '복사됨' : '주소 복사'}
          </button>
        </div>
      )}

      <span className="mv-help">모임 장소는 호스트가 정하고, 승인된 참여자에게만 보여요.</span>
    </div>
  )
}

export default EventVenueMap
