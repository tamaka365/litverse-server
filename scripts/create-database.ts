import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

async function createDatabase() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is missing!')
    process.exit(1)
  }

  console.log('Connecting to PostgreSQL...')
  const client = new pg.Client({ connectionString })

  try {
    await client.connect()
    console.log('Connected to PostgreSQL successfully.')

    const sqlDir = join(process.cwd(), 'sql')
    const files = readdirSync(sqlDir)
      .filter((file) => file.endsWith('.sql'))
      .sort() // Ensure alphabetical execution order (000, 001, 002)

    for (const file of files) {
      console.log(`Executing migration file: ${file}`)
      const sql = readFileSync(join(sqlDir, file), 'utf8')
      await client.query(sql)
    }

    console.log('All database migrations applied successfully!')
  } catch (error) {
    console.error('Failed to apply database migrations:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

createDatabase()
