# Idavoll UI Navigation, Theme & i18n Rules

## 1. PC Header Navigation Active State & Motion Animation
- **Navigation Items**:
  - `大厅` (`/lobby`)
  - `游戏库` (`/games`)
  - `创建房间` (`/create-room` or `/room/:roomId` during active room session)
  - `个人中心` (`/profile`)
- **Active State Indicator**:
  - Active links MUST display an active background pill using Framer Motion's shared layout animation:
    ```tsx
    <motion.div
      layoutId="header-nav-indicator"
      className="absolute inset-0 rounded-full bg-[var(--theme-primary,#5B5BF0)] shadow-md shadow-[var(--theme-primary,#5B5BF0)]/25"
      style={{ backgroundColor: 'var(--theme-primary, #5B5BF0)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
    />
    ```
  - The container `<nav>` must specify `relative isolate` with `bg-muted/60 p-1.5 rounded-full border border-border/80 shadow-inner`.
  - Active text must render with high contrast `text-white font-extrabold` inside `<span className="relative z-10 pointer-events-none">`.
  - Inactive links must render with `text-muted-foreground hover:text-foreground hover:bg-background/40 font-bold`.
  - Banned pattern: Do NOT use `-z-10` on `motion.div`, as negative z-index places the element behind `<nav>`'s background in browser stacking contexts, causing the active indicator to disappear.

## 2. Dynamic Accent Theme & Theme Switching
- **Accent Theme Color Binding**:
  - The user can select from 5 curated accent colors (Indigo `#5B5BF0`, Coral `#FF6B5E`, Mint `#2EC4A6`, Amber `#F59E0B`, Violet `#8B5CF6`).
  - All primary interactive elements, highlights, glows, and badges MUST use CSS variable `var(--theme-primary, #5B5BF0)` or Tailwind's `primary` utilities mapped to `var(--theme-primary, #5B5BF0)`.
  - Hardcoded hex values or framework-specific preset color classes (such as `indigo-500`, `indigo-600`, `shadow-indigo-500/20`) are STRICTLY PROHIBITED in general UI components.
- **Light / Dark Mode Adaptation**:
  - Semantic tokens MUST be used throughout (`bg-background`, `bg-card`, `bg-muted`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`).
  - Dark mode and light mode must switch seamlessly with crisp contrast, accessible text, and zero color clipping.
  - Theme toggles must update SVG icon colors dynamically to match the current accent color.

## 3. Multi-language (i18n) Completeness
- **Universal Localization Requirement**:
  - All user-visible strings (labels, buttons, hints, tooltips, validation errors, modal dialogs, scoreboard ranks, danmaku placeholders) MUST be localized via `react-i18next` (`t('namespace.key')`).
  - Both `zh-CN` (Simplified Chinese) and `en` (English) translation dictionaries in `apps/web/src/i18n/index.ts` MUST maintain complete parity.
  - Parameterized strings must use interpolation (e.g., `{{count}}`, `{{score}}`, `{{name}}`) instead of manual string concatenation to avoid layout and grammar issues across languages.
