import type { Annotation, AlignmentGap } from './types.js'

/**
 * Format seconds into a human-readable time string.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Fetch a URL, throwing a descriptive error if the response isn't ok. */
export async function fetchOrThrow(url: string, label: string): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label}: ${response.status} ${response.statusText}`)
  }
  return response
}

/** Sort a copy of `items` ascending by a numeric key, without mutating the input. */
export function sortByKey<T>(items: T[], key: (item: T) => number): T[] {
  return [...items].sort((a, b) => key(a) - key(b))
}

/**
 * Binary search for the first index whose key is greater than `value`.
 * Assumes `items` is sorted ascending by `key`. Returns `items.length` if none match.
 */
export function upperBound<T>(items: T[], value: number, key: (item: T) => number): number {
  let lo = 0
  let hi = items.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (key(items[mid]) <= value) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Binary search for the first index whose key is greater than or equal to `value`.
 * Assumes `items` is sorted ascending by `key`. Returns `items.length` if none match.
 */
export function lowerBound<T>(items: T[], value: number, key: (item: T) => number): number {
  let lo = 0
  let hi = items.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (key(items[mid]) < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

/**
 * Find the gap (if any) containing `time`. Assumes `gaps` is sorted ascending by `variantStart`.
 */
export function findGap(gaps: AlignmentGap[], time: number): AlignmentGap | null {
  for (const gap of gaps) {
    if (time >= gap.variantStart && time < gap.variantEnd) return gap
    if (gap.variantStart > time) break // gaps are sorted, no need to check further
  }
  return null
}

/** Read a named field from an annotation, falling back to the same key under `data`. */
export function annotationField<T extends string | number>(
  annotation: Annotation,
  field: 'id' | 'type' | 'title'
): T | undefined {
  const value = annotation[field] as T | undefined
  if (value !== undefined) return value
  return annotation.data?.[field] as T | undefined
}
