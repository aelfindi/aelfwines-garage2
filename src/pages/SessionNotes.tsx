import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAppStore } from '../store'
import { useMotoSettings } from '../hooks/useMotoSettings'
import { Header } from '../components/layout/Header'
import { SessionNoteItem } from '../components/moto/SessionNoteItem'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'
import { CONDITIONS } from '../lib/helpers'
import type { SessionNote, Condition } from '../types'
import toast from 'react-hot-toast'

export function SessionNotes() {
  const { id } = useParams<{ id: string }>()
  const vehicles = useAppStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === id)
  const { sessions, history, loading, createSession, deleteSession } = useMotoSettings(id!)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    title: '', date: new Date().toISOString().split('T')[0],
    location: '', condition: 'track_dry' as Condition,
    km_start: '', km_end: '', setting_id: '',
    content: '', feeling_rating: '4',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSave = async () => {
    if (!form.title) { toast.error('El titulo es obligatorio'); return }
    try {
      await createSession({
        title: form.title, date: form.date,
        location: form.location || null,
        condition: form.condition,
        km_start: form.km_start ? Number(form.km_start) : null,
        km_end: form.km_end ? Number(form.km_end) : null,
        setting_id: form.setting_id || null,
        content: form.content || null,
        feeling_rating: form.feeling_rating ? Number(form.feeling_rating) : null,
      } as Partial<SessionNote>)
      toast.success('Sesion guardada')
      setAdding(false)
      setForm({ title: '', date: new Date().toISOString().split('T')[0], location: '', condition: 'track_dry', km_start: '', km_end: '', setting_id: '', content: '', feeling_rating: '4' })
    } catch { toast.error('Error al guardar') }
  }

  if (!vehicle) return loading ? <PageSpinner /> : null

  return (
    <>
      <Header title="Notas de sesion" subtitle={vehicle.name} back />
      <div className="px-4 py-5 space-y-4">
        {sessions.length === 0 && !loading && (
          <p className="text-center text-sm text-gray-400 py-12">Sin sesiones registradas</p>
        )}
        {sessions.map((s) => (
          <SessionNoteItem key={s.id} note={s} onDelete={deleteSession} />
        ))}
      </div>

      <button
        onClick={() => setAdding(true)}
        className="fixed bottom-20 sm:bottom-6 right-4 w-14 h-14 rounded-full bg-garage-orange text-white shadow-lg flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all"
        aria-label="Nueva sesion"
      >
        <Plus size={24} />
      </button>

      <Modal open={adding} onClose={() => setAdding(false)} title="Nueva sesion">
        <div className="space-y-4">
          <Input label="Titulo*" value={form.title} onChange={set('title')} placeholder='ej: Test dia de pista' />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha" type="date" value={form.date} onChange={set('date')} />
            <Input label="Lugar" value={form.location} onChange={set('location')} placeholder='Circuito Jerez' />
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-gray-600 mb-1">Condicion</label>
            <Select value={form.condition} onChange={set('condition')}>
              {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Km inicio" type="number" value={form.km_start} onChange={set('km_start')} />
            <Input label="Km final" type="number" value={form.km_end} onChange={set('km_end')} />
          </div>
          {history.length > 0 && (
            <div>
              <label className="block text-xs font-body font-medium text-gray-600 mb-1">Setup asociado (opcional)</label>
              <Select value={form.setting_id} onChange={set('setting_id')}>
                <option value="">Sin setup</option>
                {history.map((h) => <option key={h.id} value={h.id}>{h.label} ({h.date})</option>)}
              </Select>
            </div>
          )}
          <Textarea label="Notas libres" value={form.content} onChange={set('content')} rows={4} placeholder='Sensaciones, problemas, mejoras...' />
          <div>
            <label className="block text-xs font-body font-medium text-gray-600 mb-1">Valoracion</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setForm((f) => ({ ...f, feeling_rating: String(n) }))}
                  className={`flex-1 py-2 rounded-lg text-xl transition-colors ${Number(form.feeling_rating) >= n ? 'text-garage-orange' : 'text-gray-300'}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
