/** Fetch a page the way an agent would and check that the expected words are in its raw HTML. */
import type { SourceCheck } from '../../src/packs';

export const AGENTS = {
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

export async function check(url: string, expect: string[], ua: string): Promise<SourceCheck['browser']> {
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

