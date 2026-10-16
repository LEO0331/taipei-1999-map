# Session Handoff

## Current Objective

- Goal: Keep the Taipei 1999 map project restartable, keep deployed PWA content current, use API-key-free map tiles, keep Chinese-mode displays fully localized, ensure all module aggregates honor filters, and maintain separate English/Traditional Chinese documentation.
- Current status: No active feature; all entries in `feature_list.json` are complete.
- Branch / commit: current working tree; commit the harness update when ready.

## Current Verification

| Check | Command | Result |
|---|---|---|
| Dependency bootstrap | `npm.cmd ci` | PASS |
| Regression tests | `npm.cmd test` | PASS — 27 tests across 4 files |
| Production build | `npm.cmd run build` | PASS |
| Map tile source | `src/App.tsx`, `src/components/StreetlightRepairs.tsx` | PASS — official OSM tiles with visible attribution |
| Chinese display audit | `npm.cmd test` | PASS — 30 tests, including localized formatting |
| Documentation split | `README.md`, `README-zh.md` | PASS — English and Traditional Chinese project guides |
| PWA cache refresh | `public/sw.js`, `src/main.tsx` | PASS — versioned cache and refresh-on-load update check |
| Automatic PWA refresh | `public/sw.js` | PASS — activation claims and reloads controlled windows |
| Filtering consistency | `src/lib/filtering.ts`, module components, `tests/filtering.test.ts` | PASS — 34 tests including filtered aggregate coverage |
| Harness structure | `node C:\Users\150592\.agents\skills\harness-creator\scripts\validate-harness.mjs --target D:\Practice\taipei-1999-map` | PASS — 100/100 |

## Startup

1. Read `AGENTS.md`, `feature_list.json`, and the latest `progress.md` entry.
2. Run `./init.sh` from Bash, or `./init.ps1` from Windows PowerShell.
3. If all features are complete, add one narrowly scoped feature entry before editing.
4. Preserve privacy constraints: UI code may use `displayLocation`, never `originalAddress`.

## Risks

- Local `npm run dev` fails under Node 20.2.0 because Vite expects `crypto.hash`; use Node 22 or a supported Node 20 patch release for dev-server work.
- `npm ci` reports 3 dependency audit findings (1 low, 2 high); do not run automated remediation without reviewing the lockfile impact.
- The restricted Codex sandbox can return `spawn EPERM` for the PowerShell wrapper's nested Vitest process; verify `init.ps1` from a normal workstation shell if needed. Top-level npm checks pass.
- GitHub Pages must be enabled in repository settings for the Actions deployment workflow.
- Generated public datasets and raw CSVs are intentionally large; avoid unrelated data regeneration.
- OpenStreetMap tiles are best-effort; keep usage limited to interactive viewing under the tile usage policy.
- Existing deployed tabs may briefly reload once for the new service worker to activate; later app/data updates use network-first refresh with offline fallback.

## Recommended Next Step

Choose the next product feature from `feature_list.json`, or update the tracker with a precise new feature before implementation.

## 2026-10-16 — Current feature delivery

Civic decision support v1.0 implemented on `codex/civic-decision-v1` (feat-017). Latest complete originals: 2026-04 through 2026-09. Default pollution comparison Apr–Jun vs Jul–Sep selects 松山、文山、南港、信義、中山, representing 1334 historical dispatch records under five review slots. See `docs/civic-decision-delivery.md` and methodology for reproduction and boundaries.

Final local verification: `npm ci`, `./init.ps1` (96 tests / 16 files, TypeScript, production build), Pages build and diff check pass. Use project-local TEMP/TMP in restricted sandboxes if default TEMP atomic rename fails. No new dependencies. Browser checks include bilingual desktop/mobile, filtering/capacity and JSON/CSV export. Existing worker/partition regressions pass.

Do not commit `data/raw/open1999/civic-staged/`; it contains raw official addresses. Offline rebuild requires these private staged originals; a fresh checkout can consume the checked-in aggregate or run `npm run data:build:civic -- --refresh` to reacquire. Unknown retained historical hashes must not be promoted to complete. Follow-up dependency review: source-map-js high-severity transitive advisory. Rodent-specific views intentionally unavailable without verified evidence. Do not merge the feature branch automatically.

Review draft PR: https://github.com/LEO0331/taipei-1999-map/pull/8 . Implementation commit a37506c is pushed; review before merging. Production Pages base path and CSV download/parse were also verified against the final snapshot version.
