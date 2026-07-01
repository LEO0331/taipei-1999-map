# Session Handoff

## Current Objective

- Goal: Add Taipei construction stop / resume work public information as a standalone labor-safety oversight module.
- Current status: Implementation and verification complete.
- Branch / commit: current working tree, not committed in this session.

## Completed This Session

- [x] Added streetlight repair fetch and conversion scripts.
- [x] Copied user-provided CSVs and fetched official Taipei Open Data CSV resources.
- [x] Generated streetlight record, streetlight summary, service-record summary, and conversion-report JSON.
- [x] Added a bilingual district-level streetlight repair dashboard with filters, charts, table, and Leaflet bubbles.
- [x] Added regression tests for streetlight parsing, classification, masking, and deduplication.
- [x] Replaced failing OpenStreetMap tile endpoint with CARTO light tiles in the 1999 and streetlight maps.
- [x] Added construction audit fetch and conversion scripts.
- [x] Downloaded 17 official quarterly construction audit CSV resources.
- [x] Generated construction audit records, summary, latest, dashboard-summary, and conversion-report JSON.
- [x] Added a bilingual no-map construction audit dashboard with filters, summary cards, charts, table, and 1999 relationship note.
- [x] Added regression tests for construction audit date parsing, score bands, amount parsing, district tagging, and deduplication.
- [x] Added stop/resume work fetch and conversion scripts.
- [x] Copied uploaded `11005-11504.csv` and fetched the official Taipei Open Data CSV resource.
- [x] Generated stop/resume records, summary, latest, dashboard-summary, and conversion-report JSON.
- [x] Added a bilingual no-map stop/resume dashboard with filters, summary cards, charts, table, and 1999 relationship note.
- [x] Added regression tests for ROC compact dates, duration calculation, reason/scope categories, missing resume dates, and deduplication.

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| Streetlight fetch | `npm run data:fetch:streetlight` | PASS | Downloaded two official CSV resources. |
| Streetlight conversion | `npm run data:convert:streetlight` | PASS | Generated 65,022 deduplicated records from four CSV files. |
| Regression tests | `npm test` | PASS | 17 tests passed across 2 files. |
| Production build | `npm run build` | PASS | Vite build completed; local Node version warning only. |
| GitHub Pages build mode | `npm run build:pages` | PASS | Pages build completed with copied data files. |
| Static browser smoke test | local static `dist` server | PASS | Streetlight tab rendered 12 district circles, 100 rows, summary cards, and no console errors/overflow. |
| Map tile smoke test | local static `dist` server | PASS | 1999 district, 1999 hotspot, and streetlight maps loaded 12/12 CARTO tile images with no console warnings. |
| Construction audit fetch | `npm run data:fetch:construction-audits -- --force` | PASS | Downloaded 17 official quarterly resources. |
| Construction audit conversion | `npm run data:convert:construction-audits` | PASS | Generated 718 records from 17 CSV files. |
| Construction audit tests | `npm test` | PASS | 22 tests passed across 3 files. |
| Stop/resume fetch | `npm run data:fetch:stop-resume-work` | PASS | Downloaded the official 1,043-row CSV resource. |
| Stop/resume conversion | `npm run data:convert:stop-resume-work` | PASS | Generated 1,043 deduplicated records from uploaded and official CSVs. |
| Stop/resume tests | `npm test` | PASS | 27 tests passed across 4 files. |

## Files Changed

- `README.md`
- `package.json`
- `public/sw.js`
- `public/data/conversion-report.json`
- `public/data/streetlight-repairs.json`
- `public/data/streetlight-repair-summary.json`
- `public/data/service-records-summary.json`
- `public/data/public-works-construction-audit-records.json`
- `public/data/public-works-construction-audit-summary.json`
- `public/data/public-works-construction-audit-latest.json`
- `public/data/taipei-1999-dashboard-summary.json`
- `public/data/construction-stop-resume-work-records.json`
- `public/data/construction-stop-resume-work-summary.json`
- `public/data/construction-stop-resume-work-latest.json`
- `data/raw/streetlight-repairs/`
- `data/raw/public-works-construction-audit-records/`
- `data/raw/construction-stop-resume-work-records/`
- `scripts/fetchStreetlightRepairs.ts`
- `scripts/convertStreetlightRepairs.ts`
- `scripts/fetchPublicWorksConstructionAuditRecords.ts`
- `scripts/convertPublicWorksConstructionAuditRecords.ts`
- `scripts/fetchConstructionStopResumeWorkRecords.ts`
- `scripts/convertConstructionStopResumeWorkRecords.ts`
- `scripts/buildConstructionStopResumeWorkSummary.ts`
- `src/App.tsx`
- `src/lib/i18n.ts`
- `src/lib/streetlight.ts`
- `src/lib/constructionAudit.ts`
- `src/lib/stopResumeWork.ts`
- `src/types/streetlight.ts`
- `src/types/constructionAudit.ts`
- `src/types/stopResumeWork.ts`
- `src/hooks/useStreetlightData.ts`
- `src/hooks/useConstructionAuditData.ts`
- `src/hooks/useStopResumeWorkData.ts`
- `src/components/StreetlightRepairs.tsx`
- `src/components/ConstructionAudits.tsx`
- `src/components/StopResumeWork.tsx`
- `tests/streetlight.test.ts`
- `tests/constructionAudit.test.ts`
- `tests/stopResumeWork.test.ts`
- `feature_list.json`
- `progress.md`
- `session-handoff.md`

## Decisions Made

- Keep streetlight maps district-level only; the dataset does not provide reliable coordinates.
- Keep product language historical and descriptive; do not imply real-time outage status or repair-performance metrics.
- Let `convertStreetlightRepairs.ts` emit the record JSON, streetlight summary, combined service summary, and conversion report in one pass.
- Use CARTO light tiles for the Leaflet base layer because the previous OSM tile endpoint produced marker-only gray maps on GitHub Pages.
- Keep construction audit records standalone and table/chart based; no map markers and no automatic join to 1999 cases without a reliable shared key.
- Let `convertPublicWorksConstructionAuditRecords.ts` emit records, summary, latest, dashboard-summary, and conversion report in one pass.
- Keep stop/resume work records standalone and table/chart based; no map markers and no automatic join to 1999 cases without a reliable shared key.
- Missing resume/review dates are missing source fields only; do not label them as currently stopped.
- Let `convertConstructionStopResumeWorkRecords.ts` emit records, summary, latest, dashboard-summary, and conversion report in one pass.

## Blockers / Risks

- Local `npm run dev` fails under Node 20.2.0 because Vite expects `crypto.hash`; static build verification passed. Use Node 22 or a supported Node 20 patch release for dev-server work.
- `public/data/streetlight-repairs.json` is about 56 MB. Dashboard summary data is small, but the full table payload remains large.
- Construction audit records are not live progress, project completion status, safety certification, contractor ranking, legal-liability findings, procurement-fraud evidence, or public-safety warnings.
- Stop/resume work records are not live construction status, current stop-work/resume status, exact site location, building safety judgment, contractor ranking, legal-liability findings, or public danger warnings.

## Next Session Startup

1. Read `AGENTS.md`.
2. Read `feature_list.json` and `progress.md`.
3. Review this handoff.
4. Run `./init.sh`.

## Recommended Next Step

- Commit the stop/resume work module when ready.
