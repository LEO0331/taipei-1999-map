# Civic investigation methodology

Method identifier: `civic-investigation-priority-v1`. This is an independent historical dispatch-pattern investigation shortlist, with illustrative adjustable assumptions, not an operational order or hazard ranking.

## Reproduce

Use Node supported by the existing Vite project. Install the exact lockfile with `npm ci`. Run `npm run data:build:civic -- --refresh` with official-source network access to stage immutable original monthly files, or `npm run data:build:civic` against retained private files. Run `npm run data:audit:civic` for source audit. No raw staging data belongs in a commit. Generated `public/data/civic-decision/` is aggregate-only. Run `./init.ps1` (or `./init.sh`), `npm run build:pages`, and `git diff --check`.

On restricted Windows sandboxes, set TEMP and TMP to an existing project-local `node_modules/.tmp` directory before checks; the default sandbox TEMP may reject Vitest atomic rename. This does not change product behavior.

## Source provenance

Dataset: https://data.taipei/dataset/detail?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed . Core fields are case identifier, official dispatch item, address, creation date and time. These do not establish current status, severity, health hazard, resolution, unique complainants or population incidence.

Keep provider publication/update, retrieval, processing and snapshot generation distinct. Hash retained bytes; an old reserialized API CSV hash is not an original-download hash (`originalSha256` stays null). The authoritative catalogue's monthly resource scope plus full download/schema/period validation establishes a complete source month; observation on the first and last days alone does not. Unknown historical coverage remains unknown. Missing resources are not zero. Resource revisions are staged under new content identities. Source records are parsed one file at a time; only compact duplicate keys and aggregate cells remain across files.

The latest observed catalogue resource at the 2026-10-16 audit is September 2026 (updated October 5). Do not hardcode this date into future refresh behavior. Use generated metadata as authority. An inaccessible source must not silently extend supported dates.

## Comparison semantics

Default: latest six contiguous verified complete months, split into previous three and recent three. Never bridge a missing/partial/unknown month. If insufficient, retain a descriptive/insufficient result, no priority claim. Selected periods must be nonempty, equal-length, ordered, adjacent, contiguous and nonoverlapping; all months and required cells must exist and be complete. Item mappings must match the snapshot mapping version. An absent cell is not an implicit zero. Any suppressed selected cell withholds all candidate metrics.

For each district/topic: sum disjoint selected item cells to recent and previous counts; monthly rate = recent / recent month count; absolute change = recent - previous; relative change = absolute / previous × 100 only when previous > 0; activity = number of recent months with positive relevant counts. With no valid activity in either period, evidence is insufficient. No significance or intervention-effect model is applied.

## Priority rules

Defaults per three months: recent count ≥ 10, active months ≥ 2, previous count ≥ 5, relative growth ≥ 25%. A requires all four. B requires (volume AND persistence) OR (positive eligible baseline AND growth), excluding A. C covers valid remaining observations. Insufficient evidence is excluded from capacity ranking. Zero baseline has unavailable percent growth; it may qualify B via volume and persistence only. Decreasing patterns can still be B if persistent volume warrants routine review.

For n-month equal periods, count thresholds scale by n/3; minimum active months = ceil(configured active months × n/3). This extension is an explicit analytical assumption, not an official threshold. Reset restores 10/2/5/25. Thresholds cannot be negative/nonfinite; active-month default basis is restricted to 0–3. Capacity is a nonnegative integer or null for unlimited.

Sort A, B, C, then insufficient; within tiers use descending absolute increase, monthly rate, activity months, then stable district and topic string identifiers. Unavailable values rank after verified values. C is an eligible monitoring candidate and can appear when capacity remains after A/B.

## Sensitivity

Hold snapshot identity/version, mapping, period, district, topic and item fixed. Baseline is the configured analyst scenario. Compare default thresholds, 80% volume/baseline/growth thresholds with one fewer persistent month, 120% thresholds with one more persistent month (bounded 0–3), and capacities 5 and 10. Record before/after tiers, shortlist ranks, inclusion/exclusion and explanations. No evidence means empty lists, not invented effects.

## Classification

`src/lib/civicCategoryMapping.ts` is the exact versioned mapping source. Items belong to one topic only, preventing double counting. Preserve original official item labels. Unrecognized or corrupted variants are excluded and audited; do not use broad keyword inference. Waste collection is a service request, pollution is broad dispatch terminology, noise is recorded dispatch activity. None is confirmed rodent infestation or illegal dumping. No rodent-specific authoritative case series was validated for this release.

## Disclosure and exports

Publish fixed monthly district/item cells only, with 1–4 hidden as null. Candidate sums/rates/deltas and temporal rollups propagate null. No arbitrary location slicing, exact pins, case IDs or original addresses. Do not publish overlapping category/district totals that recover hidden values. Source-wide row counts concern broader source populations, not selected topic totals. Disclosure threshold five is not a universal legal safe harbor; public source linkage and cross-release differencing remain limitations.

Briefing JSON recomputes the scenario from the validated snapshot and whitelists aggregate metadata; includes source statuses, assumptions, exclusions and questions for agency/field review. CSV quotes fields and guards formula prefixes. Capacity measures investigation groups only; represented records are disjoint recorded rows, not unique people or resolved issues.

## Context and future evidence contract

The [municipal rodent-prevention policy](https://www.gov.taipei/News_Content.aspx?n=F0DDAF49B89E9413&s=110037E83F097031) supports cross-agency context only. Future sanitation, markets, inspections or pest-control sources need lawful use, explicit terminology, period completeness, district granularity, mapping version and privacy review. Do not infer business fault, join at case level, or call other portfolio apps as data APIs.
