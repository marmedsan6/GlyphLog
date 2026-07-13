import { useEffect, useState, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Search, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useExternalSearch } from '@/hooks/useExternalSearch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bgOpacity, hoverBgOpacity } from '@/lib/tailwind-opacity'
import type { EntryFormValues } from './entry-form-schema'
import type { ExternalSearchResult } from '@/types'

interface ExternalSearchAutocompleteProps {
  onSelectCover: (url: string | null) => void
  onClearCover: () => void
  isAutocompleted: boolean
  setIsAutocompleted: (val: boolean) => void
}

export function ExternalSearchAutocomplete({
  onSelectCover,
  onClearCover,
  isAutocompleted,
  setIsAutocompleted,
}: ExternalSearchAutocompleteProps) {
  const { setValue } = useFormContext<EntryFormValues>()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 600)
  const { results, isLoading, isError } = useExternalSearch(debouncedQuery)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedItem, setSelectedItem] = useState<ExternalSearchResult | null>(null)

  // Cerrar dropdown click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item: ExternalSearchResult) {
    setSelectedItem(item)
    setIsAutocompleted(true)
    setIsOpen(false)
    setSearchQuery('')

    // Auto-rellenar campos en el formulario
    setValue('title', item.title, { shouldValidate: true })
    setValue('type', item.type, { shouldValidate: true })
    setValue('year', item.year ? String(item.year) : '', { shouldValidate: true })

    // Auto-rellenar portada remota
    onSelectCover(item.cover_image || null)
  }

  function handleDisconnect() {
    // Mantener los valores pero desbloquear los campos para edición manual
    setIsAutocompleted(false)
    setSelectedItem(null)
  }

  function handleClear() {
    setSearchQuery('')
    setSelectedItem(null)
    setIsAutocompleted(false)
    setValue('title', '')
    setValue('year', '')
    onClearCover()
  }

  const hasMinLength = debouncedQuery.trim().length >= 3

  return (
    <div className="space-y-4" ref={dropdownRef}>
      {!isAutocompleted ? (
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">Buscador inteligente de catálogo</span>
          </div>
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Buscar título en MAL / RAWG para autocompletar..."
              className={cn(
                'w-full h-9 pl-9 pr-8 text-sm rounded-md border border-border focus:border-primary/50 focus:bg-background focus:outline-none transition-all duration-200',
                bgOpacity.muted[0.3]
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-0.5 rounded-full hover:bg-muted text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Popover de resultados */}
          {isOpen && hasMinLength && (
            <div
              className={cn(
                'absolute top-full left-0 right-0 z-50 mt-1.5 p-1.5 max-h-60 overflow-y-auto rounded-xl border border-border backdrop-blur-sm text-popover-foreground shadow-lg animate-in fade-in-50 duration-200',
                bgOpacity.popover[0.95]
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Buscando en MAL / RAWG...</span>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center py-6 text-sm text-destructive gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>Error al conectar con catálogos externos</span>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg text-left active:bg-muted transition-colors duration-150',
                        hoverBgOpacity.muted[0.7]
                      )}
                    >
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt={item.title}
                          className="h-10 w-7.5 rounded object-cover border border-border/50 shadow-sm shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-7.5 rounded bg-gradient-to-br from-primary/10 to-accent/10 border border-border/50 flex items-center justify-center text-[10px] text-muted-foreground uppercase shadow-sm shrink-0">
                          {item.type[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate leading-snug">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'h-4.5 px-1.5 py-0 text-[10px] font-medium leading-none rounded-full text-accent-foreground',
                              bgOpacity.accent[0.3]
                            )}
                          >
                            {item.type === 'game' ? 'Videojuego' : item.type === 'anime' ? 'Anime' : 'Manga'}
                          </Badge>
                          {item.year && (
                            <span className="text-[11px] text-muted-foreground">{item.year}</span>
                          )}
                          <span className="text-[9px] text-muted-foreground/60 italic ml-auto">{item.source}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No se encontraron resultados para "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between text-sm animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <p className="text-foreground font-medium truncate min-w-0">
              Autocompletado desde catálogo ({selectedItem?.source || 'MAL/RAWG'})
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="h-8 text-xs font-semibold"
            >
              Desvincular y editar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
