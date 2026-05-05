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

/** Global X：代碼 → 基金頁 URL（取代昔日 csv_docs manifest） */
export const GLOBALX_CODE_URLS_JSON = '/globalx_code_urls.json';
/** CSOP：代碼 → 基金頁 URL */
export const CSOP_CODE_URLS_JSON = '/csop_code_urls.json';

/** 頁面元素 ID */
export const ID = {
  APP: 'app',
  SEARCH: 'search',
  ISSUER_LIST: 'issuer-list',
  DETAIL_TITLE: 'detail-title',
  DETAIL_CONTENT: 'detail-content',
  CODE_SELECT: 'code-select',
};
