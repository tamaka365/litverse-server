import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import fp from 'fastify-plugin'

/**
 * Swagger documentation plugin.
 * Enabled only in development environment.
 *
 * @see {@link https://github.com/fastify/fastify-swagger}
 * @see {@link https://github.com/fastify/fastify-swagger-ui}
 */
export default fp(
  async (fastify) => {
    const { config } = fastify

    // Enable Swagger and Swagger UI only in development mode
    if (config.NODE_ENV !== 'development') {
      return
    }

    await fastify.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Litverse API',
          description: 'API documentation for the Litverse project',
          version: '1.0.0'
        },
        servers: [
          {
            url: `http://localhost:${config.PORT || 3000}`,
            description: 'Local development server'
          }
        ]
      }
    })

    await fastify.register(swaggerUi, {
      routePrefix: '/documentation',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false
      },
      staticCSP: true,
      transformStaticCSP: (header) => header
    })
  },
  {
    name: 'swagger',
    dependencies: ['@fastify/env']
  }
)
