const Redis = require('ioredis');
const config = require('../config');

class RedisService {
	constructor() {
		this.client = new Redis({
			host: config.redis.host,
			port: config.redis.port,
			password: config.redis.password,
			retryStrategy: times => {
				const delay = Math.min(times * 50, 2000);
				return delay;
			},
		});

		// 외부에서 직접 접근할 수 있도록 redis 속성 추가
		this.redis = this.client;

		this.client.on('connect', () => {
			console.log('✅ Redis connected');
		});

		this.client.on('error', err => {
			console.error('❌ Redis error:', err);
		});
	}

	// ==================== 대기열 관리 ====================

	/**
	 * 대기열 진입
	 * @param {string} showId - 공연 ID
	 * @param {string} userId - 사용자 ID
	 * @returns {Promise<number>} - 대기 순번
	 */
	async joinQueue(showId, userId) {
		const queueKey = `queue:${showId}`;
		const timestamp = Date.now();
		const score = timestamp; // FIFO 정렬을 위한 타임스탬프

		// ZADD로 대기열에 추가 (이미 있으면 무시)
		await this.client.zadd(queueKey, 'NX', score, userId);

		// 현재 순번 조회 (0-based index)
		const position = await this.client.zrank(queueKey, userId);

		return position !== null ? position + 1 : 0;
	}

	/**
	 * 대기열 상태 조회
	 * @param {string} showId - 공연 ID
	 * @param {string} userId - 사용자 ID
	 * @returns {Promise<Object>} - { position, total, status }
	 */
	async getQueueStatus(showId, userId) {
		const queueKey = `queue:${showId}`;
		const allowedKey = `queue:${showId}:allowed`;

		// ALLOWED 세트에 있는지 확인
		const isAllowed = await this.client.sismember(allowedKey, userId);

		if (isAllowed) {
			return {
				status: 'ALLOWED',
				position: 0,
				total: 0,
			};
		}

		// 대기 순번 조회
		const position = await this.client.zrank(queueKey, userId);
		const total = await this.client.zcard(queueKey);

		if (position === null) {
			return {
				status: 'NOT_FOUND',
				position: 0,
				total: 0,
			};
		}

		return {
			status: 'WAITING',
			position: position + 1,
			total,
		};
	}

	/**
	 * 대기자를 ALLOWED 상태로 전환
	 * @param {string} showId - 공연 ID
	 * @param {number} count - 허용할 인원 수
	 * @returns {Promise<string[]>} - 허용된 사용자 ID 배열
	 */
	async allowNextInQueue(showId, count) {
		const queueKey = `queue:${showId}`;
		const allowedKey = `queue:${showId}:allowed`;

		// ZPOPMIN으로 가장 앞의 count명 추출
		const results = await this.client.zpopmin(queueKey, count);

		// [userId, score, userId, score, ...] 형태로 반환됨
		const userIds = [];
		for (let i = 0; i < results.length; i += 2) {
			userIds.push(results[i]);
		}

		// ALLOWED 세트에 추가
		if (userIds.length > 0) {
			await this.client.sadd(allowedKey, ...userIds);

			// ALLOWED 상태는 10분 후 자동 삭제
			for (const userId of userIds) {
				await this.client.setex(`queue:${showId}:allowed:${userId}`, 600, '1');
			}
		}

		return userIds;
	}

	/**
	 * 대기열에서 사용자 제거
	 * @param {string} showId - 공연 ID
	 * @param {string} userId - 사용자 ID
	 */
	async removeFromQueue(showId, userId) {
		const queueKey = `queue:${showId}`;
		await this.client.zrem(queueKey, userId);
	}

	// ==================== 좌석 미지정 구매 ====================

	/**
	 * 잔여 재고 조회
	 * @param {string} showId - 공연 ID
	 * @returns {Promise<number>} - 잔여 티켓 수
	 */
	async getAvailableCount(showId) {
		const stockKey = `stock:${showId}`;
		const count = await this.client.get(stockKey);
		return count !== null ? parseInt(count) : 0;
	}

	/**
	 * 초기 재고 설정
	 * @param {string} showId - 공연 ID
	 * @param {number} count - 초기 재고 수
	 */
	async setInitialStock(showId, count) {
		const stockKey = `stock:${showId}`;
		await this.client.set(stockKey, count);
	}

	/**
	 * 티켓 구매 (원자적 연산)
	 * @param {string} showId - 공연 ID
	 * @param {string} userId - 사용자 ID
	 * @param {number} quantity - 구매 수량
	 * @returns {Promise<Object>} - { success, purchaseId?, remaining? }
	 */
	async purchaseNonReserved(showId, userId, quantity) {
		const stockKey = `stock:${showId}`;
		const purchasedKey = `purchased:${showId}`;

		// Lua 스크립트로 원자적 처리
		const luaScript = `
      local stockKey = KEYS[1]
      local purchasedKey = KEYS[2]
      local userId = ARGV[1]
      local quantity = tonumber(ARGV[2])
      
      -- 중복 구매 방지
      local alreadyPurchased = redis.call('SISMEMBER', purchasedKey, userId)
      if alreadyPurchased == 1 then
        return {-2, 0} -- 이미 구매함
      end
      
      -- 재고 확인
      local stock = tonumber(redis.call('GET', stockKey) or 0)
      if stock < quantity then
        return {-1, stock} -- 재고 부족
      end
      
      -- 재고 차감 및 구매자 기록
      redis.call('DECRBY', stockKey, quantity)
      redis.call('SADD', purchasedKey, userId)
      
      local newStock = redis.call('GET', stockKey)
      return {1, tonumber(newStock)}
    `;

		const result = await this.client.eval(
			luaScript,
			2,
			stockKey,
			purchasedKey,
			userId,
			quantity,
		);

		if (result[0] === -2) {
			return { success: false, error: 'ALREADY_PURCHASED' };
		}

		if (result[0] === -1) {
			return { success: false, error: 'SOLD_OUT', remaining: result[1] };
		}

		// 성공
		const purchaseId = `purchase_${Date.now()}_${userId}`;
		return {
			success: true,
			purchaseId,
			remaining: result[1],
		};
	}

	/**
	 * 구매 취소 (재고 복구)
	 * @param {string} showId - 공연 ID
	 * @param {string} userId - 사용자 ID
	 * @param {number} quantity - 복구할 수량
	 */
	async cancelPurchase(showId, userId, quantity) {
		const stockKey = `stock:${showId}`;
		const purchasedKey = `purchased:${showId}`;

		await this.client.incrby(stockKey, quantity);
		await this.client.srem(purchasedKey, userId);
	}

	// ==================== 좌석 지정 구매 ====================

	/**
	 * 좌석 선점 (HOLD) - 자동 교체 허용
	 * @param {string} userId - 사용자 ID
	 * @param {string} showId - 공연 ID
	 * @param {string} seatId - 좌석 ID
	 * @returns {Promise<Object>} - { success, previousSeatId? }
	 */
	async holdSeat(userId, showId, seatId) {
		const holdKey = `hold:${userId}:${showId}`;
		const existingHold = await this.client.get(holdKey);

		// 이미 같은 좌석을 선점 중이면 그대로 유지
		if (existingHold === seatId) {
			return { success: true, previousSeatId: null };
		}

		// 다른 좌석을 선점 중이었으면 교체
		const previousSeatId = existingHold || null;

		// 새 좌석으로 선점 (5분/300초)
		await this.client.setex(holdKey, 300, seatId);

		return {
			success: true,
			previousSeatId,
		};
	}

	/**
	 * 좌석 선점 해제
	 * @param {string} userId - 사용자 ID
	 * @param {string} showId - 공연 ID
	 */
	async releaseHold(userId, showId) {
		const holdKey = `hold:${userId}:${showId}`;
		await this.client.del(holdKey);
	}

	/**
	 * 좌석 캐시 조회
	 * @param {string} showId - 공연 ID
	 * @returns {Promise<Array|null>} - 좌석 정보 배열
	 */
	async getCachedSeats(showId) {
		const cacheKey = `cache:seats:${showId}`;
		const cached = await this.client.get(cacheKey);
		return cached ? JSON.parse(cached) : null;
	}

	/**
	 * 좌석 캐시 저장
	 * @param {string} showId - 공연 ID
	 * @param {Array} seats - 좌석 정보 배열
	 */
	async cacheSeats(showId, seats) {
		const cacheKey = `cache:seats:${showId}`;
		await this.client.setex(cacheKey, 5, JSON.stringify(seats));
	}

	// ==================== 블랙리스트 ====================

	// queueToken 블랙리스트 등록
	async addToBlacklist(token, expiresAt) {
		const ttl = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
		await this.client.set(`blacklist:${token}`, '1', 'EX', ttl);
	}

	// 블랙리스트 확인
	async isBlacklisted(token) {
		const result = await this.client.get(`blacklist:${token}`);
		return result !== null;
	}

	// ==================== 유틸리티 ====================

	/**
	 * 연결 종료
	 */
	async disconnect() {
		await this.client.quit();
	}

	/**
	 * Health Check
	 */
	async ping() {
		return await this.client.ping();
	}
}

module.exports = new RedisService();
