/**
 * Try candidate source URLs before putting them in a pack. One per line in
 * scripts/probe-urls.txt:   https://example.com/page | word one, word two
 * Runs on GitHub Actions when that file changes (needs open internet); read the job log.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { AGENTS, check } from './lib/fetch-check';

const lines = readFileSync('scripts/probe-urls.txt', 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));
const rows = await Promise.all(
  lines.map(async (l) => {
    const [url, words = ''] = l.split('|').map((x) => x.trim());
    const expect = words.split(',').map((w) => w.trim()).filter(Boolean);
    const [b, a] = [await check(url, expect, AGENTS.browser), await check(url, expect, AGENTS.bot)];
    const fmt = (r: typeof b) => `${r.verdict}${r.http ? `/${r.http}` : ''}${r.missing?.length ? ` 缺:${r.missing.join('、')}` : ''}${r.note ? ` ${r.note}` : ''}`;
    return `| ${url} | ${fmt(b)} | ${fmt(a)} |`;
  }),
);
const out = `## Probe\n\n| URL | 瀏覽器 | AI |\n|---|---|---|\n${rows.join('\n')}\n`;
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, out, { flag: 'a' });
