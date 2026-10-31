import { Check } from 'lucide-react';
import { statusBucket, statusLabel, type CompletionSubstate, type StatusBucket, type TaskStatus } from '@/core';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

const TONE: Record<StatusBucket, 'warning' | 'info' | 'primary' | 'highlight' | 'success' | 'danger'> = {
  needs_input: 'warning',
  in_progress: 'info',
  awaiting_approval: 'highlight',
  submitted: 'primary',
  resolved: 'success',
  stopped: 'danger',
};

export function StatusBadge({ status, sub }: { status: TaskStatus; sub?: CompletionSubstate }) {
  const bucket = statusBucket(status, sub);
  return <Badge tone={status === 'plan_ready' ? 'primary' : TONE[bucket]}>{statusLabel(status, sub)}</Badge>;
}

const STEPS: Array<{ bucket: StatusBucket; label: string }> = [
  { bucket: 'needs_input', label: '待補件' },
  { bucket: 'in_progress', label: '處理中' },
  { bucket: 'awaiting_approval', label: '待核准' },
  { bucket: 'submitted', label: '已送出' },
  { bucket: 'resolved', label: '已解決' },
];

/** The five P0 status buckets, shown as a progress rail. */
export function StatusStepper({ status, sub }: { status: TaskStatus; sub?: CompletionSubstate }) {
  const bucket = statusBucket(status, sub);
  const order = STEPS.findIndex((s) => s.bucket === bucket);
  // plan_ready sits between 處理中 and 待核准: the plan is done, the user picks next.
  const current = status === 'plan_ready' ? 1.5 : bucket === 'resolved' ? STEPS.length : order;
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="任務進度">
      {STEPS.map((s, i) => {
        const done = bucket !== 'stopped' && i < current;
        const active = bucket !== 'stopped' && i === current;
        return (
          <li key={s.bucket} className="min-w-0">
            <div className={cn('h-1.5 rounded-full', done ? 'bg-primary' : active ? 'bg-highlight' : 'bg-muted')} />
            <p
              className={cn(
                'mt-1.5 flex items-center gap-1 truncate text-[11px] sm:text-xs',
                active ? 'font-bold text-foreground' : done ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done && <Check className="h-3 w-3 shrink-0" aria-hidden />}
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
