import { todayIso } from '../lib/dates';
import { canonicalJson, hashPayload, sha256Hex } from '../lib/hash';
import { newId } from '../lib/ids';
import { redact } from '../lib/redact';
import { compareTickets, snapshotSource } from '../optimizer/compare';
import { buildPurchasePlan } from '../optimizer/handoff';
import { indexCatalog, priceFor } from '../optimizer/pricing';
import { findPackage, searchPackages, type PackageManifest } from '../packages/registry';
import { formatZodError, jpTicketInputSchema } from '../packages/schema';
import type {
  ActionProposal,
  Actor,
  AnalyticsEvent,
  Approval,
  AuthContext,
  Catalog,
  ComparisonResult,
  ComparisonRun,
  CostEntry,
  Evidence,
  FunnelEvent,
  JpTicketInput,
  Outcome,
  PrefillBookingPayload,
  Scope,
  StrategyId,
  Task,
  TaskEvent,
  TaskStatus,
  TravelerCategory,
} from '../types';
import { LazyPackError } from './errors';
import { assertApprovalValid, domainOf, isAllowedDomain, MockExecutor, type Executor } from './executor';
import { assertTransition, TERMINAL } from './stateMachine';
import { clone, emptyStore, type StoreData } from './store';

export const APPROVAL_TTL_MINUTES = 15;
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
const EVIDENCE_RETENTION_DAYS = 30;
const ALLOWED_EVIDENCE_TYPES = /^(image\/(png|jpeg|webp|heic)|application\/pdf)$/;

export type TaskSubmission =
  | { kind: 'update_input'; input: JpTicketInput }
  | { kind: 'select_strategy'; strategyId: StrategyId; mode: 'assisted' | 'self' }
  | { kind: 'edit_action'; actionId: string; quantities?: PrefillBookingPayload['quantities']; useDate?: string }
  | { kind: 'payment_intent'; tier: string };

export interface CreateTaskRequest {
  packageId: string;
  input: JpTicketInput;
  consents: { privacy_processing: boolean };
}

export interface OutcomeRequest {
  purchased: boolean;
  actualPaidJpy?: number;
  evidenceIds?: string[];
  confirm: boolean;
}

export interface ServiceDeps {
  catalog: Catalog;
  store?: StoreData;
  clock?: () => Date;
  executor?: Executor;
  onChange?: (store: StoreData) => void;
}

/**
 * The one Task API. HTTP routes, MCP tools and the in-browser demo all call these
 * methods, so validation, ownership checks, approvals and state transitions are
 * identical regardless of channel.
 */
export class TaskService {
  readonly store: StoreData;
  private readonly baseCatalog: Catalog;
  private readonly clock: () => Date;
  private readonly executor: Executor;
  private readonly onChange?: (store: StoreData) => void;

  constructor(deps: ServiceDeps) {
    this.baseCatalog = deps.catalog;
    this.store = deps.store ?? emptyStore();
    this.clock = deps.clock ?? (() => new Date());
    this.executor = deps.executor ?? new MockExecutor();
    this.onChange = deps.onChange;
  }

  // ------------------------------------------------------------------ catalog

  /** Base catalog plus admin re-verification overrides. */
  catalog(): Catalog {
    const overrides = this.store.sourceOverrides;
    if (Object.keys(overrides).length === 0) return this.baseCatalog;
    return {
      ...this.baseCatalog,
      sources: this.baseCatalog.sources.map((s) =>
        overrides[s.id] ? { ...s, checkedAt: overrides[s.id].checkedAt, status: overrides[s.id].status, verification: 'manual' as const } : s,
      ),
    };
  }

  today(): string {
    return todayIso(this.clock());
  }

  // ----------------------------------------------------------------- packages

  searchPackages(ctx: AuthContext, q?: string, category?: string): PackageManifest[] {
    requireScope(ctx, 'packages:read');
    return clone(searchPackages(q, category));
  }

  getPackage(ctx: AuthContext, id: string): PackageManifest {
    requireScope(ctx, 'packages:read');
    const pkg = findPackage(id);
    if (!pkg) throw new LazyPackError('not_found', `找不到 Package ${id}`);
    return clone(pkg);
  }

  /** search_travel_offers: catalog entries with prices, coverage, sources and freshness. */
  searchOffers(ctx: AuthContext, query: { city?: string; q?: string }) {
    requireScope(ctx, 'packages:read');
    const catalog = this.catalog();
    const asOf = this.today();
    const needle = query.q?.trim().toLowerCase();
    const match = (city: string, ...texts: string[]) =>
      (!query.city || city === query.city || city === 'kansai') && (!needle || texts.some((t) => t.toLowerCase().includes(needle)));
    const sources = new Map(catalog.sources.map((s) => [s.id, snapshotSource(s, asOf)]));
    return clone({
      asOf,
      catalogVersion: catalog.version,
      products: catalog.products.filter((p) => match(p.area, p.name, p.nameJa, p.id)),
      attractions: catalog.attractions.filter((a) => match(a.city, a.name, a.nameJa, a.id, ...a.keywords)),
      transit: catalog.transit.filter((t) => match(t.city, t.name, t.nameJa, t.id)),
      sources: [...sources.values()],
    });
  }

  /** compare_ticket_bundles: stateless comparison, nothing stored. */
  compareBundles(ctx: AuthContext, rawInput: unknown) {
    requireScope(ctx, 'packages:read');
    const input = this.parseInput(ctx, rawInput);
    return clone(compareTickets(input, this.catalog(), this.today()));
  }

  // -------------------------------------------------------------------- tasks

  async createTask(ctx: AuthContext, req: CreateTaskRequest, idempotencyKey?: string): Promise<{ task: Task; replayed: boolean }> {
    requireScope(ctx, 'tasks:write');
    const pkg = findPackage(req.packageId);
    if (!pkg) throw new LazyPackError('not_found', `找不到 Package ${req.packageId}`);
    if (pkg.status !== 'active') throw new LazyPackError('invalid_input', `${pkg.title} 尚未開放（狀態：${pkg.status}）`);
    if (!req.consents?.privacy_processing) {
      throw new LazyPackError('invalid_input', '需要先同意個資處理（privacy_processing）才能建立任務。');
    }
    if (idempotencyKey) {
      const existingId = this.store.idempotency[`${ctx.userId}:${idempotencyKey}`];
      if (existingId && this.store.tasks[existingId]) return { task: clone(this.store.tasks[existingId]), replayed: true };
    }
    const input = this.parseInput(ctx, req.input);
    const now = this.nowIso();
    const task: Task = {
      id: newId('task'),
      userId: ctx.userId,
      packageId: pkg.id,
      packageVersion: pkg.version,
      title: taskTitle(input),
      status: 'draft',
      channel: ctx.channel,
      idempotencyKey,
      createdAt: now,
      updatedAt: now,
      input,
      missingFields: [],
      consents: { privacy_processing: now },
      actions: [],
      approvals: [],
      evidence: [],
    };
    this.store.tasks[task.id] = task;
    if (idempotencyKey) this.store.idempotency[`${ctx.userId}:${idempotencyKey}`] = task.id;
    this.event(task, ctx, 'task_created', `建立任務：${pkg.title} v${pkg.version}`, { channel: ctx.channel });
    this.track(ctx, 'start_intake', task.id);
    await this.evaluate(task, ctx);
    return { task: this.commit(task), replayed: false };
  }

  getTask(ctx: AuthContext, id: string): Task {
    requireScope(ctx, 'tasks:read');
    return clone(this.ownedTask(ctx, id));
  }

  listTasks(ctx: AuthContext): Task[] {
    requireScope(ctx, 'tasks:read');
    return clone(
      Object.values(this.store.tasks)
        .filter((t) => t.userId === ctx.userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  listEvents(ctx: AuthContext, id: string): TaskEvent[] {
    requireScope(ctx, 'tasks:read');
    this.ownedTask(ctx, id);
    return clone(this.store.events.filter((e) => e.taskId === id).sort((a, b) => a.seq - b.seq));
  }

  async submitInput(ctx: AuthContext, id: string, submission: TaskSubmission): Promise<Task> {
    requireScope(ctx, 'tasks:write');
    const task = this.ownedTask(ctx, id);
    if (TERMINAL.includes(task.status)) throw new LazyPackError('invalid_transition', `任務已${task.status}，無法再修改。`);

    switch (submission.kind) {
      case 'update_input': {
        const merged = this.parseInput(ctx, { ...task.input, ...submission.input });
        task.input = merged;
        task.title = taskTitle(merged);
        this.supersedeActions(task, ctx, '需求已更新');
        this.event(task, ctx, 'input_updated', '已更新需求，重新比較。');
        await this.evaluate(task, ctx);
        break;
      }
      case 'select_strategy':
        await this.selectStrategy(task, ctx, submission.strategyId, submission.mode);
        break;
      case 'edit_action':
        await this.editAction(task, ctx, submission);
        break;
      case 'payment_intent':
        task.paymentIntent = { at: this.nowIso(), tier: submission.tier.slice(0, 40) };
        this.event(task, ctx, 'payment_intent', `記錄付費意向：${task.paymentIntent.tier}（原型不扣款）`);
        this.track(ctx, 'payment_intent', task.id);
        break;
      default:
        throw new LazyPackError('invalid_input', '未知的 submission 類型');
    }
    return this.commit(task);
  }

  async approveAction(
    ctx: AuthContext,
    id: string,
    actionId: string,
    body: { payloadHash: string; decision: 'approve' | 'reject' },
  ): Promise<Task> {
    requireScope(ctx, 'tasks:write');
    const task = this.ownedTask(ctx, id);
    if (!ctx.scopes.includes('approvals:write')) {
      throw new LazyPackError('approval_required_in_app', '外部動作必須由本人在懶人包網頁核准；此 token 沒有核准權限。', {
        approvalPath: `/tasks/${task.id}?tab=plan`,
        actionId,
      });
    }
    const action = task.actions.find((a) => a.id === actionId);
    if (!action) throw new LazyPackError('not_found', `找不到動作 ${actionId}`);
    if (task.status !== 'awaiting_user_approval' || action.status !== 'pending_approval') {
      throw new LazyPackError('invalid_transition', `此動作目前狀態為 ${action.status}，無法核准。`);
    }
    if (body.payloadHash !== action.payloadHash) {
      throw new LazyPackError('approval_invalid', '你核准的內容與目前內容不一致（可能已被修改），請重新檢視後再核准。', {
        expected: action.payloadHash,
      });
    }

    if (body.decision === 'reject') {
      action.status = 'rejected';
      action.updatedAt = this.nowIso();
      this.event(task, ctx, 'action_rejected', `已拒絕：${action.payload.productTitle} 預填`, { actionId });
      this.settleAfterActions(task, ctx);
      return this.commit(task);
    }

    const now = this.clock();
    const approval: Approval = {
      id: newId('apv'),
      taskId: task.id,
      actionId,
      payloadHash: action.payloadHash,
      approvedBy: ctx.userId,
      channel: ctx.channel,
      approvedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + APPROVAL_TTL_MINUTES * 60_000).toISOString(),
      status: 'valid',
    };
    task.approvals.push(approval);
    task.consents.external_submission ??= approval.approvedAt;
    action.status = 'approved';
    this.event(task, ctx, 'action_approved', `已核准：${action.payload.productTitle} 預填（¥${action.amount.amount.toLocaleString()}）`, {
      actionId,
      payloadHash: action.payloadHash,
      expiresAt: approval.expiresAt,
    });
    this.track(ctx, 'approve_plan', task.id);
    await this.executeAction(task, ctx, action);
    return this.commit(task);
  }

  addEvidence(ctx: AuthContext, id: string, meta: { kind?: Evidence['kind']; fileName: string; sizeBytes: number; mimeType: string }): Task {
    requireScope(ctx, 'tasks:write');
    const task = this.ownedTask(ctx, id);
    if (TERMINAL.includes(task.status)) throw new LazyPackError('invalid_transition', '任務已結束，無法上傳。');
    if (!ALLOWED_EVIDENCE_TYPES.test(meta.mimeType)) throw new LazyPackError('invalid_input', '只接受圖片（PNG/JPEG/WebP/HEIC）或 PDF。');
    if (!(meta.sizeBytes > 0 && meta.sizeBytes <= MAX_EVIDENCE_BYTES)) throw new LazyPackError('invalid_input', '檔案大小需在 10MB 以內。');
    const evidence: Evidence = {
      id: newId('evd'),
      taskId: task.id,
      kind: meta.kind ?? 'receipt',
      fileName: meta.fileName.replace(/[^\w.\-一-鿿 ]/g, '_').slice(0, 80),
      sizeBytes: meta.sizeBytes,
      mimeType: meta.mimeType,
      storage: 'metadata_only',
      uploadedAt: this.nowIso(),
      uploadedBy: ctx.userId,
      retentionDays: EVIDENCE_RETENTION_DAYS,
    };
    task.evidence.push(evidence);
    this.event(task, ctx, 'evidence_uploaded', `已上傳證明：${evidence.fileName}（原型只保存檔名與大小，保留 ${EVIDENCE_RETENTION_DAYS} 天）`, {
      evidenceId: evidence.id,
    });
    this.track(ctx, 'upload_evidence', task.id);
    return this.commit(task);
  }

  submitOutcome(ctx: AuthContext, id: string, req: OutcomeRequest): Task {
    requireScope(ctx, 'tasks:write');
    const task = this.ownedTask(ctx, id);
    if (!['awaiting_external_response', 'plan_ready'].includes(task.status) || !task.comparison) {
      throw new LazyPackError('invalid_transition', '目前狀態無法回報結果。');
    }
    const comparison = task.comparison;
    const evidenceIds = (req.evidenceIds ?? []).filter((e) => task.evidence.some((x) => x.id === e));
    const payOnSite = task.purchasePlan?.payOnSiteTotal ?? 0;
    const base: Omit<Outcome, 'substate' | 'verifiedSavings' | 'verificationType' | 'confidence' | 'note' | 'verifiedAt'> = {
      kind: 'savings',
      estimatedSavings: comparison.estimatedSavings,
      baselineCost: comparison.baselineCost,
      claimedPaid: req.actualPaidJpy ?? null,
      currency: 'JPY',
      evidenceRef: evidenceIds,
    };
    let outcome: Outcome;
    if (!req.purchased) {
      outcome = {
        ...base,
        substate: 'resolved_no_recovery',
        verifiedSavings: null,
        verificationType: 'none',
        verifiedAt: null,
        confidence: 'unverified',
        note:
          comparison.recommendedStrategyId === 'singles'
            ? '依建議不購買 Pass。避免的支出另計，不計入已驗證節省。'
            : '未購買推薦方案，不計入節省。',
      };
    } else if (evidenceIds.length === 0 || !req.confirm || req.actualPaidJpy === undefined) {
      outcome = {
        ...base,
        substate: 'submitted',
        verifiedSavings: null,
        verificationType: 'user_statement',
        verifiedAt: null,
        confidence: 'unverified',
        note: '已送出／自述已購買，但缺少收據或確認，節省金額標記為 unverified，不計入北極星。',
      };
    } else {
      const coveredValue = comparison.baselineCost - payOnSite;
      outcome = {
        ...base,
        substate: 'resolved_success',
        verifiedSavings: Math.max(0, coveredValue - req.actualPaidJpy),
        verificationType: 'receipt_upload',
        verifiedAt: this.nowIso(),
        confidence: 'verified',
        note: '依收據實付金額與來源票價計算（同等權益的單買價值 − 實付 Pass 金額）。實際使用情形未驗證。',
      };
    }
    task.outcome = outcome;
    task.completionSubstate = outcome.substate;
    this.transition(task, ctx, 'completed', `結果：${outcome.note}`, {
      substate: outcome.substate,
      verifiedSavings: outcome.verifiedSavings,
    });
    if (outcome.substate === 'resolved_success') this.track(ctx, 'outcome_verified', task.id);
    return this.commit(task);
  }

  cancelTask(ctx: AuthContext, id: string): Task {
    requireScope(ctx, 'tasks:write');
    const task = this.ownedTask(ctx, id);
    this.supersedeActions(task, ctx, '任務已取消');
    this.transition(task, ctx, 'cancelled', '任務已取消。');
    return this.commit(task);
  }

  /** Re-runs the stored comparison from its own input + catalog snapshot and checks the hash. */
  async verifyReproducible(ctx: AuthContext, id: string): Promise<{ matches: boolean; storedHash: string; recomputedHash: string }> {
    requireScope(ctx, 'tasks:read');
    const task = this.ownedTask(ctx, id);
    const run = task.comparison;
    if (!run) throw new LazyPackError('invalid_transition', '尚未產生比較結果。');
    const outcome = compareTickets(task.input, run.catalogSnapshot, run.asOf);
    if (outcome.kind !== 'ok') return { matches: false, storedHash: run.resultHash, recomputedHash: '' };
    const recomputedHash = await sha256Hex(canonicalJson(outcome.result));
    this.event(task, ctx, 'recomputed', recomputedHash === run.resultHash ? '重算結果一致 ✓' : '重算結果不一致，需覆核');
    this.commit(task);
    return { matches: recomputedHash === run.resultHash, storedHash: run.resultHash, recomputedHash };
  }

  track(ctx: AuthContext, event: FunnelEvent, taskId?: string): void {
    const entry: AnalyticsEvent = { event, at: this.nowIso(), userId: ctx.userId, channel: ctx.channel, taskId };
    this.store.analytics.push(entry);
    this.onChange?.(this.store);
  }

  // -------------------------------------------------------------------- admin

  adminOverview(ctx: AuthContext) {
    requireScope(ctx, 'admin');
    const asOf = this.today();
    const tasks = Object.values(this.store.tasks).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const funnel: Record<string, number> = {};
    for (const e of this.store.analytics) funnel[e.event] = (funnel[e.event] ?? 0) + 1;
    const failures: Record<string, number> = {};
    for (const t of tasks) {
      if (['failed', 'blocked', 'ineligible', 'needs_input'].includes(t.status)) {
        const reason = t.statusReason ?? t.status;
        failures[reason] = (failures[reason] ?? 0) + 1;
      }
      for (const a of t.actions) if (a.failureReason) failures[`執行停止：${a.failureReason}`] = (failures[`執行停止：${a.failureReason}`] ?? 0) + 1;
    }
    const costByTask = new Map<string, number>();
    for (const c of this.store.costs) costByTask.set(c.taskId, (costByTask.get(c.taskId) ?? 0) + c.costTwd);
    const perTask = [...costByTask.values()].sort((a, b) => a - b);
    const pct = (p: number) => (perTask.length ? perTask[Math.min(perTask.length - 1, Math.floor(p * perTask.length))] : 0);
    const verified = tasks.filter((t) => t.outcome?.confidence === 'verified');
    return clone({
      asOf,
      tasks,
      events: [...this.store.events].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 200),
      sources: this.catalog().sources.map((s) => ({ ...snapshotSource(s, asOf), override: this.store.sourceOverrides[s.id] })),
      funnel,
      failures,
      costs: this.store.costs,
      costSummary: { tasks: perTask.length, p50: pct(0.5), p95: pct(0.95), total: perTask.reduce((s, x) => s + x, 0) },
      savings: {
        verifiedSavingsJpy: verified.reduce((s, t) => s + (t.outcome?.verifiedSavings ?? 0), 0),
        verifiedTasks: verified.length,
        estimatedOnlyJpy: tasks.filter((t) => t.outcome?.confidence !== 'verified').reduce((s, t) => s + (t.comparison?.estimatedSavings ?? 0), 0),
      },
    });
  }

  /** Admin marks a source as re-checked. Blocked tasks that depended on it are re-evaluated. */
  async reverifySource(ctx: AuthContext, sourceId: string): Promise<{ reevaluated: string[] }> {
    requireScope(ctx, 'admin');
    if (!this.baseCatalog.sources.some((s) => s.id === sourceId)) throw new LazyPackError('not_found', `找不到來源 ${sourceId}`);
    this.store.sourceOverrides[sourceId] = { checkedAt: this.today(), status: 'active', by: ctx.userId };
    this.cost('admin', 'human_review', `人工核對來源 ${sourceId}`, 5, 'min', 5 * 10);
    const reevaluated: string[] = [];
    for (const task of Object.values(this.store.tasks)) {
      if (task.status !== 'blocked' || !task.comparison?.sources.some((s) => s.source.id === sourceId)) continue;
      this.event(task, ctx, 'source_reverified', `管理員已重新核對來源 ${sourceId}，重新比較。`);
      await this.evaluate(task, ctx);
      this.commit(task);
      reevaluated.push(task.id);
    }
    this.onChange?.(this.store);
    return { reevaluated };
  }

  // ---------------------------------------------------------------- internals

  private parseInput(ctx: AuthContext, raw: unknown): JpTicketInput {
    const parsed = jpTicketInputSchema.safeParse(raw ?? {});
    if (!parsed.success) throw new LazyPackError('invalid_input', `輸入格式錯誤：${formatZodError(parsed.error)}`);
    if (parsed.data.simulation && !['web', 'demo'].includes(ctx.channel)) {
      throw new LazyPackError('invalid_input', 'simulation 參數僅供網頁示範重播，外部 Agent 不可使用。');
    }
    return parsed.data as JpTicketInput;
  }

  private async evaluate(task: Task, ctx: AuthContext): Promise<void> {
    const catalog = this.catalog();
    const asOf = this.today();
    this.transition(task, ctx, 'collecting_evidence', `載入 ${catalog.sources.length} 個政策／票價來源（資料版本 ${catalog.version}）`, undefined, 'system');
    this.cost(task.id, 'source_lookup', '讀取已快取的官方來源', catalog.sources.length, 'sources', 0);
    const outcome = compareTickets(task.input, catalog, asOf);

    if (outcome.kind === 'needs_input') {
      task.missingFields = outcome.missing;
      task.comparison = undefined;
      task.statusReason = '缺少必要資料';
      this.transition(task, ctx, 'needs_input', `需要補充：${outcome.missing.map((m) => m.label).join('、')}`, undefined, 'system');
      return;
    }
    if (outcome.kind === 'ineligible') {
      task.missingFields = [];
      task.comparison = undefined;
      task.statusReason = outcome.reason;
      this.transition(task, ctx, 'ineligible', outcome.reason, undefined, 'system');
      return;
    }

    task.missingFields = [];
    this.transition(task, ctx, 'evaluating', '以確定性程式比較逐項單買、Pass 優先與最佳混合方案', undefined, 'system');
    this.cost(task.id, 'compute', '組合最佳化（動態規劃）', 1, 'run', 0.01);
    this.cost(task.id, 'llm', '產生白話說明（模擬 token 用量）', 2400, 'tokens', 0.36);
    task.comparison = await this.buildRun(task, outcome.result, catalog);
    task.selectedStrategyId = undefined;
    task.purchasePlan = undefined;
    this.track(ctx, 'qualified_case', task.id);

    const r = outcome.result;
    const summary =
      r.recommendedStrategyId === 'singles'
        ? `比較完成：逐項單買最省（¥${r.baselineCost.toLocaleString()}），不建議購買 Pass`
        : `比較完成：最佳混合 ¥${r.optimizedCost.toLocaleString()}，比逐項單買預估省 ¥${r.estimatedSavings.toLocaleString()}（購買前不計入已實現節省）`;
    if (!r.handoffAllowed) {
      task.statusReason = '來源過期，需重新核對';
      this.transition(task, ctx, 'blocked', `${summary}。但推薦方案使用的來源已過期，重新核對前不提供購買協助。`, undefined, 'system');
      return;
    }
    task.statusReason = undefined;
    this.transition(task, ctx, 'plan_ready', summary, { recommended: r.recommendedStrategyId, savings: r.estimatedSavings }, 'system');
  }

  private async buildRun(task: Task, result: ComparisonResult, catalog: Catalog): Promise<ComparisonRun> {
    return {
      ...result,
      id: newId('run'),
      taskId: task.id,
      packageId: task.packageId,
      packageVersion: task.packageVersion,
      createdAt: this.nowIso(),
      catalogSnapshot: clone(catalog),
      resultHash: await sha256Hex(canonicalJson(result)),
    };
  }

  private async selectStrategy(task: Task, ctx: AuthContext, strategyId: StrategyId, mode: 'assisted' | 'self'): Promise<void> {
    if (!task.comparison) throw new LazyPackError('invalid_transition', '尚未產生比較結果。');
    if (task.status === 'blocked' || !task.comparison.handoffAllowed) {
      throw new LazyPackError('invalid_transition', '來源已過期或有阻擋項目，重新核對前不提供購買協助。');
    }
    if (!['plan_ready', 'awaiting_user_approval', 'awaiting_external_response'].includes(task.status)) {
      throw new LazyPackError('invalid_transition', `目前狀態 ${task.status} 不能選擇方案。`);
    }
    const strategy = task.comparison.strategies.find((s) => s.id === strategyId);
    if (!strategy?.feasible) throw new LazyPackError('invalid_input', strategy?.infeasibleReason ?? `沒有方案 ${strategyId}`);
    const catalog = task.comparison.catalogSnapshot;
    const plan = buildPurchasePlan(task.comparison, strategyId, catalog);
    this.supersedeActions(task, ctx, '重新選擇方案');
    if (task.status !== 'plan_ready') this.transition(task, ctx, 'plan_ready', '重新選擇方案');
    task.selectedStrategyId = strategyId;
    task.purchasePlan = plan;
    this.track(ctx, 'plan_view', task.id);
    const strategyTitle = strategy.title;

    const proposals: ActionProposal[] = [];
    if (mode === 'assisted') {
      for (const item of plan.items) {
        if (item.channel.kind !== 'online' || !isAllowedDomain(item.channel.url, catalog.executorAllowlist)) continue;
        proposals.push(
          await this.newProposal(task, {
            productId: item.productId,
            productTitle: item.title,
            channelId: item.channel.id,
            url: item.channel.url,
            useDate: item.useDate,
            quantities: item.quantities.map((q) => ({ category: q.category, count: q.count })),
            expectedAmountJpy: item.amount,
          }),
        );
      }
    }
    task.actions.push(...proposals);

    if (proposals.length > 0) {
      this.transition(task, ctx, 'awaiting_user_approval', `選擇「${strategyTitle}」，產生 ${proposals.length} 個待核准的預填動作`);
    } else {
      const why =
        plan.items.length === 0
          ? '此方案不需購買任何 Pass，交通與門票於現場付款即可'
          : mode === 'self'
            ? '你選擇自行購買'
            : '此方案的票券沒有可預填的線上官方通路';
      this.transition(task, ctx, 'awaiting_external_response', `選擇「${strategyTitle}」：${why}。已產生購買清單與官方連結。`);
    }
  }

  private async newProposal(task: Task, payload: PrefillBookingPayload, revision = 1): Promise<ActionProposal> {
    const now = this.nowIso();
    return {
      id: newId('act'),
      taskId: task.id,
      type: 'prefill_booking',
      status: 'pending_approval',
      payload,
      payloadHash: await hashPayload({ type: 'prefill_booking', payload, revision }),
      target: { site: siteName(payload.url), domain: domainOf(payload.url), url: payload.url, sourceType: 'official' },
      attachments: [],
      amount: { amount: payload.expectedAmountJpy, currency: 'JPY' },
      consequences: [
        '懶人包會模擬開啟官方購買頁並預填票種、數量、使用日。',
        '不會登入、不會輸入任何個資或付款資料、不會付款；到登入／OTP／付款步驟前一定停下。',
        '若結帳頁金額與核准金額不同，會停止並請你重新核准。',
        `核准 ${APPROVAL_TTL_MINUTES} 分鐘內有效，內容修改後原核准立即失效。`,
      ],
      executor: this.executor.name,
      stopsBefore: ['登入', 'OTP／簡訊驗證', 'CAPTCHA', '付款'],
      revision,
      createdAt: now,
      updatedAt: now,
      executionLog: [],
    };
  }

  private async editAction(task: Task, ctx: AuthContext, sub: Extract<TaskSubmission, { kind: 'edit_action' }>): Promise<void> {
    const action = task.actions.find((a) => a.id === sub.actionId);
    if (!action) throw new LazyPackError('not_found', `找不到動作 ${sub.actionId}`);
    if (!['pending_approval', 'approved'].includes(action.status)) {
      throw new LazyPackError('invalid_transition', `動作狀態為 ${action.status}，無法修改。`);
    }
    const catalog = task.comparison!.catalogSnapshot;
    const product = indexCatalog(catalog).product(action.payload.productId)!;
    const useDate = sub.useDate ?? action.payload.useDate;
    const tripDates = task.comparison!.normalizedInput.days.map((d) => d.date);
    if (!tripDates.includes(useDate)) throw new LazyPackError('invalid_input', '使用日必須在旅遊日期內。');
    const quantities = (sub.quantities ?? action.payload.quantities).filter((q) => q.count > 0);
    if (quantities.length === 0 || quantities.some((q) => !Number.isInteger(q.count) || q.count > 9)) {
      throw new LazyPackError('invalid_input', '數量需為 1–9 的整數。');
    }
    const dayType = task.comparison!.normalizedInput.days.find((d) => d.date === useDate)!.dayType;
    let amount = 0;
    for (const q of quantities) {
      const unit = priceFor(product.prices, q.category as TravelerCategory, dayType);
      if (unit === null) throw new LazyPackError('invalid_input', `${product.name} 沒有${q.category}票種。`);
      amount += unit * q.count;
    }
    const payload: PrefillBookingPayload = { ...action.payload, useDate, quantities, expectedAmountJpy: amount };
    const invalidated = this.invalidateApprovals(task, action.id);
    action.payload = payload;
    action.revision += 1;
    action.payloadHash = await hashPayload({ type: 'prefill_booking', payload, revision: action.revision });
    action.amount = { amount, currency: 'JPY' };
    action.status = 'pending_approval';
    action.updatedAt = this.nowIso();
    this.event(
      task,
      ctx,
      'action_edited',
      `已修改預填內容（第 ${action.revision} 版，金額 ¥${amount.toLocaleString()}）。${invalidated > 0 ? '原核准已失效，需重新核准。' : '需核准後才會執行。'}`,
      { actionId: action.id, payloadHash: action.payloadHash },
    );
  }

  private async executeAction(task: Task, ctx: AuthContext, action: ActionProposal): Promise<void> {
    const now = this.clock();
    const approval = task.approvals.find((a) => a.actionId === action.id && a.status === 'valid');
    assertApprovalValid(action, approval, now);
    this.transition(task, ctx, 'executing', `${this.executor.name} 開始預填 ${action.payload.productTitle}`, { actionId: action.id }, 'executor');
    action.status = 'executing';
    const knobs = task.input.simulation ?? {};
    const result = this.executor.run(action, approval, task.comparison!.catalogSnapshot, knobs, now);
    approval.status = 'used';
    action.executionLog.push(...result.steps);
    action.handoffUrl = result.handoffUrl;
    action.updatedAt = this.nowIso();
    this.cost(task.id, 'browser_executor', `模擬瀏覽器操作 ${result.steps.length} 步`, 1.5, 'min', 1.5 * 1.2);
    for (const s of result.steps) this.event(task, ctx, 'executor_step', `${s.step}：${s.detail}`, { actionId: action.id, result: s.result }, 'executor');

    if (result.result === 'paused_for_user') {
      action.status = 'paused_for_user';
      this.track(ctx, 'submission_verified', task.id);
      this.settleAfterActions(task, ctx, result.reason === 'captcha' ? '遇到 CAPTCHA，已交還給你在官方網站完成' : '已預填並在付款前停下，請你在官方網站登入並付款');
      return;
    }

    action.status = 'failed';
    action.failureReason = result.reason;
    if (result.reason === 'price_changed' && result.checkoutAmountJpy !== undefined) {
      const replacement = await this.newProposal(task, { ...action.payload, expectedAmountJpy: result.checkoutAmountJpy }, action.revision + 1);
      task.actions.push(replacement);
      this.transition(
        task,
        ctx,
        'awaiting_user_approval',
        `結帳金額變動（¥${action.payload.expectedAmountJpy.toLocaleString()} → ¥${result.checkoutAmountJpy.toLocaleString()}），已停止，請重新核准新金額。`,
        { actionId: replacement.id },
        'executor',
      );
      return;
    }
    if (result.reason === 'sold_out') {
      this.transition(task, ctx, 'failed', `${action.payload.productTitle} 在 ${action.payload.useDate} 已售完，停止執行。`, { actionId: action.id }, 'executor');
      this.supersedeActions(task, ctx, '因售完重新比較');
      const sim = task.input.simulation ?? {};
      task.input = {
        ...task.input,
        simulation: { ...sim, soldOutAtCheckout: false, soldOut: [...(sim.soldOut ?? []), { productId: action.payload.productId, date: action.payload.useDate }] },
      };
      await this.evaluate(task, ctx);
      return;
    }
    this.transition(task, ctx, 'failed', `執行停止：${result.reason}`, { actionId: action.id }, 'executor');
  }

  /** After an action resolves, move the task to the state that matches the remaining actions. */
  private settleAfterActions(task: Task, ctx: AuthContext, message?: string): void {
    const pending = task.actions.some((a) => a.status === 'pending_approval');
    const handedOff = task.actions.some((a) => a.status === 'paused_for_user');
    if (pending) {
      if (task.status !== 'awaiting_user_approval') this.transition(task, ctx, 'awaiting_user_approval', message ?? '還有待核准的動作');
      else if (message) this.event(task, ctx, 'handoff', message);
    } else if (handedOff || task.purchasePlan) {
      this.transition(task, ctx, 'awaiting_external_response', message ?? '其餘項目請依購買清單自行完成');
    } else {
      this.transition(task, ctx, 'plan_ready', message ?? '沒有待執行的動作');
    }
  }

  private supersedeActions(task: Task, ctx: AuthContext, reason: string): void {
    let n = 0;
    for (const a of task.actions) {
      if (['pending_approval', 'approved'].includes(a.status)) {
        a.status = 'superseded';
        a.updatedAt = this.nowIso();
        this.invalidateApprovals(task, a.id);
        n++;
      }
    }
    if (n > 0) this.event(task, ctx, 'actions_superseded', `${reason}：${n} 個未執行的動作已作廢，核准一併失效。`);
  }

  private invalidateApprovals(task: Task, actionId: string): number {
    let n = 0;
    for (const ap of task.approvals) {
      if (ap.actionId === actionId && ap.status === 'valid') {
        ap.status = 'invalidated';
        n++;
      }
    }
    return n;
  }

  private ownedTask(ctx: AuthContext, id: string): Task {
    const task = this.store.tasks[id];
    // Same response for "missing" and "someone else's" so task IDs can't be probed.
    if (!task || (task.userId !== ctx.userId && !ctx.scopes.includes('admin'))) {
      throw new LazyPackError('not_found', `找不到任務 ${id}`);
    }
    this.expireIfPast(task, ctx);
    return task;
  }

  private expireIfPast(task: Task, ctx: AuthContext): void {
    const end = task.input.travelDates?.end;
    if (!end || TERMINAL.includes(task.status) || end >= this.today()) return;
    if (!['needs_input', 'plan_ready', 'awaiting_user_approval', 'awaiting_external_response', 'blocked'].includes(task.status)) return;
    this.supersedeActions(task, ctx, '旅遊日期已過');
    this.transition(task, ctx, 'expired', `旅遊日期（${end}）已過，任務自動結束。`, undefined, 'system');
    this.commit(task);
  }

  private transition(task: Task, ctx: AuthContext, to: TaskStatus, message: string, data?: Record<string, unknown>, actor?: Actor): void {
    assertTransition(task.status, to);
    const from = task.status;
    task.status = to;
    task.updatedAt = this.nowIso();
    this.event(task, ctx, 'status_changed', message, { ...data, from, to }, actor);
  }

  private event(task: Task, ctx: AuthContext, type: string, message: string, data?: Record<string, unknown>, actor?: Actor): void {
    const seq = this.store.events.filter((e) => e.taskId === task.id).length + 1;
    this.store.events.push({
      id: newId('evt'),
      taskId: task.id,
      seq,
      at: this.nowIso(),
      type,
      actor: actor ?? ctx.actor,
      channel: ctx.channel,
      message: redact(message),
      data: data ? redact(data) : undefined,
    });
  }

  private cost(taskId: string, category: CostEntry['category'], description: string, units: number, unit: string, costTwd: number): void {
    this.store.costs.push({ id: newId('cost'), taskId, at: this.nowIso(), category, description, units, unit, costTwd, simulated: true });
  }

  private commit(task: Task): Task {
    task.updatedAt = this.nowIso();
    this.store.tasks[task.id] = task;
    this.onChange?.(this.store);
    return clone(task);
  }

  private nowIso(): string {
    return this.clock().toISOString();
  }
}

export function requireScope(ctx: AuthContext, scope: Scope): void {
  if (!ctx.scopes.includes(scope) && !ctx.scopes.includes('admin')) {
    throw new LazyPackError('forbidden', `此 token 缺少權限 ${scope}`);
  }
}

function siteName(url: string): string {
  const host = domainOf(url);
  if (host.includes('osaka-info')) return '大阪周遊卡官方網站';
  if (host.includes('osakametro')) return 'Osaka Metro 官方網站';
  if (host.includes('kyoto')) return '京都市交通局官方網站';
  if (host.includes('hankyu')) return '阪急電鐵官方網站';
  return host;
}

function taskTitle(input: JpTicketInput): string {
  const cities = [...new Set((input.days ?? []).map((d) => d.city))]
    .map((c) => ({ osaka: '大阪', kyoto: '京都' })[c as 'osaka' | 'kyoto'] ?? c)
    .join('＋');
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const range = input.travelDates;
  const dates = range ? (range.start === range.end ? md(range.start) : `${md(range.start)}–${md(range.end)}`) : '日期未定';
  const people = input.travelers ? `${input.travelers.adults} 大${input.travelers.childAges.length ? ` ${input.travelers.childAges.length} 小` : ''}` : '';
  return [cities || '日本票券比較', dates, people].filter(Boolean).join(' · ');
}
