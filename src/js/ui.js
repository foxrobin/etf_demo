/**
 * UI：發行商列表、詳情區、下拉選單、API 狀態與事件綁定
 */

import { ID, HOLDINGS_BY_ISSUER, HOLDINGS_MANIFEST_URL } from './config.js';
import { fetchEtfByCode, setStatus, getStatus, getCachedDetail } from './api.js';
import { parseEtfInfo, applyCodeList, getConstituents, parseHoldingsCsv, getHoldingsCandidateCodes } from './data.js';
import { parseHoldingsXls } from './holdings-xls.js';
import { escapeHtml } from './utils.js';
import { LOGICAL_FIELDS, VALUE_CD_LABELS, LANG_TABS } from './etf-fields.js';

// ---------------------------------------------------------------------------
// DOM 參照
// ---------------------------------------------------------------------------

function $(id) {
  return document.getElementById(id);
}

// ---------------------------------------------------------------------------
// 狀態
// ---------------------------------------------------------------------------

let allIssuers = [];
let selectedIssuer = null;
let selectedCode = null;
/** @type {Record<string, Array<{ name: string, percent: number }> | null>} */
const constituentsCache = {};
/** 正在載入持股的 code，用於顯示 loading 且不重複觸發 */
let constituentsLoadingCode = null;
/** 各 issuer 的 manifest（code → 檔名），由單一 holdings_manifest.json 載入後分發 */
const holdingsManifestByIssuer = {};
/** 是否已載入合併 manifest（只 fetch 一次） */
let holdingsManifestLoaded = false;

// ---------------------------------------------------------------------------
// 發行商列表
// ---------------------------------------------------------------------------

/**
 * 渲染左側發行商列表
 * @param {string} [filter='']
 */
function renderIssuerList(filter = '') {
  const listEl = $(ID.ISSUER_LIST);
  if (!listEl) return;

  const q = filter.trim().toLowerCase();
  const list = q
    ? allIssuers.filter((i) => i.issuer.toLowerCase().includes(q))
    : allIssuers;

  listEl.innerHTML = list
    .map(
      (item) => `
    <div class="issuer-card ${selectedIssuer?.issuer === item.issuer ? 'issuer-card--active' : ''}"
         data-issuer="${escapeHtml(item.issuer)}">
      <div class="issuer-card__name">${escapeHtml(item.issuer)}</div>
      <div class="issuer-card__meta">
        <span>ETF 數量: ${escapeHtml(item.noOfEtfs)}</span>
        ${item.codes.length ? `<span>代碼列表: ${item.codes.length} 個</span>` : ''}
        ${item.url ? `<a href="${escapeHtml(item.url)}" class="issuer-card__url" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">官網</a>` : ''}
      </div>
    </div>
  `
    )
    .join('');

  listEl.querySelectorAll('.issuer-card').forEach((card) => {
    card.addEventListener('click', () => selectIssuer(card.dataset.issuer));
  });
}

function selectIssuer(issuerName) {
  selectedIssuer = allIssuers.find((i) => i.issuer === issuerName) || null;
  selectedCode = null;
  const searchEl = $(ID.SEARCH);
  renderIssuerList(searchEl ? searchEl.value : '');
  renderDetail();
}

// ---------------------------------------------------------------------------
// 代碼選擇與詳情
// ---------------------------------------------------------------------------

function selectCode(code) {
  selectedCode = code;
  selectedIssuer = allIssuers.find((i) => i.codes.includes(code)) || selectedIssuer;
  renderDetail();
  if (code && !getCachedDetail(code)) {
    fetchEtfByCode(code).then(() => renderDetail()).catch(() => renderDetail());
  }
}

async function loadHoldingsManifest(issuerCode) {
  if (holdingsManifestByIssuer[issuerCode] !== undefined) return holdingsManifestByIssuer[issuerCode];
  if (!holdingsManifestLoaded) {
    try {
      const res = await fetch(HOLDINGS_MANIFEST_URL);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          for (const k of Object.keys(data)) holdingsManifestByIssuer[k] = data[k];
          holdingsManifestLoaded = true;
        }
      }
    } catch (_) {}
  }
  return holdingsManifestByIssuer[issuerCode] ?? null;
}

/**
 * 依發行商載入持股：globalx 用 CSV、ishares 用 XLS、bosera 用 XLSX，皆用 manifest，同一 UI 顯示。
 * globalx / bosera 用 getHoldingsCandidateCodes（3字、2字、9字、8xxx）對應檔名。
 * @param {string} code
 * @param {string} [issuerCode] 來自 selectedIssuer.issuerCode
 * @returns {Promise<{ headers: string[], rows: string[][] } | Array<{ name: string, percent: number }> | null>}
 */
async function loadConstituentsForCode(code, issuerCode) {
  code = code ? String(code).trim() : '';
  if (!code) return null;
  if (constituentsCache[code] !== undefined) return constituentsCache[code];
  const config = issuerCode ? HOLDINGS_BY_ISSUER[issuerCode] : null;
  if (!config) {
    const fallback = getConstituents(code) || null;
    constituentsCache[code] = fallback;
    return fallback;
  }
  await loadHoldingsManifest(issuerCode);
  const manifest = holdingsManifestByIssuer[issuerCode];
  const base = (config.base || '').replace(/\/?$/, '/');

  if (config.type === 'csv') {
    const candidates = getHoldingsCandidateCodes(code);
    for (const tryCode of candidates) {
      const filename = manifest && manifest[tryCode];
      if (!filename) continue;
      try {
        const res = await fetch(base + filename);
        if (!res.ok) continue;
        const text = await res.text();
        const { headers, rows } = parseHoldingsCsv(text);
        if (headers.length && rows.length) {
          constituentsCache[code] = { headers, rows };
          return constituentsCache[code];
        }
      } catch (_) {}
    }
  } else if (config.type === 'xls') {
    const tryCodes = config.useCandidateCodes ? getHoldingsCandidateCodes(code) : [code, String(code)];
    for (const tryCode of tryCodes) {
      const filename = manifest && (manifest[tryCode] || manifest[String(tryCode)]);
      if (!filename) continue;
      try {
        const res = await fetch(base + filename);
        const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
        if (res.ok && contentType.includes('text/html')) continue; /* 略過 SPA fallback */
        if (res.ok) {
          const ab = await res.arrayBuffer();
          const peek = new TextDecoder().decode(ab.slice(0, 512));
          if (!/<\s*!?html|<\s*head|<\s*meta\s/i.test(peek)) {
            const { headers, rows } = parseHoldingsXls(ab);
            if (headers.length || rows.length) {
              constituentsCache[code] = { headers, rows };
              return constituentsCache[code];
            }
          }
        }
      } catch (_) {}
    }
  } else if (config.type === 'xlsx') {
    const candidates = getHoldingsCandidateCodes(code);
    for (const tryCode of candidates) {
      const filename = manifest && manifest[tryCode];
      if (!filename) continue;
      try {
        const res = await fetch(base + filename);
        if (!res.ok) continue;
        const ab = await res.arrayBuffer();
        const { headers, rows } = parseHoldingsXls(ab);
        if (headers.length || rows.length) {
          constituentsCache[code] = { headers, rows };
          return constituentsCache[code];
        }
      } catch (_) {}
    }
  }

  const fallback = getConstituents(code) || null;
  constituentsCache[code] = fallback;
  return fallback;
}

/**
 * 依 Identifier Table 渲染單一欄位列（不含 cvaluecd）
 * @param {string} label
 * @param {unknown} value
 * @param {number} fieldId
 * @returns {string}
 */
function renderEtfDetailRow(label, value, fieldId) {
  const display =
    value != null && value !== ''
      ? String(value)
      : '—';
  return `<div class="etf-detail__row" data-field-id="${fieldId}"><span class="etf-detail__label">${escapeHtml(label)}</span><span class="etf-detail__value">${escapeHtml(display)}</span></div>`;
}

/**
 * 渲染 cValueCd (Field 64)：JSON 與 key 說明
 * @param {Record<string, number>} valuecd
 * @returns {string}
 */
function renderValueCdBlock(valuecd) {
  const rows = Object.entries(valuecd)
    .map(
      ([k, v]) =>
        `<tr><td class="etf-detail__valuecd-key">${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td><td class="etf-detail__valuecd-desc">${escapeHtml(VALUE_CD_LABELS[k] || '')}</td></tr>`
    )
    .join('');
  return `
    <div class="etf-detail__valuecd">
      <h4 class="etf-detail__valuecd-title">cValueCd (Field 64) － ETF value codes</h4>
      <p class="etf-detail__valuecd-remark">AC=資產類別, DF=派息政策, GF=重點地區, I=行業, IF=投資重點, RM=複製方法, S=管理投資策略</p>
      <div class="etf-detail__valuecd-table-wrap">
        <table class="etf-detail__valuecd-table">
          <thead><tr><th>Key</th><th>代碼值</th><th>說明</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * 取得單一邏輯欄位在指定語系下的標籤與值（繁／简／英三種分頁內容一致，僅值依語系）
 * @param {object} row - LOGICAL_FIELDS 的一項
 * @param {string} lang - 'tchi' | 'schi' | 'eng'
 * @param {object} d - API 回傳資料
 * @returns {{ label: string, value: unknown }}
 */
function getLogicalRowDisplay(row, lang, d) {
  if (row.type === 'neutral') {
    return { label: row.labelTchi, value: d[row.key] };
  }
  const key = lang === 'tchi' ? row.keyTchi : lang === 'schi' ? row.keySchi : row.keyEng;
  const label = lang === 'tchi' ? row.labelTchi : lang === 'schi' ? row.labelSchi : row.labelEng;
  return { label: label || '', value: d[key] };
}

/**
 * 渲染單一語系面板（與其他分頁欄位一致，全部信息齊全；僅值為該語系）
 * @param {object} d - API 回傳資料
 * @param {string} lang - 'tchi' | 'schi' | 'eng'
 * @param {boolean} isDefault - 是否為預設顯示（繁體）
 * @returns {string}
 */
function renderEtfLangPanel(d, lang, isDefault) {
  const rows = LOGICAL_FIELDS.map((row, i) => {
    const { label, value } = getLogicalRowDisplay(row, lang, d);
    return renderEtfDetailRow(label, value, row.order || i + 1);
  }).join('');
  const hidden = isDefault ? '' : ' hidden';
  return `<div class="etf-detail__panel" data-lang="${lang}" role="tabpanel"${hidden}>${rows ? `<div class="etf-detail__grid">${rows}</div>` : ''}</div>`;
}

/**
 * 渲染 ETF API 回傳的完整詳情（繁／简／英分頁，預設繁體）
 * @param {object} d - EtfInfo.do 回傳的單筆物件
 * @returns {string} HTML
 */
function renderEtfApiBlock(d) {
  if (!d || typeof d !== 'object') return '';

  const tabButtons = LANG_TABS.map(
    (t) =>
      `<button type="button" class="etf-lang-tab ${t.default ? 'etf-lang-tab--active' : ''}" data-lang="${t.id}" role="tab" aria-selected="${t.default}">${escapeHtml(t.label)}</button>`
  ).join('');

  const panels = LANG_TABS.map((t) => renderEtfLangPanel(d, t.id, t.default)).join('');

  let valuecdHtml = '';
  if (d.cvaluecd && typeof d.cvaluecd === 'object' && !Array.isArray(d.cvaluecd)) {
    valuecdHtml = renderValueCdBlock(d.cvaluecd);
  }

  return `
    <div class="etf-detail">
      <h3 class="etf-detail__title">ETF 詳情</h3>
      <div class="etf-lang-tabs" role="tablist">
        ${tabButtons}
      </div>
      <div class="etf-detail__panels">
        ${panels}
      </div>
      ${valuecdHtml}
    </div>
  `;
}

/**
 * 切換繁／简／英分頁顯示
 * @param {HTMLElement} container - .etf-detail
 * @param {string} lang - 'tchi' | 'schi' | 'eng'
 */
function setEtfDetailActiveLang(container, lang) {
  if (!container) return;
  container.querySelectorAll('.etf-lang-tab').forEach((btn) => {
    const isActive = btn.dataset.lang === lang;
    btn.classList.toggle('etf-lang-tab--active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  container.querySelectorAll('.etf-detail__panel').forEach((panel) => {
    panel.hidden = panel.dataset.lang !== lang;
  });
}

/**
 * 渲染右側詳情區：代碼下拉、API 詳情、成分表
 */
async function renderDetail() {
  const titleEl = $(ID.DETAIL_TITLE);
  const contentEl = $(ID.DETAIL_CONTENT);
  if (!contentEl) return;

  const apiData = selectedCode ? getCachedDetail(selectedCode) : null;
  const status = getStatus();
  const loadingCode = selectedCode && !apiData && status.loading;

  if (!selectedIssuer && !selectedCode) {
    if (titleEl) titleEl.textContent = '選擇發行商以查看 ETF 代碼與成分';
    contentEl.innerHTML = `
      <div class="detail-placeholder">
        請從左側點選一個發行商，並從下拉選單選擇代碼以查看 ETF 詳情。
      </div>
    `;
    return;
  }

  const codes = selectedIssuer ? selectedIssuer.codes : (selectedCode ? [selectedCode] : []);
  if (titleEl) {
    titleEl.textContent = selectedIssuer ? selectedIssuer.issuer : `代碼 ${selectedCode}`;
  }

  let issuerUrlHtml = '';
  if (selectedIssuer?.url) {
    issuerUrlHtml = `<p class="detail-issuer-url"><a href="${escapeHtml(selectedIssuer.url)}" target="_blank" rel="noopener noreferrer" class="detail-issuer-url__link">官網：${escapeHtml(selectedIssuer.url)}</a></p>`;
  }

  const constituents = selectedCode ? constituentsCache[selectedCode] : null;
  const needLoadConstituents = selectedCode && constituents === undefined;
  if (needLoadConstituents && constituentsLoadingCode !== selectedCode) {
    constituentsLoadingCode = selectedCode;
    loadConstituentsForCode(selectedCode, selectedIssuer?.issuerCode).then(() => {
      constituentsLoadingCode = null;
      renderDetail();
    });
  }

  // 代碼下拉選單
  let codeSelectHtml = '';
  if (codes.length) {
    const options = codes
      .map(
        (code) =>
          `<option value="${escapeHtml(code)}" ${selectedCode === code ? 'selected' : ''}>${escapeHtml(code)}</option>`
      )
      .join('');
    codeSelectHtml = `
      <h3 class="detail-inner__heading">選擇 ETF 代碼</h3>
      <div class="code-select-wrap">
        <select id="${ID.CODE_SELECT}" class="code-select" aria-label="選擇 ETF 代碼">
          <option value="">-- 請選擇代碼 --</option>
          ${options}
        </select>
      </div>
    `;
  } else if (selectedCode) {
    codeSelectHtml = `<h3 class="detail-inner__heading">代碼</h3><p class="detail-inner__text">${escapeHtml(selectedCode)}</p>`;
  } else {
    codeSelectHtml = '<p class="no-data">此發行商於 code_list 中暫無代碼列表。</p>';
  }

  // API 詳情區塊
  let apiBlock = '';
  if (loadingCode) {
    apiBlock = '<div class="loading">正在從 API 載入…</div>';
  } else if (apiData) {
    apiBlock = renderEtfApiBlock(apiData);
  } else if (selectedCode) {
    apiBlock = '<p class="no-data">選擇代碼後會從 EtfInfo.do 取得該 ETF 詳情；若失敗請檢查 API 網址或網路。</p>';
  }

  // 成分表（優先從 CSV 顯示全部欄位，否則示範數據；載入中顯示 loading）
  let constituentTable = '';
  const constituentsLoading = needLoadConstituents || constituentsLoadingCode === selectedCode;
  const hasCsvHoldings = selectedCode && constituents && constituents.headers && constituents.rows;
  const hasMockHoldings = selectedCode && constituents && Array.isArray(constituents) && constituents.length;
  if (constituentsLoading) {
    constituentTable = `<h3 class="detail-inner__heading">持股明細 (ETF ${escapeHtml(selectedCode)})</h3><div class="loading">載入持股中…</div>`;
  } else if (hasCsvHoldings) {
    const { headers, rows } = constituents;
    constituentTable = `
      <h3 class="detail-inner__heading">持股明細 (ETF ${escapeHtml(selectedCode)})</h3>
      <div class="constituent-table-wrap">
        <table class="constituent-table">
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (hasMockHoldings) {
    constituentTable = `
      <h3 class="detail-inner__heading">成分占比 (ETF ${escapeHtml(selectedCode)})</h3>
      <div class="constituent-table-wrap">
        <table class="constituent-table">
          <thead><tr><th>成分</th><th>占比 (%)</th></tr></thead>
          <tbody>
            ${constituents.map((r) => `<tr><td>${escapeHtml(r.name)}</td><td class="constituent-table__percent">${r.percent}%</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else if (selectedCode) {
    constituentTable = `<h3 class="detail-inner__heading">持股明細 (ETF ${escapeHtml(selectedCode)})</h3><p class="no-data">此 ETF 暫無成分數據。</p>`;
  } else if (codes.length && !selectedCode) {
    constituentTable = '<p class="no-data">請從下拉選單選擇代碼以載入 ETF 詳情。</p>';
  }

  contentEl.innerHTML = `
    <div class="detail-inner">
      ${issuerUrlHtml}
      ${codeSelectHtml}
      ${apiBlock}
      ${constituentTable}
    </div>
  `;

  const codeSelectEl = contentEl.querySelector('#' + ID.CODE_SELECT);
  if (codeSelectEl) {
    codeSelectEl.addEventListener('change', () => {
      const code = codeSelectEl.value.trim();
      if (code) selectCode(code);
    });
  }

  contentEl.querySelectorAll('.etf-lang-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const detailEl = btn.closest('.etf-detail');
      if (detailEl) setEtfDetailActiveLang(detailEl, btn.dataset.lang);
    });
  });
}

// ---------------------------------------------------------------------------
// 資料載入
// ---------------------------------------------------------------------------

async function loadData() {
  const contentEl = $(ID.DETAIL_CONTENT);
  if (contentEl) contentEl.innerHTML = '<div class="loading">載入中…</div>';

  try {
    const [csvRes, codeListRes] = await Promise.all([
      fetch('/etf_info.csv'),
      fetch('/code_list.json'),
    ]);
    if (!csvRes.ok) throw new Error('無法載入 etf_info.csv');
    const text = await csvRes.text();
    allIssuers = parseEtfInfo(text);
    if (codeListRes.ok) {
      const codeListData = await codeListRes.json();
      applyCodeList(allIssuers, codeListData);
    }
    renderIssuerList();
    renderDetail();
  } catch (e) {
    if (contentEl) {
      contentEl.innerHTML = `<div class="error">載入失敗：${escapeHtml(e.message)}</div>`;
    }
  }
}

// ---------------------------------------------------------------------------
// 初始化：綁定事件並載入資料
// ---------------------------------------------------------------------------

export function init() {
  const searchEl = $(ID.SEARCH);
  if (searchEl) {
    searchEl.addEventListener('input', () => renderIssuerList(searchEl.value));
  }

  loadData();
}
