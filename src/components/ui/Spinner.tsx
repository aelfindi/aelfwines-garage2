export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`w-8 h-8 border-4 border-garage-sand border-t-garage-orange rounded-full animate-spin ${className}`} />
  )
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <Spinner />
    </div>
  )
}
