import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAppStore } from '../store'
import type { MotoSettings, MotoSettingsHistory, SessionNote, Condition } from '../types'

export function useMotoSettings(vehicleId: string) {
  const { motoSettings, motoHistory, sessionNotes, setMotoSettings, setMotoHistory, setSessionNotes } = useAppStore()
  const settings = motoSettings[vehicleId] ?? null
  const history = motoHistory[vehicleId] ?? []
  const sessions = sessionNotes[vehicleId] ?? []
  const [loading, setLoading] = useState(false)
  const [error] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    try {
      const [s, h, n] = await Promise.allSettled([
        api<MotoSettings>(`/vehicles/${vehicleId}/settings`),
        api<MotoSettingsHistory[]>(`/vehicles/${vehicleId}/settings/history`),
        api<SessionNote[]>(`/vehicles/${vehicleId}/sessions`),
      ])
      if (s.status === 'fulfilled') setMotoSettings(vehicleId, s.value)
      if (h.status === 'fulfilled') setMotoHistory(vehicleId, h.value)
      if (n.status === 'fulfilled') setSessionNotes(vehicleId, n.value)
    } finally {
      setLoading(false)
    }
  }, [vehicleId, setMotoSettings, setMotoHistory, setSessionNotes])

  useEffect(() => { fetchAll() }, [fetchAll])

  const saveSettings = async (payload: Partial<MotoSettings>): Promise<void> => {
    const data = await api<MotoSettings>(`/vehicles/${vehicleId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    setMotoSettings(vehicleId, data)
  }

  const saveSnapshotOf = async (
    values: Partial<MotoSettings>,
    label: string,
    condition: Condition = 'road',
    rating = 3,
    notes = ''
  ): Promise<MotoSettingsHistory> => {
    const payload = {
      label, condition, date: new Date().toISOString().split('T')[0],
      feeling_rating: rating, notes,
      main_jet: values.main_jet ?? null, pilot_jet: values.pilot_jet ?? null,
      needle_clip: values.needle_clip ?? null, air_screw: values.air_screw ?? null,
      fuel_mixture: values.fuel_mixture ?? null, fork_preload: values.fork_preload ?? null,
      fork_compression: values.fork_compression ?? null, fork_rebound: values.fork_rebound ?? null,
      fork_oil_level: values.fork_oil_level ?? null, fork_oil_type: values.fork_oil_type ?? null,
      shock_preload: values.shock_preload ?? null,
      shock_compression_high: values.shock_compression_high ?? null,
      shock_compression_low: values.shock_compression_low ?? null,
      shock_rebound: values.shock_rebound ?? null,
    }
    const data = await api<MotoSettingsHistory>(`/vehicles/${vehicleId}/settings/history`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setMotoHistory(vehicleId, [data, ...history])
    return data
  }

  const saveSnapshot = async (label: string, condition: Condition, rating: number, notes: string): Promise<MotoSettingsHistory> => {
    if (!settings) throw new Error('No settings to snapshot')
    return saveSnapshotOf(settings, label, condition, rating, notes)
  }

  const deleteSnapshot = async (id: string): Promise<void> => {
    await api(`/settings/history/${id}`, { method: 'DELETE' })
    setMotoHistory(vehicleId, history.filter((h) => h.id !== id))
  }

  const createSession = async (payload: Partial<SessionNote>): Promise<SessionNote> => {
    const data = await api<SessionNote>(`/vehicles/${vehicleId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSessionNotes(vehicleId, [data, ...sessions])
    return data
  }

  const deleteSession = async (id: string): Promise<void> => {
    await api(`/sessions/${id}`, { method: 'DELETE' })
    setSessionNotes(vehicleId, sessions.filter((s) => s.id !== id))
  }

  return {
    settings, history, sessions, loading, error,
    saveSettings, saveSnapshot, saveSnapshotOf, deleteSnapshot, createSession, deleteSession,
  }
}
