import type { AreaId } from './types';

/**
 * Every active pack id with its file in src/packs/content/<id>.ts (default export).
 * Kept separate so a single pack can be validated without importing all of them.
 */
export const PACK_IDS: Array<{ id: string; area: AreaId; title: string }> = [
  { id: 'travel.jp-rail-pass', area: 'travel', title: 'JR Pass 划算嗎' },
  { id: 'travel.jp-payment', area: 'travel', title: '日本付款不吃虧' },
  { id: 'travel.jp-airport-transfer', area: 'travel', title: '機場進市區交通' },
  { id: 'travel.jp-tokyo-transit', area: 'travel', title: '東京交通票券省錢' },
  { id: 'travel.jp-kansai-transit', area: 'travel', title: '大阪・京都交通票券省錢' },
  { id: 'travel.jp-tax-refund', area: 'travel', title: '日本退稅' },
  { id: 'travel.tw-travel-inconvenience-claim', area: 'travel', title: '旅遊不便險理賠' },
  { id: 'travel.tw-nhi-overseas-refund', area: 'travel', title: '海外就醫健保核退' },
  { id: 'benefit.tw-subsidy-checkup', area: 'benefit', title: '我能領哪些補助' },
  { id: 'benefit.tw-rent-subsidy', area: 'benefit', title: '租金補貼' },
  { id: 'benefit.tw-income-tax', area: 'benefit', title: '綜所稅省稅檢查' },
  { id: 'bills.tw-mobile-plan', area: 'bills', title: '手機資費健檢' },
  { id: 'bills.subscription-cancel', area: 'bills', title: '取消訂閱、停止扣款' },
  { id: 'rights.tw-refund-cancel', area: 'rights', title: '退貨與解約退費' },
];
