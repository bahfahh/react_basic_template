import type { AuthContext, Channel, Scope } from './types';

/**
 * Prototype identities. Production uses OAuth/OIDC with short-lived, least-privilege
 * tokens (spec §6.1); these static tokens exist only so the demo and tests can show
 * that web, HTTP API and MCP share the same authorization rules.
 */
interface DemoIdentity {
  userId: string;
  displayName: string;
  scopes: Scope[];
  actor: AuthContext['actor'];
}

const USER_SCOPES: Scope[] = ['packages:read', 'tasks:read', 'tasks:write', 'approvals:write'];
/** External agents can create and read tasks but cannot approve external actions. */
const AGENT_SCOPES: Scope[] = ['packages:read', 'tasks:read', 'tasks:write'];

export const DEMO_TOKENS: Record<string, DemoIdentity> = {
  lp_demo_user_alice: { userId: 'u_alice', displayName: 'Alice（示範使用者）', scopes: USER_SCOPES, actor: 'user' },
  lp_demo_agent_alice: { userId: 'u_alice', displayName: 'Alice 的外部 Agent', scopes: AGENT_SCOPES, actor: 'agent' },
  lp_demo_user_bob: { userId: 'u_bob', displayName: 'Bob（另一位使用者）', scopes: USER_SCOPES, actor: 'user' },
  lp_demo_admin: { userId: 'u_admin', displayName: '內部覆核人員', scopes: ['packages:read', 'tasks:read', 'admin'], actor: 'admin' },
};

export function contextForToken(token: string | undefined, channel: Channel): AuthContext | undefined {
  const identity = token ? DEMO_TOKENS[token] : undefined;
  if (!identity) return undefined;
  return { ...identity, channel, tokenId: token!.replace(/^(lp_demo_\w+?)_.*/, '$1') };
}

export function bearerToken(header: string | undefined | null): string | undefined {
  const m = header?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1];
}
