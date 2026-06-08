import 'dotenv/config'
import express from 'express'
import cors from 'cors'

export const app = express()

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const PORT = Number(process.env.PORT ?? 3001)

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server on :${PORT}`))
}
