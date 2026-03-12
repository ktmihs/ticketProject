const redisService = require('../services/redis.service');

/**
 * 대기열 자동 처리 워커
 * 주기적으로 대기 중인 사용자를 ALLOWED 상태로 변경
 */
class QueueWorker {
	constructor() {
		this.isRunning = false;
		this.interval = null;
		this.processInterval = 2000; // 2초마다 처리
		this.batchSize = 5; // 한 번에 5명씩 처리
	}

	/**
	 * 워커 시작
	 */
	start() {
		if (this.isRunning) {
			console.log('⚠️  Queue worker is already running');
			return;
		}

		this.isRunning = true;
		console.log('🚀 Queue worker started');
		console.log(`   - Process interval: ${this.processInterval}ms`);
		console.log(`   - Batch size: ${this.batchSize} users per cycle`);

		this.interval = setInterval(() => {
			this.processQueues();
		}, this.processInterval);
	}

	/**
	 * 워커 중지
	 */
	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
			this.isRunning = false;
			console.log('🛑 Queue worker stopped');
		}
	}

	/**
	 * 모든 공연의 대기열 처리
	 */
	async processQueues() {
		try {
			// 활성 공연 목록 (실제로는 DB에서 가져와야 함)
			const activeShows = ['show_123', 'show_456', 'show_789'];

			for (const showId of activeShows) {
				await this.processShowQueue(showId);
			}
		} catch (error) {
			console.error('❌ Queue processing error:', error);
		}
	}

	/**
	 * 특정 공연의 대기열 처리
	 */
	async processShowQueue(showId) {
		try {
			const queueKey = `queue:${showId}`;

			// 대기 중인 인원 확인
			const waitingCount = await redisService.redis.zcard(queueKey);

			if (waitingCount === 0) {
				return; // 대기 인원 없음
			}

			// 처리할 인원 수 결정 (최대 batchSize명)
			const processCount = Math.min(this.batchSize, waitingCount);

			// ✅ ZPOPMIN: 가장 앞의 사용자들을 꺼내면서 동시에 제거 (중복 처리 방지)
			const results = await redisService.redis.zpopmin(queueKey, processCount);

			// [userId, score, userId, score, ...] 형태로 반환됨
			const users = [];
			for (let i = 0; i < results.length; i += 2) {
				users.push(results[i]);
			}

			if (users.length === 0) {
				return;
			}

			// 각 사용자를 ALLOWED 상태로 변경
			for (const userId of users) {
				await this.allowUser(showId, userId);
			}

			console.log(
				`✅ [${showId}] ${users.length}명 입장 허용 (대기: ${waitingCount - users.length}명)`,
			);
		} catch (error) {
			console.error(`❌ Error processing queue for ${showId}:`, error);
		}
	}

	/**
	 * 사용자를 ALLOWED 상태로 변경
	 */
	async allowUser(showId, userId) {
		const queueKey = `queue:${showId}`;
		const allowedKey = `queue:${showId}:allowed`;

		try {
			// 1. 대기열에서 제거
			await redisService.redis.zrem(queueKey, userId);

			// 2. ALLOWED 집합에 추가
			await redisService.redis.sadd(allowedKey, userId);

			// 3. ALLOWED 상태에 10분 TTL 설정 (600초)
			await redisService.redis.expire(allowedKey, 600);
		} catch (error) {
			console.error(`❌ Error allowing user ${userId}:`, error);
			throw error;
		}
	}

	/**
	 * 설정 변경
	 */
	configure(options = {}) {
		if (options.processInterval) {
			this.processInterval = options.processInterval;
		}
		if (options.batchSize) {
			this.batchSize = options.batchSize;
		}

		// 이미 실행 중이면 재시작
		if (this.isRunning) {
			this.stop();
			this.start();
		}
	}

	/**
	 * 상태 확인
	 */
	getStatus() {
		return {
			isRunning: this.isRunning,
			processInterval: this.processInterval,
			batchSize: this.batchSize,
		};
	}
}

// 싱글톤 인스턴스 생성
const queueWorker = new QueueWorker();

module.exports = queueWorker;
