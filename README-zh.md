# 台北 1999 派工地圖

[English README](README.md)

這是一個以手機優先設計的雙語 Vite、React、TypeScript 應用程式，用於探索臺北市政府 1999 派工案件、路燈維修資料、公共工程施工查核資料，以及施工停工／復工公開資訊。

本應用程式依時間、行政區、服務類型與保護隱私的位置資訊呈現歷史公共服務資料。畫面中的數量代表資料列或紀錄數，不代表問題嚴重程度、已確認危害、目前狀況或即時狀態。

## 資料來源

- 臺北市政府 1999 派工資料 — [臺北市政府資料開放平台](https://data.taipei/dataset/detail?id=b796f87a-0ed8-4e57-89f6-225a4941b1ed)
  - 本地種子檔：`data/raw/open1999/OPEN1999_202604.csv`
  - 資源 API 格式：`https://data.taipei/api/v1/dataset/{RESOURCE_ID}?scope=resourceAquire`
- 臺北市路燈維修資料 — [臺北市政府資料開放平台](https://data.taipei/dataset/detail?id=0219b559-c9e4-4efe-93f0-9961360bd7bf)
  - 本地樣本：`路燈維修資料-2021~2023t.csv`、`路燈維修資料-2024t.csv`
- 臺北市政府公共工程施工查核資料 — [臺北市政府資料開放平台](https://data.taipei/dataset/detail?id=a8104214-5416-48d3-8006-c22c18a90283)
- 臺北市停復工公開資訊 — [臺北市政府資料開放平台](https://data.taipei/dataset/detail?id=49802349-ad4e-4551-be78-668e247f4d16)
  - 本地樣本：`11005-11504.csv`

原始 CSV 檔案保留在 `data/raw/`，由資料轉換腳本處理。

## 隱私與資料處理

來源資料沒有可靠的緯度與經度。許多地址包含住宅細節，因此公開介面預設不顯示完整原始地址。

資料轉換程式會：

- 擷取臺北市行政區名稱；
- 在可行時推導較概略的道路或路口文字；
- 從公開顯示位置移除門牌號碼、樓層與私人門牌細節；
- 以行政區圓點與彙整後的熱點摘要取代精確案件標記；以及
- 從 `public/data/open1999-records.json` 移除 `originalAddress`。

路燈資料以行政區圓點、依文字描述衍生的故障摘要、遮蔽後地點與分頁清單呈現，不宣稱精確故障位置、即時停電狀態、維修績效或道路安全程度。

施工查核與停復工資料沒有可靠的官方地圖位置，相關模組以表格與圖表呈現，不建立地圖標記，也不自動將資料列連結至 1999 案件。

## 開始使用

安裝相依套件並執行標準檢查：

```bash
npm install
npm test
npm run build
```

執行專案啟動檢查：

```bash
# Bash
./init.sh

# Windows PowerShell
./init.ps1
```

使用 `npm run dev` 啟動開發伺服器。目前專案的 Vite 開發伺服器需要 Node 22，或相容的 Node 20 最新修補版本。

## 資料指令

轉換本地 1999 資料：

```bash
npm run convert:data
```

抓取臺北市政府資料開放平台資源、寫入 `resource-index.json`，再重新轉換：

```bash
npm run fetch:data
```

抓取並轉換路燈維修資料：

```bash
npm run data:fetch:streetlight
npm run data:convert:streetlight
```

抓取並轉換施工查核資料：

```bash
npm run data:fetch:construction-audits
npm run data:convert:construction-audits
npm run data:summary:construction-audits
```

抓取並轉換停復工資料：

```bash
npm run data:fetch:stop-resume-work
npm run data:convert:stop-resume-work
npm run data:summary:stop-resume-work
```

為了瀏覽器效能，公開 1999 資料預設限制為最新 150,000 筆已清理紀錄。可使用 `OPEN1999_PUBLIC_RECORD_LIMIT` 調整上限；只有私人或離線分析才應使用 `0`。

## 應用程式模組

- 預設介面語言為繁體中文，並提供可保存設定的英文切換。
- 1999 模組提供行政區地圖、彙整熱點地圖、儀表板、篩選器與案件清單。
- 路燈維修模組提供行政區圓點、年度／行政區／故障類型篩選器、衍生故障圖表、遮蔽地點紀錄與歷史資料說明。
- 施工查核模組提供篩選器、摘要卡片、圖表與可搜尋的查核清冊，不建立地圖標記。
- 停復工模組提供篩選器、停工原因／範圍摘要、缺少日期統計與可搜尋的工程清冊，不建立地圖標記。
- PWA manifest 與 service worker 會快取應用程式外殼及產生的 JSON 檔案。
- service worker 會淘汰舊快取，優先從網路更新應用程式與資料，離線時再使用快取；新版本 worker 啟用後，受控制的視窗會自動重新載入一次。

## 地圖圖磚

地圖使用官方 OpenStreetMap 柵格圖磚服務：

`https://tile.openstreetmap.org/{z}/{x}/{y}.png`

地圖上必須保留清楚可見的 OpenStreetMap 貢獻者標示。圖磚僅供一般互動瀏覽使用，並請遵守 [OpenStreetMap 圖磚使用政策](https://operations.osmfoundation.org/policies/tiles/)。

## 正式建置與 GitHub Pages

使用 `npm run build` 建置一般正式版本。若要建置專案網站版本：

```bash
npm run build:pages
```

GitHub Pages 工作流程位於 `.github/workflows/deploy-pages.yml`，會在推送至 `main` 或手動執行時建置與部署。

## 產生的公開資料

資料轉換程式會在 `public/data/` 寫入產生檔案，包括已清理的 1999 案件與摘要、路燈維修資料與摘要、施工查核資料與摘要、停復工資料與摘要、服務摘要及轉換報告。

## 重要限制

- 除非未來加入建置時的匿名化地理編碼快取，地圖座標都是行政區中心點。
- 熱點依遮蔽後的行政區與概略道路／地點文字彙整。
- 啟用資料筆數上限時，儀表板數量只反映產生的公開 JSON 子集，不一定包含所有原始資料列。
- 正式資料與欄位定義應以臺北市政府資料開放平台為準。
- 路燈故障類型由文字描述衍生，並非官方分類。
- 路燈資料是歷史資料，不代表即時停電、維修完成、維修績效或道路安全。
- 施工查核資料不是 1999 陳情、即時施工進度、工程完成狀態、安全認證、廠商排名、法律責任認定、採購舞弊證據或公共安全警示。
- 停復工資料不是 1999 陳情、即時施工狀態、目前停工／復工狀態、工地精確位置、建物安全判定、廠商排名、法律責任認定或公共危險警示。
