# PERFO 백엔드 개발 계획

> 기준 문서:
> `docs/01_Design/00_Architecture/04_REQUEST_PROCESSING_STRATEGY.md`
> `docs/01_Design/00_Architecture/02_AUTH_ACCOUNT_STRATEGY.md`

## 1. 목표

- 티켓팅, 검증, 알림, 관리자 기능을 분리 가능한 경계로 구현한다.
- 최종 진실 원본은 `PostgreSQL`로 유지한다.
- Redis는 재고, 임시 상태, 상태 전파 보조 계층으로 사용한다.
- 중복 요청은 `idempotency key` 기준으로 제어한다.

## 2. 핵심 도메인

- 인증/인가
- 이벤트
- 티켓팅
- 티켓 조회
- QR 검증
- 알림
- 관리자 재처리

## 3. 우선 구현 순서

1. 인증과 권한
2. 이벤트/티켓 도메인 모델
3. 티켓팅 요청 처리
4. 티켓 상태 조회
5. SSE 상태 발행
6. QR 검증
7. 관리자 조회/재처리
8. 도메인 이벤트 정리

## 4. 기능별 구현 계획

### 4.1 인증과 권한

- JWT 발급/검증
- `User`와 `AuthIdentity` 분리
- 일반 회원가입과 소셜 최초 가입 분리
- 소셜 최초 가입 후 10분 임시 가입 상태 구현
- 이메일 인증 코드 발급/검증
- 계정 연동/해제와 감사 로그 구현
- 사용자와 관리자 권한 분리
- 운영 관리자 / 시스템 관리자 권한 모델 반영
- 제한적 토큰 폐기 전략 구현

### 4.2 티켓팅 처리

- 요청 ID 발급
- `idempotency key` 저장과 재사용
- Redis 재고 차감
- PostgreSQL 트랜잭션 저장
- DB 확정 후 상태 발행

### 4.3 상태 전달

- SSE 엔드포인트 구현
- Redis Pub/Sub 기반 상태 전파
- SSE 실패 시 Polling 조회용 API 제공

### 4.4 QR 검증

- QR 서명 생성/검증
- 검증 완료 이력 저장
- 중복 사용 처리

### 4.5 관리자 기능

- 조회 API
- 재처리 API
- 상태 수동 수정 차단
- 감사 로그 연계 포인트 정의

### 4.6 도메인 이벤트

- `TicketingRequested`
- `TicketIssued`
- `TicketingFailed`
- `VerificationCompleted`
- `NotificationRequested`

## 5. 데이터 계층 계획

### 5.1 PostgreSQL

- 사용자, 로그인 수단, 이메일 인증, 계정 감사 로그, 이벤트, 티켓, 구매 이력, 검증 이력 테이블 설계
- 제약조건과 인덱스 설계
- 읽기/쓰기 분리 가능성 고려

### 5.2 Redis

- 재고용
- 상태 전파용 Pub/Sub
- 세션 또는 블랙리스트용
- 락 또는 중복 요청 제어용

## 6. 실패 시나리오 구현 포인트

- Redis 성공 후 DB 실패 시 자동 복구
- DB 성공 후 SSE 실패 시 상태 재전송 또는 polling fallback
- 동일 `idempotency key` 재요청 시 기존 결과 반환
- 네트워크 지연과 중복 요청에서 상태 오염 방지

## 7. 테스트 계획

- 단위 테스트: 상태 전이, 권한, QR 검증, idempotency
- 통합 테스트: 티켓팅 성공/실패, 재처리, SSE 상태 발행
- 동시성 테스트: 재고 차감, 중복 요청, 락 경계

## 8. 완료 기준

- DB 기준 정합성이 유지된다.
- 중복 요청이 멱등하게 처리된다.
- SSE와 Polling 조회 결과가 같은 상태 계약을 따른다.
- 관리자 기능이 조회/재처리 범위로 제한된다.

## 9. 이후 확장 포인트

- Kafka 도입
- Outbox 패턴
- Notification worker 분리
- PostgreSQL Replica 연동
