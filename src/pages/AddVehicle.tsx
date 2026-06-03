import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { useVehicles } from '../hooks/useVehicles'
import type { VehicleType } from '../types'
import { VEHICLE_TYPE_ICONS } from '../lib/helpers'
import toast from 'react-hot-toast'

const VEHICLE_TYPES: { key: VehicleType; label: string }[] = [
  { key: 'car', label: 'Coche' },
  { key: 'moto', label: 'Moto' },
  { key: 'van', label: 'Furgoneta' },
  { key: 'truck', label: 'Camion' },
  { key: 'other', label: 'Otro' },
]

type Step = 1 | 2 | 3

export function AddVehicle() {
  const navigate = useNavigate()
  const { createVehicle } = useVehicles()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [imageResults, setImageResults] = useState<string[]>([])
  const [searchingImages, setSearchingImages] = useState(false)

  const [form, setForm] = useState({
    type: 'car' as VehicleType,
    name: '', brand: '', model: '', year: '',
    license_plate: '', photo_url: '',
    engine: '', oil_type: '', oil_quantity: '',
    maintenance_interval_km: '', maintenance_interval_hours: '',
    current_km: '', current_hours: '', notes: '',
  })

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const searchImages = async () => {
    const query = [form.brand, form.model, form.year].filter(Boolean).join(' ')
    if (!query) return
    const apiKey = import.meta.env.VITE_GOOGLE_CSE_API_KEY
    const cx = import.meta.env.VITE_GOOGLE_CSE_CX
    if (!apiKey || !cx) return
    setSearchingImages(true)
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&searchType=image&q=${encodeURIComponent(query)}&num=6`
      const res = await fetch(url)
      const data = await res.json()
      const urls = (data.items ?? []).map((i: { link: string }) => i.link)
      setImageResults(urls)
    } catch { /* silent */ } finally { setSearchingImages(false) }
  }

  const handleNext = async () => {
    if (step === 1) {
      if (!form.name || !form.model) { toast.error('Nombre y modelo son obligatorios'); return }
      if (form.brand && form.model && form.year) searchImages()
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await createVehicle({
        type: form.type, name: form.name,
        brand: form.brand || null, model: form.model,
        year: form.year ? Number(form.year) : null,
        license_plate: form.license_plate || null,
        photo_url: form.photo_url || null,
        engine: form.engine || null,
        oil_type: form.oil_type || null,
        oil_quantity: form.oil_quantity ? Number(form.oil_quantity) : null,
        maintenance_interval_km: form.maintenance_interval_km ? Number(form.maintenance_interval_km) : null,
        maintenance_interval_hours: form.maintenance_interval_hours ? Number(form.maintenance_interval_hours) : null,
        current_km: form.current_km ? Number(form.current_km) : 0,
        current_hours: form.current_hours ? Number(form.current_hours) : 0,
        notes: form.notes || null,
      })
      toast.success('Vehiculo guardado')
      navigate('/')
    } catch { toast.error('Error al guardar') } finally { setLoading(false) }
  }

  const stepLabels = ['Datos basicos', 'Datos tecnicos', 'Confirmacion']

  return (
    <>
      <Header title="Nuevo vehiculo" back />
      <div className="px-4 py-5 space-y-6">
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-body font-medium flex-shrink-0 ${step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-garage-orange text-white' : 'bg-garage-sand text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-body truncate ${step === i + 1 ? 'text-garage-dark font-medium' : 'text-gray-400'}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-garage-sand" />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-body font-medium text-gray-600 mb-2">Tipo de vehiculo</label>
              <div className="grid grid-cols-5 gap-2">
                {VEHICLE_TYPES.map(({ key, label }) => (
                  <button
                    key={key} type="button"
                    onClick={() => setForm((f) => ({ ...f, type: key }))}
                    className={`p-3 rounded-xl border text-center transition-colors ${form.type === key ? 'border-garage-orange bg-orange-50' : 'border-garage-sand bg-white'}`}
                  >
                    <div className="text-2xl">{VEHICLE_TYPE_ICONS[key]}</div>
                    <div className="text-xs mt-1 font-body text-gray-600">{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <Input label="Nombre / alias*" value={form.name} onChange={set('name')} placeholder='ej: Mi 125 azul' />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Marca" value={form.brand} onChange={set('brand')} placeholder="Honda" />
              <Input label="Modelo*" value={form.model} onChange={set('model')} placeholder="CB125F" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ano" type="number" value={form.year} onChange={set('year')} placeholder="2021" />
              <Input label="Matricula" value={form.license_plate} onChange={set('license_plate')} placeholder="B-1234-XY" />
            </div>

            {(imageResults.length > 0 || searchingImages) && (
              <div>
                <label className="block text-xs font-body font-medium text-gray-600 mb-2">Selecciona una imagen (opcional)</label>
                {searchingImages ? (
                  <p className="text-xs text-gray-400">Buscando imagenes...</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {imageResults.map((url) => (
                      <button
                        key={url} type="button"
                        onClick={() => setForm((f) => ({ ...f, photo_url: f.photo_url === url ? '' : url }))}
                        className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-colors ${form.photo_url === url ? 'border-garage-orange' : 'border-transparent'}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input label="Motorizacion" value={form.engine} onChange={set('engine')} placeholder="ej: 1.6 TDI 115cv" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Tipo de aceite" value={form.oil_type} onChange={set('oil_type')} placeholder="5W-40 Full Synthetic" />
              <Input label="Cantidad aceite (L)" type="number" step="0.1" value={form.oil_quantity} onChange={set('oil_quantity')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Intervalo (km)" type="number" value={form.maintenance_interval_km} onChange={set('maintenance_interval_km')} />
              <Input label="Intervalo (horas)" type="number" value={form.maintenance_interval_hours} onChange={set('maintenance_interval_hours')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Km actuales" type="number" value={form.current_km} onChange={set('current_km')} />
              <Input label="Horas totales" type="number" step="0.1" value={form.current_hours} onChange={set('current_hours')} />
            </div>
            <Textarea label="Notas" value={form.notes} onChange={set('notes')} rows={3} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-2">
              {form.photo_url && (
                <img src={form.photo_url} alt={form.name} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              {[
                ['Tipo', VEHICLE_TYPES.find((t) => t.key === form.type)?.label],
                ['Nombre', form.name],
                ['Marca / Modelo', [form.brand, form.model].filter(Boolean).join(' ')],
                ['Ano', form.year],
                ['Matricula', form.license_plate],
                ['Motor', form.engine],
                ['Aceite', form.oil_type],
                ['Km actuales', form.current_km],
                ['Intervalo km', form.maintenance_interval_km],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={String(l)} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l}</span>
                  <span className="font-medium text-garage-dark">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="ghost" className="flex-1" onClick={() => setStep((s) => (s - 1) as Step)}>Atras</Button>
          )}
          {step < 3 ? (
            <Button className="flex-1" onClick={handleNext}>Siguiente</Button>
          ) : (
            <Button className="flex-1" loading={loading} onClick={handleSave}>Guardar vehiculo</Button>
          )}
        </div>
      </div>
    </>
  )
}
