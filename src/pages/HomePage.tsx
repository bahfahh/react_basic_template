import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PACKAGES, type PackageManifest } from '@/core';
import { PACK_META, STAGES } from '@/app/packMeta';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const VALUE_TONE = { 省錢: 'highlight', 省時間: 'info', 拿回錢: 'success' } as const;

export function HomePage() {
  const active = PACKAGES.filter((p) => p.status === 'active');
  const japan = active.filter((p) => PACK_META[p.id]?.stage);
  const others = active.filter((p) => !PACK_META[p.id]?.stage);
  const planned = PACKAGES.filter((p) => p.status === 'planned');

  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <Badge tone="primary">主題：日本自由行</Badge>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">去日本玩，省錢、省時間、把錢拿回來</h1>
        <p className="mt-3 text-muted-foreground sm:text-lg">
          從出發前到回國後，每一步都有一個懶人包。點一下交給你的 AI agent，它照著懶人包把事情做完，需要你決定的時候再回來問你。
        </p>
      </section>

      <section aria-label="日本自由行懶人包" className="space-y-8">
        {STAGES.map((stage, i) => {
          const packs = japan.filter((p) => PACK_META[p.id]?.stage === stage);
          if (packs.length === 0) return null;
          return (
            <div key={stage} className="grid gap-3 md:grid-cols-[9rem_1fr]">
              <div className="flex items-baseline gap-2 md:block">
                <p className="text-sm font-semibold text-primary">第 {i + 1} 站</p>
                <p className="text-lg font-black">{stage}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {packs.map((p) => (
                  <PackCard key={p.id} pkg={p} />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {others.length > 0 && (
        <section aria-label="其他懶人包" className="space-y-4 border-t pt-8">
          <div>
            <h2 className="text-lg font-black">其他懶人包</h2>
            <p className="text-sm text-muted-foreground">不屬於日本自由行，但已經可以用。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <PackCard key={p.id} pkg={p} />
            ))}
          </div>
        </section>
      )}

      {planned.length > 0 && (
        <section aria-label="規劃中" className="border-t pt-8">
          <h2 className="text-lg font-black">規劃中</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {planned.map((p) => (
              <li key={p.id}>
                <Link to={`/p/${p.id}`} className="inline-block rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function PackCard({ pkg }: { pkg: PackageManifest }) {
  const meta = PACK_META[pkg.id];
  const Icon = meta?.icon;
  return (
    <Link to={`/p/${pkg.id}`} className="group flex flex-col rounded-2xl border bg-card p-5 shadow-card transition-colors hover:border-primary/50">
      <div className="flex items-start justify-between gap-3">
        {Icon && (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
        {meta?.value && <Badge tone={VALUE_TONE[meta.value]}>{meta.value}</Badge>}
      </div>
      <p className="mt-4 font-bold">{pkg.title}</p>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{meta?.short ?? pkg.summary}</p>
      <span className={cn('mt-4 flex items-center gap-1 text-sm font-semibold text-primary')}>
        交給 AI
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
