/**
 * LazyPack core domain types.
 *
 * This module is isomorphic (browser + Node): no DOM, no Node built-ins.
 * Web API routes, the MCP Gateway and the in-browser demo API all go through
 * the same TaskService, so every rule here applies identically to each channel.
 */

// ---------------------------------------------------------------------------
// Catalog (sources, transit, attractions, ticket products)
// ---------------------------------------------------------------------------

export type CityId = 'osaka' | 'kyoto';
export type SupportedCity = CityId;
export type DayType = 'weekday' | 'weekend_holiday';
export type TravelerCategory = 'adult' | 'child' | 'infant';
export type SourceType = 'official' | 'partner' | 'third_party';
export type TimePreference = 'daytime' | 'evening' | 'any';

export type TransitSystemId =
  | 'osaka_metro'
  | 'kyoto_bus'
  | 'kyoto_subway'
  | 'jr_local'
  | 'hankyu_intercity';

export interface PolicySource {
  id: string;
  title: string;
  url: string;
  authority: string;
  sourceType: SourceType;
  jurisdiction: 'JP';
  /** ISO date (YYYY-MM-DD) when a person last checked this source. */
  checkedAt: string;
  effectiveAt?: string;
  status: 'active' | 'needs_review' | 'retired';
  version: string;
  /** How the facts were checked. `search_extract` = read from search snippets, page not opened. */
  verification: 'manual' | 'search_extract' | 'derived';
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

/** A price that may differ by day type. `null` means "no verified price" (never guessed). */
export interface PriceRule {
  appliesTo: DayType | 'any';
  adult: number | null;
  child: number | null;
  /** Preschoolers. Defaults to 0 for transit/most attractions when omitted. */
  infant?: number | null;
}

/** Date-based (dynamic) pricing: the engine only ever shows a range, never a point estimate. */
export interface DynamicPrice {
  adultMin: number;
  /** `null` = no published ceiling. */
  adultMax: number | null;
  childMin: number | null;
  childMax: number | null;
  note: string;
}

export interface TransitSystem {
  id: TransitSystemId;
  name: string;
  nameJa: string;
  city: CityId | 'kansai';
  /** Fare used for the estimate of one ride, plus the official range it is drawn from. */
  estimateFare: { adult: number; child: number };
  fareRange: { adultMin: number; adultMax: number };
  estimateNote: string;
  sourceIds: string[];
}

export interface Attraction {
  id: string;
  name: string;
  nameJa: string;
  city: CityId;
  /** Neighbourhood: consecutive stops in the same area are assumed walkable. */
  area: string;
  /** Line used to reach it in the demand model. `null` = walking only. */
  access: TransitSystemId | null;
  /** `free` = no admission; `null` = no verified price. */
  admission: PriceRule[] | 'free' | null;
  dynamicPrice?: DynamicPrice;
  /** Requires a timed reservation in advance (affects booking handoff, not price). */
  reservationRequired?: boolean;
  keywords: string[];
  sourceIds: string[];
}

export type CoverageTarget =
  | { type: 'transit'; systemId: TransitSystemId }
  | { type: 'attraction'; attractionId: string };

export interface CoverageRule {
  target: CoverageTarget;
  included: boolean;
  /**
   * `false` = a source suggests coverage but it is not confirmed. Unconfirmed coverage is
   * never used to compute savings; it is only shown as "may be covered".
   */
  confirmed?: boolean;
  /** Max uses during the pass validity (e.g. each facility once). Omitted = unlimited. */
  usageLimit?: number;
  /** Coverage applies only when the visit happens in this window. */
  timeWindow?: { label: string; excludesEvening: boolean };
  exclusions?: string[];
  note?: string;
}

export interface PurchaseChannel {
  id: string;
  name: string;
  sourceType: SourceType;
  kind: 'online' | 'station_counter' | 'tourist_center' | 'ticket_machine';
  url: string;
  serviceFeeJpy: number;
  requiresLogin: boolean;
  requiresPayment: boolean;
  requiresPassport: boolean;
  /** Fields the executor may prefill (never credentials, OTP or payment details). */
  prefillable: Array<'product' | 'quantity' | 'use_date'>;
  notes?: string;
}

export interface TicketProduct {
  id: string;
  name: string;
  nameJa: string;
  kind: 'day_pass';
  area: CityId | 'kansai';
  validity: { days: number; consecutive: boolean; note: string };
  prices: PriceRule[];
  coverage: CoverageRule[];
  eligibility: { foreignPassportOnly: boolean; note?: string };
  /** Use dates must fall in this window (edition / fiscal-year validity). */
  salesWindow?: { from: string; to: string; note: string };
  purchaseChannels: PurchaseChannel[];
  cancellationPolicy: string;
  restrictions: string[];
  /** Main pass for its area: used by the naive "Pass-first" strategy. */
  mainPassFor?: CityId | 'intercity';
  sourceIds: string[];
}

export interface Catalog {
  version: string;
  sources: PolicySource[];
  transit: TransitSystem[];
  attractions: Attraction[];
  products: TicketProduct[];
  /** Japanese public holidays used for day-type pricing. */
  holidays: string[];
  /** Domains the executor may open (SSRF / scope guard). */
  executorAllowlist: string[];
}

// ---------------------------------------------------------------------------
// Package inputs (travel.jp-ticket-optimizer)
// ---------------------------------------------------------------------------

export interface DayPlanInput {
  date: string;
  /** City where the day's sightseeing happens. Unsupported values make the task ineligible. */
  city: string;
  attractions: string[];
  /** Explicit ride counts override the automatic estimate. */
  rides?: Partial<Record<TransitSystemId, number>>;
}

export interface JpTicketInput {
  travelDates?: { start: string; end: string };
  travelers?: { adults: number; childAges: number[] };
  lodgingCity?: string;
  days?: DayPlanInput[];
  preferredTimes?: TimePreference;
  flexibility?: 'fixed' | 'flexible';
  discountEligibility?: { foreignPassport: boolean };
  origin?: string;
  notes?: string;
  /**
   * Prototype only: replayable scenario knobs. Never accepted from external agents
   * in production; kept here so QA scenarios are reproducible end-to-end.
   */
  simulation?: SimulationKnobs;
}

export interface SimulationKnobs {
  soldOut?: Array<{ productId: string; date: string }>;
  /** Pretend the catalog was checked on this date (to test stale data). */
  catalogCheckedAtOverride?: string;
  /** Executor: checkout shows a different price than approved. */
  checkoutPriceDeltaJpy?: number;
  /** Executor: site shows CAPTCHA before reaching the checkout. */
  captcha?: boolean;
  /** Executor: product sold out at checkout time. */
  soldOutAtCheckout?: boolean;
}

// ---------------------------------------------------------------------------
// Comparison results
// ---------------------------------------------------------------------------

export interface TravelerGroup {
  category: TravelerCategory;
  count: number;
  label: string;
}

export interface DayDemand {
  date: string;
  dayType: DayType;
  weekdayLabel: string;
  city: CityId;
  rides: Partial<Record<TransitSystemId, number>>;
  ridesEstimated: boolean;
  attractions: string[];
}

export interface NormalizedInput {
  start: string;
  end: string;
  travelers: TravelerGroup[];
  lodgingCity: CityId;
  days: DayDemand[];
  preferredTimes: TimePreference;
  foreignPassport: boolean;
}

export interface CostLine {
  date: string;
  category: TravelerCategory;
  kind: 'pass' | 'transit_single' | 'admission';
  refId: string;
  label: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  sourceIds: string[];
  note?: string;
}

export interface PassPurchase {
  productId: string;
  category: TravelerCategory;
  count: number;
  startDate: string;
  coversDates: string[];
  unitPrice: number;
}

export interface CoverageCheckItem {
  date: string;
  demand: string;
  coveredBy: string;
}

export type StrategyId = 'singles' | 'pass_first' | 'optimized';

export interface StrategyResult {
  id: StrategyId;
  title: string;
  description: string;
  total: number;
  perCategory: Array<{ category: TravelerCategory; count: number; perPerson: number; subtotal: number }>;
  lines: CostLine[];
  passes: PassPurchase[];
  coverage: CoverageCheckItem[];
  /** Whether the strategy is feasible (e.g. pass-first impossible when no pass applies). */
  feasible: boolean;
  infeasibleReason?: string;
}

export interface NonEquivalentOption {
  title: string;
  changedConditions: string[];
  total: number;
  savingsVsRecommended: number;
}

export interface VariableItem {
  date: string;
  attractionId: string;
  label: string;
  perCategory: Array<{ category: TravelerCategory; count: number; min: number | null; max: number | null }>;
  reason: 'dynamic_pricing' | 'unknown_price';
  note: string;
}

export interface ComparisonWarning {
  code:
    | 'stale_source'
    | 'unknown_price'
    | 'dynamic_pricing'
    | 'fare_estimate'
    | 'eligibility'
    | 'sold_out'
    | 'time_window'
    | 'not_covered'
    | 'reservation_required'
    | 'no_savings'
    | 'child_pass_unavailable'
    | 'coverage_unconfirmed'
    | 'sales_window'
    | 'source_quality';
  severity: 'info' | 'warn' | 'block';
  message: string;
  refIds?: string[];
}

export interface SourceSnapshot {
  source: PolicySource;
  freshness: 'fresh' | 'stale';
  ageDays: number;
}

export interface ComparisonResult {
  priceCalculationVersion: string;
  catalogVersion: string;
  asOf: string;
  normalizedInput: NormalizedInput;
  strategies: StrategyResult[];
  recommendedStrategyId: StrategyId;
  baselineCost: number;
  optimizedCost: number;
  estimatedSavings: number;
  method: string[];
  nonEquivalentOptions: NonEquivalentOption[];
  variableItems: VariableItem[];
  warnings: ComparisonWarning[];
  sources: SourceSnapshot[];
  /** True when nothing blocks booking handoff (fresh sources, no sold-out recommended items). */
  handoffAllowed: boolean;
}

export interface ComparisonRun extends ComparisonResult {
  id: string;
  taskId: string;
  packageId: string;
  packageVersion: string;
  createdAt: string;
  /** Inputs + catalog snapshot needed to recompute the exact same result. */
  catalogSnapshot: Catalog;
  resultHash: string;
}

// ---------------------------------------------------------------------------
// Tasks, approvals, execution, outcomes
// ---------------------------------------------------------------------------

export type TaskStatus =
  | 'draft'
  | 'needs_input'
  | 'collecting_evidence'
  | 'evaluating'
  | 'plan_ready'
  | 'awaiting_user_approval'
  | 'executing'
  | 'awaiting_external_response'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'ineligible';

export type CompletionSubstate = 'submitted' | 'resolved_success' | 'resolved_no_recovery';

export type Channel = 'web' | 'mcp' | 'api' | 'demo';
export type Actor = 'user' | 'agent' | 'system' | 'executor' | 'admin';

export type Scope = 'packages:read' | 'tasks:read' | 'tasks:write' | 'approvals:write' | 'admin';

export interface AuthContext {
  userId: string;
  displayName: string;
  scopes: Scope[];
  channel: Channel;
  actor: Actor;
  tokenId?: string;
}

export interface BookingHandoffItem {
  order: number;
  productId: string;
  title: string;
  quantities: Array<{ category: TravelerCategory; count: number; unitPrice: number }>;
  useDate: string;
  amount: number;
  channel: PurchaseChannel;
  userMustDo: string[];
  tips: string[];
}

export interface PurchasePlan {
  strategyId: StrategyId;
  items: BookingHandoffItem[];
  passTotal: number;
  /** Rides and admissions paid on the day (IC card / gate). */
  payOnSiteTotal: number;
  automation: Array<{ step: string; who: 'lazypack' | 'user_confirm' | 'user_only' }>;
  feeQuote: FeeQuote;
}

export interface FeeQuote {
  comparisonFeeTwd: number;
  assistedPrefillFeeTwd: number;
  assistedPrefillNote: string;
  thirdPartyFees: Array<{ label: string; amountJpy: number; note: string }>;
  fxAssumption: { jpyToTwd: number; foreignTxFeeRate: number; note: string };
}

export type ActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'paused_for_user'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'superseded'
  | 'expired';

export interface PrefillBookingPayload {
  productId: string;
  productTitle: string;
  channelId: string;
  url: string;
  useDate: string;
  quantities: Array<{ category: TravelerCategory; count: number }>;
  expectedAmountJpy: number;
}

export interface ActionProposal {
  id: string;
  taskId: string;
  type: 'prefill_booking';
  status: ActionStatus;
  payload: PrefillBookingPayload;
  payloadHash: string;
  target: { site: string; domain: string; url: string; sourceType: SourceType };
  attachments: string[];
  amount: { amount: number; currency: 'JPY' };
  consequences: string[];
  executor: string;
  stopsBefore: string[];
  revision: number;
  createdAt: string;
  updatedAt: string;
  executionLog: ExecutionStep[];
  handoffUrl?: string;
  failureReason?: string;
}

export interface Approval {
  id: string;
  taskId: string;
  actionId: string;
  payloadHash: string;
  approvedBy: string;
  channel: Channel;
  approvedAt: string;
  expiresAt: string;
  status: 'valid' | 'used' | 'invalidated' | 'expired';
}

export interface ExecutionStep {
  at: string;
  step: string;
  result: 'ok' | 'paused' | 'stopped';
  detail: string;
}

export interface Evidence {
  id: string;
  taskId: string;
  kind: 'receipt' | 'booking_confirmation' | 'other';
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  /** The prototype never stores file contents; only metadata is kept. */
  storage: 'metadata_only';
  uploadedAt: string;
  uploadedBy: string;
  retentionDays: number;
}

export interface Outcome {
  kind: 'savings';
  substate: CompletionSubstate;
  estimatedSavings: number;
  baselineCost: number;
  claimedPaid: number | null;
  /** Only set when the purchase is backed by evidence and confirmed by the user. */
  verifiedSavings: number | null;
  currency: 'JPY';
  verificationType: 'receipt_upload' | 'user_statement' | 'none';
  evidenceRef: string[];
  verifiedAt: string | null;
  confidence: 'verified' | 'unverified';
  note: string;
}

export interface Task {
  id: string;
  userId: string;
  packageId: string;
  packageVersion: string;
  title: string;
  status: TaskStatus;
  completionSubstate?: CompletionSubstate;
  channel: Channel;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  input: JpTicketInput;
  missingFields: MissingField[];
  consents: { privacy_processing?: string; external_submission?: string };
  comparison?: ComparisonRun;
  selectedStrategyId?: StrategyId;
  purchasePlan?: PurchasePlan;
  actions: ActionProposal[];
  approvals: Approval[];
  evidence: Evidence[];
  outcome?: Outcome;
  statusReason?: string;
  paymentIntent?: { at: string; tier: string };
}

export interface MissingField {
  field: string;
  label: string;
  hint: string;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  seq: number;
  at: string;
  type: string;
  actor: Actor;
  channel: Channel;
  message: string;
  data?: Record<string, unknown>;
}

export type FunnelEvent =
  | 'landing_view'
  | 'start_intake'
  | 'qualified_case'
  | 'eligibility_view'
  | 'plan_view'
  | 'approve_plan'
  | 'upload_evidence'
  | 'payment_intent'
  | 'payment_success'
  | 'submission_verified'
  | 'outcome_verified'
  | 'referral';

export interface AnalyticsEvent {
  event: FunnelEvent;
  at: string;
  userId: string;
  channel: Channel;
  taskId?: string;
}

export interface CostEntry {
  id: string;
  taskId: string;
  at: string;
  category: 'llm' | 'browser_executor' | 'source_lookup' | 'compute' | 'human_review';
  description: string;
  units: number;
  unit: string;
  costTwd: number;
  simulated: true;
}
