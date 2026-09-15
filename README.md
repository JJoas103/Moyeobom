# 모여봄 (MoyeoBom) — 서울 모임 플랫폼

> 실시간 혼잡도 기반으로 서울의 여유로운 동네에서 모임을 만들고 찾을 수 있는 위치 기반 플랫폼

---

## 🛠️ 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| View Engine | EJS, Bootstrap 5.3.3 |
| Authentication | Passport.js (Local, Google OAuth 2.0, Naver OAuth 2.0), bcrypt, express-session |
| Real-Time | Socket.IO |
| Scheduler | node-cron (10분 주기 혼잡도 갱신) |
| File Upload | Multer (프로필 5MB / 게시글 20MB, MIME 검증) |
| External API | axios — 카카오 로컬, 서울시 실시간 도시데이터, wttr.in 날씨 |
| Validation | express-validator |

---

## 🚀 실행 방법

1. **패키지 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   `.env_sample`을 참고하여 `.env` 파일 생성
   - `MONGODB_URI`, `SESSION_SECRET`
   - 카카오 REST API 키, 서울시 공공데이터 API 키
   - Google / Naver 소셜 로그인 Client ID & Secret

3. **시드 데이터 주입** (최초 실행 시)
   - `npm run seed:places`는 서울시 공공데이터 기반 121개 장소 목록 엑셀 파일이 필요합니다. 라이선스 조건상 파일 자체는 레포에 포함하지 않았으니, `.env`의 `EXCEL_PATH`에 직접 준비한 엑셀 파일의 경로를 지정해주세요.
   ```bash
   npm run seed:places
   npm run seed:parking
   ```

4. **서버 실행**
   ```bash
   npm run start   # node app.js
   npm run dev     # nodemon / localhost:3000
   ```
   ++react 마이그레이션 이후 react 서버도 별도로 구동 필요
   cd frontend
   npm run dev     # localhost:5173

---

## 📁 디렉터리 구조

```text
모여봄/
├── app.js               # Express 진입점, Socket.IO 바인딩
├── config/              # DB 연결, Multer, Passport 설정
├── controllers/         # 라우트별 비즈니스 로직
├── middlewares/         # 인증, 에러 처리, 유효성 검사
├── models/              # Mongoose 스키마 (12개)
├── routes/              # 라우터 정의
├── schedulers/          # 혼잡도 자동 갱신 (node-cron)
├── scripts/             # 초기 시딩용 수동 실행 스크립트 (장소, 주차장)
├── services/            # 외부 API 통신 및 DB 쿼리 로직
└── views/
    ├── error/           # 400, 404, 500
    ├── feed/            # 제보 (목록, 작성, 상세, 수정)
    ├── meeting/         # 모임 (목록, 개설, 상세, 수정)
    ├── member/          # 회원 (로그인, 가입, 마이페이지, 찜/알림, 탈퇴)
    ├── place/           # 장소 (검색 결과, 상세)
    ├── partials/        # 공통 헤더, 푸터
    └── index.ejs        # 메인 (지도, 랭킹)
```

---

## 🗂️ 흐름도 ↔ 파일 매핑

| 화면 흐름 | 담당 파일 |
|-----------|-----------|
| 메인 지도 (혼잡도 랭킹, 모임 마커) | `views/index.ejs` |
| 장소 검색 결과 / 전체 장소 / 한산한 명소 | `views/place/search_result.ejs` |
| 장소 상세 (혼잡도, 주차, 화장실, 날씨, 모임) | `views/place/place_info.ejs` |
| 모임 목록 / 모임 개설 | `views/meeting/list.ejs`, `write.ejs` |
| 모임 상세 / 참여 신청 | `views/meeting/info.ejs` |
| 제보 목록 / 제보 작성 / 제보 상세 | `views/feed/list.ejs`, `write.ejs`, `info.ejs` |
| 마이페이지 (활동 내역, 매너 점수, 뱃지) | `views/member/info.ejs` |
| 찜한 장소 / 알림 설정 | `views/member/favorites.ejs` |
| 로그인 / 회원가입 / 소셜 가입 | `views/member/login.ejs`, `join.ejs`, `social_join.ejs` |
| 회원정보 수정 / 탈퇴 | `views/member/modify.ejs`, `delete.ejs` |

---

## 🗄️ DB 컬렉션 (Models)

| Model | 용도 |
|-------|------|
| User | 계정, 프로필, 지역, 매너 점수, 알림 수신 설정 |
| Activity | 사용자 활동 이력 및 매너 점수 변동 기록 |
| Meeting | 모임 정보, 모집 상태(recruit/full/completed), 참여자 목록 |
| Feed | 실시간 지역 제보, 이미지, 추천(Like) |
| Comment | 범용 댓글 — 다형성 참조(`onModel`: Meeting/Feed/Board) |
| Board | 자유게시판 |
| Favorite | 장소 찜하기 (user + place_id 복합 유니크 인덱스) |
| VisitLog | 방문 인증 기록 (1일 1회 제한) |
| Notification | 알림 내역 (like/comment/badge/system), 읽음 여부 |
| Place | 관리 대상 장소, 좌표, 날씨 캐싱 |
| Congestion | 실시간 혼잡도, 예측 인구, 급증률(surge_pct) |
| ParkingInfo | 주차장 현황 |

---

## 📌 라우트 매핑

### 화면 렌더링 (GET)

| 경로 | 설명 | 인증 |
|------|------|------|
| `GET /` | 메인 페이지 | - |
| `GET /api/congestion` | 혼잡도 JSON API | - |
| `GET /place` | 전체 장소 리스트 | - |
| `GET /place/quiet` | 한산한 명소만 | - |
| `GET /place/search?keyword=` | 장소 검색 | - |
| `GET /place/:area_cd` | 장소 상세 | - |
| `GET /meeting/list` | 모임 목록 (필터링 지원) | - |
| `GET /meeting/write` | 모임 개설 폼 | ✓ |
| `GET /meeting/info/:id` | 모임 상세 | - |
| `GET /meeting/modify/:id` | 모임 수정 폼 | ✓ |
| `GET /feed/list` | 제보 목록 | - |
| `GET /feed/write` | 제보 작성 폼 | ✓ |
| `GET /feed/info/:id` | 제보 상세 | - |
| `GET /feed/modify/:id` | 제보 수정 폼 | ✓ |
| `GET /member/join` | 회원가입 | - |
| `GET /member/login` | 로그인 | - |
| `GET /member/social-join` | 소셜 추가 정보 입력 | - |
| `GET /member/info` | 마이페이지 | ✓ |
| `GET /member/favorites` | 찜 목록 / 알림 | ✓ |
| `GET /member/modify` | 회원정보 수정 | ✓ |
| `GET /member/delete` | 탈퇴 확인 | ✓ |
| `GET /member/check-email` | 이메일 중복 체크 API | - |
| `GET /member/logout` | 로그아웃 | - |
| `GET /auth/google` | 구글 로그인 | - |
| `GET /auth/naver` | 네이버 로그인 | - |

### 데이터 처리 (POST / PATCH / DELETE)

| 경로 | 설명 | 인증 | 비고 |
|------|------|------|------|
| `POST /member/join` | 회원가입 처리 | - | Multer (프로필) |
| `POST /member/login` | 로그인 처리 | - | Passport Local |
| `POST /member/social-join` | 소셜 가입 처리 | - | Multer (프로필) |
| `POST /member/modify` | 회원정보 수정 | ✓ | Multer (프로필) |
| `POST /member/delete` | 회원 탈퇴 | ✓ | 비밀번호 확인 |
| `POST /member/notify-settings` | 알림 설정 변경 | ✓ | |
| `PATCH /member/notifications/read` | 알림 읽음 처리 | ✓ | |
| `DELETE /member/notifications` | 알림 삭제 | ✓ | |
| `DELETE /member/notifications/read` | 읽은 알림 삭제 | ✓ | |
| `POST /meeting/write` | 모임 생성 | ✓ | Multer (이미지), Socket.IO 브로드캐스트 |
| `POST /meeting/modify/:id` | 모임 수정 | ✓ | 작성자만 |
| `POST /meeting/delete/:id` | 모임 삭제 | ✓ | 작성자만 |
| `POST /meeting/join/:id` | 모임 참가/취소 토글 | ✓ | |
| `POST /feed/write` | 제보 작성 | ✓ | Multer, Socket.IO + Notification |
| `POST /feed/modify/:id` | 제보 수정 | ✓ | 작성자만 |
| `POST /feed/delete/:id` | 제보 삭제 | ✓ | |
| `POST /feed/like/:id` | 제보 추천 | ✓ | 중복/본인 불가, Notification |
| `POST /comment/write` | 댓글 작성 | ✓ | Notification |
| `POST /comment/delete` | 댓글 삭제 | ✓ | |
| `POST /favorite/add` | 장소 찜하기 | ✓ | 중복 확인 |
| `POST /favorite/delete` | 찜 해제 | ✓ | |
| `POST /visit/verify` | 방문 인증 | ✓ | 1일 1회, 매너 점수 100점 상한 |

---

## 🎯 매너 점수 시스템

기본 50점에서 시작, 최대 100점. 모든 변동은 `Activity`에 기록됩니다.

| 점수 | 행동 |
|------|------|
| +5 | 모임 개설 |
| +2 | 모임 참가, 방문 인증, 추천 받음 |
| +1 | 제보 작성, 장소 찜하기 |
| +0.5 | 댓글 작성 |

---

## ⚡ 실시간 처리 (Socket.IO)

| 이벤트 | 발생 조건 | 대상 |
|--------|-----------|------|
| `newMeetingAlert` | 모임 생성 (현재 시간 ±1~2시간 이내) | 같은 동네 룸(`district`) |
| `newReportInDistrict` | 제보 작성 | 같은 동네 룸 |
| `newFeedAlert` | 제보 작성 | 동네 모임 참가자 + 알림 설정 켠 주민 개인 룸(`user:{id}`) |

---

## 🔄 백그라운드 스케줄러

| 스케줄러 | 주기 | 동작 |
|----------|------|------|
| `congestionScheduler.js` | 10분 (`*/10 * * * *`) | 서울시 실시간 도시데이터 API 호출 → `Congestion`, `Place` 컬렉션 갱신 |
