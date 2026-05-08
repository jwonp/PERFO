아래 내용을 그대로 `codex-usage-guide.md` 같은 파일로 저장해서 쓰면 됩니다냥.

# Codex CLI 작업 케이스별 실행 가이드

이 문서는 터미널에서 Codex CLI를 사용할 때 작업 유형별로 어떤 프로필과 명령어를 쓰면 좋은지 정리한 가이드입니다.

목표는 다음과 같습니다.

- GPT-5.5 사용을 꼭 필요한 순간으로 제한한다.
- 일상 구현은 GPT-5.3-Codex 중심으로 처리한다.
- 분석, 구현, 리뷰, 리서치를 분리해서 토큰 낭비를 줄인다.
- Codex가 임의로 과도한 파일 탐색이나 대규모 수정을 하지 않도록 제어한다.

---

## 1. 기본 운영 원칙

Codex를 사용할 때는 모델을 “좋은 모델 하나로 계속 돌리는 방식”보다, 작업 성격에 따라 프로필을 나눠 쓰는 것이 좋다.

### 추천 역할 분리

| 작업 유형            | 추천 모델        | 추천 Reasoning | 설명                                       |
| -------------------- | ---------------- | -------------: | ------------------------------------------ |
| 단순 수정            | GPT-5.3-Codex    |            low | 오타, 타입 에러, import 정리, 작은 UI 수정 |
| 일반 구현            | GPT-5.3-Codex    |         medium | 평소 개발 작업의 기본값                    |
| 복잡한 버그 추적     | GPT-5.3-Codex    |           high | 여러 파일이 얽힌 원인 분석                 |
| 설계 / 아키텍처 판단 | GPT-5.5          |           high | 비싼 모델을 판단용으로만 사용              |
| 일반 리뷰            | GPT-5.3-Codex    |         medium | git diff, PR 리뷰                          |
| 고위험 리뷰          | GPT-5.5          |           high | 인증, 보안, 결제, 데이터 손실 가능성       |
| 공식 문서 확인       | GPT-5.3-Codex    |         medium | API, 프레임워크 동작 검증                  |
| 자동화 / 단발 실행   | 작업에 따라 다름 |     low~medium | `codex exec` 사용                          |

---

## 2. 추천 `.codex/config.toml`

아래는 토큰 절약형 Codex 설정 예시다.

````toml
# .codex/config.toml

# 기본 프로필
profile = "daily"

# 기본 런타임 설정
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "cached"

# Codex에게 항상 적용할 지침
persistent_instructions = """
Follow project AGENTS.md guidelines.
Minimize token usage: inspect only task-relevant files, avoid broad repository scans, and keep responses concise.
Use MCP servers only when they materially improve correctness or are explicitly needed.
Before editing, prefer a short plan and identify the minimum files required.
"""

# ------------------------------------------------------------
# Profiles
# ------------------------------------------------------------

[profiles.daily]
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "cached"

[profiles.cheap]
model = "gpt-5.3-codex"
model_reasoning_effort = "low"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "disabled"

[profiles.plan]
model = "gpt-5.5"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "read-only"
web_search = "cached"

[profiles.review]
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
approval_policy = "on-request"
sandbox_mode = "read-only"
web_search = "cached"

[profiles.deep-review]
model = "gpt-5.5"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "read-only"
web_search = "cached"

[profiles.research]
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
approval_policy = "on-request"
sandbox_mode = "read-only"
web_search = "live"

# ------------------------------------------------------------
# Multi-agent limits
# ------------------------------------------------------------

[agents]
max_threads = 3
max_depth = 1


---

## 3. 기본 실행 명령어

### 대화형 실행

```bash
codex --profile daily
````

### 특정 프로필 실행

```bash
codex --profile cheap
codex --profile plan
codex --profile review
codex --profile deep-review
codex --profile research
```

### 이번 실행에서만 옵션 덮어쓰기

```bash
codex --profile daily -c model_reasoning_effort=low
```

```bash
codex --profile daily -c web_search=disabled
```

```bash
codex --profile daily -c sandbox_mode=read-only
```

### 비대화형 단발 실행

```bash
codex exec --profile review "현재 git diff를 리뷰해줘. 수정하지 마."
```

---

# 4. 작업 케이스별 사용법

---

## 4.1 평소 개발 작업

일반적인 기능 수정, 컴포넌트 수정, 작은 버그 수정은 `daily`를 기본으로 사용한다.

### 명령어

```bash
codex --profile daily
```

### 첫 프롬프트 예시

```txt
바로 수정하지 말고 먼저 원인과 최소 수정 계획만 제시해.

조건:
- 관련 파일은 최대 5개까지만 확인
- 기존 핵심 로직 삭제 금지
- public API 변경 금지
- 설명은 30줄 이내
```

### 수정 허가 프롬프트

```txt
진행.
최소 diff로 수정하고, 관련 없는 리팩토링은 하지 마.
수정 후 테스트 방법만 알려줘.
```

### 사용 상황 예시

```txt
ScenarioManagerPage에서 Chapter 선택 후 Task 목록이 갱신되지 않는 문제가 있어.
원인을 먼저 분석해줘.
아직 수정하지 마.
```

---

## 4.2 아주 단순한 수정

오타, 라벨명 변경, import 정리, 타입 에러 하나 정도는 `cheap`을 사용한다.

### 명령어

```bash
codex --profile cheap
```

또는 `daily`에서 reasoning만 낮춘다.

```bash
codex --profile daily -c model_reasoning_effort=low
```

### 프롬프트 예시

```txt
이 파일에서 TypeScript 에러만 고쳐줘.

조건:
- 동작 변경 금지
- 관련 없는 리팩토링 금지
- 설명은 10줄 이내
```

### 사용 상황 예시

```txt
src/features/model-studio/ui/ModelStudioSideInspector.tsx 에서 발생하는 타입 에러만 수정해줘.
기능 동작은 바꾸지 마.
```

---

## 4.3 분석만 하고 싶을 때

코드 수정 없이 원인 분석, 설계 검토, 접근 방식만 확인하고 싶을 때는 `plan`을 사용한다.

`plan`은 `sandbox_mode = "read-only"`이므로 파일 수정 위험을 줄일 수 있다.

### 명령어

```bash
codex --profile plan
```

### 프롬프트 예시

```txt
아직 수정하지 마.
이 버그의 원인 후보를 분석해줘.

출력:
1. 가능성 높은 원인
2. 확인한 파일/심볼
3. 최소 수정 계획
4. 리스크
```

### 비용을 더 아끼고 싶은 경우

GPT-5.5 대신 GPT-5.3-Codex로 일회성 override 한다.

```bash
codex --profile plan -c model=gpt-5.3-codex -c model_reasoning_effort=medium
```

### 사용 상황 예시

```txt
KEY_PRESS_ON_OBJECT 이벤트가 특정 objectId에서는 동작하지 않아.
수정하지 말고 실행 경로만 따라가며 원인을 찾아줘.
```

---

## 4.4 복잡한 버그 추적

여러 파일이 얽혀 있지만, 아직 GPT-5.5까지 쓰기는 아까운 경우 `daily + high`를 사용한다.

### 명령어

```bash
codex --profile daily -c model_reasoning_effort=high
```

### 프롬프트 예시

```txt
이 버그를 추적해줘.
수정은 하지 말고 실행 경로를 따라가면서 원인을 찾아줘.

조건:
- 처음에는 관련 파일 최대 7개까지만 확인
- 추측하지 말고 근거 파일/심볼을 함께 제시
- 원인을 찾은 뒤 최소 수정 계획만 제시
```

### 사용 상황 예시

```txt
Scenario 실행 중 ON_AREA_ENTER는 발생하는데 다음 Task로 넘어가지 않아.
runtimeCtx와 trigger 흐름을 중심으로 추적해줘.
아직 수정하지 마.
```

---

## 4.5 실제 구현만 맡길 때

이미 내가 방향을 알고 있고 Codex에게 코드 수정만 맡길 때는 `daily`를 사용한다.

### 명령어

```bash
codex --profile daily
```

### 프롬프트 예시

```txt
아래 계획대로만 구현해줘.

목표:
- ModelStudioClip reorder 기능 추가

수정 가능 파일:
- src/features/model-studio/model/*
- src/features/model-studio/ui/ModelStudioTimeline.tsx

수정 금지:
- store shape 변경 금지
- public API 변경 금지
- 기존 clip CRUD 동작 삭제 금지

작업:
1. clip 순서 변경 action 추가
2. timeline UI에서 reorder 호출 연결
3. 타입 에러 없도록 정리

테스트/문서 수정은 하지 마.
최소 diff로 진행해.
```

### 수정 후 확인 프롬프트

```txt
방금 변경사항을 15줄 이내로 요약해줘.

포함:
- 수정 파일
- 핵심 변경
- 테스트 방법
- 남은 리스크
```

---

## 4.6 테스트 추가

Vitest 테스트 추가는 보통 `cheap` 또는 `daily`로 충분하다.

### 단순 테스트 추가

```bash
codex --profile cheap
```

### 복잡한 테스트 추가

```bash
codex --profile daily
```

### 프롬프트 예시

```txt
방금 변경에 대한 Vitest 테스트만 추가해줘.

조건:
- 구현 코드는 수정하지 마
- 테스트 파일만 변경
- Jest 사용 금지
- 기존 테스트 스타일을 따라가
```

### 사용 상황 예시

```txt
useScenarioObjectStore의 addObject / updateObject 동작에 대한 Vitest 테스트를 추가해줘.
구현 코드는 건드리지 마.
```

---

## 4.7 리팩토링

리팩토링은 반드시 먼저 계획만 받고, 단계별로 적용하는 것이 좋다.

### 1단계: 계획만 받기

```bash
codex --profile plan
```

### 프롬프트 예시

```txt
이 모듈을 리팩토링하고 싶어.
아직 수정하지 마.

목표:
- 기존 동작 유지
- 관심사 분리
- 타입 안정성 개선
- 테스트 가능성 개선

먼저 리팩토링 계획과 단계별 diff 범위를 제시해줘.
```

### 2단계: 1단계만 적용

```bash
codex --profile daily
```

```txt
방금 계획의 1단계만 적용해줘.

조건:
- 2단계 이후는 하지 마
- 동작 변경 금지
- 최소 diff
- 수정 후 테스트 방법만 알려줘
```

### 사용 상황 예시

```txt
ScenarioRegistry.tsx가 너무 커져서 trigger/action 정의를 분리하고 싶어.
하지만 기존 시나리오 동작은 절대 바뀌면 안 돼.
먼저 리팩토링 계획만 제시해줘.
```

---

## 4.8 git diff 리뷰

현재 변경사항을 리뷰할 때는 `review`를 사용한다.

### 명령어

```bash
codex --profile review
```

### 프롬프트 예시

```txt
현재 git diff를 리뷰해줘.
수정하지 마.

중점:
- correctness
- regression
- missing tests
- security risk

스타일 지적은 실제 버그 가능성이 있을 때만 해.
```

### 출력 형식 지정 예시

```txt
출력 형식:
1. Blocking issues
2. Non-blocking risks
3. Missing tests
4. Final verdict
```

### 단발 실행 예시

```bash
codex exec --profile review "현재 git diff를 리뷰해줘. 수정하지 말고 blocking issue만 알려줘."
```

---

## 4.9 고위험 변경 리뷰

인증, 권한, 결제, 개인정보, 데이터 삭제, 마이그레이션, 대규모 리팩토링은 `deep-review`를 사용한다.

### 명령어

```bash
codex --profile deep-review
```

### 프롬프트 예시

```txt
현재 git diff를 고위험 변경으로 리뷰해줘.
수정하지 마.

중점:
- 인증 / 권한 우회 가능성
- 데이터 손실 가능성
- 보안 취약점
- 기존 동작 회귀
- 누락된 테스트
```

### 사용 상황 예시

```txt
이번 변경은 사용자 권한 체크 로직과 API Gateway authorizer 설정을 건드렸어.
보안 관점에서 git diff를 리뷰해줘.
수정하지 마.
```

---

## 4.10 공식 문서/API 확인이 필요한 작업

라이브러리 최신 동작, API 사용법, 프레임워크 변경사항 확인이 필요하면 `research`를 사용한다.

### 명령어

```bash
codex --profile research
```

### 프롬프트 예시

```txt
이 API 사용법이 맞는지 공식 문서 기준으로 확인해줘.

조건:
- 코드 수정 금지
- 공식 문서 또는 primary source 우선
- 확인한 근거 링크와 결론만 알려줘
- 불확실하면 불확실하다고 말해줘
```

### 사용 상황 예시

```txt
Cloudflare Tunnel에서 특정 도메인 접근을 IP 기반으로 제한하려고 해.
Cloudflare Access 기준으로 가능한지 공식 문서 기준으로 확인해줘.
```

---

## 4.11 외부 검색 없이 코드베이스만 보게 하기

일반 코드 수정에서는 외부 검색이 필요 없는 경우가 많다. 이때는 web search를 끈다.

### 명령어

```bash
codex --profile daily -c web_search=disabled
```

또는 더 절약형으로:

```bash
codex --profile cheap -c web_search=disabled
```

### 프롬프트 예시

```txt
외부 검색하지 말고 현재 코드베이스만 보고 판단해.
관련 파일을 먼저 찾고, 아직 수정하지 마.
```

---

## 4.12 수정하지 못하게 강제하고 싶을 때

분석만 시키고 파일 수정을 기술적으로 막고 싶다면 `sandbox_mode=read-only`를 덮어쓴다.

### 명령어

```bash
codex --profile daily -c sandbox_mode=read-only
```

### 프롬프트 예시

```txt
분석만 해줘.
파일 수정 금지.

출력:
- 원인
- 관련 파일
- 수정 계획
- 테스트 방법
```

---

## 4.13 이번에는 바로 수정해도 되는 경우

작은 개인 프로젝트나 단순 수정에서 승인 단계를 줄이고 싶을 때만 사용한다.

### 명령어

```bash
codex --profile daily -c approval_policy=never -c sandbox_mode=workspace-write
```

### 프롬프트 예시

```txt
이 타입 에러를 고치고 테스트까지 실행해줘.
최소 diff로 진행해.
```

### 주의

이 모드는 Codex가 승인 없이 진행할 수 있으므로 회사 코드, 중요한 브랜치, 보안 관련 작업에서는 추천하지 않는다.

---

## 4.14 Playwright / E2E 확인

브라우저 테스트나 실제 화면 확인이 필요할 때만 Playwright MCP를 켠다.

### 명령어

```bash
codex --profile daily -c mcp_servers.playwright.enabled=true
```

### 프롬프트 예시

```txt
Playwright로 이 화면의 기본 플로우를 확인해줘.

조건:
- 필요한 경우에만 브라우저 실행
- 코드 수정은 내가 승인하기 전까지 하지 마
- 실패한 단계와 원인만 먼저 보고해
```

### 평소에는 끄기

```bash
codex --profile daily -c mcp_servers.playwright.enabled=false
```

---

## 4.15 GitHub 이슈/PR 기반 작업

GitHub 이슈나 PR을 보고 작업해야 할 때만 GitHub MCP를 켠다.

### 명령어

```bash
codex --profile daily -c mcp_servers.github.enabled=true
```

### 프롬프트 예시

```txt
GitHub 이슈 #123 내용을 확인하고,
관련 코드 변경 계획만 제시해줘.
아직 수정하지 마.
```

---

## 4.16 단발 자동 실행

TUI를 열지 않고 한 번 실행하고 끝내려면 `codex exec`를 사용한다.

### git diff 리뷰

```bash
codex exec --profile review "현재 git diff를 리뷰해줘. 수정하지 말고 blocking issue만 알려줘."
```

### 테스트 실패 원인 분석

```bash
codex exec --profile cheap "npm test 실패 원인을 분석해줘. 수정하지 말고 원인과 수정 후보만 말해줘."
```

### 타입 에러 수정

```bash
codex exec --profile daily "TypeScript 에러를 최소 수정으로 고쳐줘. 관련 없는 리팩토링은 하지 마."
```

### 주의

`codex exec`는 비대화형으로 진행되기 때문에, 수정이 싫으면 반드시 `review`, `plan`처럼 `read-only` 프로필을 사용하는 것이 안전하다.

---

# 5. 추천 실제 루틴

## 5.1 일반 기능 개발 루틴

```bash
codex --profile plan
```

```txt
기능 구현 전에 설계와 수정 범위만 제시해줘.
아직 수정하지 마.
```

그 다음:

```bash
codex --profile daily
```

```txt
방금 계획의 1단계만 구현해줘.
최소 diff로 진행해.
```

마지막:

```bash
codex --profile review
```

```txt
현재 git diff를 리뷰해줘.
수정하지 마.
```

---

## 5.2 버그 수정 루틴

```bash
codex --profile daily -c sandbox_mode=read-only
```

```txt
이 버그의 원인을 먼저 찾아줘.
파일 수정 금지.
관련 파일은 최대 5개까지만 확인해.
```

원인을 확인한 뒤:

```bash
codex --profile daily
```

```txt
방금 확인한 원인에 대한 최소 수정만 적용해줘.
관련 없는 리팩토링은 하지 마.
```

테스트 추가:

```bash
codex --profile cheap
```

```txt
방금 수정에 대한 Vitest 테스트만 추가해줘.
구현 코드는 수정하지 마.
```

---

## 5.3 리팩토링 루틴

```bash
codex --profile plan
```

```txt
리팩토링 계획만 세워줘.
아직 수정하지 마.
단계별로 나누고 각 단계의 위험도를 표시해줘.
```

1단계 적용:

```bash
codex --profile daily
```

```txt
리팩토링 계획의 1단계만 적용해줘.
동작 변경 금지.
```

리뷰:

```bash
codex --profile review
```

```txt
현재 git diff를 회귀 가능성 중심으로 리뷰해줘.
수정하지 마.
```

---

## 5.4 고위험 변경 루틴

```bash
codex --profile plan
```

```txt
이 변경은 인증/권한과 관련 있어.
먼저 설계 리스크와 수정 범위만 분석해줘.
수정하지 마.
```

구현:

```bash
codex --profile daily
```

```txt
승인한 범위만 구현해줘.
권한 체크 흐름은 기존 동작을 유지하고, public API 변경은 하지 마.
```

고위험 리뷰:

```bash
codex --profile deep-review
```

```txt
현재 git diff를 보안 리뷰해줘.
수정하지 마.
권한 우회, 데이터 노출, 회귀 가능성 위주로 봐줘.
```

---

# 6. Codex에 자주 붙이면 좋은 프롬프트 조각

## 6.1 수정 전 계획 강제

```txt
바로 수정하지 마.
먼저 다음만 제시해:

1. 원인 가설
2. 확인할 파일 최대 5개
3. 최소 수정 계획
4. 예상 리스크
5. 테스트 방법

내가 "진행"이라고 하기 전까지 파일 수정 금지.
```

## 6.2 최소 diff 강제

```txt
최소 diff로 수정해줘.
관련 없는 리팩토링, 포맷팅, 파일 이동은 하지 마.
```

## 6.3 기존 동작 보존

```txt
기존 핵심 로직은 삭제하지 말고 유지해줘.
새 기능은 기존 흐름 위에 추가하는 방식으로 구현해줘.
```

## 6.4 출력 길이 제한

```txt
답변은 30줄 이내로 해줘.
긴 설명은 생략하고 변경 파일, 변경 이유, 테스트 방법만 알려줘.
```

## 6.5 파일 탐색 제한

```txt
처음에는 관련 파일 최대 5개까지만 확인해.
더 필요하면 왜 필요한지 먼저 설명해줘.
```

## 6.6 테스트만 추가

```txt
테스트만 추가해줘.
구현 코드는 수정하지 마.
Vitest를 사용하고 Jest는 사용하지 마.
```

## 6.7 리뷰만 수행

```txt
현재 git diff를 리뷰해줘.
수정하지 마.
blocking issue와 missing test만 알려줘.
```

## 6.8 다음 세션용 요약 생성

```txt
다음 Codex 세션에 넘길 수 있도록 현재 작업 상태를 15줄 이내로 요약해줘.

포함:
- 수정 파일
- 핵심 변경
- 중요한 제약
- 남은 TODO
- 테스트 상태
```

---

# 7. AGENTS.md에 추가하면 좋은 내용

아래 내용을 `.codex/AGENTS.md` 또는 프로젝트 루트 `AGENTS.md`에 추가하면 Codex가 매번 더 절약형으로 움직인다.

```md
## Token Budget Rules

- Do not scan the whole repository unless explicitly requested.
- Before editing, identify the minimum relevant files, usually no more than 5.
- Prefer targeted search and symbol-level inspection over broad file reads.
- For routine tasks, avoid spawning subagents unless the task needs independent review or documentation verification.
- Keep final responses compact:
  - changed files
  - reason for change
  - test result
  - remaining risks
- Do not paste large file contents into the response.
- If context grows too large, summarize the current state and continue from the compact summary.
```

```md
## Work Modes

### Explore Mode

Use when the user asks for investigation, bug tracing, or impact analysis.

Rules:

- Do not edit files.
- Inspect no more than 5 directly relevant files first.
- Return evidence with file paths and symbols.
- Stop after identifying likely cause and proposed next step.

### Patch Mode

Use when the user explicitly asks to implement.

Rules:

- Make the smallest safe diff.
- Preserve existing public APIs and behavior unless the user requested a change.
- Do not refactor unrelated code.
- Do not update tests or docs unless requested.

### Review Mode

Use when reviewing changes.

Rules:

- Focus on correctness, security, regressions, and missing tests.
- Ignore subjective style unless it hides a real maintenance issue.
- Review changed files first, then direct call sites only if necessary.

### Research Mode

Use when API behavior or framework behavior is uncertain.

Rules:

- Prefer official documentation and primary sources.
- Cite the source.
- Stop browsing once the claim is verified.
```

```md
## Edit Approval Policy

For non-trivial changes, do not edit immediately.

First provide:

1. likely cause
2. files to inspect or modify
3. minimal patch plan
4. risks
5. test command

Only edit after the user says one of:

- "진행"
- "apply"
- "patch"
- "수정해"
```

---

# 8. 추천 에이전트 설정

## 8.1 explorer.toml

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "low"
sandbox_mode = "read-only"

developer_instructions = """
Stay in exploration mode.
Trace the real execution path, cite files and symbols, and avoid proposing fixes unless the parent agent asks for them.
Prefer targeted search and file reads over broad scans.

Token budget:
- Inspect no more than 5 files unless explicitly asked.
- Do not summarize unrelated modules.
- Return only evidence: file path, symbol, and why it matters.
"""
```

## 8.2 reviewer.toml

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"

developer_instructions = """
Review like an owner.
Prioritize correctness, security, behavioral regressions, and missing tests.
Lead with concrete findings and avoid style-only feedback unless it hides a real bug.

Token budget:
- Review only changed files and directly related call sites.
- Do not perform whole-repo scans unless requested.
- Output only:
  1. blocking issues
  2. non-blocking risks
  3. missing tests
  4. final verdict
"""
```

## 8.3 docs-researcher.toml

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "medium"
sandbox_mode = "read-only"

developer_instructions = """
Verify APIs, framework behavior, and release-note claims against primary documentation before changes land.
Cite the exact docs or file paths that support each claim.
Do not invent undocumented behavior.

Token budget:
- Prefer official docs and primary sources.
- Summarize only the decision-relevant parts.
- Do not browse broadly after the claim is verified.
"""
```

## 8.4 deep-reviewer.toml

```toml
model = "gpt-5.5"
model_reasoning_effort = "high"
sandbox_mode = "read-only"

developer_instructions = """
Use this role only for high-risk changes:
- authentication / authorization
- payment / billing
- data loss risk
- security-sensitive code
- architecture-wide refactors
- repeated failure from cheaper reviewers

Review like an owner.
Prioritize correctness, security, behavioral regressions, and missing tests.
Avoid style-only feedback.
"""
```

---

# 9. 작업별 빠른 치트시트

| 상황                  | 명령어                                                                     |
| --------------------- | -------------------------------------------------------------------------- |
| 평소 개발             | `codex --profile daily`                                                    |
| 단순 수정             | `codex --profile cheap`                                                    |
| 분석만                | `codex --profile plan`                                                     |
| 분석만, 저렴하게      | `codex --profile daily -c sandbox_mode=read-only`                          |
| 복잡한 버그           | `codex --profile daily -c model_reasoning_effort=high`                     |
| 일반 리뷰             | `codex --profile review`                                                   |
| 고위험 리뷰           | `codex --profile deep-review`                                              |
| 공식 문서 확인        | `codex --profile research`                                                 |
| 외부 검색 끄기        | `codex --profile daily -c web_search=disabled`                             |
| read-only 강제        | `codex --profile daily -c sandbox_mode=read-only`                          |
| 단발 리뷰             | `codex exec --profile review "현재 git diff를 리뷰해줘. 수정하지 마."`     |
| 단발 테스트 실패 분석 | `codex exec --profile cheap "npm test 실패 원인을 분석해줘. 수정하지 마."` |

---

# 10. 가장 추천하는 실전 패턴

평소에는 아래 흐름을 기본으로 사용한다.

```bash
codex --profile plan
```

```txt
원인과 수정 계획만 제시해줘.
아직 수정하지 마.
```

그다음:

```bash
codex --profile daily
```

```txt
방금 계획의 1단계만 구현해줘.
최소 diff로 진행해.
```

그다음:

```bash
codex --profile review
```

```txt
현재 git diff를 리뷰해줘.
수정하지 마.
```

마지막 잔수정:

```bash
codex --profile cheap
```

```txt
리뷰에서 나온 단순 수정만 반영해줘.
관련 없는 리팩토링은 하지 마.
```

이 흐름을 쓰면 GPT-5.5는 판단용으로만 제한하고, 대부분의 구현과 수정은 GPT-5.3-Codex로 처리할 수 있다.
