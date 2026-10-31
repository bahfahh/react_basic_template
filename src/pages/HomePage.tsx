import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PACKAGES } from '@/core';
import { PACK_META } from '@/app/packMeta';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const STEPS = [
  { title: '選懶人包', body: '每個懶人包都是一份 AI 讀得懂的任務說明，附資料與規則。' },
  { title: '交給你的 AI', body: '一鍵把懶人包網址交給 Grok Bot、ChatGPT Dot 或 Claude Duet。' },
  { title: 'AI 接手做完', body: 'AI 照著懶人包問你、計算、整理結果；付款和登入前會先問你。' },
];

export function HomePage() {
  const packs = [...PACKAGES].sort((a, b) => (a.status === b.status ? 0 : a.status === 'active' ? -1 : 1));
  return (
    <div className="space-y-12">
      <section className="max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">把麻煩事打包，交給你的 AI</h1>
        <p className="mt-3 text-muted-foreground sm:text-lg">選一個懶人包，一鍵交給你的線上 agent。它會照著懶人包把事情做完，需要你決定的時候再回來問你。</p>
      </section>

      <section aria-label="懶人包">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((p) => {
            const meta = PACK_META[p.id];
            const Icon = meta?.icon;
            const active = p.status === 'active';
            return (
              <Link
                key={p.id}
                to={`/p/${p.id}`}
                className={cn(
                  'group flex flex-col rounded-2xl border bg-card p-5 transition-colors',
                  active ? 'shadow-card hover:border-primary/50' : 'opacity-70 hover:opacity-100',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  {Icon && (
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', active ? 'bg-primary-soft text-primary' : 'bg-muted text-muted-foreground')}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <Badge tone={active ? 'success' : 'neutral'}>{active ? '可以用' : '準備中'}</Badge>
                </div>
                <p className="mt-4 font-bold">{p.title}</p>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{meta?.short ?? p.summary}</p>
                {active && (
                  <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-primary">
                    交給 AI
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-label="怎麼運作" className="grid gap-6 border-t pt-8 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title}>
            <p className="text-sm font-semibold text-primary">步驟 {i + 1}</p>
            <p className="mt-1 font-bold">{s.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
