import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `)

    const migrationsDir = path.join(__dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM migrations WHERE filename = $1', [file])
      if (rows.length > 0) {
        console.log(`  skip  ${file}`)
        continue
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      await client.query(sql)
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file])
      console.log(`  apply ${file}`)
    }

    console.log('Migrations complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
