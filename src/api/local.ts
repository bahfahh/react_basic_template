import {
  CATALOG,
  contextForToken,
  emptyStore,
  findPackage,
  generateSkillMd,
  LazyPackError,
  TaskService,
  toTaskView,
  type AuthContext,
  type StoreData,
} from '@/core';
import { ApiError, type LazyPackApi } from './types';

const STORAGE_KEY = 'lazypack-demo-store-v1';

function load(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? (JSON.parse(raw) as StoreData) : null;
    return data?.version === 1 ? data : emptyStore();
  } catch {
    return emptyStore();
  }
}

function save(store: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage may be unavailable (private mode); the demo still works in memory.
  }
}

/**
 * In-browser demo: runs the exact same TaskService as the server, persisted to
 * localStorage. Used when no API server is reachable (static preview builds).
 */
export function createLocalApi(): LazyPackApi {
  const service = new TaskService({ catalog: CATALOG, store: load(), onChange: save });
  const user = contextForToken('lp_demo_user_alice', 'demo') as AuthContext;
  const admin = contextForToken('lp_demo_admin', 'demo') as AuthContext;

  const run = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof LazyPackError) throw new ApiError(err.code, err.message, err.details);
      throw err;
    }
  };

  return {
    mode: 'local',
    me: () => run(() => ({ userId: user.userId, displayName: user.displayName, scopes: user.scopes })),
    today: () => run(() => service.today()),
    listPackages: () => run(() => service.searchPackages(user)),
    getPackage: (id) => run(() => service.getPackage(user, id)),
    skillMd: (id) =>
      run(() => {
        const pkg = findPackage(id);
        if (!pkg) throw new LazyPackError('not_found', `找不到 Package ${id}`);
        return generateSkillMd(pkg, 'https://<your-lazypack-host>/mcp');
      }),
    createTask: (req, key) => run(async () => toTaskView((await service.createTask(user, req, key)).task)),
    listTasks: () => run(() => service.listTasks(user).map(toTaskView)),
    getTask: (id) => run(() => toTaskView(service.getTask(user, id))),
    getEvents: (id) => run(() => service.listEvents(user, id)),
    submitInput: (id, s) => run(async () => toTaskView(await service.submitInput(user, id, s))),
    approve: (id, actionId, payloadHash, decision) => run(async () => toTaskView(await service.approveAction(user, id, actionId, { payloadHash, decision }))),
    addEvidence: (id, meta) => run(() => toTaskView(service.addEvidence(user, id, meta))),
    submitOutcome: (id, req) => run(() => toTaskView(service.submitOutcome(user, id, req))),
    cancel: (id) => run(() => toTaskView(service.cancelTask(user, id))),
    verify: (id) => run(() => service.verifyReproducible(user, id)),
    track: (event, taskId) => service.track(user, event, taskId),
    adminOverview: () => run(() => service.adminOverview(admin)),
    reverifySource: (sourceId) => run(() => service.reverifySource(admin, sourceId)),
    resetDemo: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      location.reload();
    },
  };
}
