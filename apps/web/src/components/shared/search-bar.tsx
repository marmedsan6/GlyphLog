import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchEntries } from '@/hooks/useSearchEntries'
import { getCoverImageUrl } from '@/utils/cover-image-url'
import { getTypeLabel, getStatusLabel } from '@/utils/entry-labels'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { bgOpacity, hoverBgOpacity } from '@/lib/tailwind-opacity'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const { entries, isLoading } = useSearchEntries(debouncedQuery)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Sincronizar el input de búsqueda si se cambia la búsqueda de la URL directamente
  useEffect(() => {
    const urlSearch = searchParams.get('search')
    if (urlSearch) {
      setQuery(urlSearch)
    } else {
      setQuery('')
    }
  }, [searchParams])

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cerrar el dropdown al presionar Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSearchSubmit(searchQuery: string) {
    if (!searchQuery.trim()) return
    setIsOpen(false)
    navigate(`/collection?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  function handleClear() {
    setQuery('')
    setIsOpen(false)
    // Si ya estábamos filtrando por búsqueda en la colección, la limpiamos de la URL
    if (searchParams.get('search')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('search')
      navigate(`/collection?${nextParams.toString()}`)
    }
  }

  const hasMinLength = debouncedQuery.trim().length >= 2

  return (
    <div ref={containerRef} className="relative w-full max-w-sm sm:max-w-md">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearchSubmit(query)
            }
          }}
          placeholder="Buscar en mi colección..."
          className={cn(
            'focus:border-primary/50 h-9 w-full rounded-full border border-border pl-9 pr-8 text-sm transition-all duration-200 focus:bg-background focus:outline-none',
            bgOpacity.muted[0.5]
          )}
          aria-label="Buscar en la colección"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && hasMinLength && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-border p-1.5 text-popover-foreground shadow-lg backdrop-blur-md duration-200 animate-in fade-in-50 slide-in-from-top-1',
            bgOpacity.popover[0.9]
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Buscando...</span>
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-1">
              {entries.map((entry) => {
                const coverUrl = getCoverImageUrl(entry.cover_image)
                return (
                  <button
                    key={entry.id}
                    onClick={() => {
                      setIsOpen(false)
                      navigate(`/entries/${entry.id}`)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-150 active:bg-muted',
                      hoverBgOpacity.muted[0.7]
                    )}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={entry.title}
                        className="w-7.5 border-border/50 h-10 rounded border object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-7.5 from-primary/20 to-accent/20 border-border/50 flex h-10 items-center justify-center rounded border bg-gradient-to-br text-[10px] font-semibold uppercase text-muted-foreground shadow-sm">
                        {entry.type[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold leading-snug text-foreground">
                        {entry.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-4.5 rounded-full px-1.5 py-0 text-[10px] font-medium leading-none text-accent-foreground',
                            bgOpacity.accent[0.4]
                          )}
                        >
                          {getTypeLabel(entry.type)}
                        </Badge>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {getStatusLabel(entry.type, entry.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
              <div className="border-border/50 mt-1.5 border-t px-1 pb-1 pt-1.5">
                <button
                  onClick={() => handleSearchSubmit(query)}
                  className="h-8 w-full rounded-md text-center text-xs font-medium text-primary transition-colors duration-150 hover:bg-primary hover:text-primary-foreground"
                >
                  Ver todos los resultados para "{query.trim()}"
                </button>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
