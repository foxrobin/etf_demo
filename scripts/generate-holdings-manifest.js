/**
 * 掃描 public/csv_docs/globalx 與 public/csv_docs/ishares，
 * 產生單一 public/holdings_manifest.json：{ globalx: { code: filename }, ishares: { code: filename } }。
 * 執行: node scripts/generate-holdings-manifest.js
 * 或: npm run generate:holdings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'public', 'holdings_manifest.json');

function scanDir(dir, pattern, key) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    const match = file.match(pattern);
    if (!match) continue;
    out[match[1]] = file;
  }
  return Object.keys(out)
    .sort((a, b) => String(a).localeCompare(b, undefined, { numeric: true }))
    .reduce((acc, code) => {
      acc[code] = out[code];
      return acc;
    }, {});
}

const globalxDir = path.join(root, 'public', 'csv_docs', 'globalx');
const isharesDir = path.join(root, 'public', 'csv_docs', 'ishares');

const globalx = scanDir(globalxDir, /^(\d+)_full_holdings_[^.]+\.csv$/, 'code');
const ishares = scanDir(isharesDir, /^(\d+)_ishares\.(xls|xlsx)$/i, 'code');

const merged = { globalx, ishares };
fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
console.log(
  '已產生',
  manifestPath,
  '｜ globalx:',
  Object.keys(globalx).length,
  '筆，ishares:',
  Object.keys(ishares).length,
  '筆'
);
