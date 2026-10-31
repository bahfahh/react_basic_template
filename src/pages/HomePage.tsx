import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AREA_ORDER, AREAS, PACKS, PLANNED, STAGES, type Pack } from '@/packs';
import { iconFor } from '@/app/icons';
import { Badge } from '@/components/ui';

export const VALUE_TONE = { 省錢: 'highlight', 省時間: 'info', 拿回錢: 'success' } as const;

const byStage = (a: Pack, b: Pack) => STAGES.indexOf(a.stage ?? '出發前') - STAGES.indexOf(b.stage ?? '出發前');

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">把麻煩事交給你的 AI</h1>
        <p className="mt-3 text-muted-foreground sm:text-lg">
          每個懶人包都是一份給 AI 的做事方法。選一個交給 Grok、ChatGPT 或 Claude，它會先問你需要的資料，再到官方網站查最新的價格和規定、幫你比較。要付款或送出申請之前，它會先回來問你。
        </p>
      </section>

      {AREA_ORDER.map((area) => {
        const packs = PACKS.filter((p) => p.area === area);
        if (area === 'travel') packs.sort(byStage);
        const planned = PLANNED.filter((p) => p.area === area);
        if (!packs.length && !planned.length) return null;
        return (
          <section key={area} aria-labelledby={`area-${area}`} className="space-y-4">
            <div>
              <h2 id={`area-${area}`} className="text-xl font-black">
                {AREAS[area].title}
              </h2>
              <p className="text-sm text-muted-foreground">{AREAS[area].blurb}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((p) => (
                <PackCard key={p.id} pack={p} />
              ))}
            </div>
            {planned.length > 0 && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                規劃中：
                {planned.map((p) => (
                  <Link key={p.id} to={`/p/${p.id}`} className="rounded-full border bg-card px-3 py-0.5 hover:text-foreground">
                    {p.title}
                  </Link>
                ))}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PackCard({ pack }: { pack: Pack }) {
  const Icon = iconFor(pack.icon);
  return (
    <Link to={`/p/${pack.id}`} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-colors hover:border-primary/50">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex flex-wrap justify-end gap-1">
          {pack.value.map((v) => (
            <Badge key={v} tone={VALUE_TONE[v]}>
              {v}
            </Badge>
          ))}
        </span>
      </div>
      {pack.stage && <p className="mt-4 text-xs font-semibold text-primary">{pack.stage}</p>}
      <p className={pack.stage ? 'mt-0.5 font-bold' : 'mt-4 font-bold'}>{pack.title}</p>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{pack.short}</p>
      <span className="mt-4 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-primary">
          交給 AI
          <ArrowRight className="ml-1 inline h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
        <span className="text-xs text-muted-foreground">即時查 {pack.sources.length} 個來源</span>
      </span>
    </Link>
  );
}
