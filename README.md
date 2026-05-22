# PERFO

PERFO는 공연, 행사, 예약 기반 운영팀이 티켓 발급, 예약 확인, QR 검표, 운영용 관리 화면을 하나의 흐름으로 다룰 수 있도록 설계한 티켓 운영 플랫폼입니다.

## What PERFO Does

- 온라인 티켓 발급과 예약 흐름을 제공합니다.
- QR 기반 입장 검표와 현장 운영 UX를 지원합니다.
- 운영자용 티켓 관리, 상태 전환, 검증 기능을 제공합니다.
- Next.js 프런트엔드와 Spring Boot 백엔드를 기반으로 확장 가능한 구조를 사용합니다.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS v4, next-intl, NextAuth
- Backend: Spring Boot 3.4, Kotlin, Spring Security, Spring Data JPA
- Infra: PostgreSQL, Redis, Kafka, MinIO, Docker Compose

## Repository Layout

```text
PERFO/
├── frontend/   # Next.js application
├── backend/    # Spring Boot application
├── docs/       # project docs and internal guides
└── scripts/    # development and deployment helpers
```

## Status

현재 저장소는 티켓 발급, 예약 조회, QR 검표, 운영용 백오피스 흐름을 중심으로 계속 개발 중입니다.
