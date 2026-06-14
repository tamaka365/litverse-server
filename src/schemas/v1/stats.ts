import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

// --- Click Track ---
export const TrackClickRequestSchema = Type.Object({
  event: Type.String({ minLength: 1, maxLength: 100 }),
  platform: Type.String({ minLength: 1, maxLength: 50 }),
  source: Type.String({ minLength: 1, maxLength: 100 })
})

export type TrackClickRequest = Static<typeof TrackClickRequestSchema>

// --- Dashboard Stats (Admin) ---
export const DashboardTotalsSchema = Type.Object({
  userCount: Type.Integer(),
  posterCount: Type.Integer(),
  ticketClickCount: Type.Integer()
})

export const PersonalityDistributionItemSchema = Type.Object({
  name: Type.String(),
  value: Type.Integer()
})

export const TicketClicksTrendSchema = Type.Object({
  dates: Type.Array(Type.String()),
  values: Type.Array(Type.Integer())
})

export const DashboardStatsResponseDataSchema = Type.Object({
  totals: DashboardTotalsSchema,
  personalityDistribution: Type.Array(PersonalityDistributionItemSchema),
  ticketClicksTrend: TicketClicksTrendSchema
})

export const DashboardStatsResponseSchema = wrapResponseSchema(
  DashboardStatsResponseDataSchema
)
export type DashboardStatsResponse = Static<typeof DashboardStatsResponseSchema>
