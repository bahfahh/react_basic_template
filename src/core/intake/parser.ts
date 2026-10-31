import { addDays, isIsoDate } from '../lib/dates';
import type { Catalog, DayPlanInput, JpTicketInput } from '../types';

/**
 * Rule-based intake parser (prototype stand-in for the LLM structured-output adapter).
 * It only extracts what is literally stated; anything ambiguous becomes a question for
 * the user instead of a guess. The user always confirms the structured form.
 */

export interface ParseResult {
  input: JpTicketInput;
  understood: string[];
  questions: string[];
  unsupportedPlaces: string[];
}

const CN_DIGITS: Record<string, number> = { 一: 1, 二: 2, 兩: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const NUM = '(\\d+|[一二兩两三四五六七八九十])';

const UNSUPPORTED_PLACES: Record<string, string> = {
  東京: 'tokyo',
  北海道: 'hokkaido',
  札幌: 'sapporo',
  福岡: 'fukuoka',
  名古屋: 'nagoya',
  奈良: 'nara',
  神戶: 'kobe',
  沖繩: 'okinawa',
  廣島: 'hiroshima',
};

const CITY_WORDS: Array<[RegExp, 'osaka' | 'kyoto']> = [
  [/大阪|osaka/i, 'osaka'],
  [/京都|kyoto/i, 'kyoto'],
];

function toNumber(token: string): number {
  return /^\d+$/.test(token) ? Number(token) : (CN_DIGITS[token] ?? NaN);
}

export function parseIntakeText(text: string, catalog: Catalog, today: string): ParseResult {
  const understood: string[] = [];
  const questions: string[] = [];
  const input: JpTicketInput = {};
  const t = text.replace(/\s+/g, ' ').trim();

  // ---- dates
  const dates = parseDates(t, today);
  if (dates) {
    input.travelDates = dates;
    understood.push(`日期 ${dates.start} 至 ${dates.end}`);
  } else {
    questions.push('請問旅遊日期是哪幾天？');
  }

  // ---- travelers
  const adultsMatch =
    t.match(new RegExp(`${NUM}\\s*(?:個|位|名)?\\s*(?:大人|成人)`)) ?? t.match(new RegExp(`${NUM}\\s*大(?!阪)`));
  const kidsCountMatch =
    t.match(new RegExp(`${NUM}\\s*(?:個|位|名)?\\s*(?:小孩|小朋友|兒童|孩子)`)) ?? t.match(new RegExp(`${NUM}\\s*小(?!時)`));
  const ages = [...t.matchAll(/(\d{1,2})\s*歲/g)].map((m) => Number(m[1])).filter((a) => a <= 17);
  const adults = adultsMatch ? toNumber(adultsMatch[1]) : /一個人|自己一人|獨旅|一人旅/.test(t) ? 1 : NaN;
  if (Number.isFinite(adults)) {
    input.travelers = { adults, childAges: ages };
    understood.push(`大人 ${adults} 位${ages.length ? `、兒童 ${ages.map((a) => `${a} 歲`).join('、')}` : ''}`);
    const kids = kidsCountMatch ? toNumber(kidsCountMatch[1]) : 0;
    if (kids > ages.length) questions.push(`有 ${kids} 位小孩，請提供每位的年齡（票價依年齡分級）。`);
  } else {
    questions.push('請問有幾位大人、幾位小孩（含年齡）？');
  }

  // ---- unsupported places
  const unsupportedPlaces = Object.keys(UNSUPPORTED_PLACES).filter((p) => t.includes(p));

  // ---- lodging
  const lodging = t.match(/住(?:在)?\s*(大阪|京都)/);
  if (lodging) {
    input.lodgingCity = lodging[1] === '大阪' ? 'osaka' : 'kyoto';
    understood.push(`住宿 ${lodging[1]}`);
  }

  // ---- attractions per day
  const segments = splitDays(t);
  const days: DayPlanInput[] = [];
  const allDates = input.travelDates ? dateList(input.travelDates.start, input.travelDates.end) : [];
  const found = new Set<string>();
  segments.forEach((seg, i) => {
    const hits = findAttractions(seg, catalog).filter((id) => !found.has(id));
    hits.forEach((id) => found.add(id));
    const segCity = CITY_WORDS.find(([re]) => re.test(seg))?.[1];
    const byCity = new Map<string, string[]>();
    for (const id of hits) {
      const city = catalog.attractions.find((a) => a.id === id)!.city;
      byCity.set(city, [...(byCity.get(city) ?? []), id]);
    }
    if (segments.length > 1) {
      const city = byCity.size === 1 ? [...byCity.keys()][0] : (segCity ?? input.lodgingCity ?? 'osaka');
      days.push({ date: allDates[i] ?? '', city, attractions: hits });
    } else {
      // No explicit day markers: one day per city, in order of first mention.
      const ordered = [...byCity.entries()].sort((a, b) => firstIndex(t, a[1], catalog) - firstIndex(t, b[1], catalog));
      ordered.forEach(([city, ids], j) => days.push({ date: allDates[j] ?? '', city, attractions: ids }));
    }
  });
  if (unsupportedPlaces.length > 0) {
    days.push({ date: allDates[days.length] ?? allDates[0] ?? '', city: UNSUPPORTED_PLACES[unsupportedPlaces[0]], attractions: [] });
  }
  const usable = days.filter((d) => d.date && (d.attractions.length > 0 || !['osaka', 'kyoto'].includes(d.city)));
  if (usable.length > 0) {
    input.days = usable;
    for (const d of usable) {
      const names = d.attractions.map((id) => catalog.attractions.find((a) => a.id === id)!.name);
      understood.push(`${d.date}：${names.join('、') || d.city}`);
    }
    if (!input.lodgingCity && ['osaka', 'kyoto'].includes(usable[0].city)) input.lodgingCity = usable[0].city;
  } else if (found.size > 0 && !input.travelDates) {
    questions.push('已認出景點，但需要日期才能安排到每一天。');
  } else {
    questions.push('每天想去哪些景點？（例如：大阪城、梅田藍天大廈、清水寺）');
  }
  if (days.length > allDates.length && allDates.length > 0) {
    questions.push('景點分組的天數比旅遊天數多，請在下方確認每日行程。');
  }

  // ---- preferences
  if (/晚上|夜景|傍晚|晚間/.test(t)) {
    input.preferredTimes = 'evening';
    understood.push('偏好晚上（夜景）');
  } else if (/白天|上午|早上/.test(t)) {
    input.preferredTimes = 'daytime';
  }
  if (/日本居民|住在日本|在日本工作|在留卡|沒有外國護照/.test(t)) {
    input.discountEligibility = { foreignPassport: false };
    understood.push('非短期旅客（不適用旅客限定票券）');
  }
  for (const [pattern, label] of [
    [/密碼|password/i, '密碼'],
    [/OTP|驗證碼|認證碼/i, 'OTP／驗證碼'],
    [/卡號|信用卡\s*\d/, '卡號'],
  ] as const) {
    if (pattern.test(t)) questions.push(`請不要提供${label}。懶人包不需要也不會保存這類資料。`);
  }

  return { input, understood, questions, unsupportedPlaces };
}

function parseDates(t: string, today: string): { start: string; end: string } | undefined {
  const year = Number(today.slice(0, 4));
  const pick = (m: number, d: number, y?: number) => {
    let iso = `${y ?? year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!y && iso < today) iso = `${year + 1}${iso.slice(4)}`;
    return isIsoDate(iso) ? iso : undefined;
  };
  const full = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s*(?:-|~|～|到|至)\s*(?:(\d{4})[-/.])?(\d{1,2})[-/.](\d{1,2}))?/);
  if (full) {
    const start = pick(+full[2], +full[3], +full[1]);
    const end = full[5] ? pick(+full[5], +full[6], full[4] ? +full[4] : +full[1]) : start;
    if (start && end && end >= start) return { start, end };
  }
  const md = t.match(/(\d{1,2})\s*[/月]\s*(\d{1,2})\s*日?\s*(?:(?:-|~|～|到|至)\s*(?:(\d{1,2})\s*[/月]\s*)?(\d{1,2})\s*日?)?/);
  if (md) {
    const start = pick(+md[1], +md[2]);
    if (!start) return undefined;
    let end = start;
    if (md[4]) {
      const endMonth = md[3] ? +md[3] : +md[1];
      end = pick(endMonth, +md[4], Number(start.slice(0, 4))) ?? start;
      if (end < start) end = start;
    } else {
      const dur = t.match(new RegExp(`${NUM}\\s*(?:天|日)(?!圓|幣)`));
      const n = dur ? toNumber(dur[1]) : 1;
      if (n > 1 && n <= 14) end = addDays(start, n - 1);
    }
    return { start, end };
  }
  return undefined;
}

function dateList(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end && out.length < 14; d = addDays(d, 1)) out.push(d);
  return out;
}

function splitDays(t: string): string[] {
  const marker = /(第\s*[一二三四五六七1-7]\s*天|Day\s*\d|隔天|第二天|最後一天|然後隔日|次日)/gi;
  const idx = [...t.matchAll(marker)].map((m) => m.index!);
  if (idx.length === 0) return [t];
  const parts: string[] = [];
  const starts = idx[0] > 0 ? [0, ...idx] : idx;
  starts.forEach((s, i) => parts.push(t.slice(s, starts[i + 1] ?? t.length)));
  return parts;
}

function findAttractions(text: string, catalog: Catalog): string[] {
  const hits: Array<{ id: string; pos: number }> = [];
  for (const a of catalog.attractions) {
    const pos = Math.min(...[a.name, a.nameJa, ...a.keywords].map((k) => text.indexOf(k)).filter((p) => p >= 0));
    if (Number.isFinite(pos)) hits.push({ id: a.id, pos });
  }
  return hits.sort((a, b) => a.pos - b.pos).map((h) => h.id);
}

function firstIndex(text: string, ids: string[], catalog: Catalog): number {
  return Math.min(
    ...ids.flatMap((id) => {
      const a = catalog.attractions.find((x) => x.id === id)!;
      return [a.name, ...a.keywords].map((k) => text.indexOf(k)).filter((p) => p >= 0);
    }),
  );
}
