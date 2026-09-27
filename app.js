require("dotenv").config();
const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDB = require("./config/database");
const session = require("express-session");
const passport = require("./config/passport");
const { errorHandler, notFoundHandler } = require("./middlewares/errorMiddleware");
const { apiErrorHandler } = require("./middlewares/apiErrorMiddleware");

const app = express();

const server = http.createServer(app);

// React(Vite) 개발 서버에서도 실시간 알림 소켓에 연결할 수 있도록 위의 Express cors 설정과 동일한 origin을 허용
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

app.set("io", io);

// DB 연결
connectDB();

// 혼잡도 자동 갱신 스케줄러 (10분 간격, 서울 실시간 API → MongoDB)
const congestionScheduler = require('./schedulers/congestionScheduler');
congestionScheduler.start();

// chrome 개발자 도구 켰을 때 뜨는 오류 무시
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => {
  res.status(204).end(); // 콘텐트 없음으로 정상 응답 처리
});

// 뷰 엔진
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 미들웨어
// React(Vite) 개발 서버에서 /api/* 로 오는 요청을 허용 (기존 EJS 렌더링 경로는 영향 없음)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 세션
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret_key",
    resave: false,
    saveUninitialized: false,
  }),
);

// 패스포트
app.use(passport.initialize());
app.use(passport.session());

const Notification = require("./models/Notification");

// 전역 변수
app.use(async (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.unreadNotificationCount = 0;

  if (req.user) {
    try {
      const count = await Notification.countDocuments({ user: req.user.id, isRead: false });
      res.locals.unreadNotificationCount = count;
    } catch (err) {
      console.error("알림 개수 조회 에러:", err);
    }
  }

  // 날짜 포맷터 추가
  res.locals.formatMeetingDate = (date) => {
    if (!date) return "";
    const now = new Date();
    const target = new Date(date);

    // 날짜 부분만 비교하기 위해 시간 초기화
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffTime = targetDay - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const timeStr = target.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

    if (diffDays === 0) return `오늘 ${timeStr}`;
    if (diffDays === 1) return `내일 ${timeStr}`;
    if (diffDays > 1 && diffDays < 7) {
      return `${dayNames[target.getDay()]} ${timeStr}`;
    }
    if (diffDays >= 7 && diffDays < 14) {
      return `다음주 ${dayNames[target.getDay()]} ${timeStr}`;
    }
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")} ${timeStr}`;
  };

  next();
});

// 라우터
const mainRouter = require("./routes/mainRouter");
const userRouter = require("./routes/userRouter");
const meetingRouter = require("./routes/meetingRouter");
const feedRouter = require("./routes/feedRouter");
const commentRouter = require("./routes/commentRouter");
const authRouter = require("./routes/authRouter");
const placeRouter = require("./routes/placeRouter");
const favoriteRouter = require("./routes/favoriteRouter");
const visitRouter = require("./routes/visitRouter");
// React 프론트엔드용 JSON API 라우터 (기존 EJS 라우터와 별개로 병행 운영)
const meetingApiRouter = require("./routes/api/meetingApiRouter");
const authApiRouter = require("./routes/api/authApiRouter");
const memberApiRouter = require("./routes/api/memberApiRouter");
const placeApiRouter = require("./routes/api/placeApiRouter");
const feedApiRouter = require("./routes/api/feedApiRouter");
const commentApiRouter = require("./routes/api/commentApiRouter");

app.use("/", mainRouter);
app.use("/member", userRouter);
app.use("/meeting", meetingRouter);
app.use("/feed", feedRouter);
app.use("/comment", commentRouter);
app.use("/auth", authRouter);
app.use("/place", placeRouter);
app.use("/favorite", favoriteRouter);
app.use("/visit", visitRouter);
app.use("/api/meeting", meetingApiRouter);
app.use("/api/auth", authApiRouter);
app.use("/api/member", memberApiRouter);
app.use("/api/place", placeApiRouter);
app.use("/api/feed", feedApiRouter);
app.use("/api/comment", commentApiRouter);

// Socket.IO 연결
io.on("connection", (socket) => {
  console.log("소켓 연결됨:", socket.id);
  // 동네 기준 방 입장
  socket.on("joinDistrict", (district) => {
    if (!district) return;
    socket.join(district);
    console.log(`${socket.id} 사용자가 ${district} 방에 입장`);
  });
  // 사용자 개인 방 입장
  socket.on("joinUser", (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`${socket.id} 사용자가 user:${userId} 방에 입장`);
  });
  socket.on("disconnect", () => {
    console.log("소켓 연결 해제:", socket.id);
  });
});

// 에러 핸들링
app.use(notFoundHandler);
app.use("/api", apiErrorHandler); // /api/* 요청은 EJS 대신 JSON으로 에러 응답
app.use(errorHandler);

// 포트 설정 (로그를 더 자세히 찍도록 변경)
const PORT = 3000;
server
  .listen(PORT, "0.0.0.0", () => {
    console.log(`서버 실행 중: http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`오류: ${PORT}번 포트가 이미 사용 중입니다.`);
    } else {
      console.error("서버 시작 중 오류 발생:", err);
    }
  });
