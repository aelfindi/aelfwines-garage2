import jwt from 'jsonwebtoken'
import request from 'supertest'
import express from 'express'
import { requireAuth } from '../auth'

process.env.JWT_SECRET = 'test-secret'

const testApp = express()
testApp.get('/protected', requireAuth, (_req, res) => res.json({ ok: true }))

describe('requireAuth middleware', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(testApp).get('/protected')
    expect(res.status).toBe(401)
  })

  it('returns 401 with invalid token', async () => {
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-valid-jwt')
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid JWT', async () => {
    const token = jwt.sign({ userId: 'admin' }, 'test-secret', { expiresIn: '1h' })
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })

  it('returns 401 with expired token', async () => {
    const token = jwt.sign({ userId: 'admin' }, 'test-secret', { expiresIn: '-1s' })
    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(401)
  })

  it('returns 200 with valid token in query param (for file downloads)', async () => {
    const token = jwt.sign({ userId: 'admin' }, 'test-secret', { expiresIn: '1h' })
    const res = await request(testApp).get(`/protected?token=${token}`)
    expect(res.status).toBe(200)
  })
})
