import { env } from '@/lib/env'

export type CompanionPing = {
  version: string
  paired: boolean
}

export type CompanionInstallStatus = 'checking' | 'missing' | 'unpaired' | 'paired'

const FALLBACK_EXTENSION_ID = 'boehfebkjeecahbomjhbnokjkjnippje'
const PING_TIMEOUT_MS = 1500

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response: unknown) => void
  ) => void
  lastError?: { message: string }
}

export function getCompanionExtensionId(): string {
  return env.companionExtensionId || FALLBACK_EXTENSION_ID
}

export function getCompanionStoreUrl(): string {
  return env.companionStoreUrl
}

function getChromeRuntime(): ChromeRuntime | null {
  const chromeObj = (window as Window & { chrome?: { runtime?: ChromeRuntime } }).chrome
  if (!chromeObj?.runtime?.sendMessage) {
    return null
  }
  return chromeObj.runtime
}

function sendCompanionMessage(message: unknown): Promise<unknown | null> {
  const runtime = getChromeRuntime()
  if (!runtime) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (value: unknown | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const timer = window.setTimeout(() => finish(null), PING_TIMEOUT_MS)

    try {
      runtime.sendMessage(getCompanionExtensionId(), message, (response) => {
        window.clearTimeout(timer)
        if (runtime.lastError) {
          finish(null)
          return
        }
        finish(response ?? null)
      })
    } catch {
      window.clearTimeout(timer)
      finish(null)
    }
  })
}

export async function pingCompanion(): Promise<CompanionPing | null> {
  const response = await sendCompanionMessage({ type: 'GLYPHLOG_PING' })
  if (!response || typeof response !== 'object') {
    return null
  }
  const data = response as { version?: unknown; paired?: unknown }
  if (typeof data.version !== 'string' || typeof data.paired !== 'boolean') {
    return null
  }
  return { version: data.version, paired: data.paired }
}

export async function clearCompanionToken(): Promise<boolean> {
  const response = await sendCompanionMessage({ type: 'GLYPHLOG_CLEAR_TOKEN' })
  if (!response || typeof response !== 'object') {
    return false
  }
  return (response as { ok?: unknown }).ok === true
}

export function companionStatusFromPing(ping: CompanionPing | null): Exclude<
  CompanionInstallStatus,
  'checking'
> {
  if (!ping) return 'missing'
  return ping.paired ? 'paired' : 'unpaired'
}
