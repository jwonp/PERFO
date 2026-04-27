# PERFO Design System Principles

## Intent

PERFO is a ticketing product. The interface should feel operational, time-aware, and trustworthy before it feels decorative. Users should be able to scan status, compare options, and act quickly on both desktop and mobile.

## Brand Signals

1. Calm control over hype
2. Dense but readable information
3. Crisp hierarchy over oversized decoration
4. Clear action contrast
5. Subtle motion that confirms state, not spectacle

## Visual Constraints

1. Avoid one-note blue screens. Blue is the anchor, not the entire palette.
2. Avoid oversized rounded cards. Repeated cards stay at 8px radius or less.
3. Avoid section-as-card layouts. Use full-width bands with constrained content.
4. Avoid weak contrast between body text, labels, and metadata.
5. Avoid promotional hero patterns on product screens. The first viewport should show usable UI.

## Layout Rules

1. Primary screens should open with actionable controls or live status.
2. Tables, filters, and inventory states should remain scannable at laptop widths.
3. Mobile layouts should stack cleanly without resizing controls based on content.
4. Toolbars, stat blocks, and filters should have fixed control heights to prevent layout jump.

## Interaction Rules

1. Reserve the strongest color for primary actions and active states.
2. Use icon-first controls for tools and quick actions where meaning is familiar.
3. Motion should be short and informative. Prefer 160ms to 220ms transitions.
4. Error, warning, and success states must be distinguishable without relying only on color.
