import type { CompletionSubstate, TaskStatus } from '../types';
import { LazyPackError } from './errors';

/** Allowed transitions (spec §4.4). Anything else is rejected by the service. */
export const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ['needs_input', 'collecting_evidence', 'ineligible', 'cancelled'],
  needs_input: ['collecting_evidence', 'ineligible', 'cancelled', 'expired'],
  collecting_evidence: ['evaluating', 'needs_input', 'ineligible', 'blocked', 'failed', 'cancelled'],
  evaluating: ['plan_ready', 'blocked', 'failed'],
  plan_ready: ['awaiting_user_approval', 'awaiting_external_response', 'collecting_evidence', 'completed', 'cancelled', 'expired'],
  awaiting_user_approval: ['executing', 'plan_ready', 'awaiting_external_response', 'collecting_evidence', 'cancelled', 'expired'],
  executing: ['awaiting_external_response', 'awaiting_user_approval', 'failed'],
  awaiting_external_response: ['completed', 'plan_ready', 'awaiting_user_approval', 'collecting_evidence', 'failed', 'cancelled', 'expired'],
  blocked: ['collecting_evidence', 'cancelled', 'expired'],
  failed: ['collecting_evidence', 'cancelled'],
  ineligible: ['collecting_evidence', 'cancelled'],
  completed: [],
  cancelled: [],
  expired: [],
};

export const TERMINAL: TaskStatus[] = ['completed', 'cancelled', 'expired'];

export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new LazyPackError('invalid_transition', `不允許的狀態轉換：${from} → ${to}`, { from, to });
  }
}

/** The five user-facing buckets required by P0 (待補件／待核准／處理中／已送出／已解決) plus edge states. */
export type StatusBucket = 'needs_input' | 'awaiting_approval' | 'in_progress' | 'submitted' | 'resolved' | 'stopped';

export function statusBucket(status: TaskStatus, sub?: CompletionSubstate): StatusBucket {
  switch (status) {
    case 'needs_input':
      return 'needs_input';
    case 'awaiting_user_approval':
      return 'awaiting_approval';
    case 'awaiting_external_response':
      return 'submitted';
    case 'completed':
      return sub === 'submitted' ? 'submitted' : 'resolved';
    case 'blocked':
    case 'failed':
    case 'cancelled':
    case 'expired':
    case 'ineligible':
      return 'stopped';
    default:
      return 'in_progress';
  }
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  draft: '草稿',
  needs_input: '待補件',
  collecting_evidence: '處理中・收集來源',
  evaluating: '處理中・計算方案',
  plan_ready: '方案已備妥',
  awaiting_user_approval: '待核准',
  executing: '處理中・預填中',
  awaiting_external_response: '已交還・待你完成購買',
  completed: '已完成',
  blocked: '暫停・需覆核',
  failed: '失敗',
  cancelled: '已取消',
  expired: '已過期',
  ineligible: '不適用',
};

export const SUBSTATE_LABEL: Record<CompletionSubstate, string> = {
  submitted: '已送出（未驗證）',
  resolved_success: '已解決・節省已驗證',
  resolved_no_recovery: '已解決・無節省',
};

export function statusLabel(status: TaskStatus, sub?: CompletionSubstate): string {
  return status === 'completed' && sub ? SUBSTATE_LABEL[sub] : STATUS_LABEL[status];
}
