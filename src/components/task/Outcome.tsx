import { useRef, useState } from 'react';
import { BadgeCheck, FileUp, Paperclip } from 'lucide-react';
import type { TaskView } from '@/core';
import { useApi } from '@/api/ApiProvider';
import type { ApiError } from '@/api/types';
import { Badge, Button, Card, CardBody, CardHeader, Field, inputClass, Notice, Stat } from '@/components/ui';
import { dateTimeZh, yen } from '@/lib/format';
import { cn } from '@/lib/utils';

type Props = { task: TaskView; onChange: (t: TaskView) => void };

export function OutcomePanel({ task, onChange }: Props) {
  if (task.outcome) return <OutcomeResult task={task} />;
  if (!['awaiting_external_response', 'plan_ready'].includes(task.status) || !task.comparison) {
    return <Notice tone="info">先完成比較並選擇方案，才能回報購買結果。</Notice>;
  }
  return <OutcomeForm task={task} onChange={onChange} />;
}

function OutcomeResult({ task }: { task: TaskView }) {
  const o = task.outcome!;
  const verified = o.confidence === 'verified';
  return (
    <Card>
      <CardHeader
        title="結果"
        description={o.note}
        action={<Badge tone={verified ? 'success' : o.substate === 'submitted' ? 'primary' : 'neutral'}>{verified ? '已驗證' : o.substate === 'submitted' ? '已送出・未驗證' : '無節省'}</Badge>}
      />
      <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="購買前預估節省" value={yen(o.estimatedSavings)} sub="估算值，不計入北極星" />
        <Stat
          label="已驗證節省"
          value={o.verifiedSavings === null ? '—' : yen(o.verifiedSavings)}
          tone={verified ? 'success' : undefined}
          sub={verified ? `收據驗證於 ${dateTimeZh(o.verifiedAt!)}` : '需要收據與你的確認'}
        />
        <Stat label="自述實付" value={o.claimedPaid === null ? '—' : yen(o.claimedPaid)} />
        <Stat label="驗證方式" value={{ receipt_upload: '收據', user_statement: '自述', none: '無' }[o.verificationType]} sub={`證明 ${o.evidenceRef.length} 份`} />
      </CardBody>
    </Card>
  );
}

function OutcomeForm({ task, onChange }: Props) {
  const api = useApi();
  const plan = task.purchasePlan;
  const [purchased, setPurchased] = useState<boolean | null>(plan && plan.items.length > 0 ? null : false);
  const [paid, setPaid] = useState<string>(plan ? String(plan.passTotal) : '');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<TaskView>) => {
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

  const upload = (file: File) =>
    run(() => api.addEvidence(task.id, { fileName: file.name, sizeBytes: file.size, mimeType: file.type || 'application/octet-stream', kind: 'receipt' }));

  const noPassNeeded = !!plan && plan.items.length === 0;

  return (
    <Card>
      <CardHeader title="回報購買結果" description="「已送出」不等於「已省到錢」：只有附收據並經你確認的購買，才會計入已驗證節省。" />
      <CardBody className="space-y-5">
        {noPassNeeded ? (
          <Notice tone="success" title="這個方案不需要事先購買">
            照著行程刷 IC 卡或買單程即可。按下方按鈕結束任務；避免的支出另計，不算入已驗證節省。
          </Notice>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">你買了推薦的票券嗎？</legend>
            <div className="flex gap-2">
              {[
                { v: true, label: '已購買' },
                { v: false, label: '沒有買' },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  onClick={() => setPurchased(o.v)}
                  aria-pressed={purchased === o.v}
                  className={cn('rounded-xl border px-4 py-2 text-sm font-medium', purchased === o.v ? 'border-primary bg-primary-soft text-primary' : 'hover:bg-muted')}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {purchased && (
          <>
            <Field label="實際支付金額（日圓，只算事先購買的票券）" htmlFor="paid" hint={plan ? `購買清單金額：${yen(plan.passTotal)}` : undefined}>
              <input id="paid" type="number" inputMode="numeric" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} className={cn(inputClass, 'max-w-xs')} />
            </Field>
            <div className="space-y-2">
              <p className="text-sm font-medium">收據或購買確認</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                  e.target.value = '';
                }}
              />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <FileUp className="h-4 w-4" aria-hidden />
                上傳收據（圖片或 PDF，10MB 內）
              </Button>
              <p className="text-xs text-muted-foreground">原型只記錄檔名與大小，不保存檔案內容；正式版存放於加密私有空間，30 天後刪除。請先遮住卡號。</p>
              {task.evidence.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {task.evidence.map((e) => (
                    <li key={e.id} className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                      {e.fileName}
                      <span className="text-xs text-muted-foreground">{Math.ceil(e.sizeBytes / 1024)} KB</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              <span>以上金額與收據屬實，同意懶人包用來計算已驗證節省（匿名統計）。</span>
            </label>
            {task.evidence.length === 0 && <Notice tone="warning">沒有收據也可以送出，但結果只會標記為「已送出（未驗證）」。</Notice>}
          </>
        )}

        {error && <Notice tone="danger">{error}</Notice>}
        <Button
          disabled={busy || purchased === null || (purchased === true && paid === '')}
          onClick={() =>
            run(() =>
              api.submitOutcome(task.id, {
                purchased: !!purchased,
                actualPaidJpy: purchased ? Number(paid) : undefined,
                evidenceIds: task.evidence.map((e) => e.id),
                confirm,
              }),
            )
          }
        >
          <BadgeCheck className="h-4 w-4" aria-hidden />
          {noPassNeeded ? '完成任務' : '送出結果'}
        </Button>
      </CardBody>
    </Card>
  );
}
