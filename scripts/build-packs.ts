/**
 * Writes the agent-readable pack files to public/ (packs/*.md, packs/*.json, llms.txt).
 *   npm run packs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { PACK_BASE_URL } from '../src/app/config';
import { renderPackFiles } from '../src/core/packages/publish';

for (const [path, content] of Object.entries(renderPackFiles(PACK_BASE_URL))) {
  const out = join('public', path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content);
}
console.log('wrote public/packs/* and public/llms.txt');
