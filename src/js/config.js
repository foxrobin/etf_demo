/**
 * 全域設定與常數
 */

/** EtfInfo.do API 預設網址（開發時經 Vite proxy 避開 CORS） */
export const API_URL_DEFAULT = '/InfoPool-ASA/EtfInfo.do';

/** 持股 CSV 根路徑（檔名由 manifest 或 {code}_full_holdings.csv 決定） */
export const HOLDINGS_CSV_BASE = '/csv_docs/globalx/';

/** 頁面元素 ID */
export const ID = {
  APP: 'app',
  SEARCH: 'search',
  ISSUER_LIST: 'issuer-list',
  DETAIL_TITLE: 'detail-title',
  DETAIL_CONTENT: 'detail-content',
  CODE_SELECT: 'code-select',
};
