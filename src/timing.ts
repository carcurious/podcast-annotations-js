import type { Annotation, EnrichedAnnotation, TimingOptions } from './types.js'

const DEFAULTS: Required<TimingOptions> = {
  leadTime: 2,
  transitionBuffer: 5,
  maxExtension: 60
}

/**
 * Enrich annotations with computed trigger and display timing windows.
 */
export function enrichAnnotationsWithTiming(
  annotations: Annotation[],
  options: TimingOptions = {}
): EnrichedAnnotation[] {
  const { leadTime, transitionBuffer, maxExtension } = { ...DEFAULTS, ...options }
  const sorted = [...annotations].sort((a, b) => a.startTime - b.startTime)

  return sorted.map((annotation, index) => {
    const nextAnnotation = sorted[index + 1]
    const cappedEndTime = annotation.endTime + maxExtension
    const nextBasedEndTime = nextAnnotation
      ? nextAnnotation.startTime - transitionBuffer
      : cappedEndTime
    const displayEndTime = Math.max(
      annotation.endTime,
      Math.min(nextBasedEndTime, cappedEndTime)
    )

    return {
      ...annotation,
      id: annotation.id ?? (annotation.data?.id as string | number | undefined) ?? `_pa_${index}`,
      triggerStartTime: annotation.startTime - leadTime,
      displayEndTime
    }
  })
}

/**
 * Find the currently active annotation at a given time.
 */
export function selectCurrentAnnotation(
  annotations: EnrichedAnnotation[],
  currentTime: number
): EnrichedAnnotation | null {
  return annotations.findLast((a) =>
    currentTime >= a.triggerStartTime && currentTime <= a.displayEndTime
  ) ?? null
}

/**
 * Get annotations coming up after the current time.
 */
/**
 * Get annotations coming up after the current time.
 * Assumes annotations are sorted by startTime (as returned by enrichAnnotationsWithTiming).
 */
export function upcomingAnnotations(
  annotations: EnrichedAnnotation[],
  currentTime: number,
  limit: number = 3
): EnrichedAnnotation[] {
  // Binary search for first annotation whose display window hasn't started yet.
  // Compare against triggerStartTime (not startTime) so an annotation that is
  // already active (triggerStartTime <= currentTime) is not also listed as upcoming.
  let lo = 0
  let hi = annotations.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (annotations[mid].triggerStartTime <= currentTime) lo = mid + 1
    else hi = mid
  }
  return annotations.slice(lo, lo + limit)
}
