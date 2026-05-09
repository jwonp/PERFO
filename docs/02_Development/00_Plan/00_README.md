# PERFO 개발 계획

> 이 디렉터리는 설계 문서를 실제 구현 단계로 내리기 위한 실행 계획만 다룬다.
> 상세 설계 기준은 `docs/01_Design` 하위 문서를 기준으로 한다.

## 문서 구성

- [01_FRONTEND_PLAN.md](./01_FRONTEND_PLAN.md): Next.js 프론트엔드 구현 계획
- [02_BACKEND_PLAN.md](./02_BACKEND_PLAN.md): Spring 백엔드 구현 계획
- [03_INFRA_PLAN.md](./03_INFRA_PLAN.md): 배포, 운영, 인프라 구축 계획
- [04_TICKET_QR_VALIDATION_PLAN.md](./04_TICKET_QR_VALIDATION_PLAN.md): 티켓 QR 표시와 검표 구현 계획
- [05_DARK_MODE_PLAN.md](./05_DARK_MODE_PLAN.md): 다크 모드 구현 계획
- [06_TICKET_NOTIFICATION_PLAN.md](./06_TICKET_NOTIFICATION_PLAN.md): 티켓 상태 변화 푸시 알림과 알림 내역 구현 계획
- [07_USER_PROFILE_EDIT_PLAN.md](./07_USER_PROFILE_EDIT_PLAN.md): 유저 프로필 닉네임과 아이콘 변경 구현 계획
- [08_UBUNTU_SERVER_CICD_AUTOSCALING_PLAN.md](./08_UBUNTU_SERVER_CICD_AUTOSCALING_PLAN.md): Ubuntu Server + Cloudflare Tunnel 기반 CI/CD와 오토스케일링 운영 계획
- [09_ONPREM_MINIPC_LOAD_ARCHITECTURE_PLAN.md](./09_ONPREM_MINIPC_LOAD_ARCHITECTURE_PLAN.md): 온프레미스 미니PC 기준 고부하 처리 구현 계획
- [10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md](./10_MINIO_PROFILE_IMAGE_STORAGE_PLAN.md): MinIO 기반 프로필 이미지 저장소 도입 계획
- [11_ISSUED_TICKET_EDIT_OPEN_TIME_IMAGE_PLAN.md](./11_ISSUED_TICKET_EDIT_OPEN_TIME_IMAGE_PLAN.md): 발급 티켓 상태 수정, 오픈 시간, 이미지 추가/수정 구현 계획
- [12_TICKET_FILTER_PLAN.md](./12_TICKET_FILTER_PLAN.md): 사용 완료 티켓 표시와 중복 구매 허용 필터 구현 계획
- [13_PERFORMANCE_TEST_PLAN.md](./13_PERFORMANCE_TEST_PLAN.md): 성능 테스트 실행과 결과 문서화 계획
- [14_CICD_IMPLEMENTATION_PLAN.md](./14_CICD_IMPLEMENTATION_PLAN.md): 현재 Ubuntu 서버 기준 CI/CD 구축 실행 계획
- [15_TICKETING_ENGINE_STABILITY_PLAN.md](./15_TICKETING_ENGINE_STABILITY_PLAN.md): 티켓 오픈 시각, 예매 가능 시점, 검표 시각을 안정적으로 운영하기 위한 티켓팅 엔진 구현 계획
- [16_TICKETING_PHASE1_DEPLOYMENT_PLAN.md](./16_TICKETING_PHASE1_DEPLOYMENT_PLAN.md): 티켓팅 엔진 Phase 1 운영 배포 절차와 검증 계획
- [17_TICKETING_PROJECTION_CONTRACT.md](./17_TICKETING_PROJECTION_CONTRACT.md): 티켓팅 outbox relay와 projection consumer payload 계약
- [18_TICKETING_OBSERVABILITY_ALERTS.md](./18_TICKETING_OBSERVABILITY_ALERTS.md): 티켓팅 관측성과 알림 기준 정리
- [19_EVENT_DISCOVERY_BOOKING_FLOW_PLAN.md](./19_EVENT_DISCOVERY_BOOKING_FLOW_PLAN.md): 사용자가 이벤트를 발견하고 상세를 거쳐 예매까지 진입하는 플로우 구현 계획
- [20_MVP_OPEN_READINESS_PLAN.md](./20_MVP_OPEN_READINESS_PLAN.md): 현재 구현 상태를 기준으로 MVP 오픈 차단 이슈와 우선 개발 계획을 정리한 문서

## 개발 원칙

- 현재는 개인 프로젝트 규모에 맞게 작게 시작하되, 설계는 확장 가능성을 유지한다.
- 구현은 프론트, 백엔드, 인프라를 분리하되 공통 계약은 먼저 고정한다.
- 새 코드는 목표 구조를 따르고, 기존 코드는 수정 시점에 점진적으로 정리한다.
- 수작업 운영 절차는 최소화하고, 반복 작업은 가능한 한 문서화 또는 자동화한다.

## 선행 고정 사항

- 최종 진실 원본은 `PostgreSQL`이다.
- 인증은 `JWT` 중심으로 설계하고, 계정/로그인 수단 정책은 [02_AUTH_ACCOUNT_STRATEGY.md](../../01_Design/00_Architecture/02_AUTH_ACCOUNT_STRATEGY.md)를 따른다.
- 티켓팅 상태 전달은 `SSE`를 기본으로 하고 `Polling fallback`을 둔다.
- 중복 요청은 `idempotency key` 기준으로 같은 결과를 재사용한다.
- 관리자 기능은 분리 가능한 경계로 설계한다.
- A/B 테스트는 `userId` 기준 variant 고정과 카나리 배포를 전제로 한다.

## 구현 순서

1. 공통 계약 정의
2. 백엔드 핵심 도메인 구현
3. 프론트 기본 화면과 API 연동
4. SSE, A/B 테스트, 관리자 기능 연결
5. 배포 자동화와 운영 보강

## 공통 계약 우선순위

- 인증/인가 규칙
- 계정 생성, 소셜 로그인, 계정 연동/해제 규칙
- 티켓팅 상태 값 계약
- 요청/응답 DTO
- 도메인 이벤트 이름과 payload 초안
- 에러 코드와 재시도 기준

## 권장 마일스톤

### Milestone 1. 기본 동작

- 로그인
- 이벤트 조회
- 티켓팅 요청
- 티켓 상태 조회
- QR 검증 기본 흐름

### Milestone 2. 운영 안정화

- SSE 상태 전파
- Polling fallback
- 관리자 조회/재처리
- 로그/에러 추적
- 백업과 복구 점검

### Milestone 3. 확장 준비

- A/B 테스트 지표 수집
- 카나리 배포 파이프라인
- Redis 역할 분리
- PostgreSQL Replica 준비
- IaC 초안 정리
