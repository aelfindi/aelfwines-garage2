import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

function toRes(v: any) {
  return {
    id: v.id,
    user_id: v.userId,
    name: v.name,
    type: v.type,
    brand: v.brand,
    model: v.model,
    year: v.year,
    license_plate: v.licensePlate,
    engine: v.engine,
    oil_type: v.oilType,
    oil_quantity: v.oilQuantity !== null ? Number(v.oilQuantity) : null,
    maintenance_interval_km: v.maintenanceIntervalKm,
    maintenance_interval_hours: v.maintenanceIntervalHours,
    current_km: v.currentKm,
    current_hours: Number(v.currentHours),
    photo_url: v.photoUrl,
    notes: v.notes,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
  }
}

function toData(body: Record<string, unknown>) {
  const map: Record<string, string> = {
    name: 'name', type: 'type', brand: 'brand', model: 'model',
    year: 'year', license_plate: 'licensePlate', engine: 'engine',
    oil_type: 'oilType', oil_quantity: 'oilQuantity',
    maintenance_interval_km: 'maintenanceIntervalKm',
    maintenance_interval_hours: 'maintenanceIntervalHours',
    current_km: 'currentKm', current_hours: 'currentHours',
    photo_url: 'photoUrl', notes: 'notes',
  }
  const data: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in body) data[camel] = body[snake] ?? null
  }
  return data
}

router.get('/', async (req, res) => {
  try {
    const items = await prisma.vehicle.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(items.map(toRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req, res) => {
  try {
    const item = await prisma.vehicle.create({
      data: { ...toData(req.body), userId: req.userId! } as any,
    })
    res.status(201).json(toRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const owned = await prisma.vehicle.findFirst({ where: { id: req.params.id, userId: req.userId } })
    if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    const item = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: toData(req.body) as any,
    })
    res.json(toRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const owned = await prisma.vehicle.findFirst({ where: { id: req.params.id, userId: req.userId } })
    if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    await prisma.vehicle.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
