import { useState, type ReactNode } from 'react';
import { CheckCircle2, CircleDot, ExternalLink, Hand, Lock, MonitorSmartphone, PauseCircle, Pencil, ShieldCheck, XCircle } from 'lucide-react';
import { APPROVAL_TTL_MINUTES, type ActionProposal, type StrategyId, type TaskView, type TravelerCategory } from '@/core';
import { useApi } from '@/api/ApiProvider';
import { ApiError } from '@/api/types';
import { Badge, Button, Card, CardBody, CardHeader, inputClass, Notice } from '@/components/ui';
import { CATEGORY_LABEL, dateTimeZh, dateZh, twd, yen } from '@/lib/format';
import { cn } from '@/lib/utils';

type Props = { task: TaskView; onChange: (t: TaskView) => void; onGoOutcome: () => void };

export function PlanPanel({ task, onChange, onGoOutcome }: Props) {
  const c = task.comparison;
  if (!c) return <Notice tone="info">還沒有比較結果。</Notice>;
  const live = task.actions.filter((a) => a.status !== 'superseded');
  const pending = live.filter((a) => a.status === 'pending_approval');
  const executed = live.filter((a) => a.status !== 'pending_approval');
  const canSelect = ['plan_ready', 'awaiting_user_approval', 'awaiting_external_response'].includes(task.status) && c.handoffAllowed;

  return (
    <div className="space-y-4">
      {canSelect && <StrategyChooser task={task} onChange={onChange} />}
      {!c.handoffAllowed && (
        <Notice tone="danger" title="暫停購買協助">
          推薦方案使用的來源已過期，需內部人員重新核對（可到「內部覆核」頁示範操作）。
        </Notice>
      )}
      {pending.map((a) => (
        <ApprovalCard key={a.id} task={task} action={a} onChange={onChange} />
      ))}
      {executed.map((a) => (
        <ExecutionCard key={a.id} action={a} />
      ))}
      {task.status === 'awaiting_external_response' && (
        <Card className="border-primary/40 bg-primary-soft/40">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">買好了嗎？</p>
              <p className="text-sm text-muted-foreground">上傳收據後，節省金額才會標記為「已驗證」。沒有收據只算「已送出」。</p>
            </div>
            <Button onClick={onGoOutcome}>回報購買結果</Button>
          </CardBody>
        </Card>
      )}
      {task.purchasePlan && <PurchaseList task={task} />}
      {task.purchasePlan && <WhoDoesWhat task={task} />}
      {task.purchasePlan && <FeeQuoteCard task={task} onChange={onChange} />}
    </div>
  );
}

function StrategyChooser({ task, onChange }: { task: TaskView; onChange: (t: TaskView) => void }) {
  const api = useApi();
  const c = task.comparison!;
  const [strategyId, setStrategyId] = useState<StrategyId>(task.selectedStrategyId ?? c.recommendedStrategyId);
  const [busy, setBusy] = useState<'assisted' | 'self' | null>(null);
  const [error, setError] = useState<string>();
  const choose = async (mode: 'assisted' | 'self') => {
    setBusy(mode);
    setError(undefined);
    try {
      onChange(await api.submitInput(task.id, { kind: 'select_strategy', strategyId, mode }));
      api.track('plan_view', task.id);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(null);
    }
  };
  const already = !!task.selectedStrategyId;
  return (
    <Card>
      <CardHeader
        title={already ? '更換方案' : '選擇方案，準備購買'}
        description="選擇方案不會購買任何東西。協助預填的每一個動作，都要你看過內容後逐一核准。"
      />
      <CardBody className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="方案">
          {c.strategies.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={strategyId === s.id}
              disabled={!s.feasible}
              onClick={() => setStrategyId(s.id)}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors disabled:opacity-40',
                strategyId === s.id ? 'border-primary bg-primary-soft' : 'hover:bg-muted',
              )}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {s.title}
                {s.id === c.recommendedStrategyId && <Badge tone="highlight">推薦</Badge>}
              </span>
              <span className="tabular mt-1 block text-lg font-black">{s.feasible ? yen(s.total) : '不適用'}</span>
            </button>
          ))}
        </div>
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => choose('assisted')} disabled={!!busy}>
            <MonitorSmartphone className="h-4 w-4" aria-hidden />
            {busy === 'assisted' ? '準備中…' : '請懶人包協助預填（逐項核准）'}
          </Button>
          <Button variant="outline" onClick={() => choose('self')} disabled={!!busy}>
            {busy === 'self' ? '準備中…' : '只要購買清單，我自己買'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ApprovalCard({ task, action, onChange }: { task: TaskView; action: ActionProposal; onChange: (t: TaskView) => void }) {
  const api = useApi();
  const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [quantities, setQuantities] = useState(action.payload.quantities);
  const [useDate, setUseDate] = useState(action.payload.useDate);
  const days = task.comparison!.normalizedInput.days.map((d) => d.date);

  const act = async (fn: () => Promise<TaskView>) => {
    setBusy(true);
    setError(undefined);
    try {
      onChange(await fn());
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const rows: Array<[string, ReactNode]> = [
    ['目標網站', <a key="u" href={action.target.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{action.target.site}<ExternalLink className="h-3 w-3" aria-hidden /></a>],
    ['網域', <code key="d" className="text-xs">{action.target.domain}</code>],
    ['實際內容', `${action.payload.productTitle}；${action.payload.quantities.map((q) => `${CATEGORY_LABEL[q.category]} ${q.count}`).join('、')}；使用日 ${dateZh(action.payload.useDate)}`],
    ['附件', action.attachments.length ? action.attachments.join('、') : '無（不會上傳任何文件或個資）'],
    ['金額', <span key="m" className="tabular font-bold">{yen(action.amount.amount)}</span>],
    ['執行者', action.executor],
    ['一定停在', action.stopsBefore.join('、') + ' 之前'],
  ];

  return (
    <Card className="border-highlight/50 ring-1 ring-highlight/30">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-highlight" aria-hidden />
            需要你核准：預填 {action.payload.productTitle}
          </span>
        }
        description={`第 ${action.revision} 版內容。核准只對這一版有效，${APPROVAL_TTL_MINUTES} 分鐘後失效；內容一改就要重新核准。`}
      />
      <CardBody className="space-y-4">
        <dl className="divide-y rounded-xl border text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="mb-1 text-sm font-medium">可能後果</p>
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
            {action.consequences.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" aria-hidden />
          核准綁定 actionId + payloadHash（{action.payloadHash.slice(0, 12)}…）+ 有效期限
        </p>

        {editing && (
          <div className="space-y-3 rounded-xl bg-muted p-3">
            <p className="text-sm font-medium">修改預填內容</p>
            {quantities.map((q, i) => (
              <label key={q.category} className="flex items-center justify-between gap-3 text-sm">
                {CATEGORY_LABEL[q.category as TravelerCategory]}
                <input
                  type="number"
                  min={0}
                  max={9}
                  value={q.count}
                  onChange={(e) => setQuantities(quantities.map((x, j) => (j === i ? { ...x, count: Number(e.target.value) } : x)))}
                  className={cn(inputClass, 'w-24')}
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 text-sm">
              使用日
              <select value={useDate} onChange={(e) => setUseDate(e.target.value)} className={cn(inputClass, 'w-44')}>
                {days.map((d) => (
                  <option key={d} value={d}>
                    {dateZh(d)}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    const t = await api.submitInput(task.id, { kind: 'edit_action', actionId: action.id, quantities, useDate });
                    setEditing(false);
                    setConfirmed(false);
                    return t;
                  })
                }
              >
                儲存修改
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                取消
              </Button>
            </div>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>我已看過上面的網站、內容與金額，同意懶人包只做預填，並在登入／付款前停下交還給我。</span>
        </label>
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button disabled={!confirmed || busy} onClick={() => act(() => api.approve(task.id, action.id, action.payloadHash, 'approve'))}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {busy ? '執行中…' : '核准並開始預填'}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => setEditing((e) => !e)}>
            <Pencil className="h-4 w-4" aria-hidden />
            修改內容
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => act(() => api.approve(task.id, action.id, action.payloadHash, 'reject'))}>
            不要，我自己來
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

const STEP_ICON = { ok: CheckCircle2, paused: PauseCircle, stopped: XCircle } as const;
const ACTION_STATUS: Record<string, { label: string; tone: 'success' | 'primary' | 'danger' | 'neutral' | 'warning' }> = {
  paused_for_user: { label: '已交還給你', tone: 'primary' },
  completed: { label: '完成', tone: 'success' },
  failed: { label: '已停止', tone: 'danger' },
  rejected: { label: '你已拒絕', tone: 'neutral' },
  executing: { label: '執行中', tone: 'warning' },
  approved: { label: '已核准', tone: 'success' },
  expired: { label: '已過期', tone: 'neutral' },
};

function ExecutionCard({ action }: { action: ActionProposal }) {
  const s = ACTION_STATUS[action.status] ?? { label: action.status, tone: 'neutral' as const };
  return (
    <Card>
      <CardHeader
        title={`預填：${action.payload.productTitle}`}
        description={`第 ${action.revision} 版 ・ ${yen(action.amount.amount)} ・ ${action.executor}`}
        action={<Badge tone={s.tone}>{s.label}</Badge>}
      />
      <CardBody className="space-y-3">
        {action.executionLog.length > 0 ? (
          <ol className="space-y-2">
            {action.executionLog.map((step, i) => {
              const Icon = STEP_ICON[step.result];
              return (
                <li key={i} className="flex gap-2.5 text-sm">
                  <Icon
                    className={cn('mt-0.5 h-4 w-4 shrink-0', step.result === 'ok' ? 'text-success' : step.result === 'paused' ? 'text-primary' : 'text-danger')}
                    aria-hidden
                  />
                  <div>
                    <p className="font-medium">{step.step}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.detail} ・ {dateTimeZh(step.at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">沒有執行紀錄（未核准的動作不會執行）。</p>
        )}
        {action.status === 'paused_for_user' && action.handoffUrl && (
          <Notice tone="info" title="接下來請你本人完成">
            <p>在官方網站登入、輸入 OTP（若有）並付款。懶人包不會看到你的密碼、OTP 或卡號。</p>
            <a href={action.handoffUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              前往官方網站
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </Notice>
        )}
      </CardBody>
    </Card>
  );
}

function PurchaseList({ task }: { task: TaskView }) {
  const plan = task.purchasePlan!;
  const strategy = task.comparison!.strategies.find((s) => s.id === plan.strategyId)!;
  return (
    <Card>
      <CardHeader title={`購買清單：${strategy.title}`} description="依順序完成。所有連結都是官方頁面。" />
      <CardBody className="space-y-3">
        {plan.items.length === 0 && <Notice tone="success">這個方案不需要事先買任何票券：交通刷 IC 卡或買單程，門票在現場購買。</Notice>}
        {plan.items.map((item) => (
          <div key={`${item.productId}-${item.useDate}`} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-primary">步驟 {item.order}</p>
                <p className="font-bold">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantities.map((q) => `${CATEGORY_LABEL[q.category]} ${q.count} × ${yen(q.unitPrice)}`).join('、')} ・ 使用日 {dateZh(item.useDate)}
                </p>
              </div>
              <p className="tabular text-xl font-black">{yen(item.amount)}</p>
            </div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">在哪裡買</p>
                <a href={item.channel.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  {item.channel.name}
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                {item.channel.notes && <p className="mt-0.5 text-xs text-muted-foreground">{item.channel.notes}</p>}
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">你需要做</p>
                <ul className="space-y-0.5">
                  {item.userMustDo.map((m) => (
                    <li key={m} className="flex gap-1.5">
                      <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {item.tips.length > 0 && <p className="mt-3 text-xs text-muted-foreground">注意：{item.tips.join('；')}</p>}
          </div>
        ))}
        <div className="flex flex-wrap justify-between gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
          <span>事先購買 {yen(plan.passTotal)}</span>
          <span>現場支付（交通／門票）約 {yen(plan.payOnSiteTotal)}</span>
          <span className="font-bold">合計 {yen(plan.passTotal + plan.payOnSiteTotal)}</span>
        </div>
      </CardBody>
    </Card>
  );
}

const WHO = {
  lazypack: { label: '懶人包自動', tone: 'primary' as const, icon: CircleDot },
  user_confirm: { label: '需要你確認', tone: 'highlight' as const, icon: ShieldCheck },
  user_only: { label: '只能你本人', tone: 'neutral' as const, icon: Hand },
};

function WhoDoesWhat({ task }: { task: TaskView }) {
  return (
    <Card>
      <CardHeader title="誰做什麼" description="外部不可逆的動作（登入、OTP、付款）一律由你本人在官方網站完成。" />
      <CardBody>
        <ul className="divide-y rounded-xl border text-sm">
          {task.purchasePlan!.automation.map((a) => {
            const w = WHO[a.who];
            return (
              <li key={a.step} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>{a.step}</span>
                <Badge tone={w.tone}>
                  <w.icon className="h-3 w-3" aria-hidden />
                  {w.label}
                </Badge>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function FeeQuoteCard({ task, onChange }: { task: TaskView; onChange: (t: TaskView) => void }) {
  const api = useApi();
  const q = task.purchasePlan!.feeQuote;
  const total = task.purchasePlan!.passTotal;
  const fx = q.fxAssumption;
  return (
    <Card>
      <CardHeader title="費用與報價" description="平台服務費與第三方費用分開列出。" />
      <CardBody className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">票券比較與購買清單</p>
            <p className="text-lg font-bold">{q.comparisonFeeTwd === 0 ? '免費' : twd(q.comparisonFeeTwd)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-muted-foreground">協助預填＋多站點追蹤</p>
            <p className="text-lg font-bold">{twd(q.assistedPrefillFeeTwd)}</p>
            <p className="text-xs text-muted-foreground">{q.assistedPrefillNote}</p>
          </div>
        </div>
        <p className="text-muted-foreground">
          第三方費用：{q.thirdPartyFees.length ? q.thirdPartyFees.map((f) => `${f.label} ${yen(f.amountJpy)}`).join('、') : '官方通路無額外手續費'}。
          若以台灣信用卡支付 {yen(total)}，約 {twd(total * fx.jpyToTwd * (1 + fx.foreignTxFeeRate))}（含 {(fx.foreignTxFeeRate * 100).toFixed(1)}% 海外手續費；{fx.note}）
        </p>
        {task.paymentIntent ? (
          <Notice tone="success">已記錄你的付費意向（{task.paymentIntent.tier}）。原型不會收費。</Notice>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => onChange(await api.submitInput(task.id, { kind: 'payment_intent', tier: `協助預填 NT$${q.assistedPrefillFeeTwd}` }))}
          >
            如果正式上線，我願意付 {twd(q.assistedPrefillFeeTwd)}（意向測試，不扣款）
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
