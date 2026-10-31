/**
 * Checks that every live source in every pack can actually be read: fetches each URL as a
 * normal browser and as an AI fetcher, and looks for the pack's `expect` words in the raw
 * HTML (what an agent without a JavaScript engine sees). Writes src/packs/source-status.json.
 *
 * Needs open internet — runs on GitHub Actions (.github/workflows/check-sources.yml).
 *   npm run check:sources            # all packs
 *   npm run check:sources -- <packId> # one pack (merged into the existing results)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PACKS, statusKey, type SourceStatus, type Verdict } from '../src/packs';
import { AGENTS, check } from './lib/fetch-check';

const OUT = 'src/packs/source-status.json';
const only = process.argv[2];
const prev: SourceStatus = JSON.parse(readFileSync(OUT, 'utf8'));
const results: SourceStatus['results'] = only ? { ...prev.results } : {};
const jobs = PACKS.filter((p) => !only || p.id === only).flatMap((p) => p.sources.map((s) => ({ p, s })));

// Six sources at a time; each source is fetched as a browser, then as an AI fetcher.
const queue = [...jobs];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const { p, s } = queue.shift()!;
      const browser = await check(s.url, s.expect, AGENTS.browser);
      const bot = await check(s.url, s.expect, AGENTS.bot);
      results[statusKey(p.id, s.id)] = { url: s.url, browser, bot };
    }
  }),
);

const sorted = Object.fromEntries(Object.entries(results).sort(([a], [b]) => a.localeCompare(b)));
const status: SourceStatus = { checkedAt: new Date().toISOString(), runner: process.env.GITHUB_ACTIONS ? 'github-actions' : 'local', results: sorted };
writeFileSync(OUT, JSON.stringify(status, null, 2) + '\n');

const icon: Record<Verdict, string> = { ok: '✅', no_text: '⚠️', blocked: '⛔', error: '❌' };
const lines = ['| 懶人包 | 來源 | 瀏覽器 | AI | 說明 |', '|---|---|---|---|---|'];
for (const { p, s } of jobs) {
  const r = results[statusKey(p.id, s.id)];
  const note = [r.browser.http, r.browser.missing?.length ? `缺：${r.browser.missing.join('、')}` : '', r.browser.note, r.bot.verdict !== r.browser.verdict ? `AI：${r.bot.http ?? ''} ${r.bot.note ?? ''}` : '']
    .filter(Boolean)
    .join(' ');
  lines.push(`| ${p.id} | [${s.id}](${s.url}) | ${icon[r.browser.verdict]} | ${icon[r.bot.verdict]} | ${note} |`);
}
const counts = Object.values(results).reduce<Record<string, number>>((a, r) => ((a[r.browser.verdict] = (a[r.browser.verdict] ?? 0) + 1), a), {});
const summary = `## 來源檢查 ${status.checkedAt}\n\n瀏覽器：${Object.entries(counts).map(([k, v]) => `${icon[k as Verdict]} ${v}`).join('　')}\n\n${lines.join('\n')}\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: 'a' });
