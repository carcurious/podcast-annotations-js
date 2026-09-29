import { fetchOrThrow, formatTime, sortByKey, upperBound } from './utils.js'
import type { Chapter, ChaptersJSON } from './types.js'

/**
 * Parse a Podcasting 2.0 JSON chapters file.
 */
export function parseChaptersJSON(json: string | ChaptersJSON): Chapter[] {
  const data: ChaptersJSON = typeof json === 'string' ? JSON.parse(json) : json
  return sortByKey(
    (data.chapters ?? []).filter(ch => ch.startTime !== undefined && ch.title),
    ch => ch.startTime
  )
}

/**
 * Fetch and parse a Podcasting 2.0 JSON chapters file from a URL.
 */
export async function fetchChapters(url: string): Promise<Chapter[]> {
  const response = await fetchOrThrow(url, 'chapters')
  const data = await response.json()
  return parseChaptersJSON(data)
}

export interface ChapterSyncOptions {
  container?: HTMLElement
  activeClass?: string
  /** Whether clicking a chapter should start playback if paused. @default false */
  autoplay?: boolean
  onChapterChange?: (chapter: Chapter | null, index: number) => void
  onSeek?: (time: number) => void
  renderChapter?: (chapter: Chapter, element: HTMLElement) => void
  chapterClass?: string
}

/**
 * Chapter synchronization with audio playback.
 *
 * Highlights the active chapter, renders a chapter list with click-to-seek,
 * and fires callbacks when the chapter changes.
 *
 * @example
 * const sync = await ChapterSync.fromURL(audio, '/chapters.json', {
 *   container: document.querySelector('#chapters'),
 *   onChapterChange: (chapter) => updateNowPlaying(chapter?.title)
 * })
 */
export class ChapterSync {
  audio: HTMLAudioElement
  chapters: Chapter[]
  container?: HTMLElement
  activeIndex: number = -1

  private options: Required<Pick<ChapterSyncOptions, 'activeClass' | 'chapterClass' | 'autoplay'>> & ChapterSyncOptions
  private _elements: HTMLElement[] = []
  private _boundUpdate: () => void
  private _boundClick: (e: Event) => void

  constructor(audio: HTMLAudioElement, chapters: Chapter[], options: ChapterSyncOptions = {}) {
    this.audio = audio
    this.chapters = chapters
    this.container = options.container
    this.options = {
      activeClass: 'active',
      autoplay: false,
      chapterClass: 'pa-chapter',
      ...options
    }

    if (this.container) {
      this._render()
    }

    this._boundUpdate = this._update.bind(this)
    this._boundClick = this._handleClick.bind(this)

    this.audio.addEventListener('timeupdate', this._boundUpdate)
  }

  private _render(): void {
    if (!this.container) return
    const doc = this.container.ownerDocument ?? document

    this.container.innerHTML = ''
    this._elements = []

    this.chapters.forEach((chapter, i) => {
      const el = doc.createElement('div')
      el.className = this.options.chapterClass
      el.dataset.index = String(i)
      el.dataset.startTime = String(chapter.startTime)

      if (this.options.renderChapter) {
        this.options.renderChapter(chapter, el)
      } else {
        const time = doc.createElement('span')
        time.className = 'pa-chapter-time'
        time.textContent = formatTime(chapter.startTime)
        el.appendChild(time)

        const title = doc.createElement('span')
        title.className = 'pa-chapter-title'
        title.textContent = chapter.title
        el.appendChild(title)

        if (chapter.img) {
          const img = doc.createElement('img')
          img.className = 'pa-chapter-img'
          img.src = chapter.img
          img.alt = chapter.title
          img.loading = 'lazy'
          el.prepend(img)
        }
      }

      el.addEventListener('click', this._boundClick)
      this.container!.appendChild(el)
      this._elements.push(el)
    })
  }

  private _update(): void {
    const time = this.audio.currentTime
    const idx = upperBound(this.chapters, time, ch => ch.startTime) - 1

    if (idx === this.activeIndex) return

    const prev = this.activeIndex
    this.activeIndex = idx

    if (prev >= 0 && this._elements[prev]) {
      this._elements[prev].classList.remove(this.options.activeClass)
    }
    if (idx >= 0 && this._elements[idx]) {
      this._elements[idx].classList.add(this.options.activeClass)
    }

    this.options.onChapterChange?.(idx >= 0 ? this.chapters[idx] : null, idx)
  }

  private _handleClick(e: Event): void {
    const el = (e.currentTarget as HTMLElement)
    const time = parseFloat(el.dataset.startTime ?? '0')
    this.audio.currentTime = time
    if (this.options.autoplay && this.audio.paused) {
      this.audio.play()
    }
    this.options.onSeek?.(time)
  }

  /** The currently active chapter. */
  get currentChapter(): Chapter | null {
    return this.activeIndex >= 0 ? this.chapters[this.activeIndex] : null
  }

  /** Replace chapters and re-render. */
  setChapters(chapters: Chapter[]): void {
    this.chapters = sortByKey(chapters, ch => ch.startTime)
    this.activeIndex = -1
    this._render()
    this._update()
  }

  destroy(): void {
    this.audio.removeEventListener('timeupdate', this._boundUpdate)
    this._elements.forEach(el => el.removeEventListener('click', this._boundClick))
    if (this.container) {
      this.container.innerHTML = ''
    }
    this._elements = []
  }

  /** Create from a Podcasting 2.0 JSON string or object. */
  static fromJSON(audio: HTMLAudioElement, json: string | ChaptersJSON, options: ChapterSyncOptions = {}): ChapterSync {
    const chapters = parseChaptersJSON(json)
    return new ChapterSync(audio, chapters, options)
  }

  /** Create by fetching a Podcasting 2.0 JSON chapters file. */
  static async fromURL(audio: HTMLAudioElement, url: string, options: ChapterSyncOptions = {}): Promise<ChapterSync> {
    const chapters = await fetchChapters(url)
    return new ChapterSync(audio, chapters, options)
  }

}
