import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

const SETTINGS_MAP: Record<string, string> = {
  main_jet: 'mainJet', pilot_jet: 'pilotJet', needle_clip: 'needleClip',
  air_screw: 'airScrew', fuel_mixture: 'fuelMixture', fork_preload: 'forkPreload',
  fork_compression: 'forkCompression', fork_rebound: 'forkRebound',
  fork_oil_level: 'forkOilLevel', fork_oil_type: 'forkOilType',
  shock_preload: 'shockPreload', shock_compression_high: 'shockCompressionHigh',
  shock_compression_low: 'shockCompressionLow', shock_rebound: 'shockRebound',
  setting_notes: 'settingNotes',
}

function settingsToData(body: Record<string, unknown>) {
  const d: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(SETTINGS_MAP)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  return d
}

function settingsToRes(s: any) {
  return {
    id: s.id, vehicle_id: s.vehicleId, user_id: s.userId,
    main_jet: s.mainJet, pilot_jet: s.pilotJet, needle_clip: s.needleClip,
    air_screw: s.airScrew !== null ? Number(s.airScrew) : null,
    fuel_mixture: s.fuelMixture, fork_preload: s.forkPreload,
    fork_compression: s.forkCompression, fork_rebound: s.forkRebound,
    fork_oil_level: s.forkOilLevel, fork_oil_type: s.forkOilType,
    shock_preload: s.shockPreload, shock_compression_high: s.shockCompressionHigh,
    shock_compression_low: s.shockCompressionLow, shock_rebound: s.shockRebound,
    setting_notes: s.settingNotes,
    updated_at: s.updatedAt.toISOString(),
  }
}

const HISTORY_MAP: Record<string, string> = {
  ...SETTINGS_MAP,
  label: 'label', condition: 'condition', feeling_rating: 'feelingRating', notes: 'notes',
}

function historyToData(body: Record<string, unknown>) {
  const d: Record<string, unknown> = {}
  for (const [snake, camel] of Object.entries(HISTORY_MAP)) {
    if (snake in body) d[camel] = body[snake] ?? null
  }
  if ('date' in body) d.date = new Date(body.date as string)
  return d
}

function historyToRes(h: any) {
  return {
    id: h.id, vehicle_id: h.vehicleId, user_id: h.userId,
    label: h.label,
    date: h.date instanceof Date ? h.date.toISOString().split('T')[0] : h.date,
    condition: h.condition,
    main_jet: h.mainJet, pilot_jet: h.pilotJet, needle_clip: h.needleClip,
    air_screw: h.airScrew !== null ? Number(h.airScrew) : null,
    fuel_mixture: h.fuelMixture, fork_preload: h.forkPreload,
    fork_compression: h.forkCompression, fork_rebound: h.forkRebound,
    fork_oil_level: h.forkOilLevel, fork_oil_type: h.forkOilType,
    shock_preload: h.shockPreload, shock_compression_high: h.shockCompressionHigh,
    shock_compression_low: h.shockCompressionLow, shock_rebound: h.shockRebound,
    feeling_rating: h.feelingRating, notes: h.notes,
    created_at: h.createdAt.toISOString(),
  }
}

// GET /api/vehicles/:vehicleId/settings
router.get('/vehicles/:vehicleId/settings', async (req, res) => {
  try {
    const s = await prisma.motoSettings.findUnique({ where: { vehicleId: req.params.vehicleId } })
    if (!s) { res.status(404).json({ error: 'Not found' }); return }
    res.json(settingsToRes(s))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/vehicles/:vehicleId/settings (upsert)
router.put('/vehicles/:vehicleId/settings', async (req, res) => {
  const { vehicleId } = req.params
  const data = settingsToData(req.body)
  try {
    const s = await prisma.motoSettings.upsert({
      where: { vehicleId },
      create: { ...data, vehicleId, userId: 'admin' } as any,
      update: data as any,
    })
    res.json(settingsToRes(s))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/vehicles/:vehicleId/settings/history
router.get('/vehicles/:vehicleId/settings/history', async (req, res) => {
  try {
    const items = await prisma.motoSettingsHistory.findMany({
      where: { vehicleId: req.params.vehicleId },
      orderBy: { date: 'desc' },
    })
    res.json(items.map(historyToRes))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/vehicles/:vehicleId/settings/history
router.post('/vehicles/:vehicleId/settings/history', async (req, res) => {
  try {
    const item = await prisma.motoSettingsHistory.create({
      data: { ...historyToData(req.body), vehicleId: req.params.vehicleId, userId: 'admin' } as any,
    })
    res.status(201).json(historyToRes(item))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/settings/history/:id
router.delete('/settings/history/:id', async (req, res) => {
  try {
    await prisma.motoSettingsHistory.delete({ where: { id: req.params.id } })
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
