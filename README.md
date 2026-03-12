# ticketProject

---

## Vibe Coding

본 프로젝트의 구현 및 문서 작성 과정은 **Vibe Coding 방식**을 기반으로 진행되었습니다.

아이디어 설계와 기능 정의는 직접 수행하고, 구현 과정에서는 AI 도구와의 협업을 통해 코드 작성, 구조 개선, 문서화를 반복하며 프로젝트를 완성했습니다.

아이디어 검증과 구현 속도를 높이는 실험적인 개발 방식을 적용했습니다.
이를 통해 단순 기능 구현을 넘어 **프론트엔드 관점에서 서비스 아키텍처를 설계하고 설명할 수 있는 능력**을 보여주는 것을 목표로 합니다.

---

## Overview

티켓팅 서비스는 특정 시점에 **수많은 사용자가 동시에 접근하는 트래픽 집중 서비스**입니다.

이 프로젝트는 다음과 같은 상황을 가정합니다.

- 공연 티켓 판매 시작 시 대규모 사용자 유입
- 서버 과부하 방지를 위한 **대기열 시스템**
- 구매 가능 상태가 되었을 때만 **티켓 구매 허용**

이를 위해 다음과 같은 흐름을 기반으로 서비스가 설계되었습니다.

```
User
  ↓
Next.js
  ↓
Edge
  ↓
Nginx
  ↓
Express API
```

---

## Features

### 이벤트 조회

- 현재 판매 중인 이벤트 목록 조회
- 공연 정보 확인

제공 정보

- 이벤트 ID
- 공연 제목
- 공연 일정
- 판매 시작 시간
- 잔여 티켓 수

---

### 이벤트 상세 조회

특정 이벤트의 상세 정보를 확인할 수 있습니다.

- 좌석 타입
- 좌석 가격
- 좌석 잔여 수량

---

### 대기열 시스템

대규모 트래픽 상황을 가정한 **Queue 기반 접근 제어**가 적용됩니다.

#### 대기열 진입

- 판매 시작 전 접근 시 대기열 페이지로 이동
- 서버 또는 Edge에서 대기열 토큰 발급

#### 대기 상태 유지

- 현재 대기 번호 표시
- 예상 대기 시간 제공
- 주기적 상태 갱신 (Polling / SSE)

#### 구매 가능 상태 전환

- 순서가 도래하면 구매 페이지 접근 허용
- 제한 시간 초과 시 대기열 재진입

---

### 티켓 구매

#### 구매 페이지 접근 제어

- 대기열 토큰 검증 성공 시 접근 가능
- 토큰 검증은 서버에서만 수행

#### 좌석 선택

- 좌석 타입 선택
- 재고 부족 시 즉시 실패 처리

#### 결제 (Mock)

- 결제 성공 / 실패 시나리오 처리
- 결제 완료 후 구매 완료 페이지 이동

---

## Tech Stack

### Frontend

- Next.js (App Router)
- TypeScript

### State Management

- Redux Toolkit
- React Query

### Backend

- Express.js

### Infrastructure

- CDN (CloudFront / Cloudflare Workers)
- Nginx

### Authentication

- HttpOnly Cookie 기반 인증

### Optional

- Redis (Queue / Cache)
- WebSocket 또는 SSE

---

## Architecture

서비스는 **트래픽 분산과 보안 강화를 고려한 구조**로 설계되었습니다.

```
Client
  ↓
Next.js
  ↓
Edge (CDN / Workers)
  ↓
Nginx
  ↓
Express API Server
```

각 계층의 역할

| Layer   | Role                         |
| ------- | ---------------------------- |
| Next.js | UI 렌더링 및 클라이언트 로직 |
| Edge    | 트래픽 필터링 / 대기열 제어  |
| Nginx   | API Gateway                  |
| Express | 비즈니스 로직 처리           |

---

## State Management Strategy

프론트엔드 상태는 **역할에 따라 분리하여 관리**합니다.

| State Type      | Management    | Example     |
| --------------- | ------------- | ----------- |
| UI State        | Local State   | Modal, Tab  |
| Global UI State | Redux Toolkit | 인증 상태   |
| Queue State     | Redux Toolkit | 대기열 위치 |
| Server Data     | React Query   | 이벤트 목록 |
| Cached Data     | React Query   | 이벤트 상세 |

### Redux Toolkit

관리 대상

- 인증 상태
- 대기열 상태
- 전역 UI 상태

### React Query

관리 대상

- 이벤트 목록
- 좌석 정보
- 구매 가능 여부

---

## Security Strategy

Next.js 기반 서비스에서 고려한 보안 전략입니다.

### 인증 방식

- HttpOnly Cookie 사용
- LocalStorage / SessionStorage 사용 금지

### Server Component 활용

- 민감 데이터는 Server Component에서 처리
- Client Component에는 최소 정보만 전달

### API 보호

- Middleware 인증 검사
- 구매 API는 서버에서만 접근 가능

### Edge 보안

- 트래픽 필터링
- 비정상 요청 차단

---

## Queue Flow

티켓 구매 흐름

```
User Access
     ↓
Queue Page
     ↓
Waiting
     ↓
Purchase Available
     ↓
Seat Selection
     ↓
Payment
     ↓
Complete
```

---

## Getting Started

프로젝트 실행 방법

## 1단계: 환경 설정

### Redis 시작

```bash
docker-compose up -d

# Redis 정상 작동 확인
docker ps  # ticket-redis 컨테이너 확인
```

## 2단계: 백엔드 실행

```bash
cd backend

npm install

npm run dev

# ✅ 성공 메시지 확인:
# ==========================================
#   🎫 Ticket Service Backend API
# ==========================================
#   Server running on port 3001
```

### Health Check 확인

```bash
curl http://localhost:3001/health

# 응답:
# {
#   "status": "healthy",
#   "timestamp": 1737532800000,
#   "redis": "connected"
# }
```

## 3단계: 프론트엔드 실행

**새 터미널**

```bash
cd frontend

npm install

npm run dev

# ✅ 성공 메시지 확인:
# - ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

## 4단계: 초기 데이터 설정

### Redis CLI 사용

```bash
docker exec -it ticket-redis redis-cli

# 초기 재고 설정
SET stock:show_123 5000
SET stock:show_456 3000
SET stock:show_789 10000

exit
```

## 5단계: 서비스 접속

### 프론트엔드

```
http://localhost:3000
```

### 백엔드 API

```
http://localhost:3001/api
```

---

## Development Goals

이 프로젝트는 단순 기능 구현보다 **구조적 설계 능력을 보여주는 것을 목표로 합니다.**

핵심 목표

- 대규모 트래픽 환경 설계
- 대기열 시스템 설계
- 상태 관리 전략 정리
- 보안 고려
- 프론트엔드 아키텍처 설계

---
