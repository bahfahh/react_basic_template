import type { BookingHandoffItem, Catalog, ComparisonResult, FeeQuote, PurchasePlan, StrategyId, TravelerCategory } from '../types';
import { indexCatalog } from './pricing';

/** Prototype pricing hypotheses (spec §7.1) — shown as hypotheses, never charged. */
export const FEE_ASSUMPTIONS = {
  comparisonFeeTwd: 0,
  assistedPrefillFeeTwd: 149,
  jpyToTwd: 0.21,
  foreignTxFeeRate: 0.015,
};

export function buildPurchasePlan(result: ComparisonResult, strategyId: StrategyId, catalog: Catalog): PurchasePlan {
  const index = indexCatalog(catalog);
  const strategy = result.strategies.find((s) => s.id === strategyId);
  if (!strategy || !strategy.feasible) throw new Error(`Strategy ${strategyId} is not available for this comparison`);

  const grouped = new Map<string, { productId: string; startDate: string; quantities: BookingHandoffItem['quantities'] }>();
  for (const p of strategy.passes) {
    const key = `${p.productId}@${p.startDate}`;
    const entry = grouped.get(key) ?? { productId: p.productId, startDate: p.startDate, quantities: [] };
    entry.quantities.push({ category: p.category, count: p.count, unitPrice: p.unitPrice });
    grouped.set(key, entry);
  }

  const items: BookingHandoffItem[] = [...grouped.values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((g, i) => {
      const product = index.product(g.productId)!;
      const channel =
        product.purchaseChannels.find((c) => c.kind === 'online' && c.sourceType === 'official') ?? product.purchaseChannels[0];
      const mustDo = [
        channel.requiresLogin ? '在官方網站自行登入或建立帳號（懶人包不經手密碼）' : null,
        channel.requiresPassport || product.eligibility.foreignPassportOnly ? '購買或兌換時出示護照' : null,
        channel.requiresPayment ? '自行確認金額並付款（懶人包不代付、不保存卡號）' : null,
        '收到購買確認後，回到懶人包上傳收據以驗證節省金額',
      ].filter((x): x is string => !!x);
      return {
        order: i + 1,
        productId: product.id,
        title: product.name,
        quantities: g.quantities,
        useDate: g.startDate,
        amount: g.quantities.reduce((s, q) => s + q.unitPrice * q.count, 0),
        channel,
        userMustDo: mustDo,
        tips: [product.validity.note, ...product.restrictions].filter(Boolean),
      };
    });

  const passTotal = items.reduce((s, i) => s + i.amount, 0);
  return {
    strategyId,
    items,
    passTotal,
    payOnSiteTotal: strategy.total - passTotal,
    automation: [
      { step: '整理需求、比對票券涵蓋範圍、計算總價與節省', who: 'lazypack' },
      { step: '產生購買清單、官方購買連結與注意事項', who: 'lazypack' },
      { step: '開啟官方購買頁並預填票種／數量／日期（需逐項核准）', who: 'user_confirm' },
      { step: '登入、輸入 OTP、處理 CAPTCHA', who: 'user_only' },
      { step: '確認最終金額並付款', who: 'user_only' },
      { step: '上傳收據，驗證實際節省', who: 'user_confirm' },
    ],
    feeQuote: buildFeeQuote(items),
  };
}

function buildFeeQuote(items: BookingHandoffItem[]): FeeQuote {
  return {
    comparisonFeeTwd: FEE_ASSUMPTIONS.comparisonFeeTwd,
    assistedPrefillFeeTwd: FEE_ASSUMPTIONS.assistedPrefillFeeTwd,
    assistedPrefillNote: '定價假設測試（spec §7.1）；原型不會收費，只記錄付費意向。',
    thirdPartyFees: items
      .filter((i) => i.channel.serviceFeeJpy > 0)
      .map((i) => ({ label: `${i.channel.name} 手續費`, amountJpy: i.channel.serviceFeeJpy, note: '依通路公告' })),
    fxAssumption: {
      jpyToTwd: FEE_ASSUMPTIONS.jpyToTwd,
      foreignTxFeeRate: FEE_ASSUMPTIONS.foreignTxFeeRate,
      note: '示範匯率與常見海外刷卡手續費，非即時資料；實際以發卡銀行為準。不影響方案排序。',
    },
  };
}

export function categoryLabel(c: TravelerCategory): string {
  return { adult: '大人', child: '兒童', infant: '幼兒' }[c];
}
