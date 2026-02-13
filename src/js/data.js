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
