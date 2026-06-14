import { Static, Type } from '@sinclair/typebox'
import { wrapResponseSchema } from '../../utils/response.js'

export const QuestionOptionSchema = Type.Object({
  label: Type.String({ minLength: 1 }),
  value: Type.String({ minLength: 1, maxLength: 5 }),
  weight: Type.Integer()
})

export const QuestionSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
  text: Type.String({ minLength: 1 }),
  options: Type.Array(QuestionOptionSchema)
})

export type Question = Static<typeof QuestionSchema>

// --- Get Questions List ---
export const QuestionsResponseDataSchema = Type.Object({
  questions: Type.Array(QuestionSchema)
})

export const QuestionsResponseSchema = wrapResponseSchema(
  QuestionsResponseDataSchema
)

// --- Save/Overwrite Questions (Admin) ---
export const SaveQuestionsRequestSchema = Type.Object({
  questions: Type.Array(QuestionSchema, { minItems: 1 })
})

export type SaveQuestionsRequest = Static<typeof SaveQuestionsRequestSchema>
