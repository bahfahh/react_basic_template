import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Ban, ClipboardList, Pencil } from 'lucide-react';
import type { TaskEvent, TaskView } from '@/core';
import { useApi } from '@/api/ApiProvider';
import { useAsync } from '@/api/useAsync';
import { Button, buttonClass, Card, CardBody, EmptyState, Notice, Spinner, Tabs } from '@/components/ui';
import { BlockedNotice, CoverageCheck, ExtraItems, RecommendationHero, StrategyCards, Warnings } from '@/components/task/Comparison';
import { OutcomePanel } from '@/components/task/Outcome';
import { PlanPanel } from '@/components/task/Plan';
import { SourcesAndMethod } from '@/components/task/Sources';
import { StatusBadge, StatusStepper } from '@/components/task/Status';
import { Timeline } from '@/components/task/Timeline';
import { dateTimeZh } from '@/lib/format';

type Tab = 'compare' | 'plan' | 'outcome' | 'timeline' | 'sources';

export function TaskPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data: task, setData: setTask, error, loading } = useAsync(() => api.getTask(id), [id]);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const tab = (params.get('tab') as Tab) ?? defaultTab(task);

  useEffect(() => {
    if (task) void api.getEvents(task.id).then(setEvents);
  }, [api, task]);

  useEffect(() => {
    if (task?.comparison && tab === 'compare') api.track('eligibility_view', task.id);
  }, [api, task?.id, task?.comparison, tab]);

  if (loading && !task) return <Spinner />;
  if (error || !task) {
    return (
      <EmptyState title="找不到這個任務" action={<Link to="/tasks" className={buttonClass('outline')}>回我的任務</Link>}>
        任務不存在，或不屬於目前的帳號。
      </EmptyState>
    );
  }

  const setTab = (t: Tab) => setParams((p) => (p.set('tab', t), p), { replace: true });
  const update = (t: TaskView) => setTask(t);
  const pendingCount = task.actions.filter((a) => a.status === 'pending_approval').length;
  const terminal = ['completed', 'cancelled', 'expired'].includes(task.status);

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ClipboardList className="h-4 w-4" aria-hidden />
              日本票券省錢助手 v{task.packageVersion} ・ 建立於 {dateTimeZh(task.createdAt)} ・ 透過 {task.channel.toUpperCase()}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">{task.title}</h1>
          </div>
          <StatusBadge status={task.status} sub={task.completionSubstate} />
        </div>
        <StatusStepper status={task.status} sub={task.completionSubstate} />
      </div>

      <NextStep task={task} onTab={setTab} onEdit={() => navigate(`/start?task=${task.id}`)} />

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: 'compare', label: '比較結果' },
          {
            value: 'plan',
            label: '購買準備',
            badge: pendingCount ? <span className="rounded-full bg-highlight px-1.5 text-[10px] font-bold text-white">{pendingCount}</span> : undefined,
          },
          { value: 'outcome', label: '結果' },
          { value: 'timeline', label: '時間軸' },
          { value: 'sources', label: '來源與方法' },
        ]}
      />

      {tab === 'compare' &&
        (task.comparison ? (
          <div className="space-y-4">
            <BlockedNotice comparison={task.comparison} />
            <RecommendationHero comparison={task.comparison} />
            <StrategyCards comparison={task.comparison} />
            <ExtraItems comparison={task.comparison} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Warnings warnings={task.comparison.warnings} />
              <CoverageCheck strategy={task.comparison.strategies.find((s) => s.id === task.comparison!.recommendedStrategyId)!} />
            </div>
            {task.comparison.handoffAllowed && !terminal && (
              <Card>
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">看完比較了？下一步產生購買清單與官方連結，需要的話由懶人包協助預填。</p>
                  <Button onClick={() => setTab('plan')}>
                    準備購買
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Button>
                </CardBody>
              </Card>
            )}
          </div>
        ) : (
          <NoComparison task={task} />
        ))}
      {tab === 'plan' && <PlanPanel task={task} onChange={update} onGoOutcome={() => setTab('outcome')} />}
      {tab === 'outcome' && <OutcomePanel task={task} onChange={update} />}
      {tab === 'timeline' && <Timeline events={events} />}
      {tab === 'sources' && (task.comparison ? <SourcesAndMethod taskId={task.id} comparison={task.comparison} /> : <NoComparison task={task} />)}

      {!terminal && <CancelTask onConfirm={async () => update(await api.cancel(task.id))} />}
    </div>
  );
}

function CancelTask({ onConfirm }: { onConfirm: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setAsking(true)}>
          <Ban className="h-4 w-4" aria-hidden />
          取消任務
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <span className="text-muted-foreground">取消後，未執行的動作會作廢，核准一併失效。</span>
      <Button variant="danger" size="sm" onClick={() => void onConfirm()}>
        確定取消
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setAsking(false)}>
        保留任務
      </Button>
    </div>
  );
}

function defaultTab(task?: TaskView): Tab {
  if (!task) return 'compare';
  if (task.status === 'awaiting_user_approval') return 'plan';
  if (task.status === 'awaiting_external_response') return 'plan';
  if (task.status === 'completed') return 'outcome';
  return 'compare';
}

function NoComparison({ task }: { task: TaskView }) {
  return <Notice tone="info">{task.status === 'ineligible' ? task.statusReason : '補齊必要資料後，懶人包才會計算方案。'}</Notice>;
}

function NextStep({ task, onTab, onEdit }: { task: TaskView; onTab: (t: Tab) => void; onEdit: () => void }) {
  switch (task.status) {
    case 'needs_input':
      return (
        <Notice tone="warning" title="待補件：還缺這些資料才能比較">
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {task.missingFields.map((m) => (
              <li key={m.field + m.label}>
                <span className="font-medium">{m.label}</span>：{m.hint}
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-3" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden />
            補充資料
          </Button>
        </Notice>
      );
    case 'ineligible':
      return (
        <Notice tone="danger" title="不適用">
          <p>{task.statusReason ?? '此任務超出這個 Package 的範圍'}。因此不會產生任何價格。</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={onEdit}>
            修改行程
          </Button>
        </Notice>
      );
    case 'blocked':
      return (
        <Notice tone="danger" title="暫停：資料需要重新核對">
          {task.statusReason}。比較結果僅供參考，重新核對前不提供購買協助。
        </Notice>
      );
    case 'awaiting_user_approval':
      return (
        <Notice tone="warning" title="待核准">
          有預填動作等你確認。核准前不會執行任何外部操作。
          <button className="ml-2 font-semibold text-primary underline-offset-2 hover:underline" onClick={() => onTab('plan')}>
            去核准
          </button>
        </Notice>
      );
    case 'awaiting_external_response':
      return (
        <Notice tone="info" title="已交還給你">
          請在官方網站自行登入並付款；買好後上傳收據，節省金額才會被驗證。
        </Notice>
      );
    case 'failed':
      return <Notice tone="danger" title="執行失敗">{task.statusReason ?? '請查看時間軸。'}</Notice>;
    case 'expired':
      return <Notice tone="info" title="已過期">旅遊日期已過，任務自動結束。</Notice>;
    case 'cancelled':
      return <Notice tone="info" title="已取消">此任務已取消，未執行的動作都已作廢。</Notice>;
    default:
      return null;
  }
}
