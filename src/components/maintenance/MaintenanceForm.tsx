import { useState, type FormEvent } from 'react'
import { Input, Textarea } from '../ui/Input'
import { Button } from '../ui/Button'
import { ORDINARY_CATEGORIES, EXTRAORDINARY_CATEGORIES } from '../../lib/helpers'
import type { MaintenanceLog } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  vehicleId: string
  currentKm: number
  currentHours: number
  showHours?: boolean
  initialLog?: MaintenanceLog
  onSave: (payload: Partial<MaintenanceLog>) => Promise<void>
  onCancel: () => void
}

export function MaintenanceForm({ vehicleId: _vehicleId, currentKm, currentHours, showHours = true, initialLog, onSave, onCancel }: Props) {
  const [type, setType] = useState<'ordinary' | 'extraordinary'>(initialLog?.type ?? 'ordinary')
  const [loading, setLoading] = useState(false)

  const initCats = () => {
    if (!initialLog) return ['oil_change']
    return initialLog.category.split(',').map(s => s.trim()).filter(Boolean)
  }
  const [selectedCats, setSelectedCats] = useState<string[]>(initCats)

  const [form, setForm] = useState({
    title: initialLog?.title ?? '',
    description: initialLog?.description ?? '',
    date: initialLog?.date ?? new Date().toISOString().split('T')[0],
    km_at_service: initialLog?.km_at_service != null ? String(initialLog.km_at_service) : String(currentKm),
    hours_at_service: initialLog?.hours_at_service != null ? String(initialLog.hours_at_service) : String(currentHours),
    next_service_km: initialLog?.next_service_km != null ? String(initialLog.next_service_km) : '',
    next_service_hours: initialLog?.next_service_hours != null ? String(initialLog.next_service_hours) : '',
    next_service_date: initialLog?.next_service_date ?? '',
    cost: initialLog?.cost != null ? String(initialLog.cost) : '',
    workshop: initialLog?.workshop ?? '',
    parts_used: initialLog?.parts_used ?? '',
  })

  const categories = type === 'ordinary' ? ORDINARY_CATEGORIES : EXTRAORDINARY_CATEGORIES
  const isEdit = !!initialLog

  const toggleCat = (key: string) => {
    if (type === 'extraordinary') { setSelectedCats([key]); return }
    setSelectedCats((prev) => {
      if (prev.includes(key)) { const next = prev.filter(k => k !== key); return next.length === 0 ? prev : next }
      return [...prev, key]
    })
  }

  const switchType = (t: 'ordinary' | 'extraordinary') => {
    setType(t)
    setSelectedCats(t === 'ordinary' ? ['oil_change'] : ['tires'])
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const title = form.title.trim() || selectedCats
      .map((k) => categories.find((c) => c.key === k)?.label ?? k)
      .join(' + ')
    if (!form.date) { toast.error('Fecha obligatoria'); return }
    setLoading(true)
    try {
      await onSave({
        type,
        category: selectedCats.join(',') as MaintenanceLog['category'],
        title,
        description: form.description || null,
        date: form.date,
        km_at_service: form.km_at_service ? Number(form.km_at_service) : null,
        hours_at_service: showHours && form.hours_at_service ? Number(form.hours_at_service) : null,
        next_service_km: form.next_service_km ? Number(form.next_service_km) : null,
        next_service_hours: showHours && form.next_service_hours ? Number(form.next_service_hours) : null,
        next_service_date: form.next_service_date || null,
        cost: form.cost ? Number(form.cost) : null,
        workshop: form.workshop || null,
        parts_used: form.parts_used || null,
      })
      toast.success(isEdit ? 'Registro actualizado' : 'Registro guardado')
    } catch { toast.error('Error al guardar') } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <div className="flex gap-2 p-1 bg-garage-sand rounded-lg">
          {(['ordinary', 'extraordinary'] as const).map((t) => (
            <button key={t} type="button" onClick={() => switchType(t)}
              className={`flex-1 py-2 rounded-md text-sm font-body font-medium transition-colors ${type === t ? 'bg-white shadow text-garage-dark' : 'text-gray-500'}`}>
              {t === 'ordinary' ? 'Ordinario' : 'Extraordinario'}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="block text-xs font-body font-medium text-gray-600 mb-1">
          Categoria{type === 'ordinary' ? <span className="text-gray-400 font-normal"> (puedes seleccionar varias)</span> : ''}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => (
            <button key={c.key} type="button" onClick={() => toggleCat(c.key)}
              className={`p-2 rounded-lg border text-center text-xs font-body transition-colors ${selectedCats.includes(c.key) ? 'border-garage-orange bg-orange-50 text-garage-orange' : 'border-garage-sand bg-white text-gray-600'}`}>
              <div className="text-lg mb-0.5">{c.icon}</div>
              <div className="leading-tight">{c.label}</div>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Titulo (opcional)"
        value={form.title}
        onChange={set('title')}
        placeholder={selectedCats.map(k => categories.find(c => c.key === k)?.label ?? k).join(' + ')}
      />
      <Textarea label="Descripcion" value={form.description} onChange={set('description')} rows={2} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Fecha*" type="date" value={form.date} onChange={set('date')} required />
        <div />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Km en servicio" type="number" value={form.km_at_service} onChange={set('km_at_service')} />
        {showHours && <Input label="Horas en servicio" type="number" step="0.1" value={form.hours_at_service} onChange={set('hours_at_service')} />}
      </div>

      {type === 'ordinary' && (
        <div className="grid grid-cols-2 gap-3">
          <Input label="Proximo km" type="number" value={form.next_service_km} onChange={set('next_service_km')} />
          {showHours && <Input label="Proximas horas" type="number" step="0.1" value={form.next_service_hours} onChange={set('next_service_hours')} />}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input label="Coste (EUR)" type="number" step="0.01" value={form.cost} onChange={set('cost')} />
        <Input label="Taller" value={form.workshop} onChange={set('workshop')} />
      </div>
      <Input label="Piezas usadas" value={form.parts_used} onChange={set('parts_used')} />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1" loading={loading}>{isEdit ? 'Actualizar' : 'Guardar'}</Button>
      </div>
    </form>
  )
}
