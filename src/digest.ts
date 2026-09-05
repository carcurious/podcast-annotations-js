import type { Annotation } from './types.js'

/** A set of annotations that refer to the same entity, collapsed for digest rendering. */
export interface EntityGroup {
  /** Grouping key: `canonicalId` when present, otherwise a normalized type/title key. */
  key: string
  /** Shared canonical ID, when the group was keyed by one. */
  canonicalId?: string
  type?: string
  title?: string
  explanation?: string
  url?: string
  image?: string
  /** Earliest startTime in the group, for deep-linking to where the subject comes up. */
  startTime: number
  /** Number of annotations in the group. */
  mentions: number
  /** The member the display fields were taken from. */
  representative: Annotation
  /** Every annotation in the group, in the order it appeared in the input. */
  annotations: Annotation[]
}

export interface GroupByEntityOptions {
  /** `'time'` orders groups by first mention, `'mentions'` by group size. @default 'time' */
  sortBy?: 'time' | 'mentions'
}

/**
 * Rank members so the highest-priority annotation supplies the display fields,
 * breaking ties on confidence and then on earliest startTime.
 */
function rank(a: Annotation, b: Annotation): number {
  const priority = (b.priority ?? 0) - (a.priority ?? 0)
  if (priority !== 0) return priority
  const confidence = (b.confidence ?? 0) - (a.confidence ?? 0)
  if (confidence !== 0) return confidence
  return a.startTime - b.startTime
}

function keyFor(annotation: Annotation, index: number): string {
  if (annotation.canonicalId) return `id:${annotation.canonicalId}`
  if (annotation.title) return `t:${annotation.type ?? ''}:${annotation.title.trim().toLowerCase()}`
  return `i:${index}`
}

/** First non-empty value for a field, over members already ordered by rank. */
function firstOf(members: Annotation[], field: 'explanation' | 'url' | 'image' | 'title' | 'type'): string | undefined {
  for (const member of members) {
    const value = member[field]
    if (typeof value === 'string' && value.trim() !== '') return value
  }
  return undefined
}

/**
 * Collapse per-mention annotations into one entry per entity, for show notes,
 * episode pages, and other digest views.
 *
 * Groups by `canonicalId`, falling back to type plus normalized title. Display
 * fields come from the highest-priority member, falling back to the first member
 * that carries a value, since producers often fill `explanation` or `image` only
 * on the first mention.
 */
export function groupByEntity(
  annotations: Annotation[],
  options: GroupByEntityOptions = {}
): EntityGroup[] {
  const groups = new Map<string, Annotation[]>()

  annotations.forEach((annotation, index) => {
    const key = keyFor(annotation, index)
    const existing = groups.get(key)
    if (existing) existing.push(annotation)
    else groups.set(key, [annotation])
  })

  const result: EntityGroup[] = []

  for (const [key, members] of groups) {
    const ranked = [...members].sort(rank)
    const representative = ranked[0]
    result.push({
      key,
      canonicalId: representative.canonicalId,
      type: firstOf(ranked, 'type'),
      title: firstOf(ranked, 'title'),
      explanation: firstOf(ranked, 'explanation'),
      url: firstOf(ranked, 'url'),
      image: firstOf(ranked, 'image'),
      startTime: Math.min(...members.map(m => m.startTime)),
      mentions: members.length,
      representative,
      annotations: members
    })
  }

  if (options.sortBy === 'mentions') {
    result.sort((a, b) => b.mentions - a.mentions || a.startTime - b.startTime)
  } else {
    result.sort((a, b) => a.startTime - b.startTime)
  }

  return result
}
