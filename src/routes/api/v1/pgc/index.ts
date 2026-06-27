import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  ArtworksListResponseSchema,
  ArtworksQuery,
  ArtworksQuerySchema
} from '../../../../schemas/v1/artworks.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { artworksRepository, settingsRepository, log } = fastify

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
      const { type } = request.query

      const artworksResult = await artworksRepository.findArtworks({
        type: type as any
      })

      if (artworksResult.isErr()) {
        log.error(
          `Failed to retrieve artworks: ${artworksResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const dbOssResult = await settingsRepository.getOssSettings()
      const dbCdnResult = await settingsRepository.getCdnSettings()

            const cdnEnabled = dbCdnResult.isOk() && dbCdnResult.value.enabled
      const cdnDomain =
        (dbCdnResult.isOk() && dbCdnResult.value.domain) || ''

      const ossHostConfig = (dbOssResult.isOk() && dbOssResult.value.host) || ''
      const cleanOssHost = ossHostConfig.replace(/^https?:\/\//i, '').split('/')[0]

      const formatMediaUrl = (url: string) => {
        if (!url) return ''
        if (!cdnEnabled || !cdnDomain || !cleanOssHost) return url
        const cleanCdnDomain = cdnDomain.replace(/^https?:\/\//i, '')
        return url.replace(cleanOssHost, cleanCdnDomain).replace(/^http:\/\//i, 'https://')
      }

      const list = artworksResult.value.map((art) => ({
        id: art.id,
        type: art.type as 'image' | 'video' | 'audio',
        url: formatMediaUrl(art.url),
        mediaUrl: formatMediaUrl(art.mediaUrl),
        aspectRatio: art.aspectRatio,
        title: art.title,
        createdAt: new Date(art.createdAt * 1000).toISOString()
      }))

      return successResponse({ list })
    }
  )
}

export default plugin
