import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db'
import { buildAbsoluteSignedUrl } from '../lib/signedUrl'

const router = Router()

const uploadsBase = path.resolve(
  process.env.UPLOADS_DIR ?? path.join(__dirname, '..', 'uploads'),
)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertInsideUploads(absolute: string): void {
  const resolved = path.resolve(absolute)
  if (resolved !== uploadsBase && !resolved.startsWith(uploadsBase + path.sep)) {
    throw new Error('Path escapes uploads dir')
  }
}

function validateVehicleId(req: Request, res: Response, next: NextFunction): void {
  if (!UUID_RE.test(req.params.vehicleId)) {
    res.status(400).json({ error: 'Invalid vehicleId' })
    return
  }
  next()
}

function validateDocId(req: Request, res: Response, next: NextFunction): void {
  if (!UUID_RE.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid id' })
    return
  }
  next()
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const dir = path.join(uploadsBase, req.params.vehicleId)
      assertInsideUploads(dir)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    } catch (e) { cb(e as Error, '') }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')
    cb(null, `${Date.now()}${ext || '.pdf'}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

function toRes(d: any, req: Request) {
  return {
    id: d.id, vehicle_id: d.vehicleId, user_id: d.userId,
    name: d.name, storage_path: d.storagePath,
    doc_type: d.docType, file_size: d.fileSize,
    created_at: d.createdAt.toISOString(),
    signed_url: buildAbsoluteSignedUrl(req, 'GET', `/api/documents/${d.id}/download`),
  }
}

// GET /api/vehicles/:vehicleId/documents
router.get('/vehicles/:vehicleId/documents', validateVehicleId, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, userId: req.userId } })
    if (!vehicle) { res.status(404).json({ error: 'Not found' }); return }
    const items = await prisma.vehicleDocument.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(items.map((d) => toRes(d, req)))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/documents
router.post(
  '/vehicles/:vehicleId/documents',
  validateVehicleId,
  upload.single('file'),
  async (req, res) => {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
    try {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, userId: req.userId } })
      if (!vehicle) { res.status(404).json({ error: 'Not found' }); return }
      const storagePath = `${req.params.vehicleId}/${req.file.filename}`
      const doc = await prisma.vehicleDocument.create({
        data: {
          vehicleId: req.params.vehicleId,
          userId: req.userId!,
          name: req.body.name ?? req.file.originalname,
          storagePath,
          docType: req.body.doc_type ?? 'manual',
          fileSize: req.file.size,
        },
      })
      res.status(201).json(toRes(doc, req))
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  },
)

// DELETE /api/documents/:id
router.delete('/documents/:id', validateDocId, async (req, res) => {
  try {
    const doc = await prisma.vehicleDocument.findFirst({
      where: { id: req.params.id, vehicle: { userId: req.userId } },
    })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, doc.storagePath)
    try { assertInsideUploads(filePath) } catch { res.status(400).json({ error: 'Bad path' }); return }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await prisma.vehicleDocument.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/documents/:id/download
// Default: inline for PDFs (opens in browser tab). ?dl=1 forces download. Non-PDF always downloads.
// Reachable either via a normal Bearer token (req.userId set, ownership enforced below) or via
// the HMAC signed-URL bypass (req.userId undefined - already authorized when the URL was minted).
router.get('/documents/:id/download', validateDocId, async (req, res) => {
  try {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    if (req.userId) {
      const owned = await prisma.vehicleDocument.findFirst({
        where: { id: req.params.id, vehicle: { userId: req.userId } },
      })
      if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    }
    const filePath = path.join(uploadsBase, doc.storagePath)
    try { assertInsideUploads(filePath) } catch { res.status(400).json({ error: 'Bad path' }); return }
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return }
    const ext = path.extname(doc.storagePath).toLowerCase()
    const filename = `${doc.name}${ext}`
    const isPdf = ext === '.pdf'
    const wantsDownload = req.query.dl === '1'
    // Only PDFs can render inline; everything else is forced to attachment to neutralize HTML/SVG/etc.
    const disposition = isPdf && !wantsDownload ? 'inline' : 'attachment'
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream')
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    // Sandbox isolates the response from the app origin so even a PDF with active content cannot reach our cookies/storage.
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.sendFile(filePath)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
