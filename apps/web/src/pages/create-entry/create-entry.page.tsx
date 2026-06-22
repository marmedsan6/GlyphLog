import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { useCreateEntry } from '@/hooks/use-create-entry'
import { getApiErrorMessage } from '@/utils/api-errors'
import {
  EntryFormFields,
  entryFormSchema,
  ImageUploader,
  validateImageFile,
  type EntryFormValues,
} from '@/components/shared/entry-form'

export function CreateEntryPage() {
  const navigate = useNavigate()
  const { mutateAsync: createEntryAsync, isPending, error: mutationError } = useCreateEntry()
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      title: '',
      type: 'anime',
      status: 'watching',
      rating: '',
      year: '',
      notes: '',
    },
  })

  function handleImageChange(file: File | null) {
    const error = validateImageFile(file)
    setImageError(error)
    setCoverImage(error ? null : file)
  }

  async function onSubmit(values: EntryFormValues) {
    setApiError(null)

    const imageValidationError = validateImageFile(coverImage)
    if (imageValidationError) {
      setImageError(imageValidationError)
      return
    }

    try {
      await createEntryAsync({
        title: values.title.trim(),
        type: values.type,
        status: values.status,
        rating: values.rating ? parseFloat(values.rating) : null,
        year: values.year ? parseInt(values.year, 10) : null,
        notes: values.notes?.trim() || null,
        cover_image: coverImage,
      })
      navigate('/collection')
    } catch (err) {
      setApiError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="text-2xl">Nueva entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {(apiError || mutationError) && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {apiError || mutationError?.message}
                </div>
              )}

              <EntryFormFields />
              <ImageUploader
                selectedImage={coverImage}
                onChange={handleImageChange}
                error={imageError}
              />

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={isPending}>
                  {isPending ? 'Creando...' : 'Crear entrada'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/collection')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
