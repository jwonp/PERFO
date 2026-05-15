# PERFO Release Branch and Versioning Guide

## Purpose

이 문서는 `develop`에서 release 브랜치를 파생할 때의 규칙과 애플리케이션 버전 관리 기준을 정의한다.

현재 release 기준 버전은 `0.2.0-rc.1`이다.

## Branch Policy

- 기능 개발은 `develop`에 직접 커밋하지 않고 feature, fix, docs 브랜치에서 끝낸다.
- release 준비는 `develop`에서 `release/<version>` 브랜치를 파생해 진행한다.
- release 브랜치에는 기능 추가를 넣지 않는다.
- release 브랜치에는 버전 조정, 배포 설정, 문서 정리, 릴리즈 차단 버그 수정만 허용한다.
- release 브랜치에서 안정화가 끝나면 배포 기준 브랜치로 병합하고, 필요한 변경은 `develop`에도 반드시 되돌려 반영한다.

## Version Scheme

- 버전 형식은 Semantic Versioning을 따른다: `MAJOR.MINOR.PATCH`
- release 준비 단계에서는 prerelease 식별자를 붙인다: `MAJOR.MINOR.PATCH-rc.N`
- 정식 배포 직전에는 `-rc.N`을 제거한 동일 버전으로 승격한다.

## Bump Rules

- `MAJOR`: 호환되지 않는 API 변경, 데이터 마이그레이션 강제, 운영 절차의 비호환 변경
- `MINOR`: 사용자 가치가 있는 기능 추가, 새로운 화면/플로우, 신규 API, 운영 기능 확장
- `PATCH`: 버그 수정, 문서 보정, 비호환 없는 설정 수정

현재 구현 범위는 티켓 발급과 상태 전환, 마이티켓 백엔드 연동, 프로필/런타임 보강, 배포 설정 보강을 포함하므로 `0.1.0`에서 `0.2.0`으로 올리는 것이 맞다. release 브랜치이므로 현재 값은 `0.2.0-rc.1`을 사용한다.

## Source of Truth

버전은 아래 두 파일에서 항상 동일해야 한다.

- `frontend/package.json`
- `backend/build.gradle`

릴리즈 작업 중 두 값이 어긋나면 배포를 진행하지 않는다.

## Release Checklist

1. `develop`가 clean 상태인지 확인한다.
2. `release/<version>` 브랜치를 `develop`에서 생성한다.
3. `frontend/package.json`과 `backend/build.gradle` 버전을 같은 값으로 갱신한다.
4. 릴리즈 문서, 변경 이력, 배포 설정을 점검한다.
5. 테스트와 배포 검증을 통과시킨다.
6. 정식 배포 시 prerelease 식별자를 제거할지 결정한다.

## Naming Rules

- release 브랜치 이름: `release/<version>`
- 예시:
  - `release/0.2.0-rc.1`
  - `release/0.2.0`
  - `release/1.0.0-rc.2`

## Codex Enforcement Notes

- Codex는 release 관련 변경을 할 때 먼저 현재 브랜치가 `release/<version>`인지 확인한다.
- release 브랜치가 아니면 버전 파일을 임의로 수정하지 않는다.
- 버전 변경 시 문서와 코드 버전 표기를 함께 갱신한다.
