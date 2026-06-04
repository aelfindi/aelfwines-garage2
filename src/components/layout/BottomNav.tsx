import { Home } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-garage-sand sm:hidden">
      <div className="flex items-stretch">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-xs font-body transition-colors ${
              isActive ? 'text-garage-orange' : 'text-gray-500'
            }`
          }
        >
          <Home size={22} />
          <span>Vehiculos</span>
        </NavLink>
      </div>
    </nav>
  )
}
