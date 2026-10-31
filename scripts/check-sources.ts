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
import { PACKS, statusKey, type SourceCheck, type SourceStatus, type Verdict } from '../src/packs';

const OUT = 'src/packs/source-status.json';
const AGENTS = {
  browser:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  bot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
};
const CHALLENGE = /just a moment|cf-chl|challenge-platform|access denied|request blocked|captcha|incapsula|are you a robot/i;

function decode(buf: ArrayBuffer, contentType: string | null): string {
  const bytes = new Uint8Array(buf);
  const head = new TextDecoder('latin1').decode(bytes.slice(0, 4096));
  const charset =
    contentType?.match(/charset=["']?([\w-]+)/i)?.[1] ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, '');

async function check(url: string, expect: string[], ua: string): Promise<SourceCheck['browser']> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': ua, accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8', 'accept-language': 'zh-TW,zh;q=0.9,ja;q=0.8,en;q=0.7' },
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    });
    const body = decode(await res.arrayBuffer(), res.headers.get('content-type'));
    const moved = res.url !== url ? `轉址到 ${res.url}` : undefined;
    if (res.status === 403 || res.status === 429 || res.status === 503 || (res.status >= 400 && CHALLENGE.test(body)))
      return { verdict: 'blocked', http: res.status, note: moved };
    if (res.status >= 400) return { verdict: 'error', http: res.status, note: moved };
    if (/application\/pdf/.test(res.headers.get('content-type') ?? ''))
      return { verdict: 'ok', http: res.status, note: ['PDF，沒有檢查文字', moved].filter(Boolean).join('；') };
    const plain = norm(text(body));
    const missing = expect.filter((w) => !plain.includes(norm(w)));
    if (missing.length && CHALLENGE.test(body)) return { verdict: 'blocked', http: res.status, missing, note: moved };
    return { verdict: missing.length ? 'no_text' : 'ok', http: res.status, ...(missing.length ? { missing } : {}), ...(moved ? { note: moved } : {}) };
  } catch (e) {
    return { verdict: 'error', note: String((e as Error).cause ?? (e as Error).message).slice(0, 120) };
  }
}

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
