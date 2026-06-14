import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

export const PosterStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('banned')
])

// --- Create Poster ---
export const CreatePosterRequestSchema = Type.Object({
  answers: Type.Array(Type.Integer(), { minItems: 1, maxItems: 100 }),
  resultType: Type.Integer({ minimum: 1, maximum: 10 }),
  resultName: Type.String({ minLength: 1, maxLength: 100 })
})

export type CreatePosterRequest = Static<typeof CreatePosterRequestSchema>

export const CreatePosterResponseDataSchema = Type.Object({
  posterId: Type.String(),
  shareUrl: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
})

export const CreatePosterResponseSchema = wrapResponseSchema(
  CreatePosterResponseDataSchema
)

// --- Get Poster Detail ---
export const PosterDetailResponseDataSchema = Type.Object({
  posterId: Type.String(),
  resultType: Type.Integer(),
  resultName: Type.String(),
  user: Type.Union([
    Type.Object({
      nickname: Type.Union([Type.String(), Type.Null()]),
      avatarUrl: Type.Union([Type.String(), Type.Null()])
    }),
    Type.Null()
  ]),
  createdAt: Type.String({ format: 'date-time' })
})

export const PosterDetailResponseSchema = wrapResponseSchema(
  PosterDetailResponseDataSchema
)

// --- User Posters History (Public/Auth User) ---
export const UserPosterItemSchema = Type.Object({
  posterId: Type.String(),
  resultType: Type.Integer(),
  resultName: Type.String(),
  createdAt: Type.String({ format: 'date-time' })
})

export const UserPostersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 }))
})

export type UserPostersQuery = Static<typeof UserPostersQuerySchema>

export const UserPostersResponseDataSchema = Type.Object({
  list: Type.Array(UserPosterItemSchema),
  total: Type.Integer()
})

export const UserPostersResponseSchema = wrapResponseSchema(
  UserPostersResponseDataSchema
)

// --- Admin Posters List (Paginated) ---
export const AdminPosterItemSchema = Type.Object({
  posterId: Type.String(),
  resultType: Type.Integer(),
  resultName: Type.String(),
  user: Type.Union([
    Type.Object({
      nickname: Type.Union([Type.String(), Type.Null()]),
      avatarUrl: Type.Union([Type.String(), Type.Null()])
    }),
    Type.Null()
  ]),
  createdAt: Type.String({ format: 'date-time' }),
  status: PosterStatusSchema
})

export const AdminPostersQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  resultType: Type.Optional(Type.Integer())
})

export type AdminPostersQuery = Static<typeof AdminPostersQuerySchema>

export const AdminPostersResponseDataSchema = Type.Object({
  list: Type.Array(AdminPosterItemSchema),
  total: Type.Integer()
})

export const AdminPostersResponseSchema = wrapResponseSchema(
  AdminPostersResponseDataSchema
)

// --- Update Poster Status (Ban/Active) ---
export const UpdatePosterStatusRequestSchema = Type.Object({
  status: PosterStatusSchema
})

export type UpdatePosterStatusRequest = Static<
  typeof UpdatePosterStatusRequestSchema
>
