import { useState } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { getCroppedImage } from '@/utils/crop-image'

interface ImageCropperProps {
  imageSrc: string
  open: boolean
  fileName?: string
  aspect?: number
  onConfirm: (croppedFile: File) => void
  onCancel: () => void
}

export function ImageCropper({
  imageSrc,
  open,
  fileName,
  aspect = 3 / 4,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = (_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    try {
      setIsProcessing(true)
      const croppedFile = await getCroppedImage(imageSrc, croppedAreaPixels, fileName)
      onConfirm(croppedFile)
    } catch (error) {
      console.error('Error recortando la imagen:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Ajustar imagen de portada</AlertDialogTitle>
          <AlertDialogDescription>
            Arrastra la imagen y usa el control de zoom para encuadrar la portada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Contenedor del cropper */}
        <div className="relative h-80 w-full overflow-hidden rounded-md border border-border bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            classes={{
              containerClassName: 'bg-muted',
            }}
          />
        </div>

        {/* Control de zoom */}
        <div className="mt-2 space-y-1.5">
          <label htmlFor="zoom-range" className="text-xs font-medium text-muted-foreground">
            Zoom: {zoom.toFixed(1)}x
          </label>
          <input
            id="zoom-range"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
          />
        </div>

        <AlertDialogFooter className="mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? 'Procesando...' : 'Aplicar recorte'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
