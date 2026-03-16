'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
	holdSeat,
	purchaseReserved,
	purchaseNonReserved,
	returnToSeatSelect,
	setQuantity,
} from '@/store/purchaseSlice';
import { resetQueue } from '@/store/queueSlice';

type PaymentMethod = 'card' | 'bank';

export default function CheckoutPageWrapper() {
	const router = useRouter();
	const [isClient, setIsClient] = useState(false);
	const selectedShow = useAppSelector(state => state.purchase.selectedShow);

	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		if (!isClient) return;
		if (!selectedShow) {
			router.replace('/');
		}
	}, [isClient, selectedShow, router]);

	if (!isClient || !selectedShow) return null;
	return <CheckoutPage />;
}

function CheckoutPage() {
	const router = useRouter();
	const params = useParams();
	const dispatch = useAppDispatch();
	const showId = params.showId as string;

	const { selectedShow, selectedSeat, quantity, isProcessing, error } =
		useAppSelector(state => state.purchase);
	const { allowedUntil } = useAppSelector(state => state.queue);

	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
	const [queueRemainingSeconds, setQueueRemainingSeconds] = useState(0);

	if (!selectedShow) return null;

	// 구매 가능 시간 타이머
	useEffect(() => {
		if (!allowedUntil) return;
		const timer = setInterval(() => {
			const remaining = Math.max(
				0,
				Math.floor((allowedUntil - Date.now()) / 1000),
			);
			setQueueRemainingSeconds(remaining);
			if (remaining === 0) {
				alert('구매 가능 시간이 만료되었습니다.');
				dispatch(resetQueue());
				router.replace('/');
			}
		}, 1000);
		return () => clearInterval(timer);
	}, [allowedUntil]);

	// 뒤로가기 처리
	useEffect(() => {
		const handlePopState = () => {
			const ok = window.confirm(
				'좌석 선택 페이지로 돌아가시겠습니까?\n선택한 좌석이 해제됩니다.',
			);
			if (ok) {
				dispatch(returnToSeatSelect());
				router.replace(`/purchase/${showId}`);
			} else {
				window.history.pushState(null, '', window.location.href);
			}
		};
		window.addEventListener('popstate', handlePopState);
		return () => window.removeEventListener('popstate', handlePopState);
	}, [showId, dispatch, router]);

	const formatTime = (seconds: number) => {
		const min = Math.floor(seconds / 60);
		const sec = seconds % 60;
		return `${min}:${sec.toString().padStart(2, '0')}`;
	};

	const totalAmount =
		selectedShow.seatType === 'reserved'
			? (selectedSeat?.price ?? 0)
			: (selectedShow.price.min ?? 0) * quantity;

	const handlePayment = async () => {
		try {
			const payment = {
				cardNumber: '1234-5678-9012-3456',
				expiryDate: '12/28',
				cvv: '123',
				cardHolder: 'Test User',
				method: paymentMethod,
			};

			if (selectedShow.seatType === 'reserved') {
				if (!selectedSeat) {
					alert('선택한 좌석이 없습니다. 좌석을 다시 선택해주세요.');
					router.replace(`/purchase/${showId}`);
					return;
				}

				// ✅ holdSeat + purchaseReserved 순차 실행
				const holdResult = await dispatch(
					holdSeat({ showId, seatId: selectedSeat.id }),
				).unwrap();

				await dispatch(
					purchaseReserved({
						holdToken: holdResult.holdToken,
						payment,
					}),
				).unwrap();
			} else {
				await dispatch(
					purchaseNonReserved({ showId, quantity, payment }),
				).unwrap();
			}

			router.push('/success');
		} catch (err: any) {
			if (selectedShow.seatType === 'reserved') {
				// 선점 실패 시 좌석 선택 페이지로
				dispatch(returnToSeatSelect());
				alert(err.message || '좌석 선점에 실패했습니다. 다시 선택해주세요.');
				router.replace(`/purchase/${showId}`);
			} else {
				alert(err.message || '구매에 실패했습니다.');
			}
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* 구매 가능 시간 타이머 */}
			<div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 shadow-lg sticky top-0 z-10">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<div className="flex items-center gap-2">
						<span className="text-2xl">⏰</span>
						<span className="font-semibold">구매 가능 시간</span>
					</div>
					<div
						className={`text-3xl font-bold ${queueRemainingSeconds < 60 ? 'animate-pulse' : ''}`}
					>
						{formatTime(queueRemainingSeconds)}
					</div>
				</div>
			</div>

			<div className="max-w-2xl mx-auto p-6">
				<h1 className="text-2xl font-bold mb-6">결제</h1>

				{/* 예매 정보 요약 */}
				<div className="bg-white rounded-xl shadow p-6 mb-4">
					<h2 className="text-lg font-bold mb-4">예매 정보</h2>
					<div className="space-y-3 text-sm">
						<div className="flex justify-between">
							<span className="text-gray-500">공연명</span>
							<span className="font-medium">{selectedShow.title}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">일시</span>
							<span className="font-medium">
								{new Date(selectedShow.date).toLocaleString('ko-KR')}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-gray-500">장소</span>
							<span className="font-medium">{selectedShow.venue}</span>
						</div>
						{selectedShow.seatType === 'reserved' && selectedSeat ? (
							<div className="flex justify-between">
								<span className="text-gray-500">좌석</span>
								<span className="font-medium">
									{selectedSeat.row}열 {selectedSeat.number}번 (
									{selectedSeat.grade}석)
								</span>
							</div>
						) : (
							<div className="flex justify-between items-center">
								<span className="text-gray-500">수량</span>
								<div className="flex items-center gap-3">
									<button
										onClick={() =>
											dispatch(setQuantity(Math.max(1, quantity - 1)))
										}
										className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold"
										disabled={quantity <= 1}
									>
										-
									</button>
									<span className="font-bold w-6 text-center">{quantity}</span>
									<button
										onClick={() =>
											dispatch(setQuantity(Math.min(4, quantity + 1)))
										}
										className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 font-bold"
										disabled={quantity >= 4}
									>
										+
									</button>
									<span className="text-gray-500">매</span>
								</div>
							</div>
						)}
						<div className="flex justify-between border-t pt-3">
							<span className="text-gray-500">결제 금액</span>
							<span className="font-bold text-blue-600 text-base">
								{totalAmount.toLocaleString()}원
							</span>
						</div>
					</div>
				</div>

				{/* 결제 수단 선택 */}
				<div className="bg-white rounded-xl shadow p-6 mb-4">
					<h2 className="text-lg font-bold mb-4">결제 수단</h2>
					<div className="grid grid-cols-2 gap-3">
						<button
							onClick={() => setPaymentMethod('card')}
							className={`p-4 rounded-xl border-2 text-left transition-colors ${
								paymentMethod === 'card'
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200 hover:border-gray-300'
							}`}
						>
							<div className="text-2xl mb-1">💳</div>
							<div className="font-medium text-sm">신용/체크카드</div>
						</button>
						<button
							onClick={() => setPaymentMethod('bank')}
							className={`p-4 rounded-xl border-2 text-left transition-colors ${
								paymentMethod === 'bank'
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200 hover:border-gray-300'
							}`}
						>
							<div className="text-2xl mb-1">🏦</div>
							<div className="font-medium text-sm">무통장 입금</div>
						</button>
					</div>
				</div>

				{/* 에러 메시지 */}
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-600 text-sm">
						{error}
					</div>
				)}

				{/* 결제 버튼 */}
				<button
					onClick={handlePayment}
					disabled={isProcessing}
					className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{isProcessing ? (
						<span className="flex items-center justify-center gap-2">
							<span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full inline-block"></span>
							결제 처리 중...
						</span>
					) : (
						`${totalAmount.toLocaleString()}원 결제하기`
					)}
				</button>
			</div>
		</div>
	);
}
