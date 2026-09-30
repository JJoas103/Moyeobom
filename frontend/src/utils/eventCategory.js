// 행사 분류 표기.
//
// 서울 문화행사 API 의 CODENAME 은 화면에 그대로 쓰기 어렵다 — "뮤지컬/오페라",
// "축제-문화/예술", "독주/독창회" 처럼 길고, 칩으로 늘어놓으면 필터가 목록보다 커진다.
// 시안 v2 는 여섯 갈래로 접어 쓰고 있어(공연 · 연극 · 영화 · 전시 · 축제 · 클래식 · 국악)
// 그 표를 여기 둔다. 원본 CODENAME 은 버리지 않는다 — 상세의 "분류" 줄과 비슷한 행사
// 조회(searchEvents 가 category 를 regex 로 매칭한다)가 원본을 쓴다.

/** 필터 칩에 놓는 순서. 시안의 cats 배열과 같다 */
export const CATEGORY_GROUPS = ['공연', '연극', '영화', '전시', '축제', '클래식 · 국악']

const GROUP_BY_CODENAME = {
  연극: '연극',
  '뮤지컬/오페라': '공연',
  콘서트: '공연',
  무용: '공연',
  클래식: '클래식 · 국악',
  국악: '클래식 · 국악',
  '독주/독창회': '클래식 · 국악',
  '전시/미술': '전시',
  영화: '영화',
}

/** CODENAME → 표시 분류. 축제-* 는 접두사로 묶고, 나머지는 기타 */
export function categoryGroup(codename = '') {
  const name = codename.trim()
  if (GROUP_BY_CODENAME[name]) return GROUP_BY_CODENAME[name]
  if (name.startsWith('축제')) return '축제'
  return '기타'
}

// 분류 점의 색. 공연 계열은 하나로 묶는다 — 점 색이 여섯 가지면 구분이 안 된다
const COLOR_BY_GROUP = {
  공연: 'var(--cat-stage)',
  연극: 'var(--cat-stage)',
  '클래식 · 국악': 'var(--cat-stage)',
  전시: 'var(--cat-exhibit)',
  축제: 'var(--cat-festival)',
}

/** 표시 분류 → 점 색 CSS 변수 */
export function categoryColor(group) {
  return COLOR_BY_GROUP[group] || 'var(--cat-etc)'
}

// 포스터 오버레이 위쪽의 작은 영문. 포스터가 없는 행사에서 면이 비지 않게 하는 장식이라
// 원본 CODENAME 단위로 구분해 둔다 (뮤지컬과 콘서트가 같은 '공연'이어도 글자는 달라야 한다)
const ENG_BY_CODENAME = {
  연극: 'PLAY',
  '뮤지컬/오페라': 'MUSICAL',
  콘서트: 'CONCERT',
  무용: 'DANCE',
  클래식: 'CLASSIC',
  국악: 'GUGAK',
  '독주/독창회': 'RECITAL',
  '전시/미술': 'EXHIBITION',
  영화: 'FILM',
  '교육/체험': 'PROGRAM',
}

/** CODENAME → 포스터에 얹는 영문 라벨 */
export function categoryEng(codename = '') {
  const name = codename.trim()
  if (ENG_BY_CODENAME[name]) return ENG_BY_CODENAME[name]
  if (name.startsWith('축제')) return 'FESTIVAL'
  return 'EVENT'
}

/**
 * 상세 브레드크럼에 쓰는 세부 분류.
 * "뮤지컬/오페라" 처럼 슬래시로 둘을 붙여 둔 CODENAME 은 앞쪽만 쓴다.
 * 표시 분류와 같으면(연극 · 영화) 중복이라 빈 문자열을 준다.
 */
export function categoryDetail(codename = '') {
  const name = codename.trim()
  const group = categoryGroup(name)
  const detail = name.startsWith('축제-') ? name.slice(3) : name.split('/')[0]
  return detail && detail !== group ? detail : ''
}
