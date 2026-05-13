const config = require('../config');
const { Errors } = require('../utils/response.util');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Origin/Referer 헤더 검증 미들웨어 (CSRF 2차 방어선)
 *
 * SameSite=Strict 쿠키가 1차 방어이며, 이 미들웨어는 구형 브라우저나
 * 쿠키 없이 동작하는 공격 시나리오에 대한 추가 방어를 제공한다.
 *
 * 검증 규칙:
 * - GET/HEAD/OPTIONS는 검증 대상에서 제외
 * - Origin 헤더가 있으면 허용 목록과 비교
 * - Origin 없고 Referer 있으면 Referer의 origin 부분을 허용 목록과 비교
 * - 둘 다 없으면 통과 (서버 간 요청, 일부 프록시 등 정상 케이스 허용)
 */
function validateOrigin(req, res, next) {
	if (SAFE_METHODS.has(req.method)) {
		return next();
	}

	// X-Queue-Token 기반 엔드포인트는 쿠키 인증을 사용하지 않으므로 제외
	if (req.headers['x-queue-token']) {
		return next();
	}

	const allowedOrigins = [config.cors.origin].filter(Boolean);

	const originHeader = req.headers['origin'];
	const refererHeader = req.headers['referer'];

	if (originHeader) {
		if (!allowedOrigins.includes(originHeader)) {
			return next(Errors.FORBIDDEN('허용되지 않은 요청 출처입니다'));
		}
		return next();
	}

	if (refererHeader) {
		try {
			const refererOrigin = new URL(refererHeader).origin;
			if (!allowedOrigins.includes(refererOrigin)) {
				return next(Errors.FORBIDDEN('허용되지 않은 요청 출처입니다'));
			}
		} catch {
			return next(Errors.FORBIDDEN('유효하지 않은 Referer 헤더입니다'));
		}
		return next();
	}

	next();
}

module.exports = { validateOrigin };
