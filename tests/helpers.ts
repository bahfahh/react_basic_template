import { CATALOG, findScenario, TaskService, type AuthContext } from '../src/core';

export const MONDAY = '2026-11-09';
export const TODAY = '2026-10-31';

export function fixedClock(iso = `${TODAY}T03:00:00.000Z`) {
  let now = new Date(iso).getTime();
  const clock = () => new Date(now);
  return { clock, advance: (ms: number) => (now += ms) };
}

export function makeService() {
  const time = fixedClock();
  const service = new TaskService({ catalog: CATALOG, clock: time.clock });
  return { service, time };
}

export const alice: AuthContext = {
  userId: 'u_alice',
  displayName: 'Alice',
  scopes: ['packages:read', 'tasks:read', 'tasks:write', 'approvals:write'],
  channel: 'web',
  actor: 'user',
};
export const aliceAgent: AuthContext = { ...alice, scopes: ['packages:read', 'tasks:read', 'tasks:write'], channel: 'mcp', actor: 'agent' };
export const bob: AuthContext = { ...alice, userId: 'u_bob', displayName: 'Bob' };
export const admin: AuthContext = { userId: 'u_admin', displayName: 'Admin', scopes: ['packages:read', 'tasks:read', 'admin'], channel: 'web', actor: 'admin' };

export function scenarioInput(id: string) {
  const s = findScenario(id);
  if (!s) throw new Error(`no scenario ${id}`);
  return s.build(MONDAY);
}

export async function createScenarioTask(service: TaskService, id: string, ctx: AuthContext = alice) {
  const { task } = await service.createTask(ctx, {
    packageId: 'travel.jp-ticket-optimizer',
    input: scenarioInput(id),
    consents: { privacy_processing: true },
  });
  return task;
}
