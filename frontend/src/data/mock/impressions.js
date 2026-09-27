// 행사 페이지에 쌓이는 감상 한 줄.
//
// 이게 "여운을 받는 그릇"이다. 모임에 못 들어간 사람도 여기엔 쓸 수 있고,
// 시간이 지날수록 행사 페이지가 두꺼워진다. 게시판과 다른 지점이 이 축적이라,
// 감상이 0개인 행사와 여러 개인 행사가 화면에서 확연히 달라 보여야 한다.

const DAY = 24 * 60 * 60 * 1000
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 60 * 60 * 1000).toISOString()

export const MOCK_IMPRESSIONS = [
  {
    _id: 'imp-001',
    event: 'evt-001',
    author: 'usr-jisu',
    text: '2층 마지막 방이 진짜입니다. 사람 없을 때 가서 오래 앉아 있었어요.',
    createdAt: ago(1),
  },
  {
    _id: 'imp-002',
    event: 'evt-001',
    author: 'usr-minjae',
    text: '유리 작업 쪽은 조명 때문에 오후 3시쯤이 제일 좋았습니다. 오전엔 좀 어두워요.',
    createdAt: ago(2, 5),
  },
  {
    _id: 'imp-003',
    event: 'evt-001',
    author: 'usr-hayun',
    text: '생각보다 작아서 한 시간이면 충분해요. 근처 카페까지 묶어서 계획 짜시면 좋습니다.',
    createdAt: ago(4),
  },
  {
    _id: 'imp-004',
    event: 'evt-001',
    author: 'usr-seoyeon',
    text: '도슨트 시간 맞춰 가는 걸 추천합니다. 설명 듣고 보니까 완전히 다르게 보였어요.',
    createdAt: ago(6, 3),
  },
  {
    _id: 'imp-005',
    event: 'evt-001',
    author: 'usr-taeho',
    text: '평일 낮에 갔는데 거의 저 혼자였습니다. 조용히 보고 싶으면 평일이요.',
    createdAt: ago(9),
  },
  {
    _id: 'imp-006',
    event: 'evt-013',
    author: 'usr-me',
    text: '손 자국이 그대로 남은 그릇들이 좋았어요. 같이 본 분들이랑 한참 얘기했습니다.',
    createdAt: ago(3),
  },
  {
    _id: 'imp-007',
    event: 'evt-013',
    author: 'usr-hayun',
    text: '2층 아카이브 코너가 의외로 오래 걸립니다. 시간 넉넉히 두세요.',
    createdAt: ago(3, 2),
  },
  {
    _id: 'imp-008',
    event: 'evt-004',
    author: 'usr-doyul',
    text: '무료인데 규모가 꽤 큽니다. 점심시간에 잠깐 보기엔 좀 빠듯했어요.',
    createdAt: ago(5),
  },
  {
    _id: 'imp-009',
    event: 'evt-009',
    author: 'usr-eunbi',
    text: '두 번째 작품이 특히 좋았습니다. 끝나고 감독 얘기까지 들을 수 있어서 좋았어요.',
    createdAt: ago(7),
  },
  {
    _id: 'imp-010',
    event: 'evt-007',
    author: 'usr-jisu',
    text: '사진 크기가 커서 멀찍이서 봐야 합니다. 좁은 방은 좀 답답했어요.',
    createdAt: ago(8),
  },
]

export const impressionsOfEvent = (eventId) =>
  MOCK_IMPRESSIONS.filter((i) => i.event === eventId).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
