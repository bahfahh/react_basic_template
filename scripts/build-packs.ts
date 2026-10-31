/**
 * Writes the agent-readable pack files to public/ (packs/*.md, packs/*.json, llms.txt)
 * and removes pack files that no longer exist.
 *   npm run packs
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PACK_BASE_URL } from '../src/app/config';
import { renderPackFiles } from '../src/packs';

const files = renderPackFiles(PACK_BASE_URL);
mkdirSync('public/packs', { recursive: true });
for (const f of readdirSync('public/packs')) if (!files[`packs/${f}`]) rmSync(join('public/packs', f));
for (const [path, content] of Object.entries(files)) {
  const out = join('public', path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content);
}
console.log(`wrote ${Object.keys(files).length} files to public/`);
