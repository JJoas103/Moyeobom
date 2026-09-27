// 친구 — 모임이 끝난 뒤 양쪽이 서로를 골랐을 때만 생긴다.
//
// 한쪽만 골랐으면 아무 일도 일어나지 않고, 상대는 내가 골랐다는 것조차 모른다.
// 거절이 보이면 아무도 솔직하게 못 누르기 때문이다.
// 화면에는 "어느 행사에서 만났는지"가 같이 떠야 한다 — 그게 이 관계의 근거다.

const DAY = 24 * 60 * 60 * 1000
const ago = (days) => new Date(Date.now() - days * DAY).toISOString()

export const MOCK_FRIENDS = [
  {
    _id: 'frd-001',
    user: 'usr-jisu',
    sourceEventTitle: '빛과 물질 — 소재의 시간',
    sourceMeetingTitle: '전시 보고 커피 한 잔',
    sharedEventCount: 2,
    respondedAt: ago(2),
    isNew: true,
  },
  {
    _id: 'frd-002',
    user: 'usr-minjae',
    sourceEventTitle: '밤의 끝에서',
    sourceMeetingTitle: '연극 끝나고 여운 나누기',
    sharedEventCount: 2,
    respondedAt: ago(21),
    isNew: false,
  },
  {
    _id: 'frd-003',
    user: 'usr-hayun',
    sourceEventTitle: '한강 달빛 재즈 페스티벌',
    sourceMeetingTitle: '재즈 페스티벌 돗자리 팀',
    sharedEventCount: 1,
    respondedAt: ago(62),
    isNew: false,
  },
]

// 아직 평가하지 않은, 끝난 모임. 여기서 "또 보고 싶어요"가 시작된다.
export const MOCK_PENDING_REVIEWS = [
  {
    _id: 'mtg-010',
    meetingTitle: '도자전 보고 삼청동 한 바퀴',
    eventTitle: '도자, 손의 기억',
    endedAt: ago(1),
    // 평가 마감 72시간 — friendService.REVIEW_WINDOW_HOURS 와 같은 값
    deadlineAt: new Date(Date.now() - 1 * DAY + 72 * 60 * 60 * 1000).toISOString(),
    others: ['usr-hayun', 'usr-jisu'],
  },
]
