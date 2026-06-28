import { Pool } from 'pg'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query(text, params)
  return result.rows as T[]
}
