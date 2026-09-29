import { fetchOrThrow } from './utils.js'
import type { VTTCue } from './types.js'

/**
 * Lightweight WebVTT/SRT parser. Extracts cues with start/end times, speaker, and text.
 */
export function parseVTT(vttString: string): VTTCue[] {
  const lines = vttString.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues: VTTCue[] = []
  let i = 0

  // Skip WEBVTT header and any metadata
  while (i < lines.length && !lines[i].includes('-->')) {
    i++
  }

  while (i < lines.length) {
    const line = lines[i].trim()
    const match = line.match(
      /^(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{1,2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    )

    if (match) {
      const startTime = parseTimestamp(match[1], match[2], match[3], match[4])
      const endTime = parseTimestamp(match[5], match[6], match[7], match[8])

      i++
      const textLines: string[] = []
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim())
        i++
      }

      const rawText = textLines.join(' ')
      let speaker: string | null = null
      let text = rawText

      const voiceMatch = rawText.match(/^<v\s+([^>]+)>(.*)$/)
      if (voiceMatch) {
        speaker = voiceMatch[1].trim()
        text = voiceMatch[2].trim()
      }

      text = text.replace(/<[^>]+>/g, '').trim()

      if (text) {
        cues.push({ startTime, endTime, text, speaker })
      }
    } else {
      i++
    }
  }

  return cues
}

function parseTimestamp(
  hours: string | undefined,
  minutes: string,
  seconds: string,
  millis: string
): number {
  const h = hours ? parseInt(hours.replace(':', ''), 10) : 0
  const m = parseInt(minutes, 10)
  const s = parseInt(seconds, 10)
  const ms = parseInt(millis, 10)
  return h * 3600 + m * 60 + s + ms / 1000
}

/**
 * Fetch and parse a VTT/SRT file from a URL.
 */
export async function fetchVTT(url: string): Promise<VTTCue[]> {
  const response = await fetchOrThrow(url, 'VTT')
  const text = await response.text()
  return parseVTT(text)
}
