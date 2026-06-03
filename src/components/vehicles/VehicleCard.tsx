import { MoreVertical, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { Vehicle } from '../../types'
import { StatusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { formatKm, VEHICLE_TYPE_ICONS } from '../../lib/helpers'
import { getMaintenanceStatus } from '../../lib/helpers'
import type { MaintenanceLog } from '../../types'

interface Props {
  vehicle: Vehicle
  lastLog: MaintenanceLog | null
  onDelete: (id: string) => Promise<void>
}

export function VehicleCard({ vehicle, lastLog, onDelete }: Props) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const status = getMaintenanceStatus(vehicle, lastLog)
  const icon = VEHICLE_TYPE_ICONS[vehicle.type] ?? '🚙'

  const handleDelete = async () => {
    setDeleting(true)
    try { await onDelete(vehicle.id) } finally { setDeleting(false); setConfirmDelete(false) }
  }

  return (
    <>
      <div
        className="bg-white rounded-xl border border-garage-sand shadow-sm p-4 cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => navigate(`/vehicles/${vehicle.id}`)}
      >
        <div className="flex items-start gap-3">
          {vehicle.photo_url ? (
            <img src={vehicle.photo_url} alt={vehicle.name} className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-16 h-12 bg-garage-sand rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-semibold text-base text-garage-dark truncate">{vehicle.name}</h3>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(true) }}
                className="p-1 rounded-full hover:bg-garage-sand text-gray-400 flex-shrink-0"
                aria-label="Opciones"
              >
                <MoreVertical size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 truncate">{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' · ')}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-body font-medium text-garage-dark">{formatKm(vehicle.current_km)}</span>
              <StatusBadge status={status} />
            </div>
          </div>
        </div>
      </div>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} size="sm">
        <div className="space-y-2">
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 hover:bg-red-50 font-body"
            onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
          >
            <Trash2 size={18} /> Eliminar vehiculo
          </button>
        </div>
      </Modal>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar vehiculo" size="sm">
        <p className="text-sm text-gray-600 mb-4">Se eliminara el vehiculo y todo su historial. Esta accion no se puede deshacer.</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
