import type { Vehicle, MaintenanceLog, MaintenanceStatus, MotoSettings, MotoSettingsHistory, SettingsDiff } from '../types'

export function getMaintenanceStatus(
  vehicle: Vehicle,
  lastLog: MaintenanceLog | null
): MaintenanceStatus {
  if (!lastLog) return 'overdue'

  const kmSinceService = vehicle.current_km - (lastLog.km_at_service ?? 0)
  const hoursSinceService = vehicle.current_hours - (lastLog.hours_at_service ?? 0)

  const kmThreshold = vehicle.maintenance_interval_km ?? Infinity
  const hoursThreshold = vehicle.maintenance_interval_hours ?? Infinity

  if (kmSinceService >= kmThreshold || hoursSinceService >= hoursThreshold) return 'overdue'
  if (kmSinceService >= kmThreshold * 0.85 || hoursSinceService >= hoursThreshold * 0.85) return 'due_soon'
  return 'ok'
}

export function diffSettings(a: MotoSettings | MotoSettingsHistory, b: MotoSettings | MotoSettingsHistory): SettingsDiff {
  const fields: (keyof MotoSettings)[] = [
    'main_jet', 'pilot_jet', 'needle_clip', 'air_screw', 'fuel_mixture',
    'fork_preload', 'fork_compression', 'fork_rebound', 'fork_oil_level', 'fork_oil_type',
    'shock_preload', 'shock_compression_high', 'shock_compression_low', 'shock_rebound',
  ]
  const result: SettingsDiff = {}
  for (const field of fields) {
    result[field] = {
      a: a[field as keyof typeof a],
      b: b[field as keyof typeof b],
      changed: a[field as keyof typeof a] !== b[field as keyof typeof b],
    }
  }
  return result
}

export function formatKm(km: number): string {
  return new Intl.NumberFormat('es-ES').format(km) + ' km'
}

export function formatCost(cost: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cost)
}

export const ORDINARY_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'oil_change',  label: 'Cambio de aceite',       icon: '🛢️' },
  { key: 'brake_fluid', label: 'Liquido de frenos',       icon: '🔴' },
  { key: 'coolant',     label: 'Liquido refrigerante',    icon: '🌡️' },
  { key: 'air_filter',  label: 'Filtro de aire',          icon: '💨' },
  { key: 'fuel_filter', label: 'Filtro de combustible',   icon: '⛽' },
  { key: 'spark_plugs', label: 'Bujias',                  icon: '⚡' },
  { key: 'timing_belt', label: 'Correa de distribucion',  icon: '⚙️' },
  { key: 'gearbox_oil', label: 'Aceite de caja',          icon: '🔩' },
  { key: 'differential_oil', label: 'Aceite diferencial', icon: '🔧' },
  { key: 'other',       label: 'Otro',                    icon: '🔧' },
]

export const EXTRAORDINARY_CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: 'tires',       label: 'Neumaticos',              icon: '🔵' },
  { key: 'brake_pads',  label: 'Pastillas de freno',      icon: '🟤' },
  { key: 'brake_discs', label: 'Discos de freno',         icon: '⭕' },
  { key: 'battery',     label: 'Bateria',                 icon: '🔋' },
  { key: 'clutch',      label: 'Embrague',                icon: '⚙️' },
  { key: 'suspension',  label: 'Suspension',              icon: '🔧' },
  { key: 'exhaust',     label: 'Escape',                  icon: '💨' },
  { key: 'bodywork',    label: 'Carroceria',              icon: '🚗' },
  { key: 'electrical',  label: 'Sistema electrico',       icon: '⚡' },
  { key: 'other',       label: 'Otro',                    icon: '🛠️' },
]

export const CONDITIONS: { key: string; label: string; icon: string }[] = [
  { key: 'track_dry',  label: 'Pista seca',    icon: '🏁' },
  { key: 'track_wet',  label: 'Pista mojada',  icon: '🏁' },
  { key: 'road',       label: 'Carretera',     icon: '🛣️' },
  { key: 'offroad',    label: 'Offroad',       icon: '🌲' },
  { key: 'rain',       label: 'Lluvia',        icon: '🌧️' },
  { key: 'other',      label: 'Otro',          icon: '📍' },
]

export const VEHICLE_TYPE_ICONS: Record<string, string> = {
  car: '🚗', moto: '🏍️', van: '🚐', truck: '🚛', other: '🚙',
}
