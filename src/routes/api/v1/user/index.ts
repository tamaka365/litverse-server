import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  UpdateProfileRequest,
  UpdateProfileResponseSchema,
  UserInfoResponseSchema
} from '../../../../schemas/v1/users.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { usersRepository, log } = fastify

  // --- GET /user/info ---
  fastify.get(
    '/info',
    {
      schema: {
        tags: ['V1 User'],
        response: {
          200: UserInfoResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id: userId } = request.user as { id: number }

      const userResult = await usersRepository.findById(userId)
      if (userResult.isErr()) {
        log.error(`Failed to fetch user by id: ${userResult.error.message}`)
        return reply.internalServerError('Database error')
      }

      const user = userResult.value
      if (!user) {
        return reply.notFound('User not found')
      }

      return successResponse({
        id: user.id,
        nickname: user.nickname || user.username,
        avatarUrl: user.avatar_url || '',
        createdAt: new Date(user.created_at * 1000).toISOString()
      })
    }
  )

  // --- PUT /user/profile ---
  fastify.put<{ Body: UpdateProfileRequest }>(
    '/profile',
    {
      schema: {
        tags: ['V1 User'],
        body: {
          type: 'object',
          required: ['nickname', 'avatarUrl'],
          properties: {
            nickname: { type: 'string', minLength: 1, maxLength: 50 },
            avatarUrl: { type: 'string', format: 'uri', maxLength: 1024 }
          }
        },
        response: {
          200: UpdateProfileResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { id: userId } = request.user as { id: number }
      const { nickname, avatarUrl } = request.body

      const updateResult = await usersRepository.updateProfile(
        userId,
        nickname,
        avatarUrl
      )
      if (updateResult.isErr()) {
        log.error(
          `Failed to update user profile: ${updateResult.error.message}`
        )
        return reply.internalServerError('Failed to update profile')
      }

      return successResponse(
        {
          id: userId,
          nickname,
          avatarUrl
        },
        'profile updated'
      )
    }
  )
}

export default plugin
