import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

// --- Wechat Mini Program Login ---
export const MpLoginRequestSchema = Type.Object({
  code: Type.String({ minLength: 1, description: '微信登录凭证 code' })
})

export type MpLoginRequest = Static<typeof MpLoginRequestSchema>

export const MpLoginResponseDataSchema = Type.Object({
  token: Type.String(),
  user: Type.Object({
    id: Type.Integer(),
    openid: Type.String(),
    nickname: Type.String(),
    avatarUrl: Type.String()
  })
})

export const MpLoginResponseSchema = wrapResponseSchema(
  MpLoginResponseDataSchema
)

// --- Admin Login ---
export const AdminLoginRequestSchema = Type.Object({
  username: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 1 })
})

export type AdminLoginRequest = Static<typeof AdminLoginRequestSchema>

export const AdminLoginResponseDataSchema = Type.Object({
  token: Type.String(),
  username: Type.String()
})

export const AdminLoginResponseSchema = wrapResponseSchema(
  AdminLoginResponseDataSchema
)
