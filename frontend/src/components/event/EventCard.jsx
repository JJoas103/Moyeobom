// 행사 포스터 카드. 시안 v2 의 기본 단위다.
//
// 목록의 5열 그리드와 상세 아래 "비슷한 행사" 3열이 같은 카드를 쓴다.
// 도록식 한 줄(EventRow)은 홈이 계속 쓰므로 그쪽은 건드리지 않았다.
//
// 포스터 위에 영문 + 제목을 얹는 오버레이는 이미지가 없을 때만 나온다. 실제 포스터가
// 있는 행사에 글자를 덮으면 작품을 가린다 — 시안도 모임 카드에서 같은 분기를 쓴다.

import { Link } from 'react-router-dom'
import Poster from '../common/Poster'
import { categoryColor, categoryEng, categoryGroup } from '../../utils/eventCategory'
import { eventTimingBadge, formatEventPeriod } from '../../utils/formatEventDate'

// eventTimingBadge 의 tone → 카드 상태 라벨 색
const TONE_CLASS = {
  now: 'mv-card__status--open',
  soon: 'mv-card__status--soon',
  later: 'mv-card__status--plan',
  ended: 'mv-card__status--closed',
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  )
}

function EventCard({ event }) {
  const group = categoryGroup(event.category)
  const timing = eventTimingBadge(event.startAt, event.endAt)
  // 집계를 받지 못한 경로도 있다 (비슷한 행사는 검색 API 라 모임 수가 없다).
  // 모르는 값을 "첫 모임을 열어보세요" 로 단정하지 않고 줄 자체를 뺀다.
  const meetCount = typeof event.openMeetingCount === 'number' ? event.openMeetingCount : null

  return (
    // 찜 버튼은 Link 밖에 둔다 — 앵커 안에 버튼을 넣으면 비적합 HTML 이고,
    // 클릭을 preventDefault 로 막아야 해서 키보드 조작도 어긋난다.
    <div className="mv-card">
      <Link to={`/event/${event._id}`} className="mv-card__link">
        <div className="mv-card__img">
          <Poster
            src={event.posterUrl}
            category={event.category}
            title={event.title}
            overlay={
              <span className="mv-card__overlay">
                <span className="mv-card__eng">{categoryEng(event.category)}</span>
                <span className="mv-card__postertitle">{event.title}</span>
              </span>
            }
          />

          <span className="mv-card__badge">
            <span className="mv-card__dot" style={{ background: categoryColor(group) }} />
            {group}
          </span>
        </div>

        {timing && (
          <span className={`mv-card__status ${TONE_CLASS[timing.tone]}`}>{timing.label}</span>
        )}

        <h3 className="mv-card__title mv-clamp2">{event.title}</h3>

        <span className="mv-card__meta">
          {formatEventPeriod(event.startAt, event.endAt)}
          {event.area && ` · ${event.area}`}
        </span>

        {meetCount !== null && (
          <span className={meetCount > 0 ? 'mv-card__meet mv-card__meet--on' : 'mv-card__meet'}>
            {meetCount > 0 ? `이 행사로 열린 모임 ${meetCount}` : '첫 모임을 열어보세요'}
          </span>
        )}
      </Link>

      {/* 찜은 아직 저장되는 곳이 없어 자리만 잡아 둔다. 가짜 숫자는 붙이지 않는다 */}
      <button type="button" className="mv-card__like" aria-label={`${event.title} 찜하기`}>
        <span>
          <HeartIcon />
        </span>
      </button>
    </div>
  )
}

export default EventCard
