import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { query } from '../db/client'

const router = Router()

interface UserRow {
  id: string
  email: string
  password_hash: string
  name: string
  role: string
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const users = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email])
  const user = users[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' },
  )

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

export default router
