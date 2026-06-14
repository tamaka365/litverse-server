import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import {
  MpLoginRequest,
  MpLoginResponseSchema
} from '../../../../schemas/v1/auth.js'
import { successResponse } from '../../../../utils/response.js'

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { usersRepository, log, config } = fastify

  fastify.post<{ Body: MpLoginRequest }>(
    '/mp-login',
    {
      schema: {
        tags: ['V1 Auth'],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 1 }
          }
        },
        response: {
          200: MpLoginResponseSchema
        }
      }
    },
    async (request, reply) => {
      const { code } = request.body
      let openid = `mock_openid_${code}`

      const appId = config.WECHAT_APPID
      const secret = config.WECHAT_SECRET

      // If WeChat config is present, try hitting official endpoints
      if (appId && secret) {
        try {
          const wechatUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`
          const wechatRes = await fetch(wechatUrl)
          if (wechatRes.ok) {
            const wechatData = (await wechatRes.json()) as {
              openid?: string
              errcode?: number
              errmsg?: string
            }
            if (wechatData.openid) {
              openid = wechatData.openid
            } else {
              log.warn(
                `WeChat jscode2session errcode: ${wechatData.errcode}, errmsg: ${wechatData.errmsg}`
              )
            }
          }
        } catch (error) {
          log.error(
            `Failed to execute WeChat login API call: ${(error as Error).message}`
          )
        }
      }

      // Check if user exists by openid
      const existingUserResult = await usersRepository.findByOpenid(openid)
      if (existingUserResult.isErr()) {
        log.error(
          `Database error during user look-up: ${existingUserResult.error.message}`
        )
        return reply.internalServerError('Database error')
      }

      let user = existingUserResult.value

      // If user does not exist, register them
      if (!user) {
        const nickname = '微信用户'
        const avatarUrl =
          'https://thirdwx.qlogo.cn/mmopen/vi_32/POgSPhysGfW8aeiaLxHiaFioVEuVUgtyoV2ibG9LbFN1749gEiaM3JibK1iafHiaFioVEuVUgtyoV2ibG/0'

        const registerResult = await usersRepository.createUserWithWechat(
          openid,
          nickname,
          avatarUrl
        )
        if (registerResult.isErr()) {
          log.error(
            `Failed to register WeChat user: ${registerResult.error.message}`
          )
          return reply.internalServerError('Failed to create user')
        }

        // Fetch the newly created user record
        const newlyCreatedUserResult =
          await usersRepository.findByOpenid(openid)
        if (newlyCreatedUserResult.isErr() || !newlyCreatedUserResult.value) {
          log.error('Failed to retrieve newly registered user record')
          return reply.internalServerError('Failed to retrieve user')
        }
        user = newlyCreatedUserResult.value
      }

      // Generate JWT Token with role
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role || 'user'
      })

      return successResponse({
        token,
        user: {
          id: user.id,
          openid: user.openid || openid,
          nickname: user.nickname || user.username,
          avatarUrl: user.avatar_url || ''
        }
      })
    }
  )
}

export default plugin
