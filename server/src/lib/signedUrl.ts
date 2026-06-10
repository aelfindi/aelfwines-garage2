import crypto from 'crypto'
import type { Request } from 'express'

// Sign HTTP requests as time-limited URLs. The signature is scoped to (method, path, expires)
// so a leaked URL cannot be replayed against other endpoints, other methods, or past the TTL.

function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET not set')
  return s
}

const DEFAULT_TTL_SECONDS = 60 * 60 // 1 hour

export function signUrl(
  method: string,
  urlPath: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = `${method.toUpperCase()}:${urlPath}:${exp}`
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  return { exp, sig }
}

export function verifySignedRequest(req: Request): boolean {
  const expRaw = req.query.exp
  const sigRaw = req.query.sig
  if (typeof expRaw !== 'string' || typeof sigRaw !== 'string') return false
  const exp = parseInt(expRaw, 10)
  if (!Number.isFinite(exp)) return false
  if (Math.floor(Date.now() / 1000) > exp) return false
  // Sign over the URL path only (without query), so harmless extra params (e.g. ?dl=1) don't invalidate.
  const urlPath = (req.originalUrl || req.url).split('?')[0]
  const payload = `${req.method.toUpperCase()}:${urlPath}:${exp}`
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
  try {
    const a = Buffer.from(sigRaw, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function buildAbsoluteSignedUrl(req: Request, method: string, urlPath: string): string {
  const { exp, sig } = signUrl(method, urlPath)
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.get('host')
  return `${proto}://${host}${urlPath}?exp=${exp}&sig=${sig}`
}
