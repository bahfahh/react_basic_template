import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { useApi } from '@/api/ApiProvider';
import { useAsync } from '@/api/useAsync';
import { buttonClass, Card, CardBody, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { StatusBadge } from '@/components/task/Status';
import { dateTimeZh, yen } from '@/lib/format';

export function TaskListPage() {
  const api = useApi();
  const { data: tasks, loading } = useAsync(() => api.listTasks(), []);
  return (
    <div className="space-y-6">
      <PageHeader
        title="我的任務"
        description="每個任務都保留比較結果、核准紀錄與時間軸，可以隨時回來看。"
        action={
          <Link to="/start" className={buttonClass('primary')}>
            <Plus className="h-4 w-4" aria-hidden />
            新的比較
          </Link>
        }
      />
      {loading && !tasks ? (
        <Spinner />
      ) : !tasks?.length ? (
        <EmptyState title="還沒有任務" action={<Link to="/start" className={buttonClass('primary')}>開始第一個比較</Link>}>
          建立任務後，比較結果、待核准的動作與購買結果都會出現在這裡。
        </EmptyState>
      ) : (
        <div className="grid gap-3">
          {tasks.map((t) => (
            <Link key={t.id} to={`/tasks/${t.id}`} className="group">
              <Card className="transition-colors group-hover:border-primary/40">
                <CardBody className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">{t.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {dateTimeZh(t.createdAt)} 建立 ・ {t.channel.toUpperCase()}
                      {t.comparison ? ` ・ 預估省 ${yen(t.comparison.estimatedSavings)}` : ''}
                      {t.outcome?.verifiedSavings != null ? ` ・ 已驗證 ${yen(t.outcome.verifiedSavings)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} sub={t.completionSubstate} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
