import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAppStore } from '../store'
import { useMaintenance } from '../hooks/useMaintenance'
import { useMotoSettings } from '../hooks/useMotoSettings'
import { Header } from '../components/layout/Header'
import { ExportButton } from '../components/export/ExportButton'
import { Input } from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'

export function VehicleExport() {
  const { id } = useParams<{ id: string }>()
  const vehicles = useAppStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === id)
  const { ordinaryLogs, extraordinaryLogs } = useMaintenance(id!)
  const { history, sessions } = useMotoSettings(id!)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const isMoto = vehicle?.type === 'moto'

  if (!vehicle) return <PageSpinner />

  const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : null

  return (
    <>
      <Header title="Exportar PDF" subtitle={vehicle.name} back />
      <div className="px-4 py-5 space-y-6">
        <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-3">
          <h3 className="font-display font-semibold text-base">Contenido del PDF</h3>
          {['Ficha tecnica del vehiculo', 'Historial mantenimiento ordinario', 'Historial mantenimiento extraordinario',
            ...(isMoto ? ['Setups suspension/carburacion', 'Notas de sesion'] : [])].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span> {item}
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-display font-semibold text-base mb-3">Filtro de fechas (opcional)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Desde" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="Hasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <ExportButton
          vehicle={vehicle}
          ordinaryLogs={ordinaryLogs}
          extraordinaryLogs={extraordinaryLogs}
          motoHistory={isMoto ? history : undefined}
          sessions={isMoto ? sessions : undefined}
          dateRange={dateRange}
        />
      </div>
    </>
  )
}
