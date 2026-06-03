import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { MaintenanceLog as MaintenanceLogType } from '../../types'
import { MaintenanceItem } from './MaintenanceItem'
import { Modal } from '../ui/Modal'
import { MaintenanceForm } from './MaintenanceForm'
import { Button } from '../ui/Button'

interface Props {
  vehicleId: string
  currentKm: number
  currentHours: number
  logs: MaintenanceLogType[]
  type: 'ordinary' | 'extraordinary'
  onAdd: (payload: Partial<MaintenanceLogType>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function MaintenanceLog({ vehicleId, currentKm, currentHours, logs, type, onAdd, onDelete }: Props) {
  const [adding, setAdding] = useState(false)

  const handleAdd = async (payload: Partial<MaintenanceLogType>) => {
    await onAdd({ ...payload, type })
    setAdding(false)
  }

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-base text-garage-dark">
            {type === 'ordinary' ? 'Mantenimiento ordinario' : 'Mantenimiento extraordinario'}
          </h3>
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={16} /> Anadir
          </Button>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Sin registros aun</div>
        ) : (
          logs.map((log) => <MaintenanceItem key={log.id} log={log} onDelete={onDelete} />)
        )}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Nuevo registro">
        <MaintenanceForm
          vehicleId={vehicleId}
          currentKm={currentKm}
          currentHours={currentHours}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </>
  )
}
