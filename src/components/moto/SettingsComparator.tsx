import type { MotoSettingsHistory } from '../../types'
import { diffSettings } from '../../lib/helpers'

const FIELD_LABELS: Record<string, string> = {
  main_jet: 'Surtidor principal',
  pilot_jet: 'Surtidor piloto',
  needle_clip: 'Aguja (clip)',
  air_screw: 'Tornillo aire (v.)',
  fuel_mixture: 'Mezcla',
  fork_preload: 'Prec. horquilla (cl.)',
  fork_compression: 'Comp. horquilla (cl.)',
  fork_rebound: 'Reb. horquilla (cl.)',
  fork_oil_level: 'Nivel aceite hork. (mm)',
  fork_oil_type: 'Aceite horquilla',
  shock_preload: 'Prec. amort. (cl.)',
  shock_compression_high: 'Comp. alta amort. (cl.)',
  shock_compression_low: 'Comp. baja amort. (cl.)',
  shock_rebound: 'Reb. amort. (cl.)',
}

interface Props {
  a: MotoSettingsHistory
  b: MotoSettingsHistory
}

export function SettingsComparator({ a, b }: Props) {
  const diff = diffSettings(a, b)

  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="border-b border-garage-sand">
            <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium w-1/3">Parametro</th>
            <th className="py-2 px-2 text-center text-xs font-medium text-garage-dark w-1/3 max-w-[120px] truncate" title={a.label}>{a.label}</th>
            <th className="py-2 px-2 text-center text-xs font-medium text-garage-dark w-1/3 max-w-[120px] truncate" title={b.label}>{b.label}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(diff).map(([field, { a: va, b: vb, changed }]) => (
            <tr key={field} className={`border-b border-garage-sand/50 ${changed ? 'bg-orange-50' : ''}`}>
              <td className="py-2 px-2 text-xs text-gray-600">{FIELD_LABELS[field] ?? field}</td>
              <td className={`py-2 px-2 text-center text-xs ${changed ? 'font-medium text-garage-orange' : 'text-gray-700'}`}>
                {va != null ? String(va) : '-'}
              </td>
              <td className={`py-2 px-2 text-center text-xs ${changed ? 'font-medium text-garage-orange' : 'text-gray-700'}`}>
                {vb != null ? String(vb) : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
