/**
 * 檢查 globalx 下每個 code 依現有邏輯能否 load 到 csv_docs/globalx 裡的檔案
 * 執行: node scripts/check-globalx-load.js
 */

function getHoldingsCandidateCodes(code) {
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

// globalx code list from code_list.json
const globalxCodes = [
  '3416', '83416', '3110', '83110', '3470', '3417', '9416', '3191', '2837', '3040', '2845', '3419',
  '2807', '2820', '3137', '2809', '3450', '3448', '2806', '2826', '9191', '3119', '9040', '9845',
  '3440', '3451', '3064', '9807', '9820', '3084', '3415', '3075', '9809', '9450', '3059', '83059',
  '3116', '2841', '3050', '9806', '2815', '9826', '3097', '3006', '3402', '3422', '3029', '3158',
  '3184', '3041', '9440', '9451', '9064', '3150', '3401', '3185', '9084', '9415', '9075', '3104',
  '3139', '9104'
];

// 實際存在的 CSV 對應的 code（檔名為 {code}_full_holdings_*.csv）
const existingFileCodes = new Set([
  '2806', '2807', '2809', '2815', '2820', '2826', '2837', '2841', '2845', '3006', '3029', '3040',
  '3041', '3050', '3059', '3064', '3075', '3084', '3097', '3104', '3110', '3116', '3137', '3139',
  '3150', '3158', '3184', '3185', '3191', '3401', '3402', '3415', '3416', '3417', '3419', '3422',
  '3440', '3448', '3450', '3451', '3470'
]);

const ok = [];
const fail = [];

for (const code of globalxCodes) {
  const candidates = getHoldingsCandidateCodes(code);
  const hit = candidates.find((c) => existingFileCodes.has(c));
  if (hit) {
    ok.push({ code, hit });
  } else {
    fail.push({ code, candidates });
  }
}

console.log('=== 可 load 到檔案的 code（共 ' + ok.length + ' 個）===');
ok.forEach(({ code, hit }) => console.log(code + ' → 使用 ' + hit + '_full_holdings_*.csv'));

console.log('\n=== load 不到檔案的 code（共 ' + fail.length + ' 個）===');
fail.forEach(({ code, candidates }) => {
  console.log(code + ' 候選: [' + candidates.join(', ') + '] → 目錄內無任一對應 CSV');
});

console.log('\n--- 摘要 ---');
console.log('總計: ' + globalxCodes.length + ' 個 code');
console.log('可 load: ' + ok.length);
console.log('load 不到: ' + fail.length);
