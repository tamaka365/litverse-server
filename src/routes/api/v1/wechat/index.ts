import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { getWechatMiniProgramQrCode } from '../../../../utils/wechat.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { config } = fastify

  fastify.get<{ Querystring: { path: string; scene: string } }>(
    '/qrcode',
    {
      schema: {
        tags: ['V1 WeChat'],
        querystring: {
          type: 'object',
          required: ['path', 'scene'],
          properties: {
            path: { type: 'string', minLength: 1 },
            scene: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    async (request, reply) => {
      const { path, scene } = request.query

      const qrCodeBuffer = await getWechatMiniProgramQrCode(path, scene, config)

      reply.type('image/png')
      return reply.send(qrCodeBuffer)
    }
  )
}

export default plugin
