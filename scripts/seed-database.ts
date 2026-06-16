import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'

import { type DB } from 'kysely-codegen'
import { scryptHash } from '../src/plugins/app/password-manager.js'

async function seed() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing!')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString })
  const db = new Kysely<DB>({
    dialect: new PostgresDialect({ pool })
  })

  try {
    await seedUsers(db)
  } catch (error) {
    console.error('Error seeding database:', error)
  } finally {
    await db.destroy()
  }
}

async function seedUsers(db: Kysely<DB>) {
  console.log('Clearing existing users table records...')
  await db.deleteFrom('users').execute()

  const users = [
    {
      username: 'basic',
      email: 'basic@example.com',
      role: 'user',
      password: 'Password123$'
    },
    {
      username: 'moderator',
      email: 'moderator@example.com',
      role: 'user',
      password: 'Password123$'
    },
    {
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      password: 'Password123$'
    },
    {
      username: 'admin888',
      email: 'admin888@example.com',
      role: 'admin',
      password: 'admin888'
    }
  ]

  const nowSeconds = Math.floor(Date.now() / 1000)

  for (const user of users) {
    const hash = await scryptHash(user.password)
    const result = await db
      .insertInto('users')
      .values({
        username: user.username,
        email: user.email,
        password: hash,
        role: user.role,
        created_at: nowSeconds,
        updated_at: nowSeconds
      })
      .executeTakeFirstOrThrow()

    // Postgres insertId returns a bigint, which is converted to string in results.
    console.log(
      `User ${user.username} (ID: ${result.insertId}) has been seeded successfully.`
    )
  }

  console.log('Users have been seeded successfully.')
}

seed()
