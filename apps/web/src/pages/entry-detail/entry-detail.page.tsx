import { useParams } from 'react-router-dom'

// Página de detalle de una entrada.
// TODO (T-012): implementar vista y edición de entrada
// TODO (T-013): implementar eliminación de entrada
export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Detalle de entrada</h1>
      {/* TODO (T-012): mostrar datos de la entrada con id={id} */}
      <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
        Detalle de entrada <code className="font-mono text-sm">{id}</code> —
        pendiente de implementar (T-012)
      </div>
    </div>
  )
}
