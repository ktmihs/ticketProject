'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShowList } from '@/components/ShowList';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectShow } from '@/store/purchaseSlice';
import { joinQueue } from '@/store/queueSlice';
import { logout } from '@/store/authSlice';
import type { Show } from '@/types';

export default function HomePage() {
	const dispatch = useAppDispatch();
	const router = useRouter();
	const [isJoining, setIsJoining] = useState(false);

	const { isAuthenticated, email } = useAppSelector(state => state.auth);

	const handleSelectShow = async (show: Show) => {
		// 비로그인 시 로그인 페이지로
		if (!isAuthenticated) {
			router.push('/login');
			return;
		}
		try {
			setIsJoining(true);
			dispatch(selectShow(show));
			await dispatch(joinQueue({ showId: show.id })).unwrap(); // userId 제거
			router.replace(`/queue/${show.id}`);
		} catch (error) {
			console.error('대기열 진입 실패:', error);
			alert('대기열 진입에 실패했습니다. 다시 시도해주세요.');
		} finally {
			setIsJoining(false);
		}
	};

	const handleLogout = async () => {
		await dispatch(logout());
		router.refresh();
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<header className="bg-white shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">
							🎫 티켓 구매 서비스
						</h1>
						<p className="mt-1 text-gray-500 text-sm">
							최고의 공연을 만나보세요
						</p>
					</div>

					{/* 로그인/로그아웃 영역 */}
					{isAuthenticated ? (
						<div className="flex items-center gap-3">
							<span className="text-sm text-gray-600">{email}</span>
							<button
								onClick={handleLogout}
								className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
							>
								로그아웃
							</button>
						</div>
					) : (
						<Link
							href="/login"
							className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
						>
							로그인
						</Link>
					)}
				</div>
			</header>

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

			<footer className="bg-white border-t mt-12">
				<div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600">
					<p>© 2026 티켓 구매 서비스. All rights reserved.</p>
				</div>
			</footer>
		</div>
	);
}
