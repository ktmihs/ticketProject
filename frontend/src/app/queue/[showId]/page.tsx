'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
	updatePosition,
	setAllowed,
	setExpired,
	setError,
	resetQueue,
} from '@/store/queueSlice';

export default function QueuePage() {
	const router = useRouter();
	const dispatch = useAppDispatch();
	const params = useParams();
	const showId = params.showId as string;

	const {
		status,
		position,
		estimatedWaitTime,
		queueToken,
		allowedUntil,
		error,
	} = useAppSelector(state => state.queue);

	const eventSourceRef = useRef<EventSource | null>(null);
	const [isClient, setIsClient] = useState(false);
	const [reconnectAttempts, setReconnectAttempts] = useState(0);
	const reconnectRef = useRef(0);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// ✅ SSE 연결 함수
	const connectSSE = (token: string) => {
		if (eventSourceRef.current) {
			eventSourceRef.current.close();
			eventSourceRef.current = null;
		}

		const apiUrl =
			process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
		console.log(`📡 SSE 연결 시도... (재연결 ${reconnectRef.current}회)`);

		const eventSource = new EventSource(
			`${apiUrl}/queue/stream/${showId}?token=${encodeURIComponent(token)}`,
			{ withCredentials: true },
		);
		eventSourceRef.current = eventSource;

		eventSource.onopen = () => {
			console.log('✅ SSE 연결 성공');
			reconnectRef.current = 0;
			setReconnectAttempts(0);
		};

		eventSource.onmessage = event => {
			try {
				const data = JSON.parse(event.data);
				console.log('📩 SSE 수신:', data);

				if (data.status === 'WAITING') {
					dispatch(
						updatePosition({
							position: data.position,
							estimatedWaitTime: data.estimatedWaitTime,
						}),
					);
				} else if (data.status === 'ALLOWED') {
					dispatch(
						setAllowed({
							queueToken: data.queueToken,
							allowedUntil: data.allowedUntil,
						}),
					);
					eventSource.close();
					router.replace(`/purchase/${showId}`);
				} else if (data.status === 'EXPIRED') {
					dispatch(setExpired());
					eventSource.close();
					alert('대기 시간이 만료되었습니다. 처음부터 다시 시도해주세요.');
					router.replace('/');
				}
			} catch (e) {
				console.error('SSE 파싱 오류:', e);
			}
		};

		eventSource.onerror = () => {
			console.error('❌ SSE 연결 오류');
			eventSource.close();

			if (reconnectRef.current < 5) {
				reconnectRef.current += 1;
				setReconnectAttempts(reconnectRef.current);
				const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
				console.log(`🔄 ${delay}ms 후 재연결...`);
				setTimeout(() => {
					const t = queueToken;
					if (t) connectSSE(t);
				}, delay);
			} else {
				dispatch(
					setError('서버와의 연결이 끊어졌습니다. 페이지를 새로고침해주세요.'),
				);
			}
		};
	};

	// ✅ SSE 시작
	useEffect(() => {
		if (!isClient || status !== 'WAITING' || !queueToken) return;

		connectSSE(queueToken);

		return () => {
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
			}
		};
	}, [isClient, status, queueToken, showId]);

	// queueToken 없으면 홈으로
	useEffect(() => {
		if (!isClient) return;
		if (!queueToken) {
			router.replace('/');
		}
	}, [isClient, queueToken]);

	// ALLOWED 상태면 구매 페이지로
	useEffect(() => {
		if (!isClient || status !== 'ALLOWED' || !allowedUntil) return;
		if (Date.now() < allowedUntil) {
			router.replace(`/purchase/${showId}`);
		}
	}, [isClient, status, allowedUntil, showId]);

	// 브라우저 닫기 경고
	useEffect(() => {
		if (!isClient || status !== 'WAITING') return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '대기열에서 나가시겠습니까?';
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	}, [isClient, status]);

	// 뒤로가기 처리
	useEffect(() => {
		if (!isClient || status !== 'WAITING') return;
		const handler = () => {
			const ok = window.confirm(
				'대기열에서 나가시겠습니까?\n순번이 초기화됩니다.',
			);
			if (ok) {
				dispatch(resetQueue());
				router.replace('/');
			} else {
				window.history.pushState(null, '', window.location.href);
			}
		};
		window.history.pushState(null, '', window.location.href);
		window.addEventListener('popstate', handler);
		return () => window.removeEventListener('popstate', handler);
	}, [isClient, status]);

	if (!isClient) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (status === 'ERROR') {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
				<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
					<div className="text-red-600 mb-4">
						<svg
							className="w-16 h-16 mx-auto"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
					<h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
					<p className="text-gray-600 mb-6">{error}</p>
					<button
						onClick={() => {
							dispatch(resetQueue());
							router.push('/');
						}}
						className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
					>
						홈으로 돌아가기
					</button>
				</div>
			</div>
		);
	}

	if (status === 'WAITING') {
		const formatTime = (seconds: number | null) => {
			if (!seconds) return '계산 중...';
			const minutes = Math.floor(seconds / 60);
			const secs = seconds % 60;
			return `약 ${minutes}분 ${secs}초`;
		};

		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
					<div className="text-center mb-8">
						<div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
							<svg
								className="w-12 h-12 text-blue-600 animate-pulse"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<h1 className="text-2xl font-bold mb-2">대기 중입니다</h1>
						<p className="text-gray-600">잠시만 기다려주세요</p>
					</div>

					<div className="text-center mb-6">
						<p className="text-sm text-gray-600 mb-2">현재 대기 순번</p>
						<p className="text-6xl font-bold text-blue-600">
							{position ?? '...'}
						</p>
						<p className="text-sm text-gray-500 mt-1">번째</p>
					</div>

					<div className="text-center mb-6">
						<p className="text-sm text-gray-600 mb-2">예상 대기 시간</p>
						<p className="text-2xl font-semibold">
							{formatTime(estimatedWaitTime)}
						</p>
					</div>

					<div className="text-center mb-6">
						{reconnectAttempts === 0 ? (
							<div className="inline-flex items-center gap-2 text-green-600 text-sm">
								<div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
								실시간 연결 중
							</div>
						) : (
							<div className="inline-flex items-center gap-2 text-orange-600 text-sm">
								<div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
								재연결 중... ({reconnectAttempts}/5)
							</div>
						)}
					</div>

					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
						<p className="text-xs text-yellow-800 text-center">
							⚠️ 창을 닫거나 뒤로가기를 하면 대기열에서 제외됩니다.
							<br />
							새로고침은 가능합니다.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
				<p className="text-gray-600">대기열 진입 중...</p>
			</div>
		</div>
	);
}
