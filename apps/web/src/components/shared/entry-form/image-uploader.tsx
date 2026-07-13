import { useEffect, useState, useRef } from 'react'
import { ImageOff, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ImageCropper } from './image-cropper'

export interface ImageUploaderProps {
  currentImageUrl?: string | null
  selectedImage?: File | null
  onChange?: (file: File | null) => void
  onRemove?: () => void
  error?: string | null
  allowChange?: boolean
}

export function ImageUploader({
  currentImageUrl,
  selectedImage,
  onChange,
  onRemove,
  error,
  allowChange = true,
}: ImageUploaderProps) {
  const [newPreview, setNewPreview] = useState<string | null>(null)
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [tempFileName, setTempFileName] = useState<string>('cover.jpg')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasImage = Boolean(currentImageUrl) || Boolean(selectedImage)
  const previewUrl = newPreview || currentImageUrl || null

  // Liberar ObjectURL de la nueva imagen para evitar fugas de memoria.
  useEffect(() => {
    return () => {
      if (newPreview) {
        URL.revokeObjectURL(newPreview)
      }
    }
  }, [newPreview])

  // Sincronizar preview cuando cambia la imagen seleccionada desde fuera.
  useEffect(() => {
    if (selectedImage && selectedImage !== null) {
      setNewPreview(URL.createObjectURL(selectedImage))
    } else {
      setNewPreview(null)
    }
  }, [selectedImage])

  function handleFileChange(file: File | null) {
    if (file) {
      setTempFileName(file.name)
      const objectUrl = URL.createObjectURL(file)
      setCropperSrc(objectUrl)
    } else {
      onChange?.(null)
    }
  }

  function handleCropperConfirm(croppedFile: File) {
    if (cropperSrc) {
      URL.revokeObjectURL(cropperSrc)
      setCropperSrc(null)
    }
    onChange?.(croppedFile)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function handleCropperCancel() {
    if (cropperSrc) {
      URL.revokeObjectURL(cropperSrc)
      setCropperSrc(null)
    }
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function handleRemove() {
    setNewPreview(null)
    onRemove?.()
  }

  function handleClear() {
    if (newPreview) {
      handleFileChange(null)
    } else {
      handleRemove()
    }
  }

  const showClearButton = (allowChange && hasImage) || (onRemove && !allowChange)

  return (
    <div className="space-y-2">
      <label
        htmlFor="cover_image"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Imagen de portada (JPG, PNG o WebP, máx. 5MB)
      </label>

      {allowChange && (
        <Input
          ref={inputRef}
          id="cover_image"
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          data-testid="cover-image-input"
        />
      )}

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {hasImage && previewUrl ? (
        <div className="relative mt-2">
          <img
            src={previewUrl}
            alt="Portada"
            className="w-full h-40 object-cover rounded-md border border-border"
          />
          {showClearButton && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleClear}
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              aria-label={newPreview ? 'Quitar imagen seleccionada' : 'Eliminar imagen de portada'}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted text-muted-foreground">
          <ImageOff className="h-10 w-10" />
          <span className="text-xs">Sin imagen</span>
        </div>
      )}

      {cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          open={cropperSrc !== null}
          fileName={tempFileName}
          onConfirm={handleCropperConfirm}
          onCancel={handleCropperCancel}
        />
      )}
    </div>
  )
}
