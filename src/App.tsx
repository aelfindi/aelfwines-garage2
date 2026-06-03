import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/layout/AppShell'
import { Home } from './pages/Home'
import { AddVehicle } from './pages/AddVehicle'
import { VehicleDetail } from './pages/VehicleDetail'
import { MotoSettings } from './pages/MotoSettings'
import { SessionNotes } from './pages/SessionNotes'
import { VehicleQR } from './pages/VehicleQR'
import { VehicleExport } from './pages/VehicleExport'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '12px' },
          success: { iconTheme: { primary: '#E8682A', secondary: '#fff' } },
        }}
      />
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vehicles/new" element={<AddVehicle />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/vehicles/:id/settings" element={<MotoSettings />} />
          <Route path="/vehicles/:id/sessions" element={<SessionNotes />} />
          <Route path="/vehicles/:id/qr" element={<VehicleQR />} />
          <Route path="/vehicles/:id/export" element={<VehicleExport />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </>
  )
}
