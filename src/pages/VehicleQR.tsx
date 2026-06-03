import { useParams } from 'react-router-dom'
import { useAppStore } from '../store'
import { Header } from '../components/layout/Header'
import { VehicleQRCode } from '../components/qr/VehicleQRCode'
import { PageSpinner } from '../components/ui/Spinner'

export function VehicleQR() {
  const { id } = useParams<{ id: string }>()
  const vehicles = useAppStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === id)

  if (!vehicle) return <PageSpinner />

  return (
    <>
      <Header title="Codigo QR" subtitle={vehicle.name} back />
      <VehicleQRCode vehicle={vehicle} />
    </>
  )
}
