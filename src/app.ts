import fastifyAutoload from '@fastify/autoload'
import { FastifyError, FastifyInstance, FastifyPluginOptions } from 'fastify'
import path from 'node:path'

export default async function serviceApp(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions
) {
  await fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'plugins/external'),
    options: {}
  })

  fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'plugins/app'),
    options: { ...opts }
  })

  fastify.register(fastifyAutoload, {
    dir: path.join(import.meta.dirname, 'routes'),
    autoHooks: true,
    cascadeHooks: true,
    options: { ...opts }
  })

  fastify.setErrorHandler((err: FastifyError, request, reply) => {
    fastify.log.error(
      {
        err,
        request: {
          method: request.method,
          url: request.url,
          query: request.query,
          params: request.params
        }
      },
      'Unhandled error occurred'
    )

    const statusCode = err.statusCode ?? 500
    reply.code(statusCode)

    const rawMessage =
      err.statusCode && err.statusCode < 500
        ? err.message
        : 'Internal Server Error'

    if (request.url.startsWith('/api/v1')) {
      let code = 50000
      if (statusCode === 400) code = 40001
      else if (statusCode === 401) code = 40100
      else if (statusCode === 403) code = 40300
      else if (statusCode === 404) code = 40400

      return {
        code,
        message: rawMessage,
        data: null
      }
    }

    return {
      message: rawMessage
    }
  })

  // Rate-limit 404 to prevent URL enumeration attacks
  fastify.setNotFoundHandler(
    {
      preHandler: fastify.rateLimit({ max: 3, timeWindow: 500 })
    },
    (request, reply) => {
      request.log.warn(
        {
          request: {
            method: request.method,
            url: request.url,
            query: request.query,
            params: request.params
          }
        },
        'Resource not found'
      )

      if (request.url.startsWith('/api/v1')) {
        reply.code(404)
        return {
          code: 40400,
          message: 'Not found',
          data: null
        }
      }

      return reply.notFound()
    }
  )
}
