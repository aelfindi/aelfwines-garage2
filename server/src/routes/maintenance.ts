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

type InvoiceKind = 'workshop' | 'parts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Reject before multer runs so user input never reaches the filesystem path.
function validateInvoiceParams(req: Request, res: Response, next: NextFunction): void {
  if (!UUID_RE.test(req.params.id)) { res.status(400).json({ error: 'Invalid id' }); return }
  if (req.params.kind !== 'workshop' && req.params.kind !== 'parts') {
    res.status(400).json({ error: 'Invalid kind' })
    return
  }
  next()
}

// Defense in depth: even with valid-looking params, refuse to operate outside uploadsBase.
function assertInsideUploads(absolute: string): void {
  const resolved = path.resolve(absolute)
  if (resolved !== uploadsBase && !resolved.startsWith(uploadsBase + path.sep)) {
    throw new Error('Path escapes uploads dir')
  }
}

function invoiceField(kind: InvoiceKind): 'workshopInvoicePath' | 'partsInvoicePath' {
  return kind === 'workshop' ? 'workshopInvoicePath' : 'partsInvoicePath'
}

function invoiceUrl(logId: string, kind: InvoiceKind, req: Request): string {
  return buildAbsoluteSignedUrl(req, 'GET', `/api/maintenance/${logId}/invoice/${kind}`)
}

function toRes(l: any, req?: any) {
  return {
    id: l.id,
    vehicle_id: l.vehicleId,
    user_id: l.userId,
    type: l.type,
    category: l.category,
    title: l.title,
    description: l.description,
    date: l.date instanceof Date ? l.date.toISOString().split('T')[0] : l.date,
    km_at_service: l.kmAtService,
    hours_at_service: l.hoursAtService !== null ? Number(l.hoursAtService) : null,
    next_service_km: l.nextServiceKm,
    next_service_hours: l.nextServiceHours !== null ? Number(l.nextServiceHours) : null,
    next_service_date: l.nextServiceDate instanceof Date
      ? l.nextServiceDate.toISOString().split('T')[0]
      : l.nextServiceDate,
    cost: l.cost !== null ? Number(l.cost) : null,
    workshop: l.workshop,
    parts_used: l.partsUsed,
    workshop_invoice_url: l.workshopInvoicePath && req ? invoiceUrl(l.id, 'workshop', req) : null,
    parts_invoice_url: l.partsInvoicePath && req ? invoiceUrl(l.id, 'parts', req) : null,
    created_at: l.createdAt.toISOString(),
  }
}

function toData(body: Record<string, unknown>) {
  const d: Record<string, unknown> = {}
  const map: Record<string, string> = {
    type: 'type', category: 'category', title: 'title', description: 'description',
    km_at_service: 'kmAtService', hours_at_service: 'hoursAtService',
    next_service_km: 'nextServiceKm', next_service_hours: 'nextServiceHours',
    cost: 'cost', workshop: 'workshop', parts_used: 'partsUsed',
  }
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  if ('date' in body) d.date = new Date(body.date as string)
  if ('next_service_date' in body)
    d.nextServiceDate = body.next_service_date ? new Date(body.next_service_date as string) : null
  return d
}

const invoiceStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      // params already validated by validateInvoiceParams middleware
      const dir = path.join(uploadsBase, 'maintenance', req.params.id)
      assertInsideUploads(dir)
      fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    } catch (e) { cb(e as Error, '') }
  },
  filename: (req, _file, cb) => {
    // kind already validated to 'workshop' | 'parts'
    cb(null, `${req.params.kind}.pdf`)
  },
})
const uploadInvoice = multer({ storage: invoiceStorage, limits: { fileSize: 50 * 1024 * 1024 } })

// GET /api/maintenance/last-ordinary - last ordinary log per vehicle (caller's vehicles only)
router.get('/maintenance/last-ordinary', async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      where: { type: 'ordinary', vehicle: { userId: req.userId } },
      orderBy: { date: 'desc' },
      distinct: ['vehicleId'],
    })
    res.json(logs.map((l) => toRes(l, req)))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/vehicles/:vehicleId/maintenance
router.get('/vehicles/:vehicleId/maintenance', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, userId: req.userId } })
    if (!vehicle) { res.status(404).json({ error: 'Not found' }); return }
    const logs = await prisma.maintenanceLog.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
    })
    res.json(logs.map((l) => toRes(l, req)))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/maintenance
router.post('/vehicles/:vehicleId/maintenance', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, userId: req.userId } })
    if (!vehicle) { res.status(404).json({ error: 'Not found' }); return }
    const log = await prisma.maintenanceLog.create({
      data: { ...toData(req.body), vehicleId: req.params.vehicleId, userId: req.userId! } as any,
    })
    res.status(201).json(toRes(log, req))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/maintenance/:id
router.patch('/maintenance/:id', async (req, res) => {
  try {
    const owned = await prisma.maintenanceLog.findFirst({
      where: { id: req.params.id, vehicle: { userId: req.userId } },
    })
    if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    const log = await prisma.maintenanceLog.update({
      where: { id: req.params.id },
      data: toData(req.body) as any,
    })
    res.json(toRes(log, req))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/maintenance/:id - removes log + on-disk invoices
router.delete('/maintenance/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) { res.status(400).json({ error: 'Invalid id' }); return }
  try {
    const owned = await prisma.maintenanceLog.findFirst({
      where: { id: req.params.id, vehicle: { userId: req.userId } },
    })
    if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    await prisma.maintenanceLog.delete({ where: { id: req.params.id } })
    const invoiceDir = path.join(uploadsBase, 'maintenance', req.params.id)
    try { assertInsideUploads(invoiceDir) } catch { res.status(400).json({ error: 'Bad path' }); return }
    if (fs.existsSync(invoiceDir)) fs.rmSync(invoiceDir, { recursive: true, force: true })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/maintenance/:id/invoice/:kind - upload an invoice PDF
router.post(
  '/maintenance/:id/invoice/:kind',
  validateInvoiceParams,
  uploadInvoice.single('file'),
  async (req, res) => {
    const kind = req.params.kind as InvoiceKind
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
    try {
      const owned = await prisma.maintenanceLog.findFirst({
        where: { id: req.params.id, vehicle: { userId: req.userId } },
      })
      if (!owned) { res.status(404).json({ error: 'Not found' }); return }
      const relativePath = `maintenance/${req.params.id}/${kind}.pdf`
      const log = await prisma.maintenanceLog.update({
        where: { id: req.params.id },
        data: { [invoiceField(kind)]: relativePath } as any,
      })
      res.json(toRes(log, req))
    } catch (e) {
      console.error(e)
      res.status(500).json({ error: 'Server error' })
    }
  },
)

// DELETE /api/maintenance/:id/invoice/:kind
router.delete('/maintenance/:id/invoice/:kind', validateInvoiceParams, async (req, res) => {
  const kind = req.params.kind as InvoiceKind
  try {
    const log = await prisma.maintenanceLog.findFirst({
      where: { id: req.params.id, vehicle: { userId: req.userId } },
    })
    if (!log) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, 'maintenance', req.params.id, `${kind}.pdf`)
    try { assertInsideUploads(filePath) } catch { res.status(400).json({ error: 'Bad path' }); return }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    const updated = await prisma.maintenanceLog.update({
      where: { id: req.params.id },
      data: { [invoiceField(kind)]: null } as any,
    })
    res.json(toRes(updated, req))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/maintenance/:id/invoice/:kind - serve PDF inline by default, ?dl=1 forces download.
// Reachable either via a normal Bearer token (req.userId set, ownership enforced below) or via
// the HMAC signed-URL bypass (req.userId undefined - already authorized when the URL was minted).
router.get('/maintenance/:id/invoice/:kind', validateInvoiceParams, async (req, res) => {
  const kind = req.params.kind as InvoiceKind
  try {
    const log = await prisma.maintenanceLog.findUnique({ where: { id: req.params.id } })
    if (!log) { res.status(404).json({ error: 'Not found' }); return }
    if (req.userId) {
      const owned = await prisma.maintenanceLog.findFirst({
        where: { id: req.params.id, vehicle: { userId: req.userId } },
      })
      if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    }
    const storedPath = (log as any)[invoiceField(kind)] as string | null
    if (!storedPath) { res.status(404).json({ error: 'File not found' }); return }
    const filePath = path.join(uploadsBase, storedPath)
    try { assertInsideUploads(filePath) } catch { res.status(400).json({ error: 'Bad path' }); return }
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return }
    const labelTitle = log.title?.replace(/[^\w\d -]/g, '_') ?? 'factura'
    const filename = `${labelTitle}-${kind === 'workshop' ? 'taller' : 'piezas'}.pdf`
    const disposition = req.query.dl === '1' ? 'attachment' : 'inline'
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(filename)}"`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox")
    res.sendFile(filePath)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
