import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDevices, useGeneratePairingCode, useRevokeDevice } from '@/hooks/use-devices'
import { useToast } from '@/hooks/use-toast'
import {
  clearCompanionToken,
  companionStatusFromPing,
  getCompanionStoreUrl,
  pingCompanion,
  type CompanionInstallStatus,
} from '@/utils/companion-extension'

const EXTENSION_DOWNLOAD_URL = '/extension/glyphlog-companion.zip'

export function DeviceManager() {
  const { data: devices, isLoading, error, refetch } = useDevices()
  const generateMutation = useGeneratePairingCode()
  const revokeMutation = useRevokeDevice()
  const { toast } = useToast()

  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [deviceToRevoke, setDeviceToRevoke] = useState<string | null>(null)
  const [companionStatus, setCompanionStatus] = useState<CompanionInstallStatus>('checking')
  const storeUrl = getCompanionStoreUrl()

  useEffect(() => {
    let cancelled = false
    pingCompanion()
      .then((ping) => {
        if (!cancelled) {
          setCompanionStatus(companionStatusFromPing(ping))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompanionStatus('missing')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPairingCode(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const handleGenerateCode = async () => {
    try {
      const res = await generateMutation.mutateAsync()
      setPairingCode(res.pairing_code)
      setTimeLeft(res.expires_in)
      toast({
        title: 'Código generado',
        description: 'Introduce este código en la extensión GlyphLog Companion.',
      })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo generar el código.'
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      })
    }
  }

  const handleConfirmRevoke = async () => {
    if (!deviceToRevoke) return

    try {
      await revokeMutation.mutateAsync(deviceToRevoke)
      await clearCompanionToken()
      const ping = await pingCompanion()
      setCompanionStatus(companionStatusFromPing(ping))
      toast({
        title: 'Dispositivo revocado',
        description: 'La extensión ha sido desvinculada. Vuelve a emparejarla con un código nuevo.',
      })
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'No se pudo revocar el dispositivo.'
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setDeviceToRevoke(null)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          <span>Dispositivos emparejados</span>
          <Button
            onClick={handleGenerateCode}
            disabled={generateMutation.isPending}
            size="sm"
          >
            {generateMutation.isPending ? 'Generando...' : 'Emparejar nuevo dispositivo'}
          </Button>
        </CardTitle>
        <CardDescription>
          Gestiona las extensiones y aplicaciones externas vinculadas a tu cuenta de GlyphLog.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <CompanionGuide
          status={companionStatus}
          storeUrl={storeUrl}
          onPair={handleGenerateCode}
          pairingPending={generateMutation.isPending}
        />

        {pairingCode && (
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-center space-y-2">
            <p className="text-sm font-medium text-primary">
              Código de emparejamiento (expira en {formatTime(timeLeft)})
            </p>
            <div className="text-3xl font-mono font-bold tracking-widest text-primary">
              {pairingCode}
            </div>
            <p className="text-xs text-muted-foreground">
              Abre GlyphLog Companion e introduce este código de 6 caracteres. No copies el token de sesión de GlyphLog.
            </p>
          </div>
        )}

        {/* Devices list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Cargando dispositivos...</p>
        ) : error ? (
          <p className="text-sm text-destructive py-4 text-center">
            Error al cargar dispositivos.{' '}
            <button className="underline" onClick={() => refetch()}>
              Reintentar
            </button>
          </p>
        ) : !devices || devices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            {companionStatus === 'paired'
              ? 'Companion está emparejada en este navegador. Si revocas el acceso, genera un código nuevo para volver a vincularla.'
              : 'No tienes ningún dispositivo emparejado.'}
          </p>
        ) : (
          <div className="divide-y divide-border rounded-lg border">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{device.device_name}</span>
                    {device.is_revoked ? (
                      <Badge variant="destructive">Revocado</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                        Activo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Último uso:{' '}
                    {device.last_used_at
                      ? new Date(device.last_used_at).toLocaleString('es-ES')
                      : 'Nunca'}
                  </p>
                </div>

                {!device.is_revoked && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeviceToRevoke(device.id)}
                  >
                    Revocar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Confirmation dialog for revocation */}
      <AlertDialog open={!!deviceToRevoke} onOpenChange={() => setDeviceToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar acceso al dispositivo?</AlertDialogTitle>
            <AlertDialogDescription>
              La extensión vinculada dejará de tener acceso a tu colección inmediatamente. Tendrás que emparejarla de nuevo si quieres volver a usarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleConfirmRevoke}
            >
              Sí, revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function CompanionGuide({
  status,
  storeUrl,
  onPair,
  pairingPending,
}: {
  status: CompanionInstallStatus
  storeUrl: string
  onPair: () => void
  pairingPending: boolean
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <div className="flex items-start gap-4">
        <span className="text-2xl select-none">⬡</span>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">GlyphLog Companion</p>
          <p className="text-xs text-muted-foreground">{statusLabel(status)}</p>
        </div>
      </div>

      {status === 'missing' && <InstallSteps storeUrl={storeUrl} />}

      {status === 'unpaired' && (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            Companion ya está instalada. Pulsa <strong>Emparejar</strong>, copia el código de 6 caracteres y pégalo en el popup. No uses el token de sesión de GlyphLog.
          </p>
          <Button size="sm" onClick={onPair} disabled={pairingPending}>
            {pairingPending ? 'Generando...' : 'Emparejar'}
          </Button>
        </div>
      )}

      {status === 'paired' && (
        <p className="text-xs text-muted-foreground">
          Para actualizar la instalación desde zip, recarga la extensión en chrome://extensions o brave://extensions. Si usas la Store, se actualizará sola. Revocar aquí desvincula el acceso de inmediato.
        </p>
      )}

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">Guía de Companion</summary>
        <div className="mt-2 space-y-2">
          <p>
            <strong>Requisitos:</strong> Chrome o Brave. Edge Chromium también funciona. Firefox y Safari no están soportados.
          </p>
          <p>
            <strong>Emparejar:</strong> genera un código de 6 caracteres (caduca en 5 minutos), ábrelo en el popup y confírmalo. Nunca copies el JWT ni el token de sesión.
          </p>
          <p>
            <strong>Permisos:</strong> guarda un token de dispositivo en el navegador, habla con la API de GlyphLog y lee Crunchyroll, AnimeFLV y MangaDex para detectar el título o capítulo. No ve el resto de tu navegación.
          </p>
          <p>
            <strong>Actualizar:</strong> la Store se actualiza sola. Con el zip, vuelve a cargar la carpeta descomprimida en chrome://extensions o brave://extensions.
          </p>
          <p>
            <strong>Revocar:</strong> usa Revocar en esta lista. Companion volverá a pedir un código nuevo.
          </p>
          <p>
            <strong>Problemas:</strong> si el código caduca, genera otro. Si la API no responde, revisa tu conexión en el popup. Si revocaste el dispositivo, empareja de nuevo.
          </p>
        </div>
      </details>
    </div>
  )
}

function InstallSteps({ storeUrl }: { storeUrl: string }) {
  return (
    <div className="space-y-3 text-xs text-muted-foreground">
      <p>
        Instala Companion en Chrome o Brave y luego empareja con un código. Firefox y Safari no están soportados.
      </p>
      <div className="flex flex-wrap gap-2">
        {storeUrl ? (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm">Añadir a Chrome</Button>
          </a>
        ) : null}
        <a href={EXTENSION_DOWNLOAD_URL} download="glyphlog-companion.zip">
          <Button variant={storeUrl ? 'outline' : 'default'} size="sm">
            Descargar extensión
          </Button>
        </a>
      </div>
      <ol className="list-decimal space-y-1 pl-4">
        <li>Descarga el zip y descomprímelo en una carpeta.</li>
        <li>Abre chrome://extensions o brave://extensions.</li>
        <li>Activa Modo de desarrollador.</li>
        <li>Pulsa Cargar descomprimida y elige esa carpeta.</li>
        <li>Vuelve aquí y pulsa Emparejar nuevo dispositivo.</li>
      </ol>
    </div>
  )
}

function statusLabel(status: CompanionInstallStatus): string {
  if (status === 'checking') {
    return 'Comprobando si Companion está instalada…'
  }
  if (status === 'missing') {
    return 'No está instalada en este navegador. Sigue los pasos para instalarla.'
  }
  if (status === 'unpaired') {
    return 'Instalada. Emparéjala con un código de 6 caracteres.'
  }
  return 'Instalada y emparejada en este navegador.'
}
