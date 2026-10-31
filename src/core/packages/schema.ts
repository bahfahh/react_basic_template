import { z } from 'zod';

/**
 * Input schema for travel.jp-ticket-optimizer. Every channel (web, HTTP API, MCP) validates
 * with this same schema; `npm run export:schemas` writes the JSON Schema next to the manifest.
 * Unknown keys are rejected so credentials or IDs can't be smuggled in as extra fields.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式需為 YYYY-MM-DD');
const transitSystem = z.enum(['osaka_metro', 'kyoto_bus', 'kyoto_subway', 'jr_local', 'hankyu_intercity']);

export const simulationSchema = z
  .object({
    soldOut: z.array(z.object({ productId: z.string(), date: isoDate }).strict()).max(20).optional(),
    catalogCheckedAtOverride: isoDate.optional(),
    checkoutPriceDeltaJpy: z.number().int().min(-100000).max(100000).optional(),
    captcha: z.boolean().optional(),
    soldOutAtCheckout: z.boolean().optional(),
  })
  .strict()
  .describe('Prototype-only replay knobs. Accepted from the web demo only.');

export const jpTicketInputSchema = z
  .object({
    travelDates: z.object({ start: isoDate, end: isoDate }).strict().optional().describe('travel_dates'),
    travelers: z
      .object({
        adults: z.number().int().min(0).max(9),
        childAges: z.array(z.number().int().min(0).max(17)).max(8),
      })
      .strict()
      .optional()
      .describe('travelers'),
    lodgingCity: z.string().max(40).optional().describe('lodging_area'),
    days: z
      .array(
        z
          .object({
            date: isoDate,
            city: z.string().max(40),
            attractions: z.array(z.string().max(60)).max(12),
            rides: z.partialRecord(transitSystem, z.number().int().min(0).max(20)).optional(),
          })
          .strict(),
      )
      .max(7)
      .optional()
      .describe('destinations_or_attractions'),
    preferredTimes: z.enum(['daytime', 'evening', 'any']).optional().describe('preferred_times'),
    flexibility: z.enum(['fixed', 'flexible']).optional().describe('flexibility'),
    discountEligibility: z.object({ foreignPassport: z.boolean() }).strict().optional().describe('discount_eligibility'),
    origin: z.string().max(60).optional().describe('origin'),
    notes: z.string().max(500).optional(),
    simulation: simulationSchema.optional(),
  })
  .strict();

export type JpTicketInputParsed = z.infer<typeof jpTicketInputSchema>;

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/**
 * Output contract of get_task / create_task for agents (toAgentSummary). Exported as
 * schemas/task-result.output.json; a test validates real responses against it.
 */
const money = z.number().int();
export const taskResultSchema = z.object({
  id: z.string(),
  title: z.string(),
  packageId: z.string(),
  status: z.string(),
  statusLabel: z.string(),
  bucket: z.enum(['needs_input', 'awaiting_approval', 'in_progress', 'submitted', 'resolved', 'stopped']),
  completionSubstate: z.enum(['submitted', 'resolved_success', 'resolved_no_recovery']).nullable(),
  statusReason: z.string().nullable(),
  missingFields: z.array(z.object({ field: z.string(), label: z.string(), hint: z.string() })),
  webUrl: z.string(),
  comparison: z
    .object({
      asOf: isoDate,
      recommendedStrategyId: z.enum(['singles', 'pass_first', 'optimized']),
      baselineCostJpy: money,
      recommendedCostJpy: money,
      estimatedSavingsJpy: money,
      estimatedSavingsNote: z.string(),
      strategies: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          totalJpy: money,
          feasible: z.boolean(),
          passes: z.array(z.object({ productId: z.string(), category: z.string(), count: z.number(), startDate: isoDate, coversDates: z.array(isoDate), unitPrice: money })),
        }),
      ),
      warnings: z.array(z.object({ code: z.string(), severity: z.enum(['info', 'warn', 'block']), message: z.string() })),
      sources: z.array(z.object({ title: z.string(), url: z.string(), type: z.string(), checkedAt: isoDate, freshness: z.enum(['fresh', 'stale']) })),
      handoffAllowed: z.boolean(),
      resultHash: z.string(),
    })
    .nullable(),
  pendingApprovals: z.array(
    z.object({ actionId: z.string(), type: z.literal('prefill_booking'), title: z.string(), target: z.string(), amountJpy: money, payloadHash: z.string(), approveIn: z.string() }),
  ),
  actions: z.array(z.object({ actionId: z.string(), title: z.string(), status: z.string(), handoffUrl: z.string().nullable() })),
  evidenceCount: z.number().int(),
  outcome: z
    .object({
      substate: z.string(),
      estimatedSavings: money,
      verifiedSavings: money.nullable(),
      confidence: z.enum(['verified', 'unverified']),
    })
    .passthrough()
    .nullable(),
  updatedAt: z.string(),
});
