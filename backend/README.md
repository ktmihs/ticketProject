# 티켓 구매 서비스 - Backend API

Express.js 기반 백엔드 API 서버입니다.

## 기술 스택

- Express.js 4.x
- Redis (ioredis)
- JWT (jsonwebtoken)
- Node.js 18+ (wrangler 사용 시 20+)

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env

# 개발 서버 실행
npm run dev

# 프로덕션 실행
npm start
```

## 환경 변수

`.env` 파일에 다음 변수를 설정하세요:

```
PORT=3001
REDIS_HOST=railway에 올라가있는 radis 주소 or localhost
REDIS_PORT=railway에 올라가있는 radis 포트 or 6379
JWT_SECRET=본인의 JWT secret
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_MAX_REQUESTS=10 (분당 10회 요청으로 제어하여 매크로 다량 요청 방지)
```

## API 엔드포인트

### 공연 조회

- `GET /api/shows` - 공연 목록
- `GET /api/shows/:showId` - 공연 상세

### 대기열

- `POST /api/queue/join` - 대기열 진입
- `GET /api/queue/status` - 대기열 상태 조회

### 구매

- `GET /api/shows/:showId/available-count` - 잔여 티켓 수
- `POST /api/purchase/non-reserved` - 좌석 미지정 구매
- `GET /api/seats/:showId` - 좌석 조회
- `POST /api/seats/hold` - 좌석 선점
- `POST /api/purchase/reserved` - 좌석 지정 구매

## Health Check

```bash
curl http://localhost:3001/health
```

## 프로젝트 구조

```
src/
├── app.js              # Express 앱
├── config/             # 환경 설정
├── middleware/         # 인증, 에러 핸들러
├── routes/             # API 라우트
├── controllers/        # 비즈니스 로직
├── services/           # Redis 서비스
└── utils/              # JWT, 에러 유틸
```
