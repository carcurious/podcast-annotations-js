import { enrichAnnotationsWithTiming, selectCurrentAnnotation, upcomingAnnotations } from './timing.js'
import { fetchOrThrow } from './utils.js'
import type { Annotation, AnnotationSet, EnrichedAnnotation, TimingOptions } from './types.js'

/**
 * Fetch and parse a `.annotations.json` file.
 */
export async function fetchAnnotationSet(url: string): Promise<AnnotationSet> {
  const response = await fetchOrThrow(url, 'annotation set')
  return response.json()
}

export interface AnnotationOverlayOptions extends TimingOptions {
  annotations?: Annotation[]
  overlayElement?: HTMLElement
  activeClass?: string
  hiddenClass?: string
  onAnnotationChange?: (annotation: EnrichedAnnotation | null) => void
  onUpcomingChange?: (upcoming: EnrichedAnnotation[]) => void
  upcomingLimit?: number
}

export class AnnotationOverlay {
  audio: HTMLAudioElement
  annotations: EnrichedAnnotation[]
  options: Required<Pick<AnnotationOverlayOptions, 'activeClass' | 'hiddenClass' | 'upcomingLimit'>> & AnnotationOverlayOptions

  private _timingOpts: TimingOptions
  private _displayedId: string | null = null
  private _lastUpcomingKey: string | null = null
  private _boundUpdate: () => void

  constructor(audio: HTMLAudioElement, options: AnnotationOverlayOptions = {}) {
    this.audio = audio
    this.options = {
      activeClass: 'active',
      hiddenClass: 'hidden',
      upcomingLimit: 3,
      ...options
    }

    this._timingOpts = {}
    if (options.leadTime !== undefined) this._timingOpts.leadTime = options.leadTime
    if (options.transitionBuffer !== undefined) this._timingOpts.transitionBuffer = options.transitionBuffer
    if (options.maxExtension !== undefined) this._timingOpts.maxExtension = options.maxExtension

    this.annotations = enrichAnnotationsWithTiming(options.annotations ?? [], this._timingOpts)

    this._boundUpdate = this._update.bind(this)
    this.audio.addEventListener('timeupdate', this._boundUpdate)
  }

  private _update(): void {
    const time = this.audio.currentTime
    this._updateAnnotation(time)
    this._updateUpcoming(time)
  }

  private _updateAnnotation(time: number): void {
    const current = selectCurrentAnnotation(this.annotations, time)
    const id = current ? String(current.id) : null

    if (id === this._displayedId) return
    this._displayedId = id

    this.options.onAnnotationChange?.(current)

    if (this.options.overlayElement) {
      if (current) {
        this.options.overlayElement.classList.add(this.options.activeClass)
        this.options.overlayElement.classList.remove(this.options.hiddenClass)
      } else {
        this.options.overlayElement.classList.remove(this.options.activeClass)
        this.options.overlayElement.classList.add(this.options.hiddenClass)
      }
    }
  }

  private _updateUpcoming(time: number): void {
    const upcoming = upcomingAnnotations(this.annotations, time, this.options.upcomingLimit)
    const key = upcoming.map(a => String(a.id)).join(',')

    if (key === this._lastUpcomingKey) return
    this._lastUpcomingKey = key

    this.options.onUpcomingChange?.(upcoming)
  }

  get currentAnnotation(): EnrichedAnnotation | null {
    return selectCurrentAnnotation(this.annotations, this.audio.currentTime)
  }

  get upcoming(): EnrichedAnnotation[] {
    return upcomingAnnotations(this.annotations, this.audio.currentTime, this.options.upcomingLimit)
  }

  /**
   * Query annotation state at an arbitrary time (e.g. from an external time source via postMessage).
   * Unlike the getters, this doesn't read from audio.currentTime.
   */
  queryAtTime(time: number): { current: EnrichedAnnotation | null, upcoming: EnrichedAnnotation[] } {
    return {
      current: selectCurrentAnnotation(this.annotations, time),
      upcoming: upcomingAnnotations(this.annotations, time, this.options.upcomingLimit)
    }
  }

  setAnnotations(annotations: Annotation[]): void {
    this.annotations = enrichAnnotationsWithTiming(annotations, this._timingOpts)
    this._displayedId = null
    this._lastUpcomingKey = null
    this._update()
  }

  destroy(): void {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
  }

  /**
   * Create by fetching a `.annotations.json` file.
   *
   * Returns both the overlay instance and the full annotation set
   * (which includes episode metadata, speakers, transcripts, and ad breaks).
   *
   * @example
   * const { overlay, annotationSet } = await AnnotationOverlay.fromURL(audio, '/episode.annotations.json', {
   *   onAnnotationChange(annotation) { ... }
   * })
   */
  static async fromURL(
    audio: HTMLAudioElement,
    url: string,
    options: AnnotationOverlayOptions = {}
  ): Promise<{ overlay: AnnotationOverlay; annotationSet: AnnotationSet }> {
    const annotationSet = await fetchAnnotationSet(url)
    const overlay = new AnnotationOverlay(audio, {
      ...options,
      annotations: annotationSet.annotations
    })
    return { overlay, annotationSet }
  }
}
