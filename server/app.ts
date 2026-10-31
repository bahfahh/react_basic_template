import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  bearerToken,
  contextForToken,
  findPackage,
  generateSkillMd,
  HTTP_STATUS,
  LazyPackError,
  PACKAGES,
  toTaskView,
  type AuthContext,
  type Channel,
  type FunnelEvent,
  type TaskService,
  type TaskSubmission,
} from '../src/core';
import { handleMcpRequest } from './mcp';

const MAX_BODY_BYTES = 100 * 1024;
const RATE_LIMIT_PER_MINUTE = 240;
const FUNNEL_EVENTS: FunnelEvent[] = ['landing_view', 'start_intake', 'eligibility_view', 'plan_view', 'payment_intent', 'referral'];

export interface AppOptions {
  service: TaskService;
  /** Public URL of the web app, used in links handed to agents. */
  webBaseUrl: string;
  /** Public URL of this API server, used in SKILL.md. */
  apiBaseUrl: string;
}

type Handler = (args: { req: IncomingMessage; res: ServerResponse; params: Record<string, string>; query: URLSearchParams; ctx: AuthContext; body: unknown }) => unknown;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  auth: boolean;
  handler: Handler;
}

function route(method: string, path: string, handler: Handler, auth = true): Route {
  const keys: string[] = [];
  const pattern = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
  return { method, pattern, keys, auth, handler };
}

/**
 * HTTP Task API (spec §6.3). Thin transport: parses, authenticates, then calls the shared
 * TaskService. The MCP Gateway is mounted at /mcp on the same server.
 */
export function createApp({ service, webBaseUrl, apiBaseUrl }: AppOptions) {
  const hits = new Map<string, { windowStart: number; count: number }>();

  const routes: Route[] = [
    route('GET', '/api/health', () => ({ ok: true, catalogVersion: service.catalog().version, today: service.today() }), false),
    route('GET', '/api/me', ({ ctx }) => ({ userId: ctx.userId, displayName: ctx.displayName, scopes: ctx.scopes, actor: ctx.actor })),
    route('GET', '/api/packages', ({ ctx, query }) => service.searchPackages(ctx, query.get('q') ?? undefined, query.get('category') ?? undefined)),
    route('GET', '/api/packages/:id', ({ ctx, params }) => service.getPackage(ctx, params.id)),
    route('GET', '/api/packages/:id/skill.md', ({ res, params }) => {
      const pkg = findPackage(params.id);
      if (!pkg || pkg.status !== 'active') throw new LazyPackError('not_found', `找不到 Package ${params.id}`);
      res.writeHead(200, { 'content-type': 'text/markdown; charset=utf-8' });
      res.end(generateSkillMd(pkg, `${apiBaseUrl}/mcp`));
      return undefined;
    }, false),
    route('GET', '/api/compatibility', () => PACKAGES.map((p) => ({ packageId: p.id, version: p.version, compatibility: p.compatibility })), false),
    route('GET', '/api/offers', ({ ctx, query }) => service.searchOffers(ctx, { city: query.get('city') ?? undefined, q: query.get('q') ?? undefined })),
    route('POST', '/api/compare', ({ ctx, body }) => service.compareBundles(ctx, (body as { input?: unknown })?.input)),
    route('GET', '/api/tasks', ({ ctx }) => service.listTasks(ctx).map(toTaskView)),
    route('POST', '/api/tasks', async ({ req, res, ctx, body }) => {
      const b = (body ?? {}) as { packageId?: string; input?: unknown; consents?: { privacy_processing?: boolean } };
      const key = header(req, 'idempotency-key');
      const { task, replayed } = await service.createTask(
        ctx,
        { packageId: String(b.packageId ?? ''), input: (b.input ?? {}) as never, consents: { privacy_processing: !!b.consents?.privacy_processing } },
        key,
      );
      res.setHeader('idempotent-replayed', String(replayed));
      return { status: replayed ? 200 : 201, body: toTaskView(task) };
    }),
    route('GET', '/api/tasks/:id', ({ ctx, params }) => toTaskView(service.getTask(ctx, params.id))),
    route('GET', '/api/tasks/:id/events', ({ ctx, params }) => service.listEvents(ctx, params.id)),
    route('POST', '/api/tasks/:id/evidence', ({ ctx, params, body }) => {
      const b = (body ?? {}) as { kind?: 'receipt'; fileName?: string; sizeBytes?: number; mimeType?: string };
      return toTaskView(service.addEvidence(ctx, params.id, { kind: b.kind, fileName: String(b.fileName ?? ''), sizeBytes: Number(b.sizeBytes), mimeType: String(b.mimeType ?? '') }));
    }),
    route('POST', '/api/tasks/:id/inputs', async ({ ctx, params, body }) => toTaskView(await service.submitInput(ctx, params.id, body as TaskSubmission))),
    route('POST', '/api/tasks/:id/approvals/:actionId', async ({ ctx, params, body }) => {
      const b = (body ?? {}) as { payloadHash?: string; decision?: 'approve' | 'reject' };
      return toTaskView(await service.approveAction(ctx, params.id, params.actionId, { payloadHash: String(b.payloadHash ?? ''), decision: b.decision === 'reject' ? 'reject' : 'approve' }));
    }),
    route('POST', '/api/tasks/:id/cancel', ({ ctx, params }) => toTaskView(service.cancelTask(ctx, params.id))),
    route('POST', '/api/tasks/:id/outcome-evidence', ({ ctx, params, body }) => {
      const b = (body ?? {}) as { purchased?: boolean; actualPaidJpy?: number; evidenceIds?: string[]; confirm?: boolean };
      return toTaskView(
        service.submitOutcome(ctx, params.id, {
          purchased: !!b.purchased,
          actualPaidJpy: b.actualPaidJpy === undefined ? undefined : Number(b.actualPaidJpy),
          evidenceIds: Array.isArray(b.evidenceIds) ? b.evidenceIds.map(String) : [],
          confirm: !!b.confirm,
        }),
      );
    }),
    route('POST', '/api/tasks/:id/verify', ({ ctx, params }) => service.verifyReproducible(ctx, params.id)),
    route('POST', '/api/analytics', ({ ctx, body }) => {
      const b = (body ?? {}) as { event?: FunnelEvent; taskId?: string };
      if (!b.event || !FUNNEL_EVENTS.includes(b.event)) throw new LazyPackError('invalid_input', '不支援的事件');
      service.track(ctx, b.event, b.taskId);
      return { ok: true };
    }),
    route('GET', '/api/admin/overview', ({ ctx }) => service.adminOverview(ctx)),
    route('POST', '/api/admin/sources/:id/reverify', ({ ctx, params }) => service.reverifySource(ctx, params.id)),
  ];

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    try {
      if (url.pathname === '/mcp') {
        const ctx = authenticate(req, 'mcp');
        rateLimit(ctx);
        const body = req.method === 'POST' ? await readJson(req) : undefined;
        await handleMcpRequest(req, res, body, service, ctx, webBaseUrl);
        return;
      }
      const match = routes
        .filter((r) => r.method === req.method)
        .map((r) => ({ r, m: url.pathname.match(r.pattern) }))
        .find((x) => x.m);
      if (!match) throw new LazyPackError('not_found', `沒有這個路徑：${req.method} ${url.pathname}`);
      const params = Object.fromEntries(match.r.keys.map((k, i) => [k, decodeURIComponent(match.m![i + 1])]));
      const channel: Channel = header(req, 'x-lazypack-client') === 'web' ? 'web' : 'api';
      const ctx = match.r.auth ? authenticate(req, channel) : anonymous(channel);
      if (match.r.auth) rateLimit(ctx);
      const body = req.method === 'POST' ? await readJson(req) : undefined;
      const result = await match.r.handler({ req, res, params, query: url.searchParams, ctx, body });
      if (res.writableEnded) return;
      if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
        const r = result as { status: number; body: unknown };
        return send(res, r.status, r.body);
      }
      send(res, 200, result);
    } catch (err) {
      if (err instanceof LazyPackError) {
        send(res, HTTP_STATUS[err.code], { error: err.code, message: err.message, details: err.details });
        return;
      }
      console.error('[api] unexpected error', err instanceof Error ? err.message : err);
      if (!res.headersSent) send(res, 500, { error: 'internal', message: '伺服器錯誤' });
    }
  };

  function authenticate(req: IncomingMessage, channel: Channel): AuthContext {
    const ctx = contextForToken(bearerToken(header(req, 'authorization')), channel);
    if (!ctx) throw new LazyPackError('unauthorized', '需要有效的 Bearer token（原型使用示範 token，正式版改用 OAuth/OIDC）。');
    return ctx;
  }

  function rateLimit(ctx: AuthContext): void {
    const key = ctx.tokenId ?? ctx.userId;
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now - entry.windowStart > 60_000) {
      hits.set(key, { windowStart: now, count: 1 });
      return;
    }
    entry.count += 1;
    if (entry.count > RATE_LIMIT_PER_MINUTE) throw new LazyPackError('forbidden', '請求太頻繁，請稍後再試。');
  }
}

function anonymous(channel: Channel): AuthContext {
  return { userId: 'anonymous', displayName: 'anonymous', scopes: [], channel, actor: 'user' };
}

function header(req: IncomingMessage, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new LazyPackError('invalid_input', '請求內容太大。');
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new LazyPackError('invalid_input', '請求內容不是有效的 JSON。');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body ?? null));
}
