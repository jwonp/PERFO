# 성능 테스트 실행과 결과 문서화 계획

> 기준 문서:
> `docs/02_Development/00_Plan/02_BACKEND_PLAN.md`
> `docs/02_Development/00_Plan/03_INFRA_PLAN.md`
> `docs/02_Development/00_Plan/08_UBUNTU_SERVER_CICD_AUTOSCALING_PLAN.md`
> `docs/02_Development/00_Plan/09_ONPREM_MINIPC_LOAD_ARCHITECTURE_PLAN.md`
> `docs/01_Design/00_Architecture/04_REQUEST_PROCESSING_STRATEGY.md`
> `docs/01_Design/05_test/00_README.md`
> `backend/src/test/kotlin/com/perfo/backend/service/TicketVerificationConcurrencyTest.kt`
>
> 이 문서는 PERFO에서 성능 테스트를 어떤 종류로 나눠 진행할지, 어떤 도구와 환경으로 실행할지, 어떤 지표를 수집할지, 그리고 결과를 어떤 형식으로 문서화할지 정리한 실행 계획이다.

## 1. 목표

- 티켓팅, QR 발급, QR 검증, 알림 동기화처럼 부하가 몰릴 수 있는 경로를 사전에 검증한다.
- 단순 평균 응답시간이 아니라 `정합성`, `최대 처리량`, `오류율`, `자원 포화 지점`을 함께 본다.
- 현재 온프레미스 미니PC 기준에서 감당 가능한 운영 한계를 수치로 남긴다.
- 성능 테스트 결과를 반복 가능한 형식으로 문서화해, 이후 코드 변경이나 인프라 변경 전후 비교가 가능하게 만든다.

## 2. 현재 상태

- 프론트엔드는 `Vitest`, `Playwright` 기반 테스트는 갖춰져 있지만 성능 테스트 전용 스크립트는 없다.
- 백엔드는 `JUnit` 기반 단위/통합/동시성 테스트가 있으며, `TicketVerificationConcurrencyTest`처럼 경쟁 조건 검증은 일부 존재한다.
- 부하 대응 원칙은 `09_ONPREM_MINIPC_LOAD_ARCHITECTURE_PLAN.md`에 정리되어 있지만, 실제 테스트 실행 절차와 결과 리포트 형식은 없다.
- 저장소에는 `scripts/`나 `tests/performance/` 같은 성능 테스트 전용 디렉터리도 아직 없다.

## 3. 핵심 원칙

- 성능 테스트는 기능 테스트의 대체가 아니라 별도 검증 계층이다.
- 부하가 높아져도 데이터 정합성이 깨지지 않는지를 먼저 확인한다.
- 결과 비교가 가능하도록 테스트 환경, 데이터, 동시 사용자 수, 지속 시간, 버전 정보를 반드시 같이 기록한다.
- 로컬 노트북 수치와 운영 미니PC 수치를 섞어 해석하지 않는다.
- 평균값보다 `p95`, `p99`, 오류율, CPU/메모리/DB 포화 지점을 더 중요하게 본다.

## 4. 테스트 분류

성능 테스트는 아래 다섯 종류로 나눈다.

### 4.1 Baseline Test

- 목적: 현재 기본 성능 기준선 측정
- 질문:
  - 단일 사용자 또는 낮은 동시성에서 응답시간이 어느 정도인가
  - 각 API의 정상 시 평균/백분위 지연이 어느 정도인가

### 4.2 Load Test

- 목적: 예상 운영 부하에서 안정적으로 처리되는지 확인
- 질문:
  - 평시 또는 이벤트 직전/직후 예상 트래픽을 견디는가
  - 오류율이 허용 범위 안에 머무는가

### 4.3 Spike Test

- 목적: 순간 급증 트래픽에 대한 복원력 확인
- 질문:
  - 갑작스러운 동시 요청 급증 시 응답이 느려지더라도 정합성은 유지되는가
  - rate limit, admission control, retry-after 정책이 의도대로 동작하는가

### 4.4 Stress Test

- 목적: 시스템 한계점과 붕괴 패턴 파악
- 질문:
  - 어느 시점부터 오류율이 급증하는가
  - CPU, 메모리, DB connection, Redis latency 중 어디가 먼저 병목이 되는가

### 4.5 Soak Test

- 목적: 장시간 실행에서 메모리 누수, connection leak, queue 적체 확인
- 질문:
  - 30분~4시간 이상 지속 부하에서 성능이 점진적으로 악화되는가
  - 로그, 메모리, DB 커넥션, Redis pending backlog가 누적되는가

## 5. 우선 검증 대상

### 5.1 1순위

- 티켓팅 요청 API
- 티켓 상태 조회 API
- QR 토큰 발급 API
- QR 검증 API

### 5.2 2순위

- 발급 티켓 목록 조회
- 예약 티켓 목록 조회
- 알림 목록 조회 / unread count
- 프로필 이미지/티켓 이미지 조회

### 5.3 3순위

- 로그인/세션 복구
- 프론트 SSR/초기 렌더
- 다국어 페이지 진입

## 6. 시나리오별 테스트 계획

### 6.1 티켓팅 요청

목적:

- 재고 차감과 idempotency가 부하에서도 유지되는지 확인
- `SOLD_OUT`, `DUPLICATE`, `PROCESSING` 처리의 분포를 본다

주요 지표:

- RPS
- p50/p95/p99 latency
- 성공률
- `SOLD_OUT`, `DUPLICATE`, `FAILED` 비율
- DB write latency
- Redis command latency

### 6.2 상태 조회

목적:

- 티켓팅 이후 상태 polling 또는 조회 API가 읽기 부하를 버티는지 확인

주요 지표:

- RPS
- read latency
- cache hit 여부
- DB read QPS

### 6.3 QR 토큰 발급

목적:

- 현장 입장 직전 다수 사용자가 QR을 열 때 토큰 발급이 안정적인지 확인

주요 지표:

- 토큰 발급 latency
- 오류율
- signature 생성 비용
- short-lived token 생성량

### 6.4 QR 검증

목적:

- 다수 검표 단말이 동시에 요청해도 한 티켓은 한 번만 `USED` 처리되는지 확인
- 중복 스캔과 재시도 상황에서 `ALREADY_USED`가 일관되게 나오는지 확인

주요 지표:

- 성공 건수
- `ALREADY_USED` 비율
- 검증 latency
- DB conditional update 실패율
- verification record 중복 생성 여부

### 6.5 알림 동기화

목적:

- 상태 변화 후 알림 목록과 unread count 조회가 과도한 부하를 만들지 않는지 확인

주요 지표:

- 목록 조회 latency
- unread count latency
- DB query count

## 7. 테스트 환경 계획

### 7.1 Local Dev

용도:

- 스크립트가 정상 동작하는지 검증
- smoke 수준 성능 확인

특징:

- 결과를 절대 수치로 사용하지 않는다
- 기능과 스크립트 correctness 확인용

### 7.2 Docker Compose Staging

용도:

- 팀/개발 공통 재현 환경
- 앱, DB, Redis, optional Kafka 포함 상태에서 부하 흐름 검증

특징:

- 로컬보다 실제 구성과 가깝다
- 초기 baseline과 자동화 후보 환경

### 7.3 On-Prem MiniPC

용도:

- 실제 운영 한계 측정
- capacity planning 근거 수집

특징:

- 가장 중요한 수치는 여기서 얻는다
- CPU thermal throttling, 디스크 fsync, Redis/DB 경쟁까지 포함해 본다

## 8. 도구 계획

### 8.1 HTTP/API 부하

권장:

- `k6`

이유:

- HTTP 시나리오 작성이 단순하다
- 단계별 ramp-up, threshold, 결과 export가 쉽다
- CI나 수동 실행 모두 연결하기 좋다

권장 위치:

```text
tests/performance/k6/
```

예시 파일:

- `tests/performance/k6/ticketing-request.js`
- `tests/performance/k6/ticket-status-polling.js`
- `tests/performance/k6/qr-token.js`
- `tests/performance/k6/qr-validation.js`

### 8.2 브라우저 사용자 체감

권장:

- 기존 `Playwright` 재사용

용도:

- 핵심 화면 첫 진입 시간
- TTI에 가까운 체감 지표
- 페이지 전환 회귀 확인

단, Playwright는 대규모 부하 툴이 아니므로 핵심 여정 1~5명 수준의 사용자 체감 검증으로 제한한다.

### 8.3 동시성 정합성

권장:

- 기존 `JUnit/SpringBootTest` 확장

대상:

- `TicketVerificationConcurrencyTest` 스타일
- 티켓팅 멱등성
- 재고 차감 경쟁
- 중복 검표

### 8.4 시스템 메트릭 수집

최소 수집:

- `docker stats` 또는 container metrics
- PostgreSQL:
  - connection count
  - slow query
  - transaction latency
  - lock wait
- Redis:
  - ops/sec
  - latency
  - memory
  - blocked clients

권장 장기안:

- Prometheus + Grafana
- PostgreSQL exporter
- Redis exporter

## 9. 저장소 구조 계획

권장 추가 구조:

```text
tests/
  performance/
    k6/
      ticketing-request.js
      ticket-status-polling.js
      qr-token.js
      qr-validation.js
    data/
      seed-users.json
      seed-tickets.json
docs/
  02_Development/
    01_Reports/
      performance/
        2026-04-30_baseline_local.md
        2026-05-02_load_minipc_ticketing.md
artifacts/
  performance/
    2026-05-02/
      k6-summary.json
      docker-stats.csv
      postgres-metrics.txt
      redis-info.txt
```

초기에는 `tests/performance`와 `docs/02_Development/01_Reports/performance`만 먼저 만들어도 충분하다.

## 10. 실행 시나리오 설계

### 10.1 Baseline

예시:

- VU: 1~5
- duration: 1~3분
- 대상: 티켓 목록, 상태 조회, QR 토큰 발급, QR 검증

목표:

- 기본 응답시간 기준선 확보
- 실패 없는 정상 동작 확인

### 10.2 예상 운영 부하 Load Test

예시:

- VU: 20, 50, 100 단계적 증가
- duration: 5~15분
- 대상:
  - 티켓팅 요청
  - 상태 조회
  - QR 검증

목표:

- 어느 수준까지 p95와 오류율이 안정적인지 측정

### 10.3 Spike Test

예시:

- 10초 내 10 -> 100 또는 200 VU 급증
- duration: 3~5분

목표:

- 급증 시 queue backlog, CPU, 오류 패턴 확인
- `Retry-After` 또는 보호 응답 동작 확인

### 10.4 Stress Test

예시:

- VU를 점진적으로 올리며 한계점 탐색
- 50 -> 100 -> 200 -> 300

목표:

- 첫 병목 지점 확인
- safe operating limit 도출

### 10.5 Soak Test

예시:

- 20~50 VU
- 30분, 1시간, 필요 시 4시간

목표:

- 메모리 누수
- 커넥션 누수
- queue 적체
- 로그 폭증

## 11. 지표 정의

테스트마다 최소한 아래를 수집한다.

### 11.1 응답 지표

- request count
- success rate
- error rate
- timeout count
- p50 latency
- p95 latency
- p99 latency
- max latency

### 11.2 처리량 지표

- RPS
- endpoint별 처리 건수
- validation success / already used / forbidden / invalid 분포

### 11.3 자원 지표

- CPU %
- memory RSS
- container restart 여부
- disk write / fsync 지연
- network throughput

### 11.4 DB / Redis 지표

- DB connection pool 사용량
- slow query 수
- lock wait
- Redis latency
- Redis memory
- Redis blocked clients

## 12. 합격 기준 설정 방식

초기에는 절대 기준보다 상대 기준을 먼저 만든다.

예:

- baseline 측정값을 1차 기준선으로 저장
- 이후 같은 시나리오에서 p95가 20~30% 이상 악화되면 회귀 후보로 본다
- 오류율이 1%를 넘는 구간은 운영 한계 후보로 표시한다

운영용 목표값은 MiniPC 실측 이후 별도 확정한다.

권장 예시:

- 읽기 API: p95 300ms 이하
- QR 토큰 발급: p95 500ms 이하
- QR 검증: p95 700ms 이하, 정합성 오류 0건
- 티켓팅 쓰기 요청: p95 1s 이하, 재고 정합성 오류 0건

위 수치는 가설값이며, 최초 측정 후 보정해야 한다.

## 13. 실행 순서

1. 테스트 대상 API와 seed 데이터 고정
2. Local에서 k6 smoke 실행
3. Docker Compose staging에서 baseline 측정
4. MiniPC에서 baseline 측정
5. Load test 실행
6. Spike test 실행
7. Stress test로 한계점 탐색
8. Soak test로 장시간 안정성 확인
9. 결과 요약과 개선 항목 문서화

## 14. 결과 문서화 계획

### 14.1 결과 문서 위치

권장:

```text
docs/02_Development/01_Reports/performance/
```

파일명 규칙:

```text
YYYY-MM-DD_<environment>_<scenario>.md
```

예:

- `2026-05-02_local_baseline_ticketing.md`
- `2026-05-04_minipc_load_qr-validation.md`

### 14.2 결과 문서 템플릿

모든 리포트는 아래 형식을 따른다.

```md
# 성능 테스트 결과 - <시나리오명>

## 1. 실행 정보
- 날짜:
- git sha:
- 환경:
- 서버 사양:
- 실행자:
- 테스트 도구/버전:

## 2. 대상
- endpoint:
- 사용자 흐름:
- seed 데이터 조건:

## 3. 부하 조건
- VU:
- duration:
- ramp-up:
- think time:

## 4. 결과 요약
- request count:
- success rate:
- error rate:
- p50 / p95 / p99:
- max latency:
- bottleneck 관찰:

## 5. 시스템 지표
- CPU:
- memory:
- DB:
- Redis:

## 6. 정합성 검증
- 중복 처리 이상 여부:
- 재고 오염 여부:
- 중복 검표 여부:

## 7. 결론
- 합격/보류/실패:
- 운영 가능 추정 한계:
- 다음 액션:

## 8. 첨부 아티팩트
- k6 summary:
- 로그:
- 메트릭 스냅샷:
```

### 14.3 비교 요약 문서

개별 리포트와 별도로 분기별 또는 주요 릴리스 전후 비교 문서를 둔다.

예:

```text
docs/02_Development/01_Reports/performance/2026-Q2_summary.md
```

이 문서에는 아래만 압축해서 남긴다.

- 시나리오별 기준선
- 최근 개선/악화 추이
- 병목 우선순위
- 다음 최적화 과제

## 15. 자동화 계획

### 15.1 1단계

- 개발자가 수동으로 성능 테스트 실행
- 결과 JSON/CSV를 저장
- 문서 템플릿에 수동 입력

### 15.2 2단계

- `scripts/performance/run-baseline.sh`
- `scripts/performance/run-load.sh`
- `scripts/performance/collect-metrics.sh`

같은 스크립트로 실행과 수집을 표준화한다.

### 15.3 3단계

- GitHub Actions 수동 워크플로우 또는 self-hosted runner에서 baseline 자동 실행
- 릴리스 전 회귀 비교 자동화

단, MiniPC에 상시 CI runner를 붙이는 건 초기에는 과할 수 있으므로 수동/예약 실행부터 시작한다.

## 16. 우선 구현 항목

1. `tests/performance/k6` 초안 생성
2. `ticketing-request`, `qr-token`, `qr-validation` 시나리오 작성
3. 결과 아티팩트 저장 규칙 정리
4. `docs/02_Development/01_Reports/performance` 리포트 템플릿 생성
5. MiniPC baseline 1회 측정
6. 첫 성능 기준선 문서 작성

## 17. 권장 결론

현재 PERFO는 기능 테스트 체계는 어느 정도 있으나, 성능 테스트는 아직 아키텍처 원칙 수준에 머물러 있다. 따라서 다음 단계는 `k6 기반 API 부하 테스트`, `JUnit 기반 동시성 정합성 검증`, `Playwright 기반 체감 성능 확인`을 각각 역할에 맞게 분리하고, 결과를 `환경/부하조건/지표/정합성/결론` 템플릿으로 고정하는 것이다.

이 계획대로 가면 단순히 "빨랐다/느렸다"가 아니라, MiniPC에서 어떤 시나리오를 어느 수준까지 운영 가능한지 근거를 남길 수 있다.
