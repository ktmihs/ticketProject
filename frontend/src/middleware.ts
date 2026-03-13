import { NextRequest, NextResponse } from 'next/server';

// 보호할 경로
const protectedRoutes = ['/purchase', '/queue', '/success'];

// 로그인 상태에서 접근 불필요한 경로
const authRoutes = ['/login'];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const accessToken = request.cookies.get('accessToken')?.value;

	const isProtectedRoute = protectedRoutes.some(route =>
		pathname.startsWith(route),
	);
	const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

	// 보호된 페이지 + 로그인 안 된 경우 → 로그인 페이지로
	if (isProtectedRoute && !accessToken) {
		return NextResponse.redirect(new URL('/login', request.url));
	}

	// 로그인 페이지 + 이미 로그인된 경우 → 홈으로
	if (isAuthRoute && accessToken) {
		return NextResponse.redirect(new URL('/', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/purchase/:path*', '/queue/:path*', '/success', '/login'],
};
