const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const redisService = require('./services/redis.service');
const queueWorker = require('./workers/queue.worker');

// Routes
const showRoutes = require('./routes/show.routes');
const queueRoutes = require('./routes/queue.routes');
const purchaseRoutes = require('./routes/purchase.routes');

// Middleware
const {
	errorHandler,
	notFoundHandler,
} = require('./middleware/error.middleware');

const app = express();

// ==================== 미들웨어 설정 ====================

// Security
app.use(
	helmet({
		contentSecurityPolicy: false, // Next.js에서 처리
	}),
);

// CORS
app.use(cors(config.cors));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Request Logging (개발 환경)
if (config.nodeEnv === 'development') {
	app.use((req, res, next) => {
		console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
		next();
	});
}

// ==================== Health Check ====================

app.get('/health', async (req, res) => {
	try {
		const redisPing = await redisService.ping();
		res.json({
			status: 'healthy',
			timestamp: Date.now(),
			redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
		});
	} catch (error) {
		res.status(503).json({
			status: 'unhealthy',
			timestamp: Date.now(),
			redis: 'error',
			error: error.message,
		});
	}
});

// ==================== API 라우트 ====================

app.use('/api/shows', showRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api', purchaseRoutes);

// ==================== 에러 핸들링 ====================

// 404 핸들러
app.use(notFoundHandler);

// 전역 에러 핸들러
app.use(errorHandler);

// ==================== 서버 시작 ====================

const PORT = config.port;

app.listen(PORT, () => {
	console.log('');
	console.log('==========================================');
	console.log('  🎫 Ticket Service Backend API');
	console.log('==========================================');
	console.log(`  Server running on port ${PORT}`);
	console.log(`  Environment: ${config.nodeEnv}`);
	console.log(`  Redis: ${config.redis.host}:${config.redis.port}`);
	console.log('==========================================');
	console.log('');

	// 대기열 워커 시작
	queueWorker.start();
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
	console.log('SIGTERM received, shutting down gracefully...');
	await redisService.disconnect();
	process.exit(0);
});

process.on('SIGINT', async () => {
	console.log('SIGINT received, shutting down gracefully...');
	await redisService.disconnect();
	process.exit(0);
});

module.exports = app;
