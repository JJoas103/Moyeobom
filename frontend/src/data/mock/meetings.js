// 목업 모임 데이터. models/Meeting.js 스키마를 따른다.
//
// 게시판과 다른 지점이 여기서 드러나야 한다 — 모든 모임이 event 를 참조하고,
// 제목·날짜·장소가 그 행사에서 따라온다. 빈 칸에 글을 쓰는 게 아니라 행사를 고르는 것이다.
//
// 참조하는 행사는 events.generated.json 의 실제 서울 문화행사다.
// 행사를 다시 수집하면(npm run mock:events) id 가 가리키는 행사가 달라지므로,
// 그때는 아래 제목·소개도 새 행사에 맞게 손봐야 한다.
//
//   evt-009  섬유기획전 [안식의 결]        전시 · 성동구 우란문화재단
//   evt-010  26세종시즌 [스미레 미용실]     연극 · 종로구 세종M씨어터
//   evt-013  강민수 달항아리 Moon Jar     전시 · 종로구 노화랑
//   evt-014  DDP 협력전시 [SPECTRUM]    전시 · 중구 DDP
//   evt-015  뮤지컬 [코드네임X]            뮤지컬 · 용산구 국립중앙박물관 극장 용
//   evt-030  경기시나위 [해금가락을 爲하다]    국악 · 종로구 서울돈화문국악당
//   evt-031  Autumn in Jazz           콘서트 · 서초구 재즈클럽 그루브
//   evt-033  2026 인사동 엔틱&아트페어      축제 · 종로구 인사동 일대

import { MOCK_EVENTS } from './events'

const DAY = 24 * 60 * 60 * 1000
const now = new Date()

const at = (dayOffset, hour = 21, minute = 30) => {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() + dayOffset * DAY + (hour * 60 + minute) * 60 * 1000).toISOString()
}

const eventOf = (id) => MOCK_EVENTS.find((e) => e._id === id)

const makeMeeting = (m) => {
  const event = eventOf(m.event)
  const participants = m.participants || []
  const full = participants.length >= m.maxParticipants
  const past = new Date(m.meetingDate) < now

  return {
    content: '',
    tags: [],
    afterPlace: null,
    completedAt: past ? m.meetingDate : null,
    ...m,
    // 화면에서 바로 쓰도록 행사를 펼쳐 둔다 (서버에서는 populate('event') 결과와 같은 모양)
    event,
    area: event ? event.area : m.area,
    participants,
    status: m.status || (past ? 'completed' : full ? 'full' : 'recruit'),
  }
}

export const MOCK_MEETINGS = [
  makeMeeting({
    _id: 'mtg-001',
    event: 'evt-009',
    title: '섬유전 보고 성수에서 커피',
    content: '우란1경부터 천천히 보고, 끝나고 근처에서 30분만 얘기하고 헤어져요. 처음 오셔도 괜찮습니다.',
    author: 'usr-jisu',
    meetingDate: at(2, 15, 0),
    maxParticipants: 4,
    participants: ['usr-jisu', 'usr-minjae'],
    tags: ['조용한카페', '관람후대화'],
  }),
  makeMeeting({
    _id: 'mtg-002',
    event: 'evt-009',
    title: '평일 저녁 관람 같이 가실 분',
    content: '퇴근하고 바로 갑니다. 관람부터 같이 하고 성수에서 가볍게 한 잔.',
    author: 'usr-hayun',
    meetingDate: at(4, 19, 0),
    maxParticipants: 3,
    participants: ['usr-hayun', 'usr-seoyeon', 'usr-taeho'],
    tags: ['관람동행'],
  }),
  makeMeeting({
    _id: 'mtg-003',
    event: 'evt-010',
    title: '연극 끝나고 여운 나누기',
    content: '세종M씨어터에서 보고 근처 맥주집으로 이동합니다. 결말 얘기 하고 싶어서 만듭니다.',
    author: 'usr-me',
    meetingDate: at(3, 21, 40),
    maxParticipants: 5,
    participants: ['usr-me', 'usr-doyul'],
    tags: ['뒤풀이', '결말토론'],
  }),
  makeMeeting({
    _id: 'mtg-004',
    event: 'evt-030',
    title: '해금 듣고 돈화문 골목 산책',
    content: '공연 한 시간 반, 끝나고 익선동까지 걸으면서 얘기해요.',
    author: 'usr-eunbi',
    meetingDate: at(5, 20, 40),
    maxParticipants: 4,
    participants: ['usr-eunbi'],
    tags: ['산책', '조용한모임'],
  }),
  makeMeeting({
    _id: 'mtg-005',
    event: 'evt-033',
    title: '아트페어 같이 돌 사람',
    content: '인사동 한 바퀴 천천히 돌고 점심 먹고 헤어져요. 여섯 명까지 받습니다.',
    author: 'usr-minjae',
    meetingDate: at(9, 11, 30),
    maxParticipants: 6,
    participants: ['usr-minjae', 'usr-jisu', 'usr-hayun'],
    tags: ['낮모임', '야외'],
  }),
  makeMeeting({
    _id: 'mtg-006',
    event: 'evt-015',
    title: '뮤지컬 보고 용산에서 한 마디씩',
    content: '공연 끝나고 로비에서 짧게 얘기하고 헤어지는 모임입니다.',
    author: 'usr-seoyeon',
    meetingDate: at(1, 21, 30),
    maxParticipants: 4,
    participants: ['usr-seoyeon', 'usr-taeho'],
    tags: ['공연후', '짧은대화'],
  }),
  makeMeeting({
    _id: 'mtg-007',
    event: 'evt-031',
    title: '재즈 듣고 서초 걷기',
    content: '공연 끝나고 한 바퀴. 늦어도 11시엔 해산합니다.',
    author: 'usr-doyul',
    meetingDate: at(7, 22, 0),
    maxParticipants: 4,
    participants: ['usr-doyul', 'usr-eunbi', 'usr-minjae', 'usr-hayun'],
    tags: ['공연후', '야간산책'],
  }),
  makeMeeting({
    _id: 'mtg-008',
    event: 'evt-014',
    title: 'DDP 전시 같이 보실 분',
    content: '갤러리문 쪽부터 보고 DDP 안에서 커피 한 잔 하려고요.',
    author: 'usr-taeho',
    meetingDate: at(4, 14, 0),
    maxParticipants: 5,
    participants: ['usr-taeho'],
    tags: ['전시', '낮모임'],
  }),
  makeMeeting({
    _id: 'mtg-009',
    event: 'evt-014',
    title: '무료 전시, 점심시간에 잠깐',
    content: '동대문 근처 직장인분들 환영합니다. 40분 보고 커피 한 잔.',
    author: 'usr-jisu',
    meetingDate: at(0, 12, 20),
    maxParticipants: 4,
    participants: ['usr-jisu', 'usr-me', 'usr-seoyeon'],
    tags: ['점심시간', '짧은모임'],
  }),
  // 이미 끝난 모임 — 감상 남기기 / 상호 매칭 진입점이 여기서 생긴다
  makeMeeting({
    _id: 'mtg-010',
    event: 'evt-013',
    title: '달항아리 보고 삼청동 한 바퀴',
    content: '천천히 보고 나와서 차 마셨어요.',
    author: 'usr-hayun',
    meetingDate: at(-1, 15, 0),
    maxParticipants: 4,
    participants: ['usr-hayun', 'usr-me', 'usr-jisu'],
    tags: ['전시', '산책'],
    afterPlace: {
      name: '삼청동 찻집 여백',
      address: '서울 종로구 삼청로 77',
      x: '126.9819',
      y: '37.5822',
      kakaoUrl: 'https://place.map.kakao.com/',
      confirmedAt: at(-2, 20, 0),
    },
  }),
]

export const meetingsOfEvent = (eventId) => MOCK_MEETINGS.filter((m) => m.event && m.event._id === eventId)
