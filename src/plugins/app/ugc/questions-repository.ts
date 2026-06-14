import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { toResult } from '../../../utils/result.js'

declare module 'fastify' {
  interface FastifyInstance {
    questionsRepository: ReturnType<typeof createQuestionsRepository>
  }
}

export function createQuestionsRepository(fastify: FastifyInstance) {
  const db = fastify.kysely

  return {
    async findAllQuestions() {
      return toResult(
        db
          .selectFrom('ugc_questions')
          .select(['id', 'text', 'options'])
          .orderBy('id', 'asc')
          .execute()
          .then((rows) =>
            rows.map((row) => ({
              id: row.id,
              text: row.text,
              options:
                typeof row.options === 'string'
                  ? JSON.parse(row.options)
                  : (row.options as any)
            }))
          )
      )
    },

    async overwriteAllQuestions(
      questions: Array<{ id: number; text: string; options: any[] }>
    ) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db.transaction().execute(async (trx) => {
          // 1. Delete all existing records
          await trx.deleteFrom('ugc_questions').execute()

          if (questions.length === 0) return

          // 2. Insert new records
          await trx
            .insertInto('ugc_questions')
            .values(
              questions.map((q) => ({
                id: q.id,
                text: q.text,
                options: JSON.stringify(q.options) as any, // Stringify guarantees standard JSONB compatibility
                created_at: nowSeconds,
                updated_at: nowSeconds
              }))
            )
            .execute()
        })
      )
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const repo = createQuestionsRepository(fastify)
    fastify.decorate('questionsRepository', repo)
  },
  {
    name: 'questions-repository',
    dependencies: ['kysely']
  }
)
