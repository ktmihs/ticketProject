'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { resetPurchase } from '@/store/purchaseSlice';
import { resetQueue } from '@/store/queueSlice';

export default function SuccessPage() {
	const dispatch = useAppDispatch();
	const { purchaseResult, selectedShow, selectedSeat, quantity } =
		useAppSelector(state => state.purchase);

	useEffect(() => {
		return () => {
			dispatch(resetPurchase());
			dispatch(resetQueue());
		};
	}, [dispatch]);

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
			<div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
				{/* 성공 아이콘 */}
				<div className="mb-6">
					<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
						<svg
							className="w-12 h-12 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				</div>

				<h1 className="text-3xl font-bold text-gray-800 mb-2">구매 완료!</h1>
				<p className="text-gray-600 mb-8">
					티켓 구매가 성공적으로 완료되었습니다.
				</p>

				{/* ✅ 실제 구매 정보 표시 */}
				<div className="bg-gray-50 rounded-xl p-6 mb-6 text-left space-y-3">
					<h2 className="font-semibold text-gray-800 mb-3">예매 정보</h2>

					<div className="flex justify-between text-sm">
						<span className="text-gray-500">예매번호</span>
						<span className="font-mono font-medium text-gray-800">
							{purchaseResult?.purchaseId ?? `TK${Date.now()}`}
						</span>
					</div>

					{selectedShow && (
						<div className="flex justify-between text-sm">
							<span className="text-gray-500">공연명</span>
							<span className="font-medium text-gray-800">
								{selectedShow.title}
							</span>
						</div>
					)}

					{purchaseResult?.seat ? (
						<div className="flex justify-between text-sm">
							<span className="text-gray-500">좌석</span>
							<span className="font-medium text-gray-800">
								{purchaseResult.seat.row}열 {purchaseResult.seat.number}번
							</span>
						</div>
					) : purchaseResult?.quantity ? (
						<div className="flex justify-between text-sm">
							<span className="text-gray-500">수량</span>
							<span className="font-medium text-gray-800">
								{purchaseResult.quantity}매
							</span>
						</div>
					) : null}

					{purchaseResult?.totalAmount && (
						<div className="flex justify-between text-sm">
							<span className="text-gray-500">결제금액</span>
							<span className="font-bold text-blue-600 text-base">
								{purchaseResult.totalAmount.toLocaleString()}원
							</span>
						</div>
					)}

					<div className="flex justify-between text-sm">
						<span className="text-gray-500">예매일시</span>
						<span className="text-gray-800">
							{purchaseResult?.purchasedAt
								? new Date(purchaseResult.purchasedAt).toLocaleString('ko-KR')
								: new Date().toLocaleString('ko-KR')}
						</span>
					</div>

					{purchaseResult?.ticket?.ticketId && (
						<div className="flex justify-between text-sm">
							<span className="text-gray-500">티켓 ID</span>
							<span className="font-mono text-xs text-gray-600 break-all">
								{purchaseResult.ticket.ticketId}
							</span>
						</div>
					)}
				</div>

				{/* QR 코드 영역 */}
				<div className="bg-gray-100 rounded-xl p-6 mb-6">
					<div className="w-32 h-32 bg-white mx-auto flex items-center justify-center rounded border border-gray-200">
						{purchaseResult?.ticket?.qrCode ? (
							<div className="text-center">
								<p className="text-[8px] text-gray-400 break-all px-1">QR</p>
								<p className="text-[7px] text-gray-400 break-all px-1">
									{purchaseResult.ticket.ticketId}
								</p>
							</div>
						) : (
							<p className="text-gray-400 text-xs">QR 코드</p>
						)}
					</div>
					<p className="text-xs text-gray-500 mt-2">
						공연 당일 QR 코드를 제시해주세요
					</p>
				</div>

				{/* 안내사항 */}
				<div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
					<h3 className="font-semibold text-blue-800 text-sm mb-2">안내사항</h3>
					<ul className="text-xs text-blue-700 space-y-1">
						<li>• 예매 확인 이메일을 확인해주세요</li>
						<li>• 공연 30분 전까지 입장해주세요</li>
						<li>• 신분증을 지참해주세요</li>
					</ul>
				</div>

				<Link
					href="/"
					className="block w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors"
				>
					홈으로 돌아가기
				</Link>
			</div>
		</div>
	);
}
