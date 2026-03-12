'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotFoundCustomPage() {
	const router = useRouter();

	useEffect(() => {
		// ✨ queueToken 삭제
		if (typeof window !== 'undefined') {
			localStorage.removeItem('queueToken');
			console.log('❌ 404 - queueToken 삭제됨');
		}

		// 3초 후 자동으로 홈으로 리다이렉트
		const timer = setTimeout(() => {
			window.location.href = '/';
		}, 3000);

		return () => clearTimeout(timer);
	}, []);

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center">
				<div className="mb-6">
					<div className="text-8xl mb-4">🎭</div>
					<div className="text-white">
						<h1 className="text-6xl font-bold mb-2">404</h1>
						<p className="text-xl opacity-90">페이지를 찾을 수 없습니다</p>
					</div>
				</div>

				<div className="mb-8 text-white/80 space-y-2">
					<p>요청하신 페이지가 존재하지 않거나</p>
					<p>이동되었을 수 있습니다.</p>
				</div>

				<div className="mb-6 text-white/60 text-sm">
					3초 후 자동으로 홈으로 이동합니다...
				</div>

				<div className="space-y-3">
					<button
						onClick={() => {
							localStorage.removeItem('queueToken');
							window.location.href = '/';
						}}
						className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
					>
						홈으로 돌아가기
					</button>
				</div>

				<div className="mt-8 pt-6 border-t border-white/20">
					<p className="text-white/60 text-sm mb-3">이런 페이지는 어떠세요?</p>
					<div className="flex gap-2 justify-center text-sm">
						<button
							onClick={() => {
								localStorage.removeItem('queueToken');
								window.location.href = '/';
							}}
							className="text-blue-300 hover:text-blue-200 underline"
						>
							공연 목록
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
