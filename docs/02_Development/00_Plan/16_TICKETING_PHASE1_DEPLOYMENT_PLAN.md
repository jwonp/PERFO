# 티켓팅 엔진 Phase 1 운영 배포 계획

## 목적

Phase 1 구매 엔진의 운영 배포 시 `ddl-auto=update`에 의존하지 않고,
구매 API 인증 경계와 이벤트 판매 시각 컬럼을 안전하게 반영한다.

## 포함 범위

- `events.sale_open_at`
- `events.sale_close_at`
- `events.allow_duplicate`
- `events.next_ticket_number`
- `ticketing_requests` ledger 테이블
- `/api/ticketing/requests` 내부 프록시 인증 강화
- `/api/tickets/**`, `/api/users/**` 내부 프록시 JWT 공통화

## 선행 조건

- `INTERNAL_API_JWT_ACTIVE_KID`, `INTERNAL_API_JWT_ACTIVE_SECRET` 값을 프런트/백엔드에 동일하게 배포
- 백엔드는 이전 키 허용이 필요하면 `INTERNAL_API_JWT_PREVIOUS_KEYS` 설정
- 첫 Flyway 도입 런에서는 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` 설정
- 앱은 `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` 로 기동
- 운영자/클라이언트 트래픽은 Next API 프록시 경유를 유지
- 배포 전 PostgreSQL 백업 확보

## 스키마 적용 순서

1. 1차 운영 도입에서는 [V20260508_1__ticketing_phase1.sql](/Users/joowon/Desktop/workspace/PERFO/backend/src/main/resources/db/migration/V20260508_1__ticketing_phase1.sql:1) 과 동일한 SQL을 수동 검증하거나 Flyway migrate로 적용
2. 기존 `events` 데이터 backfill 확인
3. `ticketing_requests` 테이블과 인덱스 생성 확인
4. 백엔드에 새 active key와 필요 시 previous key 설정
5. 프런트 Next 서버에 새 active key 설정
6. 백엔드 배포 시 `SPRING_FLYWAY_ENABLED=true`, 최초 도입이면 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` 사용
7. 백엔드 배포 시 `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` 사용
8. 프런트 Next 서버 배포

## first-run 실행 규칙

- 운영 기본값은 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false` 로 유지한다
- Flyway를 처음 붙이는 단 한 번만 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` 를 override 해서 기동한다
- `flyway_schema_history` 생성과 `20260508.1` 적용이 확인되면 즉시 값을 다시 `false` 로 되돌린다

예시 순서:

1. 운영 배포 직전 env override:
   `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`
   `SPRING_FLYWAY_ENABLED=true`
   `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true`
2. 백엔드 기동
3. DB에서 `flyway_schema_history` 와 `version=20260508.1` 확인
4. 동일 이미지로 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false` 재배포

## first-run 리허설 결과

- PostgreSQL 16 환경에서는 `flyway-core`만으로는 기동이 실패했고, `org.flywaydb:flyway-database-postgresql` 추가가 필요했다
- existing schema + no history 상태에서는 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` 없으면 기동이 실패했다
- 위 두 조건을 반영한 뒤에는 `flyway_schema_history` baseline 생성과 `v20260508.1` migration 적용 후 앱이 정상 기동했다

## 내부 JWT 롤링 순서

1. 백엔드에 새 `active-kid/active-secret` 과 이전 키를 포함한 `previous-keys` 설정
2. 백엔드 먼저 배포해서 새 키와 이전 키를 모두 수용하게 함
3. 프런트에 새 `active-kid/active-secret` 배포
4. 스모크 테스트 후 이전 키 제거

## 롤백 포인트

- SQL 적용 전: 배포 중단 가능
- SQL 적용 후, 애플리케이션 배포 전: `ddl-auto=validate` 유지한 채 앱 롤백 가능
- 내부 JWT 배포 후 오류 시:
  백엔드 `previous-keys`에 직전 키를 유지한 상태에서 프런트만 이전 active key로 롤백
- 스키마 롤백이 필요하면 신규 트래픽 차단 후 `ticketing_requests` 보존 여부를 먼저 결정
- first-run 직후 앱 장애가 나면:
  `flyway_schema_history` 보존 상태에서 앱만 롤백하고, 다음 재기동부터는 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=false` 를 유지

## Backfill 기준

- `sale_open_at`
  기존 `valid_from`을 `Asia/Seoul` 로컬 시각으로 간주해 UTC instant로 변환
- `sale_close_at`
  기존 `valid_until`을 `Asia/Seoul` 로컬 시각으로 간주해 UTC instant로 변환
- `allow_duplicate`
  기본값 `false`
- `next_ticket_number`
  기존 `tickets.ticket_number`의 이벤트별 최대값 + 1, 없으면 `1`

## 배포 이유

- 구매 API는 DB row lock과 DB 현재 시각을 권위 소스로 사용한다.
- 따라서 새 판매 시각 컬럼이 누락되면 정각 오픈 판정이 안정적일 수 없다.
- `ticketing_requests`가 없으면 `requestId` 멱등성이 보장되지 않는다.

## 운영 확인 항목

- `/api/ticketing/requests` 가 내부 JWT 없이 401 인지 확인
- 만료된 내부 JWT 로 호출 시 401 인지 확인
- 오픈 직전/직후 구매 요청이 DB 기준으로 `NOT_OPEN` / `SUCCESS` 로 분기되는지 확인
- 동일 `requestId` 재시도 시 동일 응답이 반환되는지 확인
- 매진 상태에서 초과 판매가 없는지 확인
- `/actuator/metrics/perfo.internal_proxy_auth.reject` 와 `/actuator/metrics/perfo.ticketing.purchase.result` 에 데이터가 적재되는지 확인

## 핵심 스모크 기준

- 인증 없음:
  `/api/ticketing/requests` 는 401 이어야 한다
- 오픈 전:
  결과는 `NOT_OPEN` 이어야 한다
- 오픈 후:
  첫 구매는 `SUCCESS` 와 `ticketIds`, 감소한 `remainingQuantity` 를 반환해야 한다
- replay:
  같은 `requestId` 재시도는 같은 `ticketIds` 와 같은 결과를 반환해야 한다

## 티켓 오픈 직전/직후 운영 체크

- 오픈 10분 전:
  `SPRING_JPA_HIBERNATE_DDL_AUTO=validate` 로 기동 중인지 확인
- 오픈 10분 전:
  `SPRING_FLYWAY_ENABLED=true` 와 필요 시 `SPRING_FLYWAY_BASELINE_ON_MIGRATE=true` 가 의도한 값인지 확인
- 오픈 10분 전:
  active/previous internal JWT 키 설정이 의도한 값인지 확인
- 오픈 5분 전:
  `/api/ticketing/requests` 인증 실패 로그와 401 비율이 비정상적으로 증가하지 않는지 확인
- 오픈 직후 1분:
  `NOT_OPEN`, `SUCCESS`, `SOLD_OUT`, `SALE_CLOSED` 비율이 예상 범위인지 확인
- 오픈 직후 5분:
  초과 판매, requestId 충돌, DB lock timeout 여부 확인

## 현재 내부 인증 상태

- `/api/ticketing/**`
  `ticketing` scope 내부 JWT가 없으면 401
- `/api/tickets/**`
  공개 검표 엔드포인트(`/api/tickets/{id}/validations`)를 제외하고 `tickets` scope 내부 JWT가 없으면 401
- `/api/users/**`
  `users` scope 내부 JWT가 없으면 401
- 프런트 Next API 프록시만 내부 JWT를 발급하고, 백엔드는 `uid/email/scope` claim으로 principal을 생성한다

## 후속 권장

- Flyway 또는 Liquibase를 실제 의존성으로 도입해 위 SQL을 공식 마이그레이션 체계로 편입
- `ticketing_requests.result`를 enum DB 타입 또는 체크 제약으로 강화
- 구매 API audit log와 rate limiting 추가
- 인증 실패 사유별 구조화 로그와 메트릭을 추가해 `missing token`, `expired token`, `invalid signature`, `invalid audience/scope`를 분리 관측
- Flyway schema history를 운영 배포 파이프라인 검증 단계에 편입하고, CI에서 migration + boot smoke test를 자동화
