export interface Env {
	ORIGIN_URL: string;
	FRONTEND_URL: string;
	JWT_SECRET: string;
	RATE_LIMIT_KV: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const requestOrigin = request.headers.get('Origin') ?? '';

		// 허용된 Origin 목록
		const allowedOrigins = [
			env.FRONTEND_URL,
			'https://your-production-domain.com', // 프로덕션 도메인 추가 시
		];
		const origin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

		if (request.method === 'OPTIONS') {
			return handleCORS(origin);
		}

		const response = await handleRequest(request, env, url);

		// 모든 응답에 CORS 헤더 추가
		const corsResponse = new Response(response.body, response);
		corsResponse.headers.set('Access-Control-Allow-Origin', origin);
		corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
		corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Queue-Token');
		corsResponse.headers.set('Access-Control-Allow-Credentials', 'true');

		// ✅ 백엔드의 Set-Cookie를 브라우저로 그대로 전달
		const setCookie = response.headers.getAll('set-cookie');
		setCookie.forEach((cookie) => corsResponse.headers.append('set-cookie', cookie));

		return corsResponse;
	},
};

async function handleRequest(request: Request, env: Env, url: URL): Promise<Response> {
	if (isCacheable(url.pathname)) {
		// fetch(request) 대신 ORIGIN_URL로 프록시
		const proxied = new Request(`${env.ORIGIN_URL}${url.pathname}${url.search}`, {
			method: request.method,
			headers: request.headers,
			body: null,
		});
		return fetch(proxied);
	}

	const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
	const rateLimitResult = await checkRateLimit(ip, env.RATE_LIMIT_KV);
	if (!rateLimitResult.allowed) {
		return new Response(JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다' } }), {
			status: 429,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (isPurchaseRoute(url.pathname)) {
		const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? request.headers.get('X-Queue-Token');

		if (!token) {
			return new Response(JSON.stringify({ error: { code: 'NO_TOKEN', message: '대기열 토큰이 없습니다' } }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const payload = await verifyJWT(token, env.JWT_SECRET);
		if (!payload) {
			return new Response(JSON.stringify({ error: { code: 'INVALID_TOKEN', message: '유효하지 않은 토큰입니다' } }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (payload.status !== 'ALLOWED') {
			return Response.redirect(`${env.FRONTEND_URL}/queue/${payload.showId}`, 302);
		}

		const headers = Object.fromEntries(request.headers);
		delete headers['x-queue-token']; // 기존 값 제거 후 덮어쓰기

		const modifiedRequest = new Request(`${env.ORIGIN_URL}${url.pathname}${url.search}`, {
			method: request.method,
			headers: {
				...headers,
				'X-Queue-Token': token,
				'X-Forwarded-For': ip,
			},
			body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
		});
		return fetch(modifiedRequest);
	}

	const proxied = new Request(`${env.ORIGIN_URL}${url.pathname}${url.search}`, {
		method: request.method,
		headers: request.headers,
		body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
	});
	return fetch(proxied);
}

function isCacheable(pathname: string): boolean {
	return pathname === '/api/shows' || pathname.startsWith('/_next/static/');
}

function isPurchaseRoute(pathname: string): boolean {
	return pathname.startsWith('/api/seats') || pathname.startsWith('/api/purchase');
}

async function checkRateLimit(ip: string, kv: KVNamespace): Promise<{ allowed: boolean }> {
	const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
	const current = await kv.get(key);
	const count = current ? parseInt(current) : 0;

	if (count >= 10) return { allowed: false };

	await kv.put(key, String(count + 1), { expirationTtl: 60 });
	return { allowed: true };
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
	try {
		const [headerB64, payloadB64, signatureB64] = token.split('.');
		if (!headerB64 || !payloadB64 || !signatureB64) return null;

		const encoder = new TextEncoder();
		const keyData = encoder.encode(secret);
		const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

		const data = encoder.encode(`${headerB64}.${payloadB64}`);
		const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
		const valid = await crypto.subtle.verify('HMAC', cryptoKey, signature, data);
		if (!valid) return null;

		const payload = JSON.parse(atob(payloadB64));
		if (payload.exp && payload.exp < Date.now() / 1000) return null;

		return payload;
	} catch {
		return null;
	}
}

function handleCORS(origin: string): Response {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Queue-Token',
			'Access-Control-Allow-Credentials': 'true',
		},
	});
}
