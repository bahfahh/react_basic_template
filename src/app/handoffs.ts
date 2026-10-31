/** Hand-off history kept in this browser only (simulated tracking until the backend exists). */
export interface Handoff {
  id: string;
  code: string;
  packId: string;
  packTitle: string;
  agentName: string;
  message: string;
  at: string;
}

const KEY = 'lazypack-handoffs-v1';

export function loadHandoffs(): Handoff[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Handoff[]) : [];
  } catch {
    return [];
  }
}

export function saveHandoff(h: Handoff): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([h, ...loadHandoffs().filter((x) => x.code !== h.code)].slice(0, 50)));
  } catch {
    // Storage unavailable (private mode): the hand-off still works, it just isn't listed.
  }
}

export function clearHandoffs(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function newHandoffCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return `LP-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}
