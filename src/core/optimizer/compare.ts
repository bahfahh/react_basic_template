import { daysBetween } from '../lib/dates';
import type {
  Catalog,
  ComparisonResult,
  ComparisonWarning,
  CostLine,
  JpTicketInput,
  MissingField,
  NonEquivalentOption,
  NormalizedInput,
  PolicySource,
  SourceSnapshot,
  StrategyId,
  StrategyResult,
  TravelerCategory,
  VariableItem,
} from '../types';
import { normalizeInput } from './normalize';
import { isRelevant, optimizeCategory, type CategoryPlan, type OptimizeOptions } from './optimize';
import { admissionPrice, indexCatalog, type CatalogIndex } from './pricing';

export const PRICE_CALCULATION_VERSION = 'jp-ticket-calc/0.1.0';
/** Sources older than this are stale: never shown as a currently purchasable price. */
export const SOURCE_FRESHNESS_DAYS = 60;

export type CompareOutcome =
  | { kind: 'ok'; result: ComparisonResult }
  | { kind: 'needs_input'; missing: MissingField[] }
  | { kind: 'ineligible'; reason: string };

const STRATEGY_META: Record<StrategyId, { title: string; description: string }> = {
  singles: { title: '逐項單買', description: '每段交通買單程（或刷 IC 卡），每個景點買門票。作為節省金額的基準。' },
  pass_first: { title: 'Pass 優先', description: '常見做法：每天直接買該城市的主要一日券，其餘再單買。' },
  optimized: { title: '最佳混合', description: '程式逐日比較所有可購買的票券組合（含多日券），取同等權益下的最低總價。' },
};

export function compareTickets(input: JpTicketInput, catalog: Catalog, asOf: string): CompareOutcome {
  const effectiveCatalog = applyCatalogSimulation(catalog, input);
  const index = indexCatalog(effectiveCatalog);
  const normalized = normalizeInput(input, index);
  if (normalized.kind !== 'ok') return normalized;
  const n = normalized.normalized;
  const soldOut = input.simulation?.soldOut ?? [];

  const base: Omit<OptimizeOptions, 'allowedProducts'> = {
    preferredTimes: n.preferredTimes,
    foreignPassport: n.foreignPassport,
    soldOut,
  };
  const runStrategy = (id: StrategyId, opts: OptimizeOptions): { strategy: StrategyResult; plans: CategoryPlan[] } => {
    const plans = n.travelers.map((g) => optimizeCategory(n, g.category, index, opts));
    return { strategy: buildStrategy(id, n, plans), plans };
  };

  const singles = runStrategy('singles', { ...base, allowedProducts: [] });
  const mainPasses = effectiveCatalog.products.filter((p) => p.mainPassFor);
  const passFirst = runStrategy('pass_first', { ...base, allowedProducts: mainPasses, forcedMainPass: true });
  if (passFirst.strategy.passes.length === 0) {
    passFirst.strategy.feasible = false;
    passFirst.strategy.infeasibleReason = '此行程沒有可套用的主要 Pass（可能不符資格、售罄或行程未使用涵蓋範圍）。';
  }
  const optimized = runStrategy('optimized', { ...base, allowedProducts: effectiveCatalog.products });

  const strategies = [singles.strategy, passFirst.strategy, optimized.strategy];
  const baselineCost = singles.strategy.total;
  // Prefer the simpler plan when a pass does not actually save money.
  const recommendedStrategyId: StrategyId = optimized.strategy.total < baselineCost ? 'optimized' : 'singles';
  const recommended = strategies.find((s) => s.id === recommendedStrategyId)!;

  const warnings = collectWarnings(n, index, optimized.plans, recommended, soldOut, baselineCost);
  const sources = snapshotSources(strategies, n, index, asOf);
  const usedByRecommended = new Set(recommended.lines.filter((l) => l.kind === 'pass').flatMap((l) => l.sourceIds));
  const stale = sources.filter((s) => s.freshness === 'stale');
  for (const s of stale.filter((x) => usedByRecommended.has(x.source.id))) {
    warnings.push({
      code: 'stale_source',
      severity: 'block',
      message: `推薦方案使用的來源「${s.source.title}」${staleReason(s)}，重新核對前不提供購買協助。`,
      refIds: [s.source.id],
    });
  }
  const staleOther = stale.filter((x) => !usedByRecommended.has(x.source.id));
  if (staleOther.length > 0) {
    warnings.push({
      code: 'stale_source',
      severity: 'warn',
      message: `${staleOther.map((s) => `「${s.source.title}」${staleReason(s)}`).join('；')}。相關價格僅供參考，不視為即時可購買價。`,
      refIds: staleOther.map((s) => s.source.id),
    });
  }

  const extracted = sources.filter((s) => s.source.verification === 'search_extract');
  if (extracted.length > 0) {
    warnings.push({
      code: 'source_quality',
      severity: 'info',
      message: `${extracted.length} 個來源的數字取自搜尋結果摘錄（未逐頁人工核對），正式使用前須抽查官方頁面。`,
      refIds: extracted.map((s) => s.source.id),
    });
  }
  const lowConfidence = sources.filter((s) => s.source.confidence === 'low');
  if (lowConfidence.length > 0) {
    warnings.push({
      code: 'source_quality',
      severity: 'warn',
      message: `可信度低的來源：${lowConfidence.map((s) => s.source.title).join('、')}。相關金額僅供參考。`,
      refIds: lowConfidence.map((s) => s.source.id),
    });
  }

  const nonEquivalentOptions = findNonEquivalentOptions(n, index, base, effectiveCatalog, recommended.total);

  return {
    kind: 'ok',
    result: {
      priceCalculationVersion: PRICE_CALCULATION_VERSION,
      catalogVersion: effectiveCatalog.version,
      asOf,
      normalizedInput: n,
      strategies,
      recommendedStrategyId,
      baselineCost,
      optimizedCost: recommended.total,
      estimatedSavings: Math.max(0, baselineCost - recommended.total),
      method: [
        '基準方案＝逐項單買：每段交通以單程估算票價、每個景點以來源標示的門票價計算。',
        '節省金額＝基準 − 推薦方案。只比較同等權益：每個方案都涵蓋同樣的景點與交通段數，差別只在用什麼票支付。',
        'Pass 組合以動態規劃逐日枚舉可購買的票券（含連續多日券與每設施限用次數），取總價最低者；平手時選購買項目較少者。',
        `價格與涵蓋範圍來自標示的來源與核對日期；超過 ${SOURCE_FRESHNESS_DAYS} 天未核對的來源視為過期，不得當成即時可購買價。`,
        '日期浮動票價（例如 USJ）與尚未核實的價格不計入方案比較，另外列出。',
        `全部由確定性程式計算，不由 AI 推測價格。計算版本 ${PRICE_CALCULATION_VERSION}，資料版本 ${effectiveCatalog.version}。`,
      ],
      nonEquivalentOptions,
      variableItems: collectVariableItems(n, index),
      warnings,
      sources,
      handoffAllowed: !warnings.some((w) => w.severity === 'block'),
    },
  };
}

function applyCatalogSimulation(catalog: Catalog, input: JpTicketInput): Catalog {
  const override = input.simulation?.catalogCheckedAtOverride;
  if (!override) return catalog;
  // Sources a person has re-verified since are exempt, so the stale-data replay can be resolved.
  return { ...catalog, sources: catalog.sources.map((s) => (s.verification === 'manual' ? s : { ...s, checkedAt: override })) };
}

function buildStrategy(id: StrategyId, n: NormalizedInput, plans: CategoryPlan[]): StrategyResult {
  const lines: CostLine[] = [];
  const passes: StrategyResult['passes'] = [];
  const perCategory: StrategyResult['perCategory'] = [];
  let total = 0;
  for (const plan of plans) {
    const count = n.travelers.find((g) => g.category === plan.category)!.count;
    for (const l of plan.lines) {
      lines.push({ ...l, quantity: l.quantity * count, subtotal: l.subtotal * count, note: joinNote(l.note, count) });
    }
    for (const p of plan.passes) passes.push({ ...p, category: plan.category, count });
    perCategory.push({ category: plan.category, count, perPerson: plan.perPersonTotal, subtotal: plan.perPersonTotal * count });
    total += plan.perPersonTotal * count;
  }
  lines.sort((a, b) => a.date.localeCompare(b.date) || kindOrder(a.kind) - kindOrder(b.kind) || catOrder(a.category) - catOrder(b.category));
  // Coverage is identical in shape across categories; show the first category's view.
  const coverage = plans[0]?.coverage ?? [];
  return { id, ...STRATEGY_META[id], total, perCategory, lines, passes, coverage, feasible: true };
}

function joinNote(note: string | undefined, count: number): string | undefined {
  if (count <= 1) return note;
  return [note, `× ${count} 人`].filter(Boolean).join('；');
}

const kindOrder = (k: CostLine['kind']) => ({ pass: 0, transit_single: 1, admission: 2 })[k];
const catOrder = (c: TravelerCategory) => ({ adult: 0, child: 1, infant: 2 })[c];

function collectWarnings(
  n: NormalizedInput,
  index: CatalogIndex,
  optimizedPlans: CategoryPlan[],
  recommended: StrategyResult,
  soldOut: Array<{ productId: string; date: string }>,
  baselineCost: number,
): ComparisonWarning[] {
  const warnings: ComparisonWarning[] = [];
  const add = (w: ComparisonWarning) => {
    if (!warnings.some((x) => x.code === w.code && x.message === w.message)) warnings.push(w);
  };

  const estimatedSystems = new Set<string>();
  for (const d of n.days) if (d.ridesEstimated) Object.keys(d.rides).forEach((s) => estimatedSystems.add(s));
  if (estimatedSystems.size > 0) {
    const parts = [...estimatedSystems].map((id) => {
      const t = index.transit(id as never);
      return `${t.name} 每段 ¥${t.estimateFare.adult}（官方 ¥${t.fareRange.adultMin}–¥${t.fareRange.adultMax}）`;
    });
    add({
      code: 'fare_estimate',
      severity: 'info',
      message: `交通段數依景點自動估算，單程以典型票價計：${parts.join('、')}。可在需求中修改段數；實際票價依起訖站。`,
    });
  }

  const notCovered: string[] = [];
  for (const d of n.days) {
    for (const id of d.attractions) {
      const a = index.attraction(id)!;
      const covering = index.catalog.products.filter((p) =>
        p.coverage.some((r) => r.included && r.target.type === 'attraction' && r.target.attractionId === id),
      );
      if (covering.length === 0 && a.admission !== 'free' && !notCovered.includes(id)) notCovered.push(id);
      if (a.reservationRequired) {
        add({ code: 'reservation_required', severity: 'info', message: `${a.name} 建議事先預約／購買指定日期票，現場可能售完。`, refIds: [id] });
      }
      const adultPrice = admissionPrice(a, 'adult', d.dayType);
      if (adultPrice.kind === 'dynamic') {
        add({ code: 'dynamic_pricing', severity: 'info', message: `${a.name} 採日期浮動票價，只能顯示區間，不計入方案比較。`, refIds: [id] });
      } else if (adultPrice.kind === 'unknown') {
        add({ code: 'unknown_price', severity: 'warn', message: `${a.name} 目前沒有經核實的門票價格，未計入總價（不會猜測）。`, refIds: [id] });
      }
    }
  }

  if (notCovered.length > 0) {
    add({
      code: 'not_covered',
      severity: 'info',
      message: `不在任何已收錄 Pass 涵蓋範圍內、需另外購票：${notCovered.map((id) => index.attraction(id)!.name).join('、')}。`,
      refIds: notCovered,
    });
  }

  const noChildTicket: string[] = [];
  for (const p of index.catalog.products) {
    if (!n.days.some((d) => isRelevant(p, d))) continue;
    if (p.eligibility.foreignPassportOnly && !n.foreignPassport) {
      add({ code: 'eligibility', severity: 'warn', message: `${p.name} 限持外國護照的短期旅客購買，你的條件不符，已排除。`, refIds: [p.id] });
    } else if (p.eligibility.foreignPassportOnly && recommended.passes.some((x) => x.productId === p.id)) {
      add({ code: 'eligibility', severity: 'info', message: `${p.name} 購買或使用時須出示護照（短期滯在）。${p.eligibility.note ?? ''}`, refIds: [p.id] });
    }
    if (n.travelers.some((g) => g.category === 'child') && p.prices.every((r) => r.child === null)) noChildTicket.push(p.id);
  }
  if (noChildTicket.length > 0) {
    add({
      code: 'child_pass_unavailable',
      severity: 'info',
      message: `${noChildTicket.map((id) => index.product(id)!.name).join('、')} 沒有兒童票，兒童改以單程／兒童一日券與兒童門票計算。`,
      refIds: noChildTicket,
    });
  }

  for (const d of n.days) {
    for (const id of d.attractions) {
      const maybe = index.catalog.products.filter((p) =>
        p.coverage.some((r) => r.included && r.confirmed === false && r.target.type === 'attraction' && r.target.attractionId === id),
      );
      if (maybe.length > 0) {
        add({
          code: 'coverage_unconfirmed',
          severity: 'info',
          message: `${index.attraction(id)!.name} 可能包含在 ${maybe.map((p) => p.name).join('、')} 內，但來源未確認，比較時保守以單買計算。`,
          refIds: [id, ...maybe.map((p) => p.id)],
        });
      }
    }
    for (const p of index.catalog.products) {
      if (!p.salesWindow || (d.date >= p.salesWindow.from && d.date <= p.salesWindow.to)) continue;
      if (!isRelevant(p, d)) continue;
      add({
        code: 'sales_window',
        severity: 'warn',
        message: `${p.name} 僅適用 ${p.salesWindow.from} 至 ${p.salesWindow.to}（${p.salesWindow.note}），${d.date} 不在範圍內，已排除。`,
        refIds: [p.id],
      });
    }
  }

  for (const s of soldOut) {
    const p = index.product(s.productId);
    if (p && n.days.some((d) => d.date === s.date)) {
      add({ code: 'sold_out', severity: 'warn', message: `${p.name} 在 ${s.date} 顯示售完／暫停販售，已從比較中排除。`, refIds: [p.id] });
    }
  }

  const misses = [...new Set(optimizedPlans.flatMap((p) => p.timeWindowMisses))];
  if (misses.length > 0) {
    add({
      code: 'time_window',
      severity: 'warn',
      message: `你偏好晚上前往 ${misses.map((id) => index.attraction(id)!.name).join('、')}，但 Pass 的免費入場有時段限制，已改以單買計算。`,
      refIds: misses,
    });
  }

  if (recommended.id === 'singles' && baselineCost > 0) {
    add({ code: 'no_savings', severity: 'info', message: '以此行程，任何 Pass 組合都沒有比逐項單買便宜，不建議購買 Pass。' });
  }
  return warnings;
}

function collectVariableItems(n: NormalizedInput, index: CatalogIndex): VariableItem[] {
  const items: VariableItem[] = [];
  for (const d of n.days) {
    for (const id of d.attractions) {
      const a = index.attraction(id)!;
      const prices = n.travelers.map((g) => ({ g, p: admissionPrice(a, g.category, d.dayType) }));
      const variable = prices.filter(({ p }) => p.kind === 'dynamic' || p.kind === 'unknown');
      if (variable.length === 0) continue;
      const isDynamic = variable.some(({ p }) => p.kind === 'dynamic');
      items.push({
        date: d.date,
        attractionId: id,
        label: a.name,
        reason: isDynamic ? 'dynamic_pricing' : 'unknown_price',
        note: isDynamic ? a.dynamicPrice!.note : '尚無經核實的價格，請以官方公告為準。',
        perCategory: variable.map(({ g, p }) => ({
          category: g.category,
          count: g.count,
          min: p.kind === 'dynamic' ? p.min : null,
          max: p.kind === 'dynamic' ? p.max : null,
        })),
      });
    }
  }
  return items;
}

function snapshotSources(strategies: StrategyResult[], n: NormalizedInput, index: CatalogIndex, asOf: string): SourceSnapshot[] {
  const ids = new Set<string>();
  for (const s of strategies) for (const l of s.lines) l.sourceIds.forEach((id) => ids.add(id));
  for (const d of n.days) {
    for (const a of d.attractions) index.attraction(a)!.sourceIds.forEach((id) => ids.add(id));
    for (const p of index.catalog.products) {
      if (p.coverage.some((r) => r.included && (r.target.type === 'attraction' ? d.attractions.includes(r.target.attractionId) : (d.rides[r.target.systemId] ?? 0) > 0))) {
        p.sourceIds.forEach((id) => ids.add(id));
      }
    }
  }
  return index.catalog.sources
    .filter((s) => ids.has(s.id))
    .map((source) => snapshotSource(source, asOf));
}

function staleReason(s: SourceSnapshot): string {
  return s.source.status === 'needs_review'
    ? `標記為需覆核（${s.source.notes ?? '資訊可能已變動'}）`
    : `已 ${s.ageDays} 天未核對（上限 ${SOURCE_FRESHNESS_DAYS} 天）`;
}

export function snapshotSource(source: PolicySource, asOf: string): SourceSnapshot {
  const ageDays = Math.max(0, daysBetween(source.checkedAt, asOf));
  return { source, ageDays, freshness: ageDays > SOURCE_FRESHNESS_DAYS || source.status === 'needs_review' ? 'stale' : 'fresh' };
}

/**
 * "Cheaper but different" options: re-run the optimizer with one condition relaxed and
 * report the difference. Never merged into the equivalent comparison.
 */
function findNonEquivalentOptions(
  n: NormalizedInput,
  index: CatalogIndex,
  base: Omit<OptimizeOptions, 'allowedProducts'>,
  catalog: Catalog,
  recommendedTotal: number,
): NonEquivalentOption[] {
  const options: NonEquivalentOption[] = [];
  const totalWith = (overrides: Partial<OptimizeOptions>, input: NormalizedInput = n) =>
    input.travelers.reduce((sum, g) => {
      const plan = optimizeCategory(input, g.category, index, { ...base, allowedProducts: catalog.products, ...overrides });
      return sum + plan.perPersonTotal * g.count;
    }, 0);

  if (n.preferredTimes === 'evening') {
    const total = totalWith({ preferredTimes: 'daytime' });
    if (total < recommendedTotal) {
      options.push({
        title: '改在白天前往有時段限制的設施',
        changedConditions: ['入場時間改在 Pass 免費時段內（不是你偏好的晚上）'],
        total,
        savingsVsRecommended: recommendedTotal - total,
      });
    }
  }
  if (!n.foreignPassport) {
    const total = totalWith({ foreignPassport: true });
    if (total < recommendedTotal) {
      options.push({
        title: '持外國護照（短期滯在）才可購買的旅客票券',
        changedConditions: ['需符合外國旅客購買資格；你目前填寫不符合'],
        total,
        savingsVsRecommended: recommendedTotal - total,
      });
    }
  }
  return options;
}
