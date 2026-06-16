import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

export const OssSettingsRequestSchema = Type.Object({
  accessKeyId: Type.String({ minLength: 1 }),
  accessKeySecret: Type.String({ minLength: 1 }),
  bucket: Type.String({ minLength: 1 }),
  region: Type.String({ minLength: 1 }),
  host: Type.String({ minLength: 1 })
})

export type OssSettingsRequest = Static<typeof OssSettingsRequestSchema>

export const OssSettingsResponseSchema = wrapResponseSchema(
  OssSettingsRequestSchema
)
