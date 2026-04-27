# PERFO 인프라 개발 계획

> 기준 문서:
> `docs/01_Design/00_Architecture/01_ARCHITECTURE.md`
> `docs/01_Design/00_Architecture/02_AUTH_ACCOUNT_STRATEGY.md`
> `docs/01_Design/07_WINDOWS_SERVER_GUIDE.md`

## 1. 목표

- 개인 프로젝트 규모에 맞게 작게 시작하되, 확장 가능한 운영 경로를 유지한다.
- 초기에는 단일 노드 또는 소형 VM 중심으로 시작한다.
- 이후 `Nginx + Keepalived + K3s + Argo CD + Argo Rollouts` 구조로 확장 가능해야 한다.

## 2. 단계별 계획

### 2.1 1단계: 개인 프로젝트 초기 운영

- 단일 Windows PC 또는 단일 Linux VM 준비
- `Nginx + App + PostgreSQL + Redis` 구성
- Docker Compose 기반 배포
- 백업, 로그 확인, 재배포 절차 문서화

### 2.2 2단계: 운영 안정화

- 로그 수집 방식 정리
- 에러 추적 도구 연결
- Prometheus/Grafana 도입 검토
- 백업 자동화와 복구 리허설

### 2.3 3단계: 확장 준비

- Nginx 이중화와 Keepalived 검토
- K3s 클러스터 초안
- Argo CD 적용
- Argo Rollouts 카나리 경로 정리

## 3. 인프라 작업 항목

### 3.1 서버와 런타임

- 운영 OS와 배포 대상 확정
- Docker / Compose 정리
- 환경 변수와 Secret 관리 방식 정리
- Resend 개발/운영 API key와 발신 도메인 분리

### 3.2 네트워크와 진입 계층

- 리버스 프록시 설정
- TLS 적용
- SSE 프록시 설정
- 장기적으로 VIP와 Keepalived 전환 경로 확보

### 3.3 저장소 운영

- PostgreSQL 백업
- Redis persistence 또는 복구 기준 정리
- 장애 시 복구 우선순위 정리

### 3.4 관측성

- 구조화 로그
- request id 연계
- 배포 버전 표기
- 에러 추적 연동
- 인증 메일 발송 성공률, 실패율, provider 응답 로그 확인

### 3.5 메일 발송

- 초기 메일 provider는 Resend로 둔다.
- 개발과 운영은 API key, 발신 도메인, 환경 변수를 분리한다.
- 운영 발송 전 SPF, DKIM, DMARC 설정을 완료한다.
- 장기적으로 AWS SES 전환을 고려하되, 애플리케이션은 `MailSender` 인터페이스로 provider 교체 가능하게 둔다.

### 3.6 배포 자동화

- CI에서 테스트와 이미지 빌드
- 레지스트리 업로드
- 초기 수동 배포 절차 정리
- 이후 GitOps 전환 경로 확보

### 3.7 IaC와 자동화

- 초기에는 문서화와 스크립트 자동화 위주
- 확장 단계에서 Terraform / Ansible / Helm / Argo CD 역할 분리

## 4. 우선순위

1. 단일 서버 안정 배포
2. 백업과 로그 관리
3. 재배포 자동화
4. 관측성 보강
5. K3s와 GitOps 전환 준비

## 5. 완료 기준

- 한 대의 서버에서 안정적으로 재배포 가능하다.
- 백업과 복구 절차가 문서화되어 있다.
- 로그와 에러를 중앙에서 확인할 수 있다.
- 확장 단계로 넘어갈 전환 경로가 문서에 남아 있다.

## 6. 이후 확장 포인트

- Keepalived 기반 진입 계층 이중화
- K3s 클러스터
- Argo CD / Rollouts
- Redis Sentinel
- PostgreSQL Replica
- IaC 정식 도입
