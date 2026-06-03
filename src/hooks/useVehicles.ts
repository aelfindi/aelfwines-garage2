import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store'
import type { Vehicle, MaintenanceLog } from '../types'

export function useVehicles() {
  const { vehicles, setVehicles, removeVehicle, setMaintenanceLogs } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data: vehicleData, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) { setError(error.message); setLoading(false); return }
    setVehicles(vehicleData ?? [])

    // Pre-carga el ultimo log ordinario por vehiculo para los badges de estado en Home.
    // Solo rellena vehiculos que aun no tienen logs en el store (evita sobreescribir
    // el historial completo cargado por useMaintenance).
    const { data: logData } = await supabase
      .from('maintenance_logs')
      .select('*')
      .eq('type', 'ordinary')
      .order('date', { ascending: false })

    if (logData && vehicleData) {
      const currentLogs = useAppStore.getState().maintenanceLogs
      const seen = new Set<string>()
      for (const log of logData as MaintenanceLog[]) {
        if (!seen.has(log.vehicle_id)) {
          seen.add(log.vehicle_id)
          if (!currentLogs[log.vehicle_id] || currentLogs[log.vehicle_id].length === 0) {
            setMaintenanceLogs(log.vehicle_id, [log])
          }
        }
      }
      for (const v of vehicleData) {
        if (!seen.has(v.id) && (!currentLogs[v.id] || currentLogs[v.id].length === 0)) {
          setMaintenanceLogs(v.id, [])
        }
      }
    }

    setLoading(false)
  }, [setVehicles, setMaintenanceLogs])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const createVehicle = async (payload: Partial<Vehicle>) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ ...payload, user_id: user?.id })
      .select()
      .single()
    if (error) throw error
    setVehicles([data, ...vehicles])
    return data as Vehicle
  }

  const updateVehicle = async (id: string, payload: Partial<Vehicle>) => {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setVehicles(vehicles.map((v) => (v.id === id ? (data as Vehicle) : v)))
    return data as Vehicle
  }

  const deleteVehicle = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) throw error
    removeVehicle(id)
  }

  return { vehicles, loading, error, fetchVehicles, createVehicle, updateVehicle, deleteVehicle }
}
