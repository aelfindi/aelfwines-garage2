import { useEffect, useState, useCallback } from 'react'
import { api } from '../lib/api'
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
    try {
      const data = await api<MaintenanceLog[]>(`/vehicles/${vehicleId}/maintenance`)
      setMaintenanceLogs(vehicleId, data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [vehicleId, setMaintenanceLogs])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const createLog = async (payload: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
    const data = await api<MaintenanceLog>(`/vehicles/${vehicleId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setMaintenanceLogs(vehicleId, [data, ...logs])
    return data
  }

  const updateLog = async (id: string, payload: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
    const data = await api<MaintenanceLog>(`/maintenance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setMaintenanceLogs(vehicleId, logs.map((l) => (l.id === id ? data : l)))
    return data
  }

  const deleteLog = async (id: string): Promise<void> => {
    await api(`/maintenance/${id}`, { method: 'DELETE' })
    setMaintenanceLogs(vehicleId, logs.filter((l) => l.id !== id))
  }

  const ordinaryLogs = logs.filter((l) => l.type === 'ordinary')
  const extraordinaryLogs = logs.filter((l) => l.type === 'extraordinary')
  const lastOrdinary = ordinaryLogs[0] ?? null

  return { logs, ordinaryLogs, extraordinaryLogs, lastOrdinary, loading, error, fetchLogs, createLog, updateLog, deleteLog }
}
