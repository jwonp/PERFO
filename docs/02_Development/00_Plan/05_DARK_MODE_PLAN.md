# 다크 모드 구현 계획

> 기준 문서:
> `docs/03_Design System/01_foundations.md`
> `docs/03_Design System/02_principles.md`
> `docs/03_Design System/04_frontend-code-rules.md`
>
> 이 문서는 PERFO 앱에 다크 모드를 안정적으로 적용하기 위한 작업 계획이다.

## 1. 목표

- 사용자가 프로필 화면의 `다크 모드` 토글로 라이트/다크 테마를 전환할 수 있다.
- 선택한 테마는 새로고침, 재방문, 로그인 상태 변화 후에도 유지된다.
- 사용자가 직접 선택하지 않은 경우에는 OS 선호 테마를 따른다.
- 서버 렌더링과 클라이언트 hydration 사이에 테마 깜빡임을 최소화한다.
- 모든 주요 제품 화면에서 텍스트, 카드, 버튼, 탭, 입력창, 하단 내비게이션의 대비가 유지된다.

## 2. 현재 상태

- `frontend/app/globals.css`에 `.dark` CSS 변수 값이 이미 일부 정의되어 있다.
- Tailwind dark variant도 `@custom-variant dark (&:is(.dark *));`로 준비되어 있다.
- 프로필 화면에는 `다크 모드` 토글 UI가 있으나 현재는 로컬 `useState`만 바꾸며 앱 테마에는 영향을 주지 않는다.
- 여러 컴포넌트가 `text-perfo-primary`, `bg-perfo-bg`, `text-perfo-text`, `border-perfo-secondary`처럼 정적 PERFO 색상을 직접 사용한다.
- 정적 PERFO 색상은 다크 모드에서 자동으로 바뀌지 않으므로, 토큰 기반 색상으로 점진 교체해야 한다.

## 3. 핵심 원칙

- 테마 전환은 `html` 요소에 `.dark` 클래스를 붙이는 방식으로 구현한다.
- 색상은 가능한 한 CSS 변수 기반 토큰을 사용한다.
  - 권장: `bg-background`, `text-foreground`, `bg-[var(--surface-raised)]`, `text-[var(--text)]`
  - 지양: `text-perfo-primary`, `bg-perfo-bg`, `text-[#9bafd9]`
- 브랜드 컬러는 유지하되, 다크 모드에서는 정보 가독성을 우선한다.
- 상태 색상은 색상만으로 의미를 전달하지 않는다.
  - 성공, 경고, 오류는 아이콘, 텍스트, 배지 라벨을 함께 사용한다.
- 카드 반경, 밀도, 정보 구조는 라이트 모드와 동일하게 유지한다.
- 다크 모드는 단순히 색상을 반전하는 기능이 아니라 운영 화면의 피로도를 낮추는 제품 설정으로 다룬다.

## 4. 사용자 경험 계획

### 4.1 설정 값

테마 설정은 다음 세 값을 지원한다.

- `system`: OS 설정을 따름
- `light`: 라이트 모드 고정
- `dark`: 다크 모드 고정

초기 구현은 프로필 화면의 단일 토글로 시작할 수 있다.

- 토글 `off`: `light`
- 토글 `on`: `dark`

다만 내부 저장 모델은 처음부터 `system | light | dark`를 지원하도록 만든다. 나중에 `시스템 설정 사용` 옵션을 추가하기 쉽기 때문이다.

### 4.2 적용 우선순위

1. 사용자가 직접 저장한 테마
2. 저장값이 없으면 OS `prefers-color-scheme`
3. OS 값을 확인할 수 없으면 `light`

### 4.3 깜빡임 방지

- 앱이 hydrate되기 전에 `html`에 올바른 `.dark` 클래스를 적용해야 한다.
- 가장 단순한 방식은 root layout의 `<head>`에 inline theme script를 넣는 것이다.
- script는 `localStorage`의 테마 값을 읽고, `system`이면 `matchMedia("(prefers-color-scheme: dark)")` 결과를 사용한다.
- `suppressHydrationWarning`은 이미 `html`에 있으므로 테마 class 변경으로 생기는 hydration 경고를 줄일 수 있다.

## 5. 프론트엔드 작업 계획

### 5.1 테마 타입과 상수

후보 파일:

- `frontend/lib/theme/theme.types.ts`
- `frontend/lib/theme/theme.constants.ts`

정의할 타입:

```ts
export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
```

상수:

```ts
export const THEME_STORAGE_KEY = "perfo-theme";
```

### 5.2 테마 유틸

후보 파일:

- `frontend/lib/theme/theme.ts`

책임:

- 저장된 테마 preference 읽기
- OS 선호 테마 확인
- 실제 적용 테마 계산
- `document.documentElement.classList`에 `.dark` 적용/제거
- `color-scheme` 속성 갱신

중요 구현 조건:

- 브라우저 API를 사용하는 함수는 클라이언트에서만 실행한다.
- `localStorage` 접근은 `try/catch`로 감싼다.
  - 일부 브라우저, private mode, WebView에서 접근이 실패할 수 있다.
- OS 테마 변경 이벤트를 구독해 `system` 모드에서 자동 반영한다.

### 5.3 ThemeProvider

후보 파일:

- `frontend/components/providers/ThemeProvider.tsx`
- `frontend/components/providers/theme-provider.types.ts`

책임:

- 현재 `preference`와 `resolvedTheme` 제공
- `setThemePreference` 제공
- 앱 시작 시 저장된 preference를 불러와 적용
- `system` 설정에서 OS 테마 변경을 반영

권장 API:

```ts
const { preference, resolvedTheme, setPreference } = useTheme();
```

Provider 위치:

- `frontend/app/[locale]/layout.tsx` 또는 현재 provider 묶음이 있는 위치에 추가한다.
- 인증 세션 provider와 독립적으로 동작해야 한다.
  - 테마는 로그인 여부와 무관하게 적용되어야 한다.

### 5.4 초기 테마 스크립트

후보 파일:

- `frontend/components/providers/theme-script.tsx`

역할:

- React hydration 전에 저장된 테마를 적용한다.
- `localStorage` 값이 없으면 OS 설정을 따른다.
- 잘못된 저장값은 무시한다.

검토할 위치:

- `frontend/app/layout.tsx`

주의:

- inline script는 짧고 순수해야 한다.
- 외부 데이터나 사용자 입력을 script 문자열에 삽입하지 않는다.

### 5.5 프로필 토글 연결

대상 파일:

- `frontend/app/[locale]/(main)/profile/page.tsx`

변경 내용:

- 현재 `const [darkMode, setDarkMode] = useState(false);` 제거
- `useTheme()`에서 `resolvedTheme`과 `setPreference`를 가져온다.
- 토글 상태는 `resolvedTheme === "dark"` 기준으로 표시한다.
- 토글 클릭 시:
  - 현재 dark면 `light`
  - 현재 light면 `dark`

초기에는 단일 토글로 충분하다. 이후 설정 화면이 확장되면 `system / light / dark` segmented control로 바꾼다.

### 5.6 색상 토큰 정리

우선순위 높은 대상:

- `frontend/app/[locale]/(main)/layout.tsx`
  - 하단 내비게이션 배경, border, active/inactive 색상
- `frontend/app/[locale]/(main)/profile/page.tsx`
  - 정적 `#9bafd9`, `text-perfo-primary`, `border-white`
- `frontend/components/tickets/TicketCard.tsx`
  - 버튼, 만료 이미지 처리, 텍스트 대비
- `frontend/components/tickets/IssuedTicketCard.tsx`
  - 편집/검표 버튼, 진행률, 링크 색상
- `frontend/components/ui/toggle.tsx`
  - off/on 배경과 knob 대비
- `frontend/components/ui/toggle-row.tsx`
  - label과 icon 색상

정리 기준:

- 화면 배경: `bg-background` 또는 `bg-[var(--background)]`
- 카드/패널: `bg-[var(--surface-raised)]`
- 보조 표면: `bg-[var(--surface-muted)]`
- 기본 텍스트: `text-[var(--text)]`
- 보조 텍스트: `text-[var(--text-muted)]`
- 약한 텍스트: `text-[var(--text-subtle)]`
- border: `border-border` 또는 `border-[var(--border)]`
- 주요 액션: `bg-primary text-primary-foreground`

## 6. 디자인 토큰 계획

`frontend/app/globals.css`의 기존 토큰을 유지하되, 다음 기준으로 점검한다.

### 6.1 필수 토큰

- `--background`
- `--foreground`
- `--surface`
- `--surface-raised`
- `--surface-muted`
- `--text`
- `--text-muted`
- `--text-subtle`
- `--primary`
- `--primary-foreground`
- `--secondary`
- `--secondary-foreground`
- `--border`
- `--input`
- `--ring`
- `--success`
- `--warning`
- `--danger`
- `--info`

### 6.2 점검 기준

- 본문 텍스트와 배경은 충분한 대비를 가져야 한다.
- 보조 텍스트는 흐리되 읽을 수 있어야 한다.
- `primary`는 다크 모드에서 배경과 충분히 분리되어야 한다.
- 카드와 배경은 어두운 톤 안에서도 레이어 구분이 되어야 한다.
- 그림자는 다크 모드에서 과하게 번져 보이면 안 된다.
- 하단 내비게이션은 화면 바닥에서 분리되어야 한다.

## 7. PWA와 브라우저 UI

대상 파일:

- `frontend/app/layout.tsx`
- `frontend/public/manifest.json`

계획:

- `themeColor`는 라이트/다크 모드를 고려해 분리 가능한 구조를 검토한다.
- Next metadata에서 정적 `themeColor`만 쓰면 다크 모드 브라우저 UI 색상이 맞지 않을 수 있다.
- 우선은 CSS/앱 UI 구현을 먼저 끝내고, 이후 viewport metadata 또는 `<meta name="theme-color" media="...">` 방식으로 보강한다.
- `manifest.json`의 `theme_color`도 PERFO primary와 현재 앱 배경 정책에 맞게 정리한다.

## 8. 테스트 계획

### 8.1 단위 테스트

- 저장된 preference가 없으면 OS 선호 테마를 따른다.
- 저장된 `dark` 값은 OS와 무관하게 dark로 적용된다.
- 저장된 `light` 값은 OS와 무관하게 light로 적용된다.
- 잘못된 저장값은 무시하고 system fallback을 사용한다.
- 토글 클릭 시 preference가 저장되고 `html.dark`가 갱신된다.

### 8.2 컴포넌트 테스트

- 프로필 화면의 다크 모드 토글이 현재 테마 상태를 반영한다.
- 토글 클릭 후 `document.documentElement` class가 변경된다.
- ThemeProvider가 없는 곳에서 `useTheme`를 잘못 사용하면 명확한 오류를 던진다.

### 8.3 E2E 테스트

- `/ko/profile`에서 다크 모드 토글을 켠다.
- 새로고침 후에도 다크 모드가 유지된다.
- `/ko/reserved`, `/ko/my-tickets`, `/ko/profile` 이동 후에도 다크 모드가 유지된다.
- 다크 모드에서 주요 버튼과 텍스트가 보이는지 확인한다.

### 8.4 시각 검증

Playwright screenshot 기준으로 다음 화면을 라이트/다크 각각 확인한다.

- 로그인
- 예약한 티켓
- 내가 발급한 티켓
- 프로필
- 디자인 시스템

확인 항목:

- 텍스트가 배경과 겹쳐 보이지 않는다.
- 비활성/보조 텍스트가 너무 흐리지 않다.
- 버튼 라벨이 배경과 충분히 분리된다.
- 카드, 하단 내비게이션, bottom sheet가 배경과 구분된다.
- 이미지 카드의 grayscale/opacity 처리 후에도 정보가 읽힌다.

## 9. 구현 순서

1. `ThemePreference`, storage key, theme utility를 만든다.
2. hydration 전 테마 적용 script를 만든다.
3. `ThemeProvider`와 `useTheme` 훅을 만든다.
4. 앱 layout에 theme script와 provider를 연결한다.
5. 프로필 다크 모드 토글을 실제 테마 상태에 연결한다.
6. 하단 내비게이션과 공통 UI 컴포넌트를 토큰 기반 색상으로 정리한다.
7. 예약/발급/프로필 화면의 정적 PERFO 색상을 토큰 기반으로 교체한다.
8. 테스트를 추가한다.
9. Playwright로 라이트/다크 스크린샷을 확인한다.
10. PWA `theme_color`와 브라우저 UI 색상을 보강한다.

## 10. 완료 기준

- 프로필 화면에서 다크 모드를 켜고 끌 수 있다.
- 선택한 테마가 `localStorage`에 저장된다.
- 새로고침 후에도 선택한 테마가 유지된다.
- 저장된 설정이 없으면 OS 선호 테마를 따른다.
- hydration 전 테마 적용으로 첫 화면 깜빡임이 최소화된다.
- 주요 화면의 배경, 카드, 텍스트, 버튼, 하단 내비게이션이 다크 모드에서 읽기 쉽다.
- 정적 색상 사용이 핵심 화면에서 제거되거나 의도적으로만 남아 있다.
- 단위 테스트와 E2E 테스트가 핵심 테마 전환 흐름을 검증한다.

## 11. 중요한 위험과 대응

- 위험: 정적 `text-perfo-*` 색상이 다크 모드에서 낮은 대비를 만든다.
  - 대응: 화면별로 토큰 기반 색상으로 교체하고 screenshot으로 확인한다.
- 위험: hydration 후 테마가 바뀌며 화면이 깜빡인다.
  - 대응: root layout에 초기 theme script를 추가한다.
- 위험: `localStorage` 접근 실패로 앱이 깨진다.
  - 대응: 모든 storage 접근을 `try/catch`로 감싼다.
- 위험: OS 테마 변경과 사용자 고정 설정이 충돌한다.
  - 대응: preference와 resolved theme을 분리한다.
- 위험: 다크 모드에서 브랜드 블루가 과하게 튀거나 읽기 어려워진다.
  - 대응: primary는 액션/active 상태 중심으로 제한하고, 일반 텍스트에는 semantic text token을 사용한다.
- 위험: PWA 상태바와 앱 배경 색이 어긋난다.
  - 대응: 앱 UI 구현 후 `theme-color` media 설정과 manifest 값을 별도 점검한다.

## 12. 보류 가능 항목

- 사용자 계정 서버 저장
- 시스템/라이트/다크 3단 segmented control
- 시간대별 자동 테마 전환
- 다크 모드 전용 이미지 에셋
- 관리자 화면까지 포함한 전체 시각 회귀 테스트

우선은 로컬 저장 기반 앱 전체 테마 전환과 주요 제품 화면의 가독성 확보를 완료 기준으로 삼는다.
