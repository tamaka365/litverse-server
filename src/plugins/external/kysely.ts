import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'

import { Kysely, PostgresDialect, sql } from 'kysely'
import pg from 'pg'

import { type DB } from 'kysely-codegen'

declare module 'fastify' {
  export interface FastifyInstance {
    kysely: Kysely<DB>
  }
}

export default fp(
  async (fastify: FastifyInstance, _opts) => {
    const kysely = new Kysely<DB>({
      dialect: new PostgresDialect({
        pool: new pg.Pool({
          connectionString: fastify.config.DATABASE_URL
        })
      })
    })

    // Test connection
    await sql`SELECT 1`.execute(kysely)

    fastify.decorate('kysely', kysely)

    fastify.addHook('onClose', async () => {
      await kysely.destroy()
    })
  },
  {
    name: 'kysely',
    dependencies: ['@fastify/env']
  }
)
