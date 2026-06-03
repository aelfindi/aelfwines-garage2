import { create } from 'zustand'
import type { Vehicle, MaintenanceLog, MotoSettings, MotoSettingsHistory, SessionNote } from '../types'

interface AppState {
  vehicles: Vehicle[]
  maintenanceLogs: Record<string, MaintenanceLog[]>
  motoSettings: Record<string, MotoSettings>
  motoHistory: Record<string, MotoSettingsHistory[]>
  sessionNotes: Record<string, SessionNote[]>

  setVehicles: (vehicles: Vehicle[]) => void
  setMaintenanceLogs: (vehicleId: string, logs: MaintenanceLog[]) => void
  setMotoSettings: (vehicleId: string, settings: MotoSettings) => void
  setMotoHistory: (vehicleId: string, history: MotoSettingsHistory[]) => void
  setSessionNotes: (vehicleId: string, notes: SessionNote[]) => void
  removeVehicle: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  vehicles: [],
  maintenanceLogs: {},
  motoSettings: {},
  motoHistory: {},
  sessionNotes: {},

  setVehicles: (vehicles) => set({ vehicles }),
  setMaintenanceLogs: (vehicleId, logs) =>
    set((s) => ({ maintenanceLogs: { ...s.maintenanceLogs, [vehicleId]: logs } })),
  setMotoSettings: (vehicleId, settings) =>
    set((s) => ({ motoSettings: { ...s.motoSettings, [vehicleId]: settings } })),
  setMotoHistory: (vehicleId, history) =>
    set((s) => ({ motoHistory: { ...s.motoHistory, [vehicleId]: history } })),
  setSessionNotes: (vehicleId, notes) =>
    set((s) => ({ sessionNotes: { ...s.sessionNotes, [vehicleId]: notes } })),
  removeVehicle: (id) =>
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) })),
}))
