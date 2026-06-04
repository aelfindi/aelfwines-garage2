import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { MaintenanceLog } from '../../types'
import { ORDINARY_CATEGORIES, EXTRAORDINARY_CATEGORIES, formatKm, formatCost } from '../../lib/helpers'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface Props {
  log: MaintenanceLog
  onDelete?: (id: string) => Promise<void>
  onEdit?: (log: MaintenanceLog) => void
}

function getCategoryLabels(type: string, category: string) {
  const list = type === 'ordinary' ? ORDINARY_CATEGORIES : EXTRAORDINARY_CATEGORIES
  return category.split(',').map((k) => list.find((c) => c.key === k.trim()) ?? { label: k.trim(), icon: '🔧' })
}

export function MaintenanceItem({ log, onDelete, onEdit }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const cats = getCategoryLabels(log.type, log.category)

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(log.id) } finally { setDeleting(false); setConfirmDelete(false) }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{cats[0].icon}</span>
            <div>
              <p className="font-body font-medium text-sm text-garage-dark">{log.title}</p>
              <p className="text-xs text-gray-500">{cats.map((c) => c.label).join(' + ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{format(new Date(log.date), 'dd/MM/yyyy', { locale: es })}</span>
            {onEdit && (
              <button
                onClick={() => onEdit(log)}
                className="p-1 rounded-full hover:bg-garage-sand text-gray-400 hover:text-garage-steel"
                aria-label="Editar"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
                aria-label="Eliminar"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          {log.km_at_service != null && <span>{formatKm(log.km_at_service)}</span>}
          {log.hours_at_service != null && <span>{log.hours_at_service} h</span>}
          {log.cost != null && <span>{formatCost(log.cost)}</span>}
          {log.workshop && <span>{log.workshop}</span>}
        </div>

        {log.description && <p className="text-xs text-gray-600">{log.description}</p>}

        {(log.next_service_km != null || log.next_service_hours != null || log.next_service_date) && (
          <div className="text-xs text-garage-steel font-body flex flex-wrap gap-x-3">
            <span className="font-medium">Proximo:</span>
            {log.next_service_km != null && <span>{formatKm(log.next_service_km)}</span>}
            {log.next_service_hours != null && <span>{log.next_service_hours} h</span>}
            {log.next_service_date && <span>{format(new Date(log.next_service_date), 'dd/MM/yyyy', { locale: es })}</span>}
          </div>
        )}

        {log.parts_used && <p className="text-xs text-gray-500">Piezas: {log.parts_used}</p>}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar registro" size="sm">
        <p className="text-sm text-gray-600 mb-4">Se eliminara este registro de mantenimiento.</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
