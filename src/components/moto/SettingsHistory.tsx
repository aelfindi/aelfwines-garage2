import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, Copy } from 'lucide-react'
import type { MotoSettingsHistory } from '../../types'
import { ConditionBadge, StarRating } from '../ui/Badge'

interface Props {
  history: MotoSettingsHistory[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onDelete: (id: string) => Promise<void>
  onApply?: (snapshot: MotoSettingsHistory) => void
}

export function SettingsHistory({ history, selectedIds, onToggleSelect, onDelete, onApply }: Props) {
  if (history.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-8">Sin snapshots guardados</p>
  }

  return (
    <div className="space-y-3">
      {history.map((snap) => (
        <div key={snap.id} className="bg-white rounded-xl border border-garage-sand p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-garage-orange"
              checked={selectedIds.includes(snap.id)}
              onChange={() => onToggleSelect(snap.id)}
              aria-label={`Seleccionar ${snap.label}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-body font-medium text-sm text-garage-dark truncate">{snap.label}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onApply && (
                    <button
                      onClick={() => onApply(snap)}
                      className="p-1 rounded hover:bg-garage-sand text-garage-steel"
                      aria-label="Aplicar setup"
                      title="Aplicar como configuracion activa"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(snap.id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
                <span>{format(new Date(snap.date), 'dd/MM/yyyy', { locale: es })}</span>
                <ConditionBadge condition={snap.condition} />
                {snap.feeling_rating && <StarRating rating={snap.feeling_rating} />}
              </div>
              {snap.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{snap.notes}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
