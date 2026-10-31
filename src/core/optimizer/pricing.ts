import type { Attraction, Catalog, DayType, PriceRule, TicketProduct, TransitSystem, TransitSystemId, TravelerCategory } from '../types';

export function priceFor(rules: PriceRule[], category: TravelerCategory, dayType: DayType): number | null {
  const rule = rules.find((r) => r.appliesTo === dayType) ?? rules.find((r) => r.appliesTo === 'any');
  if (!rule) return null;
  if (category === 'infant') return rule.infant === undefined ? null : rule.infant;
  return rule[category];
}

/** Single-ride fare used in the estimate. Preschoolers ride free with a paying adult. */
export function transitFare(system: TransitSystem, category: TravelerCategory): number {
  if (category === 'infant') return 0;
  return system.estimateFare[category];
}

export type AdmissionPrice =
  | { kind: 'fixed'; price: number }
  | { kind: 'free' }
  | { kind: 'dynamic'; min: number | null; max: number | null }
  | { kind: 'unknown' };

export function admissionPrice(attraction: Attraction, category: TravelerCategory, dayType: DayType): AdmissionPrice {
  if (attraction.admission === 'free') return { kind: 'free' };
  if (attraction.dynamicPrice) {
    const d = attraction.dynamicPrice;
    if (category === 'adult') return { kind: 'dynamic', min: d.adultMin, max: d.adultMax };
    if (category === 'child') return { kind: 'dynamic', min: d.childMin, max: d.childMax };
    return { kind: 'unknown' };
  }
  if (!attraction.admission) return { kind: 'unknown' };
  const price = priceFor(attraction.admission, category, dayType);
  return price === null ? { kind: 'unknown' } : { kind: 'fixed', price };
}

export function passPrice(product: TicketProduct, category: TravelerCategory, dayType: DayType): number | null {
  return priceFor(product.prices, category, dayType);
}

export interface CatalogIndex {
  catalog: Catalog;
  attraction(id: string): Attraction | undefined;
  transit(id: TransitSystemId): TransitSystem;
  product(id: string): TicketProduct | undefined;
}

export function indexCatalog(catalog: Catalog): CatalogIndex {
  const attractions = new Map(catalog.attractions.map((a) => [a.id, a]));
  const transit = new Map(catalog.transit.map((t) => [t.id, t]));
  const products = new Map(catalog.products.map((p) => [p.id, p]));
  return {
    catalog,
    attraction: (id) => attractions.get(id),
    transit: (id) => {
      const t = transit.get(id);
      if (!t) throw new Error(`Unknown transit system ${id}`);
      return t;
    },
    product: (id) => products.get(id),
  };
}
