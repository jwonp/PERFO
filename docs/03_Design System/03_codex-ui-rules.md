# Codex UI Rules

Use these rules when generating new UI in this repo.

## Foundations

1. Build from semantic tokens in `frontend/app/globals.css`.
2. Prefer `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, and the `ds-*` utility classes before inventing ad hoc values.
3. Keep repeated surface radius at `rounded-lg` or smaller.
4. Start new pages from `PageShell`, `PageHeader`, `PageSection`, `PageActions`, `PageFilterBar`, `PageEmptyState`, and `PageFab` in `frontend/components/layout/` unless the existing route family already provides a stronger shell.
5. Never introduce direct palette or brand utility classes in page code. Use semantic tokens and shared variants only.

## Layout

1. Start product pages with working UI, not a marketing hero.
2. Use full-width page bands with constrained inner content instead of large floating cards.
3. Keep primary action rows at fixed heights and stable gaps.

## Components

1. Buttons should have explicit purpose: `default`, `secondary`, `outline`, `ghost`, `destructive`.
2. Use icons in tool buttons, status actions, and quick controls.
3. Inputs, selectors, and tabs should share a common control height.
4. Do not nest cards inside cards for page structure.

## Color and Motion

1. Blue is the anchor. Warm accent is for alerts, deadlines, and key highlights.
2. Do not fill a page with multiple saturated blocks competing for attention.
3. Keep transitions short and meaningful. No decorative floating effects.

## Review Checklist

1. Is the first viewport immediately usable?
2. Are text and metadata clearly separated by hierarchy?
3. Are controls aligned to a stable grid with no resizing from content?
4. Are semantic colors applied consistently for action, warning, success, and danger?
