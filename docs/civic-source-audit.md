# Civic decision implementation audit — 2026-10-16

Baseline: clean working tree at f08cb1b. Existing pipeline converts 123 CSV files/122 retained resource identities and caps browser records to 150,000 before summaries. Retained index hashes describe API-reserialized CSV, not original provider download bytes. Publication timestamps and verified API pagination completeness were not retained. Never infer completeness from records alone.

Approach: inspect official catalogue; validate retained bytes/schema and source scope; produce fixed monthly district/item cells before record cap, with suppressed small cells and no reconstructing totals. Only explicitly verified complete resources can support priorities. Unknown/partial periods remain descriptive. Preserve source revisions and existing explorer. Pure deterministic engine, lazy bilingual dashboard, capacity sensitivity and privacy-safe briefing. No new dependencies, exact locations or rodent claims.

Baseline first startup failed on sandbox TEMP rename EPERM; project-local node_modules/.tmp resolves this without application code changes.

## Verified source audit outcome

Official network requests succeed when executed with authorized network access; default sandbox requests failed. Catalogue endpoint: `https://data.taipei/api/frontstage/tpeod/dataset.view?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed`. September 2026 is the latest monthly resource observed; resource ID `5b51c017-392f-4ce1-94eb-703e9badb9b8`, source update 2026-10-05. Six originals April–September were staged with immutable resource-ID/content-hash filenames, catalogue byte sizes, source schema and month-period validation. Original addresses remain in ignored private staging only.

Final snapshot audits 129 files / 1,731,307 input rows, with 373,232 duplicate IDs and 2,905 invalid rows excluded. Unknown-district count: 184. Published-cell count sum: 1,039,858 (not total accepted source rows; excludes suppressed cells and unselected topics). Suppressed flags: 2,917 including complementary cells. Snapshot version: `4f5529897a52311ae3b4984c93d624958a7c9180d86fe63e5de8bc1c4dbdf61f`. Verified complete: 2026-04 through 2026-09. Older retained index hashes differ from checkout bytes (possible line-ending transformations; not assumed), so those files remain unauthenticated/unknown. Overlapping legacy rows are audit-only and cannot inflate the verified original monthly population.

The original downloads satisfy complete published monthly-file scope, not a guarantee that all citizen petitions or underlying municipal problems were recorded. No authoritative rodent-specific district/month complaint series was validated. Official rodent-prevention policy is contextual only. New exact-label mapping excludes animal rescue and all unreviewed/corrupted categories.

Disclosure safeguards: fixed month/district/item cells; primary small-cell suppression plus one largest positive complementary cell per affected month, no recoverable category/district marginal totals. Any suppressed cell propagates unavailable metrics through trends, priorities and exports. Source-wide row counts cover a broader population and are not topic marginal totals. Legacy public source/older release linkage is outside the anonymity guarantee. No new raw source bytes are committed.
