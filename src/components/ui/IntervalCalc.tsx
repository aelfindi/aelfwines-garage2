import type { Vehicle, MaintenanceLog } from '../../types'

interface Props {
  vehicle: Vehicle
  lastLog: MaintenanceLog | null
}

export function IntervalCalc({ vehicle, lastLog }: Props) {
  if (!lastLog) return null

  const kmSince = vehicle.current_km - (lastLog.km_at_service ?? 0)
  const hoursSince = vehicle.current_hours - (lastLog.hours_at_service ?? 0)
  const kmInterval = vehicle.maintenance_interval_km
  const hoursInterval = vehicle.maintenance_interval_hours

  const kmPct = kmInterval ? Math.min((kmSince / kmInterval) * 100, 100) : null
  const hoursPct = hoursInterval ? Math.min((hoursSince / hoursInterval) * 100, 100) : null

  function barColor(pct: number) {
    if (pct >= 100) return 'bg-red-500'
    if (pct >= 85) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-3 text-sm font-body">
      {kmInterval && kmPct !== null && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{kmSince.toLocaleString('es-ES')} km desde servicio</span>
            <span>{Math.max(0, kmInterval - kmSince).toLocaleString('es-ES')} km restantes</span>
          </div>
          <div className="h-2 bg-garage-sand rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(kmPct)}`} style={{ width: `${kmPct}%` }} />
          </div>
        </div>
      )}
      {hoursInterval && hoursPct !== null && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{hoursSince.toFixed(1)} h desde servicio</span>
            <span>{Math.max(0, hoursInterval - hoursSince).toFixed(1)} h restantes</span>
          </div>
          <div className="h-2 bg-garage-sand rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor(hoursPct)}`} style={{ width: `${hoursPct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
