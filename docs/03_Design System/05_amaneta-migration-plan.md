# Amaneta 디자인 시스템 마이그레이션 플랜

> 목표: `frontend/components/ui/` 로컬 컴포넌트를 `@jwonp/design-system` 패키지로 대체

---

## 현황 분석

### PERFO 현재 디자인 시스템

**색상 (PERFO brand)**
- Primary: `#103783` (navy blue)
- Secondary: `#9BAFD9`
- Background: `#F3FBFF`
- Text: `#342A2D`

**로컬 컴포넌트** (`frontend/components/ui/`)

| 컴포넌트 | 파일 | 사용 횟수 |
|---------|------|---------|
| Button | `button.tsx` | 30 |
| Input | `input.tsx` | 9 |
| Card 계열 | `card.tsx` | 7 (Card, CardHeader, CardContent, CardTitle, CardDescription) |
| Label | `label.tsx` | 6 |
| Badge | `badge.tsx` | 3 |
| EmptyState 계열 | `empty-state.tsx` | 3 (EmptyState, EmptyStateIcon, EmptyStateTitle) |
| ToggleRow | `toggle-row.tsx` | 3 |
| Toggle | `toggle.tsx` | 2 |
| Tabs / TabsButton | `tabs.tsx` | 2 |
| FormField / FormFieldLabel | `form-field.tsx` | 2 |
| BottomSheet 계열 | `bottom-sheet.tsx` | 2 (BottomSheet, BottomSheetContent, BottomSheetTitle) |
| Popover 계열 | `popover.tsx` | 1 |
| ActionRow 계열 | `action-row.tsx` | 1 |
| Command 계열 | `command.tsx` | 1 |
| StatCard 계열 | `stat-card.tsx` | 0 (admin only) |
| Toolbar 계열 | `toolbar.tsx` | 0 (admin only) |

**CSS 구조**
- `globals.css`: Tailwind v4 `@theme inline` + `:root` + `.dark`
- Semantic tokens: `--surface`, `--surface-raised`, `--surface-muted`, `--text`, `--text-muted`, `--text-subtle`
- 커스텀 유틸리티: `.ds-shell`, `.ds-panel`, `.ds-toolbar`, `.ds-eyebrow`, `.app-screen`, `.pb-nav-safe`, `.app-card`
- 애니메이션: `tw-animate-css`

---

### Amaneta 디자인 시스템 (`@jwonp/design-system`)

**색상 (Amaneta palette)**
- Sky: `#4FB4DE`, Navy: `#1A2440`, Gold: `#D9B859`, Mint: `#A8D6CB`
- PERFO brand과 **다름** → 토큰만 재사용, 색상은 override

**폰트**
- Pretendard Variable (현재 PERFO globals.css에는 Geist)
- Instrument Serif, JetBrains Mono

**제공 컴포넌트 (50+)**
- 기존 PERFO 컴포넌트 전부 포함 + 추가 (Typography, Avatar, Skeleton, Sidebar, Table, Chart, Carousel 등)

**필요 peer deps**
- `radix-ui` (monorepo, `@radix-ui/*` 개별 패키지 대체)
- `@base-ui/react`
- `vaul` (Drawer)
- `sonner` (Toast)
- `tailwindcss-animate`

---

## 컴포넌트 매핑

### Drop-in 교체 (API 동일)

| PERFO 로컬 | Amaneta export | 비고 |
|-----------|---------------|------|
| `Button`, `buttonVariants` | `Button`, `buttonVariants` | variant 이름 동일 |
| `Input` | `Input` | |
| `Label` | `Label` | |
| `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription` | 동일 | `CardAction`, `CardFooter` 추가됨 |
| `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` | 동일 | `PopoverHeader`, `PopoverTitle`, `PopoverDescription` 추가됨 |
| `Command` 계열 | `Command` 계열 | 동일 |

### API 변경 필요

| PERFO 로컬 | Amaneta | 변경 내용 |
|-----------|---------|---------|
| `Badge` (`variant: neutral/info/success/warning/danger`) | `Badge` (`variant: default/secondary/outline/destructive`) | variant 이름 매핑 |
| `Toggle` (switch variant, `checked` prop) | `Switch` | 컴포넌트명 + API 변경 |
| `Toggle` (pill variant, `checked` prop) | `Toggle` (`pressed` prop, Radix 기반) | prop 이름 변경 |
| `Tabs`, `TabsButton` (pill, `active` prop) | `ToggleGroup`, `ToggleGroupItem` | API 완전 변경 |
| `BottomSheet`, `BottomSheetContent`, `BottomSheetTitle` | `Drawer`, `DrawerContent`, `DrawerTitle` | vaul 기반, controlled 방식 유지 가능 |
| `FormField`, `FormFieldLabel` | `Field`, `FieldLabel` | 이름 변경 |
| `EmptyState`, `EmptyStateIcon`, `EmptyStateTitle` | `Empty`, `EmptyMedia`, `EmptyTitle` | 이름 변경 + 구조 변경 |

### PERFO 전용 유지 (Amaneta에 없음)

| 컴포넌트 | 이유 | 처리 방법 |
|---------|------|---------|
| `ActionRow` 계열 | Amaneta `Item`과 구조 다름 | 로컬 유지, 내부에서 아마네타 토큰 사용 |
| `ToggleRow` | 없음 | 로컬 유지, 내부 `Toggle` → `Switch`로 교체 |
| `StatCard` 계열 | 없음 | 로컬 유지 |
| `Toolbar` 계열 | 없음 | 로컬 유지 |

---

## 마이그레이션 단계

### Phase 0 — peer deps 설치

**현황**: `@jwonp/design-system@0.1.4` 이미 설치됨. peer deps 미설치.

```bash
# 필수
pnpm add radix-ui vaul sonner tailwindcss-animate

# optional (combobox, form 등 사용 시)
pnpm add @base-ui/react

# 구 radix 개별 패키지 제거
pnpm remove @radix-ui/react-label @radix-ui/react-slot
```

**검증**: `pnpm build` 성공

---

### Phase 1 — CSS/테마 마이그레이션

**목표**: `globals.css`를 Amaneta 구조로 전환하되 PERFO 브랜드 색상 유지

1. `globals.css` 상단 변경
   ```css
   /* 제거 */
   @import "tw-animate-css";
   
   /* 추가 */
   @plugin "tailwindcss-animate";
   @import "@jwonp/design-system/theme.css";  /* Amaneta 토큰 구조 */
   ```

2. `@theme inline` 블록: Amaneta 토큰 구조 위에 PERFO 색상으로 override
   - `--color-primary: #103783` 유지
   - `--color-background: #F3FBFF` 유지
   - Amaneta palette (`--color-sky`, `--color-navy` 등) 제거 or 별도 관리

3. Pretendard 폰트 import 추가 (현재 Geist → Pretendard 전환)
   ```css
   @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
   ```
   - `layout.tsx`에서 Geist 폰트 제거

4. `@layer base`, `@layer utilities` 블록: `.app-screen`, `.pb-nav-safe` 등 PERFO 전용 유틸리티 유지

**검증**: `pnpm dev` 실행, 전체 화면 비주얼 회귀 없음

---

### Phase 2 — Drop-in 컴포넌트 교체

**목표**: API 변경 없는 컴포넌트 일괄 교체

대상: `Button`, `Input`, `Label`, `Card` 계열, `Popover` 계열, `Command` 계열

각 컴포넌트별 작업:
1. `frontend/components/ui/<name>.tsx` 삭제
2. import 경로 `@/components/ui/<name>` → `@jwonp/design-system` 으로 일괄 변경

```bash
# 예시: button
grep -r "from \"@/components/ui/button\"" frontend --include="*.tsx" -l
# 각 파일에서 import 경로 수정
```

**검증**: `pnpm build` + 각 페이지 스모크 테스트

---

### Phase 3 — API 변경 컴포넌트 교체

각 컴포넌트별 개별 작업. 순서는 사용 빈도 역순(낮은 것부터).

#### 3-1. Badge variant 매핑
```tsx
// PERFO → Amaneta variant 매핑
neutral  → default
info     → secondary  (또는 커스텀 className)
success  → outline    (또는 커스텀 className)
warning  → secondary  (또는 커스텀 className)
danger   → destructive
```
- 영향 파일: 3개

#### 3-2. FormField → Field
```tsx
// PERFO
<FormField><FormFieldLabel>이름</FormFieldLabel><Input /></FormField>

// Amaneta
<Field><FieldLabel>이름</FieldLabel><Input /></Field>
```
- 영향 파일: 2개

#### 3-3. EmptyState → Empty
```tsx
// PERFO
<EmptyState>
  <EmptyStateIcon><Icon /></EmptyStateIcon>
  <EmptyStateTitle>항목 없음</EmptyStateTitle>
</EmptyState>

// Amaneta
<Empty>
  <EmptyHeader>
    <EmptyMedia><Icon /></EmptyMedia>
    <EmptyTitle>항목 없음</EmptyTitle>
  </EmptyHeader>
</Empty>
```
- 영향 파일: 3개

#### 3-4. BottomSheet → Drawer
```tsx
// PERFO (controlled)
<BottomSheet open={open} onClose={() => setOpen(false)}>
  <BottomSheetContent>
    <BottomSheetTitle>제목</BottomSheetTitle>
    {children}
  </BottomSheetContent>
</BottomSheet>

// Amaneta (vaul controlled)
<Drawer open={open} onOpenChange={setOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>제목</DrawerTitle>
    </DrawerHeader>
    {children}
  </DrawerContent>
</Drawer>
```
- 영향 파일: 2개 (`TicketFormSheet.tsx`, `PlaceAutocompleteInput.tsx`)

#### 3-5. Tabs → ToggleGroup
```tsx
// PERFO
<Tabs>
  <TabsButton active={tab === "all"} onClick={() => setTab("all")}>전체</TabsButton>
  <TabsButton active={tab === "used"} onClick={() => setTab("used")}>사용됨</TabsButton>
</Tabs>

// Amaneta
<ToggleGroup type="single" value={tab} onValueChange={setTab}>
  <ToggleGroupItem value="all">전체</ToggleGroupItem>
  <ToggleGroupItem value="used">사용됨</ToggleGroupItem>
</ToggleGroup>
```
- 영향 파일: 2개 (`TicketFilterTabs.tsx` 등)
- **주의**: 스타일 pill 형태 유지 위해 `className` 커스텀 필요

#### 3-6. Toggle (switch) → Switch
```tsx
// PERFO
<Toggle checked={checked} onClick={onToggle} />

// Amaneta
<Switch checked={checked} onCheckedChange={onToggle} />
```
- `ToggleRow` 내부에서 직접 사용
- 영향: `toggle-row.tsx` 내부 교체

**검증**: 각 교체 후 해당 화면 직접 확인

---

### Phase 4 — PERFO 전용 컴포넌트 정리

`ToggleRow` 내부의 `Toggle` → `Switch` 교체 (Phase 3-6에서 처리).

`ActionRow`, `StatCard`, `Toolbar`는 로컬 유지. CSS 변수 참조가 Amaneta 토큰과 호환되는지 확인:
- `var(--text)`, `var(--text-muted)`, `var(--text-subtle)` → Phase 1에서 유지됨이면 그대로
- `var(--surface-raised)`, `var(--surface-muted)` → 동일

---

### Phase 5 — 정리

1. `frontend/components/ui/__tests__/` 테스트 파일 업데이트
2. `frontend/e2e/design-system-visual.spec.ts` 업데이트
3. 불필요한 로컬 컴포넌트 파일 삭제 확인
4. `components.json` (shadcn config) 존재하면 제거 또는 비활성화

---

## 리스크 및 주의사항

| 리스크 | 심각도 | 대응 |
|-------|--------|------|
| PERFO 브랜드 색상 vs Amaneta palette 충돌 | 중간 | Phase 1에서 `@theme` 블록 override로 해결 |
| `radix-ui` monorepo vs `@radix-ui/*` 개별 패키지 충돌 | 중간 | `pnpm dedupe` 실행, 개별 패키지 제거 |
| Drawer(vaul) scroll lock 동작 차이 | 중간 | BottomSheet의 `overflow: hidden` 로직 제거, vaul 내장 처리 활용 |
| Tabs → ToggleGroup 스타일 회귀 | 낮음 | className override로 pill 스타일 유지 |
| 폰트 Geist → Pretendard 전환 시 레이아웃 변경 | 낮음 | 자간/줄높이 미세 조정 필요할 수 있음 |

---

## 순서 요약

```
Phase 0: peer deps 설치 (0.5일)  ← @jwonp/design-system 이미 설치됨
Phase 1: CSS/테마 (1일)
Phase 2: Drop-in 교체 (1일)
Phase 3: API 변경 교체 (2-3일)
  3-1 Badge → 3-2 FormField → 3-3 EmptyState → 3-4 BottomSheet → 3-5 Tabs → 3-6 Toggle
Phase 4: PERFO 전용 정리 (0.5일)
Phase 5: 테스트/정리 (1일)
총: 약 6-7일
```
