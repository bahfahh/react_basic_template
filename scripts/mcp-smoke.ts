/**
 * Manual MCP smoke test against a running server (`npm run dev` or `npm run start:api`).
 *   npm run mcp:smoke
 * Uses the agent token: it can create and read tasks but cannot approve actions.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = process.env.LAZYPACK_MCP_URL ?? 'http://localhost:8787/mcp';
const token = process.env.LAZYPACK_TOKEN ?? 'lp_demo_agent_alice';

const client = new Client({ name: 'lazypack-smoke', version: '0.1.0' });
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers: { authorization: `Bearer ${token}` } } }));

const call = async (name: string, args: Record<string, unknown>) => {
  const r = (await client.callTool({ name, arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
  const data = JSON.parse(r.content[0].text);
  console.log(`\n▶ ${name}${r.isError ? ' (error)' : ''}`);
  return data;
};

console.log('tools:', (await client.listTools()).tools.map((t) => t.name).join(', '));

const date = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);
const created = await call('create_task', {
  packageId: 'travel.jp-ticket-optimizer',
  consents: { privacy_processing: true },
  idempotencyKey: `smoke-${date}`,
  input: {
    travelDates: { start: date, end: date },
    travelers: { adults: 2, childAges: [] },
    lodgingCity: 'osaka',
    days: [{ date, city: 'osaka', attractions: ['osaka_castle', 'umeda_sky', 'tombori_cruise'] }],
  },
});
console.log(`  ${created.id} → ${created.statusLabel}; baseline ¥${created.comparison?.baselineCostJpy} → ¥${created.comparison?.recommendedCostJpy}`);

const selected = await call('submit_task_input', {
  taskId: created.id,
  submission: { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' },
});
const pending = selected.pendingApprovals[0];
console.log(`  pending approval: ${pending?.title} ¥${pending?.amountJpy}`);

const denied = await call('approve_action', { taskId: created.id, actionId: pending.actionId, payloadHash: pending.payloadHash, decision: 'approve' });
console.log(`  ${denied.error}: ${denied.message}`);
console.log(`  → user approves at ${denied.details?.approveIn}`);

await client.close();
