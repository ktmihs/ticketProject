// ==================== API 응답 타입 ====================

export interface ApiResponse<T> {
	data: T;
	timestamp: number;
}

export interface ApiErrorResponse {
	error: {
		code: string;
		message: string;
		details?: any;
	};
	timestamp: number;
	requestId: string;
}

// ==================== Show 타입 ====================

export interface Show {
	id: string;
	title: string;
	description: string;
	date: string;
	venue: string;
	seatType: 'reserved' | 'non_reserved';
	price: {
		min?: number;
		max?: number;
		vip?: number;
		r?: number;
		s?: number;
	};
	availability: {
		total: number;
		remaining: number;
		soldOut: boolean;
	};
	saleStartAt: string;
	saleEndAt: string;
	thumbnail: string;
	images?: string[];
	metadata?: {
		ageLimit: number;
		duration: number;
		genre: string;
	};
}

export interface ShowListResponse {
	shows: Show[];
	pagination: {
		total: number;
		limit: number;
		offset: number;
		hasNext: boolean;
	};
}

// ==================== Queue 타입 ====================

export type QueueStatus =
	| 'WAITING'
	| 'ALLOWED'
	| 'NOT_FOUND'
	| 'BLOCKED'
	| 'EXPIRED';

export interface QueueJoinResponse {
	queueToken: string;
	position: number;
	estimatedWaitTime: number;
	status: QueueStatus;
	createdAt: number;
}

export interface QueueStatusResponse {
	status: QueueStatus;
	position: number;
	estimatedWaitTime: number;
	updatedAt: number;
}

// ==================== Seat 타입 ====================

export type SeatStatus = 'AVAILABLE' | 'HOLDING' | 'SOLD';

export interface Seat {
	id: number;
	row: string;
	number: number;
	grade: string;
	price: number;
	status: SeatStatus;
	holdBy?: string;
	holdUntil?: number;
}

export interface SeatListResponse {
	showId: string;
	seats: Seat[];
	cachedAt: number;
}

export interface HoldSeatResponse {
	holdToken: string;
	seat: {
		id: number;
		row: string;
		number: number;
		grade: string;
		price: number;
	};
	expiresAt: number;
	expiresIn: number;
}

// ==================== Purchase 타입 ====================

export interface PaymentInfo {
	cardNumber: string;
	expiryDate: string;
	cvv: string;
	cardHolder: string;
}

export interface PurchaseNonReservedRequest {
	showId: string;
	quantity: number;
	payment: PaymentInfo;
}

export interface PurchaseReservedRequest {
	holdToken: string;
	payment: PaymentInfo;
}

export interface PurchaseResponse {
	purchaseId: string;
	showId: string;
	seat?: {
		id: number;
		row: string;
		number: number;
	};
	quantity?: number;
	totalAmount: number;
	status: 'COMPLETED';
	purchasedAt: number;
	ticket: {
		ticketId: string;
		qrCode: string;
	};
}

export interface AvailableCountResponse {
	showId: string;
	remaining: number;
	soldOut: boolean;
}

// ==================== Redux State 타입 ====================

export interface QueueState {
	status: QueueStatus | null;
	position: number;
	estimatedWaitTime: number;
	queueToken: string | null;
	showId: string | null;
	error: string | null;
	isPolling: boolean;
}

export type PurchaseStage =
	| 'IDLE'
	| 'QUEUE'
	| 'SEAT_SELECT'
	| 'PAYMENT'
	| 'COMPLETED';

export interface PurchaseState {
	stage: PurchaseStage;
	selectedShow: Show | null;
	selectedSeat: Seat | null;
	holdToken: string | null;
	holdExpiresAt: number | null;
	quantity: number;
	totalAmount: number;
	error: string | null;
	isProcessing: boolean;
	purchaseResult: PurchaseResponse | null; // ✅ 구매 결과 (성공 페이지용)
}

export interface AuthState {
	userId: string | null;
	email: string | null;
	role: string | null;
	isAuthenticated: boolean;
}
