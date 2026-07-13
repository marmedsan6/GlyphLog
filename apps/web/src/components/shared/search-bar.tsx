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
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
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
            'w-full h-9 pl-9 pr-8 text-sm rounded-full border border-border focus:border-primary/50 focus:bg-background focus:outline-none transition-all duration-200',
            bgOpacity.muted[0.5]
          )}
          aria-label="Buscar en la colección"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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
            'absolute top-full left-0 right-0 z-50 mt-1.5 p-1.5 rounded-xl border border-border backdrop-blur-md text-popover-foreground shadow-lg animate-in fade-in-50 slide-in-from-top-1 duration-200',
            bgOpacity.popover[0.9]
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
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
                      'w-full flex items-center gap-3 p-2 rounded-lg text-left active:bg-muted transition-colors duration-150',
                      hoverBgOpacity.muted[0.7]
                    )}
                  >
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={entry.title}
                        className="h-10 w-7.5 rounded object-cover border border-border/50 shadow-sm"
                      />
                    ) : (
                      <div className="h-10 w-7.5 rounded bg-gradient-to-br from-primary/20 to-accent/20 border border-border/50 flex items-center justify-center text-[10px] font-semibold text-muted-foreground uppercase shadow-sm">
                        {entry.type[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate leading-snug">
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'h-4.5 px-1.5 py-0 text-[10px] font-medium leading-none rounded-full text-accent-foreground',
                            bgOpacity.accent[0.4]
                          )}
                        >
                          {getTypeLabel(entry.type)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {getStatusLabel(entry.type, entry.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
              <div className="border-t border-border/50 mt-1.5 pt-1.5 px-1 pb-1">
                <button
                  onClick={() => handleSearchSubmit(query)}
                  className="w-full h-8 text-xs text-center font-medium text-primary hover:text-primary-foreground hover:bg-primary rounded-md transition-colors duration-150"
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
