import bcrypt from 'bcrypt'
import path from 'path'
import dotenv from 'dotenv'
import { query, pool } from './client'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

async function seed() {
  const email = process.env.ENGINEER_EMAIL
  const password = process.env.ENGINEER_PASSWORD
  const name = process.env.ENGINEER_NAME

  if (!email || !password || !name) {
    console.error('ENGINEER_EMAIL, ENGINEER_PASSWORD, and ENGINEER_NAME must be set in .env')
    process.exit(1)
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.length > 0) {
    console.log(`User ${email} already exists — skipping.`)
    await pool.end()
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await query(
    'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)',
    [email, passwordHash, name, 'engineer'],
  )
  console.log(`Created engineer: ${name} <${email}>`)
  await pool.end()
}

seed().catch((err) => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
