import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { History, SlidersHorizontal } from 'lucide-react'
import { useAppStore } from '../store'
import { useMotoSettings } from '../hooks/useMotoSettings'
import { Header } from '../components/layout/Header'
import { CarburetionSettings } from '../components/moto/CarburetionSettings'
import { SuspensionSettings } from '../components/moto/SuspensionSettings'
import { SettingsHistory } from '../components/moto/SettingsHistory'
import { SettingsComparator } from '../components/moto/SettingsComparator'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Select } from '../components/ui/Input'
import { PageSpinner } from '../components/ui/Spinner'
import { CONDITIONS } from '../lib/helpers'
import type { MotoSettings as MotoSettingsType, MotoSettingsHistory, Condition } from '../types'
import toast from 'react-hot-toast'

type Tab = 'active' | 'history'
type Section = 'carburation' | 'suspension'

export function MotoSettings() {
  const { id } = useParams<{ id: string }>()
  const vehicles = useAppStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === id)
  const { settings, history, loading, saveSettings, saveSnapshot, deleteSnapshot } = useMotoSettings(id!)
  const [tab, setTab] = useState<Tab>('active')
  const [openSection, setOpenSection] = useState<Section>('carburation')
  const [savingSettings, setSavingSettings] = useState(false)
  const [snapshotModal, setSnapshotModal] = useState(false)
  const [compareModal, setCompareModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [form, setForm] = useState<Partial<MotoSettingsType>>(settings ?? {})
  const settingsLoaded = useRef(false)
  useEffect(() => {
    if (settings && !settingsLoaded.current) {
      setForm(settings)
      settingsLoaded.current = true
    }
  }, [settings])
  const [snapshotForm, setSnapshotForm] = useState({ label: '', condition: 'track_dry' as Condition, rating: '4', notes: '' })

  const handleChange = (key: keyof MotoSettingsType, value: string | number | null) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSave = async () => {
    setSavingSettings(true)
    try { await saveSettings(form); toast.success('Configuracion guardada') }
    catch { toast.error('Error al guardar') } finally { setSavingSettings(false) }
  }

  const handleSnapshot = async () => {
    if (!snapshotForm.label) { toast.error('Pon un nombre al snapshot'); return }
    try {
      await saveSnapshot(snapshotForm.label, snapshotForm.condition, Number(snapshotForm.rating), snapshotForm.notes)
      toast.success('Snapshot guardado')
      setSnapshotModal(false)
      setSnapshotForm({ label: '', condition: 'track_dry', rating: '4', notes: '' })
    } catch { toast.error('Error al guardar snapshot') }
  }

  const handleApply = (snap: MotoSettingsHistory) => {
    setForm({ ...snap })
    setTab('active')
    toast.success('Setup cargado — guarda para aplicar')
  }

  const toggleSelect = (id: string) =>
    setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : s.length < 2 ? [...s, id] : [s[1], id])

  const selectedSnapshots = history.filter((h) => selectedIds.includes(h.id))

  if (!vehicle) return loading ? <PageSpinner /> : null

  return (
    <>
      <Header title="Setup moto" subtitle={vehicle.name} back />

      <div className="sticky top-[57px] z-20 bg-white border-b border-garage-sand">
        <div className="flex px-4">
          {(['active', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-body font-medium border-b-2 transition-colors ${tab === t ? 'border-garage-orange text-garage-orange' : 'border-transparent text-gray-500'}`}
            >
              {t === 'active' ? <span className="flex items-center justify-center gap-1"><SlidersHorizontal size={15} /> Activo</span> : <span className="flex items-center justify-center gap-1"><History size={15} /> Historial</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {tab === 'active' && (
          <>
            <button
              className="w-full flex items-center justify-between py-3 border-b border-garage-sand font-display font-semibold text-base text-garage-dark"
              onClick={() => setOpenSection(openSection === 'carburation' ? 'suspension' : 'carburation')}
            >
              Carburacion / Inyeccion
              <span className="text-gray-400">{openSection === 'carburation' ? '▲' : '▼'}</span>
            </button>
            {openSection === 'carburation' && <CarburetionSettings values={form} onChange={handleChange} />}

            <button
              className="w-full flex items-center justify-between py-3 border-b border-garage-sand font-display font-semibold text-base text-garage-dark"
              onClick={() => setOpenSection(openSection === 'suspension' ? 'carburation' : 'suspension')}
            >
              Suspension
              <span className="text-gray-400">{openSection === 'suspension' ? '▲' : '▼'}</span>
            </button>
            {openSection === 'suspension' && <SuspensionSettings values={form} onChange={handleChange} />}

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSnapshotModal(true)}>
                Guardar snapshot
              </Button>
              <Button className="flex-1" loading={savingSettings} onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            {selectedIds.length === 2 && (
              <Button className="w-full" onClick={() => setCompareModal(true)}>
                Comparar seleccionados
              </Button>
            )}
            {selectedIds.length === 1 && (
              <p className="text-xs text-gray-500 text-center">Selecciona otro setup para comparar</p>
            )}
            <SettingsHistory
              history={history}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onDelete={deleteSnapshot}
              onApply={handleApply}
            />
          </>
        )}
      </div>

      <Modal open={snapshotModal} onClose={() => setSnapshotModal(false)} title="Guardar snapshot">
        <div className="space-y-4">
          <Input label="Nombre*" value={snapshotForm.label} onChange={(e) => setSnapshotForm((f) => ({ ...f, label: e.target.value }))} placeholder='ej: Circuito de Jerez - Seco' />
          <div>
            <label className="block text-xs font-body font-medium text-gray-600 mb-1">Condicion</label>
            <Select value={snapshotForm.condition} onChange={(e) => setSnapshotForm((f) => ({ ...f, condition: e.target.value as Condition }))}>
              {CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.icon} {c.label}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-body font-medium text-gray-600 mb-1">Valoracion (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n} type="button"
                  onClick={() => setSnapshotForm((f) => ({ ...f, rating: String(n) }))}
                  className={`flex-1 py-2 rounded-lg text-lg transition-colors ${Number(snapshotForm.rating) >= n ? 'text-garage-orange' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <Textarea label="Notas" value={snapshotForm.notes} onChange={(e) => setSnapshotForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setSnapshotModal(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSnapshot}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={compareModal} onClose={() => setCompareModal(false)} title="Comparar setups" size="lg">
        {selectedSnapshots.length === 2 && (
          <SettingsComparator a={selectedSnapshots[0]} b={selectedSnapshots[1]} />
        )}
      </Modal>
    </>
  )
}
