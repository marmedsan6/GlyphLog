import { describe, expect, it } from 'vitest'
import {
  formatRelativeDate,
  formatAbsoluteDate,
  formatDelta,
  formatEventDescription,
} from './progress-history-labels'
import type { ProgressHistoryEvent } from '@/services/entry.service'

describe('progress-history-labels', () => {
  describe('formatRelativeDate', () => {
    const fixedNow = new Date('2026-07-18T12:00:00Z')

    it('returns "hace un momento" for date less than 60 seconds ago', () => {
      const date = new Date('2026-07-18T11:59:45Z').toISOString()
      expect(formatRelativeDate(date, fixedNow)).toBe('hace un momento')
    })

    it('returns "hace 5 minutos" for date 5 minutes ago', () => {
      const date = new Date('2026-07-18T11:55:00Z').toISOString()
      expect(formatRelativeDate(date, fixedNow)).toBe('hace 5 minutos')
    })

    it('returns "hace 1 minuto" for date 1 minute ago', () => {
      const date = new Date('2026-07-18T11:59:00Z').toISOString()
      expect(formatRelativeDate(date, fixedNow)).toBe('hace 1 minuto')
    })

    it('returns "hace 2 horas" for date 2 hours ago', () => {
      const date = new Date('2026-07-18T10:00:00Z').toISOString()
      expect(formatRelativeDate(date, fixedNow)).toBe('hace 2 horas')
    })

    it('returns "hace 3 días" for date 3 days ago', () => {
      const date = new Date('2026-07-15T12:00:00Z').toISOString()
      expect(formatRelativeDate(date, fixedNow)).toBe('hace 3 días')
    })

    it('falls back to formatAbsoluteDate for dates 7+ days ago', () => {
      const date = new Date('2026-07-01T12:00:00Z').toISOString()
      const result = formatRelativeDate(date, fixedNow)
      expect(result).toMatch(/1 jul 2026/)
    })
  })

  describe('formatAbsoluteDate', () => {
    it('formats ISO date to localized string', () => {
      const date = new Date('2026-07-15T14:30:00Z').toISOString()
      const formatted = formatAbsoluteDate(date)
      expect(formatted).toMatch(/15/)
      expect(formatted).toMatch(/jul/)
      expect(formatted).toMatch(/2026/)
    })
  })

  describe('formatDelta', () => {
    it('handles reset event type', () => {
      const result = formatDelta(10, 'reset')
      expect(result.text).toBe('Reinicio')
      expect(result.className).toContain('text-amber')
    })

    it('handles positive delta', () => {
      const result = formatDelta(3, 'update')
      expect(result.text).toBe('+3')
      expect(result.className).toContain('text-emerald')
    })

    it('handles negative delta', () => {
      const result = formatDelta(-2, 'update')
      expect(result.text).toBe('-2')
      expect(result.className).toContain('text-rose')
    })

    it('handles zero delta', () => {
      const result = formatDelta(0, 'update')
      expect(result.text).toBe('0')
      expect(result.className).toContain('text-muted-foreground')
    })

    it('handles null delta', () => {
      const result = formatDelta(null, 'update')
      expect(result.text).toBe('')
    })
  })

  describe('formatEventDescription', () => {
    it('formats reset event', () => {
      const event: ProgressHistoryEvent = {
        id: '1',
        entry_id: 'e1',
        previous_value: 10,
        current_value: 0,
        delta: -10,
        unit: 'episodes',
        recorded_at: new Date().toISOString(),
        note: null,
        source: 'web',
        event_type: 'reset',
        user_id: 'u1',
      }
      expect(formatEventDescription(event)).toBe('Seguimiento reiniciado (episodios 10 → 0)')
    })

    it('formats update event with previous value', () => {
      const event: ProgressHistoryEvent = {
        id: '2',
        entry_id: 'e1',
        previous_value: 5,
        current_value: 8,
        delta: 3,
        unit: 'chapters',
        recorded_at: new Date().toISOString(),
        note: 'Lectura nocturna',
        source: 'web',
        event_type: 'update',
        user_id: 'u1',
      }
      expect(formatEventDescription(event)).toBe('capítulos 5 → 8')
    })
  })
})
