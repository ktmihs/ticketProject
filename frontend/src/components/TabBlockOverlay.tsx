'use client';

import { useRouter } from 'next/navigation';

export function TabBlockOverlay() {
	const router = useRouter();

	return (
		<div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
				<div className="text-5xl mb-4">🚫</div>
				<h2 className="text-xl font-bold mb-2 text-gray-900">
					다른 탭에서 진행 중
				</h2>
				<p className="text-gray-500 text-sm mb-6 leading-relaxed">
					이미 다른 탭에서 티켓 구매가 진행 중입니다.
					<br />
					해당 탭에서 구매를 완료하거나 탭을 닫아주세요.
				</p>
				<button
					onClick={() => router.replace('/')}
					className="w-full bg-gray-800 text-white py-3 rounded-xl font-medium hover:bg-gray-900 transition-colors"
				>
					홈으로 이동
				</button>
			</div>
		</div>
	);
}
