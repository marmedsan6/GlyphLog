import { describe, it, expect } from 'vitest'
import { getQuickProgressAction } from './quick-progress'
import type { EntryListItem } from '@/types'

describe('getQuickProgressAction', () => {
  const createMockEntry = (overrides: Partial<EntryListItem>): EntryListItem => ({
    id: 'mock-uuid',
    title: 'Test Entry',
    type: 'anime',
    status: 'watching',
    rating: null,
    cover_image: null,
    progress_unit: 'episodes',
    progress_total: 12,
    current_progress: 5,
    created_at: new Date().toISOString(),
    ...overrides,
  })

  it('debería retornar no disponible si progress_unit es nulo', () => {
    const entry = createMockEntry({ progress_unit: null })
    const result = getQuickProgressAction(entry)
    expect(result.available).toBe(false)
  })

  it('debería retornar no disponible si el estado es completed o dropped', () => {
    const completedEntry = createMockEntry({ status: 'completed' })
    const droppedEntry = createMockEntry({ status: 'dropped' })

    expect(getQuickProgressAction(completedEntry).available).toBe(false)
    expect(getQuickProgressAction(droppedEntry).available).toBe(false)
  })

  it('debería calcular +1 para episodios de anime y clampear al total', () => {
    const entry = createMockEntry({
      type: 'anime',
      progress_unit: 'episodes',
      current_progress: 11,
      progress_total: 12,
    })
    const result = getQuickProgressAction(entry)

    expect(result.available).toBe(true)
    expect(result.newValue).toBe(12)
    expect(result.reachesTotal).toBe(true)
    expect(result.label).toBe('+1 ep.')
    expect(result.progressText).toBe('11/12 ep.')
  })

  it('debería calcular +1 para capítulos de manga', () => {
    const mangaCap = createMockEntry({
      type: 'manga',
      progress_unit: 'chapters',
      current_progress: 20,
      progress_total: null,
    })

    const resCap = getQuickProgressAction(mangaCap)
    expect(resCap.available).toBe(true)
    expect(resCap.newValue).toBe(21)
    expect(resCap.reachesTotal).toBe(false)
    expect(resCap.label).toBe('+1 cap.')
    expect(resCap.progressText).toBe('20/— cap.')
  })

  it('debería calcular +0.5h para videojuegos', () => {
    const gameHours = createMockEntry({
      type: 'game',
      progress_unit: 'hours',
      current_progress: 1.5,
      progress_total: null,
    })
    const result = getQuickProgressAction(gameHours)

    expect(result.available).toBe(true)
    expect(result.newValue).toBe(2)
    expect(result.label).toBe('+0.5 h')
  })

  it('debería clampear al total si el incremento lo supera', () => {
    const gameHours = createMockEntry({
      type: 'game',
      progress_unit: 'hours',
      current_progress: 39.5,
      progress_total: 40,
    })
    const result = getQuickProgressAction(gameHours)

    expect(result.available).toBe(true)
    expect(result.newValue).toBe(40)
    expect(result.reachesTotal).toBe(true)
  })

  it('debería retornar no disponible si el progreso actual ya es igual o mayor al total', () => {
    const entry = createMockEntry({
      current_progress: 12,
      progress_total: 12,
    })
    const result = getQuickProgressAction(entry)
    expect(result.available).toBe(false)
  })
})
