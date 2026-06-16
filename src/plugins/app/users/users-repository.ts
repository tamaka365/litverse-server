import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { sql } from 'kysely'
import { paginateResults, toResult } from '../../../utils/result.js'

declare module 'fastify' {
  interface FastifyInstance {
    usersRepository: ReturnType<typeof createUsersRepository>
  }
}

export function createUsersRepository(fastify: FastifyInstance) {
  const db = fastify.kysely

  return {
    async findByEmail(email: string) {
      return toResult(
        db
          .selectFrom('users')
          .select([
            'id',
            'username',
            'password',
            'email',
            'nickname',
            'avatar_url',
            'role',
            'created_at'
          ])
          .where('email', '=', email)
          .where('deleted_at', 'is', null)
          .executeTakeFirst()
          .then((user) => user ?? null)
      )
    },

    async findByOpenid(openid: string) {
      return toResult(
        db
          .selectFrom('users')
          .select([
            'id',
            'username',
            'password',
            'email',
            'openid',
            'nickname',
            'avatar_url',
            'role',
            'created_at'
          ])
          .where('openid', '=', openid)
          .where('deleted_at', 'is', null)
          .executeTakeFirst()
          .then((user) => user ?? null)
      )
    },

    async findByUsername(username: string) {
      return toResult(
        db
          .selectFrom('users')
          .select([
            'id',
            'username',
            'password',
            'email',
            'nickname',
            'avatar_url',
            'role',
            'created_at'
          ])
          .where('username', '=', username)
          .where('deleted_at', 'is', null)
          .executeTakeFirst()
          .then((user) => user ?? null)
      )
    },

    async findById(id: number) {
      return toResult(
        db
          .selectFrom('users')
          .select([
            'id',
            'username',
            'email',
            'nickname',
            'avatar_url',
            'role',
            'created_at'
          ])
          .where('id', '=', id)
          .where('deleted_at', 'is', null)
          .executeTakeFirst()
          .then((user) => user ?? null)
      )
    },

    async findAllUsers(options: {
      page: number
      pageSize: number
      nickname?: string
    }) {
      const { page, pageSize, nickname } = options
      const offset = (page - 1) * pageSize

      let query = db.selectFrom('users').where('deleted_at', 'is', null)
      let countQuery = db.selectFrom('users').where('deleted_at', 'is', null)

      if (nickname) {
        query = query.where('nickname', 'like', `%${nickname}%`)
        countQuery = countQuery.where('nickname', 'like', `%${nickname}%`)
      }

      return paginateResults(
        toResult(
          query
            .select([
              'id',
              'username',
              'email',
              'nickname',
              'avatar_url',
              'role',
              'created_at'
            ])
            .limit(pageSize)
            .offset(offset)
            .execute()
        ),
        toResult(
          countQuery
            .select(db.fn.count<number | string>('id').as('count'))
            .executeTakeFirstOrThrow()
            .then((result) => Number(result.count))
        )
      )
    },

    async updatePassword(email: string, hashedPassword: string) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .updateTable('users')
          .set({
            password: hashedPassword,
            updated_at: nowSeconds,
            version: sql<number>`version + 1`
          })
          .where('email', '=', email)
          .execute()
      )
    },

    async updateProfile(userId: number, nickname: string, avatarUrl: string) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .updateTable('users')
          .set({
            nickname,
            avatar_url: avatarUrl,
            updated_at: nowSeconds,
            version: sql<number>`version + 1`
          })
          .where('id', '=', userId)
          .execute()
      )
    },

    async createUser(userData: {
      email: string
      username: string
      password: string
      inviterCode?: number
    }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .insertInto('users')
          .values({
            email: userData.email,
            username: userData.username,
            password: userData.password,
            inviter_code: userData.inviterCode ?? null,
            role: 'user',
            created_at: nowSeconds,
            updated_at: nowSeconds
          })
          .execute()
      )
    },

    async createUserWithWechat(
      openid: string,
      nickname: string,
      avatarUrl: string
    ) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      // Generates a mock email and username since email/username are required in database table
      const uniqueSuffix = openid.substring(Math.max(0, openid.length - 8))
      const email = `wx_${uniqueSuffix}_${Date.now()}@litverse.com`
      const username = nickname || `wx_user_${uniqueSuffix}`
      const mockPasswordPlaceholder = 'WechatUserPasswordPlaceholder123$'

      return toResult(
        db
          .insertInto('users')
          .values({
            email,
            username,
            password: mockPasswordPlaceholder,
            openid,
            nickname,
            avatar_url: avatarUrl,
            role: 'user',
            created_at: nowSeconds,
            updated_at: nowSeconds
          })
          .execute()
      )
    },

    async createUserWithRole(userData: {
      email: string
      username: string
      password: string
      role: string
    }) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .insertInto('users')
          .values({
            email: userData.email,
            username: userData.username,
            password: userData.password,
            role: userData.role,
            created_at: nowSeconds,
            updated_at: nowSeconds
          })
          .execute()
      )
    },

    async softDeleteUser(id: number) {
      const nowSeconds = Math.floor(Date.now() / 1000)
      return toResult(
        db
          .updateTable('users')
          .set({
            deleted_at: nowSeconds,
            updated_at: nowSeconds,
            version: sql<number>`version + 1`
          })
          .where('id', '=', id)
          .execute()
      )
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const repo = createUsersRepository(fastify)
    fastify.decorate('usersRepository', repo)
  },
  {
    name: 'users-repository',
    dependencies: ['kysely']
  }
)
