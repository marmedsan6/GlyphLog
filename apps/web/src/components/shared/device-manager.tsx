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

const EXTENSION_DOWNLOAD_URL = '/extension/glyphlog-companion.zip'

export function DeviceManager() {
  const { data: devices, isLoading, error, refetch } = useDevices()
  const generateMutation = useGeneratePairingCode()
  const revokeMutation = useRevokeDevice()
  const { toast } = useToast()

  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [deviceToRevoke, setDeviceToRevoke] = useState<string | null>(null)

  // Countdown timer for pairing code (5 minutes)
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
      toast({
        title: 'Dispositivo revocado',
        description: 'La extensión ha sido desvinculada correctamente.',
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
        {/* Extension download banner */}
        <div className="rounded-lg border bg-muted/40 p-4 flex items-start gap-4">
          <span className="text-2xl select-none">⬡</span>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">GlyphLog Companion — Extensión de Chrome</p>
            <p className="text-xs text-muted-foreground">
              Registra animes y actualiza tu progreso directamente desde Crunchyroll, AnimeFLV y MangaDex.
            </p>
          </div>
          <a
            href={EXTENSION_DOWNLOAD_URL}
            download="glyphlog-companion.zip"
            className="shrink-0"
          >
            <Button variant="outline" size="sm">
              Descargar extensión
            </Button>
          </a>
        </div>
        {/* Pairing code alert banner — aparece al generar código */}
        {pairingCode && (
          <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-center space-y-2">
            <p className="text-sm font-medium text-primary">
              Código de emparejamiento (expira en {formatTime(timeLeft)})
            </p>
            <div className="text-3xl font-mono font-bold tracking-widest text-primary">
              {pairingCode}
            </div>
            <p className="text-xs text-muted-foreground">
              Abre la extensión de Chrome e introduce este código para finalizar la vinculación.
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
            No tienes ningún dispositivo emparejado.
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
