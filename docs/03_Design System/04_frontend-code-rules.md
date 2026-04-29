# Frontend Code Rules

These rules apply to all new or modified code under `frontend/`.

## Component Exports

- Declare React components, pages, and layouts as arrow functions assigned to `const`.
- Export React components, pages, and layouts with `export default ComponentName`.
- Shared UI primitive files may keep named exports for grouped imports, but each component implementation must still be an arrow function.

## Framework Exceptions

- Next route handlers (`GET`, `POST`, `DELETE`) must remain named exports because Next.js discovers them by name.
- Framework-required exports such as `metadata` and `config` may remain named exports.
- Even for these exceptions, use arrow function implementations.

## Types And Constants

- Move component props and domain types into adjacent `*.types.ts` files.
- Move static mock data, option arrays, status maps, and other reusable constants into adjacent `*.constants.ts` files.
- Keep `.tsx` files focused on rendering, state transitions, and event handlers.

## Theme Safety

- New pages and components must be dark-mode safe from the first commit.
- Do not use direct color utility classes such as `text-perfo-*`, `bg-perfo-*`, `border-perfo-*`, `text-white`, `bg-black`, or palette classes like `bg-gray-200`.
- Do not use ad hoc hex color classes in `className`.
- Build from semantic tokens and shared primitives instead:
  - `bg-background`, `text-foreground`
  - `bg-[var(--surface-raised)]`, `bg-[var(--surface-muted)]`
  - `text-primary`, `text-[var(--text-muted)]`, `border-border`
- Start new product pages from `PageShell`, `PageHeader`, `PageSection`, `PageActions`, `PageFilterBar`, `PageEmptyState`, and `PageFab` in `frontend/components/layout/` unless the route already has a stronger established pattern.
- When a new UI need appears, prefer extending shared components or tokens before adding page-local color rules.

## Example

```tsx
import type { TicketCardProps } from "./ticket-card.types";
import { STATUS_META } from "./ticket-card.constants";

const TicketCard = ({ ticket }: TicketCardProps) => {
  const meta = STATUS_META[ticket.status];

  return <article>{meta.label}</article>;
};

export default TicketCard;
```

```tsx
import PageHeader from "@/components/layout/PageHeader";
import PageSection from "@/components/layout/PageSection";
import PageShell from "@/components/layout/PageShell";

const ExamplePage = () => {
  return (
    <PageShell className="ds-shell">
      <div className="px-5 pt-8 pb-10">
        <PageSection spacing="lg">
          <PageHeader
            title="Page title"
            description="Use semantic tokens and shared primitives by default."
          />
        </PageSection>
      </div>
    </PageShell>
  );
};

export default ExamplePage;
```
