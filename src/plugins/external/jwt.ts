import fastifyJwt from '@fastify/jwt'
import fp from 'fastify-plugin'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string; role: string }
    user: { id: number; email: string; role: string }
  }
}

/**
 * JWT authentication plugin.
 * Reads tokens from httpOnly cookies.
 *
 * @see {@link https://github.com/fastify/fastify-jwt}
 */
export default fp(
  async (fastify) => {
    const { config } = fastify

    await fastify.register(fastifyJwt, {
      secret: config.JWT_SECRET,
      cookie: {
        cookieName: config.COOKIE_NAME,
        signed: false
      }
    })
  },
  {
    name: 'jwt',
    dependencies: ['@fastify/env', '@fastify/cookie']
  }
)
