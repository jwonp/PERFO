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
