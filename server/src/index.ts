import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { prisma } from './db'
import { requireAuth } from './middleware/auth'
import authRouter from './routes/auth'
import vehiclesRouter from './routes/vehicles'
import maintenanceRouter from './routes/maintenance'
import settingsRouter from './routes/settings'
import sessionsRouter from './routes/sessions'
import documentsRouter from './routes/documents'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Public routes
app.use('/api/auth', authRouter)

// Protected routes
app.use('/api/vehicles', requireAuth, vehiclesRouter)
app.use('/api', requireAuth, maintenanceRouter)
app.use('/api', requireAuth, settingsRouter)
app.use('/api', requireAuth, sessionsRouter)
app.use('/api', requireAuth, documentsRouter)

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
  const shutdown = () => { prisma.$disconnect(); process.exit(0) }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
