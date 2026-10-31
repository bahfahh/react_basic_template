import { dateRange, daysBetween, isIsoDate, isWeekendOrHoliday, weekdayLabel } from '../lib/dates';
import type {
  CityId,
  DayDemand,
  JpTicketInput,
  MissingField,
  NormalizedInput,
  TransitSystemId,
  TravelerGroup,
} from '../types';
import type { CatalogIndex } from './pricing';

export const SUPPORTED_CITIES: CityId[] = ['osaka', 'kyoto'];
export const MAX_TRIP_DAYS = 7;
export const MAX_TRAVELERS = 9;

const CITY_MAIN_SYSTEM: Record<CityId, TransitSystemId> = {
  osaka: 'osaka_metro',
  kyoto: 'kyoto_bus',
};

export const CITY_LABEL: Record<CityId, string> = { osaka: '大阪', kyoto: '京都' };

export type NormalizeOutcome =
  | { kind: 'ok'; normalized: NormalizedInput; unknownAttractions: string[] }
  | { kind: 'needs_input'; missing: MissingField[] }
  | { kind: 'ineligible'; reason: string };

export function isSupportedCity(city: string | undefined): city is CityId {
  return !!city && (SUPPORTED_CITIES as string[]).includes(city);
}

export function travelerGroups(adults: number, childAges: number[]): TravelerGroup[] {
  const teens = childAges.filter((a) => a >= 12).length;
  const children = childAges.filter((a) => a >= 6 && a < 12).length;
  const infants = childAges.filter((a) => a < 6).length;
  const groups: TravelerGroup[] = [
    { category: 'adult', count: adults + teens, label: '大人（12 歲以上）' },
    { category: 'child', count: children, label: '兒童（6–11 歲）' },
    { category: 'infant', count: infants, label: '幼兒（未滿 6 歲）' },
  ];
  return groups.filter((g) => g.count > 0);
}

/**
 * Validates what the package needs and turns free-form inputs into per-day demand.
 * Never guesses missing facts: anything required but absent becomes `needs_input`.
 */
export function normalizeInput(input: JpTicketInput, index: CatalogIndex): NormalizeOutcome {
  const missing: MissingField[] = [];
  const { travelDates, travelers } = input;

  const unsupported = new Set<string>();
  for (const city of [input.lodgingCity, ...(input.days ?? []).map((d) => d.city)]) {
    if (city && !isSupportedCity(city)) unsupported.add(city);
  }
  if (unsupported.size > 0) {
    return {
      kind: 'ineligible',
      reason: `此 Package 目前只支援大阪、京都；不支援：${[...unsupported].join('、')}。不會用其他城市的資料推測票價。`,
    };
  }

  const datesValid =
    !!travelDates && isIsoDate(travelDates.start) && isIsoDate(travelDates.end) && travelDates.start <= travelDates.end;
  if (!datesValid) {
    missing.push({ field: 'travel_dates', label: '旅遊日期', hint: '請提供開始與結束日期（例如 2026-11-20 至 2026-11-21）。' });
  } else if (daysBetween(travelDates.start, travelDates.end) + 1 > MAX_TRIP_DAYS) {
    missing.push({ field: 'travel_dates', label: '旅遊日期', hint: `原型一次最多比較 ${MAX_TRIP_DAYS} 天，請縮短或拆成多個任務。` });
  }

  const adults = travelers?.adults ?? 0;
  const childAges = travelers?.childAges ?? [];
  if (!travelers || adults < 1) {
    missing.push({ field: 'travelers', label: '旅客人數', hint: '至少需要 1 位大人；兒童請填年齡（票價依年齡分級）。' });
  } else if (adults + childAges.length > MAX_TRAVELERS) {
    missing.push({ field: 'travelers', label: '旅客人數', hint: `原型最多 ${MAX_TRAVELERS} 人。` });
  } else if (childAges.some((a) => !Number.isInteger(a) || a < 0 || a > 17)) {
    missing.push({ field: 'travelers', label: '兒童年齡', hint: '兒童年齡需為 0–17 的整數。' });
  }

  const plannedDays = (input.days ?? []).filter((d) => d.attractions.length > 0 || hasRides(d.rides));
  if (plannedDays.length === 0) {
    missing.push({
      field: 'destinations_or_attractions',
      label: '每日景點',
      hint: '請至少為一天選擇想去的景點（或填寫交通段數），才能判斷 Pass 是否划算。',
    });
  }

  if (datesValid && plannedDays.some((d) => d.date < travelDates.start || d.date > travelDates.end || !isIsoDate(d.date))) {
    missing.push({ field: 'days', label: '每日行程日期', hint: '每日行程的日期必須落在旅遊日期內。' });
  }

  if (missing.length > 0) return { kind: 'needs_input', missing };

  const dates = dateRange(travelDates!.start, travelDates!.end);
  const lodgingCity: CityId = isSupportedCity(input.lodgingCity)
    ? input.lodgingCity
    : (plannedDays[0].city as CityId);
  const unknownAttractions: string[] = [];

  const days: DayDemand[] = dates.map((date) => {
    const plan = plannedDays.find((d) => d.date === date);
    const city = (plan?.city as CityId | undefined) ?? lodgingCity;
    const attractions: string[] = [];
    for (const id of plan?.attractions ?? []) {
      const a = index.attraction(id);
      if (!a) unknownAttractions.push(id);
      else if (!attractions.includes(id)) attractions.push(id);
    }
    const explicit = plan?.rides && hasRides(plan.rides);
    return {
      date,
      dayType: isWeekendOrHoliday(date, index.catalog.holidays) ? 'weekend_holiday' : 'weekday',
      weekdayLabel: weekdayLabel(date),
      city,
      attractions,
      rides: explicit ? cleanRides(plan!.rides!) : estimateRides(city, lodgingCity, attractions, index),
      ridesEstimated: !explicit,
    };
  });

  return {
    kind: 'ok',
    unknownAttractions,
    normalized: {
      start: travelDates!.start,
      end: travelDates!.end,
      travelers: travelerGroups(adults, childAges),
      lodgingCity,
      days,
      preferredTimes: input.preferredTimes ?? 'any',
      foreignPassport: input.discountEligibility?.foreignPassport ?? true,
    },
  };
}

function hasRides(rides: Partial<Record<TransitSystemId, number>> | undefined): boolean {
  return !!rides && Object.values(rides).some((n) => (n ?? 0) > 0);
}

function cleanRides(rides: Partial<Record<TransitSystemId, number>>): Partial<Record<TransitSystemId, number>> {
  const out: Partial<Record<TransitSystemId, number>> = {};
  for (const [k, v] of Object.entries(rides)) {
    const n = Math.max(0, Math.min(20, Math.floor(v ?? 0)));
    if (n > 0) out[k as TransitSystemId] = n;
  }
  return out;
}

/**
 * Deterministic ride estimate: one ride to reach each attraction on its access line
 * (none when it is in the same area as the previous stop), one ride back, plus an
 * intercity round trip when sightseeing outside the lodging city.
 * Shown to the user as an assumption they can edit.
 */
export function estimateRides(
  city: CityId,
  lodgingCity: CityId,
  attractionIds: string[],
  index: CatalogIndex,
): Partial<Record<TransitSystemId, number>> {
  const rides: Partial<Record<TransitSystemId, number>> = {};
  const add = (id: TransitSystemId, n = 1) => {
    rides[id] = (rides[id] ?? 0) + n;
  };
  if (attractionIds.length === 0) return rides;
  let last: TransitSystemId = CITY_MAIN_SYSTEM[city];
  let prevArea: string | undefined;
  for (const id of attractionIds) {
    const a = index.attraction(id);
    if (!a) continue;
    if (a.access && a.area !== prevArea) {
      add(a.access);
      last = a.access;
    }
    prevArea = a.area;
  }
  add(last);
  if (city !== lodgingCity) add('hankyu_intercity', 2);
  return rides;
}
