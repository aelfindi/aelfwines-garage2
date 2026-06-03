import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'

export function Settings() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)

  const handleAuth = async () => {
    setLoading(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Sesion iniciada')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Cuenta creada. Revisa tu email para confirmar.')
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error de autenticacion')
    } finally { setLoading(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sesion cerrada')
  }

  return (
    <>
      <Header title="Ajustes" />
      <div className="px-4 py-5 space-y-6">
        <div className="bg-white rounded-xl border border-garage-sand p-4 space-y-4">
          <h3 className="font-display font-semibold text-base">Cuenta</h3>
          <div className="flex gap-2 p-1 bg-garage-sand rounded-lg">
            {(['Iniciar sesion', 'Crear cuenta'] as const).map((label, i) => (
              <button key={label} onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-2 rounded-md text-sm font-body font-medium transition-colors ${(i === 0) === isLogin ? 'bg-white shadow text-garage-dark' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>
          <input
            className="w-full px-3 py-2.5 rounded-lg border border-garage-sand text-sm font-body focus:outline-none focus:ring-2 focus:ring-garage-orange min-h-[44px]"
            type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full px-3 py-2.5 rounded-lg border border-garage-sand text-sm font-body focus:outline-none focus:ring-2 focus:ring-garage-orange min-h-[44px]"
            type="password" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <Button className="w-full" loading={loading} onClick={handleAuth}>
            {isLogin ? 'Iniciar sesion' : 'Crear cuenta'}
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleLogout}>
            Cerrar sesion
          </Button>
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
