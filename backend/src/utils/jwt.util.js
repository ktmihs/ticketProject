const jwt = require('jsonwebtoken');
const config = require('../config');

class JWTService {
  /**
   * Queue Token 생성
   * @param {Object} payload - { userId, showId, position, status }
   * @returns {string} - JWT 토큰
   */
  generateQueueToken(payload) {
    // ALLOWED 상태이면 allowedUntil 기준으로 만료 시간 설정
    const expiresIn = payload.status === 'ALLOWED' ? '15m' : '60m';

    return jwt.sign(
      {
        sub: payload.userId,
        showId: payload.showId,
        position: payload.position || 0,
        status: payload.status || 'WAITING',
        ...(payload.allowedUntil && { allowedUntil: payload.allowedUntil }),
      },
      config.jwt.secret,
      {
        expiresIn,
      }
    );
  }

  /**
   * Hold Token 생성
   * @param {Object} payload - { userId, showId, seatId }
   * @returns {string} - JWT 토큰
   */
  generateHoldToken(payload) {
    const expiresAt = Date.now() + config.queue.holdTimeoutSeconds * 1000;
    
    return jwt.sign(
      {
        sub: payload.userId,
        showId: payload.showId,
        seatId: payload.seatId,
        expiresAt,
      },
      config.jwt.secret,
      {
        expiresIn: `${config.queue.holdTimeoutSeconds}s`,
      }
    );
  }

  /**
   * 인증 토큰 생성 (Access Token)
   * @param {Object} payload - { userId, email, role }
   * @returns {string} - JWT 토큰
   */
  generateAccessToken(payload) {
    return jwt.sign(
      {
        sub: payload.userId,
        email: payload.email,
        role: payload.role || 'user',
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      }
    );
  }

  /**
   * Refresh Token 생성
   * @param {Object} payload - { userId }
   * @returns {string} - JWT 토큰
   */
  generateRefreshToken(payload) {
    return jwt.sign(
      {
        sub: payload.userId,
        type: 'refresh',
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.refreshExpiresIn,
      }
    );
  }

  /**
   * 토큰 검증
   * @param {string} token - JWT 토큰
   * @returns {Object} - 디코딩된 payload
   * @throws {Error} - 토큰이 유효하지 않으면 예외 발생
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('TOKEN_EXPIRED');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('INVALID_TOKEN');
      }
      throw error;
    }
  }

  /**
   * 토큰 디코딩 (검증 없이)
   * @param {string} token - JWT 토큰
   * @returns {Object|null} - 디코딩된 payload
   */
  decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new JWTService();
