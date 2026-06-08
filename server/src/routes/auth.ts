import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' })
    return
  }

  if (email !== process.env.ADMIN_EMAIL) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH!)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = jwt.sign({ userId: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '7d' })
  res.json({ token })
})

export default router
