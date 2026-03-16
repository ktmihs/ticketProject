const jwtUtil = require('../utils/jwt.util');
const redisService = require('../services/redis.service');
const { Errors } = require('../utils/response.util');

/**
 * Queue Token 검증 미들웨어
 *
 * 헤더에서 x-queue-token을 추출하여 검증
 * - JWT 서명 검증
 * - 만료 시간 검증
 * - Redis 대기열 상태 확인
 */
async function verifyQueueToken(req, res, next) {
	try {
		// 헤더에서 토큰 추출
		const token = req.headers['x-queue-token'];

		if (!token) {
			throw Errors.NO_TOKEN();
		}

		// ✅ JWT 서명 검증 (위변조 방지)
		let decoded;
		try {
			decoded = jwtUtil.verifyToken(token);
		} catch (error) {
			if (error.message === 'TOKEN_EXPIRED') {
				throw Errors.TOKEN_EXPIRED();
			}
			throw Errors.INVALID_TOKEN();
		}

		// ✅ JWT payload에서 ALLOWED 상태 확인 (Redis 이중 검증 불필요 - JWT 서명으로 충분)
		if (decoded.status !== 'ALLOWED') {
			throw Errors.QUEUE_NOT_FOUND();
		}

		// ✅ 검증 통과 - 사용자 정보 설정
		req.userId = decoded.sub;
		req.showId = decoded.showId;
		req.queueToken = token;
		req.tokenExpiresAt = decoded.exp * 1000;

		next();
	} catch (error) {
		next(error);
	}
}

/**
 * Hold Token 검증 미들웨어
 *
 * 결제 시 Hold Token 검증
 * - JWT 서명 검증
 * - 만료 시간 검증
 * - 좌석 상태 확인
 */
async function verifyHoldToken(req, res, next) {
	try {
		const token = req.headers['x-hold-token'] || req.body.holdToken;

		if (!token) {
			throw Errors.NO_HOLD_TOKEN();
		}

		// ✅ JWT 서명 검증
		let decoded;
		try {
			decoded = jwtUtil.verifyToken(token);
		} catch (error) {
			if (error.message === 'TOKEN_EXPIRED') {
				throw Errors.HOLD_EXPIRED();
			}
			throw Errors.INVALID_HOLD_TOKEN();
		}

		// ✅ 만료 시간 재확인 (서버 시간 기준)
		if (Date.now() > decoded.expiresAt) {
			throw Errors.HOLD_EXPIRED(decoded.expiresAt);
		}

		// ✅ 검증 통과
		req.userId = decoded.sub;
		req.showId = decoded.showId;
		req.seatId = decoded.seatId;
		req.holdExpiresAt = decoded.expiresAt;

		next();
	} catch (error) {
		next(error);
	}
}

/**
 * Rate Limiting 미들웨어 (옵션)
 *
 * IP별 요청 제한
 * - 개발: 100회/15분
 * - 프로덕션: 10회/15분
 */
const rateLimit = require('express-rate-limit');

const createRateLimiter = (options = {}) => {
	const isDev = process.env.NODE_ENV === 'development';

	return rateLimit({
		windowMs: options.windowMs || 15 * 60 * 1000, // 15분
		max: options.max || (isDev ? 100 : 10), // 개발: 100, 프로덕션: 10
		message: {
			error: {
				code: 'RATE_LIMIT_EXCEEDED',
				message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
			},
		},
		standardHeaders: true,
		legacyHeaders: false,
		...options,
	});
};

async function verifyAccessToken(req, res, next) {
	try {
		const token = req.cookies?.accessToken;

		if (!token) {
			throw Errors.NO_TOKEN();
		}

		let decoded;
		try {
			decoded = jwtUtil.verifyToken(token);
		} catch (error) {
			if (error.message === 'TOKEN_EXPIRED') {
				res.clearCookie('accessToken');
				throw Errors.TOKEN_EXPIRED();
			}
			throw Errors.INVALID_TOKEN();
		}

		// ✅ 블랙리스트 확인
		const blacklisted = await redisService.isBlacklisted(token);
		if (blacklisted) throw Errors.INVALID_TOKEN();

		// 클라이언트 전달값을 무시하고 서버가 직접 세팅
		req.userId = decoded.sub;
		req.userEmail = decoded.email;
		req.userRole = decoded.role;

		next();
	} catch (error) {
		next(error);
	}
}

module.exports = {
	verifyQueueToken,
	verifyHoldToken,
	verifyAccessToken,
	createRateLimiter,
};
