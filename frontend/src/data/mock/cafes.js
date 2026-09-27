// 2차 장소 후보 — 모임 상세의 "보고 나서 갈 곳" 칸에 쓰인다.
//
// 교수님이 "지도든 목록이든 데이터는 같다. 그걸 선택했을 때 뭘 보여줄 것인가"라고 물은
// 바로 그 자리다. 실제로는 행사 좌표를 기준으로 카카오 로컬 API(services/kakaoLocalService.js)가
// 주변 카페를 검색하고, 호스트가 한 곳을 고르면 확정된다.
// 응답 필드 이름(place_name / road_address_name / x / y / distance)을 카카오 그대로 쓴다.

const BY_AREA = {
  성동구: [
    { place_name: '성수 커피사일로', road_address_name: '서울 성동구 아차산로 103', x: '127.0561', y: '37.5447', distance: '180' },
    { place_name: '연무장 베이커리 동', road_address_name: '서울 성동구 연무장길 52', x: '127.0552', y: '37.5443', distance: '240' },
    { place_name: '서울숲 옆 노트', road_address_name: '서울 성동구 왕십리로 83', x: '127.0440', y: '37.5455', distance: '520' },
    { place_name: '성수 스탠딩바 오후', road_address_name: '서울 성동구 성수이로 66', x: '127.0575', y: '37.5432', distance: '610' },
  ],
  종로구: [
    { place_name: '대학로 카페 목요일', road_address_name: '서울 종로구 대학로 116', x: '127.0019', y: '37.5820', distance: '150' },
    { place_name: '혜화 책다방', road_address_name: '서울 종로구 대학로12길 25', x: '127.0031', y: '37.5833', distance: '300' },
    { place_name: '낙산 언덕 커피', road_address_name: '서울 종로구 창경궁로35길 8', x: '127.0048', y: '37.5811', distance: '470' },
    { place_name: '서촌 찻집 여백', road_address_name: '서울 종로구 자하문로7길 12', x: '126.9709', y: '37.5786', distance: '210' },
  ],
  중구: [
    { place_name: '정동 커피 한 잔', road_address_name: '서울 중구 정동길 34', x: '126.9744', y: '37.5651', distance: '190' },
    { place_name: '을지로 다방 삼층', road_address_name: '서울 중구 을지로 105', x: '126.9924', y: '37.5661', distance: '350' },
    { place_name: '덕수궁 돌담 베이커리', road_address_name: '서울 중구 서소문로 45', x: '126.9731', y: '37.5636', distance: '260' },
  ],
  마포구: [
    { place_name: '연남 골목 로스터리', road_address_name: '서울 마포구 성미산로 161', x: '126.9250', y: '37.5612', distance: '170' },
    { place_name: '경의선 숲길 커피', road_address_name: '서울 마포구 연남로 27', x: '126.9261', y: '37.5599', distance: '290' },
    { place_name: '홍대 작업실 카페', road_address_name: '서울 마포구 와우산로 94', x: '126.9235', y: '37.5533', distance: '410' },
  ],
}

const FALLBACK = [
  { place_name: '근처 카페 1', road_address_name: '행사장 도보 3분', x: '', y: '', distance: '220' },
  { place_name: '근처 카페 2', road_address_name: '행사장 도보 5분', x: '', y: '', distance: '380' },
  { place_name: '근처 카페 3', road_address_name: '행사장 도보 7분', x: '', y: '', distance: '540' },
]

export const cafesNear = (area) => BY_AREA[area] || FALLBACK
