import { STATUS_LABEL, statusBucket, statusLabel } from './stateMachine';
import type { ComparisonRun, Task } from '../types';

export type ComparisonView = Omit<ComparisonRun, 'catalogSnapshot'>;
export type TaskView = Omit<Task, 'comparison'> & { comparison?: ComparisonView };

/** API view: everything the owner may see, minus the bulky catalog snapshot. */
export function toTaskView(task: Task): TaskView {
  if (!task.comparison) return task as TaskView;
  const { catalogSnapshot: _snapshot, ...comparison } = task.comparison;
  return { ...task, comparison };
}

/**
 * Compact view for third-party agents (data minimisation, spec §6.5): no evidence file
 * names, no free-text notes, no simulation knobs — just what an agent needs to explain
 * status and next steps to the user.
 */
export function toAgentSummary(task: Task, webBaseUrl: string) {
  const c = task.comparison;
  return {
    id: task.id,
    title: task.title,
    packageId: task.packageId,
    status: task.status,
    statusLabel: statusLabel(task.status, task.completionSubstate),
    bucket: statusBucket(task.status, task.completionSubstate),
    completionSubstate: task.completionSubstate ?? null,
    statusReason: task.statusReason ?? null,
    missingFields: task.missingFields,
    webUrl: `${webBaseUrl}/tasks/${task.id}`,
    comparison: c
      ? {
          asOf: c.asOf,
          recommendedStrategyId: c.recommendedStrategyId,
          baselineCostJpy: c.baselineCost,
          recommendedCostJpy: c.optimizedCost,
          estimatedSavingsJpy: c.estimatedSavings,
          estimatedSavingsNote: '購買前的估算，不是已實現節省。',
          strategies: c.strategies.map((s) => ({ id: s.id, title: s.title, totalJpy: s.total, feasible: s.feasible, passes: s.passes })),
          warnings: c.warnings.map((w) => ({ code: w.code, severity: w.severity, message: w.message })),
          sources: c.sources.map((s) => ({ title: s.source.title, url: s.source.url, type: s.source.sourceType, checkedAt: s.source.checkedAt, freshness: s.freshness })),
          handoffAllowed: c.handoffAllowed,
          resultHash: c.resultHash,
        }
      : null,
    pendingApprovals: task.actions
      .filter((a) => a.status === 'pending_approval')
      .map((a) => ({
        actionId: a.id,
        type: a.type,
        title: a.payload.productTitle,
        target: a.target.site,
        amountJpy: a.amount.amount,
        payloadHash: a.payloadHash,
        approveIn: `${webBaseUrl}/tasks/${task.id}?tab=plan`,
      })),
    actions: task.actions.map((a) => ({ actionId: a.id, title: a.payload.productTitle, status: a.status, handoffUrl: a.handoffUrl ?? null })),
    evidenceCount: task.evidence.length,
    outcome: task.outcome ?? null,
    updatedAt: task.updatedAt,
  };
}

export { STATUS_LABEL };
