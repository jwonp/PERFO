# Kotlin + Spring 학습 로드맵

이 폴더는 코틀린과 스프링 백엔드를 공부할 때, 기초부터 실무 3년차 수준까지 단계별로 정리한 문서 모음이다.
단순히 "이런 개념이 있다"에서 끝나지 않도록, 각 문서에 아래 질문이 남지 않게 정리하는 것을 목표로 한다.

- 이걸 왜 알아야 하는가
- 어디에서 쓰는가
- 실제로는 어떻게 적용하는가
- 지금 내가 어느 수준까지 할 수 있어야 하는가

현재 PERFO 백엔드 기준으로 보면 아래 기술을 안정적으로 다루는 수준을 목표로 잡으면 된다.

- Kotlin
- Spring Boot 3.x
- Spring Security
- Spring Data JPA
- PostgreSQL
- Redis
- Kafka
- 테스트 코드

## 폴더 구조

### 1. [01-basic](./01-basic)

비전공자 또는 백엔드 입문자 기준으로 먼저 알아야 하는 내용들이다.

- 개발 환경과 도구
- CS 기초
- Kotlin 문법
- HTTP / REST / JSON
- GitHub 버저닝과 릴리스

### 2. [02-junior](./02-junior)

실제로 API를 만들고, DB와 연결하고, 테스트를 작성하는 단계다.

- Spring 핵심 구조
- JPA / 트랜잭션
- 인증 / 인가
- 테스트

### 3. [03-mid](./03-mid)

코프링 실무 3년차 전후라면 단순 구현을 넘어서 구조, 운영, 성능, 협업까지 봐야 한다.

- 아키텍처와 설계
- 성능과 장애 대응
- 운영 관점
- 코드 품질과 팀 생산성

## 추천 학습 순서

1. `01-basic` 전체를 빠르게 훑는다.
2. `02-junior`에서 Spring 흐름과 JPA, 테스트를 집중적으로 본다.
3. 현재 프로젝트 코드와 연결해서 `03-mid`를 읽는다.
4. 각 문서의 체크리스트를 기준으로 빈 구멍을 채운다.

## 문서 읽는 방법

각 문서는 아래 순서로 읽는 것을 추천한다.

1. `왜 중요한가`를 읽고 개념의 목적을 잡는다.
2. `어떻게 해야 하는가`를 읽고 실무 적용 방식을 이해한다.
3. `실수 패턴`을 보고 본인 습관과 비교한다.
4. `체크리스트`로 현재 수준을 점검한다.

읽고 끝내지 말고, 현재 프로젝트 코드에서 대응되는 위치를 같이 찾는 것이 중요하다.

- Kotlin 문서: DTO, service, test 코드에서 null 처리 방식 확인
- Spring 문서: controller, service, exception handler 구조 확인
- JPA 문서: entity, repository, transaction 경계 확인
- Security 문서: 인증 흐름, 테스트 케이스, 예외 응답 확인
- 3년차 문서: 모듈 책임, 로그, 성능 병목, 운영 포인트 확인

## 지금 이 프로젝트에서 특히 중요한 주제

- Kotlin null-safety
- Spring Boot 계층 구조
- 인증 / 인가 흐름
- JPA 연관관계와 트랜잭션 경계
- 테스트 분리 전략
- Redis / Kafka를 붙일 때의 책임 분리

## 문서 목록

- [개발 기본기와 CS](./01-basic/01-cs-and-tools.md)
- [Kotlin 기초](./01-basic/02-kotlin-basics.md)
- [웹과 HTTP 기초](./01-basic/03-web-and-http.md)
- [GitHub 버저닝과 릴리스 기본](./01-basic/04-github-versioning.md)
- [Spring 핵심 구조](./02-junior/01-spring-core.md)
- [JPA, DB, 트랜잭션](./02-junior/02-data-jpa-transaction.md)
- [인증, 인가, 테스트](./02-junior/03-security-and-testing.md)
- [3년차가 봐야 할 설계와 운영](./03-mid/01-architecture-and-ops.md)
- [3년차 체크리스트](./03-mid/02-mid-level-checklist.md)
