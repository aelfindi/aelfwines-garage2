import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { SessionNote } from '../../types'
import { ConditionBadge, StarRating } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

interface Props {
  note: SessionNote
  onDelete?: (id: string) => Promise<void>
}

export function SessionNoteItem({ note, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const kmTraveled = note.km_start != null && note.km_end != null ? note.km_end - note.km_start : null

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete(note.id) } finally { setDeleting(false); setConfirmDelete(false) }
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-body font-medium text-sm text-garage-dark">{note.title}</p>
            {note.location && <p className="text-xs text-gray-500">{note.location}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-xs text-gray-400">{format(new Date(note.date), 'dd/MM/yyyy', { locale: es })}</span>
            {onDelete && (
              <button onClick={() => setConfirmDelete(true)} className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500" aria-label="Eliminar">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ConditionBadge condition={note.condition} />
          {note.feeling_rating && <StarRating rating={note.feeling_rating} />}
          {kmTraveled != null && <span className="text-xs text-gray-500">{kmTraveled.toLocaleString('es-ES')} km</span>}
        </div>
        {note.content && <p className="text-xs text-gray-600 line-clamp-3">{note.content}</p>}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar sesion" size="sm">
        <p className="text-sm text-gray-600 mb-4">Se eliminara esta nota de sesion.</p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" className="flex-1" loading={deleting} onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </>
  )
}
