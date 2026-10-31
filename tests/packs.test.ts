import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACK_BASE_URL } from '../src/app/config';
import { renderPackFiles } from '../src/core/packages/publish';

describe('agent-readable pack files', () => {
  const files = renderPackFiles(PACK_BASE_URL);

  it('committed files match the generator (run `npm run packs` after changing data)', () => {
    for (const [path, content] of Object.entries(files)) {
      expect(readFileSync(join('public', path), 'utf8'), path).toBe(content);
    }
  });

  it('the pack tells the agent to stop before payment and never to invent prices', () => {
    const md = files['packs/travel.jp-ticket-optimizer.md'];
    expect(md).toContain('付款、登入、送出個資、預約之前，一定先停下來問使用者');
    expect(md).toContain('不自己編價格');
    expect(md).toContain('¥3,500');
    expect(md).toContain('逐項單買 ¥12,320');
  });
});
