import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  message?: string
  onRetry: () => void
  showBackButton?: boolean
}

export function ErrorState({ message, onRetry, showBackButton = false }: ErrorStateProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      {showBackButton && (
        <Button variant="outline" onClick={() => navigate('/collection')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la colección
        </Button>
      )}
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive mb-4">
          {message || 'Ha ocurrido un error inesperado.'}
        </p>
        <Button type="button" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
