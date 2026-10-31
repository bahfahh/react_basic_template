import { useState } from 'react';
import { ArrowRight, ChevronDown, CircleSlash, Info, Scale, Sparkles, TriangleAlert } from 'lucide-react';
import type { ComparisonView, ComparisonWarning, CostLine, StrategyResult } from '@/core';
import { Badge, Button, Card, CardBody, CardHeader, Notice, Stat } from '@/components/ui';
import { CATEGORY_LABEL, dateZh, yen } from '@/lib/format';
import { cn } from '@/lib/utils';

export function RecommendationHero({ comparison }: { comparison: ComparisonView }) {
  const singles = comparison.recommendedStrategyId === 'singles';
  const rec = comparison.strategies.find((s) => s.id === comparison.recommendedStrategyId)!;
  const people = comparison.normalizedInput.travelers.reduce((s, g) => s + g.count, 0);
  return (
    <Card className="overflow-hidden">
      <div className={cn('px-5 py-4', singles ? 'bg-muted' : 'bg-highlight-soft')}>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          {singles ? <CircleSlash className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4 text-highlight" aria-hidden />}
          {singles ? '這個行程不需要買 Pass' : `建議：${rec.title}`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {singles
            ? '逐項單買（或刷 IC 卡）就是最省的方式，任何 Pass 組合都不會更便宜。'
            : `${rec.passes.length ? [...new Set(rec.passes.map((p) => p.productId))].length : 0} 種票券組合，其他交通與門票現場支付。`}
        </p>
      </div>
      <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="逐項單買（基準）" value={yen(comparison.baselineCost)} tone={singles ? undefined : 'muted'} />
        <Stat label={singles ? '推薦方案' : rec.title} value={yen(comparison.optimizedCost)} sub={`${people} 人合計`} />
        <Stat
          label="預估可省"
          value={yen(comparison.estimatedSavings)}
          tone={comparison.estimatedSavings > 0 ? 'highlight' : undefined}
          sub="購買前估算，不計入已實現節省"
        />
        <Stat
          label="每人"
          value={rec.perCategory.map((c) => `${CATEGORY_LABEL[c.category]} ${yen(c.perPerson)}`).join(' / ') || '—'}
          sub={`查詢日 ${comparison.asOf}`}
        />
      </CardBody>
    </Card>
  );
}

export function StrategyCards({ comparison, selected, onSelect }: { comparison: ComparisonView; selected?: string; onSelect?: (id: StrategyResult['id']) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {comparison.strategies.map((s) => (
        <StrategyCard
          key={s.id}
          strategy={s}
          baseline={comparison.baselineCost}
          recommended={s.id === comparison.recommendedStrategyId}
          selected={selected === s.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function StrategyCard({
  strategy,
  baseline,
  recommended,
  selected,
  onSelect,
}: {
  strategy: StrategyResult;
  baseline: number;
  recommended: boolean;
  selected: boolean;
  onSelect?: (id: StrategyResult['id']) => void;
}) {
  const [open, setOpen] = useState(false);
  const diff = strategy.total - baseline;
  const passNames = [...new Set(strategy.lines.filter((l) => l.kind === 'pass').map((l) => l.label))];
  return (
    <Card className={cn('flex flex-col', recommended && 'ring-2 ring-highlight/60', selected && 'ring-2 ring-primary')}>
      <CardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {strategy.title}
            {recommended && <Badge tone="highlight">推薦</Badge>}
            {strategy.id === 'singles' && <Badge>基準</Badge>}
          </span>
        }
        description={strategy.description}
      />
      <CardBody className="flex flex-1 flex-col gap-3">
        {strategy.feasible ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="tabular text-2xl font-black">{yen(strategy.total)}</span>
              {strategy.id !== 'singles' && (
                <span className={cn('tabular text-sm font-semibold', diff < 0 ? 'text-success' : diff > 0 ? 'text-danger' : 'text-muted-foreground')}>
                  {diff < 0 ? `省 ${yen(-diff)}` : diff > 0 ? `多花 ${yen(diff)}` : '與單買相同'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {passNames.length ? passNames.map((n) => <Badge key={n} tone="primary">{n}</Badge>) : <Badge>不買 Pass</Badge>}
            </div>
            <button
              className="mt-auto flex items-center gap-1 text-sm font-medium text-primary"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
            >
              {open ? '收起明細' : '看計算明細'}
              <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
            </button>
            {open && <CostLines lines={strategy.lines} />}
            {onSelect && (
              <Button variant={selected ? 'primary' : 'outline'} size="sm" onClick={() => onSelect(strategy.id)}>
                {selected ? '已選擇' : '選這個方案'}
              </Button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{strategy.infeasibleReason}</p>
        )}
      </CardBody>
    </Card>
  );
}

export function CostLines({ lines }: { lines: CostLine[] }) {
  const byDate = new Map<string, CostLine[]>();
  for (const l of lines) byDate.set(l.date, [...(byDate.get(l.date) ?? []), l]);
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">沒有需要付費的項目。</p>;
  return (
    <div className="space-y-3 text-sm">
      {[...byDate.entries()].map(([date, items]) => (
        <div key={date}>
          <p className="mb-1 text-xs font-semibold text-muted-foreground">{dateZh(date)}</p>
          <ul className="divide-y rounded-xl border">
            {items.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {l.label}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">{CATEGORY_LABEL[l.category]}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {yen(l.unitPrice)} × {l.quantity}
                    {l.note ? ` ・ ${l.note}` : ''}
                  </p>
                </div>
                <span className="tabular shrink-0 font-semibold">{yen(l.subtotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const SEVERITY_ICON = { block: TriangleAlert, warn: TriangleAlert, info: Info } as const;

export function Warnings({ warnings }: { warnings: ComparisonWarning[] }) {
  const order = { block: 0, warn: 1, info: 2 };
  const sorted = [...warnings].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <Card>
      <CardHeader title="限制與不確定性" description="每一項都影響你能不能照這個價格買到。" />
      <CardBody>
        <ul className="space-y-2">
          {sorted.map((w, i) => {
            const Icon = SEVERITY_ICON[w.severity];
            return (
              <li
                key={i}
                className={cn(
                  'flex gap-2.5 rounded-xl px-3 py-2 text-sm',
                  w.severity === 'block' ? 'bg-danger-soft' : w.severity === 'warn' ? 'bg-warning-soft' : 'bg-muted',
                )}
              >
                <Icon
                  className={cn('mt-0.5 h-4 w-4 shrink-0', w.severity === 'block' ? 'text-danger' : w.severity === 'warn' ? 'text-warning' : 'text-muted-foreground')}
                  aria-label={w.severity === 'block' ? '阻擋' : w.severity === 'warn' ? '注意' : '說明'}
                />
                <span>{w.message}</span>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

export function ExtraItems({ comparison }: { comparison: ComparisonView }) {
  if (comparison.nonEquivalentOptions.length === 0 && comparison.variableItems.length === 0) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {comparison.nonEquivalentOptions.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader title="較便宜，但條件不同" description="不列入上方的同等權益比較；要不要接受由你決定。" />
          <CardBody className="space-y-3">
            {comparison.nonEquivalentOptions.map((o, i) => (
              <div key={i} className="rounded-xl bg-warning-soft p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{o.title}</p>
                  <p className="tabular font-bold">{yen(o.total)}</p>
                </div>
                <p className="mt-1 text-muted-foreground">再省 {yen(o.savingsVsRecommended)}；需要：{o.changedConditions.join('、')}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
      {comparison.variableItems.length > 0 && (
        <Card>
          <CardHeader title="另需支付（不納入比較）" description="日期浮動或尚未核實的價格，任何方案都要另外付。" />
          <CardBody className="space-y-2 text-sm">
            {comparison.variableItems.map((v, i) => (
              <div key={i} className="rounded-xl border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{v.label}</p>
                  <Badge tone={v.reason === 'dynamic_pricing' ? 'info' : 'warning'}>{v.reason === 'dynamic_pricing' ? '日期浮動' : '價格未核實'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {v.perCategory
                    .map(
                      (c) =>
                        `${CATEGORY_LABEL[c.category]}×${c.count}：${c.min === null ? '未知' : c.max === null ? `${yen(c.min)} 起` : `${yen(c.min)}–${yen(c.max)}`}`,
                    )
                    .join('、')}
                  {' ・ '}
                  {v.note}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export function CoverageCheck({ strategy }: { strategy: StrategyResult }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" aria-hidden />
            同等權益檢查
          </span>
        }
        description="每個方案都涵蓋同樣的景點與交通段數，差別只在用什麼票支付。"
      />
      <CardBody>
        <ul className="divide-y rounded-xl border text-sm">
          {strategy.coverage.map((c, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-3 py-2">
              <span>
                <span className="mr-2 text-xs text-muted-foreground">{dateZh(c.date)}</span>
                {c.demand}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowRight className="h-3 w-3" aria-hidden />
                {c.coveredBy}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export function BlockedNotice({ comparison }: { comparison: ComparisonView }) {
  if (comparison.handoffAllowed) return null;
  return (
    <Notice tone="danger" title="暫停購買協助">
      推薦方案使用的資料來源已過期或需覆核。你仍可參考比較結果，但在內部人員重新核對前，懶人包不會提供購買協助，也不會把這些價格當成即時可購買價。
    </Notice>
  );
}
