/**
 * 解析 XLS 持股檔為 { headers, rows }，與 CSV 輸出格式一致供同一 UI 顯示。
 * Excel 2003 XML（ss:Workbook）用 DOMParser 解析，正確支援 UTF-8；其餘用 SheetJS。
 */

import * as XLSX from 'xlsx';

const NS_SS = 'urn:schemas-microsoft-com:office:spreadsheet';

function looksLikeXml(ab) {
  const peek = new TextDecoder().decode(ab.slice(0, 256));
  return /<\?xml|<\s*ss:Workbook/i.test(peek);
}

/** 從 Excel 2003 XML 抽出第一個 ss:Table 為 { headers, rows }，UTF-8 正確 */
function parseSsWorkbookXml(arrayBuffer) {
  const str = new TextDecoder('utf-8').decode(arrayBuffer);
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, 'text/xml');
  let tables = doc.getElementsByTagNameNS(NS_SS, 'Table');
  if (!tables.length) tables = doc.getElementsByTagName('Table');
  if (!tables.length) return { headers: [], rows: [] };
  const table = tables[0];
  let rowEls = table.getElementsByTagNameNS(NS_SS, 'Row');
  if (!rowEls.length) rowEls = table.getElementsByTagName('Row');
  const outRows = [];
  for (let i = 0; i < rowEls.length; i++) {
    const row = rowEls[i];
    let cells = row.getElementsByTagNameNS(NS_SS, 'Cell');
    if (!cells.length) cells = row.getElementsByTagName('Cell');
    const rowData = [];
    let colIndex = 0;
    for (let j = 0; j < cells.length; j++) {
      const cell = cells[j];
      const idx = cell.getAttribute('ss:Index') || cell.getAttribute('Index');
      if (idx) colIndex = parseInt(idx, 10) - 1;
      let data = cell.getElementsByTagNameNS(NS_SS, 'Data')[0];
      if (!data) data = cell.getElementsByTagName('Data')[0];
      const text = data ? (data.textContent || '').trim() : '';
      while (rowData.length < colIndex) rowData.push('');
      rowData.push(text);
      colIndex++;
    }
    outRows.push(rowData);
  }
  if (!outRows.length) return { headers: [], rows: [] };
  const colCount = Math.max(1, ...outRows.map((r) => r.length));
  const pad = (row) => {
    const arr = row.slice(0, colCount).map((c) => String(c ?? '').trim());
    while (arr.length < colCount) arr.push('');
    return arr;
  };
  const headerRowIndex = outRows.findIndex((r) => r.length === colCount);
  const headerRowIdx = headerRowIndex >= 0 ? headerRowIndex : 0;
  const headers = pad(outRows[headerRowIdx] || []);
  const rows = outRows.slice(headerRowIdx + 1).map((row) => pad(row));
  return { headers, rows };
}

/** 若內容像 XML/HTML 原始碼（非表格資料），不當成表格顯示 */
function isGarbageSheet(aoa) {
  if (!aoa.length) return true;
  const flat = aoa.slice(0, 3).flat().map((c) => String(c ?? '').trim()).join('');
  return /<\?xml|<\s*ss:Workbook|<\s*ss:Styles|<\s*html|<\s*head/i.test(flat);
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ headers: string[], rows: string[][] }}
 */
export function parseHoldingsXls(arrayBuffer) {
  if (looksLikeXml(arrayBuffer)) {
    const parsed = parseSsWorkbookXml(arrayBuffer);
    if (parsed.headers.length || parsed.rows.some((r) => r.some((c) => c))) return parsed;
  }
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  if (!wb.SheetNames || !wb.SheetNames.length) return { headers: [], rows: [] };
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (isGarbageSheet(aoa)) continue;
    const headers = (aoa[0] || []).map((c) => String(c ?? '').trim());
    const rows = aoa.slice(1).map((row) => headers.map((_, j) => String((row && row[j]) ?? '').trim()));
    if (headers.some((h) => h) || rows.some((r) => r.some((c) => c))) {
      return { headers, rows };
    }
  }
  return { headers: [], rows: [] };
}
