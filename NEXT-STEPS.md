Next Session Notes — DSR Calendar

Snapshot reference
- Commit: snapshot: standalone DSC API; anchor KA/year-name to 14656; fix calendar math; adapt moon/eclipse engines; emit ready hook
- Tag: snapshot-20250808-1800

What’s implemented
- Standalone DSC API with anchored cycle math (KA 190 / Year 27 / “Wind’s Reverance” for Year 14656).
- Fixed time math and 1-based day handling.
- Moon engine reads `cycleLength` and `firstNewMoonDay` from data; colors from JSON.
- Eclipse engine no longer depends on external core; uses DSC mapping when available.
- Emits `dark-sun-calendar:ready` hook.

Next steps (no external dependencies)
1) Integrate calendar grid UI
   - Remove all Seasons & Stars references from `scripts/calendar-grid.js`.
   - Use only DSC API and `data/darksun-calendar.json`.
   - Wire template `templates/calendar-grid-widget.hbs` and `styles/calendar-grid.css`.
   - Provide `window.DSC.showWidget/hideWidget/toggleWidget` implementations.

2) Chat commands (standalone fallback)
   - Keep Chat Commander registration if present.
   - Add fallback via `Hooks.on('chatMessage', ...)` for `/date`, `/time`, `/moons`, `/eclipse`, `/advance`, `/calendar`.
   - Ensure module id uses `dsr-calendar` and all features call DSC API.

3) module.json & i18n
   - Add `scripts/chat-commands.js` and `scripts/calendar-grid.js` to `esmodules`.
   - Add `styles/calendar-grid.css` to `styles`.
   - Route user strings through `lang/en.json` and trim console noise.

4) Sanity checks
   - Verify intercalary periods, month/day navigation, KA/year-name display.
   - Moon phase rendering and eclipse badges on grid.
   - Date advancement helpers (minutes/hours/days/weeks/months/years).

Notes
- Free Year mapping: FY = year − 14654 (no FY 0).
- Keep everything standalone; no S&S or other module dependencies.
