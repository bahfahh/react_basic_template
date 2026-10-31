/**
 * A pack is a skill-like playbook an online agent reads from a URL: what to ask, which
 * official pages to look up *right now*, how to compare, and what to report. Packs never
 * carry prices or amounts — those change; the agent reads them live from the sources.
 */

export type AreaId = 'travel' | 'benefit' | 'bills' | 'rights';
export type Value = '省錢' | '拿回錢' | '省時間';

/** Travel packs follow the trip; other areas have no stages. */
export const STAGES = ['出發前', '抵達日本', '在日本', '離開日本', '回國後'] as const;
export type Stage = (typeof STAGES)[number];

export interface LiveSource {
  /** Short id, unique within the pack; cited in steps and know-how as [S:id]. */
  id: string;
  name: string;
  owner: string;
  official: boolean;
  url: string;
  /** What the agent should read off this page. */
  find: string[];
  /** Words that must appear in the page's raw HTML; the source checker uses them. */
  expect: string[];
  /** What to search for if the URL fails or the page moved. */
  search: string;
}

export interface Pack {
  id: string;
  area: AreaId;
  stage?: Stage;
  title: string;
  value: Value[];
  /** Icon key, resolved by the app (keeps this module UI-free). */
  icon: string;
  /** One line for the card. */
  short: string;
  /** Skill-style: when an agent should use this pack. */
  description: string;
  /** Example of what the user might type when handing it off. */
  placeholder: string;
  /** Date this pack's method was last edited (not a data date — data is live). */
  updated: string;
  ask: { required: string[]; optional?: string[]; outOfScope?: string };
  /** Cite sources as [S:id] at the step where the agent should look them up. */
  steps: string[];
  compare?: { how: string; columns: string[] };
  /** Stable know-how and pitfalls; each item cites the source to re-check it against. */
  knowhow: string[];
  sources: LiveSource[];
  /** Report template shown to the agent verbatim. */
  report: string;
  related?: Array<{ id: string; why: string }>;
}

export interface PlannedPack {
  id: string;
  area: AreaId;
  title: string;
  short: string;
  icon: string;
  blocker: string;
}

export const AREAS: Record<AreaId, { title: string; blurb: string }> = {
  travel: { title: '出國玩（日本）', blurb: '從出發前到回國後，交通、付款、退稅、理賠。' },
  benefit: { title: '補助與退稅', blurb: '查你符合哪些補助，該拿的錢拿回來。' },
  bills: { title: '每月帳單', blurb: '固定支出比一比，不再多付。' },
  rights: { title: '退費與解約', blurb: '知道法律給你的權利，退貨退費不吃虧。' },
};

export const AREA_ORDER: AreaId[] = ['travel', 'benefit', 'bills', 'rights'];

/** Result of the automated reachability check for one source (see scripts/check-sources.ts). */
export type Verdict = 'ok' | 'no_text' | 'blocked' | 'error';

export interface SourceCheck {
  url: string;
  /** As a normal browser. */
  browser: { verdict: Verdict; http?: number; missing?: string[]; note?: string };
  /** As an AI fetcher (ChatGPT-User user agent). */
  bot: { verdict: Verdict; http?: number; missing?: string[]; note?: string };
}

export interface SourceStatus {
  checkedAt: string | null;
  runner: string | null;
  /** Keyed by `${packId}#${sourceId}`. */
  results: Record<string, SourceCheck>;
}
