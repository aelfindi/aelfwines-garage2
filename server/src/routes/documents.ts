import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db'

const router = Router()

const uploadsBase = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads')

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(uploadsBase, req.params.vehicleId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}${ext}`)
  },
})

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

function buildSignedUrl(docId: string, req: any): string {
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol
  const host = req.headers['x-forwarded-host'] ?? req.get('host')
  const base = `${proto}://${host}`
  const token = (req.query.token as string) ??
    req.headers.authorization?.replace('Bearer ', '') ?? ''
  return `${base}/api/documents/${docId}/download?token=${token}`
}

function toRes(d: any, req: any) {
  return {
    id: d.id, vehicle_id: d.vehicleId, user_id: d.userId,
    name: d.name, storage_path: d.storagePath,
    doc_type: d.docType, file_size: d.fileSize,
    created_at: d.createdAt.toISOString(),
    signed_url: buildSignedUrl(d.id, req),
  }
}

// GET /api/vehicles/:vehicleId/documents
router.get('/vehicles/:vehicleId/documents', async (req, res) => {
  try {
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
router.post('/vehicles/:vehicleId/documents', upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
  try {
    const storagePath = `${req.params.vehicleId}/${req.file.filename}`
    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: req.params.vehicleId,
        userId: 'admin',
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
})

// DELETE /api/documents/:id
router.delete('/documents/:id', async (req, res) => {
  try {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, doc.storagePath)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await prisma.vehicleDocument.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/documents/:id/download
// Default: inline (opens in browser tab). Pass ?dl=1 to force download.
router.get('/documents/:id/download', async (req, res) => {
  try {
    const doc = await prisma.vehicleDocument.findUnique({ where: { id: req.params.id } })
    if (!doc) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, doc.storagePath)
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return }
    const ext = path.extname(doc.storagePath).toLowerCase()
    const filename = `${doc.name}${ext}`
    const disposition = req.query.dl === '1' ? 'attachment' : 'inline'
    res.setHeader('Content-Type', ext === '.pdf' ? 'application/pdf' : 'application/octet-stream')
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`)
    res.sendFile(filePath)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
