import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

// --- Get User Info ---
export const UserInfoResponseDataSchema = Type.Object({
  id: Type.Integer(),
  nickname: Type.String(),
  avatarUrl: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
})

export const UserInfoResponseSchema = wrapResponseSchema(
  UserInfoResponseDataSchema
)

// --- Update User Profile ---
export const UpdateProfileRequestSchema = Type.Object({
  nickname: Type.String({ minLength: 1, maxLength: 50 }),
  avatarUrl: Type.String({ format: 'uri', maxLength: 1024 })
})

export type UpdateProfileRequest = Static<typeof UpdateProfileRequestSchema>

export const UpdateProfileResponseDataSchema = Type.Object({
  id: Type.Integer(),
  nickname: Type.String(),
  avatarUrl: Type.String()
})

export const UpdateProfileResponseSchema = wrapResponseSchema(
  UpdateProfileResponseDataSchema
)

// --- Admin Users List ---
export const AdminUserItemSchema = Type.Object({
  id: Type.Integer(),
  nickname: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' })
})

export const AdminUsersListRequestQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  nickname: Type.Optional(Type.String())
})

export type AdminUsersListRequestQuery = Static<
  typeof AdminUsersListRequestQuerySchema
>

export const AdminUsersListResponseDataSchema = Type.Object({
  list: Type.Array(AdminUserItemSchema),
  total: Type.Integer()
})

export const AdminUsersListResponseSchema = wrapResponseSchema(
  AdminUsersListResponseDataSchema
)
