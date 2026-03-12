'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShowList } from '@/components/ShowList';
import { useAppDispatch } from '@/store/hooks';
import { selectShow } from '@/store/purchaseSlice';
import { joinQueue } from '@/store/queueSlice';
import type { Show } from '@/types';

export default function HomePage() {
	const dispatch = useAppDispatch();
	const router = useRouter();
	const [isJoining, setIsJoining] = useState(false);

	const handleSelectShow = async (show: Show) => {
		try {
			setIsJoining(true);

			// Redux에 선택한 공연 저장
			dispatch(selectShow(show));

			// 대기열 진입 (Mock userId)
			const userId = `user_${Date.now()}`;
			await dispatch(joinQueue({ showId: show.id, userId })).unwrap();

			// 대기열 페이지로 이동 (replace 사용 - 뒤로가기 방지)
			router.replace(`/queue/${show.id}`);
		} catch (error) {
			console.error('대기열 진입 실패:', error);
			alert('대기열 진입에 실패했습니다. 다시 시도해주세요.');
		} finally {
			setIsJoining(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* 헤더 */}
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-6">
					<h1 className="text-3xl font-bold text-gray-900">
						🎫 티켓 구매 서비스
					</h1>
					<p className="mt-2 text-gray-600">최고의 공연을 만나보세요</p>
				</div>
			</header>

			{/* 메인 컨텐츠 */}
			<main className="max-w-7xl mx-auto px-4 py-8">
				<h2 className="text-2xl font-bold text-gray-800 mb-6">
					진행 중인 공연
				</h2>

				{isJoining && (
					<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
						<div className="bg-white rounded-lg p-8 text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p className="text-gray-700">대기열에 진입하는 중...</p>
						</div>
					</div>
				)}

				<ShowList onSelectShow={handleSelectShow} />
			</main>

			{/* 푸터 */}
			<footer className="bg-white border-t mt-12">
				<div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600">
					<p>© 2026 티켓 구매 서비스. All rights reserved.</p>
				</div>
			</footer>
		</div>
	);
}
