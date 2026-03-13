'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { store, persistor } from '@/store';
import { fetchCurrentUser } from '@/store/authSlice';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
						refetchOnWindowFocus: false,
					},
				},
			}),
	);

	useEffect(() => {
		store.dispatch(fetchCurrentUser()).catch(() => {});
	}, []);

	return (
		<Provider store={store}>
			{/* ✅ PersistGate: Redux 상태 복원 완료 후 렌더링 */}
			<PersistGate loading={<LoadingFallback />} persistor={persistor}>
				<QueryClientProvider client={queryClient}>
					{children}
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</PersistGate>
		</Provider>
	);
}

function LoadingFallback() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="text-center">
				<div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
				<p className="text-gray-600">잠시만 기다려주세요...</p>
			</div>
		</div>
	);
}
