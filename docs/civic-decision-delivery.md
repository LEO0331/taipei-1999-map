# Civic Decision Support v1.0 delivery evidence

Branch: `codex/civic-decision-v1`. Repository: `LEO0331/taipei-1999-map` only. No automatic merge.

## Delivered

Lazy bilingual navigation module; official-source audit and immutable private acquisition; fixed monthly district/item aggregates before the explorer cap; exact-label mapping for five disjoint service topics; explainable A/B/C/insufficient-evidence engine; editable rules; capacity; fixed-population sensitivity; manager briefing JSON/CSV; CSV formula protection; disclosure suppression and conservative fallback; nested-asset PWA fingerprinting. No new packages or backend.

Changed areas: `src/components/CivicDecisionDashboard.tsx`, `src/styles/civicDecision.css`, `src/App.tsx`; `src/types/civicDecision.ts`, `src/lib/civicCategoryMapping.ts`, `src/lib/civicDecision.ts`, `src/lib/civicScenario.ts`; `scripts/auditOpen1999Coverage.ts`, `scripts/buildCivicDecisionSnapshot.ts`, `scripts/buildRecordPartitions.ts`; `src/lib/dataCache.ts`; `public/data/civic-decision/snapshot.json`; civic and data-cache tests; package scripts, ignore rules, READMEs, feature/progress/handoff and methodology documents.

Simplifications: reused existing request cache, language setting and static Vite architecture. New module takes one aggregate snapshot rather than duplicating record loading, routing, geocoding or analytics dependencies. Monthly zero cells are explicit; missing periods are never silently converted to zero.

## Actual source and period

Official Taipei City Government 1999 dispatch dataset: https://data.taipei/dataset/detail?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed . Catalogue observed latest September 2026, modified October 5. Six complete published original resources verified April–September 2026; their IDs, URLs, original SHA256, publication/retrieval/processing timestamps, schemas and counts are in the snapshot. Historical coverage July 2015–September 2026 is audited, with older source integrity/completeness unverified. Completeness means the published monthly file, not all citizen petitions.

129 audited source files; 1,731,307 input rows; 373,232 duplicate IDs; 2,905 invalid rows; 184 unknown-district records. 1,039,858 is the sum of publishable mapped cells, excluding suppressed cells, unknown geography and other categories. 2,917 suppression flags include primary, complementary and fully coarsened sparse months. Snapshot version `4f5529897a52311ae3b4984c93d624958a7c9180d86fe63e5de8bc1c4dbdf61f`.

## Reproducible real scenario

Select pollution-related dispatch (`environment_pollution`), all districts and mapped items. Previous = April, May, June 2026; recent = July, August, September 2026. Thresholds 10 recent / 2 active months / 5 baseline / 25% growth; capacity 5.

| Rank | District | Tier | Recent | Previous | Change | Growth |
|---|---|---|---|---|---|---|
| 1 | 松山區 | A | 289 | 201 | +88 | 43.8% |
| 2 | 文山區 | A | 217 | 144 | +73 | 50.7% |
| 3 | 南港區 | A | 167 | 126 | +41 | 32.5% |
| 4 | 信義區 | B | 287 | 231 | +56 | 24.2% |
| 5 | 中山區 | B | 374 | 333 | +41 | 12.3% |

12 eligible, 5 shortlisted, 1,334 dispatches represented across 5 districts, zero excluded in this topic. Capacity 10 represents 2,608 records. Less restrictive 8/1/4/20 assumptions include 士林 and exclude 中山 from the five-slot list. These are historical recorded-service patterns, not measured harms or statistical significance.

The real snapshot regression test `tests/civicSnapshot.test.ts` reproduces the exact input and output. It also verifies unknown historical months cannot produce a shortlist. On refresh, update this evidence intentionally after source review.

## Verification

- Startup baseline: 58 existing tests and production build passed. First sandbox TEMP rename failed; project-local TEMP/TMP fixed execution.
- Exact lockfile install: `npm ci` passed (105 packages); no dependency changes.
- Final `./init.ps1`: 96 tests / 16 files pass; TypeScript and production Vite build pass.
- `npm run build:pages`: passes; separate civic JavaScript/CSS chunks, actual Pages base paths.
- `git diff --check`: passes (line-ending notices only).
- New ETL tests include duplicate IDs, malformed dates, source revision/schema drift, whole-month contract, missing months, empty input, immutable original-vs-retained source isolation, last-known-good preservation, and complementary/sparse-only coarsening.
- Decision tests cover tiers, zero denominator, negatives, persistence, custom thresholds, deterministic ordering/capacity/sensitivity, version mismatches and privacy/export validation.
- Browser: Chinese/English, real default metrics, district filter, capacity 5→10, JSON and CSV downloads, responsive 390×844 viewport with no document horizontal overflow. Initial and refined screenshots inspected through in-app browser; no external reference image was supplied, so no similarity score is claimed.

## Limitations and excluded features

No authoritative rodent-specific complaint/inspection series was validated. Rodent counts, hotspots, health-risk scores, named businesses, individual locations, assignments and intervention-effect estimates remain unavailable. Exact official dispatch labels are mapped to waste/sanitation, pollution, noise, road maintenance and drainage; unknown/corrupted and out-of-scope labels are excluded. Historical label consistency is not assumed merely because a source contains records.

Small-cell threshold five is an analytical default, not a legal anonymity guarantee. Complementary suppression deliberately excludes some otherwise large candidate groups. Source/older-release linkage can still weaken anonymity. Raw legacy files already tracked by this repository predate this feature; newly downloaded raw files are ignored and are not part of this delivery.

`npm audit` reports one existing high-severity transitive `source-map-js` finding (GHSA-68fv-2mgg-jv7q); lockfile remediation is outside this feature and was not applied automatically. No separate lint script exists; TypeScript build is the configured static check. Actual deployment network performance and end-user offline upgrades were not measured; worker/cache regression tests pass.

Next work: attest historical originals and classification changes, review the existing dependency finding, evaluate matched-season comparisons and lawful authoritative pest-control evidence. Keep other repositories and portfolio unchanged.
