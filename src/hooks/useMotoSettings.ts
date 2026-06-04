import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
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
    const [s, h, n] = await Promise.all([
      supabase.from('moto_settings').select('*').eq('vehicle_id', vehicleId).single(),
      supabase.from('moto_settings_history').select('*').eq('vehicle_id', vehicleId).order('date', { ascending: false }),
      supabase.from('session_notes').select('*').eq('vehicle_id', vehicleId).order('date', { ascending: false }),
    ])
    if (s.data) setMotoSettings(vehicleId, s.data)
    if (h.data) setMotoHistory(vehicleId, h.data)
    if (n.data) setSessionNotes(vehicleId, n.data)
    setLoading(false)
  }, [vehicleId, setMotoSettings, setMotoHistory, setSessionNotes])

  useEffect(() => { fetchAll() }, [fetchAll])

  const saveSettings = async (payload: Partial<MotoSettings>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (settings) {
      const { data, error } = await supabase
        .from('moto_settings')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('vehicle_id', vehicleId)
        .select().single()
      if (error) throw error
      setMotoSettings(vehicleId, data)
    } else {
      const { data, error } = await supabase
        .from('moto_settings')
        .insert({ ...payload, vehicle_id: vehicleId, user_id: user?.id })
        .select().single()
      if (error) throw error
      setMotoSettings(vehicleId, data)
    }
  }

  const saveSnapshotOf = async (
    values: Partial<MotoSettings>,
    label: string,
    condition: Condition = 'road',
    rating = 3,
    notes = ''
  ) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('moto_settings_history')
      .insert({
        vehicle_id: vehicleId, user_id: user?.id,
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
      })
      .select().single()
    if (error) throw error
    setMotoHistory(vehicleId, [data as MotoSettingsHistory, ...history])
    return data as MotoSettingsHistory
  }

  const saveSnapshot = async (label: string, condition: Condition, rating: number, notes: string) => {
    if (!settings) throw new Error('No settings to snapshot')
    return saveSnapshotOf(settings, label, condition, rating, notes)
  }

  const deleteSnapshot = async (id: string) => {
    const { error } = await supabase.from('moto_settings_history').delete().eq('id', id)
    if (error) throw error
    setMotoHistory(vehicleId, history.filter((h) => h.id !== id))
  }

  const createSession = async (payload: Partial<SessionNote>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('session_notes')
      .insert({ ...payload, vehicle_id: vehicleId, user_id: user?.id })
      .select().single()
    if (error) throw error
    setSessionNotes(vehicleId, [data as SessionNote, ...sessions])
    return data as SessionNote
  }

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from('session_notes').delete().eq('id', id)
    if (error) throw error
    setSessionNotes(vehicleId, sessions.filter((s) => s.id !== id))
  }

  return {
    settings, history, sessions, loading, error,
    saveSettings, saveSnapshot, saveSnapshotOf, deleteSnapshot, createSession, deleteSession,
  }
}
