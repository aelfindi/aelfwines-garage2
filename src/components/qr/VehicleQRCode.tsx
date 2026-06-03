import { QRCodeCanvas } from 'qrcode.react'
import { Download, Share2 } from 'lucide-react'
import { Button } from '../ui/Button'
import type { Vehicle } from '../../types'

interface Props {
  vehicle: Vehicle
}

export function VehicleQRCode({ vehicle }: Props) {
  const url = `${window.location.origin}/vehicles/${vehicle.id}`

  const handleDownload = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#vehicle-qr canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `qr-${vehicle.name.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: vehicle.name, url })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div id="vehicle-qr" className="bg-white p-5 rounded-2xl shadow-md border border-garage-sand">
        <QRCodeCanvas
          value={url}
          size={220}
          bgColor="#FFFFFF"
          fgColor="#1C1C1E"
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="text-center">
        <p className="font-display font-semibold text-lg text-garage-dark">{vehicle.name}</p>
        <p className="text-sm text-gray-500">{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' · ')}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={handleDownload}>
          <Download size={18} /> Descargar QR
        </Button>
        <Button variant="ghost" onClick={handleShare}>
          <Share2 size={18} /> Compartir
        </Button>
      </div>
    </div>
  )
}
