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

// --- Admin Accounts Management ---
const passwordPattern =
  '^(?=.*?[a-zA-Z])(?=.*?[0-9])(?=.*?[!@#$%^&*()_+\\-=\\[\\]{}|;:,.<>?]).{8,50}$'

export const CreateAdminAccountRequestSchema = Type.Object({
  username: Type.String({ minLength: 2, maxLength: 50 }),
  password: Type.String({ 
    pattern: passwordPattern,
    minLength: 8,
    maxLength: 50 
  }),
  email: Type.String({ format: 'email' }),
  rootPassword: Type.String({ minLength: 1 })
})

export type CreateAdminAccountRequest = Static<
  typeof CreateAdminAccountRequestSchema
>

export const UpdateAdminAccountRequestSchema = Type.Object({
  username: Type.Optional(Type.String({ minLength: 2, maxLength: 50 })),
  email: Type.Optional(Type.String({ format: 'email' })),
  password: Type.Optional(Type.String({ 
    pattern: passwordPattern,
    minLength: 8,
    maxLength: 50 
  })),
  rootPassword: Type.String({ minLength: 1 })
})

export type UpdateAdminAccountRequest = Static<
  typeof UpdateAdminAccountRequestSchema
>

export const UpdateAdminPasswordRequestSchema = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ 
    pattern: passwordPattern,
    minLength: 8,
    maxLength: 50 
  })
})

export type UpdateAdminPasswordRequest = Static<
  typeof UpdateAdminPasswordRequestSchema
>

// --- Admin Accounts Management (Custom) ---
export const AdminAccountItemSchema = Type.Object({
  id: Type.Integer(),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  role: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
})

export type AdminAccountItem = Static<typeof AdminAccountItemSchema>

export const AdminAccountsListResponseDataSchema = Type.Object({
  list: Type.Array(AdminAccountItemSchema)
})

export const AdminAccountsListResponseSchema = wrapResponseSchema(
  AdminAccountsListResponseDataSchema
)

export type AdminAccountsListResponse = Static<
  typeof AdminAccountsListResponseSchema
>

