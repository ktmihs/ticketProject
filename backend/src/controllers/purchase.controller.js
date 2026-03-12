const redisService = require('../services/redis.service');
const jwtUtil = require('../utils/jwt.util');
const { createSuccessResponse, Errors } = require('../utils/response.util');

// ✨ 대규모 좌석 생성 함수
function generateLargeVenue() {
	const seats = [];
	let id = 1000;

	// VIP 구역 (A~C열, 각 40석)
	['A', 'B', 'C'].forEach(row => {
		for (let num = 1; num <= 40; num++) {
			seats.push({
				id: id++,
				row,
				number: num,
				grade: 'VIP',
				price: 150000,
				status: 'AVAILABLE',
				holdBy: null,
				holdUntil: null,
			});
		}
	});

	// R석 구역 (D~H열, 각 45석)
	['D', 'E', 'F', 'G', 'H'].forEach(row => {
		for (let num = 1; num <= 45; num++) {
			seats.push({
				id: id++,
				row,
				number: num,
				grade: 'R',
				price: 120000,
				status: 'AVAILABLE',
				holdBy: null,
				holdUntil: null,
			});
		}
	});

	// S석 구역 (I~O열, 각 50석)
	['I', 'J', 'K', 'L', 'M', 'N', 'O'].forEach(row => {
		for (let num = 1; num <= 50; num++) {
			seats.push({
				id: id++,
				row,
				number: num,
				grade: 'S',
				price: 80000,
				status: 'AVAILABLE',
				holdBy: null,
				holdUntil: null,
			});
		}
	});

	// A석 구역 (P~Z열, 각 55석)
	['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].forEach(row => {
		for (let num = 1; num <= 55; num++) {
			seats.push({
				id: id++,
				row,
				number: num,
				grade: 'A',
				price: 50000,
				status: 'AVAILABLE',
				holdBy: null,
				holdUntil: null,
			});
		}
	});

	return seats;
}

// Mock 좌석 데이터
const mockSeats = {
	show_123: generateLargeVenue(), // ✨ 1,300석 (좌석제)
	show_456: generateLargeVenue(), // ✨ 1,300석 (좌석제)
	// show_789: 비좌석제이므로 좌석 데이터 없음
};

/**
 * GET /shows/:showId/available-count
 * 잔여 티켓 수 조회 (좌석 미지정)
 */
async function getAvailableCount(req, res, next) {
	try {
		const { showId } = req.params;

		const remaining = await redisService.getAvailableCount(showId);

		const response = createSuccessResponse({
			showId,
			remaining,
			soldOut: remaining === 0,
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * POST /purchase/non-reserved
 * 좌석 미지정 구매
 */
async function purchaseNonReserved(req, res, next) {
	try {
		const { showId, quantity, payment } = req.body;
		const userId = req.userId; // verifyQueueToken에서 설정

		// 입력 검증
		if (!showId || !quantity || !payment) {
			throw Errors.INVALID_REQUEST({
				field: !showId ? 'showId' : !quantity ? 'quantity' : 'payment',
			});
		}

		if (quantity < 1 || quantity > 4) {
			throw Errors.INVALID_QUANTITY(1, 4);
		}

		// Redis 원자적 구매
		const result = await redisService.purchaseNonReserved(
			showId,
			userId,
			quantity,
		);

		if (!result.success) {
			if (result.error === 'ALREADY_PURCHASED') {
				throw Errors.ALREADY_PURCHASED();
			}
			if (result.error === 'SOLD_OUT') {
				throw Errors.SOLD_OUT();
			}
		}

		// 결제 처리 (Mock)
		const paymentSuccess = await mockPaymentProcess(payment);

		if (!paymentSuccess) {
			// 결제 실패 시 재고 복구
			await redisService.cancelPurchase(showId, userId, quantity);
			throw Errors.PAYMENT_FAILED('결제 승인 실패');
		}

		// 구매 완료
		const response = createSuccessResponse({
			purchaseId: result.purchaseId,
			showId,
			quantity,
			totalAmount: quantity * 80000, // 고정 가격 (예시)
			status: 'COMPLETED',
			purchasedAt: Date.now(),
			ticket: {
				ticketId: `ticket_${result.purchaseId}`,
				qrCode: `https://cdn.example.com/qr/${result.purchaseId}.png`,
			},
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * GET /seats/:showId
 * 좌석 배치도 조회
 */
async function getSeats(req, res, next) {
	try {
		const { showId } = req.params;

		// 캐시 확인
		const cached = await redisService.getCachedSeats(showId);
		if (cached) {
			const response = createSuccessResponse({
				showId,
				seats: cached,
				cachedAt: Date.now(),
			});
			return res.json(response);
		}

		// Mock 데이터 (실제로는 DB 조회)
		const seats = mockSeats[showId] || [];

		if (seats.length === 0) {
			throw Errors.SHOW_NOT_FOUND(showId);
		}

		// 캐시 저장 (5초)
		await redisService.cacheSeats(showId, seats);

		const response = createSuccessResponse({
			showId,
			seats,
			cachedAt: Date.now(),
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * POST /seats/hold
 * 좌석 선점
 */
async function holdSeat(req, res, next) {
	try {
		const { showId, seatId } = req.body;
		const userId = req.userId; // verifyQueueToken에서 설정

		if (!showId || !seatId) {
			throw Errors.INVALID_REQUEST({
				field: !showId ? 'showId' : 'seatId',
			});
		}

		// Mock: 좌석 상태 확인
		const seats = mockSeats[showId] || [];
		const seat = seats.find(s => s.id === seatId);

		if (!seat) {
			throw Errors.SEAT_NOT_FOUND(seatId);
		}

		if (seat.status === 'HOLDING' && seat.holdBy !== userId) {
			const holdUntil = seat.holdUntil || Date.now() + 300000;
			throw Errors.SEAT_ALREADY_HOLDING(seatId, holdUntil);
		}

		if (seat.status === 'SOLD') {
			throw Errors.SEAT_SOLD(seatId);
		}

		// Redis에서 좌석 선점 (이전 좌석이 있으면 자동 교체)
		const holdResult = await redisService.holdSeat(userId, showId, seatId);

		// 이전에 선점한 좌석이 있으면 해제
		if (holdResult.previousSeatId) {
			const previousSeat = seats.find(
				s => s.id === parseInt(holdResult.previousSeatId),
			);
			if (
				previousSeat &&
				previousSeat.status === 'HOLDING' &&
				previousSeat.holdBy === userId
			) {
				previousSeat.status = 'AVAILABLE';
				delete previousSeat.holdBy;
				delete previousSeat.holdUntil;
			}
		}

		// 새 좌석 HOLDING 상태로 변경
		seat.status = 'HOLDING';
		seat.holdBy = userId;
		seat.holdUntil = Date.now() + 300000; // 5분

		// Hold Token 생성
		const holdToken = jwtUtil.generateHoldToken({
			userId,
			showId,
			seatId,
		});

		const response = createSuccessResponse({
			holdToken,
			seat: {
				id: seat.id,
				row: seat.row,
				number: seat.number,
				grade: seat.grade,
				price: seat.price,
			},
			expiresAt: seat.holdUntil,
			expiresIn: 300, // 초
			previousSeatReleased: holdResult.previousSeatId ? true : false,
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * POST /purchase/reserved
 * 좌석 지정 구매
 */
async function purchaseReserved(req, res, next) {
	try {
		const { holdToken, payment } = req.body;
		const userId = req.userId; // verifyQueueToken에서 설정

		if (!holdToken || !payment) {
			throw Errors.INVALID_REQUEST({
				field: !holdToken ? 'holdToken' : 'payment',
			});
		}

		// Hold Token 검증
		let decoded;
		try {
			decoded = jwtUtil.verifyToken(holdToken);
		} catch (error) {
			if (error.message === 'TOKEN_EXPIRED') {
				throw Errors.HOLD_TOKEN_EXPIRED();
			}
			throw Errors.INVALID_HOLD_TOKEN();
		}

		const { sub: tokenUserId, showId, seatId, expiresAt } = decoded;

		// 사용자 일치 확인
		if (tokenUserId !== userId) {
			throw Errors.INVALID_HOLD_TOKEN();
		}

		// 만료 시간 확인 (서버 기준)
		if (Date.now() > expiresAt) {
			throw Errors.HOLD_EXPIRED(expiresAt);
		}

		// Mock: 좌석 상태 확인
		const seats = mockSeats[showId] || [];
		const seat = seats.find(s => s.id === seatId);

		if (!seat || seat.status !== 'HOLDING' || seat.holdBy !== userId) {
			throw Errors.HOLD_EXPIRED(expiresAt);
		}

		// 결제 처리 (Mock)
		const paymentSuccess = await mockPaymentProcess(payment);

		if (!paymentSuccess) {
			throw Errors.PAYMENT_FAILED('결제 승인 실패');
		}

		// 좌석 SOLD 상태로 변경
		seat.status = 'SOLD';
		seat.soldTo = userId;
		seat.soldAt = Date.now();

		// Redis hold 정리
		await redisService.releaseHold(userId, showId);

		const purchaseId = `purchase_${Date.now()}_${userId}`;

		const response = createSuccessResponse({
			purchaseId,
			showId,
			seat: {
				id: seat.id,
				row: seat.row,
				number: seat.number,
			},
			totalAmount: seat.price,
			status: 'COMPLETED',
			purchasedAt: Date.now(),
			ticket: {
				ticketId: `ticket_${purchaseId}`,
				qrCode: `https://cdn.example.com/qr/${purchaseId}.png`,
			},
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * POST /seats/release
 * 좌석 선점 해제
 */
async function releaseSeat(req, res, next) {
	try {
		const { showId, seatId } = req.body;
		const userId = req.userId;

		// Redis hold 해제
		await redisService.releaseHold(userId, showId);

		// Mock: 좌석 상태 변경
		const seats = mockSeats[showId] || [];
		const seat = seats.find(s => s.id === seatId);

		if (seat && seat.status === 'HOLDING' && seat.holdBy === userId) {
			seat.status = 'AVAILABLE';
			delete seat.holdBy;
			delete seat.holdUntil;
		}

		const response = createSuccessResponse({
			message: '좌석 선점이 해제되었습니다',
		});

		res.json(response);
	} catch (error) {
		next(error);
	}
}

/**
 * Mock 결제 처리
 * 개발 환경: 항상 성공 (테스트 안정성)
 * 프로덕션: 실제 PG사 API 연동 필요
 */
async function mockPaymentProcess(payment) {
  if (process.env.NODE_ENV !== 'production') {
    return true; // 개발/테스트 환경: 항상 성공
  }
  // 실제로는 PG사 API 호출
  return Math.random() > 0.05; // 프로덕션: 95% 성공률
}

module.exports = {
	getAvailableCount,
	purchaseNonReserved,
	getSeats,
	holdSeat,
	purchaseReserved,
	releaseSeat,
};
