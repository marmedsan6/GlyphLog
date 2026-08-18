import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Pencil, Trash2, Upload } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ImageCropper } from '@/components/shared/entry-form/image-cropper'
import { ProfileAvatar } from '@/components/shared/profile-avatar'
import { DeviceManager } from '@/components/shared/device-manager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProfile, useUpdateProfile, useUploadAvatar, useDeleteAvatar } from '@/hooks/useProfile'
import { useToast } from '@/hooks/use-toast'
import { validateAvatarFile } from '@/utils/avatar-validation'
import { getApiErrorMessage } from '@/utils/api-errors'

export function ProfilePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: profile, isLoading, isError, error, refetch } = useProfile()
  const updateProfile = useUpdateProfile()
  const uploadAvatar = useUploadAvatar()
  const deleteAvatar = useDeleteAvatar()

  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [tempFileName, setTempFileName] = useState('')
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '')
      setBio(profile.bio ?? '')
    }
  }, [profile])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="border-destructive/50 bg-destructive/10 rounded-md border p-8 text-center">
        <p className="mb-4 text-destructive">{error?.message || 'No se pudo cargar el perfil.'}</p>
        <Button type="button" variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const displayName = profile.username || profile.email

  function handleEditToggle() {
    setIsEditing((prev) => !prev)
    if (isEditing && profile) {
      // Restaurar valores originales al cancelar.
      setUsername(profile.username ?? '')
      setBio(profile.bio ?? '')
    }
  }

  async function handleSaveProfile(event: React.FormEvent) {
    event.preventDefault()

    const trimmedUsername = username.trim() || null
    const trimmedBio = bio.trim() || null

    updateProfile.mutate(
      {
        username: trimmedUsername,
        bio: trimmedBio,
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          toast({ title: 'Perfil actualizado', description: 'Tus cambios se han guardado.' })
        },
        onError: (err) => {
          toast({
            title: 'Error al guardar',
            description: getApiErrorMessage(err),
            variant: 'destructive',
          })
        },
      }
    )
  }

  function handleFileChange(file: File | null) {
    setAvatarError(null)
    if (!file) return

    const validationError = validateAvatarFile(file)
    if (validationError) {
      setAvatarError(validationError)
      return
    }

    setTempFileName(file.name)
    setCropperSrc(URL.createObjectURL(file))
  }

  function handleCropperConfirm(croppedFile: File) {
    if (cropperSrc) {
      URL.revokeObjectURL(cropperSrc)
      setCropperSrc(null)
    }

    uploadAvatar.mutate(croppedFile, {
      onSuccess: () => {
        toast({ title: 'Avatar actualizado' })
      },
      onError: (err) => {
        toast({
          title: 'Error al subir avatar',
          description: getApiErrorMessage(err),
          variant: 'destructive',
        })
      },
    })
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

  function handleDeleteAvatar() {
    deleteAvatar.mutate(undefined, {
      onSuccess: () => {
        toast({ title: 'Avatar eliminado' })
      },
      onError: (err) => {
        toast({
          title: 'Error al eliminar avatar',
          description: getApiErrorMessage(err),
          variant: 'destructive',
        })
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="outline" onClick={() => navigate('/collection')}>
        Volver a la colección
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Mi perfil</CardTitle>
          <CardDescription>Gestiona tu información pública en GlyphLog.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative">
              <ProfileAvatar avatarUrl={profile.avatar_url} displayName={displayName} size="lg" />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="hover:bg-primary/90 absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-sm"
                aria-label="Cambiar avatar"
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploadAvatar.isPending}
              >
                <Camera className="mr-2 h-4 w-4" />
                Cambiar avatar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeleteAvatar}
                disabled={deleteAvatar.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar avatar
              </Button>
            </div>
          </div>
          {avatarError && <p className="text-sm text-destructive">{avatarError}</p>}

          {/* Información */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tu username público"
                  minLength={3}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  3-20 caracteres. Letras, números y guiones bajos.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Cuéntanos sobre ti..."
                  maxLength={500}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">{bio.length}/500</p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar cambios
                </Button>
                <Button type="button" variant="outline" onClick={handleEditToggle}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                <p className="text-base">{profile.email}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Nombre de usuario</h3>
                <p className="text-base">
                  {profile.username || (
                    <span className="italic text-muted-foreground">Sin configurar</span>
                  )}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                <p className="whitespace-pre-wrap text-base">
                  {profile.bio || <span className="italic text-muted-foreground">Sin bio</span>}
                </p>
              </div>

              <Button type="button" onClick={handleEditToggle}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar perfil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          open={cropperSrc !== null}
          fileName={tempFileName}
          aspect={1}
          onConfirm={handleCropperConfirm}
          onCancel={handleCropperCancel}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Importaciones</CardTitle>
          <CardDescription>Importa tu lista desde MyAnimeList, AniList u otras fuentes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/import">
              <Upload className="mr-2 h-4 w-4" />
              Importar entradas
            </Link>
          </Button>
        </CardContent>
      </Card>

      <DeviceManager />
    </div>
  )
}
