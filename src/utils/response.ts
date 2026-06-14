import { TSchema, Type } from '@sinclair/typebox'

/**
 * Returns a standard successful response envelope: { code: 0, message, data }
 */
export function successResponse<T>(data: T, message = 'success') {
  return {
    code: 0,
    message,
    data
  }
}

/**
 * Returns a standard error response envelope: { code, message, data: null }
 */
export function errorResponse(code: number, message: string) {
  return {
    code,
    message,
    data: null
  }
}

/**
 * Helper to wrap any TypeBox schema in the Litverse unified response format.
 */
export function wrapResponseSchema<T extends TSchema>(dataSchema: T) {
  return Type.Object({
    code: Type.Integer({ default: 0 }),
    message: Type.String({ default: 'success' }),
    data: dataSchema
  })
}
