import type { AnalyticsEvent, CostEntry, PolicySource, Task, TaskEvent } from '../types';

export interface SourceOverride {
  checkedAt: string;
  status: PolicySource['status'];
  by: string;
}

export interface StoreData {
  version: 1;
  tasks: Record<string, Task>;
  events: TaskEvent[];
  analytics: AnalyticsEvent[];
  costs: CostEntry[];
  idempotency: Record<string, string>;
  sourceOverrides: Record<string, SourceOverride>;
}

export function emptyStore(): StoreData {
  return { version: 1, tasks: {}, events: [], analytics: [], costs: [], idempotency: {}, sourceOverrides: {} };
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}
