# 97 Architecture Notes

이 폴더는 현재 구현 기준으로 특정 인프라/데이터 계층을 따로 인수인계하거나 설명하기 위한 운영 메모 문서를 모아둔 곳이다.

현재 문서:

- `01_KAFKA_HANDOFF.md`
- `02_REDIS_USAGE.md`
- `03_POSTGRESQL_USAGE.md`
- `04_NEXTJS_TECHNICAL_OVERVIEW.md`

원칙:

- 목표 아키텍처가 아니라 현재 구현을 우선 적는다.
- 코드에서 실제로 확인되는 사용 방식과, 아직 구현되지 않은 확장 아이디어를 분리한다.
- 시스템 오브 레코드와 보조 저장소를 혼동하지 않는다.
