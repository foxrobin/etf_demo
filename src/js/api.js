/**
 * ETF 資訊 API（EtfInfo.do）
 */

import { API_URL_DEFAULT } from './config.js';

/** 依代碼快取的 ETF 詳情 */
const etfDetailByCode = {};

let statusState = { text: '', isError: false, loading: false };

/**
 * 取得 API 網址（固定使用預設）
 * @returns {string}
 */
export function getApiUrl() {
  return API_URL_DEFAULT;
}

/**
 * 更新狀態（供 UI 判斷載入中／錯誤，無 DOM 顯示）
 * @param {string} text
 * @param {boolean} [isError=false]
 * @param {boolean} [loading=false]
 */
export function setStatus(text, isError = false, loading = false) {
  statusState = { text, isError, loading };
}

/**
 * 取得目前狀態（供 UI 判斷是否載入中）
 * @returns {{ text: string, isError: boolean, loading: boolean }}
 */
export function getStatus() {
  return statusState;
}

/**
 * 取得已快取的 ETF 詳情
 * @param {string} code
 * @returns {object | undefined}
 */
export function getCachedDetail(code) {
  return etfDetailByCode[code];
}

/**
 * 組出 EtfInfo.do 的 POST body（與 EtfInfoTestPage 表單一致）
 * @param {string} code - ETF 代碼
 * @returns {string} application/x-www-form-urlencoded
 */
function buildEtfInfoPayload(code) {
  const params = new URLSearchParams();
  params.set('reqid', '910j');
  params.set('companycd', '');
  params.set('mpid', '');
  params.set('counter', '');
  params.set('code', String(code));
  params.set('nametchi', '');
  params.set('nameschi', '');
  params.set('nameeng', '');
  params.set('categorytchi', '');
  params.set('categoryschi', '');
  params.set('categoryeng', '');
  params.set('listingdate', '');
  params.set('listingdatefrom', '');
  params.set('listingdateto', '');
  params.set('ulyassettchi', '');
  params.set('ulyassetschi', '');
  params.set('ulyasseteng', '');
  params.set('nameshorttchi', '');
  params.set('nameshortschi', '');
  params.set('nameshorteng', '');
  params.set('categoryid', '');
  params.set('categoryorder', '');
  params.set('isinverse', '');
  params.set('assetclasscd', '');
  params.set('geofocuscd', '');
  params.set('industrycd', '');
  params.set('investfocuscd', '');
  params.set('replicatemethodcd', '');
  params.set('strategycd', '');
  params.set('field', '');
  params.set('orderby', '');
  params.set('distinct', '');
  params.set('limitno', '20');
  params.set('limitfrom', '');
  return params.toString();
}

/**
 * 從回應文字解析出 JSON（伺服器可能回 content-type: text/html 但內容為 JSON）
 * @param {string} text
 * @returns {unknown}
 */
function parseResponseJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
    if (arrayMatch) return JSON.parse(arrayMatch[0]);
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) return JSON.parse(objectMatch[0]);
    throw new Error('無法解析回應為 JSON');
  }
}

/**
 * 依代碼向 EtfInfo.do 取得 ETF 資料（POST，表單與 EtfInfoTestPage 一致）
 * @param {string} code - ETF 代碼
 * @returns {Promise<object | null>}
 */
export function fetchEtfByCode(code) {
  if (etfDetailByCode[code]) {
    return Promise.resolve(etfDetailByCode[code]);
  }

  const url = getApiUrl();
  const body = buildEtfInfoPayload(code);

  setStatus('正在查詢代碼 ' + code + '…', false, true);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then((text) => {
      const data = parseResponseJson(text);
      setStatus('已取得資料');
      const list = Array.isArray(data) ? data : [data];
      const item = list[0] || null;
      if (item) {
        etfDetailByCode[code] = item;
        return item;
      }
      setStatus('無此代碼資料', true);
      return null;
    })
    .catch((e) => {
      const msg = e.message || '請求失敗';
      setStatus(msg, true);
      throw e;
    });
}
