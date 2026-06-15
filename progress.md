# Session Progress Log

## Current State

**Last Updated:** 2026-06-15 08:40 CST  
**Active Feature:** none - requested deployment, harness, review, and cleanup work complete

## Status

### What's Done

- [x] Created the Taipei 1999 Vite React app with Leaflet map, dashboard, filters, bilingual UI, PWA files, and data conversion scripts.
- [x] Downloaded and converted Open1999 data into privacy-preserving public JSON.
- [x] Created a minimal agent harness: `AGENTS.md`, `feature_list.json`, `progress.md`, `init.sh`, and `session-handoff.md`.
- [x] Added regression tests for malformed dates, invalid times, address masking, aggregation, and duplicate case IDs.
- [x] Added GitHub Pages workflow and Vite Pages base-path handling.
- [x] Refreshed Taipei Open Data resources and regenerated public JSON.

### What's In Progress

- [x] Final deployment workflow verification.
  - Details: `./init.sh` and `npm run build:pages` passed.
  - Blockers: none.

### What's Next

1. Enable GitHub Pages deployment from Actions in repository settings if it is not already enabled.
2. Commit when ready using the repo Lore Commit Protocol.

## Blockers / Risks

- [ ] GitHub Pages must be enabled in the repository settings for Actions-based Pages deployment.
- [ ] Public JSON is capped to the latest 150,000 sanitized records for browser performance; raw CSVs remain local under `data/raw/open1999/`.

## Decisions Made

- **Use a dedicated Pages build script for project-relative assets**:
  - Context: GitHub Pages project sites serve assets under `/<repo>/`, while local dev and ordinary hosting should use `/`.
  - Alternatives considered: rely only on `GITHUB_PAGES=true`; rejected because `npm run build:pages` is easier to verify locally and mirrors the workflow command.

## Files Modified This Session

- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow.
- `package.json`, `vite.config.ts` - GitHub Pages base path.
- `src/lib/open1999.ts` - invalid time rejection and record deduplication.
- `scripts/convertOpen1999.ts` - duplicate case ID removal before public JSON output.
- `src/App.tsx` - empty dashboard top-group guard.
- `tests/open1999.test.ts` - regression coverage for invalid times and duplicates.
- `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh` - agent harness.
- `src/hooks/useOpen1999Data.ts`, `src/main.tsx`, `public/sw.js` - GitHub Pages-safe data and service worker paths.

## Evidence of Completion

- [x] Tests pass: `./init.sh` ran `npm test` and passed 12 tests.
- [x] Type check/build clean: `./init.sh` ran `npm run build` and passed.
- [x] GitHub Pages build mode: `npm run build:pages` passed; `dist/index.html` uses `/taipei-1999-map/` paths.
- [x] Data refresh: `npm run fetch:data` completed; generated `150,000` public records from `123` CSV files / `122` upstream resources.
- [x] Pages data path: `dist` contains `dist/data/*.json`; bundled JS fetches `/taipei-1999-map/data/open1999-records.json`.

## Notes for Next Session

Use `./init.sh` as the standard startup verification. Keep public UI display paths on `displayLocation`; do not expose `originalAddress` in React components.
