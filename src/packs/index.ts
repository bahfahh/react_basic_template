import { PACK_IDS } from './ids';
import { renderIndex, renderLlmsTxt, renderPackJson, renderPackMarkdown } from './render';
import type { Pack, PlannedPack, SourceStatus } from './types';
import status from './source-status.json';
import jpRailPass from './content/travel.jp-rail-pass';
import jpPayment from './content/travel.jp-payment';
import jpAirportTransfer from './content/travel.jp-airport-transfer';
import jpTokyoTransit from './content/travel.jp-tokyo-transit';
import jpKansaiTransit from './content/travel.jp-kansai-transit';
import jpTaxRefund from './content/travel.jp-tax-refund';
import travelClaim from './content/travel.tw-travel-inconvenience-claim';
import nhiOverseas from './content/travel.tw-nhi-overseas-refund';
import rentSubsidy from './content/benefit.tw-rent-subsidy';
import mobilePlan from './content/bills.tw-mobile-plan';
import subscriptionCancel from './content/bills.subscription-cancel';
import refundCancel from './content/rights.tw-refund-cancel';

export * from './types';
export { bestVerdict, checkText, COMMON_RULES, lintPack, statusKey } from './render';

const ALL: Pack[] = [
  jpRailPass,
  jpPayment,
  jpAirportTransfer,
  jpTokyoTransit,
  jpKansaiTransit,
  jpTaxRefund,
  travelClaim,
  nhiOverseas,
  rentSubsidy,
  mobilePlan,
  subscriptionCancel,
  refundCancel,
];

/** In the order of PACK_IDS (which is also the order shown in the app). */
export const PACKS: Pack[] = PACK_IDS.map(({ id }) => {
  const p = ALL.find((x) => x.id === id);
  if (!p) throw new Error(`pack ${id} has no content file`);
  // Temporary: two benefit packs are still being written; drop links to them until they land.
  return { ...p, related: p.related?.filter((r) => PACK_IDS.some((x) => x.id === r.id)) };
});

export const PLANNED: PlannedPack[] = [
  { id: 'travel.flight-deal', area: 'travel', icon: 'plane', title: '機票比價', short: '同航線、行李、退改條件下比實際總價。', blocker: '比價網站多半要瀏覽器執行才看得到價格，要先確認各家 agent 讀得到。' },
  { id: 'travel.hotel-deal', area: 'travel', icon: 'bed', title: '飯店比價', short: '同日期、房型、取消政策下跨平台比價。', blocker: '同上：訂房網站的價格多半要瀏覽器執行才看得到。' },
  { id: 'bills.tw-electricity-plan', area: 'bills', icon: 'zap', title: '電費方案比較', short: '一般電價還是時間電價，用你的用電紀錄算。', blocker: '需要使用者的用電紀錄（台電帳單或 App），還沒設計好怎麼安全地交給 AI。' },
  { id: 'bills.tw-credit-card', area: 'bills', icon: 'credit-card', title: '信用卡回饋比較', short: '依你的消費習慣，算哪張卡回饋最多。', blocker: '各銀行活動頁變動快、常要瀏覽器執行，要先確認讀得到。' },
];

export const SOURCE_STATUS = status as SourceStatus;

export const findPack = (id: string) => PACKS.find((p) => p.id === id);
export const findPlanned = (id: string) => PLANNED.find((p) => p.id === id);

/** Files served next to the app (public/): packs/<id>.md|json, packs/index.json, llms.txt. */
export function renderPackFiles(baseUrl: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const p of PACKS) {
    files[`packs/${p.id}.md`] = renderPackMarkdown(p, PACKS, SOURCE_STATUS, baseUrl);
    files[`packs/${p.id}.json`] = JSON.stringify(renderPackJson(p, PACKS, SOURCE_STATUS, baseUrl), null, 2) + '\n';
  }
  files['packs/index.json'] = JSON.stringify(renderIndex(PACKS, PLANNED, SOURCE_STATUS, baseUrl), null, 2) + '\n';
  files['llms.txt'] = renderLlmsTxt(PACKS, PLANNED, baseUrl);
  return files;
}
