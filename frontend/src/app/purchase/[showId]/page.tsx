'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { resetQueue } from '@/store/queueSlice';
import {
	selectSeat,
	returnToSeatSelect,
	setQuantity,
} from '@/store/purchaseSlice';
import { useSeats } from '@/hooks/useQueries';
import type { Seat } from '@/types';

// =====================================================
// Wrapper: selectedShow가 없으면 (새로고침 등) 훅 실행 전에 홈으로
// 이렇게 분리해야 내부 컴포넌트의 훅들이 아예 호출되지 않음
// =====================================================
export default function PurchasePageWrapper() {
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
			return;
		}

		// 401 응답 수신 시 (토큰 만료/없음) 홈으로
		const handleUnauthorized = () => {
			router.replace('/');
		};
		window.addEventListener('auth:unauthorized', handleUnauthorized);
		return () =>
			window.removeEventListener('auth:unauthorized', handleUnauthorized);
	}, [isClient, selectedShow, router]);

	if (!isClient || !selectedShow) return null;
	return <PurchasePage />;
}

// 좌석 등급별 색상
const gradeColors: Record<string, string> = {
	VIP: 'bg-purple-500 hover:bg-purple-600 text-white',
	R: 'bg-red-400 hover:bg-red-500 text-white',
	S: 'bg-blue-400 hover:bg-blue-500 text-white',
	A: 'bg-green-400 hover:bg-green-500 text-white',
};
const gradeBgHolding = 'bg-yellow-300 cursor-not-allowed text-gray-700';
const gradeBgSold = 'bg-gray-300 cursor-not-allowed text-gray-500';
const gradeBgSelected = 'ring-4 ring-yellow-400 ring-offset-1';

function PurchasePage() {
	const router = useRouter();
	const params = useParams();
	const dispatch = useAppDispatch();
	const showId = params.showId as string;

	const { selectedShow, selectedSeat, quantity } = useAppSelector(
		state => state.purchase,
	);

	if (!selectedShow) return null;

	const { allowedUntil } = useAppSelector(state => state.queue);
	const [queueRemainingSeconds, setQueueRemainingSeconds] = useState(0);

	// 좌석 배치도 데이터 (reserved 공연만)
	const { data: seatData, isLoading: seatsLoading } = useSeats(
		selectedShow.seatType === 'reserved' ? showId : null,
	);

	// 구매 가능 시간 타이머
	useEffect(() => {
		const until = allowedUntil;
		if (!until) return;

		const timer = setInterval(() => {
			const remaining = Math.max(0, Math.floor((until - Date.now()) / 1000));
			setQueueRemainingSeconds(remaining);
			if (remaining === 0) {
				alert('구매 가능 시간이 만료되었습니다.');
				dispatch(resetQueue());
				router.replace('/');
			}
		}, 1000);

		return () => clearInterval(timer);
	}, [allowedUntil]);

	// 페이지 이탈 경고
	useEffect(() => {
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '페이지를 벗어나면 선택한 좌석이 해제됩니다.';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, []);

	// ✅ 뒤로가기 처리
	useEffect(() => {
		const handler = () => {
			const ok = window.confirm(
				'구매를 취소하시겠습니까?\n메인 페이지로 이동합니다.',
			);
			if (ok) {
				dispatch(returnToSeatSelect());
				dispatch(resetQueue());
				router.replace('/');
			} else {
				window.history.pushState(null, '', window.location.href);
			}
		};
		window.history.pushState(null, '', window.location.href);
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	}, []);

	// ✅ 좌석 선택 — API 호출 없이 Redux state만 업데이트
	const handleSeatSelect = (seat: Seat) => {
		if (seat.status === 'HOLDING' || seat.status === 'SOLD') return;
		if (selectedSeat?.id === seat.id) return;
		dispatch(selectSeat({ ...seat }));
	};

	// ✅ 결제 버튼 — /checkout으로 이동
	const handlePurchase = () => {
		router.push(`/checkout/${showId}`);
	};

	const formatTime = (seconds: number) => {
		const min = Math.floor(seconds / 60);
		const sec = seconds % 60;
		return `${min}:${sec.toString().padStart(2, '0')}`;
	};

	// 열(row) 목록
	const rows = seatData?.seats
		? [...new Set(seatData.seats.map((s: Seat) => s.row))].sort()
		: [];

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

			<div className="max-w-5xl mx-auto p-6">
				<h1 className="text-3xl font-bold mb-2">{selectedShow.title}</h1>
				<p className="text-gray-600 mb-1">📍 {selectedShow.venue}</p>
				<p className="text-gray-500 mb-8">
					{new Date(selectedShow.date).toLocaleString('ko-KR')}
				</p>

				{/* ✅ 좌석 지정 공연 */}
				{selectedShow.seatType === 'reserved' && (
					<div className="bg-white rounded-xl shadow p-6 mb-6">
						<h2 className="text-xl font-bold mb-4">좌석 선택</h2>

						{/* 등급 범례 */}
						<div className="flex flex-wrap gap-3 mb-6">
							{Object.entries(gradeColors).map(([grade, cls]) => (
								<div key={grade} className="flex items-center gap-2">
									<div
										className={`w-6 h-6 rounded text-xs flex items-center justify-center font-bold ${cls}`}
									>
										{grade}
									</div>
									<span className="text-sm text-gray-600">
										{grade === 'VIP'
											? '150,000원'
											: grade === 'R'
												? '120,000원'
												: grade === 'S'
													? '80,000원'
													: '50,000원'}
									</span>
								</div>
							))}
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 rounded bg-yellow-300 text-xs flex items-center justify-center">
									H
								</div>
								<span className="text-sm text-gray-500">선점중</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-6 h-6 rounded bg-gray-300 text-xs flex items-center justify-center">
									X
								</div>
								<span className="text-sm text-gray-500">판매완료</span>
							</div>
						</div>

						{/* 무대 */}
						<div className="bg-gray-700 text-white text-center py-3 rounded-lg mb-6 text-sm font-semibold tracking-widest">
							🎭 STAGE
						</div>

						{seatsLoading ? (
							<div className="text-center py-8 text-gray-500">
								좌석 정보를 불러오는 중...
							</div>
						) : seatData?.seats ? (
							<div className="overflow-x-auto">
								<div className="min-w-max">
									{rows.map(row => {
										const rowSeats = seatData.seats
											.filter((s: Seat) => s.row === row)
											.sort((a: Seat, b: Seat) => a.number - b.number);
										return (
											<div key={row} className="flex items-center gap-1 mb-1">
												<span className="w-6 text-xs text-gray-500 text-right font-mono">
													{row}
												</span>
												<div className="flex gap-0.5 flex-wrap">
													{rowSeats.map((seat: Seat) => {
														const isSelected = selectedSeat?.id === seat.id;
														const isHolding = seat.status === 'HOLDING';
														const isSold = seat.status === 'SOLD';

														let cls =
															'w-5 h-5 text-[8px] rounded flex items-center justify-center font-bold cursor-pointer transition-all ';
														if (isSold) cls += gradeBgSold;
														else if (isHolding) cls += gradeBgHolding;
														else
															cls +=
																gradeColors[seat.grade] ||
																'bg-gray-400 text-white hover:bg-gray-500 ';
														if (isSelected) cls += ` ${gradeBgSelected}`;

														return (
															<button
																key={seat.id}
																className={cls}
																onClick={() => handleSeatSelect(seat)}
																title={`${seat.row}-${seat.number} (${seat.grade}) ${seat.price.toLocaleString()}원`}
																disabled={isHolding || isSold}
															>
																{seat.number}
															</button>
														);
													})}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : (
							<p className="text-gray-500 text-center py-4">
								좌석 정보를 불러올 수 없습니다.
							</p>
						)}

						{/* 선택한 좌석 정보 */}
						{selectedSeat && (
							<div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-4">
								<div className="flex justify-between items-center">
									<div>
										<p className="text-sm text-gray-600">선택한 좌석</p>
										<p className="text-2xl font-bold">
											{selectedSeat.row}열 {selectedSeat.number}번
										</p>
										<p className="text-sm text-gray-500">
											{selectedSeat.grade}석 ·{' '}
											{selectedSeat.price?.toLocaleString()}원
										</p>
									</div>
									<button
										onClick={() => dispatch(returnToSeatSelect())}
										className="bg-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-200 text-sm font-medium"
									>
										좌석 변경
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{/* ✅ 좌석 미지정 공연: 수량 선택 UI */}
				{selectedShow.seatType === 'non_reserved' && (
					<div className="bg-white rounded-xl shadow p-6 mb-6">
						<h2 className="text-xl font-bold mb-4">티켓 수량 선택</h2>
						<p className="text-gray-600 mb-4">
							1인 최대 4매까지 구매 가능합니다.
						</p>
						<div className="flex items-center gap-4">
							<button
								onClick={() => dispatch(setQuantity(Math.max(1, quantity - 1)))}
								className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-xl font-bold flex items-center justify-center"
								disabled={quantity <= 1}
							>
								-
							</button>
							<span className="text-3xl font-bold w-12 text-center">
								{quantity}
							</span>
							<button
								onClick={() => dispatch(setQuantity(Math.min(4, quantity + 1)))}
								className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-xl font-bold flex items-center justify-center"
								disabled={quantity >= 4}
							>
								+
							</button>
							<span className="text-gray-600 ml-2">매</span>
						</div>
						<p className="mt-4 text-lg font-semibold text-blue-600">
							총 금액:{' '}
							{(
								(selectedShow.price.min ?? selectedShow.price.max ?? 0) *
								quantity
							).toLocaleString()}
							원
						</p>
					</div>
				)}

				{/* 결제 버튼 — /checkout으로 이동 */}
				{(selectedShow.seatType === 'non_reserved' || selectedSeat) && (
					<button
						onClick={handlePurchase}
						className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors"
					>
						결제하기 (
						{selectedShow.seatType === 'reserved'
							? (selectedSeat?.price ?? 0).toLocaleString()
							: ((selectedShow.price.min ?? 0) * quantity).toLocaleString()}
						원)
					</button>
				)}
			</div>
		</div>
	);
}
