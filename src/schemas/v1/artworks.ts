import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

export const ArtworkTypeSchema = Type.Union([
  Type.Literal('image'),
  Type.Literal('video'),
  Type.Literal('audio')
])

export const ArtworkSchema = Type.Object({
  id: Type.Integer(),
  type: ArtworkTypeSchema,
  url: Type.String({ format: 'uri' }),
  mediaUrl: Type.String(),
  aspectRatio: Type.Number(),
  title: Type.String(),
  createdAt: Type.Optional(Type.String({ format: 'date-time' }))
})

// --- Get Artworks List ---
export const ArtworksQuerySchema = Type.Object({
  type: Type.Optional(ArtworkTypeSchema)
})

export type ArtworksQuery = Static<typeof ArtworksQuerySchema>

export const ArtworksListResponseDataSchema = Type.Object({
  list: Type.Array(ArtworkSchema)
})

export const ArtworksListResponseSchema = wrapResponseSchema(
  ArtworksListResponseDataSchema
)

// --- Admin Artworks List (Paginated) ---
export const AdminArtworksQuerySchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  type: Type.Optional(ArtworkTypeSchema)
})

export type AdminArtworksQuery = Static<typeof AdminArtworksQuerySchema>

export const AdminArtworksListResponseDataSchema = Type.Object({
  list: Type.Array(ArtworkSchema),
  total: Type.Integer()
})

export const AdminArtworksListResponseSchema = wrapResponseSchema(
  AdminArtworksListResponseDataSchema
)

// --- Create/Update Artwork ---
export const CreateArtworkRequestSchema = Type.Object({
  type: ArtworkTypeSchema,
  title: Type.String({ minLength: 1, maxLength: 255 }),
  url: Type.String({ format: 'uri', maxLength: 1024 }),
  mediaUrl: Type.String({ maxLength: 1024 }),
  aspectRatio: Type.Number({ minimum: 0.1, maximum: 10.0 })
})

export type CreateArtworkRequest = Static<typeof CreateArtworkRequestSchema>

export const UpdateArtworkRequestSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  url: Type.Optional(Type.String({ format: 'uri', maxLength: 1024 })),
  mediaUrl: Type.Optional(Type.String({ maxLength: 1024 })),
  aspectRatio: Type.Optional(Type.Number({ minimum: 0.1, maximum: 10.0 }))
})

export type UpdateArtworkRequest = Static<typeof UpdateArtworkRequestSchema>

export const ArtworkMutationResponseDataSchema = Type.Object({
  id: Type.Integer(),
  type: ArtworkTypeSchema,
  title: Type.String()
})

export const ArtworkMutationResponseSchema = wrapResponseSchema(
  ArtworkMutationResponseDataSchema
)
