import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { AnnotationTimeline } from '../src/annotation-timeline.js'

function createMockAudio() {
  const listeners = {}
  return {
    currentTime: 0,
    duration: 100,
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || []
      listeners[event].push(fn)
    },
    removeEventListener(event, fn) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(f => f !== fn)
      }
    },
    _emit(event) {
      (listeners[event] || []).forEach(fn => fn())
    },
    _listeners: listeners
  }
}

describe('AnnotationTimeline', () => {
  let audio

  beforeEach(() => {
    audio = createMockAudio()
  })

  it('renders markers in the container', () => {
    const dom = new JSDOM('<div id="timeline"></div>')
    const container = dom.window.document.querySelector('#timeline')

    new AnnotationTimeline(audio, {
      container,
      annotations: [
        { startTime: 25, endTime: 50, data: { type: 'car' } },
        { startTime: 75, endTime: 90, data: { type: 'term' } }
      ],
      duration: 100
    })

    const markers = container.querySelectorAll('.pa-timeline-marker')
    expect(markers).toHaveLength(2)
    expect(markers[0].style.left).toContain('25')
    expect(markers[1].style.left).toContain('75')
    // Markers use data attributes for type-based CSS styling
    expect(markers[0].dataset.type).toBe('car')
    expect(markers[1].dataset.type).toBe('term')
  })

  it('renders a playhead', () => {
    const dom = new JSDOM('<div id="timeline"></div>')
    const container = dom.window.document.querySelector('#timeline')

    new AnnotationTimeline(audio, {
      container,
      annotations: [{ startTime: 25, endTime: 50 }],
      duration: 100
    })

    const playhead = container.querySelector('.pa-timeline-playhead')
    expect(playhead).not.toBeNull()
  })

  it('calls onSeek when clicked', () => {
    const dom = new JSDOM('<div id="timeline" style="width: 100px"></div>')
    const container = dom.window.document.querySelector('#timeline')
    const onSeek = vi.fn()

    new AnnotationTimeline(audio, {
      container,
      annotations: [],
      duration: 100,
      onSeek
    })

    // Simulate click at 50% (mock getBoundingClientRect)
    container.getBoundingClientRect = () => ({ left: 0, width: 100 })
    const event = new dom.window.MouseEvent('click', { clientX: 50 })
    container.dispatchEvent(event)

    expect(onSeek).toHaveBeenCalledWith(50)
  })

  it('cleans up on destroy', () => {
    const dom = new JSDOM('<div id="timeline"></div>')
    const container = dom.window.document.querySelector('#timeline')

    const timeline = new AnnotationTimeline(audio, {
      container,
      annotations: [{ startTime: 25, endTime: 50 }],
      duration: 100
    })

    timeline.destroy()
    expect(container.innerHTML).toBe('')
    expect(audio._listeners.timeupdate).toHaveLength(0)
  })
})
