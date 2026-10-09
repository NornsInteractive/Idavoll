<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Idavoll UI Navigation, Theme & i18n Standards

- **Header Navigation Active States & Animations**:
  - Desktop header navigation (大厅, 游戏库, 创建房间, 个人中心) must clearly render the active item with an animated background pill (`motion.div` with `layoutId="header-nav-indicator"`, spring transition stiffness 420, damping 30).
  - Stacking Context: The `<nav>` container must use `relative isolate`. Active text must render with high contrast `text-white font-extrabold` inside `<span className="relative z-10 pointer-events-none">`. Never use negative z-index (`-z-10`) on `motion.div`, which hides the active pill behind container backgrounds. Inactive links must render with `text-muted-foreground hover:text-foreground`.
- **Dynamic Accent Color & Theme Switching**:
  - The application provides 5 theme accent presets (Indigo `#5B5BF0`, Coral `#FF6B5E`, Mint `#2EC4A6`, Amber `#F59E0B`, Violet `#8B5CF6`).
  - All interactive elements, highlights, indicators, and buttons must consume CSS variable `var(--theme-primary, #5B5BF0)` (or Tailwind `primary` utility mapped to `--theme-primary`).
  - Hardcoded color hexes (e.g., `#5B5BF0`) or static Tailwind color classes (e.g. `indigo-500`, `indigo-600`, `shadow-indigo-500/20`) are banned in general UI components.
  - Dark mode (`.dark`) and light mode must switch smoothly using semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `bg-surface`, `text-foreground`, `text-muted-foreground`, `border-border`).
- **Multi-Language (i18n) Completeness**:
  - All user-facing strings across all views, modal dialogs, scoreboard ranks, danmaku placeholders, and error toasts must be localized via `useTranslation()` / `t()`.
  - Translations must maintain strict parity between `zh-CN` (Simplified Chinese) and `en` (English) in `apps/web/src/i18n/index.ts`. Parameterized strings must use interpolation variables (e.g., `{{count}}`).

