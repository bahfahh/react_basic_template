import type {
  CreateTaskRequest,
  Evidence,
  FunnelEvent,
  OutcomeRequest,
  PackageManifest,
  TaskEvent,
  TaskService,
  TaskSubmission,
  TaskView,
} from '@/core';

export type AdminOverview = ReturnType<TaskService['adminOverview']>;

export interface Me {
  userId: string;
  displayName: string;
  scopes: string[];
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Same surface whether the browser talks to the HTTP Task API or runs the core locally. */
export interface LazyPackApi {
  readonly mode: 'http' | 'local';
  me(): Promise<Me>;
  today(): Promise<string>;
  listPackages(): Promise<PackageManifest[]>;
  getPackage(id: string): Promise<PackageManifest>;
  skillMd(id: string): Promise<string>;
  createTask(req: CreateTaskRequest, idempotencyKey: string): Promise<TaskView>;
  listTasks(): Promise<TaskView[]>;
  getTask(id: string): Promise<TaskView>;
  getEvents(id: string): Promise<TaskEvent[]>;
  submitInput(id: string, submission: TaskSubmission): Promise<TaskView>;
  approve(id: string, actionId: string, payloadHash: string, decision: 'approve' | 'reject'): Promise<TaskView>;
  addEvidence(id: string, meta: Pick<Evidence, 'fileName' | 'sizeBytes' | 'mimeType'> & { kind?: Evidence['kind'] }): Promise<TaskView>;
  submitOutcome(id: string, req: OutcomeRequest): Promise<TaskView>;
  cancel(id: string): Promise<TaskView>;
  verify(id: string): Promise<{ matches: boolean; storedHash: string; recomputedHash: string }>;
  track(event: FunnelEvent, taskId?: string): void;
  adminOverview(): Promise<AdminOverview>;
  reverifySource(sourceId: string): Promise<{ reevaluated: string[] }>;
  resetDemo?(): void;
}
