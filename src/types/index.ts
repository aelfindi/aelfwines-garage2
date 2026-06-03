export type VehicleType = 'car' | 'moto' | 'van' | 'truck' | 'other'

export type MaintenanceType = 'ordinary' | 'extraordinary'

export type OrdinaryCategory =
  | 'oil_change' | 'brake_fluid' | 'coolant' | 'air_filter'
  | 'fuel_filter' | 'spark_plugs' | 'timing_belt' | 'gearbox_oil'
  | 'differential_oil' | 'other'

export type ExtraordinaryCategory =
  | 'tires' | 'brake_pads' | 'brake_discs' | 'battery' | 'clutch'
  | 'suspension' | 'exhaust' | 'bodywork' | 'electrical' | 'other'

export type Condition =
  | 'track_dry' | 'track_wet' | 'road' | 'offroad' | 'rain' | 'other'

export type MaintenanceStatus = 'ok' | 'due_soon' | 'overdue'

export interface Vehicle {
  id: string
  user_id: string
  name: string
  type: VehicleType
  brand: string | null
  model: string
  year: number | null
  license_plate: string | null
  engine: string | null
  oil_type: string | null
  oil_quantity: number | null
  maintenance_interval_km: number | null
  maintenance_interval_hours: number | null
  current_km: number
  current_hours: number
  photo_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MaintenanceLog {
  id: string
  vehicle_id: string
  user_id: string
  type: MaintenanceType
  category: OrdinaryCategory | ExtraordinaryCategory
  title: string
  description: string | null
  date: string
  km_at_service: number | null
  hours_at_service: number | null
  next_service_km: number | null
  next_service_hours: number | null
  next_service_date: string | null
  cost: number | null
  workshop: string | null
  parts_used: string | null
  created_at: string
}

export interface MotoSettings {
  id: string
  vehicle_id: string
  user_id: string
  main_jet: string | null
  pilot_jet: string | null
  needle_clip: number | null
  air_screw: number | null
  fuel_mixture: string | null
  fork_preload: number | null
  fork_compression: number | null
  fork_rebound: number | null
  fork_oil_level: number | null
  fork_oil_type: string | null
  shock_preload: number | null
  shock_compression_high: number | null
  shock_compression_low: number | null
  shock_rebound: number | null
  setting_notes: string | null
  updated_at: string
}

export interface MotoSettingsHistory {
  id: string
  vehicle_id: string
  user_id: string
  label: string
  date: string
  condition: Condition
  main_jet: string | null
  pilot_jet: string | null
  needle_clip: number | null
  air_screw: number | null
  fuel_mixture: string | null
  fork_preload: number | null
  fork_compression: number | null
  fork_rebound: number | null
  fork_oil_level: number | null
  fork_oil_type: string | null
  shock_preload: number | null
  shock_compression_high: number | null
  shock_compression_low: number | null
  shock_rebound: number | null
  feeling_rating: number | null
  notes: string | null
  created_at: string
}

export interface SessionNote {
  id: string
  vehicle_id: string
  user_id: string
  date: string
  location: string | null
  condition: Condition
  km_start: number | null
  km_end: number | null
  setting_id: string | null
  title: string
  content: string | null
  feeling_rating: number | null
  created_at: string
}

export interface SettingsDiff {
  [field: string]: { a: unknown; b: unknown; changed: boolean }
}
