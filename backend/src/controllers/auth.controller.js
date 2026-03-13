const jwtUtil = require('../utils/jwt.util');
const { createSuccessResponse, Errors } = require('../utils/response.util');
const config = require('../config');

const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: config.nodeEnv === 'production',
	sameSite: 'lax',
	path: '/',
};

async function login(req, res, next) {
	try {
		const { email, password } = req.body;
		if (!email || !password)
			throw Errors.INVALID_REQUEST({ field: 'email or password' });

		const userId = `user_${Buffer.from(email).toString('base64').slice(0, 8)}`;
		const user = { userId, email, role: 'user' };

		const accessToken = jwtUtil.generateAccessToken(user);
		const refreshToken = jwtUtil.generateRefreshToken({ userId });

		res.cookie('accessToken', accessToken, {
			...COOKIE_OPTIONS,
			maxAge: 15 * 60 * 1000,
		});
		res.cookie('refreshToken', refreshToken, {
			...COOKIE_OPTIONS,
			maxAge: 7 * 24 * 60 * 60 * 1000,
			path: '/api/auth/refresh',
		});

		res.json(createSuccessResponse({ userId, email, role: 'user' }));
	} catch (error) {
		next(error);
	}
}

async function logout(req, res, next) {
	res.clearCookie('accessToken', { path: '/' });
	res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
	res.json(createSuccessResponse({ message: '로그아웃 완료' }));
}

async function getMe(req, res, next) {
	try {
		const token = req.cookies?.accessToken;

		// 쿠키 없으면 에러 대신 null 반환 — 앱 초기화 시 로그인 안 된 상태가 정상
		if (!token) {
			return res.json(createSuccessResponse(null));
		}

		let decoded;
		try {
			decoded = jwtUtil.verifyToken(token);
		} catch {
			// 토큰 만료/위조 시에도 조용히 null 반환
			res.clearCookie('accessToken');
			return res.json(createSuccessResponse(null));
		}

		res.json(
			createSuccessResponse({
				userId: decoded.sub,
				email: decoded.email,
				role: decoded.role,
			}),
		);
	} catch (error) {
		next(error);
	}
}

module.exports = { login, logout, getMe };
