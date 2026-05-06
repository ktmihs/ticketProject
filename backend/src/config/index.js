require('dotenv').config();

const REQUIRED_ENV_VARS_IN_PROD = [
	'JWT_ACCESS_SECRET',
	'JWT_REFRESH_SECRET',
	'JWT_QUEUE_SECRET',
	'JWT_HOLD_SECRET',
];

// 미설정 시 서버 시작을 중단하여 취약한 기본값으로 운영되는 사고를 방지
if (process.env.NODE_ENV === 'production') {
	const missing = REQUIRED_ENV_VARS_IN_PROD.filter(key => !process.env[key]);
	if (missing.length > 0) {
		console.error(
			'❌ 필수 환경변수가 설정되지 않았습니다:',
			missing.join(', '),
		);
		process.exit(1);
	}
}

module.exports = {
	port: process.env.PORT || 3001,
	nodeEnv: process.env.NODE_ENV || 'development',

	redis: {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379'),
		password: process.env.REDIS_PASSWORD || undefined,
	},

	jwt: {
		accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-key',
		refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
		queueSecret: process.env.JWT_QUEUE_SECRET || 'dev-queue-secret-key',
		holdSecret: process.env.JWT_HOLD_SECRET || 'dev-hold-secret-key',
		expiresIn: process.env.JWT_EXPIRES_IN || '15m',
		refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
	},

	cors: {
		origin: process.env.FRONTEND_URL || 'http://localhost:3000',
		credentials: true,
	},

	queue: {
		allowedPerMinute: parseInt(process.env.QUEUE_ALLOWED_PER_MINUTE || '100'),
		holdTimeoutSeconds: parseInt(process.env.HOLD_TIMEOUT_SECONDS || '300'),
	},

	rateLimit: {
		windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000'),
		maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
	},
};
