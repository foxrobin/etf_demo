/**
 * 全域設定與常數
 */

/** EtfInfo.do API 預設網址（開發時經 Vite proxy 避開 CORS） */
export const API_URL_DEFAULT = '/InfoPool-ASA/EtfInfo.do';

/** 持股 manifest 單一檔案：{ globalx: { code: filename }, ishares: { code: filename } } */
export const HOLDINGS_MANIFEST_URL = '/holdings_manifest.json';

/** 各發行商持股檔案設定：base、類型（csv|xls|xlsx|mixed）；xls/mixed 若 useCandidateCodes 則用 3/2/9+後三碼、8 開頭五碼對應檔 */
export const HOLDINGS_BY_ISSUER = {
  globalx: { base: '/csv_docs/globalx/', type: 'csv' },
  ishares: { base: '/csv_docs/ishares/', type: 'xls' },
  bosera: { base: '/csv_docs/bosera/', type: 'xlsx' },
  csop: { base: '/csv_docs/csop/', type: 'xls', useCandidateCodes: true },
  chinaamc: { base: '/csv_docs/chinaamc/', type: 'xls', useCandidateCodes: true },
  premia: { base: '/csv_docs/premia/', type: 'xls', useCandidateCodes: true },
  efunds: { base: '/csv_docs/efunds/', type: 'xls', useCandidateCodes: true },
  hangseng: { base: '/csv_docs/hangseng/', type: 'mixed', useCandidateCodes: true },
};

/** 頁面元素 ID */
export const ID = {
  APP: 'app',
  SEARCH: 'search',
  ISSUER_LIST: 'issuer-list',
  DETAIL_TITLE: 'detail-title',
  DETAIL_CONTENT: 'detail-content',
  CODE_SELECT: 'code-select',
};
