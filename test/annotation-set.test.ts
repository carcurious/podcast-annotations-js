import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { AnnotationOverlay } from '../src/annotation-overlay.js'
import { enrichAnnotationsWithTiming } from '../src/timing.js'
import type { AnnotationSet } from '../src/types.js'

const examplePath = resolve(__dirname, '../examples/everyday-driver-episode-1013.annotations.json')
const exampleData: AnnotationSet = JSON.parse(readFileSync(examplePath, 'utf-8'))

describe('Real annotation set (Everyday Driver ep 1013)', () => {
  it('has valid top-level structure', () => {
    expect(exampleData.version).toBe('1.2.0')
    expect(exampleData.episode).toBeDefined()
    expect(exampleData.episode!.title).toBeTruthy()
    expect(exampleData.episode!.audioUrl).toMatch(/^https:\/\//)
    expect(exampleData.speakers).toBeDefined()
    expect(exampleData.speakers!.length).toBeGreaterThan(0)
    expect(exampleData.annotations.length).toBeGreaterThan(0)
  })

  it('accepts episode.description as optional field', () => {
    const withDescription: AnnotationSet = {
      ...exampleData,
      episode: {
        ...exampleData.episode,
        description: 'Paul and Todd discuss cars that need a comeback, starting with models A through M.'
      }
    }
    expect(withDescription.episode!.description).toBe(
      'Paul and Todd discuss cars that need a comeback, starting with models A through M.'
    )
  })

  it('speakers have required fields', () => {
    for (const speaker of exampleData.speakers!) {
      expect(speaker.id).toBeTruthy()
      expect(speaker.name).toBeTruthy()
    }
  })

  it('all annotations have valid time ranges', () => {
    for (const a of exampleData.annotations) {
      expect(a.startTime).toBeTypeOf('number')
      expect(a.endTime).toBeTypeOf('number')
      expect(a.endTime).toBeGreaterThanOrEqual(a.startTime)
      expect(a.startTime).toBeGreaterThanOrEqual(0)
    }
  })

  it('all annotations have type and title', () => {
    for (const a of exampleData.annotations) {
      expect(a.type).toBeTruthy()
      expect(a.title).toBeTruthy()
    }
  })

  it('annotations are sorted by startTime', () => {
    for (let i = 1; i < exampleData.annotations.length; i++) {
      expect(exampleData.annotations[i].startTime)
        .toBeGreaterThanOrEqual(exampleData.annotations[i - 1].startTime)
    }
  })

  it('contains expected entity types', () => {
    const types = new Set(exampleData.annotations.map(a => a.type))
    expect(types.has('car')).toBe(true)
    expect(types.has('term')).toBe(true)
  })

  it('enriches without errors', () => {
    const enriched = enrichAnnotationsWithTiming(exampleData.annotations)
    expect(enriched.length).toBe(exampleData.annotations.length)

    for (const e of enriched) {
      expect(e.id).toBeDefined()
      expect(e.triggerStartTime).toBeLessThanOrEqual(e.startTime)
      expect(e.displayEndTime).toBeGreaterThanOrEqual(e.endTime)
    }
  })

  it('works with AnnotationOverlay', () => {
    const audio = {
      currentTime: 0,
      addEventListener: () => {},
      removeEventListener: () => {}
    }

    const overlay = new AnnotationOverlay(audio as any, {
      annotations: exampleData.annotations
    })

    expect(overlay.annotations.length).toBe(113)

    // Query at mid-episode — should find something
    const mid = overlay.queryAtTime(3000)
    expect(mid.current !== null || mid.upcoming.length > 0).toBe(true)
  })
})
