// /api/* 전용 에러 핸들러
// 기존 errorHandler는 EJS 뷰(error/404 등)를 렌더링하므로,
// JSON을 기대하는 API 요청에는 적합하지 않아 별도로 분리.
const apiErrorHandler = (err, req, res, next) => {
  console.error(`[API ${req.method} ${req.originalUrl}]`);
  console.error(err.stack);

  let statusCode = err.status || 500;

  // 서비스 계층에서 "찾을 수 없습니다" 형태의 메시지로 던지는 에러는 404로 매핑
  if (!err.status && typeof err.message === "string" && err.message.includes("찾을 수 없습니다")) {
    statusCode = 404;
  }

  const message = err.message || "서버 오류가 발생했습니다";

  res.status(statusCode).json({ success: false, message });
};

module.exports = { apiErrorHandler };
