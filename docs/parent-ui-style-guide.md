# Parent UI Style Snapshot

## 1) Design Tokens (Global)

Defined in `miniprogram/app.wxss`:

- Colors: `--parent-bg`, `--parent-bg-soft`, `--parent-surface`, `--parent-surface-muted`, `--parent-primary`, `--parent-primary-strong`, `--parent-primary-soft`, `--parent-text`, `--parent-text-secondary`, `--parent-text-hint`, `--parent-border`, `--parent-danger-soft`, `--parent-danger`
- Radius: `--parent-radius-sm`, `--parent-radius-md`, `--parent-radius-lg`, `--parent-radius-xl`
- Motion: `--parent-motion-fast`, `--parent-press-scale`
- Shadows: `--parent-shadow-xs`, `--parent-shadow-sm`, `--parent-shadow-md`, `--parent-shadow-accent`

## 2) Shared UI Classes

Defined in `miniprogram/app.wxss`:

- Layout/cards: `parent-card`, `parent-list-card`, `parent-list-item`, `parent-section-title`, `parent-footer`
- Inputs/buttons: `parent-input`, `parent-btn-primary`, `parent-btn-secondary`
- Interaction: `pressable`, `is-press`
- Common icon helper: `inline-icon-xs`

## 3) Page Mapping (Parent Pages)

All parent pages were normalized to the new token system and consistent interaction behavior:

- Batch A: `add-task`, `child-profiles`, `audit-center`, `dashboard`
- Batch B: `coadmin-manage`, `profile-edit`, `daily-limit`, `child-manage`, `bind-guide`, `mcp-verify`, `setting`, `add-child`, `family-manage`, `task-manage`

Core consistency updates:

- Unified base surfaces/background/text/border/shadow to token values
- Standardized `hover-class="is-press"` + `pressable` transition behavior
- Removed static inline styles from parent WXML (kept only dynamic styles for charts/sliders)
- Fixed mixed unit usage (`px` -> `rpx`) for parent styles

## 4) Notes for Future Pages

When adding a new parent page:

1. Use token variables only (avoid new hardcoded colors unless status-specific)
2. Use `parent-card` / `parent-list-card` first, then page-level refinements
3. Add `pressable` to any element using `hover-class="is-press"`
4. Keep inline `style` only for runtime-calculated values
5. Prefer existing shadow tiers instead of creating new shadow values
