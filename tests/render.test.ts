import { describe, expect, it } from 'vitest';
import { checkText, lintPack } from '../src/packs/render';
import type { Pack } from '../src/packs/types';

const base: Pack = {
  id: 'x.test',
  area: 'bills',
  title: '測試',
  value: ['省錢'],
  icon: 'file-text',
  short: '測試',
  description: '測試用。',
  placeholder: '例：',
  updated: '2026-10-31',
  ask: { required: ['問題'] },
  steps: ['到 [S:a] 查最新價格。'],
  knowhow: ['規則一 [S:a]'],
  sources: [{ id: 'a', name: 'A', owner: '官方', official: true, url: 'https://example.com/', find: ['價格'], expect: ['價格'], search: 'A 價格' }],
  report: '結論：',
};

describe('lintPack', () => {
  it('accepts a pack that sends the agent to live sources', () => {
    expect(lintPack(base, [base])).toEqual([]);
  });

  it('rejects amounts, unknown sources, uncited know-how and unused sources', () => {
    const bad: Pack = {
      ...base,
      steps: ['單程 ¥1,500，到 [S:zz] 查。'],
      knowhow: ['兒童半價', '每月 499 元'],
      sources: [...base.sources, { ...base.sources[0], id: 'b', expect: [] }],
      related: [{ id: 'x.test', why: '自己' }],
    };
    const errors = lintPack(bad, [bad]).join('\n');
    expect(errors).toContain('amount "¥1,500"');
    expect(errors).toContain('amount "499 元"');
    expect(errors).toContain('unknown source [S:zz]');
    expect(errors).toContain('know-how without a source');
    expect(errors).toContain('source b has no expect words');
    expect(errors).toContain('source b is never used');
    expect(errors).toContain('related links to itself');
  });
});

describe('checkText', () => {
  it('says when sources were never checked, and splits browser vs AI results', () => {
    expect(checkText(undefined, null)).toBe('尚未自動檢查');
    const c = { url: 'u', browser: { verdict: 'ok' as const }, bot: { verdict: 'blocked' as const } };
    expect(checkText(c, '2026-11-01T00:00:00Z')).toBe('2026-11-01：一般瀏覽器 可直接讀取；AI 讀取 擋自動讀取（請改用瀏覽器或搜尋）');
  });
});
