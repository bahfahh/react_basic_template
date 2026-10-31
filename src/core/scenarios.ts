import { addDays, dayOfWeek } from './lib/dates';
import type { ComparisonWarning, JpTicketInput, StrategyId, TaskStatus } from './types';

/**
 * Hand-built Japan itineraries for P0 acceptance (spec §11.6 #1) and replayable demos.
 * Dates are offsets from a Monday so weekday/weekend behaviour is stable; tests pin the
 * Monday, the web demo uses the first Monday at least two weeks out.
 */

export interface Scenario {
  id: string;
  title: string;
  summary: string;
  tests: string[];
  expect: {
    status: TaskStatus;
    recommended?: StrategyId;
    passIncludes?: string[];
    passExcludes?: string[];
    warnings?: Array<ComparisonWarning['code']>;
    savingsPositive?: boolean;
  };
  build(monday: string): JpTicketInput;
}

const d = (monday: string, offset: number) => addDays(monday, offset);
const range = (monday: string, from: number, to: number) => ({ start: d(monday, from), end: d(monday, to) });

export const SCENARIOS: Scenario[] = [
  {
    id: 'osaka-pass-wins',
    title: '大阪一日 3 景點',
    summary: '2 位大人，週二白天在大阪跑大阪城天守閣、梅田藍天大廈、道頓堀遊船。',
    tests: ['Pass 划算'],
    expect: { status: 'plan_ready', recommended: 'optimized', passIncludes: ['osaka_amazing_1d'], savingsPositive: true },
    build: (m) => ({
      travelDates: range(m, 1, 1),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 1), city: 'osaka', attractions: ['osaka_castle', 'umeda_sky', 'tombori_cruise'] }],
      preferredTimes: 'daytime',
      discountEligibility: { foreignPassport: true },
    }),
  },
  {
    id: 'osaka-pass-loses',
    title: '大阪一日只去海遊館',
    summary: '1 位大人，週三去大阪城和海遊館；海遊館不在周遊卡內，周遊卡不划算。',
    tests: ['Pass 不划算', '景點不涵蓋'],
    expect: { status: 'plan_ready', passExcludes: ['osaka_amazing_1d', 'osaka_amazing_2d'], warnings: ['not_covered'] },
    build: (m) => ({
      travelDates: range(m, 2, 2),
      travelers: { adults: 1, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 2), city: 'osaka', attractions: ['osaka_castle', 'kaiyukan'] }],
      discountEligibility: { foreignPassport: true },
    }),
  },
  {
    id: 'osaka-two-days',
    title: '大阪連續兩天',
    summary: '2 位大人，週四、週五都在大阪，景點分散在兩天。比較 2 日券、1 日券×2 與混搭。',
    tests: ['多日券', '每設施限用一次'],
    expect: { status: 'plan_ready', recommended: 'optimized', passIncludes: ['osaka_amazing_2d'], savingsPositive: true },
    build: (m) => ({
      travelDates: range(m, 3, 4),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'osaka',
      days: [
        { date: d(m, 3), city: 'osaka', attractions: ['osaka_castle', 'gozabune', 'tombori_cruise'] },
        { date: d(m, 4), city: 'osaka', attractions: ['umeda_sky', 'tsutenkaku', 'dotonbori'] },
      ],
      discountEligibility: { foreignPassport: true },
    }),
  },
  {
    id: 'kyoto-light',
    title: '京都散步行程',
    summary: '2 位大人住京都，一天只去伏見稻荷和清水寺；搭車段數少，一日券不划算。',
    tests: ['Pass 不划算'],
    expect: { status: 'plan_ready', recommended: 'singles', warnings: ['no_savings'] },
    build: (m) => ({
      travelDates: range(m, 1, 1),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'kyoto',
      days: [{ date: d(m, 1), city: 'kyoto', attractions: ['fushimi_inari', 'kiyomizu'] }],
    }),
  },
  {
    id: 'kyoto-bus-heavy',
    title: '京都一日多次搭公車',
    summary: '1 位大人住京都，一天跑金閣寺、二條城、清水寺、銀閣寺，公車＋地鐵 5 段以上。',
    tests: ['Pass 划算'],
    expect: { status: 'plan_ready', recommended: 'optimized', passIncludes: ['kyoto_subway_bus_1d'], savingsPositive: true },
    build: (m) => ({
      travelDates: range(m, 2, 2),
      travelers: { adults: 1, childAges: [] },
      lodgingCity: 'kyoto',
      days: [{ date: d(m, 2), city: 'kyoto', attractions: ['kinkakuji', 'nijo_castle', 'kiyomizu', 'ginkakuji'] }],
    }),
  },
  {
    id: 'usj-not-covered',
    title: 'USJ 一日',
    summary: '2 位大人去環球影城。任何收錄的 Pass 都不含 USJ，且 USJ 採日期浮動票價，只能顯示區間。',
    tests: ['景點不涵蓋', '日期浮動票價'],
    expect: { status: 'plan_ready', warnings: ['not_covered', 'dynamic_pricing'] },
    build: (m) => ({
      travelDates: range(m, 3, 3),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 3), city: 'osaka', attractions: ['usj'] }],
    }),
  },
  {
    id: 'weekend-metro',
    title: '週六只搭地鐵',
    summary: '1 位大人週六在大阪搭 4 段地鐵、去免門票的道頓堀與四天王寺周邊。週末地鐵一日券較便宜。',
    tests: ['日期限制（平日／假日票價）'],
    expect: { status: 'plan_ready', recommended: 'optimized', passIncludes: ['osaka_metro_1d'], savingsPositive: true },
    build: (m) => ({
      travelDates: range(m, 5, 5),
      travelers: { adults: 1, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 5), city: 'osaka', attractions: ['dotonbori'], rides: { osaka_metro: 4 } }],
    }),
  },
  {
    id: 'family-mixed-ages',
    title: '親子：2 大 2 小',
    summary: '2 位大人、8 歲與 4 歲小孩，大阪一日 3 景點。周遊卡沒有兒童票；幼兒搭車免費。',
    tests: ['不同人數與年齡'],
    expect: { status: 'plan_ready', warnings: ['child_pass_unavailable'] },
    build: (m) => ({
      travelDates: range(m, 1, 1),
      travelers: { adults: 2, childAges: [8, 4] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 1), city: 'osaka', attractions: ['osaka_castle', 'tombori_cruise', 'tempozan_wheel'] }],
    }),
  },
  {
    id: 'osaka-kyoto-family',
    title: '親子：大阪一天＋京都一日遊',
    summary: '2 位大人和 8 歲小孩住大阪：週二白天去大阪城、梅田藍天大廈、道頓堀遊船；週三搭阪急去京都清水寺、伏見稻荷、金閣寺，晚上回大阪。',
    tests: ['不同人數與年齡', 'Pass 划算'],
    expect: { status: 'plan_ready', recommended: 'optimized', passIncludes: ['osaka_amazing_1d', 'osaka_metro_1d'], savingsPositive: true },
    build: (m) => ({
      travelDates: range(m, 1, 2),
      travelers: { adults: 2, childAges: [8] },
      lodgingCity: 'osaka',
      preferredTimes: 'daytime',
      discountEligibility: { foreignPassport: true },
      days: [
        { date: d(m, 1), city: 'osaka', attractions: ['osaka_castle', 'umeda_sky', 'tombori_cruise'] },
        { date: d(m, 2), city: 'kyoto', attractions: ['kiyomizu', 'fushimi_inari', 'kinkakuji'] },
      ],
    }),
  },
  {
    id: 'daytrip-no-passport',
    title: '住大阪、京都一日遊（日本居民）',
    summary: '2 位大人住大阪、週三到京都。訪日旅客限定的關西鐵路周遊券需外國護照，日本居民不符資格。',
    tests: ['購買資格限制'],
    expect: { status: 'plan_ready', passExcludes: ['kansai_railway_lite_2d'], warnings: ['eligibility'] },
    build: (m) => ({
      travelDates: range(m, 2, 2),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 2), city: 'kyoto', attractions: ['kiyomizu', 'kinkakuji', 'nijo_castle'] }],
      discountEligibility: { foreignPassport: false },
    }),
  },
  {
    id: 'sold-out',
    title: '周遊卡當日售完',
    summary: '與「大阪一日 3 景點」相同，但模擬周遊卡 1 日券在當天售完／暫停販售。',
    tests: ['售罄'],
    expect: { status: 'plan_ready', passExcludes: ['osaka_amazing_1d'], warnings: ['sold_out'] },
    build: (m) => ({
      travelDates: range(m, 1, 1),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 1), city: 'osaka', attractions: ['osaka_castle', 'umeda_sky', 'tombori_cruise'] }],
      simulation: { soldOut: [{ productId: 'osaka_amazing_1d', date: d(m, 1) }] },
    }),
  },
  {
    id: 'stale-data',
    title: '資料過期',
    summary: '模擬票價來源已 120 天未核對：可以看比較，但不提供購買協助，需人工重新核對。',
    tests: ['資料過期'],
    expect: { status: 'blocked', warnings: ['stale_source'] },
    build: (m) => ({
      travelDates: range(m, 1, 1),
      travelers: { adults: 2, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 1), city: 'osaka', attractions: ['osaka_castle', 'umeda_sky', 'tombori_cruise'] }],
      simulation: { catalogCheckedAtOverride: addDays(m, -120) },
    }),
  },
  {
    id: 'evening-view',
    title: '想看梅田夜景',
    summary: '1 位大人偏好晚上去梅田藍天大廈；若周遊卡的免費入場有時段限制，會列出「較便宜但限制不同」的選項。',
    tests: ['時段限制', '非等價選項'],
    expect: { status: 'plan_ready' },
    build: (m) => ({
      travelDates: range(m, 4, 4),
      travelers: { adults: 1, childAges: [] },
      lodgingCity: 'osaka',
      days: [{ date: d(m, 4), city: 'osaka', attractions: ['osaka_castle', 'tombori_cruise', 'umeda_sky'] }],
      preferredTimes: 'evening',
    }),
  },
  {
    id: 'missing-info',
    title: '需補件：沒有日期',
    summary: '只說要去大阪城，沒有日期與人數 → 任務進入「待補件」，列出缺少的欄位。',
    tests: ['需補件'],
    expect: { status: 'needs_input' },
    build: () => ({ lodgingCity: 'osaka' }),
  },
  {
    id: 'unsupported-city',
    title: '不適用：東京',
    summary: '要求比較東京的票券 → 超出 Package 範圍，標記「不適用」，不用其他城市資料推測。',
    tests: ['不可申請／不適用'],
    expect: { status: 'ineligible' },
    build: (m) => ({
      travelDates: range(m, 1, 2),
      travelers: { adults: 2, childAges: [] },
      days: [{ date: d(m, 1), city: 'tokyo', attractions: [] }],
    }),
  },
];

export const REPLAY_SCENARIOS = {
  success: 'osaka-pass-wins',
  needsInput: 'missing-info',
  ineligible: 'unsupported-city',
} as const;

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

/** First Monday at least `minDaysAhead` days after `today`. */
export function upcomingMonday(today: string, minDaysAhead = 14): string {
  let date = addDays(today, minDaysAhead);
  while (dayOfWeek(date) !== 1) date = addDays(date, 1);
  return date;
}
