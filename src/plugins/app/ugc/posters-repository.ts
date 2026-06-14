import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { paginateResults, toResult } from '../../../utils/result.js'

declare module 'fastify' {
  interface FastifyInstance {
    postersRepository: ReturnType<typeof createPostersRepository>
  }
}

export function createPostersRepository(fastify: FastifyInstance) {
  const db = fastify.kysely

  return {
    async findById(posterId: string) {
      return toResult(
        db
          .selectFrom('ugc_posters')
          .leftJoin('users', 'ugc_posters.user_id', 'users.id')
          .select([
            'ugc_posters.poster_id as posterId',
            'ugc_posters.result_type as resultType',
            'ugc_posters.result_name as resultName',
            'ugc_posters.created_at as createdAt',
            'ugc_posters.status',
            'users.nickname as userNickname',
            'users.avatar_url as userAvatarUrl'
          ])
          .where('ugc_posters.poster_id', '=', posterId)
          .executeTakeFirst()
          .then((row) => {
            if (!row) return null
            return {
              posterId: row.posterId,
              resultType: row.resultType,
              resultName: row.resultName,
              createdAt: row.createdAt,
              status: row.status as 'active' | 'banned',
              user:
                row.userNickname || row.userAvatarUrl
                  ? {
                      nickname: row.userNickname,
                      avatarUrl: row.userAvatarUrl
                    }
                  : null
            }
          })
      )
    },

    async findUserPosters(
      userId: number,
      options: { page: number; pageSize: number }
    ) {
      const { page, pageSize } = options
      const offset = (page - 1) * pageSize

      const query = db
        .selectFrom('ugc_posters')
        .where('user_id', '=', userId)
        .where('status', '=', 'active')

      return paginateResults(
        toResult(
          query
            .select([
              'poster_id as posterId',
              'result_type as resultType',
              'result_name as resultName',
              'created_at as createdAt'
            ])
            .orderBy('created_at', 'desc')
            .limit(pageSize)
            .offset(offset)
            .execute()
        ),
        toResult(
          query
            .select(db.fn.count<number | string>('poster_id').as('count'))
            .executeTakeFirstOrThrow()
            .then((result) => Number(result.count))
        )
      )
    },

    async findAllPosters(options: {
      page: number
      pageSize: number
      resultType?: number
    }) {
      const { page, pageSize, resultType } = options
      const offset = (page - 1) * pageSize

      let query = db.selectFrom('ugc_posters')
      let countQuery = db.selectFrom('ugc_posters')

      if (resultType !== undefined) {
        query = query.where('result_type', '=', resultType)
        countQuery = countQuery.where('result_type', '=', resultType)
      }

      return paginateResults(
        toResult(
          query
            .leftJoin('users', 'ugc_posters.user_id', 'users.id')
            .select([
              'ugc_posters.poster_id as posterId',
              'ugc_posters.result_type as resultType',
              'ugc_posters.result_name as resultName',
              'ugc_posters.created_at as createdAt',
              'ugc_posters.status',
              'users.nickname as userNickname',
              'users.avatar_url as userAvatarUrl'
            ])
            .orderBy('ugc_posters.created_at', 'desc')
            .limit(pageSize)
            .offset(offset)
            .execute()
            .then((rows) =>
              rows.map((row) => ({
                posterId: row.posterId,
                resultType: row.resultType,
                resultName: row.resultName,
                createdAt: row.createdAt,
                status: row.status as 'active' | 'banned',
                user:
                  row.userNickname || row.userAvatarUrl
                    ? {
                        nickname: row.userNickname,
                        avatarUrl: row.userAvatarUrl
                      }
                    : null
              }))
            )
        ),
        toResult(
          countQuery
            .select(db.fn.count<number | string>('poster_id').as('count'))
            .executeTakeFirstOrThrow()
            .then((result) => Number(result.count))
        )
      )
    },

    async createPoster(data: {
      userId?: number
      answers: number[]
      resultType: number
      resultName: string
    }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      const posterId = `post_${Math.floor(10000000 + Math.random() * 90000000)}`

      return toResult(
        db
          .insertInto('ugc_posters')
          .values({
            poster_id: posterId,
            user_id: data.userId ?? null,
            answers: JSON.stringify(data.answers) as any, // Stringify guarantees standard JSONB compatibility
            result_type: data.resultType,
            result_name: data.resultName,
            status: 'active',
            created_at: nowSeconds,
            updated_at: nowSeconds
          })
          .returning(['poster_id as posterId', 'created_at as createdAt'])
          .executeTakeFirstOrThrow()
      )
    },

    async updateStatus(posterId: string, status: 'active' | 'banned') {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .updateTable('ugc_posters')
          .set({
            status,
            updated_at: nowSeconds
          })
          .where('poster_id', '=', posterId)
          .execute()
      )
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const repo = createPostersRepository(fastify)
    fastify.decorate('postersRepository', repo)
  },
  {
    name: 'posters-repository',
    dependencies: ['kysely']
  }
)
