import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { groupByEntity } from '../src/digest.js'
import type { Annotation, AnnotationSet } from '../src/types.js'

const a = (overrides: Partial<Annotation> & { startTime: number }): Annotation => ({
  endTime: overrides.startTime + 5,
  ...overrides
})

describe('groupByEntity', () => {
  it('groups repeated mentions by canonicalId', () => {
    const groups = groupByEntity([
      a({ startTime: 10, canonicalId: 'car:toyota:supra', title: '2JZ' }),
      a({ startTime: 50, canonicalId: 'car:toyota:supra', title: '2JZ engine' }),
      a({ startTime: 90, canonicalId: 'person:carroll-shelby', title: 'Carroll Shelby' })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].canonicalId).toBe('car:toyota:supra')
    expect(groups[0].mentions).toBe(2)
    expect(groups[0].startTime).toBe(10)
    expect(groups[1].mentions).toBe(1)
  })

  it('falls back to type plus normalized title without a canonicalId', () => {
    const groups = groupByEntity([
      a({ startTime: 10, type: 'term', title: 'Oversteer' }),
      a({ startTime: 40, type: 'term', title: '  oversteer ' }),
      a({ startTime: 70, type: 'place', title: 'Oversteer' })
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0].mentions).toBe(2)
    expect(groups[0].type).toBe('term')
    expect(groups[1].type).toBe('place')
  })

  it('keeps untitled, unkeyed annotations separate', () => {
    const groups = groupByEntity([a({ startTime: 10 }), a({ startTime: 20 })])
    expect(groups).toHaveLength(2)
  })

  it('takes display fields from the highest-priority member', () => {
    const groups = groupByEntity([
      a({ startTime: 10, canonicalId: 'x', title: 'Early', explanation: 'thin', priority: 0.2 }),
      a({ startTime: 60, canonicalId: 'x', title: 'Best', explanation: 'full', priority: 0.9 })
    ])

    expect(groups[0].title).toBe('Best')
    expect(groups[0].explanation).toBe('full')
    expect(groups[0].representative.priority).toBe(0.9)
    // still deep-links to the first mention
    expect(groups[0].startTime).toBe(10)
  })

  it('breaks priority ties on confidence, then on earliest startTime', () => {
    const byConfidence = groupByEntity([
      a({ startTime: 10, canonicalId: 'x', title: 'Low', priority: 0.5, confidence: 0.3 }),
      a({ startTime: 60, canonicalId: 'x', title: 'High', priority: 0.5, confidence: 0.9 })
    ])
    expect(byConfidence[0].title).toBe('High')

    const byTime = groupByEntity([
      a({ startTime: 60, canonicalId: 'x', title: 'Later', priority: 0.5, confidence: 0.5 }),
      a({ startTime: 10, canonicalId: 'x', title: 'Earlier', priority: 0.5, confidence: 0.5 })
    ])
    expect(byTime[0].title).toBe('Earlier')
  })

  it('falls back to the first member carrying a field', () => {
    const groups = groupByEntity([
      a({ startTime: 10, canonicalId: 'x', title: 'Supra', explanation: 'A Toyota coupe.', image: 'a.jpg' }),
      a({ startTime: 60, canonicalId: 'x', title: 'Supra', priority: 1 })
    ])

    expect(groups[0].representative.startTime).toBe(60)
    expect(groups[0].explanation).toBe('A Toyota coupe.')
    expect(groups[0].image).toBe('a.jpg')
  })

  it('ignores empty strings when falling back', () => {
    const groups = groupByEntity([
      a({ startTime: 10, canonicalId: 'x', title: 'Supra', explanation: '   ', priority: 1 }),
      a({ startTime: 60, canonicalId: 'x', title: 'Supra', explanation: 'A Toyota coupe.' })
    ])
    expect(groups[0].explanation).toBe('A Toyota coupe.')
  })

  it('orders by first mention by default and by size with sortBy: mentions', () => {
    const annotations = [
      a({ startTime: 10, canonicalId: 'once' }),
      a({ startTime: 20, canonicalId: 'twice' }),
      a({ startTime: 30, canonicalId: 'twice' })
    ]

    expect(groupByEntity(annotations).map(g => g.canonicalId)).toEqual(['once', 'twice'])
    expect(groupByEntity(annotations, { sortBy: 'mentions' }).map(g => g.canonicalId))
      .toEqual(['twice', 'once'])
  })

  it('returns an empty array for no annotations', () => {
    expect(groupByEntity([])).toEqual([])
  })

  it('does not mutate the input', () => {
    const annotations = [
      a({ startTime: 60, canonicalId: 'x', priority: 0.1 }),
      a({ startTime: 10, canonicalId: 'x', priority: 0.9 })
    ]
    const snapshot = JSON.parse(JSON.stringify(annotations))
    groupByEntity(annotations)
    expect(annotations).toEqual(snapshot)
  })

  it('leaves an already one-per-entity example set intact', () => {
    const path = resolve(__dirname, '../examples/everyday-driver-episode-1013.annotations.json')
    const set = JSON.parse(readFileSync(path, 'utf-8')) as AnnotationSet
    const groups = groupByEntity(set.annotations)

    // This example annotates each entity once, so grouping must not merge distinct entities.
    expect(groups.length).toBe(set.annotations.length)
    expect(groups.every(g => g.mentions === 1)).toBe(true)
    expect(groups.reduce((sum, g) => sum + g.mentions, 0)).toBe(set.annotations.length)
    expect(groups.some(g => g.explanation)).toBe(true)
    expect(groups.map(g => g.startTime)).toEqual([...groups.map(g => g.startTime)].sort((a, b) => a - b))
  })

  it('collapses repeat mentions in a synthetic episode-shaped set', () => {
    const annotations = [
      a({ startTime: 12, type: 'car', title: 'Toyota Supra', explanation: 'A Toyota sports car.' }),
      a({ startTime: 240, type: 'term', title: '2JZ engine' }),
      a({ startTime: 610, type: 'car', title: 'Toyota Supra' }),
      a({ startTime: 900, type: 'term', title: '2JZ Engine' }),
      a({ startTime: 1400, type: 'car', title: 'Toyota Supra' })
    ]

    const groups = groupByEntity(annotations, { sortBy: 'mentions' })
    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ title: 'Toyota Supra', mentions: 3, startTime: 12 })
    expect(groups[0].explanation).toBe('A Toyota sports car.')
    expect(groups[1]).toMatchObject({ mentions: 2, startTime: 240 })
  })
})
