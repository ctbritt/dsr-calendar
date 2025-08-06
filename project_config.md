# project_config.md
Developer Workflow Configuration

<!-- STATIC:GOAL:START -->
## Goal  
Build and maintain a **Foundry VTT module** (`dsr-calendar`) compatible with **Foundry core v13.346** that modifies and extends the core calendar functionality with the D&D Dark Sun campaign setting while sustaining a green CI (lint / type-check / tests) and zero in-game regressions.
<!-- STATIC:GOAL:END -->

<!-- STATIC:TECH_STACK:START -->
## Tech Stack
### Languages & Runtime
- **JavaScript (ES6+)** targeting **ES2022**
- **Node 20.x** for tooling (if needed)
### Tooling
- **Plain JavaScript** - no build tools currently
- **Foundry VTT** static file serving
- **ESLint** (airbnb) & **Prettier** for lint/format (if configured)
- **Manual testing** - no automated test framework currently
- **CSS** for styling (no pre-processor currently)
### CI / CD
- **Manual deployment** - no automated CI/CD currently
<!-- STATIC:TECH_STACK:END -->

<!-- STATIC:PATTERNS:START -->
## Patterns
- **Foundry lifecycle aware**: never touch `game`/`ui` before the `ready` hook
- **Functional core / imperative shell**: isolate Foundry globals in adapters
- **Public API** exposed on `DSRcalendar` with semver guarantees
- **JavaScript ES6+**: use modern JavaScript features, prefer const/let over var
- **i18n-first**: all user-facing strings via `game.i18n`
- **CSS** for styles; no pre-processor currently
- **Secrets** (API keys) stored in `world`-scoped, `config:false` settings
<!-- STATIC:PATTERNS:END -->

<!-- STATIC:CONSTRAINTS:START -->
## Constraints
- Lint errors: **0** (if ESLint configured)
- Manual testing: **thorough**
- Module must fail gracefully on other v13.x builds and log a warning on v14+
- No build tools required - direct JavaScript files
- Keep code simple and readable
<!-- STATIC:CONSTRAINTS:END -->

<!-- STATIC:TOKENIZATION:START -->
## Tokenization
≈ 4 characters ≈ 1 token; hard limit **4000 tokens** per OpenAI request; roll-up summaries for chat history beyond **8000 tokens**.
<!-- STATIC:TOKENIZATION:END -->

<!-- STATIC:MODEL_CONFIG:START -->
## Model Config
Type: [feature|bugfix|refactor|test|chore]  
Architecture: [module|system|world|backend]  
Input: [src/**/*|foundry_data|settings]  
Output: [dist/module.json|packs|public assets]  
Baseline: [lint_pass|typecheck_pass|tests_green|coverage≥threshold]
<!-- STATIC:MODEL_CONFIG:END -->

<!-- STATIC:DATA_CONFIG:START -->
## Data Config  
Source: [repo_files|foundry_env|compendia]  
Size: [files_changed] files, [loc_estimate] LOC  
Split: tests [unit|integration|e2e]  
Features: [languages|frameworks|tools]
<!-- STATIC:DATA_CONFIG:END -->

<!-- DYNAMIC:CHANGELOG:START -->
## Changelog
<!-- AI populates project changes -->
<!-- DYNAMIC:CHANGELOG:END -->
