import { FastifyInstance } from 'fastify'

// Static public routes matched against the actual request URL
const PUBLIC_ROUTES = [
  'GET /api',
  'GET /api/health',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/users',
  'GET /api/posts',
  // --- V1 Litverse Public Routes ---
  'POST /api/v1/auth/mp-login',
  'GET /api/v1/pgc/artworks',
  'GET /api/v1/ugc/questions',
  'POST /api/v1/ugc/posters',
  'GET /api/v1/wechat/qrcode',
  'POST /api/v1/stats/track',
  'POST /api/v1/admin/auth/login'
]

// Public routes with dynamic segments, matched against Fastify's route template
// (request.routeOptions.url) to correctly handle path parameters like :id
const PUBLIC_ROUTE_PATTERNS = new Set([
  'GET /api/posts/:id',
  'GET /api/v1/ugc/posters/:id'
])

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    let urlPath = request.url.split('?')[0]
    if (urlPath.endsWith('/') && urlPath.length > 1) {
      urlPath = urlPath.slice(0, -1)
    }
    const actualKey = `${request.method} ${urlPath}`
    if (PUBLIC_ROUTES.includes(actualKey)) return

    const patternKey = `${request.method} ${request.routeOptions.url}`
    if (PUBLIC_ROUTE_PATTERNS.has(patternKey)) return

    await fastify.authenticate(request, reply)
  })
}
