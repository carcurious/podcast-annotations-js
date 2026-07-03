import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { enrichAnnotationsWithTiming } from '../src/timing.js'
import type { AnnotationSet } from '../src/types.js'

const examplesDir = resolve(__dirname, '../examples')
const exampleFiles = readdirSync(examplesDir)
  .filter(f => f.endsWith('.annotations.json'))
  .map(f => ({
    name: f.replace('.annotations.json', ''),
    data: JSON.parse(readFileSync(resolve(examplesDir, f), 'utf-8')) as AnnotationSet
  }))

describe.each(exampleFiles)('Example: $name', ({ data }) => {
  it('has valid top-level structure', () => {
    expect(data.version).toBe('1.1.0')
    expect(data.episode).toBeDefined()
    expect(data.episode!.title).toBeTruthy()
    expect(data.annotations).toBeInstanceOf(Array)
    expect(data.annotations.length).toBeGreaterThan(0)
  })

  it('speakers have required fields', () => {
    if (!data.speakers) return
    for (const speaker of data.speakers) {
      expect(speaker.id).toBeTruthy()
      expect(speaker.name).toBeTruthy()
    }
  })

  it('all annotations have valid time ranges', () => {
    for (const a of data.annotations) {
      expect(a.startTime).toBeTypeOf('number')
      expect(a.endTime).toBeTypeOf('number')
      expect(a.endTime).toBeGreaterThanOrEqual(a.startTime)
      expect(a.startTime).toBeGreaterThanOrEqual(0)
    }
  })

  it('all annotations have type and title', () => {
    for (const a of data.annotations) {
      expect(a.type).toBeTruthy()
      expect(a.title).toBeTruthy()
    }
  })

  it('annotations are sorted by startTime', () => {
    for (let i = 1; i < data.annotations.length; i++) {
      expect(data.annotations[i].startTime)
        .toBeGreaterThanOrEqual(data.annotations[i - 1].startTime)
    }
  })

  it('enriches without errors', () => {
    const enriched = enrichAnnotationsWithTiming(data.annotations)
    expect(enriched.length).toBe(data.annotations.length)

    for (const e of enriched) {
      expect(e.id).toBeDefined()
      expect(e.triggerStartTime).toBeLessThanOrEqual(e.startTime)
      expect(e.displayEndTime).toBeGreaterThanOrEqual(e.endTime)
    }
  })
})
