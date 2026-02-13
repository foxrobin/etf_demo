/**
 * 掃描 public/csv_docs/globalx 下所有 *_full_holdings_*.csv，
 * 依檔名抽出 code，自動產生 public/holdings_manifest.json。
 * 執行: node scripts/generate-holdings-manifest.js
 * 或: npm run generate:holdings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const csvDir = path.join(root, 'public', 'csv_docs', 'globalx');
const manifestPath = path.join(root, 'public', 'holdings_manifest.json');

if (!fs.existsSync(csvDir)) {
  console.warn('目錄不存在:', csvDir);
  fs.writeFileSync(manifestPath, '{}\n', 'utf8');
  console.log('已寫入空 manifest:', manifestPath);
  process.exit(0);
}

const files = fs.readdirSync(csvDir);
const manifest = {};

for (const file of files) {
  if (!file.endsWith('.csv')) continue;
  const match = file.match(/^(\d+)_full_holdings_[^.]+\.csv$/);
  if (!match) continue;
  const code = match[1];
  manifest[code] = file;
}

const sorted = Object.keys(manifest)
  .sort((a, b) => String(a).localeCompare(b, undefined, { numeric: true }))
  .reduce((acc, code) => {
    acc[code] = manifest[code];
    return acc;
  }, {});

fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.log('已從', csvDir, '產生', manifestPath, '，共', Object.keys(sorted).length, '筆');
