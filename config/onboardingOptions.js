// 온보딩 설문의 선택지를 한 곳에서 정의한다.
// 화면(views/member/onboarding.ejs), 검증(onboardingController), 추천 매칭(recommendService)이
// 모두 이 파일을 참조하므로 선택지와 행사 태그가 어긋나지 않는다.

// 장르 — eventApiService.GENRE_MAP이 행사에 붙이는 태그와 문자열이 정확히 일치해야
// 추천 매칭이 동작한다. 선택지를 늘릴 때는 GENRE_MAP도 함께 확인할 것.
const GENRES = [
    '영화',
    '연극',
    '뮤지컬',
    '전시',
    '미술',
    '클래식',
    '콘서트',
    '국악',
    '무용',
    '축제',
    '체험',
    '역사'
];

// 취미 — 사용자가 말하기 쉬운 표현으로 받고, 내부에서 행사 태그로 펼친다.
// 예: '사진 찍기'를 고른 사람에게는 전시·미술 행사가 가산된다.
const HOBBY_TO_TAGS = {
    '사진 찍기': ['전시', '미술'],
    '음악 듣기': ['음악', '콘서트', '클래식'],
    '영화 보기': ['영화'],
    '공연 보기': ['공연', '연극', '뮤지컬'],
    '책 읽기': ['교육', '문화'],
    '산책·등산': ['자연', '축제'],
    '역사 탐방': ['역사', '문화'],
    '새로운 것 배우기': ['체험', '교육']
};

const HOBBIES = Object.keys(HOBBY_TO_TAGS);

// 성격 — 추천 점수에는 쓰지 않고, 모임 상세에서 서로를 소개할 때 보여준다.
// (성격으로 사람을 걸러내는 건 이 서비스가 하려는 일이 아니다)
const PERSONALITIES = [
    '조용한 편',
    '말이 많은 편',
    '먼저 다가가는 편',
    '들어주는 편',
    '계획적인 편',
    '즉흥적인 편'
];

// 시간대 — recommendService.timeSlotOf가 만들어 내는 문자열과 일치해야 한다
const TIME_SLOTS = ['평일낮', '평일저녁', '주말낮', '주말저녁'];

// 지역 — 서울 자치구. 행사 데이터의 GUNAME과 같은 표기를 쓴다.
const AREAS = [
    '종로구', '중구', '용산구', '성동구', '광진구',
    '동대문구', '중랑구', '성북구', '강북구', '도봉구',
    '노원구', '은평구', '서대문구', '마포구', '양천구',
    '강서구', '구로구', '금천구', '영등포구', '동작구',
    '관악구', '서초구', '강남구', '송파구', '강동구'
];

// 선택한 취미를 행사 태그로 펼친다 (추천 매칭용)
const expandHobbies = (hobbies = []) => {
    const tags = [];
    for (const hobby of hobbies) {
        const mapped = HOBBY_TO_TAGS[hobby];
        if (mapped) tags.push(...mapped);
    }
    return [...new Set(tags)];
};

// 폼으로 넘어온 값 중 정의된 선택지만 남긴다 (임의 값 주입 방지)
const sanitize = (value, allowed) => {
    let list = value || [];
    if (!Array.isArray(list)) list = [list];
    const allowedSet = new Set(allowed);
    return [...new Set(list.map(String).filter((v) => allowedSet.has(v)))];
};

module.exports = {
    GENRES,
    HOBBIES,
    HOBBY_TO_TAGS,
    PERSONALITIES,
    TIME_SLOTS,
    AREAS,
    expandHobbies,
    sanitize
};
