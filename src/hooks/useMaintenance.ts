import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store'
import type { MaintenanceLog } from '../types'

export function useMaintenance(vehicleId: string) {
  const { maintenanceLogs, setMaintenanceLogs } = useAppStore()
  const logs = maintenanceLogs[vehicleId] ?? []
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!vehicleId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false })
    if (error) setError(error.message)
    else setMaintenanceLogs(vehicleId, data ?? [])
    setLoading(false)
  }, [vehicleId, setMaintenanceLogs])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const createLog = async (payload: Partial<MaintenanceLog>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert({ ...payload, vehicle_id: vehicleId, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    setMaintenanceLogs(vehicleId, [data as MaintenanceLog, ...logs])
    return data as MaintenanceLog
  }

  const updateLog = async (id: string, payload: Partial<MaintenanceLog>) => {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setMaintenanceLogs(vehicleId, logs.map((l) => l.id === id ? data as MaintenanceLog : l))
    return data as MaintenanceLog
  }

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from('maintenance_logs').delete().eq('id', id)
    if (error) throw error
    setMaintenanceLogs(vehicleId, logs.filter((l) => l.id !== id))
  }

  const ordinaryLogs = logs.filter((l) => l.type === 'ordinary')
  const extraordinaryLogs = logs.filter((l) => l.type === 'extraordinary')
  const lastOrdinary = ordinaryLogs[0] ?? null

  return { logs, ordinaryLogs, extraordinaryLogs, lastOrdinary, loading, error, fetchLogs, createLog, updateLog, deleteLog }
}
