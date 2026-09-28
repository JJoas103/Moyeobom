// 행사 포스터.
//
// 서울 문화행사 API의 MAIN_IMG 는 있는 행사도 있고 없는 행사도 있다. 외부 도메인
// (culture.seoul.go.kr)에서 직접 받아오므로 느리거나 죽는 경우도 생긴다.
// 그때 빈 네모를 남기지 않도록 카테고리 색면 + 약자로 대체한다. 이모지는 쓰지 않는다.
//
// 비율은 2:3 이다. 공연·전시 포스터가 실제로 그 비율이라, 4:3 에 담으면 위아래가 잘린다.

import { useState } from 'react'

// 색은 카테고리를 구분하는 최소한으로만 쓴다. 채도를 낮춰 포스터가 옆에 있어도 튀지 않게.
const BY_CATEGORY = {
  '전시/미술': { short: '전시', bg: '#2f4f45' },
  연극: { short: '연극', bg: '#5b3a2e' },
  '뮤지컬/오페라': { short: '뮤지컬', bg: '#4a3355' },
  클래식: { short: '클래식', bg: '#2c3e57' },
  국악: { short: '국악', bg: '#5a4526' },
  무용: { short: '무용', bg: '#563245' },
  콘서트: { short: '콘서트', bg: '#3b3560' },
  영화: { short: '영화', bg: '#25404f' },
  '축제-문화/예술': { short: '축제', bg: '#2e5040' },
  '축제-전통/역사': { short: '축제', bg: '#4f3b24' },
  '축제-자연/경관': { short: '축제', bg: '#33503a' },
  '축제-시민화합': { short: '축제', bg: '#2e4a50' },
  '교육/체험': { short: '체험', bg: '#2b4a4a' },
}

const FALLBACK = { short: '행사', bg: '#3a3733' }

function Poster({ src, category, alt = '' }) {
  const [failed, setFailed] = useState(false)
  const theme = BY_CATEGORY[category] || FALLBACK

  return (
    <div className="mv-poster">
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="mv-poster__fallback" style={{ background: theme.bg }} aria-hidden="true">
          {theme.short}
        </div>
      )}
    </div>
  )
}

export default Poster
