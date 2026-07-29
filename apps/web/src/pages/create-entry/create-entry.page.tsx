import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { useCreateEntry } from '@/hooks/useCreateEntry'
import { getApiErrorMessage } from '@/utils/api-errors'
import {
  EntryFormFields,
  entryFormSchema,
  FIXED_PROGRESS_UNIT,
  ImageUploader,
  validateImageFile,
  ExternalSearchAutocomplete,
  type EntryFormValues,
  type ProgressTotalSource,
} from '@/components/shared/entry-form'

export function CreateEntryPage() {
  const navigate = useNavigate()
  const { mutateAsync: createEntryAsync, isPending, error: mutationError } = useCreateEntry()
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [remoteCoverUrl, setRemoteCoverUrl] = useState<string | null>(null)
  const [isAutocompleted, setIsAutocompleted] = useState(false)
  const [progressTotalSource, setProgressTotalSource] = useState<ProgressTotalSource | null>(null)
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
      progress_total: '',
    },
  })

  function handleImageChange(file: File | null) {
    const error = validateImageFile(file)
    setImageError(error)
    setCoverImage(error ? null : file)
    if (file) {
      setRemoteCoverUrl(null)
    }
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
        progress_unit: FIXED_PROGRESS_UNIT[values.type],
        progress_total: values.progress_total ? parseFloat(values.progress_total) : null,
        cover_image: coverImage || remoteCoverUrl,
      })
      navigate('/collection')
    } catch (err) {
      setApiError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-8">
      <Card className="mx-4 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Nueva entrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {(apiError || mutationError) && (
                <div className="bg-destructive/10 rounded-md p-3 text-sm text-destructive">
                  {apiError || mutationError?.message}
                </div>
              )}

              <ExternalSearchAutocomplete
                onSelectCover={(url) => {
                  setRemoteCoverUrl(url)
                  setCoverImage(null)
                }}
                onClearCover={() => {
                  setRemoteCoverUrl(null)
                  setCoverImage(null)
                }}
                isAutocompleted={isAutocompleted}
                setIsAutocompleted={setIsAutocompleted}
                onProgressTotalSource={setProgressTotalSource}
              />

              <EntryFormFields
                isAutocompleted={isAutocompleted}
                progressTotalSource={progressTotalSource}
                onProgressTotalSource={setProgressTotalSource}
              />

              <ImageUploader
                currentImageUrl={remoteCoverUrl}
                selectedImage={coverImage}
                onChange={handleImageChange}
                onRemove={() => setRemoteCoverUrl(null)}
                error={imageError}
                allowChange={!isAutocompleted}
              />

              <div className="flex gap-2 pt-2">
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
