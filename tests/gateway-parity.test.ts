import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOG, TaskService } from '../src/core';
import { taskResultSchema } from '../src/core/packages/schema';
import { createApp } from '../server/app';
import { fixedClock, scenarioInput } from './helpers';

/**
 * P0 #7 / §11.6 #6: the same Task Package is reachable through the Web API and MCP,
 * backed by one TaskService, with identical permission checks.
 */

let server: Server;
let base: string;

beforeAll(async () => {
  const service = new TaskService({ catalog: CATALOG, clock: fixedClock().clock });
  const handler = createApp({ service, webBaseUrl: 'http://web.test', apiBaseUrl: 'http://api.test' });
  server = createServer((req, res) => void handler(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

async function api(path: string, token: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON responses are asserted field by field below
  return { status: res.status, body: (await res.json()) as any };
}

async function mcp(token: string) {
  const client = new Client({ name: 'parity-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));
  const call = async (name: string, args: Record<string, unknown>) => {
    const r = (await client.callTool({ name, arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
    return { isError: !!r.isError, data: JSON.parse(r.content[0].text) };
  };
  return { client, call };
}

const input = () => {
  const { simulation: _s, ...rest } = scenarioInput('osaka-pass-wins');
  return rest;
};

describe('Web API and MCP share one Task API', () => {
  it('lists the small, stable MCP tool set', async () => {
    const { client } = await mcp('lp_demo_agent_alice');
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(
      ['approve_action', 'cancel_task', 'compare_ticket_bundles', 'create_task', 'get_package', 'get_task', 'search_packages', 'search_travel_offers', 'submit_task_input'].sort(),
    );
    await client.close();
  });

  it('end-to-end: agent creates via MCP, user approves in web API, agent reads the result via MCP', async () => {
    const { client, call } = await mcp('lp_demo_agent_alice');
    const created = await call('create_task', {
      packageId: 'travel.jp-ticket-optimizer',
      input: input(),
      consents: { privacy_processing: true },
      idempotencyKey: 'parity-key-0001',
    });
    expect(created.isError).toBe(false);
    expect(created.data.status).toBe('plan_ready');
    const taskId = created.data.id as string;

    // Same task, same numbers through the web API.
    const web = await api(`/api/tasks/${taskId}`, 'lp_demo_user_alice');
    expect(web.status).toBe(200);
    expect(web.body.comparison.estimatedSavings).toBe(created.data.comparison.estimatedSavingsJpy);
    expect(web.body.comparison.catalogSnapshot).toBeUndefined();

    const selected = await call('submit_task_input', { taskId, submission: { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' } });
    expect(selected.data.status).toBe('awaiting_user_approval');
    const pending = selected.data.pendingApprovals[0];

    // The agent cannot approve...
    const denied = await call('approve_action', { taskId, actionId: pending.actionId, payloadHash: pending.payloadHash, decision: 'approve' });
    expect(denied.isError).toBe(true);
    expect(denied.data.error).toBe('approval_required_in_app');
    expect(denied.data.details.approveIn).toContain(`/tasks/${taskId}`);

    // ...the user does, in the web app.
    const approved = await api(`/api/tasks/${taskId}/approvals/${pending.actionId}`, 'lp_demo_user_alice', {
      method: 'POST',
      body: JSON.stringify({ payloadHash: pending.payloadHash, decision: 'approve' }),
    });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('awaiting_external_response');

    const after = await call('get_task', { taskId });
    expect(after.data.status).toBe('awaiting_external_response');
    // Responses honour the published output schema (registry/.../schemas/task-result.output.json).
    expect(taskResultSchema.safeParse(after.data).success).toBe(true);
    expect(taskResultSchema.safeParse(created.data).success).toBe(true);
    expect(after.data.actions[0].status).toBe('paused_for_user');
    await client.close();
  });

  it('applies identical ownership checks on both channels', async () => {
    const created = await api('/api/tasks', 'lp_demo_user_alice', {
      method: 'POST',
      body: JSON.stringify({ packageId: 'travel.jp-ticket-optimizer', input: input(), consents: { privacy_processing: true } }),
    });
    expect(created.status).toBe(201);
    const taskId = created.body.id;

    const webBob = await api(`/api/tasks/${taskId}`, 'lp_demo_user_bob');
    expect(webBob.status).toBe(404);

    const { client, call } = await mcp('lp_demo_user_bob');
    const mcpBob = await call('get_task', { taskId });
    expect(mcpBob.isError).toBe(true);
    expect(mcpBob.data.error).toBe('not_found');
    await client.close();
  });

  it('rejects missing or invalid tokens on both channels', async () => {
    const res = await fetch(`${base}/api/tasks`);
    expect(res.status).toBe(401);
    const mcpRes = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(mcpRes.status).toBe(401);
  });

  it('honours Idempotency-Key on POST /api/tasks', async () => {
    const body = JSON.stringify({ packageId: 'travel.jp-ticket-optimizer', input: input(), consents: { privacy_processing: true } });
    const a = await api('/api/tasks', 'lp_demo_user_alice', { method: 'POST', body, headers: { 'idempotency-key': 'web-key-000001' } });
    const b = await api('/api/tasks', 'lp_demo_user_alice', { method: 'POST', body, headers: { 'idempotency-key': 'web-key-000001' } });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.id).toBe(a.body.id);
  });

  it('serves the SKILL.md export without credentials', async () => {
    const res = await fetch(`${base}/api/packages/travel.jp-ticket-optimizer/skill.md`);
    const text = await res.text();
    expect(text).toContain('http://api.test/mcp');
    expect(text).not.toMatch(/lp_demo_/);
  });
});
