const redisService = require('../services/redis.service');
const jwtUtil = require('../utils/jwt.util');
const { createSuccessResponse, Errors } = require('../utils/response.util');

/**
 * POST /queue/join
 * 대기열 진입
 */
async function joinQueue(req, res, next) {
	try {
		const { showId } = req.body;
		const userId = req.userId; //

		if (!showId) {
			throw Errors.INVALID_REQUEST({ field: 'showId' });
		}

		// 이미 대기 중인지 확인
		const existingStatus = await redisService.getQueueStatus(showId, userId);

		if (existingStatus.status === 'ALLOWED') {
			// 이미 허용된 상태
			const queueToken = jwtUtil.generateQueueToken({
				userId,
				showId,
				position: 0,
				status: 'ALLOWED',
			});

			const response = createSuccessResponse(
				{
					queueToken,
					position: 0,
					estimatedWaitTime: 0,
					status: 'ALLOWED',
					createdAt: Date.now(),
				},
				201,
			);

			return res.status(201).json(response);
		}

		if (existingStatus.status === 'WAITING') {
			throw Errors.ALREADY_IN_QUEUE(existingStatus.position);
		}

		// 대기열 진입
		const position = await redisService.joinQueue(showId, userId);

		// 대기 시간 추정 (1명당 2초 가정)
		const estimatedWaitTime = Math.max(0, (position - 1) * 2);

		// Queue Token 생성
		const queueToken = jwtUtil.generateQueueToken({
			userId,
			showId,
			position,
			status: 'WAITING',
		});

		const response = createSuccessResponse(
			{
				queueToken,
				position,
				estimatedWaitTime,
				status: 'WAITING',
				createdAt: Date.now(),
			},
			201,
		);

		res.status(201).json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * GET /queue/status
 * 대기열 상태 조회 (Polling)
 */
async function getQueueStatus(req, res, next) {
	try {
		// X-Queue-Token에서 정보 추출
		const token = req.headers['x-queue-token'];

		if (!token) {
			throw Errors.INVALID_QUEUE_TOKEN();
		}

		const decoded = jwtUtil.verifyToken(token);
		const { sub: userId, showId } = decoded;

		const status = await redisService.getQueueStatus(showId, userId);

		if (status.status === 'NOT_FOUND') {
			throw Errors.INVALID_QUEUE_TOKEN();
		}

		if (status.status === 'ALLOWED') {
			const response = createSuccessResponse({
				status: 'ALLOWED',
				position: 0,
				estimatedWaitTime: 0,
				updatedAt: Date.now(),
			});

			return res.json(response);
		}

		// WAITING 상태
		const estimatedWaitTime = Math.max(0, (status.position - 1) * 2);

		const response = createSuccessResponse({
			status: 'WAITING',
			position: status.position,
			estimatedWaitTime,
			updatedAt: Date.now(),
		});

		res.json(response);
	} catch (error) {
		if (error.message === 'TOKEN_EXPIRED') {
			return next(Errors.QUEUE_TOKEN_EXPIRED());
		}
		if (error.message === 'INVALID_TOKEN') {
			return next(Errors.INVALID_QUEUE_TOKEN());
		}
		next(error);
	}
}

/**
 * POST /queue/allow
 * 대기자를 ALLOWED 상태로 전환 (관리자용 또는 백그라운드 워커)
 */
async function allowNextInQueue(req, res, next) {
	try {
		const { showId, count = 10 } = req.body;

		if (!showId) {
			throw Errors.INVALID_REQUEST({ field: 'showId' });
		}

		const allowedUsers = await redisService.allowNextInQueue(showId, count);

		const response = createSuccessResponse({
			allowedCount: allowedUsers.length,
			allowedUsers,
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

module.exports = {
	joinQueue,
	getQueueStatus,
	allowNextInQueue,
};
