import { type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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
import { isAuthenticated } from './lib/api'

function RequireAuth({ children }: { children: ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/settings" replace />
}

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
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/vehicles/new" element={<RequireAuth><AddVehicle /></RequireAuth>} />
          <Route path="/vehicles/:id" element={<RequireAuth><VehicleDetail /></RequireAuth>} />
          <Route path="/vehicles/:id/settings" element={<RequireAuth><MotoSettings /></RequireAuth>} />
          <Route path="/vehicles/:id/sessions" element={<RequireAuth><SessionNotes /></RequireAuth>} />
          <Route path="/vehicles/:id/qr" element={<RequireAuth><VehicleQR /></RequireAuth>} />
          <Route path="/vehicles/:id/export" element={<RequireAuth><VehicleExport /></RequireAuth>} />
        </Routes>
      </AppShell>
    </>
  )
}
