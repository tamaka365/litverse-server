import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  CreatePosterRequest,
  CreatePosterRequestSchema,
  CreatePosterResponseSchema,
  PosterDetailResponseSchema,
  UserPostersQuery,
  UserPostersQuerySchema,
  UserPostersResponseSchema
} from '../../../../schemas/v1/posters.js'
import { QuestionsResponseSchema } from '../../../../schemas/v1/questions.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { questionsRepository, postersRepository, log } = fastify

  // --- GET /ugc/questions ---
  fastify.get(
    '/questions',
    {
      schema: {
        tags: ['V1 UGC'],
        response: {
          200: QuestionsResponseSchema
        }
      }
    },
    async (request, reply) => {
      const result = await questionsRepository.findAllQuestions()
      if (result.isErr()) {
        log.error(`Failed to fetch questions: ${result.error.message}`)
        return reply.internalServerError('Database error')
      }

      return successResponse({ questions: result.value })
    }
  )

  // --- POST /ugc/posters (Optional Token) ---
  fastify.post<{ Body: CreatePosterRequest }>(
    '/posters',
    {
      schema: {
        tags: ['V1 UGC'],
        body: CreatePosterRequestSchema,
        response: {
          200: CreatePosterResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { answers, resultType, resultName } = request.body
      let userId: number | undefined

      const authHeader = request.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = (await request.jwtVerify()) as { id: number }
          userId = decoded.id
        } catch {
          return reply.unauthorized('Invalid authorization token')
        }
      }

      const createResult = await postersRepository.createPoster({
        userId,
        answers,
        resultType,
        resultName
      })

      if (createResult.isErr()) {
        log.error(
          `Failed to create poster record: ${createResult.error.message}`
        )
        return reply.internalServerError('Failed to save test result')
      }

      const { posterId, createdAt } = createResult.value

      return successResponse({
        posterId,
        shareUrl: `https://litverse.com/h5/share/${posterId}`,
        createdAt: new Date(createdAt * 1000).toISOString()
      })
    }
  )

  // --- GET /ugc/posters/:id (Public detail) ---
  fastify.get<{ Params: { id: string } }>(
    '/posters/:id',
    {
      schema: {
        tags: ['V1 UGC'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        response: {
          200: PosterDetailResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params

      const posterResult = await postersRepository.findById(id)
      if (posterResult.isErr()) {
        log.error(`Failed to fetch poster: ${posterResult.error.message}`)
        return reply.internalServerError('Database error')
      }

      const poster = posterResult.value
      if (!poster || poster.status === 'banned') {
        return reply.notFound('Poster not found or has been banned')
      }

      return successResponse({
        posterId: poster.posterId,
        resultType: poster.resultType,
        resultName: poster.resultName,
        user: poster.user,
        createdAt: new Date(poster.createdAt * 1000).toISOString()
      })
    }
  )

  // --- GET /ugc/users/posters (Requires Token) ---
  fastify.get<{ Querystring: UserPostersQuery }>(
    '/users/posters',
    {
      schema: {
        tags: ['V1 UGC'],
        querystring: UserPostersQuerySchema,
        response: {
          200: UserPostersResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id: userId } = request.user as { id: number }
      const { page = 1, limit = 10 } = request.query

      const historyResult = await postersRepository.findUserPosters(userId, {
        page,
        pageSize: limit
      })

      if (historyResult.isErr()) {
        log.error(
          `Failed to retrieve user test history: ${historyResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      const list = historyResult.value.items.map((item) => ({
        posterId: item.posterId,
        resultType: item.resultType,
        resultName: item.resultName,
        createdAt: new Date(item.createdAt * 1000).toISOString()
      }))

      return successResponse({
        list,
        total: historyResult.value.total
      })
    }
  )
}

export default plugin
