import { Input } from '../ui/Input'
import type { MotoSettings } from '../../types'

interface Props {
  values: Partial<MotoSettings>
  onChange: (key: keyof MotoSettings, value: string | number | null) => void
}

export function CarburetionSettings({ values, onChange }: Props) {
  const num = (key: keyof MotoSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value ? Number(e.target.value) : null)
  const str = (key: keyof MotoSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange(key, e.target.value || null)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Surtidor principal (main jet)" value={values.main_jet ?? ''} onChange={str('main_jet')} placeholder="ej: 118" />
        <Input label="Surtidor piloto (pilot jet)" value={values.pilot_jet ?? ''} onChange={str('pilot_jet')} placeholder="ej: 38" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Clip aguja (posicion)" type="number" min={1} max={7} value={values.needle_clip ?? ''} onChange={num('needle_clip')} placeholder="ej: 3" />
        <Input label="Tornillo aire (vueltas)" type="number" step={0.25} min={0} value={values.air_screw ?? ''} onChange={num('air_screw')} placeholder="ej: 2.5" />
      </div>
      <Input label="Mezcla / combustible" value={values.fuel_mixture ?? ''} onChange={str('fuel_mixture')} placeholder="ej: 95 sin plomo" />
    </div>
  )
}
