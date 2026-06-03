import { BlobProvider } from '@react-pdf/renderer'
import { FileDown } from 'lucide-react'
import { VehiclePDFDocument } from './VehiclePDFDocument'
import type { Vehicle, MaintenanceLog, MotoSettingsHistory, SessionNote } from '../../types'

interface Props {
  vehicle: Vehicle
  ordinaryLogs: MaintenanceLog[]
  extraordinaryLogs: MaintenanceLog[]
  motoHistory?: MotoSettingsHistory[]
  sessions?: SessionNote[]
  dateRange?: { from: string; to: string } | null
}

export function ExportButton({ vehicle, ordinaryLogs, extraordinaryLogs, motoHistory, sessions, dateRange }: Props) {
  const fileName = `garage-${vehicle.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`

  const doc = (
    <VehiclePDFDocument
      vehicle={vehicle}
      ordinaryLogs={ordinaryLogs}
      extraordinaryLogs={extraordinaryLogs}
      motoHistory={motoHistory}
      sessions={sessions}
      dateRange={dateRange}
    />
  )

  return (
    <BlobProvider document={doc}>
      {({ url, loading }) => (
        <a
          href={url ?? '#'}
          download={fileName}
          onClick={(e) => { if (!url) e.preventDefault() }}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-body font-medium rounded-lg transition-colors min-h-[44px] ${loading ? 'bg-gray-400 pointer-events-none' : 'bg-garage-orange hover:bg-orange-600'}`}
          aria-disabled={loading}
        >
          <FileDown size={18} />
          {loading ? 'Generando PDF...' : 'Generar PDF'}
        </a>
      )}
    </BlobProvider>
  )
}
