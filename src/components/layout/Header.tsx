import { ArrowLeft, UserCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isAuthenticated } from '../../lib/api'

interface Props {
  title: string
  subtitle?: string
  back?: boolean
  action?: React.ReactNode
}

export function Header({ title, subtitle, back, action }: Props) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-garage-sand px-4 py-3 flex items-center gap-3">
      {back && (
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-garage-sand text-garage-dark"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="font-display font-semibold text-lg text-garage-dark leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  )
}

export function AppHeader() {
  const navigate = useNavigate()
  const loggedIn = isAuthenticated()

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-garage-sand px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔧</span>
        <span className="font-display font-bold text-xl text-garage-dark tracking-tight">
          Aelfwine's Garage
        </span>
      </div>
      <button
        onClick={() => navigate('/settings')}
        className="p-2 rounded-full hover:bg-garage-sand"
        aria-label="Cuenta"
      >
        <UserCircle size={24} className={loggedIn ? 'text-garage-steel' : 'text-gray-400'} />
      </button>
    </header>
  )
}
