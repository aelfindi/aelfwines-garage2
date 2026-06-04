import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QrCode, FileText, Settings2, Pencil } from 'lucide-react'
import { useAppStore } from '../store'
import { useVehicles } from '../hooks/useVehicles'
import { useMaintenance } from '../hooks/useMaintenance'
import { Header } from '../components/layout/Header'
import { MaintenanceLog } from '../components/maintenance/MaintenanceLog'
import { IntervalCalc } from '../components/ui/IntervalCalc'
import { StatusBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { getMaintenanceStatus, formatKm, VEHICLE_TYPE_ICONS } from '../lib/helpers'
import { DocumentsSection } from '../components/vehicles/DocumentsSection'
import type { MaintenanceLog as MaintenanceLogType, Vehicle } from '../types'
import toast from 'react-hot-toast'

type Tab = 'summary' | 'ordinary' | 'extraordinary' | 'settings'

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('summary')
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const { updateVehicle } = useVehicles()
  const vehicles = useAppStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === id)
  const { ordinaryLogs, extraordinaryLogs, lastOrdinary, loading, createLog, deleteLog } = useMaintenance(id!)

  const [editForm, setEditForm] = useState<Partial<Vehicle>>({})

  const openEdit = () => {
    if (!vehicle) return
    setEditForm({
      name: vehicle.name,
      brand: vehicle.brand ?? '',
      model: vehicle.model,
      year: vehicle.year ?? undefined,
      license_plate: vehicle.license_plate ?? '',
      engine: vehicle.engine ?? '',
      oil_type: vehicle.oil_type ?? '',
      oil_quantity: vehicle.oil_quantity ?? undefined,
      maintenance_interval_km: vehicle.maintenance_interval_km ?? undefined,
      maintenance_interval_hours: vehicle.maintenance_interval_hours ?? undefined,
      current_km: vehicle.current_km,
      notes: vehicle.notes ?? '',
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateVehicle(id!, {
        name: editForm.name,
        brand: editForm.brand || null,
        model: editForm.model,
        year: editForm.year ? Number(editForm.year) : null,
        license_plate: String(editForm.license_plate || '').trim() || null,
        engine: String(editForm.engine || '').trim() || null,
        oil_type: String(editForm.oil_type || '').trim() || null,
        oil_quantity: editForm.oil_quantity ? Number(editForm.oil_quantity) : null,
        maintenance_interval_km: editForm.maintenance_interval_km ? Number(editForm.maintenance_interval_km) : null,
        maintenance_interval_hours: editForm.maintenance_interval_hours ? Number(editForm.maintenance_interval_hours) : null,
        current_km: editForm.current_km ? Number(editForm.current_km) : 0,
        current_hours: editForm.current_hours ? Number(editForm.current_hours) : 0,
        notes: String(editForm.notes || '').trim() || null,
      })
      toast.success('Vehiculo actualizado')
      setEditOpen(false)
    } catch { toast.error('Error al guardar') } finally { setSaving(false) }
  }

  if (!vehicle) return loading ? <PageSpinner /> : <div className="p-4 text-sm text-gray-500">Vehiculo no encontrado</div>

  const status = getMaintenanceStatus(vehicle, lastOrdinary)
  const isMoto = vehicle.type === 'moto'
  const icon = VEHICLE_TYPE_ICONS[vehicle.type] ?? '🚙'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Resumen' },
    { key: 'ordinary', label: 'Ordinario' },
    { key: 'extraordinary', label: 'Extraordinario' },
    ...(isMoto ? [{ key: 'settings' as Tab, label: 'Setup' }] : []),
  ]

  const handleAdd = async (payload: Partial<MaintenanceLogType>) => {
    await createLog(payload)
    const updates: Partial<Vehicle> = {}
    if (payload.km_at_service && payload.km_at_service > vehicle.current_km)
      updates.current_km = payload.km_at_service
    if (payload.hours_at_service && payload.hours_at_service > vehicle.current_hours)
      updates.current_hours = payload.hours_at_service
    if (Object.keys(updates).length > 0) {
      try { await updateVehicle(vehicle.id, updates) } catch { /* silent */ }
    }
    toast.success('Registro anadido')
  }

  return (
    <>
      <Header
        title={vehicle.name}
        subtitle={[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' · ')}
        back
        action={
          <div className="flex gap-1">
            <button onClick={openEdit} className="p-2 rounded-full hover:bg-garage-sand text-gray-500" aria-label="Editar vehiculo">
              <Pencil size={20} />
            </button>
            {isMoto && (
              <button onClick={() => navigate(`/vehicles/${id}/settings`)} className="p-2 rounded-full hover:bg-garage-sand text-gray-500" aria-label="Settings moto">
                <Settings2 size={20} />
              </button>
            )}
            <button onClick={() => navigate(`/vehicles/${id}/qr`)} className="p-2 rounded-full hover:bg-garage-sand text-gray-500" aria-label="QR">
              <QrCode size={20} />
            </button>
            <button onClick={() => navigate(`/vehicles/${id}/export`)} className="p-2 rounded-full hover:bg-garage-sand text-gray-500" aria-label="Exportar PDF">
              <FileText size={20} />
            </button>
          </div>
        }
      />

      <div className="sticky top-[57px] z-20 bg-white border-b border-garage-sand">
        <div className="flex overflow-x-auto px-4 gap-0 scrollbar-none">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-body font-medium border-b-2 transition-colors ${tab === key ? 'border-garage-orange text-garage-orange' : 'border-transparent text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5">
        {tab === 'summary' && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              {vehicle.photo_url ? (
                <img src={vehicle.photo_url} alt={vehicle.name} className="w-24 h-20 object-cover rounded-xl flex-shrink-0" />
              ) : (
                <div className="w-24 h-20 bg-garage-sand rounded-xl flex items-center justify-center text-4xl flex-shrink-0">{icon}</div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-semibold text-xl text-garage-dark">{formatKm(vehicle.current_km)}</span>
                  {vehicle.current_hours > 0 && (
                    <span className="font-display font-semibold text-xl text-garage-steel">{vehicle.current_hours} h</span>
                  )}
                  <StatusBadge status={status} />
                </div>
                {vehicle.engine && <p className="text-sm text-gray-600">{vehicle.engine}</p>}
                {vehicle.oil_type && <p className="text-xs text-gray-500">{vehicle.oil_type}{vehicle.oil_quantity ? ` · ${vehicle.oil_quantity}L` : ''}</p>}
                {vehicle.license_plate && <p className="text-xs text-gray-500">{vehicle.license_plate}</p>}
              </div>
            </div>

            <IntervalCalc vehicle={vehicle} lastLog={lastOrdinary} />

            {vehicle.notes && (
              <div className="bg-white rounded-xl border border-garage-sand p-4">
                <p className="text-sm text-gray-600">{vehicle.notes}</p>
              </div>
            )}

            <DocumentsSection vehicleId={id!} />

            {isMoto && (
              <Button variant="secondary" onClick={() => navigate(`/vehicles/${id}/sessions`)}>
                Notas de sesion
              </Button>
            )}
          </div>
        )}

        {tab === 'ordinary' && (
          <MaintenanceLog
            vehicleId={id!} currentKm={vehicle.current_km}
            logs={ordinaryLogs} type="ordinary" currentHours={vehicle.current_hours}
            onAdd={handleAdd} onDelete={deleteLog}
          />
        )}

        {tab === 'extraordinary' && (
          <MaintenanceLog
            vehicleId={id!} currentKm={vehicle.current_km}
            logs={extraordinaryLogs} type="extraordinary" currentHours={vehicle.current_hours}
            onAdd={handleAdd} onDelete={deleteLog}
          />
        )}

        {tab === 'settings' && isMoto && (
          <Button onClick={() => navigate(`/vehicles/${id}/settings`)}>
            Ver configuracion de moto
          </Button>
        )}
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar vehiculo" size="lg">
        <div className="space-y-4">
          <Input label="Nombre / alias" value={String(editForm.name ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marca" value={String(editForm.brand ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))} />
            <Input label="Modelo" value={String(editForm.model ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ano" type="number" value={String(editForm.year ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, year: Number(e.target.value) || undefined }))} />
            <Input label="Matricula" value={String(editForm.license_plate ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, license_plate: e.target.value }))} />
          </div>
          <Input label="Motorizacion" value={String(editForm.engine ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, engine: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tipo de aceite" value={String(editForm.oil_type ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, oil_type: e.target.value }))} />
            <Input label="Cantidad aceite (L)" type="number" step="0.1" value={String(editForm.oil_quantity ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, oil_quantity: Number(e.target.value) || undefined }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Intervalo (km)" type="number" value={String(editForm.maintenance_interval_km ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, maintenance_interval_km: Number(e.target.value) || undefined }))} />
            <Input label="Intervalo (horas)" type="number" value={String(editForm.maintenance_interval_hours ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, maintenance_interval_hours: Number(e.target.value) || undefined }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Km actuales" type="number" value={String(editForm.current_km ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, current_km: Number(e.target.value) }))} />
            <Input label="Horas totales" type="number" step="0.1" value={String(editForm.current_hours ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, current_hours: Number(e.target.value) }))} />
          </div>
          <Textarea label="Notas" value={String(editForm.notes ?? '')} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          <div className="flex gap-3 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
