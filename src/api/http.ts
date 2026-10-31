import type { TaskView } from '@/core';
import { ApiError, type LazyPackApi } from './types';

const USER_TOKEN = 'lp_demo_user_alice';
const ADMIN_TOKEN = 'lp_demo_admin';

async function request<T>(path: string, init: RequestInit & { token?: string; raw?: boolean } = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-lazypack-client': 'web',
      authorization: `Bearer ${init.token ?? USER_TOKEN}`,
      ...(init.headers ?? {}),
    },
  });
  if (init.raw && res.ok) return (await res.text()) as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error ?? 'http_error', body?.message ?? `HTTP ${res.status}`, body?.details);
  return body as T;
}

const post = <T>(path: string, body?: unknown, init: RequestInit & { token?: string } = {}) =>
  request<T>(path, { ...init, method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export function createHttpApi(): LazyPackApi {
  return {
    mode: 'http',
    me: () => request('/api/me'),
    today: async () => (await request<{ today: string }>('/api/health')).today,
    listPackages: () => request('/api/packages'),
    getPackage: (id) => request(`/api/packages/${encodeURIComponent(id)}`),
    skillMd: (id) => request(`/api/packages/${encodeURIComponent(id)}/skill.md`, { raw: true }),
    createTask: (req, key) => post<TaskView>('/api/tasks', req, { headers: { 'idempotency-key': key } }),
    listTasks: () => request('/api/tasks'),
    getTask: (id) => request(`/api/tasks/${id}`),
    getEvents: (id) => request(`/api/tasks/${id}/events`),
    submitInput: (id, submission) => post(`/api/tasks/${id}/inputs`, submission),
    approve: (id, actionId, payloadHash, decision) => post(`/api/tasks/${id}/approvals/${actionId}`, { payloadHash, decision }),
    addEvidence: (id, meta) => post(`/api/tasks/${id}/evidence`, meta),
    submitOutcome: (id, req) => post(`/api/tasks/${id}/outcome-evidence`, req),
    cancel: (id) => post(`/api/tasks/${id}/cancel`),
    verify: (id) => post(`/api/tasks/${id}/verify`),
    track: (event, taskId) => void post('/api/analytics', { event, taskId }).catch(() => undefined),
    adminOverview: () => request('/api/admin/overview', { token: ADMIN_TOKEN }),
    reverifySource: (sourceId) => post(`/api/admin/sources/${encodeURIComponent(sourceId)}/reverify`, undefined, { token: ADMIN_TOKEN }),
  };
}
