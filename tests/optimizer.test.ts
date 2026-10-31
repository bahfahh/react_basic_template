import { describe, expect, it } from 'vitest';
import { CATALOG, compareTickets, SCENARIOS, type ComparisonResult } from '../src/core';
import { canonicalJson } from '../src/core/lib/hash';
import { MONDAY, TODAY, scenarioInput } from './helpers';

function ok(id: string): ComparisonResult {
  const r = compareTickets(scenarioInput(id), CATALOG, TODAY);
  if (r.kind !== 'ok') throw new Error(`${id}: ${r.kind}`);
  return r.result;
}

describe('P0 §11.6 #1 — hand-built itineraries', () => {
  it('has at least 10 itineraries covering the required cases', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(10);
    const tags = new Set(SCENARIOS.flatMap((s) => s.tests));
    for (const t of ['Pass 划算', 'Pass 不划算', '景點不涵蓋', '日期限制（平日／假日票價）', '不同人數與年齡', '售罄', '資料過期']) {
      expect(tags, t).toContain(t);
    }
  });

  for (const s of SCENARIOS.filter((x) => ['plan_ready', 'blocked'].includes(x.expect.status))) {
    it(`${s.id}: ${s.title}`, () => {
      const r = ok(s.id);
      const passIds = new Set(r.strategies.find((x) => x.id === r.recommendedStrategyId)!.passes.map((p) => p.productId));
      if (s.expect.recommended) expect(r.recommendedStrategyId).toBe(s.expect.recommended);
      for (const p of s.expect.passIncludes ?? []) expect(passIds).toContain(p);
      for (const p of s.expect.passExcludes ?? []) expect(passIds).not.toContain(p);
      for (const w of s.expect.warnings ?? []) expect(r.warnings.map((x) => x.code)).toContain(w);
      if (s.expect.savingsPositive) expect(r.estimatedSavings).toBeGreaterThan(0);
      expect(r.handoffAllowed).toBe(s.expect.status === 'plan_ready');
    });
  }

  it('needs_input and ineligible never produce prices', () => {
    expect(compareTickets(scenarioInput('missing-info'), CATALOG, TODAY).kind).toBe('needs_input');
    expect(compareTickets(scenarioInput('unsupported-city'), CATALOG, TODAY).kind).toBe('ineligible');
  });
});

describe('calculation rules', () => {
  it('hand-checked arithmetic: Osaka one day, 3 sights, 2 adults', () => {
    const r = ok('osaka-pass-wins');
    // Singles per adult: 4 metro rides × ¥240 + castle ¥1,200 + sky ¥2,000 + cruise ¥2,000 = ¥6,160
    expect(r.baselineCost).toBe(6160 * 2);
    // Amazing Pass 1-day covers metro + all three sights: ¥3,500 per adult
    expect(r.optimizedCost).toBe(3500 * 2);
    expect(r.estimatedSavings).toBe(5320);
  });

  it('family day trip matches the totals an agent got from the pack alone (blind test)', () => {
    const r = ok('osaka-kyoto-family');
    const total = (id: string) => r.strategies.find((s) => s.id === id)!.total;
    expect(total('singles')).toBe(20470);
    expect(total('pass_first')).toBe(16160);
    expect(total('optimized')).toBe(14980);
    expect(r.estimatedSavings).toBe(5490);
  });

  it('only compares equivalent rights: every strategy covers the same demands', () => {
    for (const s of SCENARIOS.filter((x) => x.expect.status === 'plan_ready')) {
      const r = ok(s.id);
      const shape = (id: string) => r.strategies.find((x) => x.id === id)!.coverage.map((c) => `${c.date}|${c.demand}`);
      expect(shape('optimized'), s.id).toEqual(shape('singles'));
    }
  });

  it('optimized is never more expensive than buying individually', () => {
    for (const s of SCENARIOS.filter((x) => x.expect.status === 'plan_ready')) {
      const r = ok(s.id);
      expect(r.optimizedCost, s.id).toBeLessThanOrEqual(r.baselineCost);
    }
  });

  it('is reproducible: same input + catalog → identical result', () => {
    const a = compareTickets(scenarioInput('osaka-two-days'), CATALOG, TODAY);
    const b = compareTickets(scenarioInput('osaka-two-days'), structuredClone(CATALOG), TODAY);
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it('never invents a price: unknown and dynamic prices are excluded from totals', () => {
    const r = ok('usj-not-covered');
    expect(r.variableItems.map((v) => v.attractionId)).toContain('usj');
    expect(r.strategies.every((s) => s.lines.every((l) => l.refId !== 'usj'))).toBe(true);
  });

  it('unconfirmed coverage does not count towards savings', () => {
    // Mark Tsutenkaku's pass coverage as unconfirmed and check it is priced as a single ticket.
    const catalog = structuredClone(CATALOG);
    for (const p of catalog.products) {
      for (const rule of p.coverage) {
        if (rule.target.type === 'attraction' && rule.target.attractionId === 'tsutenkaku') rule.confirmed = false;
      }
    }
    const res = compareTickets(scenarioInput('osaka-two-days'), catalog, TODAY);
    if (res.kind !== 'ok') throw new Error('expected ok');
    const optimized = res.result.strategies.find((s) => s.id === 'optimized')!;
    expect(optimized.lines.some((l) => l.refId === 'tsutenkaku' && l.kind === 'admission')).toBe(true);
    expect(res.result.warnings.some((w) => w.code === 'coverage_unconfirmed')).toBe(true);
    expect(ok('osaka-two-days').optimizedCost).toBeLessThan(res.result.optimizedCost);
  });

  it('weekday vs weekend prices differ for the same itinerary', () => {
    const weekend = scenarioInput('weekend-metro');
    const weekday = { ...weekend, travelDates: { start: MONDAY, end: MONDAY }, days: weekend.days!.map((d) => ({ ...d, date: MONDAY })) };
    const a = compareTickets(weekend, CATALOG, TODAY);
    const b = compareTickets(weekday, CATALOG, TODAY);
    if (a.kind !== 'ok' || b.kind !== 'ok') throw new Error('expected ok');
    expect(a.result.optimizedCost).toBe(620);
    expect(b.result.optimizedCost).toBe(820);
  });

  it('products outside their edition window are excluded with a warning', () => {
    const input = scenarioInput('osaka-pass-wins');
    const late = { ...input, travelDates: { start: '2027-04-06', end: '2027-04-06' }, days: input.days!.map((d) => ({ ...d, date: '2027-04-06' })) };
    const r = compareTickets(late, CATALOG, '2027-03-20');
    if (r.kind !== 'ok') throw new Error('expected ok');
    expect(r.result.warnings.some((w) => w.code === 'sales_window')).toBe(true);
    expect(r.result.strategies.flatMap((s) => s.passes).some((p) => p.productId === 'osaka_amazing_1d')).toBe(false);
  });

  it('evening preference yields a non-equivalent cheaper option, kept separate', () => {
    const r = ok('evening-view');
    expect(r.warnings.some((w) => w.code === 'time_window')).toBe(true);
    expect(r.nonEquivalentOptions.length).toBe(1);
    expect(r.nonEquivalentOptions[0].total).toBeLessThan(r.optimizedCost);
  });

  it('every priced line cites at least one source', () => {
    for (const s of SCENARIOS.filter((x) => x.expect.status === 'plan_ready')) {
      for (const st of ok(s.id).strategies) {
        for (const l of st.lines.filter((x) => x.unitPrice > 0)) expect(l.sourceIds.length, `${s.id}/${l.label}`).toBeGreaterThan(0);
      }
    }
  });
});
