import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'

import { Credentials, CredentialsSchema } from '../../../schemas/auth.js'
import { MessageResponseSchema } from '../../../schemas/common.js'
import { getCookieDomain } from '../../../utils/cookie.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { usersRepository, passwordManager, log, config } = fastify
  const cookieDomain = getCookieDomain(config.CORS_ORIGINS)

  fastify.post<{ Body: Credentials }>(
    '/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      },
      schema: {
        body: CredentialsSchema,
        response: {
          200: MessageResponseSchema
        }
      }
    },
    async function (request, reply) {
      const { email, password } = request.body

      const user = await usersRepository.findByEmail(email)

      if (user.isErr()) {
        log.error(`Login error: ${user.error.message}`)
        return reply.internalServerError('Database error')
      }

      if (!user.value) {
        return reply.unauthorized('Invalid email or password')
      }

      const isPasswordValid = await passwordManager.compare(
        password,
        user.value.password
      )

      if (!isPasswordValid) {
        return reply.unauthorized('Invalid email or password')
      }

      const token = fastify.jwt.sign({
        id: user.value.id!,
        email: user.value.email,
        role: (user.value as any).role || 'user'
      })

      reply.setCookie(config.COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: config.NODE_ENV === 'production',
        ...(cookieDomain && { domain: cookieDomain })
      })

      return { message: 'Login successful' }
    }
  )

  fastify.post(
    '/logout',
    {
      schema: {
        response: {
          200: MessageResponseSchema
        }
      }
    },
    async function (_request, reply) {
      reply.clearCookie(config.COOKIE_NAME, {
        path: '/',
        ...(cookieDomain && { domain: cookieDomain })
      })

      return { message: 'Logout successful' }
    }
  )
}

export default plugin
