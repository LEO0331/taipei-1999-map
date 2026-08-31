# Session Handoff

## Current Objective

- Goal: Keep the Taipei 1999 map project restartable, use API-key-free map tiles, keep Chinese-mode displays fully localized, and maintain separate English/Traditional Chinese documentation.
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

## Recommended Next Step

Choose the next product feature from `feature_list.json`, or update the tracker with a precise new feature before implementation.
