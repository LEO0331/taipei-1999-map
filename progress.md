# Session Progress Log

## Current State

**Last Updated:** 2026-07-01 08:56 CST
**Active Feature:** none - stop/resume work module complete

## Status

### What's Done

- [x] Created the Taipei 1999 Vite React app with Leaflet map, dashboard, filters, bilingual UI, PWA files, and data conversion scripts.
- [x] Downloaded and converted Open1999 data into privacy-preserving public JSON.
- [x] Created a minimal agent harness: `AGENTS.md`, `feature_list.json`, `progress.md`, `init.sh`, and `session-handoff.md`.
- [x] Added regression tests for malformed dates, invalid times, address masking, aggregation, and duplicate case IDs.
- [x] Added GitHub Pages workflow and Vite Pages base-path handling.
- [x] Refreshed Taipei Open Data resources and regenerated public JSON.
- [x] Added Taipei streetlight repair ingestion, summary generation, and a district-level Leaflet dashboard module.
- [x] Downloaded official streetlight repair CSV resources and deduplicated them against the user-provided sample CSVs.
- [x] Fixed missing Leaflet base map tiles on GitHub Pages by replacing the failing OSM tile endpoint with CARTO light tiles in both map components.
- [x] Added Taipei City Government construction audit ingestion, summary generation, and a no-map public-works oversight dashboard module.
- [x] Downloaded 17 official quarterly construction audit CSV resources and converted 718 records.
- [x] Added Taipei construction stop/resume work ingestion, summary generation, and a no-map labor-safety oversight dashboard module.
- [x] Downloaded the official stop/resume work CSV and deduplicated it against the uploaded `11005-11504.csv` sample.

### What's In Progress

- [x] Stop/resume work module verification.
  - Details: fetch, convert, tests, builds, and static browser smoke testing passed.
  - Blockers: none.

### What's Next

1. Enable GitHub Pages deployment from Actions in repository settings if it is not already enabled.
2. Commit when ready using the repo Lore Commit Protocol.

## Blockers / Risks

- [ ] GitHub Pages must be enabled in the repository settings for Actions-based Pages deployment.
- [ ] Public JSON is capped to the latest 150,000 sanitized records for browser performance; raw CSVs remain local under `data/raw/open1999/`.
- [ ] Local `npm run dev` currently fails under Node 20.2.0 because Vite expects `crypto.hash`; build/static verification passed. Use Node 22 or a supported Node 20 patch release for the dev server.
- [ ] Streetlight public JSON is large (`public/data/streetlight-repairs.json` is about 56 MB) because it includes historical table rows; the summary JSON is much smaller for dashboard views.
- [ ] Construction audit records are formal audit records, not 1999 complaints, live project status, safety certification, contractor ranking, legal-liability findings, or public-safety warnings.
- [ ] Stop/resume work records are labor-inspection public records, not live construction status, current stop-work/resume status, exact site location, building safety judgment, contractor ranking, legal-liability findings, or public danger warnings.

## Decisions Made

- **Use a dedicated Pages build script for project-relative assets**:
  - Context: GitHub Pages project sites serve assets under `/<repo>/`, while local dev and ordinary hosting should use `/`.
  - Alternatives considered: rely only on `GITHUB_PAGES=true`; rejected because `npm run build:pages` is easier to verify locally and mirrors the workflow command.
- **Render streetlight repairs as district-level service records**:
  - Context: the public dataset has no reliable coordinates and should not imply exact outage locations or real-time status.
  - Alternatives considered: exact markers/geocoding; rejected because it would create misleading precision and extra operational claims.
- **Use CARTO light tiles for Leaflet base maps**:
  - Context: GitHub Pages rendered markers but OSM tile images loaded with zero natural size, leaving a gray map background.
  - Alternatives considered: keep `*.tile.openstreetmap.org`; rejected because the tile endpoint failed while CARTO tiles loaded successfully.
- **Keep construction audits standalone and no-map**:
  - Context: the dataset has no official coordinates, addresses, roads, or reliable shared key with 1999 cases.
  - Alternatives considered: map markers and automatic 1999 joins; rejected because they would imply unsupported location precision or causation.
- **Keep stop/resume work standalone and no-map**:
  - Context: the dataset has no official coordinates, addresses, roads, or reliable shared key with 1999 cases.
  - Alternatives considered: map markers and automatic 1999 joins; rejected because they would imply unsupported current-site status, location precision, or causation.

## Files Modified This Session

- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow.
- `package.json`, `vite.config.ts` - GitHub Pages base path.
- `src/lib/open1999.ts` - invalid time rejection and record deduplication.
- `scripts/convertOpen1999.ts` - duplicate case ID removal before public JSON output.
- `src/App.tsx` - empty dashboard top-group guard.
- `tests/open1999.test.ts` - regression coverage for invalid times and duplicates.
- `AGENTS.md`, `feature_list.json`, `progress.md`, `session-handoff.md`, `init.sh` - agent harness.
- `src/hooks/useOpen1999Data.ts`, `src/main.tsx`, `public/sw.js` - GitHub Pages-safe data and service worker paths.
- `scripts/fetchStreetlightRepairs.ts`, `scripts/convertStreetlightRepairs.ts` - streetlight resource download and JSON conversion.
- `src/lib/streetlight.ts`, `src/types/streetlight.ts`, `src/hooks/useStreetlightData.ts`, `src/components/StreetlightRepairs.tsx` - streetlight parsing, types, data loading, and UI.
- `src/App.tsx`, `src/components/StreetlightRepairs.tsx` - Leaflet tile layer URL and attribution switched to CARTO light tiles.
- `tests/streetlight.test.ts` - streetlight parsing, classification, masking, and deduplication coverage.
- `public/data/streetlight-repairs.json`, `public/data/streetlight-repair-summary.json`, `public/data/service-records-summary.json` - generated streetlight outputs.
- `data/raw/streetlight-repairs/` - user-provided and fetched source CSVs.
- `scripts/fetchPublicWorksConstructionAuditRecords.ts`, `scripts/convertPublicWorksConstructionAuditRecords.ts` - construction audit fetch and conversion.
- `src/lib/constructionAudit.ts`, `src/types/constructionAudit.ts`, `src/hooks/useConstructionAuditData.ts`, `src/components/ConstructionAudits.tsx` - construction audit parsing, types, loading, and UI.
- `tests/constructionAudit.test.ts` - construction audit parser and dedupe coverage.
- `public/data/public-works-construction-audit-records.json`, `public/data/public-works-construction-audit-summary.json`, `public/data/public-works-construction-audit-latest.json`, `public/data/taipei-1999-dashboard-summary.json` - generated construction audit outputs.
- `data/raw/public-works-construction-audit-records/` - fetched construction audit CSV resources.
- `scripts/fetchConstructionStopResumeWorkRecords.ts`, `scripts/convertConstructionStopResumeWorkRecords.ts`, `scripts/buildConstructionStopResumeWorkSummary.ts` - stop/resume work fetch and conversion.
- `src/lib/stopResumeWork.ts`, `src/types/stopResumeWork.ts`, `src/hooks/useStopResumeWorkData.ts`, `src/components/StopResumeWork.tsx` - stop/resume parsing, types, loading, and UI.
- `tests/stopResumeWork.test.ts` - stop/resume parser, duration, classification, and dedupe coverage.
- `public/data/construction-stop-resume-work-records.json`, `public/data/construction-stop-resume-work-summary.json`, `public/data/construction-stop-resume-work-latest.json` - generated stop/resume outputs.
- `data/raw/construction-stop-resume-work-records/` - uploaded and fetched stop/resume CSV resources.

## Evidence of Completion

- [x] Tests pass: `./init.sh` ran `npm test` and passed 12 tests.
- [x] Type check/build clean: `./init.sh` ran `npm run build` and passed.
- [x] GitHub Pages build mode: `npm run build:pages` passed; `dist/index.html` uses `/taipei-1999-map/` paths.
- [x] Data refresh: `npm run fetch:data` completed; generated `150,000` public records from `123` CSV files / `122` upstream resources.
- [x] Pages data path: `dist` contains `dist/data/*.json`; bundled JS fetches `/taipei-1999-map/data/open1999-records.json`.
- [x] Streetlight fetch: `npm run data:fetch:streetlight` downloaded two official CSV resources from Taipei Open Data.
- [x] Streetlight conversion: `npm run data:convert:streetlight` generated `65,022` deduplicated records from four raw CSV files.
- [x] Streetlight tests: `npm test` passed `17` tests across `2` files.
- [x] Production builds: `npm run build` and `npm run build:pages` passed.
- [x] Browser smoke test: static `dist` served locally; streetlight tab rendered 12 district circles, 100 table rows, summary cards, disclaimers, and no console errors or horizontal overflow.
- [x] Map tile fix: static `dist` served locally; 1999 district, 1999 hotspot, and streetlight maps loaded CARTO tile images (`12/12` good tiles) with no console warnings.
- [x] Construction audit fetch: `npm run data:fetch:construction-audits -- --force` downloaded 17 official quarterly resources.
- [x] Construction audit conversion: `npm run data:convert:construction-audits` generated 718 records spanning 2022-01-12 to 2026-03-27.
- [x] Construction audit tests: `npm test` passed 22 tests across 3 files.
- [x] Stop/resume fetch: `npm run data:fetch:stop-resume-work` downloaded the official 1,043-row resource.
- [x] Stop/resume conversion: `npm run data:convert:stop-resume-work` generated 1,043 deduplicated records from 2 raw CSV files.
- [x] Stop/resume tests: `npm test` passed 27 tests across 4 files.

## Notes for Next Session

Use `./init.sh` as the standard startup verification. Keep public UI display paths on `displayLocation`; do not expose `originalAddress` in React components.
For streetlight records, keep maps at district-bubble level unless a future source provides validated coordinates and product language is updated to avoid real-time outage or repair-performance claims.
For construction audit records, keep the module table/chart based unless a future official source provides validated location fields and a reliable key for linking to 1999 cases.
For stop/resume work records, missing resume/review dates are missing source fields only; do not label them as current stop-work status.
