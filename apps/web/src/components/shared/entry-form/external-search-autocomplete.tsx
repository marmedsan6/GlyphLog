import { useEffect, useState, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Search, X, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useExternalSearch } from '@/hooks/useExternalSearch'
import { useGetGameDetail } from '@/hooks/useGetGameDetail'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { bgOpacity, hoverBgOpacity } from '@/lib/tailwind-opacity'
import type { EntryFormValues, ProgressTotalSource } from './entry-form-schema'
import type { EntryType, ExternalSearchResult } from '@/types'

interface ExternalSearchAutocompleteProps {
  onSelectCover: (url: string | null) => void
  onClearCover: () => void
  isAutocompleted: boolean
  setIsAutocompleted: (val: boolean) => void
  onProgressTotalSource?: (source: ProgressTotalSource | null) => void
}

export function ExternalSearchAutocomplete({
  onSelectCover,
  onClearCover,
  isAutocompleted,
  setIsAutocompleted,
  onProgressTotalSource,
}: ExternalSearchAutocompleteProps) {
  const { setValue } = useFormContext<EntryFormValues>()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<EntryType>('anime')
  const [isOpen, setIsOpen] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 600)
  const { results, isLoading, isError } = useExternalSearch(debouncedQuery, searchType)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [selectedItem, setSelectedItem] = useState<ExternalSearchResult | null>(null)

  // Lazy fetch del playtime de RAWG: solo cuando el usuario selecciona un juego.
  const [pendingGameSlug, setPendingGameSlug] = useState<string | null>(null)
  const { data: gameDetail, isLoading: isGameDetailLoading } = useGetGameDetail(pendingGameSlug)

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

  // Aplicar playtime de RAWG cuando llegue el detalle del juego seleccionado.
  useEffect(() => {
    if (!pendingGameSlug || !gameDetail) return

    if (gameDetail.playtime_hours != null) {
      setValue('progress_total', String(gameDetail.playtime_hours), { shouldValidate: true })
      onProgressTotalSource?.('RAWG')
    }

    setPendingGameSlug(null)
  }, [gameDetail, pendingGameSlug, setValue, onProgressTotalSource])

  function applyCommonFields(item: ExternalSearchResult) {
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

  function applyProgressTotal(item: ExternalSearchResult) {
    if (item.type === 'game') {
      // Los juegos no traen playtime en el listado; lo pedimos lazy al detalle.
      if (item.slug) {
        setPendingGameSlug(item.slug)
      }
      // Dejamos el input vacío mientras llega (o si no hay slug).
      setValue('progress_total', '', { shouldValidate: true })
      onProgressTotalSource?.(null)
      return
    }

    // Anime y manga traen el total directamente desde AniList.
    if (item.progress_total != null) {
      setValue('progress_total', String(item.progress_total), { shouldValidate: true })
      onProgressTotalSource?.('AniList')
    } else {
      setValue('progress_total', '', { shouldValidate: true })
      onProgressTotalSource?.(null)
    }
  }

  function handleSelect(item: ExternalSearchResult) {
    applyCommonFields(item)
    applyProgressTotal(item)
  }

  function handleDisconnect() {
    // Mantener los valores pero desbloquear los campos para edición manual
    setIsAutocompleted(false)
    setSelectedItem(null)
    setPendingGameSlug(null)
    onProgressTotalSource?.('manual')
  }

  function handleClear() {
    setSearchQuery('')
    setSelectedItem(null)
    setIsAutocompleted(false)
    setPendingGameSlug(null)
    setValue('title', '')
    setValue('year', '')
    setValue('progress_total', '')
    onClearCover()
    onProgressTotalSource?.(null)
  }

  const hasMinLength = debouncedQuery.trim().length >= 3

  return (
    <div className="space-y-4" ref={dropdownRef}>
      {!isAutocompleted ? (
        <div className="relative">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span className="text-sm font-medium text-foreground">
              Buscador inteligente de catálogo
            </span>
          </div>
          <div className="mb-2">
            <select
              id="external-search-type"
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as EntryType)}
              aria-label="Categoría de búsqueda"
              className={cn(
                'focus:border-primary/50 h-9 w-full rounded-md border border-border px-3 text-sm transition-all duration-200 focus:bg-background focus:outline-none',
                bgOpacity.muted[0.3]
              )}
            >
              <option value="anime">Animes</option>
              <option value="manga">Mangas</option>
              <option value="game">Videojuegos</option>
            </select>
          </div>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
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
                'focus:border-primary/50 h-9 w-full rounded-md border border-border pl-9 pr-8 text-sm transition-all duration-200 focus:bg-background focus:outline-none',
                bgOpacity.muted[0.3]
              )}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Popover de resultados */}
          {isOpen && hasMinLength && (
            <div
              className={cn(
                'absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border p-1.5 text-popover-foreground shadow-lg backdrop-blur-sm duration-200 animate-in fade-in-50',
                bgOpacity.popover[0.95]
              )}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Buscando en MAL / RAWG...</span>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-destructive">
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
                        'flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors duration-150 active:bg-muted',
                        hoverBgOpacity.muted[0.7]
                      )}
                    >
                      {item.cover_image ? (
                        <img
                          src={item.cover_image}
                          alt={item.title}
                          className="w-7.5 border-border/50 h-10 shrink-0 rounded border object-cover shadow-sm"
                        />
                      ) : (
                        <div className="w-7.5 from-primary/10 to-accent/10 border-border/50 flex h-10 shrink-0 items-center justify-center rounded border bg-gradient-to-br text-[10px] uppercase text-muted-foreground shadow-sm">
                          {item.type[0]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-snug text-foreground">
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'h-4.5 rounded-full px-1.5 py-0 text-[10px] font-medium leading-none text-accent-foreground',
                              bgOpacity.accent[0.3]
                            )}
                          >
                            {item.type === 'game'
                              ? 'Videojuego'
                              : item.type === 'anime'
                                ? 'Anime'
                                : 'Manga'}
                          </Badge>
                          {item.year && (
                            <span className="text-[11px] text-muted-foreground">{item.year}</span>
                          )}
                          <span className="text-muted-foreground/60 ml-auto text-[9px] italic">
                            {item.source}
                          </span>
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
        <div className="border-primary/20 bg-primary/5 flex items-center justify-between rounded-lg border p-3 text-sm duration-200 animate-in fade-in-50">
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <p className="min-w-0 truncate font-medium text-foreground">
              Autocompletado desde catálogo ({selectedItem?.source || 'MAL/RAWG'})
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {isGameDetailLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
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
