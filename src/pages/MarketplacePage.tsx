import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Construction } from 'lucide-react';
import { useApi } from '@/api/ApiProvider';
import { useAsync } from '@/api/useAsync';
import { Badge, Card, CardBody, PageHeader, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

export function MarketplacePage() {
  const api = useApi();
  const { data: packages } = useAsync(() => api.listPackages(), []);
  const [category, setCategory] = useState<string>('all');
  if (!packages) return <Spinner />;
  const categories = [...new Map(packages.map((p) => [p.category, p.categoryLabel])).entries()];
  const shown = packages.filter((p) => category === 'all' || p.category === category);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Task Package Registry"
        title="懶人包市集"
        description="每個懶人包都是一份平台無關的任務規格：需要哪些資料、哪些動作要你核准、哪些事絕對不做，以及在各 Agent 平台實測到的相容等級。"
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="分類">
        {[['all', '全部'] as const, ...categories].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={category === value}
            onClick={() => setCategory(value)}
            className={cn('rounded-full border px-3 py-1 text-sm', category === value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted')}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p) => {
          const active = p.status === 'active';
          const best = p.compatibility.filter((c) => c.level === 'L4').length;
          return (
            <Card key={p.id} className={cn('flex flex-col', !active && 'opacity-90')}>
              <CardBody className="flex flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={active ? 'success' : 'neutral'}>{active ? '已上線（原型）' : '規劃中'}</Badge>
                  <span className="text-xs text-muted-foreground">v{p.version}</span>
                </div>
                <p className="mt-3 font-bold">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  <code>{p.id}</code> ・ {p.categoryLabel}
                </p>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.summary}</p>
                {!active && p.blockers && (
                  <p className="mt-3 flex gap-1.5 rounded-xl bg-muted p-2 text-xs text-muted-foreground">
                    <Construction className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    主要阻礙：{p.blockers}
                  </p>
                )}
                {active && (
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">{best} 個環境實測達 L4 端到端</span>
                    <Link to={`/marketplace/${p.id}`} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      規格與相容性
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
