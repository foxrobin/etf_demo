/**
 * EtfInfo API 欄位定義（Identifier Table）
 * key = 回應欄位名稱（小寫）, label = 顯示標籤, fieldId = 欄位 ID, lang = 繁 tchi | 简 schi | 英 eng | 中性 neutral
 */

function langFromKey(key) {
  if (key.endsWith('tchi')) return 'tchi';
  if (key.endsWith('schi')) return 'schi';
  if (key.endsWith('eng')) return 'eng';
  return 'neutral';
}

const RAW_FIELDS = [
  { key: 'ccompanycd', label: 'Company Cd', fieldId: 1 },
  { key: 'cmpid', label: 'MP Id', fieldId: 2 },
  { key: 'ccounter', label: 'Counter', fieldId: 3 },
  { key: 'ccode', label: '代碼 (Stock/Trust/ETF code)', fieldId: 4 },
  { key: 'cnametchi', label: '名稱[繁]', fieldId: 5 },
  { key: 'cnameschi', label: '名稱[简]', fieldId: 6 },
  { key: 'cnameeng', label: '名稱[英]', fieldId: 7 },
  { key: 'cinvestobjtchi', label: '投資目標[繁]', fieldId: 8 },
  { key: 'cinvestobjschi', label: '投资目标[简]', fieldId: 9 },
  { key: 'cinvestobjeng', label: '投資目標[英]', fieldId: 10 },
  { key: 'ccategorytchi', label: '資產類別[繁]', fieldId: 11 },
  { key: 'ccategoryschi', label: '资产类别[简]', fieldId: 12 },
  { key: 'ccategoryeng', label: '資產類別[英]', fieldId: 13 },
  { key: 'cderinsttchi', label: 'Der Inst[繁]', fieldId: 14 },
  { key: 'cderinstschi', label: 'Der Inst[简]', fieldId: 15 },
  { key: 'cderinsteng', label: 'Der Inst[英]', fieldId: 16 },
  { key: 'cderinstremarktchi', label: 'Der Inst Remark[繁]', fieldId: 17 },
  { key: 'cderinstremarkschi', label: 'Der Inst Remark[简]', fieldId: 18 },
  { key: 'cderinstremarkeng', label: 'Der Inst Remark[英]', fieldId: 19 },
  { key: 'cderinstissuerstchi', label: '衍生工具發行商[繁]', fieldId: 20 },
  { key: 'cderinstissuersschi', label: '衍生工具发行商[简]', fieldId: 21 },
  { key: 'cderinstissuerseng', label: '衍生工具發行商[英]', fieldId: 22 },
  { key: 'cshortsellingtchi', label: '賣空[繁]', fieldId: 23 },
  { key: 'cshortsellingschi', label: '卖空[简]', fieldId: 24 },
  { key: 'cshortsellingeng', label: '賣空[英]', fieldId: 25 },
  { key: 'clistingdate', label: '上市日期 (Listing day)', fieldId: 26 },
  { key: 'cmgnfeetchi', label: '管理費[繁]', fieldId: 27 },
  { key: 'cmgnfeeschi', label: '管理费[简]', fieldId: 28 },
  { key: 'cmgnfeeeng', label: '管理費[英]', fieldId: 29 },
  { key: 'cstampdutytchi', label: '股票印花稅[繁]', fieldId: 30 },
  { key: 'cstampdutyschi', label: '股票印花税[简]', fieldId: 31 },
  { key: 'cstampdutyeng', label: '股票印花稅[英]', fieldId: 32 },
  { key: 'cbasecur', label: '基準貨幣', fieldId: 33 },
  { key: 'ctradecur', label: '交易貨幣', fieldId: 34 },
  { key: 'ctotalnetassetcur', label: '總資產貨幣 (cTotalNetAssetTotal 之貨幣)', fieldId: 35 },
  { key: 'ctotalnetassettotal', label: '總資產(百萬元)', fieldId: 36 },
  { key: 'ctotalnetassetdate', label: '總資產日期', fieldId: 37 },
  { key: 'cdispolicytchi', label: '派息政策[繁]', fieldId: 38 },
  { key: 'cdispolicyschi', label: '派息政策[简]', fieldId: 39 },
  { key: 'cdispolicyeng', label: '派息政策[英]', fieldId: 40 },
  { key: 'cfundmgrtchi', label: '基金經理[繁]', fieldId: 41 },
  { key: 'cfundmgrschi', label: '基金经理[简]', fieldId: 42 },
  { key: 'cfundmgreng', label: '基金經理[英]', fieldId: 43 },
  { key: 'culyassettchi', label: '相關資產[繁]', fieldId: 44 },
  { key: 'culyassetschi', label: '相关资产[简]', fieldId: 45 },
  { key: 'culyasseteng', label: '相關資產[英]', fieldId: 46 },
  { key: 'cnavpunitcur', label: '資產淨值 (NAV) 貨幣', fieldId: 47 },
  { key: 'cmarketmakertchi', label: '莊家[繁]', fieldId: 48 },
  { key: 'cmarketmakerschi', label: '庄家[简]', fieldId: 49 },
  { key: 'cmarketmakereng', label: '莊家[英]', fieldId: 50 },
  { key: 'curl', label: '網站 URL', fieldId: 51 },
  { key: 'cprospectusurlchi', label: '章程(中文版) 路徑', fieldId: 52 },
  { key: 'cprospectusurleng', label: '章程(英文版) 路徑', fieldId: 53 },
  { key: 'cboardlotsize', label: '每手股數 (Lot size)', fieldId: 54 },
  { key: 'cnameshorttchi', label: '名稱簡稱[繁]', fieldId: 55 },
  { key: 'cnameshortschi', label: '名称简称[简]', fieldId: 56 },
  { key: 'cnameshorteng', label: '名稱簡稱[英]', fieldId: 57 },
  { key: 'ccategoryid', label: 'Category Id (ET Net)', fieldId: 58 },
  { key: 'ccategoryorder', label: 'Category 顯示順序', fieldId: 59 },
  { key: 'crqfiieng', label: 'RQFII[英]', fieldId: 60 },
  { key: 'crqfiitchi', label: 'RQFII[繁]', fieldId: 61 },
  { key: 'crqfiischi', label: 'RQFII[简]', fieldId: 62 },
  { key: 'cfactor', label: '槓桿比率 (LIP only)', fieldId: 63 },
  { key: 'cvaluecd', label: 'ETF value codes (JSON)', fieldId: 64 },
  { key: 'cassetclasscd', label: '資產類別代碼 (AC)', fieldId: 65 },
  { key: 'cgeofocuscd', label: '重點地區代碼 (GF)', fieldId: 66 },
  { key: 'cindustrycd', label: '行業代碼 (I)', fieldId: 67 },
  { key: 'cinvestfocuscd', label: '投資重點代碼 (IF)', fieldId: 68 },
  { key: 'creplicatemethodcd', label: '複製方法代碼 (RM)', fieldId: 69 },
  { key: 'cstrategycd', label: '管理投資策略代碼 (S)', fieldId: 70 },
  { key: 'culyassettchi2', label: '相關資產[繁] (建議用)', fieldId: 71 },
  { key: 'culyassetschi2', label: '相关资产[简] (建議用)', fieldId: 72 },
  { key: 'culyasseteng2', label: '相關資產[英] (建議用)', fieldId: 73 },
  { key: 'cissuertchi', label: 'ETF發行商[繁]', fieldId: 74 },
  { key: 'cissuerschi', label: 'ETF发行商[简]', fieldId: 75 },
  { key: 'cissuereng', label: 'ETF Issuer[英]', fieldId: 76 },
  { key: 'ccharge', label: '經常性開支 (Ongoing Charges, e.g. 0.0007=0.07%)', fieldId: 77 },
];

export const ETF_FIELDS = RAW_FIELDS.map((f) => ({ ...f, lang: langFromKey(f.key) }));

/**
 * 邏輯欄位：繁／简／英三種分頁顯示「同一份完整資料」
 * - neutral：無語系之分，三個分頁都顯示同一 key 的值
 * - triplet：有繁簡英，各分頁顯示對應 key 的值
 */
function buildLogicalFields() {
  const withLang = ETF_FIELDS.filter((f) => f.key !== 'cvaluecd');
  const groups = /** @type {Record<string, { type: string, order: number, [k: string]: unknown }>} */ ({});
  for (const f of withLang) {
    if (f.lang === 'neutral') {
      groups[f.key] = {
        type: 'neutral',
        key: f.key,
        labelTchi: f.label,
        labelSchi: f.label,
        labelEng: f.label,
        order: f.fieldId,
      };
    } else {
      const base = f.key.replace(/(tchi|schi|eng)$/, '');
      if (!groups[base]) {
        groups[base] = { type: 'triplet', order: f.fieldId };
      }
      groups[base]['key' + (f.lang === 'tchi' ? 'Tchi' : f.lang === 'schi' ? 'Schi' : 'Eng')] = f.key;
      groups[base]['label' + (f.lang === 'tchi' ? 'Tchi' : f.lang === 'schi' ? 'Schi' : 'Eng')] = f.label;
      groups[base].order = Math.min(groups[base].order, f.fieldId);
    }
  }
  return Object.values(groups).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export const LOGICAL_FIELDS = buildLogicalFields();

/** 語系分頁：繁體 default */
export const LANG_TABS = [
  { id: 'tchi', label: '繁體', default: true },
  { id: 'schi', label: '简体', default: false },
  { id: 'eng', label: 'English', default: false },
];

/** cValueCd (Field 64) JSON key 說明 */
export const VALUE_CD_LABELS = {
  AC: '資產類別 (Asset Class)',
  DF: '派息政策 (Distribution Frequency)',
  GF: '重點地區 (Geographic Focus)',
  I: '行業 (Industry)',
  IF: '投資重點 (Investment Focus)',
  RM: '複製方法 (Replication Method)',
  S: '管理投資策略 (Strategy)',
};
