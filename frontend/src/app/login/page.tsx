'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/authSlice';

export default function LoginPage() {
	const dispatch = useAppDispatch();
	const router = useRouter();
	const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);

	const [form, setForm] = useState({ email: '', password: '' });
	const [error, setError] = useState('');

	useEffect(() => {
		if (isAuthenticated) router.replace('/');
	}, [isAuthenticated, router]);

	const handleLogin = async () => {
		setError('');
		if (!form.email || !form.password) {
			setError('이메일과 비밀번호를 입력해주세요.');
			return;
		}
		try {
			await dispatch(login(form)).unwrap();
			router.replace('/');
		} catch {
			setError('이메일 또는 비밀번호가 올바르지 않습니다.');
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
						<span className="text-3xl">🎫</span>
					</div>
					<h1 className="text-2xl font-bold text-gray-900">티켓 구매 서비스</h1>
					<p className="text-gray-500 text-sm mt-1">
						로그인하고 공연을 예매하세요
					</p>
				</div>

				<div className="bg-white rounded-2xl shadow-lg p-8">
					<h2 className="text-xl font-bold text-gray-800 mb-6">로그인</h2>

					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								이메일
							</label>
							<input
								type="email"
								value={form.email}
								onChange={e => setForm({ ...form, email: e.target.value })}
								onKeyDown={e => e.key === 'Enter' && handleLogin()}
								placeholder="example@email.com"
								className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1.5">
								비밀번호
							</label>
							<input
								type="password"
								value={form.password}
								onChange={e => setForm({ ...form, password: e.target.value })}
								onKeyDown={e => e.key === 'Enter' && handleLogin()}
								placeholder="비밀번호를 입력하세요"
								className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{error && (
							<div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
								<p className="text-sm text-red-600">{error}</p>
							</div>
						)}

						<button
							onClick={handleLogin}
							disabled={isLoading}
							className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
						>
							{isLoading ? (
								<span className="flex items-center justify-center gap-2">
									<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									로그인 중...
								</span>
							) : (
								'로그인'
							)}
						</button>
					</div>

					<div className="mt-6 bg-gray-50 rounded-xl px-4 py-3">
						<p className="text-xs text-gray-500 text-center">
							포트폴리오 프로젝트입니다. 아무 이메일/비밀번호로 로그인할 수
							있습니다.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
