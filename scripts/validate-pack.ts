/**
 * Validate one or more pack files and print their rendered Markdown.
 *   npx tsx scripts/validate-pack.ts src/packs/content/travel.jp-rail-pass.ts [--quiet]
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACK_IDS } from '../src/packs/ids';
import { lintPack, renderPackMarkdown } from '../src/packs/render';
import type { Pack } from '../src/packs/types';

const quiet = process.argv.includes('--quiet');
const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const stubs = PACK_IDS.map((x) => ({ id: x.id, title: x.title }) as Pack);
let failed = false;

for (const f of files) {
  const mod = await import(pathToFileURL(resolve(f)).href);
  const p: Pack = mod.default;
  if (!p?.id) throw new Error(`${f}: no default export`);
  if (!PACK_IDS.some((x) => x.id === p.id)) console.error(`${f}: id ${p.id} is not in src/packs/ids.ts`);
  const errors = lintPack(p, stubs);
  if (errors.length) {
    failed = true;
    console.error(`✗ ${p.id}\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  } else console.error(`✓ ${p.id}`);
  if (!quiet) console.log(renderPackMarkdown(p, stubs, { checkedAt: null, runner: null, results: {} }, 'https://example.invalid/packs/'));
}
process.exit(failed ? 1 : 0);
