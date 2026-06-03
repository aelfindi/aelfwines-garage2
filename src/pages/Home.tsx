import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useVehicles } from '../hooks/useVehicles'
import { useAppStore } from '../store'
import { VehicleCard } from '../components/vehicles/VehicleCard'
import { AppHeader } from '../components/layout/Header'
import { PageSpinner } from '../components/ui/Spinner'
import toast from 'react-hot-toast'

export function Home() {
  const navigate = useNavigate()
  const { vehicles, loading, deleteVehicle } = useVehicles()
  const maintenanceLogs = useAppStore((s) => s.maintenanceLogs)

  const handleDelete = async (id: string) => {
    try {
      await deleteVehicle(id)
      toast.success('Vehiculo eliminado')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  return (
    <>
      <AppHeader />
      <div className="px-4 py-5">
        {loading && vehicles.length === 0 ? (
          <PageSpinner />
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <span className="text-6xl">🔧</span>
            <div>
              <p className="font-display font-semibold text-lg text-garage-dark">Sin vehiculos aun</p>
              <p className="text-sm text-gray-500 mt-1">Anade tu primer vehiculo para empezar</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {(['moto', 'car'] as const).map((type) => {
              const group = vehicles.filter((v) => v.type === type)
              if (group.length === 0) return null
              const label = type === 'moto' ? 'Motos' : 'Coches'
              const icon = type === 'moto' ? '🏍️' : '🚗'
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{icon}</span>
                    <h2 className="font-display font-semibold text-xs text-gray-400 uppercase tracking-widest">{label}</h2>
                  </div>
                  <div className="space-y-3">
                    {group.map((v) => {
                      const logs = maintenanceLogs[v.id] ?? []
                      const lastOrdinary = logs.filter((l) => l.type === 'ordinary')[0] ?? null
                      return <VehicleCard key={v.id} vehicle={v} lastLog={lastOrdinary} onDelete={handleDelete} />
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/vehicles/new')}
        className="fixed bottom-20 sm:bottom-6 right-4 w-14 h-14 rounded-full bg-garage-orange text-white shadow-lg flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all"
        aria-label="Anadir vehiculo"
      >
        <Plus size={24} />
      </button>
    </>
  )
}
