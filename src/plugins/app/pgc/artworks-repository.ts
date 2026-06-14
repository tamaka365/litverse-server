import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { sql } from 'kysely'
import { paginateResults, toResult } from '../../../utils/result.js'

declare module 'fastify' {
  interface FastifyInstance {
    artworksRepository: ReturnType<typeof createArtworksRepository>
  }
}

export function createArtworksRepository(fastify: FastifyInstance) {
  const db = fastify.kysely

  return {
    async findArtworks(options: {
      type?: 'image' | 'video' | 'audio'
      limit: number
    }) {
      const { type, limit } = options
      let query = db
        .selectFrom('pgc_artworks')
        .select([
          'id',
          'type',
          'title',
          'url',
          'media_url as mediaUrl',
          'aspect_ratio as aspectRatio',
          'created_at as createdAt'
        ])
        .where('deleted_at', 'is', null)

      if (type) {
        query = query.where('type', '=', type)
      }

      return toResult(
        query.orderBy('created_at', 'desc').limit(limit).execute()
      )
    },

    async findAdminArtworks(options: {
      page: number
      pageSize: number
      type?: 'image' | 'video' | 'audio'
    }) {
      const { page, pageSize, type } = options
      const offset = (page - 1) * pageSize

      let query = db.selectFrom('pgc_artworks').where('deleted_at', 'is', null)
      let countQuery = db
        .selectFrom('pgc_artworks')
        .where('deleted_at', 'is', null)

      if (type) {
        query = query.where('type', '=', type)
        countQuery = countQuery.where('type', '=', type)
      }

      return paginateResults(
        toResult(
          query
            .select([
              'id',
              'type',
              'title',
              'url',
              'media_url as mediaUrl',
              'aspect_ratio as aspectRatio',
              'created_at as createdAt'
            ])
            .orderBy('created_at', 'desc')
            .limit(pageSize)
            .offset(offset)
            .execute()
        ),
        toResult(
          countQuery
            .select(db.fn.count<number | string>('id').as('count'))
            .executeTakeFirstOrThrow()
            .then((result) => Number(result.count))
        )
      )
    },

    async findById(id: number) {
      return toResult(
        db
          .selectFrom('pgc_artworks')
          .select([
            'id',
            'type',
            'title',
            'url',
            'media_url as mediaUrl',
            'aspect_ratio as aspectRatio',
            'created_at as createdAt'
          ])
          .where('id', '=', id)
          .where('deleted_at', 'is', null)
          .executeTakeFirst()
          .then((art) => art ?? null)
      )
    },

    async createArtwork(data: {
      type: 'image' | 'video' | 'audio'
      title: string
      url: string
      mediaUrl: string
      aspectRatio: number
    }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .insertInto('pgc_artworks')
          .values({
            type: data.type,
            title: data.title,
            url: data.url,
            media_url: data.mediaUrl,
            aspect_ratio: data.aspectRatio,
            created_at: nowSeconds,
            updated_at: nowSeconds
          })
          .returning(['id', 'type', 'title'])
          .executeTakeFirstOrThrow()
      )
    },

    async updateArtwork(
      id: number,
      data: {
        title?: string
        url?: string
        mediaUrl?: string
        aspectRatio?: number
      }
    ) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const updatePayload: Record<string, any> = {
        updated_at: nowSeconds,
        version: sql<number>`version + 1`
      }

      if (data.title !== undefined) updatePayload.title = data.title
      if (data.url !== undefined) updatePayload.url = data.url
      if (data.mediaUrl !== undefined) updatePayload.media_url = data.mediaUrl
      if (data.aspectRatio !== undefined)
        updatePayload.aspect_ratio = data.aspectRatio

      return toResult(
        db
          .updateTable('pgc_artworks')
          .set(updatePayload)
          .where('id', '=', id)
          .where('deleted_at', 'is', null)
          .execute()
      )
    },

    async softDeleteArtwork(id: number) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .updateTable('pgc_artworks')
          .set({
            deleted_at: nowSeconds,
            updated_at: nowSeconds,
            version: sql<number>`version + 1`
          })
          .where('id', '=', id)
          .where('deleted_at', 'is', null)
          .execute()
      )
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const repo = createArtworksRepository(fastify)
    fastify.decorate('artworksRepository', repo)
  },
  {
    name: 'artworks-repository',
    dependencies: ['kysely']
  }
)
