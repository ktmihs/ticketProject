const { createErrorResponse } = require('../utils/response.util');

/**
 * 전역 에러 핸들러
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // ErrorResponse 객체인 경우
  if (err.statusCode) {
    return res.status(err.statusCode).json(
      createErrorResponse(err.code, err.message, err.statusCode, err.details)
    );
  }
  
  // 기타 예상치 못한 에러
  return res.status(500).json(
    createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
      500
    )
  );
}

/**
 * 404 핸들러
 */
function notFoundHandler(req, res) {
  res.status(404).json(
    createErrorResponse(
      'NOT_FOUND',
      '요청한 리소스를 찾을 수 없습니다',
      404
    )
  );
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
