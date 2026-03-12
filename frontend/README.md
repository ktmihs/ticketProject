# 티켓 구매 서비스 - Frontend

Next.js 14 (App Router) 기반 프론트엔드 애플리케이션입니다.

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Redux Toolkit
- React Query (TanStack Query)
- Tailwind CSS

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.local.example .env.local

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 환경 변수

`.env.local` 파일에 다음 변수를 설정하세요:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## 페이지 구조

- `/` - 홈 (공연 목록)
- `/queue/[showId]` - 대기열
- `/purchase/[showId]` - 구매
- `/success` - 구매 완료

## 상태 관리

### Redux Toolkit
- 대기열 상태 (position, status, queueToken)
- 구매 단계 (IDLE → QUEUE → SEAT_SELECT → PAYMENT → COMPLETED)

### React Query
- 공연 목록/상세 (캐시 5분)
- 좌석 배치도 (캐시 5초, 자동 refetch)
- 잔여 티켓 수 (캐시 3초, 자동 refetch)

## 주요 Hook

- `useQueuePolling` - 대기열 상태 Polling (3초)
- `useHoldTimer` - 좌석 선점 타이머 (1초)
- `useShows` - 공연 목록 조회
- `useSeats` - 좌석 조회

## 프로젝트 구조

```
src/
├── app/                # App Router 페이지
├── components/         # React 컴포넌트
├── store/              # Redux Toolkit
├── hooks/              # React Query, Custom Hooks
├── services/           # API 클라이언트
├── types/              # TypeScript 타입
└── utils/              # 유틸리티 함수
```
