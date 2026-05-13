/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
	"default-src 'self'",
	// Next.js 하이드레이션 인라인 스크립트 허용 필수, dev는 HMR용 eval 추가
	`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self'",
	// API는 Next.js rewrite로 same-origin 처리됨
	"connect-src 'self'",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
	...(!isDev ? ["upgrade-insecure-requests"] : []),
].join('; ');

const nextConfig = {
	reactStrictMode: true,
	// Docker 배포용 standalone 빌드 — node_modules 없이 실행 가능한 최소 번들 생성
	output: 'standalone',
	env: {
		NEXT_PUBLIC_API_URL: '/api',
		// process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
	},
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'https://ticket-edge.ktmihs.workers.dev/api/:path*', // Railway URL로 교체
			},
		];
	},
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'Content-Security-Policy',
						value: cspDirectives,
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-XSS-Protection',
						value: '1; mode=block',
					},
				],
			},
		];
	},
};

module.exports = nextConfig;
