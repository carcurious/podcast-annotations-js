import { enrichAnnotationsWithTiming } from './timing.js'
import { annotationField } from './utils.js'
import type { Annotation, EnrichedAnnotation } from './types.js'

export interface AnnotationTimelineOptions {
  container?: HTMLElement
  annotations?: Annotation[]
  duration?: number
  onSeek?: (time: number) => void
  markerClass?: string
  playheadClass?: string
  renderMarker?: (annotation: EnrichedAnnotation, element: HTMLElement) => void
}

export class AnnotationTimeline {
  audio: HTMLAudioElement
  annotations: EnrichedAnnotation[]
  container?: HTMLElement
  duration: number
  playhead?: HTMLElement

  private options: Required<Pick<AnnotationTimelineOptions, 'markerClass' | 'playheadClass'>> & AnnotationTimelineOptions
  private _boundUpdate: () => void
  private _boundClick: (e: MouseEvent) => void
  private _boundMetadata: () => void

  constructor(audio: HTMLAudioElement, options: AnnotationTimelineOptions = {}) {
    this.audio = audio
    this.options = {
      markerClass: 'pa-timeline-marker',
      playheadClass: 'pa-timeline-playhead',
      ...options
    }

    this.container = options.container
    this.duration = options.duration ?? 0
    this.annotations = enrichAnnotationsWithTiming(options.annotations ?? [])

    this._boundUpdate = this._updatePlayhead.bind(this)
    this._boundClick = this._handleClick.bind(this)
    this._boundMetadata = this._handleMetadata.bind(this)

    if (this.container) {
      this._render()
      this.container.addEventListener('click', this._boundClick)
    }

    this.audio.addEventListener('timeupdate', this._boundUpdate)
    this.audio.addEventListener('loadedmetadata', this._boundMetadata)
  }

  private _getDuration(): number {
    if (this.duration > 0) return this.duration
    if (this.audio.duration && isFinite(this.audio.duration)) return this.audio.duration
    return 0
  }

  private _handleMetadata(): void {
    if (!this.duration && this.audio.duration && isFinite(this.audio.duration)) {
      this.duration = this.audio.duration
      this._render()
    }
  }

  private _render(): void {
    if (!this.container) return
    const dur = this._getDuration()
    if (dur <= 0) return

    this.container.innerHTML = ''

    this.annotations.forEach(annotation => {
      const marker = document.createElement('div')
      marker.className = this.options.markerClass
      marker.style.left = `${(annotation.startTime / dur * 100).toFixed(2)}%`

      const type = annotationField<string>(annotation, 'type')
      const title = annotationField<string>(annotation, 'title')
      if (type) {
        marker.dataset.type = type
      }
      if (title) {
        marker.title = title
      }

      this.options.renderMarker?.(annotation, marker)
      this.container!.appendChild(marker)
    })

    this.playhead = document.createElement('div')
    this.playhead.className = this.options.playheadClass
    this.playhead.style.left = '0%'
    this.container.appendChild(this.playhead)
  }

  private _updatePlayhead(): void {
    if (!this.playhead) return
    const dur = this._getDuration()
    if (dur <= 0) return

    const percent = Math.min(this.audio.currentTime / dur * 100, 100)
    this.playhead.style.left = `${percent.toFixed(2)}%`
  }

  private _handleClick(event: MouseEvent): void {
    const dur = this._getDuration()
    if (dur <= 0 || !this.container) return

    const rect = this.container.getBoundingClientRect()
    const x = event.clientX - rect.left
    const percent = x / rect.width
    const time = percent * dur

    this.options.onSeek?.(time)
  }

  setAnnotations(annotations: Annotation[]): void {
    this.annotations = enrichAnnotationsWithTiming(annotations)
    this._render()
  }

  destroy(): void {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
    this.audio.removeEventListener('loadedmetadata', this._boundMetadata)
    if (this.container) {
      this.container.removeEventListener('click', this._boundClick)
      this.container.innerHTML = ''
    }
  }
}
