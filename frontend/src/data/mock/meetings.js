// 목업 모임 데이터. models/Meeting.js 스키마를 따른다.
//
// 게시판과 다른 지점이 여기서 드러나야 한다 — 모든 모임이 event 를 참조하고,
// 제목·날짜·장소가 그 행사에서 따라온다. 빈 칸에 글을 쓰는 게 아니라 행사를 고르는 것이다.

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
    event: 'evt-001',
    title: '전시 보고 커피 한 잔',
    content: '2층 소재관이 제일 좋았어요. 보고 나서 30분만 얘기하고 헤어져요. 처음 오셔도 괜찮습니다.',
    author: 'usr-jisu',
    meetingDate: at(2, 15, 0),
    maxParticipants: 4,
    participants: ['usr-jisu', 'usr-minjae'],
    tags: ['조용한카페', '관람후대화'],
  }),
  makeMeeting({
    _id: 'mtg-002',
    event: 'evt-001',
    title: '평일 저녁 관람 같이 가실 분',
    content: '퇴근하고 바로 갑니다. 관람부터 같이 하고 근처에서 가볍게 한 잔.',
    author: 'usr-hayun',
    meetingDate: at(4, 19, 0),
    maxParticipants: 3,
    participants: ['usr-hayun', 'usr-seoyeon', 'usr-taeho'],
    tags: ['관람동행'],
  }),
  makeMeeting({
    _id: 'mtg-003',
    event: 'evt-002',
    title: '연극 끝나고 여운 나누기',
    content: '대학로에서 보고 근처 맥주집으로 이동합니다. 결말 얘기 하고 싶어서 만듭니다.',
    author: 'usr-me',
    meetingDate: at(3, 21, 40),
    maxParticipants: 5,
    participants: ['usr-me', 'usr-doyul'],
    tags: ['뒤풀이', '결말토론'],
  }),
  makeMeeting({
    _id: 'mtg-004',
    event: 'evt-003',
    title: '실내악 듣고 서촌 산책',
    content: '공연 1시간 40분, 끝나고 서촌 골목 걸으면서 얘기해요.',
    author: 'usr-eunbi',
    meetingDate: at(5, 18, 40),
    maxParticipants: 4,
    participants: ['usr-eunbi'],
    tags: ['산책', '조용한모임'],
  }),
  makeMeeting({
    _id: 'mtg-005',
    event: 'evt-005',
    title: '재즈 페스티벌 돗자리 팀',
    content: '돗자리랑 간식 챙겨갑니다. 여섯 명까지 받아요.',
    author: 'usr-minjae',
    meetingDate: at(9, 18, 0),
    maxParticipants: 6,
    participants: ['usr-minjae', 'usr-jisu', 'usr-hayun'],
    tags: ['야외', '피크닉'],
  }),
  makeMeeting({
    _id: 'mtg-006',
    event: 'evt-009',
    title: '첫 장편들 보고 한 마디씩',
    content: '두 편 연속 보고 로비에서 짧게 얘기하고 헤어지는 모임입니다.',
    author: 'usr-seoyeon',
    meetingDate: at(1, 16, 30),
    maxParticipants: 4,
    participants: ['usr-seoyeon', 'usr-taeho'],
    tags: ['영화', '짧은대화'],
  }),
  makeMeeting({
    _id: 'mtg-007',
    event: 'evt-012',
    title: '어쿠스틱 듣고 홍대 걷기',
    content: '공연 끝나고 홍대 골목 한 바퀴. 늦어도 11시엔 해산합니다.',
    author: 'usr-doyul',
    meetingDate: at(7, 22, 0),
    maxParticipants: 4,
    participants: ['usr-doyul', 'usr-eunbi', 'usr-minjae', 'usr-hayun'],
    tags: ['공연후', '야간산책'],
  }),
  makeMeeting({
    _id: 'mtg-008',
    event: 'evt-011',
    title: '책축제 같이 돌 사람',
    content: '오전에 천천히 돌고 점심 먹고 헤어져요.',
    author: 'usr-taeho',
    meetingDate: at(4, 11, 30),
    maxParticipants: 5,
    participants: ['usr-taeho'],
    tags: ['낮모임', '책'],
  }),
  makeMeeting({
    _id: 'mtg-009',
    event: 'evt-004',
    title: '무료 전시, 점심시간에 잠깐',
    content: '시청 근처 직장인분들 환영합니다. 40분 보고 커피 한 잔.',
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
    title: '도자전 보고 삼청동 한 바퀴',
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
