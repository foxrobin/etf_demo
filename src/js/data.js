/**
 * 資料解析：etf_info.csv、code_list.json、示範用成分
 */

/**
 * 解析 CSV 單行（不處理欄位內逗號）
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\r') {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * 從 etf_info.csv 解析出發行商列表
 * 最後一欄為 Issuer Code，用於對應 code_list.json
 * @param {string} csvText
 * @returns {Array<{ issuer: string, noOfEtfs: string, issuerCode: string, codes: string[], codeListRaw: string }>}
 */
export function parseEtfInfo(csvText) {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  const headerIndex = lines.findIndex(
    (l) => l.startsWith('Issuer (Chinese)') || l.includes('Issuer (Chinese)')
  );
  if (headerIndex === -1) return [];

  const data = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const issuer = cols[0];
    if (!issuer) continue;
    const noOfEtfs = cols[1] || '';
    const codeListRaw = (cols[6] || '').trim();
    const issuerCode = (cols[7] || '').trim();
    data.push({
      issuer,
      noOfEtfs,
      issuerCode,
      codes: [],
      codeListRaw,
    });
  }
  return data;
}

/**
 * 依 Issuer Code 從 code_list.json 填入各發行商的 codes 與 url
 * @param {object[]} issuers - parseEtfInfo 回傳的陣列（會就地修改）
 * @param {Record<string, { codeList: string[], url?: string }>} codeListData - code_list.json
 */
export function applyCodeList(issuers, codeListData) {
  if (!codeListData || typeof codeListData !== 'object') return;
  for (const item of issuers) {
    if (!item.issuerCode) continue;
    const entry = codeListData[item.issuerCode];
    if (entry?.codeList) item.codes = entry.codeList;
    if (entry?.url) item.url = entry.url;
  }
}

/** 示範用：部分 ETF 代碼的成分占比（實際應由後端或另一份資料提供） */
const MOCK_CONSTITUENTS = {
  2801: [
    { name: '騰訊控股', percent: 9.2 },
    { name: '阿里巴巴', percent: 8.1 },
    { name: '美團', percent: 4.5 },
    { name: '建設銀行', percent: 3.8 },
    { name: '中國平安', percent: 3.2 },
    { name: '其他', percent: 71.2 },
  ],
  3461: [
    { name: '台積電', percent: 12.5 },
    { name: '鴻海', percent: 5.2 },
    { name: '聯發科', percent: 4.8 },
    { name: '台達電', percent: 2.1 },
    { name: '其他', percent: 75.4 },
  ],
  3111: [
    { name: '貴州茅台', percent: 7.8 },
    { name: '寧德時代', percent: 5.6 },
    { name: '招商銀行', percent: 3.9 },
    { name: '其他', percent: 82.7 },
  ],
  3136: [
    { name: '成分 A', percent: 6.0 },
    { name: '成分 B', percent: 4.5 },
    { name: '其他', percent: 89.5 },
  ],
  82822: [
    { name: '南方成分 1', percent: 8.0 },
    { name: '南方成分 2', percent: 5.0 },
    { name: '其他', percent: 87.0 },
  ],
};

/**
 * 取得指定代碼的示範成分（若有）
 * @param {string} code
 * @returns {Array<{ name: string, percent: number }> | null}
 */
export function getConstituents(code) {
  return MOCK_CONSTITUENTS[code] || null;
}

/**
 * 持股 CSV 嘗試順序：先自己，沒有再 3+最後三碼、2+最後三碼、9+最後三碼。
 * 8 開頭五位數先去掉首位 8，剩下當作 code 再套上述順序。
 * @param {string} code - 例如 "2807"、"9807"、"83416"
 * @returns {string[]}
 */
export function getHoldingsCandidateCodes(code) {
  if (!code) return [code];
  const c = code.length === 5 && code[0] === '8' ? code.slice(1) : code;
  const last3 = c.slice(-3);
  if (last3.length !== 3) return [c];
  const candidates = [c];
  for (const r of ['3', '2', '9']) {
    const x = r + last3;
    if (!candidates.includes(x)) candidates.push(x);
  }
  return candidates;
}

/**
 * 回傳用於模糊匹配 _full_holdings_*.csv 的日期：今天 + 昨天起往前 N 天
 * @param {number} [days=90] 昨天起往前幾天（拉長以涵蓋較舊的檔案）
 * @returns {string[]}
 */
export function getRecentDatesYYYYMMDD(days = 90) {
  const out = [];
  const d = new Date();
  const toStr = (x) => {
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };
  out.push(toStr(d));
  for (let i = 1; i <= days; i++) {
    d.setDate(d.getDate() - 1);
    out.push(toStr(d));
  }
  return out;
}

/**
 * 解析 full_holdings CSV，保留所有欄位
 * @param {string} csvText
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function parseHoldingsCsv(csvText) {
  const lines = csvText.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    rows.push(headers.map((_, j) => (cols[j] ?? '').trim()));
  }
  return { headers, rows };
}
