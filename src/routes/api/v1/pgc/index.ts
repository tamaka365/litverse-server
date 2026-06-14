import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  ArtworksListResponseSchema,
  ArtworksQuery,
  ArtworksQuerySchema
} from '../../../../schemas/v1/artworks.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { artworksRepository, log } = fastify

  fastify.get<{ Querystring: ArtworksQuery }>(
    '/artworks',
    {
      schema: {
        tags: ['V1 PGC'],
        querystring: ArtworksQuerySchema,
        response: {
          200: ArtworksListResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { type, limit = 24 } = request.query

      const artworksResult = await artworksRepository.findArtworks({
        type: type as any,
        limit
      })

      if (artworksResult.isErr()) {
        log.error(
          `Failed to retrieve artworks: ${artworksResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const list = artworksResult.value.map((art) => ({
        id: art.id,
        type: art.type as 'image' | 'video' | 'audio',
        url: art.url,
        mediaUrl: art.mediaUrl,
        aspectRatio: art.aspectRatio,
        title: art.title,
        createdAt: new Date(art.createdAt * 1000).toISOString()
      }))

      return successResponse({ list })
    }
  )
}

export default plugin
