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
  showHours?: boolean
  ordinaryLogs: MaintenanceLogType[]
  extraordinaryLogs: MaintenanceLogType[]
  onAdd: (payload: Partial<MaintenanceLogType>) => Promise<MaintenanceLogType | void>
  onUpdate: (id: string, payload: Partial<MaintenanceLogType>) => Promise<unknown>
  onDelete: (id: string) => Promise<void>
  onUploadInvoice: (logId: string, kind: 'workshop' | 'parts', file: File) => Promise<MaintenanceLogType>
  onDeleteInvoice: (logId: string, kind: 'workshop' | 'parts') => Promise<MaintenanceLogType>
}

export function MaintenanceLog({
  vehicleId, currentKm, currentHours, showHours = true,
  ordinaryLogs, extraordinaryLogs,
  onAdd, onUpdate, onDelete, onUploadInvoice, onDeleteInvoice,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [editingLog, setEditingLog] = useState<MaintenanceLogType | null>(null)

  const handleAdd = async (payload: Partial<MaintenanceLogType>, files?: { workshop?: File | null; parts?: File | null }) => {
    const log = await onAdd(payload)
    if (log && files) {
      if (files.workshop) await onUploadInvoice(log.id, 'workshop', files.workshop)
      if (files.parts) await onUploadInvoice(log.id, 'parts', files.parts)
    }
    setAdding(false)
  }

  const handleUpdate = async (payload: Partial<MaintenanceLogType>, files?: { workshop?: File | null; parts?: File | null }) => {
    if (!editingLog) return
    await onUpdate(editingLog.id, payload)
    if (files) {
      if (files.workshop) await onUploadInvoice(editingLog.id, 'workshop', files.workshop)
      if (files.parts) await onUploadInvoice(editingLog.id, 'parts', files.parts)
    }
    setEditingLog(null)
  }

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus size={16} /> Anadir registro
          </Button>
        </div>

        <section className="space-y-3">
          <h3 className="font-display font-semibold text-base text-garage-dark">Mantenimiento ordinario</h3>
          {ordinaryLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs bg-garage-cream rounded-xl border border-garage-sand">
              Sin registros ordinarios
            </div>
          ) : (
            <div className="space-y-3">
              {ordinaryLogs.map((log) => (
                <MaintenanceItem
                  key={log.id}
                  log={log}
                  onEdit={setEditingLog}
                  onDelete={onDelete}
                  onDeleteInvoice={onDeleteInvoice}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="font-display font-semibold text-base text-garage-dark">Mantenimiento extraordinario</h3>
          {extraordinaryLogs.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs bg-garage-cream rounded-xl border border-garage-sand">
              Sin registros extraordinarios
            </div>
          ) : (
            <div className="space-y-3">
              {extraordinaryLogs.map((log) => (
                <MaintenanceItem
                  key={log.id}
                  log={log}
                  onEdit={setEditingLog}
                  onDelete={onDelete}
                  onDeleteInvoice={onDeleteInvoice}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Nuevo registro" size="lg">
        <MaintenanceForm
          vehicleId={vehicleId}
          currentKm={currentKm}
          currentHours={currentHours}
          showHours={showHours}
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal open={!!editingLog} onClose={() => setEditingLog(null)} title="Editar registro" size="lg">
        {editingLog && (
          <MaintenanceForm
            vehicleId={vehicleId}
            currentKm={currentKm}
            currentHours={currentHours}
            showHours={showHours}
            initialLog={editingLog}
            onSave={handleUpdate}
            onCancel={() => setEditingLog(null)}
            onDeleteInvoice={(kind) => onDeleteInvoice(editingLog.id, kind)}
          />
        )}
      </Modal>
    </>
  )
}
