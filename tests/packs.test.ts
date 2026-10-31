import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACK_BASE_URL } from '../src/app/config';
import { missingSourceRefs } from '../src/core/packages/guides';
import { GUIDES, renderPackFiles, TICKET_RELATED } from '../src/core/packages/publish';

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

  it('every guide fact cites a listed source', () => {
    for (const g of Object.values(GUIDES)) expect(missingSourceRefs(g), g.id).toEqual([]);
  });

  it('every active pack has a published file', () => {
    for (const id of Object.keys(GUIDES)) expect(files[`packs/${id}.md`], id).toBeTruthy();
  });

  it('every related-pack link points at a published pack, never at itself', () => {
    const lists: Array<[string, Array<{ id: string }>]> = [
      ...Object.values(GUIDES).map((g): [string, Array<{ id: string }>] => [g.id, g.related ?? []]),
      ['travel.jp-ticket-optimizer', TICKET_RELATED],
    ];
    for (const [from, related] of lists) {
      for (const r of related) {
        expect(r.id, from).not.toBe(from);
        expect(files[`packs/${r.id}.md`], `${from} → ${r.id}`).toBeTruthy();
      }
    }
  });
});
