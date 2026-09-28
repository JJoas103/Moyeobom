// 행사 페이지에 쌓이는 감상 한 줄.
//
// 이게 "여운을 받는 그릇"이다. 모임에 못 들어간 사람도 여기엔 쓸 수 있고,
// 시간이 지날수록 행사 페이지가 두꺼워진다. 게시판과 다른 지점이 이 축적이라,
// 감상이 0개인 행사와 여러 개인 행사가 화면에서 확연히 달라 보여야 한다.
//
// 참조하는 행사는 events.generated.json 의 실제 서울 문화행사다.
// 다시 수집하면 id 가 가리키는 행사가 달라지므로 문장도 같이 손봐야 한다.
//
//   evt-009  섬유기획전 [안식의 결]   전시 · 성동구 우란문화재단
//   evt-013  강민수 달항아리 Moon Jar 전시 · 종로구 노화랑
//   evt-014  DDP 협력전시 [SPECTRUM] 전시 · 중구 DDP 갤러리문
//   evt-015  뮤지컬 [코드네임X]        뮤지컬 · 용산구
//   evt-010  연극 [스미레 미용실]      연극 · 종로구 세종M씨어터

const DAY = 24 * 60 * 60 * 1000
const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 60 * 60 * 1000).toISOString()

export const MOCK_IMPRESSIONS = [
  {
    _id: 'imp-001',
    event: 'evt-009',
    author: 'usr-jisu',
    text: '우란2경 안쪽 방이 진짜입니다. 사람 없을 때 가서 오래 앉아 있었어요.',
    createdAt: ago(1),
  },
  {
    _id: 'imp-002',
    event: 'evt-009',
    author: 'usr-minjae',
    text: '천 짜임을 가까이서 봐야 하는 작업이라 조명 밝은 오후가 나았습니다. 오전엔 좀 어두워요.',
    createdAt: ago(2, 5),
  },
  {
    _id: 'imp-003',
    event: 'evt-009',
    author: 'usr-hayun',
    text: '생각보다 작아서 한 시간이면 충분해요. 성수 카페까지 묶어서 계획 짜시면 좋습니다.',
    createdAt: ago(4),
  },
  {
    _id: 'imp-004',
    event: 'evt-009',
    author: 'usr-seoyeon',
    text: '무료인데 작품 수가 꽤 됩니다. 도슨트 시간 맞춰 가면 완전히 다르게 보여요.',
    createdAt: ago(6, 3),
  },
  {
    _id: 'imp-005',
    event: 'evt-009',
    author: 'usr-taeho',
    text: '평일 낮에 갔는데 거의 저 혼자였습니다. 조용히 보고 싶으면 평일이요.',
    createdAt: ago(9),
  },
  {
    _id: 'imp-006',
    event: 'evt-013',
    author: 'usr-me',
    text: '손 자국이 그대로 남은 항아리들이 좋았어요. 같이 본 분들이랑 한참 얘기했습니다.',
    createdAt: ago(3),
  },
  {
    _id: 'imp-007',
    event: 'evt-013',
    author: 'usr-hayun',
    text: '2층이 의외로 오래 걸립니다. 시간 넉넉히 두고 가세요.',
    createdAt: ago(3, 2),
  },
  {
    _id: 'imp-008',
    event: 'evt-014',
    author: 'usr-doyul',
    text: 'DDP 안에서 길 찾기가 좀 어려웠어요. 갤러리문 쪽 입구로 바로 가시는 게 빠릅니다.',
    createdAt: ago(5),
  },
  {
    _id: 'imp-009',
    event: 'evt-015',
    author: 'usr-eunbi',
    text: '극장 용은 좌석 경사가 좋아서 뒷자리도 잘 보였습니다. 끝나고 박물관도 잠깐 돌기 좋아요.',
    createdAt: ago(7),
  },
  {
    _id: 'imp-010',
    event: 'evt-010',
    author: 'usr-jisu',
    text: '1막이 조금 느린데 2막에서 다 풀립니다. 끝나고 얘기할 게 많은 작품이었어요.',
    createdAt: ago(8),
  },
]

export const impressionsOfEvent = (eventId) =>
  MOCK_IMPRESSIONS.filter((i) => i.event === eventId).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
