import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PACK_BASE_URL } from '../src/app/config';
import { PACK_IDS } from '../src/packs/ids';
import { lintPack, PACKS, renderPackFiles, SOURCE_STATUS, statusKey } from '../src/packs';

describe('packs', () => {
  const files = renderPackFiles(PACK_BASE_URL);

  it('committed files match the generator (run `npm run packs` after changing a pack)', () => {
    for (const [path, content] of Object.entries(files)) {
      expect(readFileSync(join('public', path), 'utf8'), path).toBe(content);
    }
  });

  it('every pack passes lint: no amounts, every fact checkable, every source used', () => {
    for (const p of PACKS) expect(lintPack(p, PACKS), p.id).toEqual([]);
  });

  it('every listed id has exactly one pack, in the same area', () => {
    expect(PACKS.map((p) => p.id)).toEqual(PACK_IDS.map((x) => x.id));
    for (const x of PACK_IDS) expect(PACKS.find((p) => p.id === x.id)?.area, x.id).toBe(x.area);
  });

  it('travel packs have a stage, other packs do not', () => {
    for (const p of PACKS) expect(Boolean(p.stage), p.id).toBe(p.area === 'travel');
  });

  it('every pack tells the agent to look things up live and to stop before acting', () => {
    for (const p of PACKS) {
      const md = files[`packs/${p.id}.md`];
      expect(md, p.id).toMatch(/^---\nname: lazypack-/);
      expect(md, p.id).toContain('一律在「即時查詢來源」現場查');
      expect(md, p.id).toContain('一定先停下來問使用者');
    }
  });

  it('source check results only refer to sources that exist', () => {
    const keys = new Set(PACKS.flatMap((p) => p.sources.map((s) => statusKey(p.id, s.id))));
    for (const k of Object.keys(SOURCE_STATUS.results)) expect(keys.has(k), k).toBe(true);
  });
});
