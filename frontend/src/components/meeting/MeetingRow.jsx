// 모임 한 줄. 시안 v2 의 모임 행을 따른다.
//
//   날짜 | 제목 · 조건 한 줄 · 정원바+정원+위치+호스트 | 상태
//
// 조건 한 줄이 이 서비스의 핵심이다 — 관람부터 함께인지, 술이 있는지, 예산이 얼마인지를
// 신청하기 전에 알 수 있어야 한다. 시안이 "관람부터 함께 가능 · 술 없음 · 1~2만 원"
// 형태로 쓰고 있어 그대로 옮겼다.
//
// 정확한 장소는 승인된 참여자에게만 보이므로 목록에는 대략 위치(whereLabel)만 쓴다.

import { Link } from 'react-router-dom'
import Status from '../common/Status'
import { formatMeetingDateLines } from '../../utils/formatEventDate'

const STATUS = {
  recruit: { label: '모집중', tone: 'open' },
  full: { label: '마감', tone: 'full' },
  completed: { label: '종료', tone: 'done' },
}

// 시각만 — "23:00 종료 예정"
function endLabel(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())} 종료 예정`
}

function MeetingRow({ meeting, showEvent = false }) {
  const status = STATUS[meeting.status] || STATUS.recruit
  const joined = meeting.participants?.length || 0
  const max = meeting.maxParticipants || 1
  const ratio = Math.min(100, Math.round((joined / max) * 100))
  const left = Math.max(0, max - joined)
  const { day, sub } = formatMeetingDateLines(meeting.meetingDate)

  // 남은 자리에 따라 막대 색이 바뀐다 — 숫자를 읽기 전에 상태가 보인다
  const fillTone = left === 0 ? 'closed' : left <= 1 ? 'soon' : 'open'

  // 신청 전에 공개되는 조건
  const terms = [
    meeting.withViewing ? '관람부터 함께 가능' : '이야기 자리만',
    `술 ${meeting.drinking || '없음'}`,
    meeting.budget,
    endLabel(meeting.endAt),
  ].filter(Boolean)

  return (
    <li>
      <Link to={`/meeting/${meeting._id}`} className="mv-row">
        <div className="mv-row__date">
          <span className="mv-row__day">{day}</span>
          <span className="mv-row__sub">{sub}</span>
        </div>

        <div>
          <p className="mv-row__title">{meeting.title}</p>

          <p className="mv-meta mv-meta--oneline mb-2">
            {showEvent && meeting.event && <span>〈{meeting.event.title}〉 보고 · </span>}
            {terms.join(' · ')}
          </p>

          <p className="mv-meta mb-0 d-flex align-items-center gap-2 flex-wrap">
            <span className="mv-gauge" aria-hidden="true">
              <span className={`mv-gauge__fill mv-gauge__fill--${fillTone}`} style={{ width: `${ratio}%` }} />
            </span>
            <span className="mv-num">
              {joined}/{max}
            </span>
            <span className="mv-dotsep">
              {meeting.whereLabel && <span>{meeting.whereLabel}</span>}
              {meeting.author?.handle && <span>호스트 {meeting.author.handle}</span>}
            </span>
          </p>
        </div>

        <div className="text-end">
          <Status tone={status.tone}>{status.label}</Status>
        </div>
      </Link>
    </li>
  )
}

export default MeetingRow
