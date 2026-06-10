import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db'

const router = Router()

const uploadsBase = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads')

type InvoiceKind = 'workshop' | 'parts'

function invoiceField(kind: InvoiceKind): 'workshopInvoicePath' | 'partsInvoicePath' {
  return kind === 'workshop' ? 'workshopInvoicePath' : 'partsInvoicePath'
}

function invoiceUrl(logId: string, kind: InvoiceKind, req: any): string {
  const proto = req.headers['x-forwarded-proto'] ?? req.protocol
  const host = req.headers['x-forwarded-host'] ?? req.get('host')
  const token = (req.query.token as string) ??
    req.headers.authorization?.replace('Bearer ', '') ?? ''
  return `${proto}://${host}/api/maintenance/${logId}/invoice/${kind}?token=${token}`
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
    const dir = path.join(uploadsBase, 'maintenance', req.params.id)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, _file, cb) => {
    const kind = req.params.kind as string
    cb(null, `${kind}.pdf`)
  },
})
const uploadInvoice = multer({ storage: invoiceStorage, limits: { fileSize: 50 * 1024 * 1024 } })

// GET /api/maintenance/last-ordinary - last ordinary log per vehicle
router.get('/maintenance/last-ordinary', async (req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      where: { type: 'ordinary' },
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
    const log = await prisma.maintenanceLog.create({
      data: { ...toData(req.body), vehicleId: req.params.vehicleId, userId: 'admin' } as any,
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
  try {
    await prisma.maintenanceLog.delete({ where: { id: req.params.id } })
    const invoiceDir = path.join(uploadsBase, 'maintenance', req.params.id)
    if (fs.existsSync(invoiceDir)) fs.rmSync(invoiceDir, { recursive: true, force: true })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/maintenance/:id/invoice/:kind - upload an invoice PDF
router.post('/maintenance/:id/invoice/:kind', uploadInvoice.single('file'), async (req, res) => {
  const kind = req.params.kind as InvoiceKind
  if (kind !== 'workshop' && kind !== 'parts') {
    res.status(400).json({ error: 'Invalid kind' })
    return
  }
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return }
  try {
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
})

// DELETE /api/maintenance/:id/invoice/:kind
router.delete('/maintenance/:id/invoice/:kind', async (req, res) => {
  const kind = req.params.kind as InvoiceKind
  if (kind !== 'workshop' && kind !== 'parts') {
    res.status(400).json({ error: 'Invalid kind' })
    return
  }
  try {
    const log = await prisma.maintenanceLog.findUnique({ where: { id: req.params.id } })
    if (!log) { res.status(404).json({ error: 'Not found' }); return }
    const filePath = path.join(uploadsBase, 'maintenance', req.params.id, `${kind}.pdf`)
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

// GET /api/maintenance/:id/invoice/:kind - serve PDF inline by default, ?dl=1 forces download
router.get('/maintenance/:id/invoice/:kind', async (req, res) => {
  const kind = req.params.kind as InvoiceKind
  if (kind !== 'workshop' && kind !== 'parts') {
    res.status(400).json({ error: 'Invalid kind' })
    return
  }
  try {
    const log = await prisma.maintenanceLog.findUnique({ where: { id: req.params.id } })
    if (!log) { res.status(404).json({ error: 'Not found' }); return }
    const storedPath = (log as any)[invoiceField(kind)] as string | null
    if (!storedPath) { res.status(404).json({ error: 'File not found' }); return }
    const filePath = path.join(uploadsBase, storedPath)
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
