# Taipei 1999 Service Request Map / 台北1999派工地圖

Mobile-first bilingual Vite + React + TypeScript + Leaflet app for exploring Taipei City Government 1999 dispatched service request records.

The app presents historical public-service request records by time, district, service type, and anonymized location. Counts are recorded requests, not severity, confirmed hazards, or real-time status.

## Data Source

- Dataset: `臺北市政府1999派工資料`
- Taipei Open Data page: <https://data.taipei/dataset/detail?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed>
- Known API resource pattern: `https://data.taipei/api/v1/dataset/{RESOURCE_ID}?scope=resourceAquire`
- Seed file used locally: `data/raw/open1999/OPEN1999_202604.csv`

## Data Privacy

Source records do not include latitude or longitude. Many addresses include residential detail, so the public UI does not show full original addresses by default.

The converter:

- extracts Taipei district names
- extracts broad road or intersection-level text where possible
- removes house numbers, floor details, and private doorplate detail from public display locations
- publishes district bubbles and aggregated hotspot summaries instead of exact record markers
- strips `originalAddress` from `public/data/open1999-records.json`

Raw CSV files remain local under `data/raw/open1999/` for processing.

## Commands

Install dependencies:

```bash
npm install
```

Convert local raw CSV files:

```bash
npm run convert:data
```

Fetch Taipei Open Data resources into `data/raw/open1999/`, write `resource-index.json`, then reconvert:

```bash
npm run fetch:data
```

Start the dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build for production:

```bash
npm run build
```

## Generated Public Data

The converter writes:

- `public/data/open1999-records.json`
- `public/data/open1999-district-summary.json`
- `public/data/open1999-category-summary.json`
- `public/data/open1999-hotspots.json`
- `public/data/open1999-time-summary.json`
- `public/data/conversion-report.json`

For mobile performance, `open1999-records.json` is capped to the latest 150,000 sanitized records by default. All downloaded raw CSV resources are retained locally. To change the cap:

```bash
OPEN1999_PUBLIC_RECORD_LIMIT=50000 npm run convert:data
```

Use `OPEN1999_PUBLIC_RECORD_LIMIT=0` only for private/offline analysis; a full historical public records JSON may be too large for browsers.

## App Features

- Traditional Chinese default UI with persisted English toggle
- district bubble map using fixed Taipei district centroids
- aggregated road/location hotspot map
- dashboard cards and charts for day, hour, district, service group, dispatch item, and weekday/weekend views
- filters for date range, district, service group, dispatch item, time period, weekday/weekend, and search
- PWA manifest and service worker cache for the app shell and generated JSON files

## Limitations

- Coordinates are district centroids unless a future build-time anonymized geocode cache is added.
- Hotspots are aggregated by masked district and road/location text.
- Dashboard counts reflect the generated public JSON slice, not necessarily every raw row when the public record cap is enabled.
- Official records and field definitions should be checked against Taipei Open Data.
