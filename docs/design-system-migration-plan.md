# Design System Migration Plan
# `@jwonp/design-system@0.1.5` → PERFO 컴포넌트 대체

## 현황 요약

- 패키지 설치됨: `@jwonp/design-system@^0.1.5`
- 이미 사용 중인 컴포넌트: `Button`, `Card/CardContent/CardHeader`, `Input`, `Label`, `Switch`, `Drawer`, `Empty/EmptyHeader/EmptyTitle/EmptyDescription/EmptyMedia`
- 아직 로컬 커스텀으로 남은 파일: `components/ui/` 7개, 일부 화면에서 raw HTML 태그 직접 사용

---

## 디자인 시스템 컴포넌트 전체 목록

| 카테고리 | 컴포넌트 |
|----------|----------|
| Typography | `H1` `H2` `H3` `H4` `P` `Lead` `Large` `Small` `Muted` `Kicker` `Blockquote` `InlineCode` |
| Button | `Button` `ButtonGroup` `Toggle` `ToggleGroup` |
| Form | `Input` `Textarea` `Checkbox` `RadioGroup` `Switch` `Slider` `Label` `Select` `InputOTP` `InputGroup` `Combobox` |
| Field | `Field` `FieldLabel` `FieldDescription` `FieldError` `FieldGroup` `FieldContent` `FieldTitle` `FieldSeparator` `FieldSet` `FieldLegend` |
| Form (RHF) | `Form` `FormItem` `FormLabel` `FormControl` `FormDescription` `FormMessage` `FormField` |
| Display | `Badge` `Card` `Avatar` `Skeleton` `Separator` `Progress` `Spinner` `Kbd` |
| Item | `Item` `ItemMedia` `ItemContent` `ItemActions` `ItemGroup` `ItemSeparator` `ItemTitle` `ItemDescription` `ItemHeader` `ItemFooter` |
| Empty | `Empty` `EmptyHeader` `EmptyTitle` `EmptyDescription` `EmptyContent` `EmptyMedia` |
| Tabs | `Tabs` `TabsList` `TabsTrigger` `TabsContent` (variants: `default`, `line`) |
| Overlay | `Dialog` `AlertDialog` `Sheet` `Drawer` `Tooltip` `Popover` `DropdownMenu` `Command` |
| Navigation | `Accordion` `Breadcrumb` `Pagination` `NavigationMenu` |
| Layout | `ScrollArea` `Table` `Calendar` `Carousel` `Sidebar` `ResizablePanel` |
| Feedback | `Alert` `Toaster` |

---

## 대체 대상 분석

### Phase 1 — `components/ui/badge.tsx` 삭제 → DS `Badge` 직접 사용

**문제**: 로컬 Badge가 PERFO 전용 variant (neutral/info/success/warning/danger)를 정의.  
**DS Badge variant**: `default` `secondary` `destructive` `outline` `ghost` `link`  
**차이**: variant 이름이 다름. DS Badge의 variant 의미가 PERFO Badge와 다름.

**결정 필요**: 
- 옵션 A: DS `Badge`에 `className`으로 색상 override해서 로컬 Badge 삭제
- 옵션 B: 로컬 Badge를 DS Badge 위에 thin wrapper로 유지 (variant 매핑)

**영향 파일**:
- `components/tickets/ticket-shell.tsx` — `Badge` 사용
- `app/[locale]/(scanner)/my-tickets/[ticketId]/scan/ScanResultPanel.tsx` — `Badge` 사용
- `app/[locale]/(scanner)/my-tickets/[ticketId]/scan/ScannerViewport.tsx` — `Badge` 사용

**권장**: 옵션 B (DS Badge로 전환 + variant를 className className으로 매핑하는 wrapper 유지, 단 DS Badge 상속)

---

### Phase 2 — `components/ui/form-field.tsx` → DS `Field` / `FieldLabel`

**현재**:
```tsx
// FormField = div with space-y-1.5
// FormFieldLabel = Label with text-xs styling
```

**대체**:
```tsx
// FormField → Field (orientation="vertical")
// FormFieldLabel → FieldLabel (className 조정)
```

**영향 파일**:
- `components/profile/ProfileEditSheet.tsx`
- `app/[locale]/(main)/my-tickets/TicketFormSheet.tsx`

**작업**: `form-field.tsx` 삭제, 두 파일에서 import 변경

---

### Phase 3 — `components/ui/action-row.tsx` → DS `Item`

**현재**:
```
ActionRow        → 클릭 가능한 row (button)
ActionRowLeading → 왼쪽 아이콘/텍스트 영역 (div)
ActionRowText    → 텍스트 (span)
ActionRowChevron → ChevronRight 아이콘
```

**DS 대체**:
```
ActionRow        → Item (asChild + button, 또는 variant="default")
ActionRowLeading → ItemContent 또는 ItemMedia
ActionRowText    → ItemTitle
ActionRowChevron → ItemActions 안에 ChevronRight
```

**영향 파일**: `components/design-system/showcase.tsx` (현재 유일)

**주의**: `Item`이 `div` 기반이므로 `asChild`로 `button` 렌더링 필요.  
**판단**: ActionRow 패턴이 프로젝트 전체에 확대될 예정이라면 Item으로 전환 가치 있음.

---

### Phase 4 — `components/ui/toggle-row.tsx` → DS `Item` + `Switch`

**현재**: `div` 레이아웃 + `Switch`(이미 DS)  
**대체**: `Item` + `ItemContent` + `ItemTitle` + `ItemActions` + `Switch`

```tsx
// 현재
<div className="flex items-center justify-between py-4">
  <div className="flex items-center gap-3">{icon}<span>{label}</span></div>
  <Switch ... />
</div>

// 대체
<Item>
  <ItemMedia>{icon}</ItemMedia>
  <ItemContent><ItemTitle>{label}</ItemTitle></ItemContent>
  <ItemActions><Switch ... /></ItemActions>
</Item>
```

**영향 파일**:
- `app/[locale]/(main)/profile/ProfileScreen.tsx`
- `app/[locale]/(main)/my-tickets/TicketFormSheet.tsx`

---

### Phase 5 — `components/ui/tabs.tsx` → DS `Tabs`

**현재**: pill 스타일 커스텀 Tabs (rounded-full, bg-primary active)  
**DS Tabs**: Radix UI 기반, variant `default` | `line`

**차이**: DS Tabs가 현재 pill 스타일 지원 여부 확인 필요 (tabsListVariants에 `pill`이 없음).

**결정 필요**:
- DS Tabs `variant="default"`가 pill처럼 보이는지 CSS 확인 후 결정
- pill 스타일이 다르면 로컬 Tabs 유지하되 내부를 DS Tabs primitive로 교체

**영향 파일**:
- `app/[locale]/(main)/reserved/page.tsx`
- `app/[locale]/(main)/my-tickets/TicketFilterTabs.tsx`

---

### Phase 6 — `StatusPage.tsx` 내부 raw HTML → DS Typography

**현재 raw HTML**:
```tsx
<p className="text-[11px] font-semibold uppercase tracking-[0.08em]">HTTP {code}</p>
<h1 className="text-2xl leading-tight font-bold text-primary">{title}</h1>
<p className="max-w-sm text-sm leading-6 text-[var(--text-muted)]">{description}</p>
```

**DS 대체**:
```tsx
<Kicker>HTTP {code}</Kicker>           // text-[11px] uppercase tracking
<H2>{title}</H2>                       // or H1, check DS sizing
<Muted className="max-w-sm">{description}</Muted>  // text-muted
```

**파일**: `components/feedback/StatusPage.tsx`

---

### Phase 7 — `TicketCard.tsx` ticket number span → DS Typography

**현재**:
```tsx
<span className="text-sm font-semibold text-primary">{ticketNumber}</span>
<span className="font-normal text-[var(--text-subtle)]">/ {totalCount}</span>
```

**DS 대체**:
```tsx
<Small className="font-semibold text-primary">{ticketNumber}</Small>
<Small className="font-normal text-[var(--text-subtle)]">/ {totalCount}</Small>
```

또는 `Muted`. Typography 컴포넌트 실제 스타일 확인 후 결정.

**파일**: `components/tickets/TicketCard.tsx`

---

### Phase 8 — `ProfileScreen.tsx` / `AdminDashboardScreen.tsx` section headers → DS Typography

**현재**:
```tsx
<h3 className="px-2 text-sm font-semibold text-[var(--text-muted)]">...</h3>
<h2 className="mt-4 text-2xl font-bold tracking-tight text-[var(--text)]">...</h2>
```

**DS 대체**:
```tsx
<Kicker className="px-2">...</Kicker>   // section label
<H3>...</H3>                            // display name
```

**파일**:
- `app/[locale]/(main)/profile/ProfileScreen.tsx`
- `app/[locale]/(main)/admin/AdminDashboardScreen.tsx`

---

### Phase 9 — `stat-card.tsx` / `toolbar.tsx` 유지 또는 DS Card로 대체

**StatCard**: DS에 직접 대응 없음. `Card` 위에 세부 구조 있음.
- `StatCard` → `Card` + `CardContent`로 대체 가능
- `StatLabel/StatValue/StatMeta` → `Muted`/`H3`/`Small` Typography로 대체

**Toolbar**: DS에 직접 대응 없음.
- `Toolbar` → `Card` 또는 `section` 유지
- `ToolbarTitle` → `H3` 또는 `Large`
- `ToolbarDescription` → `Muted`

**판단**: StatCard/Toolbar는 DS 구성 요소 조합으로 인라인 대체 or 커스텀 유지. 사용 빈도 적으면 그냥 유지.

---

## 실행 순서

| 순서 | 작업 | 파일 수 | 난이도 |
|------|------|---------|--------|
| 1 | `form-field.tsx` 삭제 → DS `Field`/`FieldLabel` | 3 | 낮음 |
| 2 | `action-row.tsx` → DS `Item` | 2 | 낮음 |
| 3 | `toggle-row.tsx` → DS `Item` + `Switch` | 3 | 낮음 |
| 4 | `StatusPage.tsx` raw HTML → DS Typography | 1 | 낮음 |
| 5 | `TicketCard.tsx` span → DS Typography | 1 | 낮음 |
| 6 | Profile/Admin section headers → DS Typography | 2 | 중간 |
| 7 | `badge.tsx` → DS `Badge` wrapper | 4 | 중간 |
| 8 | `tabs.tsx` → DS `Tabs` (variant 검증 후) | 3 | 중간 |
| 9 | `stat-card.tsx` / `toolbar.tsx` 판단 후 처리 | 2 | 낮음 |

---

## 보류/미대상

- `auth` 페이지들: Button, Card, Input, Label 이미 DS 사용. 내부 `<div>` 래퍼들은 레이아웃 목적이므로 대체 불필요.
- `ProfileEditSheet.tsx` 내부 레이아웃 `<div>`: 구조적 레이아웃이므로 대체 의미 없음. Form 오류 `<p>` → `FieldError` 대체는 Phase 2와 함께 처리.
- `TicketFormSheet.tsx` 레이아웃 `<div>`: 동일.

---

## 주의사항

1. DS `Badge` variant 이름이 PERFO 로컬과 다름 — `ticket-shell.tsx`에서 `badgeVariant` prop 타입 변경 필요
2. DS `Tabs`가 Radix UI 기반 — 현재 로컬 Tabs는 단순 button/div. controlled/uncontrolled 방식 차이 있음
3. DS Typography 컴포넌트의 실제 렌더링 HTML tag 확인 필요 (H1→h1 vs div)
4. `Item` asChild 사용 시 `button` 렌더링 → accessibility 속성 그대로 전달되는지 확인
