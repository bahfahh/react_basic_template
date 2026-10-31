import type {
  CostLine,
  CoverageCheckItem,
  CoverageRule,
  DayDemand,
  NormalizedInput,
  TicketProduct,
  TimePreference,
  TransitSystemId,
  TravelerCategory,
} from '../types';
import { admissionPrice, passPrice, transitFare, type CatalogIndex } from './pricing';

/**
 * Deterministic pass optimizer.
 *
 * Dynamic programming over calendar days. A state is the set of multi-day passes still
 * active (with remaining days and facilities already used). Each day we try every subset
 * of relevant passes to start that day, pay singles for whatever stays uncovered, and keep
 * the cheapest path per state. Ties prefer fewer purchases, then catalog order — so the
 * same inputs always produce the same plan.
 */

export interface OptimizeOptions {
  /** Products the strategy may buy. */
  allowedProducts: TicketProduct[];
  /** Products the strategy must buy on each day where they apply (naive "Pass-first"). */
  forcedMainPass?: boolean;
  preferredTimes: TimePreference;
  foreignPassport: boolean;
  soldOut: Array<{ productId: string; date: string }>;
}

export interface CategoryPlan {
  category: TravelerCategory;
  perPersonTotal: number;
  /** Lines are per person; the caller multiplies by head count. */
  lines: CostLine[];
  passes: Array<{ productId: string; startDate: string; coversDates: string[]; unitPrice: number }>;
  coverage: CoverageCheckItem[];
  /** Attraction visits where the pass coverage did not apply because of the time window. */
  timeWindowMisses: string[];
}

interface ActivePass {
  productId: string;
  startDate: string;
  remaining: number;
  used: Record<string, number>;
  coversDates: string[];
}

interface PathStep {
  lines: CostLine[];
  coverage: CoverageCheckItem[];
  started: Array<{ productId: string; unitPrice: number }>;
  timeWindowMisses: string[];
}

interface DPState {
  active: ActivePass[];
  cost: number;
  purchases: number;
  path: PathStep[];
}

const MAX_NEW_PASSES_PER_DAY = 3;

export function optimizeCategory(
  input: NormalizedInput,
  category: TravelerCategory,
  index: CatalogIndex,
  options: OptimizeOptions,
): CategoryPlan {
  let states: DPState[] = [{ active: [], cost: 0, purchases: 0, path: [] }];
  const order = new Map(index.catalog.products.map((p, i) => [p.id, i]));

  input.days.forEach((day, dayIdx) => {
    const daysLeft = input.days.length - dayIdx;
    const candidates = options.allowedProducts.filter((p) => isStartable(p, day, category, options) && isRelevant(p, day));
    const forced = options.forcedMainPass
      ? candidates.filter((p) => p.mainPassFor === day.city || (p.mainPassFor === 'intercity' && (day.rides.hankyu_intercity ?? 0) > 0))
      : [];
    const subsets = subsetsOf(candidates, MAX_NEW_PASSES_PER_DAY).filter((s) => forced.every((f) => s.includes(f)));

    const next = new Map<string, DPState>();
    for (const state of states) {
      for (const subset of subsets) {
        if (subset.some((p) => state.active.some((a) => a.productId === p.id))) continue;
        const startedPasses: ActivePass[] = subset.map((p) => {
          const span = Math.min(p.validity.days, daysLeft);
          return {
            productId: p.id,
            startDate: day.date,
            remaining: p.validity.days,
            used: {},
            coversDates: input.days.slice(dayIdx, dayIdx + span).map((d) => d.date),
          };
        });
        const active = [...state.active.map(clonePass), ...startedPasses].sort(
          (a, b) => a.remaining - b.remaining || (order.get(a.productId) ?? 0) - (order.get(b.productId) ?? 0),
        );
        const step = costDay(day, category, active, index, options.preferredTimes);
        let passCost = 0;
        const started = subset.map((p) => {
          const unitPrice = passPrice(p, category, day.dayType)!;
          passCost += unitPrice;
          step.lines.unshift({
            date: day.date,
            category,
            kind: 'pass',
            refId: p.id,
            label: p.name,
            unitPrice,
            quantity: 1,
            subtotal: unitPrice,
            sourceIds: p.sourceIds,
            note:
              p.validity.days > 1
                ? `連續 ${p.validity.days} 日有效${p.validity.days > daysLeft ? `；行程內只用到 ${daysLeft} 天，仍比其他組合便宜` : ''}`
                : undefined,
          });
          return { productId: p.id, unitPrice };
        });
        const remainingActive = active
          .map((a) => ({ ...a, remaining: a.remaining - 1 }))
          .filter((a) => a.remaining > 0);
        const candidate: DPState = {
          active: remainingActive,
          cost: state.cost + passCost + step.cost,
          purchases: state.purchases + subset.length,
          path: [...state.path, { lines: step.lines, coverage: step.coverage, started, timeWindowMisses: step.timeWindowMisses }],
        };
        const key = stateKey(remainingActive);
        const existing = next.get(key);
        if (!existing || better(candidate, existing)) next.set(key, candidate);
      }
    }
    states = [...next.values()];
  });

  const best = states.reduce((a, b) => (better(b, a) ? b : a));
  const passes: CategoryPlan['passes'] = [];
  best.path.forEach((step, dayIdx) => {
    for (const s of step.started) {
      const product = index.product(s.productId)!;
      const span = Math.min(product.validity.days, input.days.length - dayIdx);
      passes.push({
        productId: s.productId,
        startDate: input.days[dayIdx].date,
        coversDates: input.days.slice(dayIdx, dayIdx + span).map((d) => d.date),
        unitPrice: s.unitPrice,
      });
    }
  });

  return {
    category,
    perPersonTotal: best.cost,
    lines: best.path.flatMap((s) => s.lines),
    passes,
    coverage: best.path.flatMap((s) => s.coverage),
    timeWindowMisses: best.path.flatMap((s) => s.timeWindowMisses),
  };
}

function better(a: DPState, b: DPState): boolean {
  if (a.cost !== b.cost) return a.cost < b.cost;
  if (a.purchases !== b.purchases) return a.purchases < b.purchases;
  return pathSignature(a) < pathSignature(b);
}

function pathSignature(s: DPState): string {
  return s.path.map((p) => p.started.map((x) => x.productId).join('+')).join('|');
}

function stateKey(active: ActivePass[]): string {
  return active
    .map((a) => `${a.productId}:${a.remaining}:${Object.entries(a.used).sort().map(([k, v]) => `${k}=${v}`).join(',')}`)
    .sort()
    .join(';');
}

function clonePass(a: ActivePass): ActivePass {
  return { ...a, used: { ...a.used } };
}

function isStartable(p: TicketProduct, day: DayDemand, category: TravelerCategory, options: OptimizeOptions): boolean {
  if (p.eligibility.foreignPassportOnly && !options.foreignPassport) return false;
  if (passPrice(p, category, day.dayType) === null) return false;
  if (options.soldOut.some((s) => s.productId === p.id && s.date === day.date)) return false;
  if (p.salesWindow && (day.date < p.salesWindow.from || day.date > p.salesWindow.to)) return false;
  return true;
}

export function isRelevant(p: TicketProduct, day: DayDemand): boolean {
  return p.coverage.some((rule) => {
    if (!rule.included || rule.confirmed === false) return false;
    if (rule.target.type === 'transit') return (day.rides[rule.target.systemId] ?? 0) > 0;
    return day.attractions.includes(rule.target.attractionId);
  });
}

function subsetsOf<T>(items: T[], maxSize: number): T[][] {
  const out: T[][] = [[]];
  for (const item of items) {
    const len = out.length;
    for (let i = 0; i < len; i++) {
      if (out[i].length < maxSize) out.push([...out[i], item]);
    }
  }
  return out;
}

function findCoverage(product: TicketProduct, target: CoverageRule['target']): CoverageRule | undefined {
  return product.coverage.find((r) => {
    if (!r.included || r.confirmed === false || r.target.type !== target.type) return false;
    return r.target.type === 'transit'
      ? target.type === 'transit' && r.target.systemId === target.systemId
      : target.type === 'attraction' && r.target.attractionId === target.attractionId;
  });
}

function costDay(
  day: DayDemand,
  category: TravelerCategory,
  active: ActivePass[],
  index: CatalogIndex,
  preferredTimes: TimePreference,
): { cost: number; lines: CostLine[]; coverage: CoverageCheckItem[]; timeWindowMisses: string[] } {
  const lines: CostLine[] = [];
  const coverage: CoverageCheckItem[] = [];
  const timeWindowMisses: string[] = [];
  let cost = 0;

  for (const [systemId, count] of Object.entries(day.rides) as Array<[TransitSystemId, number]>) {
    if (!count) continue;
    const system = index.transit(systemId);
    const pass = active.find((a) => findCoverage(index.product(a.productId)!, { type: 'transit', systemId }));
    if (pass) {
      coverage.push({ date: day.date, demand: `${system.name} × ${count} 段`, coveredBy: index.product(pass.productId)!.name });
      continue;
    }
    const fare = transitFare(system, category);
    cost += fare * count;
    lines.push({
      date: day.date,
      category,
      kind: 'transit_single',
      refId: systemId,
      label: `${system.name} 單程`,
      unitPrice: fare,
      quantity: count,
      subtotal: fare * count,
      sourceIds: system.sourceIds,
      note: category === 'infant' ? '幼兒隨行免費' : `估算：每段 ¥${fare}（官方區間 ¥${system.fareRange.adultMin}–¥${system.fareRange.adultMax}）`,
    });
    coverage.push({ date: day.date, demand: `${system.name} × ${count} 段`, coveredBy: '單程票／IC 卡' });
  }

  for (const attractionId of day.attractions) {
    const attraction = index.attraction(attractionId)!;
    let coveredBy: string | undefined;
    for (const pass of active) {
      const product = index.product(pass.productId)!;
      const rule = findCoverage(product, { type: 'attraction', attractionId });
      if (!rule) continue;
      if (rule.usageLimit !== undefined && (pass.used[attractionId] ?? 0) >= rule.usageLimit) continue;
      if (rule.timeWindow?.excludesEvening && preferredTimes === 'evening') {
        timeWindowMisses.push(attractionId);
        continue;
      }
      pass.used[attractionId] = (pass.used[attractionId] ?? 0) + 1;
      coveredBy = product.name;
      break;
    }
    if (coveredBy) {
      coverage.push({ date: day.date, demand: attraction.name, coveredBy });
      continue;
    }
    const price = admissionPrice(attraction, category, day.dayType);
    if (price.kind === 'fixed') {
      cost += price.price;
      lines.push({
        date: day.date,
        category,
        kind: 'admission',
        refId: attractionId,
        label: `${attraction.name} 門票`,
        unitPrice: price.price,
        quantity: 1,
        subtotal: price.price,
        sourceIds: attraction.sourceIds,
      });
      coverage.push({ date: day.date, demand: attraction.name, coveredBy: '單買門票' });
    } else if (price.kind === 'free') {
      coverage.push({ date: day.date, demand: attraction.name, coveredBy: '免門票' });
    } else {
      coverage.push({ date: day.date, demand: attraction.name, coveredBy: price.kind === 'dynamic' ? '另購（日期浮動票價）' : '另購（價格未核實）' });
    }
  }

  return { cost, lines, coverage, timeWindowMisses };
}
