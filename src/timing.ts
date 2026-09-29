import { annotationField, sortByKey, upperBound } from './utils.js'
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
  const sorted = sortByKey(annotations, a => a.startTime)

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
      id: annotationField<string | number>(annotation, 'id') ?? `_pa_${index}`,
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
  // Annotations at or after this index can't have started yet, so the match
  // (if any) is at or before it. Scan backward from there instead of the whole array.
  const cursor = upperBound(annotations, currentTime, a => a.triggerStartTime)
  for (let i = cursor - 1; i >= 0; i--) {
    if (annotations[i].displayEndTime >= currentTime) return annotations[i]
  }
  return null
}

/**
 * Get annotations coming up after the current time.
 * Assumes annotations are sorted by startTime (as returned by enrichAnnotationsWithTiming).
 */
export function upcomingAnnotations(
  annotations: EnrichedAnnotation[],
  currentTime: number,
  limit: number = 3
): EnrichedAnnotation[] {
  // Compare against triggerStartTime (not startTime) so an annotation that is
  // already active (triggerStartTime <= currentTime) is not also listed as upcoming.
  const lo = upperBound(annotations, currentTime, a => a.triggerStartTime)
  return annotations.slice(lo, lo + limit)
}
