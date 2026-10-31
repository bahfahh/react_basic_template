import { describe, expect, it } from 'vitest';
import { APPROVAL_TTL_MINUTES, LazyPackError, statusBucket } from '../src/core';
import { redact } from '../src/core/lib/redact';
import { admin, alice, aliceAgent, bob, createScenarioTask, makeService, scenarioInput } from './helpers';

async function readyForApproval(id = 'osaka-pass-wins') {
  const ctx = makeService();
  const task = await createScenarioTask(ctx.service, id);
  const t = await ctx.service.submitInput(alice, task.id, { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' });
  return { ...ctx, task: t };
}

describe('replayable mock scenarios (spec §8 Week 1)', () => {
  it('success path: plan → approve → prefill pauses before payment → receipt → verified savings', async () => {
    const { service, task } = await readyForApproval();
    expect(task.status).toBe('awaiting_user_approval');
    const action = task.actions[0];
    expect(action.stopsBefore).toContain('付款');

    const after = await service.approveAction(alice, task.id, action.id, { payloadHash: action.payloadHash, decision: 'approve' });
    expect(after.status).toBe('awaiting_external_response');
    expect(after.actions[0].status).toBe('paused_for_user');
    expect(after.actions[0].executionLog.at(-1)!.result).toBe('paused');

    const withEvidence = service.addEvidence(alice, task.id, { fileName: 'receipt.pdf', sizeBytes: 12000, mimeType: 'application/pdf' });
    const done = service.submitOutcome(alice, task.id, {
      purchased: true,
      actualPaidJpy: 7000,
      evidenceIds: [withEvidence.evidence[0].id],
      confirm: true,
    });
    expect(done.status).toBe('completed');
    expect(done.completionSubstate).toBe('resolved_success');
    expect(done.outcome!.verifiedSavings).toBe(5320);
    expect(statusBucket(done.status, done.completionSubstate)).toBe('resolved');
  });

  it('needs-input path lists missing fields, then recovers when they are supplied', async () => {
    const { service } = makeService();
    const task = await createScenarioTask(service, 'missing-info');
    expect(task.status).toBe('needs_input');
    expect(task.missingFields.map((m) => m.field)).toEqual(['travel_dates', 'travelers', 'destinations_or_attractions']);
    const fixed = await service.submitInput(alice, task.id, { kind: 'update_input', input: scenarioInput('osaka-pass-wins') });
    expect(fixed.status).toBe('plan_ready');
  });

  it('ineligible path: unsupported city is rejected without a price', async () => {
    const { service } = makeService();
    const task = await createScenarioTask(service, 'unsupported-city');
    expect(task.status).toBe('ineligible');
    expect(task.comparison).toBeUndefined();
  });

  it('stale data blocks booking handoff until an admin re-verifies the source', async () => {
    const { service } = makeService();
    const task = await createScenarioTask(service, 'stale-data');
    expect(task.status).toBe('blocked');
    await expect(service.submitInput(alice, task.id, { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' })).rejects.toThrow(LazyPackError);

    const blocking = task.comparison!.warnings.filter((w) => w.severity === 'block').flatMap((w) => w.refIds ?? []);
    expect(blocking.length).toBeGreaterThan(0);
    for (const id of blocking) await service.reverifySource(admin, id);
    const after = service.getTask(alice, task.id);
    expect(after.status).toBe('plan_ready');
    expect(after.comparison!.sources.find((s) => s.source.id === blocking[0])!.source.verification).toBe('manual');
  });
});

describe('approvals (spec §4.5, P0 #3)', () => {
  it('external action never runs without approval', async () => {
    const { task } = await readyForApproval();
    expect(task.actions[0].executionLog).toHaveLength(0);
    expect(task.approvals).toHaveLength(0);
  });

  it('editing the payload invalidates the approval binding (payloadHash)', async () => {
    const { service, task } = await readyForApproval();
    const original = task.actions[0];
    const edited = await service.submitInput(alice, task.id, {
      kind: 'edit_action',
      actionId: original.id,
      quantities: [{ category: 'adult', count: 1 }],
    });
    const action = edited.actions[0];
    expect(action.payloadHash).not.toBe(original.payloadHash);
    expect(action.amount.amount).toBe(3500);
    // Approving with the hash the user saw before the edit is refused.
    await expect(
      service.approveAction(alice, task.id, action.id, { payloadHash: original.payloadHash, decision: 'approve' }),
    ).rejects.toMatchObject({ code: 'approval_invalid' });
    const ok = await service.approveAction(alice, task.id, action.id, { payloadHash: action.payloadHash, decision: 'approve' });
    expect(ok.actions[0].status).toBe('paused_for_user');
  });

  it('approvals carry an expiry', async () => {
    const { service, task } = await readyForApproval();
    const a = task.actions[0];
    const t = await service.approveAction(alice, task.id, a.id, { payloadHash: a.payloadHash, decision: 'approve' });
    const ap = t.approvals[0];
    expect(new Date(ap.expiresAt).getTime() - new Date(ap.approvedAt).getTime()).toBe(APPROVAL_TTL_MINUTES * 60_000);
    expect(ap.status).toBe('used');
  });

  it('agent tokens cannot approve; they get the in-app approval path', async () => {
    const { service, task } = await readyForApproval();
    const a = task.actions[0];
    await expect(service.approveAction(aliceAgent, task.id, a.id, { payloadHash: a.payloadHash, decision: 'approve' })).rejects.toMatchObject({
      code: 'approval_required_in_app',
    });
  });

  it('price change at checkout stops execution and requires a new approval', async () => {
    const { service } = makeService();
    const input = { ...scenarioInput('osaka-pass-wins'), simulation: { checkoutPriceDeltaJpy: 400 } };
    const { task } = await service.createTask(alice, { packageId: 'travel.jp-ticket-optimizer', input, consents: { privacy_processing: true } });
    const t = await service.submitInput(alice, task.id, { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' });
    const a = t.actions[0];
    const after = await service.approveAction(alice, t.id, a.id, { payloadHash: a.payloadHash, decision: 'approve' });
    expect(after.status).toBe('awaiting_user_approval');
    expect(after.actions[0].failureReason).toBe('price_changed');
    expect(after.actions[1].amount.amount).toBe(a.amount.amount + 400);
    expect(after.actions[1].status).toBe('pending_approval');
  });

  it('CAPTCHA hands control back to the user instead of bypassing it', async () => {
    const { service } = makeService();
    const input = { ...scenarioInput('osaka-pass-wins'), simulation: { captcha: true } };
    const { task } = await service.createTask(alice, { packageId: 'travel.jp-ticket-optimizer', input, consents: { privacy_processing: true } });
    const t = await service.submitInput(alice, task.id, { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' });
    const after = await service.approveAction(alice, t.id, t.actions[0].id, { payloadHash: t.actions[0].payloadHash, decision: 'approve' });
    expect(after.status).toBe('awaiting_external_response');
    expect(after.actions[0].executionLog.some((s) => s.step.includes('CAPTCHA'))).toBe(true);
  });

  it('sold out at checkout fails the action and re-plans without that product', async () => {
    const { service } = makeService();
    const input = { ...scenarioInput('osaka-pass-wins'), simulation: { soldOutAtCheckout: true } };
    const { task } = await service.createTask(alice, { packageId: 'travel.jp-ticket-optimizer', input, consents: { privacy_processing: true } });
    const t = await service.submitInput(alice, task.id, { kind: 'select_strategy', strategyId: 'optimized', mode: 'assisted' });
    const after = await service.approveAction(alice, t.id, t.actions[0].id, { payloadHash: t.actions[0].payloadHash, decision: 'approve' });
    expect(after.status).toBe('plan_ready');
    const passes = after.comparison!.strategies.find((s) => s.id === 'optimized')!.passes.map((p) => p.productId);
    expect(passes).not.toContain('osaka_amazing_1d');
  });
});

describe('outcomes (P0 #4)', () => {
  it('"submitted" is never counted as verified savings', async () => {
    const { service, task } = await readyForApproval();
    const a = task.actions[0];
    await service.approveAction(alice, task.id, a.id, { payloadHash: a.payloadHash, decision: 'approve' });
    const done = service.submitOutcome(alice, task.id, { purchased: true, actualPaidJpy: 7000, confirm: true });
    expect(done.completionSubstate).toBe('submitted');
    expect(done.outcome!.verifiedSavings).toBeNull();
    expect(done.outcome!.confidence).toBe('unverified');
    expect(service.adminOverview(admin).savings.verifiedSavingsJpy).toBe(0);
  });
});

describe('authorization & data handling', () => {
  it("another user's task looks exactly like a missing task", async () => {
    const { service } = makeService();
    const task = await createScenarioTask(service, 'osaka-pass-wins');
    expect(() => service.getTask(bob, task.id)).toThrow(/找不到任務/);
    expect(() => service.getTask(bob, 'task_does_not_exist')).toThrow(/找不到任務/);
  });

  it('idempotency key returns the original task', async () => {
    const { service } = makeService();
    const req = { packageId: 'travel.jp-ticket-optimizer', input: scenarioInput('osaka-pass-wins'), consents: { privacy_processing: true } };
    const a = await service.createTask(alice, req, 'idem-key-123456');
    const b = await service.createTask(alice, req, 'idem-key-123456');
    expect(b.replayed).toBe(true);
    expect(b.task.id).toBe(a.task.id);
    expect(service.listTasks(alice)).toHaveLength(1);
  });

  it('requires privacy consent and rejects unknown input fields', async () => {
    const { service } = makeService();
    await expect(
      service.createTask(alice, { packageId: 'travel.jp-ticket-optimizer', input: {}, consents: { privacy_processing: false } }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
    await expect(
      service.createTask(alice, {
        packageId: 'travel.jp-ticket-optimizer',
        input: { password: 'hunter2' } as never,
        consents: { privacy_processing: true },
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('agents cannot use simulation knobs', async () => {
    const { service } = makeService();
    await expect(
      service.createTask(aliceAgent, {
        packageId: 'travel.jp-ticket-optimizer',
        input: { ...scenarioInput('osaka-pass-wins'), simulation: { captcha: true } },
        consents: { privacy_processing: true },
      }),
    ).rejects.toMatchObject({ code: 'invalid_input' });
  });

  it('P0 #8: secrets and identity numbers never reach the event log', async () => {
    const { service } = makeService();
    const input = { ...scenarioInput('osaka-pass-wins'), notes: 'OTP 482913，護照 AB1234567，信用卡 4111 1111 1111 1111，email a@b.co' };
    const { task } = await service.createTask(alice, { packageId: 'travel.jp-ticket-optimizer', input, consents: { privacy_processing: true } });
    const log = JSON.stringify(service.listEvents(alice, task.id));
    for (const secret of ['482913', 'AB1234567', '4111 1111', 'a@b.co']) expect(log).not.toContain(secret);
    expect(redact({ password: 'x', note: 'OTP 123456' })).toEqual({ password: '[已遮蔽]', note: 'OTP [已遮蔽]' });
  });

  it('evidence stores metadata only and validates type/size', async () => {
    const { service } = makeService();
    const task = await createScenarioTask(service, 'osaka-pass-wins');
    expect(() => service.addEvidence(alice, task.id, { fileName: 'x.exe', sizeBytes: 10, mimeType: 'application/x-msdownload' })).toThrow();
    const t = service.addEvidence(alice, task.id, { fileName: 'r.png', sizeBytes: 10, mimeType: 'image/png' });
    expect(t.evidence[0].storage).toBe('metadata_only');
  });

  it('stored comparison can be recomputed to the same hash', async () => {
    const { service } = makeService();
    const task = await createScenarioTask(service, 'osaka-two-days');
    const v = await service.verifyReproducible(alice, task.id);
    expect(v.matches).toBe(true);
  });
});
