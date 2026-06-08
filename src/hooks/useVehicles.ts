import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
import { useAppStore } from '../store'
import type { Vehicle, MaintenanceLog } from '../types'

export function useVehicles() {
  const { vehicles, setVehicles, removeVehicle, setMaintenanceLogs } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const vehicleData = await api<Vehicle[]>('/vehicles')
      setVehicles(vehicleData)

      const logData = await api<MaintenanceLog[]>('/maintenance/last-ordinary')
      const currentLogs = useAppStore.getState().maintenanceLogs
      const seen = new Set<string>()
      for (const log of logData) {
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [setVehicles, setMaintenanceLogs])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  const createVehicle = async (payload: Partial<Vehicle>): Promise<Vehicle> => {
    const data = await api<Vehicle>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setVehicles([data, ...vehicles])
    return data
  }

  const updateVehicle = async (id: string, payload: Partial<Vehicle>): Promise<Vehicle> => {
    const data = await api<Vehicle>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setVehicles(vehicles.map((v) => (v.id === id ? data : v)))
    return data
  }

  const deleteVehicle = async (id: string): Promise<void> => {
    await api(`/vehicles/${id}`, { method: 'DELETE' })
    removeVehicle(id)
  }

  return { vehicles, loading, error, fetchVehicles, createVehicle, updateVehicle, deleteVehicle }
}
