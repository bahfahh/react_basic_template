import type { ActionProposal, Approval, Catalog, ExecutionStep, SimulationKnobs } from '../types';
import { LazyPackError } from './errors';

export interface ExecutorResult {
  result: 'paused_for_user' | 'stopped';
  reason?: 'captcha' | 'price_changed' | 'sold_out' | 'domain_not_allowed';
  steps: ExecutionStep[];
  handoffUrl: string;
  checkoutAmountJpy?: number;
}

export interface Executor {
  readonly name: string;
  run(action: ActionProposal, approval: Approval, catalog: Catalog, knobs: SimulationKnobs, now: Date): ExecutorResult;
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function isAllowedDomain(url: string, allowlist: string[]): boolean {
  const host = domainOf(url);
  return !!host && allowlist.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Verifies an approval is bound to this exact payload and still valid.
 * Called by the service *and* by every executor — defense in depth.
 */
export function assertApprovalValid(action: ActionProposal, approval: Approval | undefined, now: Date): asserts approval is Approval {
  if (!approval || approval.actionId !== action.id) {
    throw new LazyPackError('approval_invalid', '此動作沒有有效核准，不會執行。');
  }
  if (approval.status !== 'valid') {
    throw new LazyPackError('approval_invalid', `核准狀態為 ${approval.status}，不會執行。`);
  }
  if (approval.payloadHash !== action.payloadHash) {
    throw new LazyPackError('approval_invalid', '內容在核准後被修改，原核准失效，需重新核准。');
  }
  if (new Date(approval.expiresAt).getTime() <= now.getTime()) {
    throw new LazyPackError('approval_invalid', '核准已過期，需重新核准。');
  }
}

/**
 * Simulated browser executor. It never opens a network connection: it walks through the
 * steps a real Computer Use adapter would take and always stops before login, OTP,
 * CAPTCHA or payment, handing control back to the user.
 */
export class MockExecutor implements Executor {
  readonly name = 'MockExecutor（模擬，不連線外部網站）';

  run(action: ActionProposal, approval: Approval, catalog: Catalog, knobs: SimulationKnobs, now: Date): ExecutorResult {
    assertApprovalValid(action, approval, now);
    let t = now.getTime();
    const at = () => new Date((t += 1200)).toISOString();
    const steps: ExecutionStep[] = [];
    const p = action.payload;
    const push = (step: string, result: ExecutionStep['result'], detail: string) => steps.push({ at: at(), step, result, detail });

    push('核准驗證', 'ok', `actionId ${action.id}、payloadHash ${action.payloadHash.slice(0, 10)}…，有效至 ${approval.expiresAt}`);

    if (!isAllowedDomain(p.url, catalog.executorAllowlist)) {
      push('網域檢查', 'stopped', `${domainOf(p.url) || p.url} 不在允許清單，停止執行。`);
      return { result: 'stopped', reason: 'domain_not_allowed', steps, handoffUrl: p.url };
    }
    push('網域檢查', 'ok', `${domainOf(p.url)} 在允許清單內`);
    push('重複送出檢查', 'ok', '此動作尚未執行過（冪等鍵：actionId + revision）');
    push('開啟官方購買頁', 'ok', `模擬開啟 ${p.url}（原型不實際連線）`);

    if (knobs.captcha) {
      push('偵測到 CAPTCHA', 'paused', '依規定不嘗試繞過，安全暫停並交還給你。');
      return { result: 'paused_for_user', reason: 'captcha', steps, handoffUrl: p.url };
    }

    const qty = p.quantities.map((q) => `${q.category === 'adult' ? '大人' : q.category === 'child' ? '兒童' : '幼兒'} ${q.count}`).join('、');
    push('預填', 'ok', `票種：${p.productTitle}；數量：${qty}；使用日：${p.useDate}（不填任何個資、帳密或付款資料）`);

    if (knobs.soldOutAtCheckout) {
      push('庫存檢查', 'stopped', '結帳頁顯示此日期已售完，停止執行。');
      return { result: 'stopped', reason: 'sold_out', steps, handoffUrl: p.url };
    }

    const checkout = p.expectedAmountJpy + (knobs.checkoutPriceDeltaJpy ?? 0);
    if (checkout !== p.expectedAmountJpy) {
      push('金額核對', 'stopped', `結帳頁金額 ¥${checkout.toLocaleString()} 與核准金額 ¥${p.expectedAmountJpy.toLocaleString()} 不符，停止並請你重新核准。`);
      return { result: 'stopped', reason: 'price_changed', steps, handoffUrl: p.url, checkoutAmountJpy: checkout };
    }
    push('金額核對', 'ok', `結帳頁金額 ¥${checkout.toLocaleString()} 與核准金額一致`);
    push('到達登入／付款步驟', 'paused', '安全暫停：請你本人登入、輸入 OTP 並付款。懶人包不經手密碼、OTP 或卡號。');
    return { result: 'paused_for_user', steps, handoffUrl: p.url, checkoutAmountJpy: checkout };
  }
}
