import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import authRoutes from './routes/auth'
import ticketRoutes from './routes/tickets'
import agentRoutes from './routes/agents'
import { requireAuth } from './middleware/auth'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api/auth', authRoutes)

app.use('/api/tickets', requireAuth, ticketRoutes)
app.use('/api/agents', requireAuth, agentRoutes)

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
