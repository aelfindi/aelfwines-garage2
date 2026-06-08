import { useState } from 'react'
import { api, setToken, clearToken, isAuthenticated } from '../lib/api'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function Settings() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const authenticated = isAuthenticated()

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { token } = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(token)
      toast.success('Sesion iniciada')
      window.location.href = '/'
    } catch {
      toast.error('Email o contrasena incorrectos')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearToken()
    toast.success('Sesion cerrada')
    window.location.href = '/settings'
  }

  return (
    <>
      <Header title="Ajustes" />
      <div className="px-4 py-5 space-y-6">
        <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-4">
          <h3 className="font-display font-semibold text-base">Cuenta</h3>

          {authenticated ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Sesion activa</p>
              <Button variant="ghost" className="w-full" onClick={handleLogout}>
                Cerrar sesion
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-garage-sand text-sm font-body focus:outline-none focus:ring-2 focus:ring-garage-orange min-h-[44px]"
                type="email" placeholder="Email" value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full px-3 py-2.5 rounded-lg border border-garage-sand text-sm font-body focus:outline-none focus:ring-2 focus:ring-garage-orange min-h-[44px]"
                type="password" placeholder="Contrasena" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button className="w-full" loading={loading} onClick={handleLogin}>
                Iniciar sesion
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-garage-sand p-4">
          <h3 className="font-display font-semibold text-base mb-2">Acerca de</h3>
          <p className="text-sm text-gray-600">Aelfwine's Garage v0.1.0</p>
          <p className="text-xs text-gray-400 mt-1">Seguimiento de mantenimiento de vehiculos</p>
        </div>
      </div>
    </>
  )
}
