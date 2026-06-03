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

  const saveSnapshot = async (label: string, condition: Condition, rating: number, notes: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!settings) throw new Error('No settings to snapshot')
    const { data, error } = await supabase
      .from('moto_settings_history')
      .insert({
        vehicle_id: vehicleId, user_id: user?.id,
        label, condition, date: new Date().toISOString().split('T')[0],
        feeling_rating: rating, notes,
        main_jet: settings.main_jet, pilot_jet: settings.pilot_jet,
        needle_clip: settings.needle_clip, air_screw: settings.air_screw,
        fuel_mixture: settings.fuel_mixture, fork_preload: settings.fork_preload,
        fork_compression: settings.fork_compression, fork_rebound: settings.fork_rebound,
        fork_oil_level: settings.fork_oil_level, fork_oil_type: settings.fork_oil_type,
        shock_preload: settings.shock_preload, shock_compression_high: settings.shock_compression_high,
        shock_compression_low: settings.shock_compression_low, shock_rebound: settings.shock_rebound,
      })
      .select().single()
    if (error) throw error
    setMotoHistory(vehicleId, [data as MotoSettingsHistory, ...history])
    return data as MotoSettingsHistory
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
    saveSettings, saveSnapshot, deleteSnapshot, createSession, deleteSession,
  }
}
