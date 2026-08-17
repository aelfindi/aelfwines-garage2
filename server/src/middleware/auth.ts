import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { verifySignedRequest } from '../lib/signedUrl'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Signed URLs (HMAC over method+path+exp) bypass JWT - they are issued by the server
  // for time-limited binary resource access (PDFs) and are scoped to a single endpoint.
  if (verifySignedRequest(req)) { next(); return }

  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
    req.userId = decoded.userId
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
