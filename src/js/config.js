/**
 * 全域設定與常數
 */

/** EtfInfo.do API 預設網址（開發時經 Vite proxy 避開 CORS） */
export const API_URL_DEFAULT = '/InfoPool-ASA/EtfInfo.do';

/**
 * 持股資料（後端 lambda / api_server POST /lambda）。
 * 開發預設 `/lambda`，請配合 vite proxy 指向本機 api_server；部署請設 VITE_HOLDINGS_API_URL。
 */
export const HOLDINGS_API_URL = (import.meta.env.VITE_HOLDINGS_API_URL ?? '/lambda').trim();

/**
 * 設為 true（在 .env 設 VITE_HOLDINGS_USE_STATIC=1）時：Global X 只讀靜態檔，不呼叫 API／無需 api_server。
 * 資料請先執行 npm run snapshot:globalx 更新 public/globalx_holdings_snapshot.json。
 */
export const HOLDINGS_USE_STATIC_ONLY = import.meta.env.VITE_HOLDINGS_USE_STATIC === '1';

/** Global X 靜態持股快照（由 scripts/export_globalx_snapshot.py 產生） */
export const HOLDINGS_STATIC_SNAPSHOT_URL = (
  import.meta.env.VITE_HOLDINGS_STATIC_SNAPSHOT_URL ?? '/globalx_holdings_snapshot.json'
).trim();

/** Global X：代碼 → 基金頁 URL（取代昔日 csv_docs manifest） */
export const GLOBALX_CODE_URLS_JSON = '/globalx_code_urls.json';

/** 頁面元素 ID */
export const ID = {
  APP: 'app',
  SEARCH: 'search',
  ISSUER_LIST: 'issuer-list',
  DETAIL_TITLE: 'detail-title',
  DETAIL_CONTENT: 'detail-content',
  CODE_SELECT: 'code-select',
};
