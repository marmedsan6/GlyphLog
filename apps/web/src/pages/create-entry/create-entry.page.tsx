import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createEntry } from '@/services/entry.service'
import type { EntryType, EntryStatus } from '@/types'

const STATUS_LABELS: Record<EntryType, Record<EntryStatus, string>> = {
  anime: {
    watching: 'Viendo',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo ver',
  },
  manga: {
    watching: 'Leyendo',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo leer',
  },
  game: {
    watching: 'Jugando',
    completed: 'Completado',
    on_hold: 'Pausado',
    dropped: 'Abandonado',
    plan_to_watch: 'Planeo jugar',
  },
}

export function CreateEntryPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EntryType>('anime')
  const [status, setStatus] = useState<EntryStatus>('watching')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [rating, setRating] = useState<string>('')
  const [year, setYear] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Liberar el ObjectURL cuando el componente se desmonta o la imagen cambia,
  // para evitar fugas de memoria en el browser.
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  // Resetear estado a "watching" cuando cambia el tipo,
  // para mantener coherencia con las labels traducidas.
  function handleTypeChange(newType: EntryType) {
    setType(newType)
    setStatus('watching')
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setCoverImage(file)
    if (file) {
      setImagePreview(URL.createObjectURL(file))
    } else {
      setImagePreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }

    if (rating !== '') {
      const ratingNum = parseFloat(rating)
      if (isNaN(ratingNum) || ratingNum < 1.0 || ratingNum > 10.0) {
        setError('La puntuación debe estar entre 1.0 y 10.0')
        return
      }
    }

    if (year !== '') {
      const yearNum = parseInt(year, 10)
      if (isNaN(yearNum) || yearNum < 1950 || yearNum > 2100) {
        setError('El año debe estar entre 1950 y 2100')
        return
      }
    }

    if (notes.length > 5000) {
      setError('Las notas no pueden superar los 5000 caracteres')
      return
    }

    if (coverImage) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(coverImage.type)) {
        setError('La imagen debe ser JPG, PNG o WebP')
        return
      }
      if (coverImage.size > 5 * 1024 * 1024) {
        setError('La imagen no puede superar los 5MB')
        return
      }
    }

    setIsLoading(true)
    try {
      await createEntry({
        title: title.trim(),
        type,
        status,
        rating: rating !== '' ? parseFloat(rating) : null,
        year: year !== '' ? parseInt(year, 10) : null,
        notes: notes.trim() || null,
        cover_image: coverImage,
      })
      navigate('/collection')
    } catch (err) {
      if (isAxiosError(err) && err.response) {
        const { data } = err.response
        if (typeof data.detail === 'string') {
          setError(data.detail)
        } else {
          setError('Error inesperado. Inténtalo de nuevo.')
        }
      } else {
        setError('Error inesperado. Inténtalo de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">Nueva entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: One Piece, Elden Ring..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as EntryType)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="anime">Anime</option>
                <option value="manga">Manga</option>
                <option value="game">Videojuego</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EntryStatus)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                {Object.entries(STATUS_LABELS[type]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sección de campos opcionales */}
            <div className="border-t border-border pt-4 mt-2">
              <p className="text-sm text-muted-foreground mb-3">Campos opcionales</p>

              <div className="space-y-4">
                {/* Rating */}
                <div className="space-y-2">
                  <Label htmlFor="rating">Puntuación (1.0 - 10.0)</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="10.0"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    placeholder="Ej: 8.5"
                  />
                </div>

                {/* Year */}
                <div className="space-y-2">
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1950"
                    max="2100"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Ej: 2024"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="notes">Notas</Label>
                    <span className="text-xs text-muted-foreground">{notes.length}/5000</span>
                  </div>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={5000}
                    rows={4}
                    placeholder="Tus notas sobre esta entrada..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                  />
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label htmlFor="cover_image">Imagen de portada (JPG, PNG o WebP, máx. 5MB)</Label>
                  <Input
                    id="cover_image"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleImageChange}
                  />
                  {imagePreview && (
                    <div className="relative mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-md border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => { setCoverImage(null); setImagePreview(null) }}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Creando...' : 'Crear entrada'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/collection')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
