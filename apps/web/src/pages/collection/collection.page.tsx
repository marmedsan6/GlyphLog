import { Link } from 'react-router-dom'

// Página principal de la colección del usuario.
// TODO (T-011): listar entradas con useEntries hook
// TODO (T-010): botón para crear nueva entrada
export function CollectionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mi Colección</h1>
        {/* TODO (T-010): reemplazar con botón que abra formulario de nueva entrada */}
        <Link
          to="/entries/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Nueva entrada
        </Link>
      </div>

      {/* TODO (T-011): reemplazar con lista de EntryCard components */}
      <div className="rounded-md border border-border p-8 text-center text-muted-foreground">
        Tu colección aparecerá aquí una vez implementado T-011.
      </div>
    </div>
  )
}
