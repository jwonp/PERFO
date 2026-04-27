# PERFO Foundations

## Color Roles

- `--primary`: operational blue used for primary actions and active emphasis
- `--secondary`: cool support tone used for secondary surfaces and data context
- `--accent`: warm highlight used sparingly for urgency and attention
- `--success`, `--warning`, `--danger`: state colors with clear semantic meaning
- `--background`, `--surface`, `--surface-raised`, `--surface-muted`: layered surfaces
- `--text`, `--text-muted`, `--text-subtle`: hierarchy for readable interface text

## Typography

- Display: bold, compact, reserved for page and section headlines
- Body: readable system sans with moderate density
- Meta: smaller labels for timestamps, counts, and support data
- Mono: for IDs, inventory counts, and technical fragments

## Spacing Scale

- `--space-1` `4px`
- `--space-2` `8px`
- `--space-3` `12px`
- `--space-4` `16px`
- `--space-5` `20px`
- `--space-6` `24px`
- `--space-8` `32px`
- `--space-10` `40px`

Use consistent vertical rhythm. Dense product areas should usually work within `12px` to `24px` gaps.

## Radius Scale

- `--radius-sm` `4px`
- `--radius-md` `6px`
- `--radius-lg` `8px`

Do not exceed `8px` on repeated cards, filter bars, or table wrappers.

## Shadow Scale

- `--shadow-soft`: for raised surfaces
- `--shadow-panel`: for sticky bars and tool panels

Shadows should separate layers, not become decoration.

## Core Patterns

1. Command bar: segmented actions, filters, summary badges
2. Queue panel: status chips, counts, and next-action buttons
3. Inventory or ticket card: title, metadata, state, and a compact action row
4. Form section: label, helper text, control, validation state
