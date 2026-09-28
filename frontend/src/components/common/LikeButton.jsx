// 찜.
//
// 시안 v2 에서 행사 포스터 위와 상세 사이드바에 있다. 목업 단계라 숫자만 오르내린다.
// 하트는 이모지가 아니라 선 아이콘으로 그린다 — 나머지 화면과 톤을 맞추기 위해서다.

import { useState } from 'react'

function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

/**
 * @param {number} count  시작 찜 수
 * @param {boolean} float 포스터 위에 겹치는 동그란 형태
 */
function LikeButton({ count = 0, float = false, label = '찜' }) {
  const [on, setOn] = useState(false)

  return (
    <button
      type="button"
      className={`mv-like${float ? ' mv-like--float' : ''}`}
      data-on={on}
      aria-label={label}
      aria-pressed={on}
      onClick={(e) => {
        // 카드 전체가 링크인 자리에 놓이므로 이동을 막는다
        e.preventDefault()
        e.stopPropagation()
        setOn((prev) => !prev)
      }}
    >
      <HeartIcon filled={on} />
      {!float && <span className="mv-num">{count + (on ? 1 : 0)}</span>}
    </button>
  )
}

export default LikeButton
