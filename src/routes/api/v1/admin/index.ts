import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  AdminArtworksListResponseSchema,
  AdminArtworksQuery,
  AdminArtworksQuerySchema,
  ArtworkMutationResponseSchema,
  CreateArtworkRequest,
  CreateArtworkRequestSchema,
  UpdateArtworkRequest,
  UpdateArtworkRequestSchema
} from '../../../../schemas/v1/artworks.js'
import {
  AdminLoginRequest,
  AdminLoginResponseSchema
} from '../../../../schemas/v1/auth.js'
import {
  AdminPostersQuery,
  AdminPostersQuerySchema,
  AdminPostersResponseSchema,
  UpdatePosterStatusRequest,
  UpdatePosterStatusRequestSchema
} from '../../../../schemas/v1/posters.js'
import {
  QuestionsResponseSchema,
  SaveQuestionsRequest,
  SaveQuestionsRequestSchema
} from '../../../../schemas/v1/questions.js'
import { DashboardStatsResponseSchema } from '../../../../schemas/v1/stats.js'
import {
  AdminUsersListRequestQuery,
  AdminUsersListRequestQuerySchema,
  AdminUsersListResponseSchema
} from '../../../../schemas/v1/users.js'
import { getOssUploadSignature } from '../../../../utils/oss.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const {
    usersRepository,
    passwordManager,
    artworksRepository,
    questionsRepository,
    postersRepository,
    statsRepository,
    log,
    config
  } = fastify

  // --- Admin Security Hook ---
  fastify.addHook('onRequest', async (request, reply) => {
    // Bypass authentication check for login endpoint
    const urlPath = request.url.split('?')[0]
    if (request.method === 'POST' && urlPath.endsWith('/admin/auth/login')) {
      return
    }

    try {
      await request.jwtVerify()
      const payload = request.user as { role?: string }
      if (payload.role !== 'admin') {
        return reply.forbidden('Forbidden - Admin access required')
      }
    } catch {
      return reply.unauthorized('Authentication required')
    }
  })

  // --- 7.1 Admin Login ---
  fastify.post<{ Body: AdminLoginRequest }>(
    '/auth/login',
    {
      schema: {
        tags: ['V1 Admin'],
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1 },
            password: { type: 'string', minLength: 1 }
          }
        },
        response: {
          200: AdminLoginResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { username, password } = request.body

      const userResult = await usersRepository.findByUsername(username)
      if (userResult.isErr()) {
        log.error(
          `Admin authentication error querying user: ${userResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const user = userResult.value
      if (!user || user.role !== 'admin') {
        return reply.unauthorized('Invalid username or password')
      }

      const isPasswordValid = await passwordManager.compare(
        password,
        user.password
      )
      if (!isPasswordValid) {
        return reply.unauthorized('Invalid username or password')
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
      })

      return successResponse({
        token,
        username: user.username
      })
    }
  )

  // --- 7.2 Get Console Stats ---
  fastify.get(
    '/dashboard/stats',
    {
      schema: {
        tags: ['V1 Admin'],
        response: {
          200: DashboardStatsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const statsResult = await statsRepository.getDashboardStats()
      if (statsResult.isErr()) {
        log.error(
          `Failed to aggregate console metrics: ${statsResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      return successResponse(statsResult.value)
    }
  )

  // --- 7.3 Get Aliyun OSS Upload Signature ---
  fastify.get<{ Querystring: { filename: string; mimeType: string } }>(
    '/media/upload-signature',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: {
          type: 'object',
          required: ['filename', 'mimeType'],
          properties: {
            filename: { type: 'string', minLength: 1 },
            mimeType: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { filename, mimeType } = request.query
      const signature = getOssUploadSignature(filename, mimeType, config)
      return successResponse(signature)
    }
  )

  // --- 7.4.1 Get PGC Artworks (Paginated) ---
  fastify.get<{ Querystring: AdminArtworksQuery }>(
    '/pgc/artworks',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: AdminArtworksQuerySchema,
        response: {
          200: AdminArtworksListResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 10, type } = request.query

      const artworksResult = await artworksRepository.findAdminArtworks({
        page,
        pageSize: limit,
        type: type as any
      })

      if (artworksResult.isErr()) {
        log.error(
          `Failed to fetch admin artworks: ${artworksResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const list = artworksResult.value.items.map((art) => ({
        id: art.id,
        type: art.type as 'image' | 'video' | 'audio',
        url: art.url,
        mediaUrl: art.mediaUrl,
        aspectRatio: art.aspectRatio,
        title: art.title,
        createdAt: new Date(art.createdAt * 1000).toISOString()
      }))

      return successResponse({
        list,
        total: artworksResult.value.total
      })
    }
  )

  // --- 7.4.2 Create PGC Artwork ---
  fastify.post<{ Body: CreateArtworkRequest }>(
    '/pgc/artworks',
    {
      schema: {
        tags: ['V1 Admin'],
        body: CreateArtworkRequestSchema,
        response: {
          200: ArtworkMutationResponseSchema
        }
      }
    },
    async (request, reply) => {
      const createResult = await artworksRepository.createArtwork(request.body)
      if (createResult.isErr()) {
        log.error(
          `Failed to create artwork record: ${createResult.error.message}`
        )
        return reply.internalServerError('Failed to save artwork')
      }

      return successResponse(
        {
          id: createResult.value.id,
          type: createResult.value.type as 'image' | 'video' | 'audio',
          title: createResult.value.title
        },
        'created success'
      )
    }
  )

  // --- 7.4.3 Update PGC Artwork ---
  fastify.put<{ Params: { id: number }; Body: UpdateArtworkRequest }>(
    '/pgc/artworks/:id',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1 }
          }
        },
        body: UpdateArtworkRequestSchema
      }
    },
    async (request, reply) => {
      const { id } = request.params

      const existingResult = await artworksRepository.findById(id)
      if (existingResult.isErr() || !existingResult.value) {
        return reply.notFound('Artwork not found')
      }

      const updateResult = await artworksRepository.updateArtwork(
        id,
        request.body
      )
      if (updateResult.isErr()) {
        log.error(`Failed to update artwork: ${updateResult.error.message}`)
        return reply.internalServerError('Failed to update artwork')
      }

      return successResponse(null, 'updated success')
    }
  )

  // --- 7.4.4 Delete PGC Artwork ---
  fastify.delete<{ Params: { id: number } }>(
    '/pgc/artworks/:id',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params

      const existingResult = await artworksRepository.findById(id)
      if (existingResult.isErr() || !existingResult.value) {
        return reply.notFound('Artwork not found')
      }

      const deleteResult = await artworksRepository.softDeleteArtwork(id)
      if (deleteResult.isErr()) {
        log.error(
          `Failed to soft delete artwork: ${deleteResult.error.message}`
        )
        return reply.internalServerError('Failed to delete artwork')
      }

      return successResponse(null, 'deleted success')
    }
  )

  // --- 7.5.1 Get All UGC Question Configuration ---
  fastify.get(
    '/ugc/questions',
    {
      schema: {
        tags: ['V1 Admin'],
        response: {
          200: QuestionsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const result = await questionsRepository.findAllQuestions()
      if (result.isErr()) {
        log.error(
          `Failed to fetch questions configuration: ${result.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      return successResponse({ questions: result.value })
    }
  )

  // --- 7.5.2 Overwrite All UGC Questions ---
  fastify.put<{ Body: SaveQuestionsRequest }>(
    '/ugc/questions',
    {
      schema: {
        tags: ['V1 Admin'],
        body: SaveQuestionsRequestSchema
      }
    },
    async (request, reply) => {
      const { questions } = request.body

      const overwriteResult =
        await questionsRepository.overwriteAllQuestions(questions)
      if (overwriteResult.isErr()) {
        log.error(
          `Failed to overwrite questions: ${overwriteResult.error.message}`
        )
        return reply.internalServerError('Failed to save questions')
      }

      return successResponse(null, 'questions updated successfully')
    }
  )

  // --- 7.6.1 Query User List (Paginated + Optional Nickname search) ---
  fastify.get<{ Querystring: AdminUsersListRequestQuery }>(
    '/users',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: AdminUsersListRequestQuerySchema,
        response: {
          200: AdminUsersListResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 10, nickname } = request.query

      const usersResult = await usersRepository.findAllUsers({
        page,
        pageSize: limit,
        nickname
      })

      if (usersResult.isErr()) {
        log.error(`Failed to query user records: ${usersResult.error.message}`)
        return reply.internalServerError('Database error')
      }

      const list = usersResult.value.items.map((user) => ({
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        createdAt: new Date(user.created_at * 1000).toISOString()
      }))

      return successResponse({
        list,
        total: usersResult.value.total
      })
    }
  )

  // --- 7.6.2 Query UGC Test Posters list (Paginated + Optional filter) ---
  fastify.get<{ Querystring: AdminPostersQuery }>(
    '/ugc/posters',
    {
      schema: {
        tags: ['V1 Admin'],
        querystring: AdminPostersQuerySchema,
        response: {
          200: AdminPostersResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { page = 1, limit = 10, resultType } = request.query

      const postersResult = await postersRepository.findAllPosters({
        page,
        pageSize: limit,
        resultType
      })

      if (postersResult.isErr()) {
        log.error(
          `Failed to query test posters: ${postersResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const list = postersResult.value.items.map((item) => ({
        posterId: item.posterId,
        resultType: item.resultType,
        resultName: item.resultName,
        user: item.user,
        createdAt: new Date(item.createdAt * 1000).toISOString(),
        status: item.status
      }))

      return successResponse({
        list,
        total: postersResult.value.total
      })
    }
  )

  // --- 7.6.3 Ban/Activate UGC Poster ---
  fastify.put<{ Params: { id: string }; Body: UpdatePosterStatusRequest }>(
    '/ugc/posters/:id/status',
    {
      schema: {
        tags: ['V1 Admin'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: UpdatePosterStatusRequestSchema
      }
    },
    async (request, reply) => {
      const { id } = request.params
      const { status } = request.body

      const existingResult = await postersRepository.findById(id)
      if (existingResult.isErr() || !existingResult.value) {
        return reply.notFound('Poster record not found')
      }

      const statusResult = await postersRepository.updateStatus(id, status)
      if (statusResult.isErr()) {
        log.error(
          `Failed to toggle poster status: ${statusResult.error.message}`
        )
        return reply.internalServerError('Failed to update poster status')
      }

      return successResponse(null, 'poster status updated')
    }
  )
}

export default plugin
