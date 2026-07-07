import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { getCoverImageUrl } from '@/utils/cover-image-url'
import {
  EntryFormFields,
  entryFormSchema,
  ImageUploader,
  validateImageFile,
  type EntryFormValues,
} from '@/components/shared/entry-form'
import type { EntryResponse } from '@/types'

export interface EntryEditFormProps {
  entry: EntryResponse
  onSubmit: (values: EntryFormValues, coverImage: File | null, keepCoverImage: boolean) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
}

export function EntryEditForm({ entry, onSubmit, onCancel, isSubmitting }: EntryEditFormProps) {
  const [keepCoverImage, setKeepCoverImage] = useState(true)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const coverUrl = getCoverImageUrl(entry.cover_image)

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      title: entry.title,
      type: entry.type,
      status: entry.status,
      rating: entry.rating?.toString() ?? '',
      year: entry.year?.toString() ?? '',
      notes: entry.notes ?? '',
    },
  })

  // Permite restablecer si cambian las props
  useEffect(() => {
    form.reset({
      title: entry.title,
      type: entry.type,
      status: entry.status,
      rating: entry.rating?.toString() ?? '',
      year: entry.year?.toString() ?? '',
      notes: entry.notes ?? '',
    })
    setKeepCoverImage(true)
    setSelectedImage(null)
    setImageError(null)
  }, [entry, form])

  function handleImageChange(file: File | null) {
    const validationError = validateImageFile(file)
    setImageError(validationError)
    setSelectedImage(validationError ? null : file)
  }

  function handleRemoveImage() {
    setKeepCoverImage(false)
    setSelectedImage(null)
    setImageError(null)
  }

  function handleCancel(): void {
    if (form.formState.isDirty || selectedImage !== null || !keepCoverImage) {
      const confirmed = window.confirm(
        'Tienes cambios sin guardar. ¿Seguro que quieres cancelar?'
      )
      if (!confirmed) {
        return
      }
    }
    onCancel()
  }

  async function handleSubmitForm(values: EntryFormValues) {
    const validationError = validateImageFile(selectedImage)
    if (validationError) {
      setImageError(validationError)
      return
    }
    await onSubmit(values, selectedImage, keepCoverImage)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar entrada</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-4">
            <EntryFormFields />
            <ImageUploader
              currentImageUrl={keepCoverImage ? coverUrl : null}
              selectedImage={selectedImage}
              onChange={handleImageChange}
              onRemove={handleRemoveImage}
              error={imageError}
              allowChange
            />
            {!keepCoverImage && selectedImage === null && (
              <p className="text-sm text-muted-foreground">
                La imagen actual se eliminará al guardar.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
