# Taipei 1999 Service Request Map

[繁體中文說明](README-zh.md)

A mobile-first bilingual Vite, React, and TypeScript application for exploring Taipei City Government 1999 dispatched service requests, streetlight repairs, public-works construction audits, and construction stop/resume work records.

The application presents historical public-service records by time, district, service type, and privacy-preserving location. Counts represent recorded rows; they do not represent severity, confirmed hazards, current conditions, or real-time status.

## Data sources

- Taipei City Government 1999 dispatch data — [Taipei Open Data](https://data.taipei/dataset/detail?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed)
  - Local seed: `data/raw/open1999/OPEN1999_202604.csv`
  - Resource API pattern: `https://data.taipei/api/v1/dataset/{RESOURCE_ID}?scope=resourceAquire`
- Taipei streetlight repair data — [Taipei Open Data](https://data.taipei/dataset/detail?id=0219b559-c9e4-4efe-93f0-9961360bd7bf)
  - Local samples: `路燈維修資料-2021~2023t.csv`, `路燈維修資料-2024t.csv`
- Taipei public-works construction audit records — [Taipei Open Data](https://data.taipei/dataset/detail?id=a8104214-5416-48d3-8006-c22c18a90283)
- Taipei construction stop/resume work public information — [Taipei Open Data](https://data.taipei/dataset/detail?id=49802349-ad4e-4551-be78-668e247f4d16)
  - Local sample: `11005-11504.csv`

Raw CSV files remain local under `data/raw/` and are used by the conversion scripts.

## Privacy and data handling

The source records do not provide reliable latitude and longitude. Many addresses include residential detail, so the public UI does not show full original addresses.

The converters:

- extract Taipei district names;
- derive broad road or intersection text where possible;
- remove house numbers, floors, and private doorplate details from public display locations;
- publish district bubbles and aggregated hotspot summaries instead of exact record markers; and
- remove `originalAddress` from `public/data/open1999-records.json`.

Streetlight records are shown with district-level bubbles, derived issue summaries, masked locations, and a paged table. They do not claim exact issue locations, real-time outage status, repair performance, or road-safety level.

Construction audit and stop/resume work records have no reliable official map locations. Their modules are table/chart based and do not create map markers or automatically link rows to 1999 cases.

## Getting started

Install dependencies and run the standard checks:

```bash
npm install
npm test
npm run build
```

For the project startup harness:

```bash
# Bash
./init.sh

# Windows PowerShell
./init.ps1
```

Start the development server with `npm run dev`. The current project requires Node 22 or a supported Node 20 patch release for Vite development-server work.

## Data commands

Convert local 1999 records:

```bash
npm run convert:data
```

Fetch Taipei Open Data resources, write `resource-index.json`, and reconvert:

```bash
npm run fetch:data
```

Fetch and convert streetlight repairs:

```bash
npm run data:fetch:streetlight
npm run data:convert:streetlight
```

Fetch and convert construction audits:

```bash
npm run data:fetch:construction-audits
npm run data:convert:construction-audits
npm run data:summary:construction-audits
```

Fetch and convert stop/resume work records:

```bash
npm run data:fetch:stop-resume-work
npm run data:convert:stop-resume-work
npm run data:summary:stop-resume-work
```

The public 1999 dataset is capped at the latest 150,000 sanitized records by default for browser performance. Change the cap with `OPEN1999_PUBLIC_RECORD_LIMIT`; use `0` only for private/offline analysis.

## Application modules

- Traditional Chinese is the default UI language, with a persisted English toggle.
- The 1999 module provides district and aggregated hotspot maps, dashboards, filters, and a record list.
- The streetlight module provides district bubbles, year/district/issue filters, derived issue charts, masked-location records, and historical-data disclaimers.
- The construction-audit module provides filters, summary cards, charts, and a searchable audit directory without map markers.
- The stop/resume module provides filters, reason/scope summaries, missing-date counts, and a searchable project directory without map markers.
- A PWA manifest and service worker cache the application shell and generated JSON files.
- Application assets refresh from the network first, with an offline cache fallback. Deployment-versioned data uses cache-first delivery; changed data or generated output changes the version and invalidates older caches. Existing controlled windows reload when a new worker activates; first installation does not reload the page.

## Loading performance

The 1999 and streetlight modules initially load complete aggregate summaries and the same first 300 / 100 table records shown previously. They do not download the full record datasets until a filter needs them. Date or year filters load only the matching year partitions; filters spanning every year still load the full public dataset. Summary counts always describe the complete selected data, not the preview rows.

Parsed JSON, in-flight downloads, and assembled year selections are reused across tabs. The 1999 module runs independently of the app shell, so switching to another module does not recalculate its filters and summaries. Construction audit and stop/resume summaries appear independently of their detail downloads. Loading failures offer a retry, and filtered aggregates stay hidden until the selected records are ready.

Vite generates compact yearly partitions, manifests, and previews under `dist/data/` during both production builds. The development server serves the same generated paths. Source datasets stay under `public/data/`; rerun the normal build after refreshing them. No backend or additional dependencies are required.

## Map tiles

Maps use the official OpenStreetMap raster tile endpoint:

`https://tile.openstreetmap.org/{z}/{x}/{y}.png`

The visible OpenStreetMap contributor attribution must remain on the map. Use the tiles only for normal interactive viewing and follow the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/).

## Production and GitHub Pages

Build the normal production bundle with `npm run build`. Build the project-site bundle with:

```bash
npm run build:pages
```

The GitHub Pages workflow is defined in `.github/workflows/deploy-pages.yml` and runs on pushes to `main` or manual dispatches.

## Generated public data

Converters write generated files under `public/data/`, including sanitized 1999 records and summaries, streetlight repair records and summaries, construction-audit records and summaries, stop/resume records and summaries, service summaries, and conversion reports.

## Important limitations

- Map coordinates are district centroids unless a future build-time anonymized geocode cache is added.
- Hotspots are aggregated by masked district and broad road/location text.
- Dashboard counts reflect the generated public JSON slice and may not include every raw row when a record cap is enabled.
- Official records and field definitions should be checked against Taipei Open Data.
- Streetlight issue types are derived from text descriptions, not official categories.
- Streetlight records are historical and do not represent real-time outages, repair completion, repair performance, or road safety.
- Construction audit records are not 1999 complaints, live construction progress, completion status, safety certification, contractor rankings, legal-liability findings, procurement-fraud evidence, or public-safety warnings.
- Stop/resume records are not 1999 complaints, live construction status, current stop-work/resume status, exact site locations, building-safety judgments, contractor rankings, legal-liability findings, or public-danger warnings.
