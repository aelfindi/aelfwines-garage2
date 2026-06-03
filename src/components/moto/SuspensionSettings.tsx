import { Input } from '../ui/Input'
import type { MotoSettings } from '../../types'

interface Props {
  values: Partial<MotoSettings>
  onChange: (key: keyof MotoSettings, value: string | number | null) => void
}

export function SuspensionSettings({ values, onChange }: Props) {
  const num = (key: keyof MotoSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value ? Number(e.target.value) : null)
  const str = (key: keyof MotoSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange(key, e.target.value || null)

  return (
    <div className="space-y-5">
      <div>
        <h4 className="font-display font-semibold text-sm text-garage-steel uppercase tracking-wide mb-3">Horquilla delantera</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Precarga (clics)" type="number" value={values.fork_preload ?? ''} onChange={num('fork_preload')} />
          <Input label="Compresion (clics)" type="number" value={values.fork_compression ?? ''} onChange={num('fork_compression')} />
          <Input label="Rebote/extension (clics)" type="number" value={values.fork_rebound ?? ''} onChange={num('fork_rebound')} />
          <Input label="Nivel aceite (mm)" type="number" value={values.fork_oil_level ?? ''} onChange={num('fork_oil_level')} />
        </div>
        <div className="mt-3">
          <Input label="Tipo aceite horquilla" value={values.fork_oil_type ?? ''} onChange={str('fork_oil_type')} placeholder="ej: Motul Fork Oil 10W" />
        </div>
      </div>

      <div>
        <h4 className="font-display font-semibold text-sm text-garage-steel uppercase tracking-wide mb-3">Amortiguador trasero</h4>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Precarga (clics)" type="number" value={values.shock_preload ?? ''} onChange={num('shock_preload')} />
          <Input label="Comp. alta velocidad (clics)" type="number" value={values.shock_compression_high ?? ''} onChange={num('shock_compression_high')} />
          <Input label="Comp. baja velocidad (clics)" type="number" value={values.shock_compression_low ?? ''} onChange={num('shock_compression_low')} />
          <Input label="Rebote/extension (clics)" type="number" value={values.shock_rebound ?? ''} onChange={num('shock_rebound')} />
        </div>
      </div>
    </div>
  )
}
