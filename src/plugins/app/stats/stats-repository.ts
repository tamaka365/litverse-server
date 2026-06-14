import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { toResult } from '../../../utils/result.js'

declare module 'fastify' {
  interface FastifyInstance {
    statsRepository: ReturnType<typeof createStatsRepository>
  }
}

export function createStatsRepository(fastify: FastifyInstance) {
  const db = fastify.kysely

  return {
    async trackClick(data: {
      event: string
      platform: string
      source: string
      userId?: number
    }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .insertInto('stats_tracks')
          .values({
            event: data.event,
            platform: data.platform,
            source: data.source,
            user_id: data.userId ?? null,
            created_at: nowSeconds
          })
          .execute()
      )
    },

    async getDashboardStats() {
      return toResult(
        Promise.all([
          // Totals
          db
            .selectFrom('users')
            .select(db.fn.count<number | string>('id').as('cnt'))
            .where('deleted_at', 'is', null)
            .executeTakeFirstOrThrow()
            .then((r) => Number(r.cnt)),
          db
            .selectFrom('ugc_posters')
            .select(db.fn.count<number | string>('poster_id').as('cnt'))
            .executeTakeFirstOrThrow()
            .then((r) => Number(r.cnt)),
          db
            .selectFrom('stats_tracks')
            .select(db.fn.count<number | string>('id').as('cnt'))
            .where('event', '=', 'click_buy_ticket')
            .executeTakeFirstOrThrow()
            .then((r) => Number(r.cnt)),

          // Personality Distribution
          db
            .selectFrom('ugc_posters')
            .select([
              'result_name as name',
              db.fn.count<number | string>('poster_id').as('value')
            ])
            .groupBy('result_name')
            .execute()
            .then((rows) =>
              rows.map((r) => ({ name: r.name, value: Number(r.value) }))
            ),

          // Click Trend (Last 7 Days)
          db
            .selectFrom('stats_tracks')
            .select(['created_at'])
            .where('event', '=', 'click_buy_ticket')
            .where(
              'created_at',
              '>=',
              Math.floor(Date.now() / 1000) - 7 * 86400
            )
            .execute()
        ]).then(
          ([
            userCount,
            posterCount,
            ticketClickCount,
            personalityDistribution,
            clicks
          ]) => {
            // Initialize trend mapping for last 7 days in local timezone
            const trendMap: Record<string, number> = {}
            const dates: string[] = []
            for (let i = 6; i >= 0; i--) {
              const date = new Date(Date.now() - i * 86400 * 1000)
              const mm = String(date.getMonth() + 1).padStart(2, '0')
              const dd = String(date.getDate()).padStart(2, '0')
              const dateStr = `${mm}-${dd}`
              dates.push(dateStr)
              trendMap[dateStr] = 0
            }

            // Populate clicks from tracks
            for (const click of clicks) {
              const date = new Date(Number(click.created_at) * 1000)
              const mm = String(date.getMonth() + 1).padStart(2, '0')
              const dd = String(date.getDate()).padStart(2, '0')
              const dateStr = `${mm}-${dd}`
              if (trendMap[dateStr] !== undefined) {
                trendMap[dateStr]++
              }
            }

            const values = dates.map((d) => trendMap[d])

            return {
              totals: {
                userCount,
                posterCount,
                ticketClickCount
              },
              personalityDistribution,
              ticketClicksTrend: {
                dates,
                values
              }
            }
          }
        )
      )
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const repo = createStatsRepository(fastify)
    fastify.decorate('statsRepository', repo)
  },
  {
    name: 'stats-repository',
    dependencies: ['kysely']
  }
)
