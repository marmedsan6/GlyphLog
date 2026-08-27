import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCompanionToken,
  companionStatusFromPing,
  pingCompanion,
} from './companion-extension'

type RuntimeMock = {
  sendMessage: ReturnType<typeof vi.fn>
  lastError?: { message: string }
}

function mockChromeRuntime(runtime: RuntimeMock | null) {
  Object.defineProperty(window, 'chrome', {
    configurable: true,
    writable: true,
    value: runtime ? { runtime } : undefined,
  })
}

describe('companionStatusFromPing', () => {
  it('es missing si no hay respuesta', () => {
    expect(companionStatusFromPing(null)).toBe('missing')
  })

  it('es unpaired si está instalada sin token', () => {
    expect(companionStatusFromPing({ version: '0.2.0', paired: false })).toBe('unpaired')
  })

  it('es paired si hay token local', () => {
    expect(companionStatusFromPing({ version: '0.2.0', paired: true })).toBe('paired')
  })
})

describe('pingCompanion', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_COMPANION_EXTENSION_ID', 'boehfebkjeecahbomjhbnokjkjnippje')
  })

  afterEach(() => {
    mockChromeRuntime(null)
    vi.unstubAllEnvs()
  })

  it('devuelve null si no existe chrome.runtime', async () => {
    mockChromeRuntime(null)
    await expect(pingCompanion()).resolves.toBeNull()
  })

  it('devuelve null si el mensaje externo falla', async () => {
    const runtime: RuntimeMock = {
      sendMessage: vi.fn((_id, _message, callback: (response: unknown) => void) => {
        runtime.lastError = { message: 'Could not establish connection' }
        callback(undefined)
      }),
    }
    mockChromeRuntime(runtime)
    await expect(pingCompanion()).resolves.toBeNull()
  })

  it('devuelve version y paired cuando Companion responde', async () => {
    const runtime: RuntimeMock = {
      sendMessage: vi.fn((_id, message, callback: (response: unknown) => void) => {
        expect(message).toEqual({ type: 'GLYPHLOG_PING' })
        callback({ version: '0.2.0', paired: false })
      }),
    }
    mockChromeRuntime(runtime)
    await expect(pingCompanion()).resolves.toEqual({ version: '0.2.0', paired: false })
  })
})

describe('clearCompanionToken', () => {
  afterEach(() => {
    mockChromeRuntime(null)
  })

  it('pide borrar el token local y confirma ok', async () => {
    const runtime: RuntimeMock = {
      sendMessage: vi.fn((_id, message, callback: (response: unknown) => void) => {
        expect(message).toEqual({ type: 'GLYPHLOG_CLEAR_TOKEN' })
        callback({ ok: true })
      }),
    }
    mockChromeRuntime(runtime)
    await expect(clearCompanionToken()).resolves.toBe(true)
  })

  it('devuelve false si la extensión no está instalada', async () => {
    mockChromeRuntime(null)
    await expect(clearCompanionToken()).resolves.toBe(false)
  })
})
