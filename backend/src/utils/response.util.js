const { v4: uuidv4 } = require('uuid');

class ErrorResponse extends Error {
  constructor(code, message, statusCode = 500, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 표준 에러 응답 생성
 */
function createErrorResponse(code, message, statusCode, details = null) {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: Date.now(),
    requestId: uuidv4(),
  };
}

/**
 * 표준 성공 응답 생성
 */
function createSuccessResponse(data, statusCode = 200) {
  return {
    data,
    timestamp: Date.now(),
  };
}

// 미리 정의된 에러들
const Errors = {
  // 공통
  INVALID_REQUEST: (details) => 
    new ErrorResponse('INVALID_REQUEST', '잘못된 요청입니다', 400, details),
  UNAUTHORIZED: () => 
    new ErrorResponse('UNAUTHORIZED', '인증이 필요합니다. 다시 로그인해주세요', 401),
  FORBIDDEN: (message = '권한이 없습니다') => 
    new ErrorResponse('FORBIDDEN', message, 403),
  NOT_FOUND: (resource = '리소스') => 
    new ErrorResponse('NOT_FOUND', `${resource}를 찾을 수 없습니다`, 404),
  RATE_LIMIT_EXCEEDED: (retryAfter = 1) => 
    new ErrorResponse('RATE_LIMIT_EXCEEDED', '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요', 429, { retryAfter }),
  INTERNAL_SERVER_ERROR: () => 
    new ErrorResponse('INTERNAL_SERVER_ERROR', '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요', 500),
  SERVICE_UNAVAILABLE: (retryAfter = 30) => 
    new ErrorResponse('SERVICE_UNAVAILABLE', '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요', 503, { retryAfter }),

  // 인증 토큰
  NO_TOKEN: () =>
    new ErrorResponse('NO_TOKEN', '대기열 토큰이 없습니다. 대기열에 다시 진입해주세요', 401),
  NO_HOLD_TOKEN: () =>
    new ErrorResponse('NO_HOLD_TOKEN', '좌석 선점 토큰이 없습니다', 401),
  INVALID_TOKEN: () =>
    new ErrorResponse('INVALID_TOKEN', '유효하지 않은 토큰입니다', 401),
  TOKEN_EXPIRED: () =>
    new ErrorResponse('TOKEN_EXPIRED', '토큰이 만료되었습니다. 대기열에 다시 진입해주세요', 401),

  // 대기열
  INVALID_QUEUE_TOKEN: () => 
    new ErrorResponse('INVALID_QUEUE_TOKEN', '유효하지 않은 대기열 토큰입니다. 다시 진입해주세요', 401),
  QUEUE_TOKEN_EXPIRED: () => 
    new ErrorResponse('QUEUE_TOKEN_EXPIRED', '대기열 토큰이 만료되었습니다', 401),
  QUEUE_NOT_FOUND: () =>
    new ErrorResponse('QUEUE_NOT_FOUND', '대기열 정보를 찾을 수 없습니다. 다시 진입해주세요', 404),
  ALREADY_IN_QUEUE: (position) => 
    new ErrorResponse('ALREADY_IN_QUEUE', '이미 대기열에 진입했습니다', 409, { currentPosition: position }),
  QUEUE_NOT_ALLOWED: (currentStatus, position) => 
    new ErrorResponse('QUEUE_NOT_ALLOWED', '대기 후 이용 가능합니다', 403, { currentStatus, position }),
  QUEUE_BLOCKED: () => 
    new ErrorResponse('QUEUE_BLOCKED', '부정 행위로 차단되었습니다', 403),
  QUEUE_EXPIRED: () => 
    new ErrorResponse('QUEUE_EXPIRED', '구매 허용 시간이 만료되었습니다', 410),

  // 좌석/구매
  SHOW_NOT_FOUND: (showId) => 
    new ErrorResponse('SHOW_NOT_FOUND', '존재하지 않는 공연입니다', 404, { showId }),
  SEAT_NOT_FOUND: (seatId) => 
    new ErrorResponse('SEAT_NOT_FOUND', '존재하지 않는 좌석입니다', 404, { seatId }),
  SEAT_ALREADY_HOLDING: (seatId, holdUntil) => 
    new ErrorResponse('SEAT_ALREADY_HOLDING', '다른 사용자가 이미 선점한 좌석입니다', 409, { seatId, holdUntil }),
  SEAT_SOLD: (seatId) => 
    new ErrorResponse('SEAT_SOLD', '이미 판매된 좌석입니다', 409, { seatId }),
  USER_ALREADY_HOLDING: () => 
    new ErrorResponse('USER_ALREADY_HOLDING', '이미 다른 좌석을 선점 중입니다', 409),
  SOLD_OUT: () => 
    new ErrorResponse('SOLD_OUT', '티켓이 매진되었습니다', 404),
  ALREADY_PURCHASED: () => 
    new ErrorResponse('ALREADY_PURCHASED', '이미 구매한 공연입니다', 409),
  INVALID_QUANTITY: (min, max) => 
    new ErrorResponse('INVALID_QUANTITY', `수량은 ${min}~${max} 사이여야 합니다`, 400, { min, max }),
  INVALID_HOLD_TOKEN: () => 
    new ErrorResponse('INVALID_HOLD_TOKEN', '유효하지 않은 선점 토큰입니다', 400),
  HOLD_TOKEN_EXPIRED: () => 
    new ErrorResponse('HOLD_TOKEN_EXPIRED', '선점 토큰이 만료되었습니다', 401),
  HOLD_EXPIRED: (expiredAt) => 
    new ErrorResponse('HOLD_EXPIRED', '좌석 선점 시간이 만료되었습니다. 다시 선택해주세요', 410, { expiredAt }),
  PAYMENT_FAILED: (pgResponse) => 
    new ErrorResponse('PAYMENT_FAILED', '결제에 실패했습니다', 422, { pgResponse }),
  INVALID_PAYMENT_INFO: () => 
    new ErrorResponse('INVALID_PAYMENT_INFO', '결제 정보가 올바르지 않습니다', 400),
};

module.exports = {
  ErrorResponse,
  createErrorResponse,
  createSuccessResponse,
  Errors,
};
