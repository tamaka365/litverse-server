import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  TrackClickRequest,
  TrackClickRequestSchema
} from '../../../../schemas/v1/stats.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { statsRepository, log } = fastify

  fastify.post<{ Body: TrackClickRequest }>(
    '/track',
    {
      schema: {
        tags: ['V1 Stats'],
        body: TrackClickRequestSchema
      }
    },
    async (request, reply) => {
      const { event, platform, source } = request.body
      let userId: number | undefined

      const authHeader = request.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = (await request.jwtVerify()) as { id: number }
          userId = decoded.id
        } catch {
          // Silent catch: analytics doesn't fail request due to bad/expired tokens
        }
      }

      const trackResult = await statsRepository.trackClick({
        event,
        platform,
        source,
        userId
      })

      if (trackResult.isErr()) {
        log.error(
          `Analytics click tracking failed: ${trackResult.error.message}`
        )
        return reply.internalServerError('Failed to track stats')
      }

      return successResponse(null, 'tracked')
    }
  )
}

export default plugin
