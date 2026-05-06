/** @type {import('next').NextConfig} */
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
