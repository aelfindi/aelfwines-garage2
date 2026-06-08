import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

function toRes(l: any) {
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

// GET /api/maintenance/last-ordinary — last ordinary log per vehicle (for Home status badges)
// MUST be registered before /:id routes to avoid param conflict
router.get('/maintenance/last-ordinary', async (_req, res) => {
  try {
    const logs = await prisma.maintenanceLog.findMany({
      where: { type: 'ordinary' },
      orderBy: { date: 'desc' },
      distinct: ['vehicleId'],
    })
    res.json(logs.map(toRes))
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
    res.json(logs.map(toRes))
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
    res.status(201).json(toRes(log))
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
    res.json(toRes(log))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/maintenance/:id
router.delete('/maintenance/:id', async (req, res) => {
  try {
    await prisma.maintenanceLog.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
