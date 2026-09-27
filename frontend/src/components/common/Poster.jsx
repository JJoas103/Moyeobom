// 행사 포스터.
//
// 서울 문화행사 API의 MAIN_IMG는 비어 있는 경우가 많고, 외부 이미지 서버가 죽으면
// 카드가 통째로 깨진다. 그래서 이미지가 없거나 로드에 실패하면 카테고리별 색과
// 이모지로 대체한다. 목록 어디에도 빈 네모가 남지 않게 하기 위한 것이다.

import { useState } from 'react'

const BY_CATEGORY = {
  '전시/미술': { emoji: '🖼️', from: '#0f766e', to: '#34d399' },
  연극: { emoji: '🎭', from: '#9a3412', to: '#fb923c' },
  '뮤지컬/오페라': { emoji: '🎼', from: '#701a75', to: '#e879f9' },
  클래식: { emoji: '🎻', from: '#1e3a8a', to: '#60a5fa' },
  국악: { emoji: '🪕', from: '#713f12', to: '#facc15' },
  무용: { emoji: '🩰', from: '#831843', to: '#f472b6' },
  콘서트: { emoji: '🎤', from: '#4c1d95', to: '#a78bfa' },
  영화: { emoji: '🎬', from: '#0c4a6e', to: '#38bdf8' },
  '축제-문화/예술': { emoji: '🎪', from: '#065f46', to: '#6ee7b7' },
  '축제-전통/역사': { emoji: '🏯', from: '#78350f', to: '#fbbf24' },
  '교육/체험': { emoji: '🧵', from: '#134e4a', to: '#5eead4' },
}

const FALLBACK = { emoji: '🌿', from: '#1d9e75', to: '#6ee7c7' }

/**
 * @param {string} src        posterUrl
 * @param {string} category   행사 카테고리 (CODENAME)
 * @param {string} ratio      CSS aspect-ratio 값. 카드는 '4 / 3', 상세는 '3 / 4'
 */
function Poster({ src, category, alt = '', ratio = '4 / 3', rounded = 'top' }) {
  const [failed, setFailed] = useState(false)
  const theme = BY_CATEGORY[category] || FALLBACK

  const radius =
    rounded === 'all' ? '12px' : rounded === 'top' ? '11px 11px 0 0' : '0'

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: radius, display: 'block' }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        aspectRatio: ratio,
        borderRadius: radius,
        background: `linear-gradient(140deg, ${theme.from} 0%, ${theme.to} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'clamp(28px, 6vw, 44px)',
      }}
    >
      {theme.emoji}
    </div>
  )
}

export default Poster
