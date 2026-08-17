import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

function toRes(s: any) {
  return {
    id: s.id, vehicle_id: s.vehicleId, user_id: s.userId,
    date: s.date instanceof Date ? s.date.toISOString().split('T')[0] : s.date,
    location: s.location, condition: s.condition,
    km_start: s.kmStart, km_end: s.kmEnd, setting_id: s.settingId,
    title: s.title, content: s.content,
    feeling_rating: s.feelingRating,
    created_at: s.createdAt.toISOString(),
  }
}

function toData(body: Record<string, unknown>) {
  const map: Record<string, string> = {
    location: 'location', condition: 'condition',
    km_start: 'kmStart', km_end: 'kmEnd', setting_id: 'settingId',
    title: 'title', content: 'content', feeling_rating: 'feelingRating',
  }
  const d: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  if ('date' in body) d.date = new Date(body.date as string)
  return d
}

// GET /api/vehicles/:vehicleId/sessions
router.get('/vehicles/:vehicleId/sessions', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, userId: req.userId } })
    if (!vehicle) { res.status(404).json({ error: 'Not found' }); return }
    const items = await prisma.sessionNote.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
    })
    res.json(items.map(toRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/sessions
router.post('/vehicles/:vehicleId/sessions', async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: req.params.vehicleId, userId: req.userId } })
    if (!vehicle) { res.status(404).json({ error: 'Not found' }); return }
    const item = await prisma.sessionNote.create({
      data: { ...toData(req.body), vehicleId: req.params.vehicleId, userId: req.userId! } as any,
    })
    res.status(201).json(toRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    const owned = await prisma.sessionNote.findFirst({
      where: { id: req.params.id, vehicle: { userId: req.userId } },
    })
    if (!owned) { res.status(404).json({ error: 'Not found' }); return }
    await prisma.sessionNote.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
