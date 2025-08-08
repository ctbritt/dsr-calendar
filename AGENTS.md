# Repository Guidelines

## Project Structure & Module Organization
- Core config: `module.json` (loads ES modules and CSS).
- Source code: `scripts/` (e.g., `module.js`, `moon-engine.js`, `eclipse-engine.js`, `chat-commands.js`).
- Data: `data/` (e.g., `darksun-calendar.json`, historical data).
- UI: `templates/` (Handlebars widgets) and `styles/` (`module.css`).
- Localization: `lang/en.json` (all user-facing strings).
- Install path (example): `/home/chris/foundryuserdata/Data/modules/dsr-calendar`.

## Build, Test, and Development Commands
- Build: none. Foundry v13 loads files directly from this folder via `module.json`.
- Run locally: launch Foundry v13, enable “DSR Calendar” in a test world.
- Hot-reload: browser refresh (F5) after editing files; clear cache if assets don’t update.
- Link into Foundry (example): `ln -s "$(pwd)" ~/foundryuserdata/Data/modules/dsr-calendar`.
- Optional lint/format (if configured): `npx eslint scripts --ext .js`; `npx prettier -w .`.

## Coding Style & Naming Conventions
- JavaScript ES2022, 2-space indentation, `const`/`let` (no `var`).
- Names: files kebab-case (e.g., `moon-engine.js`); classes `PascalCase`; functions/vars `camelCase`.
- Foundry hooks: do not access `game`/`ui` before `ready`/`init` as appropriate.
- i18n: route UI strings through `game.i18n` (keys in `lang/en.json`).
- Logging: prefer concise warnings/errors; avoid noisy `console.log` in production paths.

## Testing Guidelines
- Automated tests: none; use manual testing in Foundry v13.
- Smoke checks: enable module, verify calendar renders, date conversion, and season/year names.
- Chat commands (via Chat Commander if present): `/date`, `/time`, `/moons`, `/eclipse`, `/advance 1 day`.
- Regressions: verify intercalary days, King’s Age math, and moon phase calculations.

## Commit & Pull Request Guidelines
- Style: imperative, concise subject lines (no strict Conventional Commits). Examples: “Fix calendar system…”, “Refactor moon time calculation…”, “Remove extend-calendar.js…”
- Scope: mention touched areas when helpful (e.g., scripts/module.js, data/…).
- PRs must include: summary, rationale, screenshots/GIFs of UI changes, Foundry version tested (v13.x), and any migration notes.
- Versioning: `module.json` contains a placeholder version; coordinate version bumps with releases.

## Security & Configuration Tips
- Keep settings world-scoped where possible; avoid secrets in code.
- Validate user input and guard GM-only actions (see chat command handlers).
