import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const baseClass = 'w-full px-3 py-2.5 rounded-lg border border-garage-sand bg-white text-garage-dark font-body text-sm focus:outline-none focus:ring-2 focus:ring-garage-orange focus:border-transparent placeholder:text-gray-400 min-h-[44px]'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-body font-medium text-gray-600 mb-1">{label}</label>}
      <input ref={ref} className={`${baseClass} ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-body font-medium text-gray-600 mb-1">{label}</label>}
      <textarea ref={ref} rows={4} className={`${baseClass} min-h-[100px] resize-y ${error ? 'border-red-400' : ''} ${className}`} {...rest} />
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'

export function Select({ label, error, children, className = '', ...rest }: InputProps & { children: React.ReactNode }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-body font-medium text-gray-600 mb-1">{label}</label>}
      <select className={`${baseClass} ${error ? 'border-red-400' : ''} ${className}`} {...(rest as React.SelectHTMLAttributes<HTMLSelectElement>)}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
