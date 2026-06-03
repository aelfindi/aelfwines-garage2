import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-t-2xl sm:rounded-2xl w-full ${sizes[size]} mx-auto shadow-xl max-h-[90vh] flex flex-col`}>
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-garage-sand">
            <h2 className="font-display text-lg font-semibold text-garage-dark">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-garage-sand text-gray-500" aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  )
}
