# podcast-annotations

Every podcast episode is full of references (cars, people, places, concepts) that exist only as sound. Transcripts capture the words, but not the structure. There's no way for apps or tools to know *what's being talked about* at any given moment.

**podcast-annotations** is the reference implementation of the [Podcast Annotation Format](SPEC.md), an open spec for timestamped, typed entity annotations on audio. Think X-Ray for podcasts, but open and format-level instead of locked inside one platform.

Hit play and see:

- **"LS Engine"** appears at 0:45 as the host discusses it
- **"Turbocharger"** pops up at 2:00 with a link to learn more
- A **timeline** shows every topic in the episode. Click to jump.

All synced to playback. Framework-agnostic vanilla JavaScript with zero dependencies. Built for [Car Curious](https://getcarcurious.com).

## Features

- **Annotation Overlay**: Auto-trigger contextual content at specific moments during audio playback
- **Transcript Sync**: Highlight the active transcript segment with auto-scroll and user-interrupt detection
- **Annotation Timeline**: Visual markers showing where annotations appear, with a playhead and click-to-seek
- **DAI Alignment**: Remap canonical transcripts to variant audio with dynamic ad insertion, with gap-aware sync that pauses during ad breaks

Each module works independently. Use one, two, or all three.

Handling timing, overlaps, ad insertion gaps, and transcript sync correctly is surprisingly tricky. This library provides a minimal, battle-tested implementation so you don't have to rebuild it.

## Install

```bash
npm install podcast-annotations
```

Or use a CDN:

```html
<script type="module">
  import { AnnotationOverlay, TranscriptSync, AnnotationTimeline } from 'https://esm.sh/podcast-annotations'
</script>
```

## Quick Start

```js
import { AnnotationOverlay, TranscriptSync, AnnotationTimeline } from 'podcast-annotations'

const audio = document.querySelector('audio')

// Annotations auto-trigger during playback
const overlay = new AnnotationOverlay(audio, {
  annotations: [
    { startTime: 45, endTime: 75, type: 'car', title: 'LS Engine' },
    { startTime: 120, endTime: 150, type: 'part', title: 'Turbocharger' }
  ],
  onAnnotationChange(annotation) {
    document.querySelector('#overlay').innerHTML = annotation
      ? `<strong>${annotation.title}</strong>`
      : ''
  },
  onUpcomingChange(upcoming) {
    document.querySelector('#coming-up').innerHTML = upcoming
      .map(a => `<span>${a.title} at ${Math.floor(a.startTime)}s</span>`)
      .join('')
  }
})

// Transcript from a VTT file, renders and syncs automatically
const transcript = await TranscriptSync.fromURL(audio, '/episode.vtt', {
  container: document.querySelector('#transcript'),
  activeClass: 'highlight',
  onAutoScrollPause() {
    document.querySelector('#resume-btn').hidden = false
  }
})

// Or from existing DOM elements (data-start-time attributes)
// const transcript = new TranscriptSync(audio, {
//   container: document.querySelector('#transcript'),
//   segmentSelector: '[data-start-time]'
// })

// Timeline with markers (style via CSS using data-type attributes)
const timeline = new AnnotationTimeline(audio, {
  container: document.querySelector('#timeline'),
  annotations: overlay.annotations,
  onSeek(time) { audio.currentTime = time }
})
```

## API

### `AnnotationOverlay(audio, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `annotations` | `Array` | `[]` | `[{ startTime, endTime, data }]` |
| `overlayElement` | `HTMLElement` | - | Element to add/remove `activeClass`/`hiddenClass` |
| `activeClass` | `string` | `'active'` | Class when annotation is visible |
| `hiddenClass` | `string` | `'hidden'` | Class when no annotation |
| `onAnnotationChange` | `Function` | - | `(annotation \| null) => void` |
| `onUpcomingChange` | `Function` | - | `(upcoming[]) => void` |
| `upcomingLimit` | `number` | `3` | Max upcoming annotations |
| `leadTime` | `number` | `2` | Seconds before startTime to trigger |
| `transitionBuffer` | `number` | `5` | Gap between consecutive annotations |
| `maxExtension` | `number` | `60` | Max seconds to extend past endTime |

**Methods:** `setAnnotations(annotations)`, `destroy()`
**Getters:** `currentAnnotation`, `upcoming`

**Static factories:**
- `AnnotationOverlay.fromURL(audio, url, options)`: Fetch a `.annotations.json` file and create a synced overlay. Returns `{ overlay, annotationSet }` where `annotationSet` contains episode metadata, speakers, transcripts, and ad breaks.

```js
const { overlay, annotationSet } = await AnnotationOverlay.fromURL(audio, '/episode.annotations.json', {
  onAnnotationChange(annotation) { ... }
})
// annotationSet.speakers, annotationSet.adBreaks, etc. available for additional UI
```

**Standalone fetch:**
- `fetchAnnotationSet(url)`: Fetch and parse a `.annotations.json` file without creating an overlay.

### `TranscriptSync(audio, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | - | Scrollable transcript container |
| `segmentSelector` | `string` | `'[data-start-time]'` | CSS selector for segments |
| `startTimeAttribute` | `string` | `'data-start-time'` | Attribute with time in seconds |
| `activeClass` | `string` | `'active'` | Current segment class |
| `pastClass` | `string` | `'past'` | Past segments class |
| `futureClass` | `string` | `'future'` | Future segments class |
| `autoScroll` | `boolean` | `true` | Auto-scroll to active segment |
| `scrollBehavior` | `string` | `'smooth'` | Scroll behavior |
| `onSegmentChange` | `Function` | - | `(element, index) => void` |
| `onAutoScrollPause` | `Function` | - | Called when user scrolls away |
| `onAutoScrollResume` | `Function` | - | Called when auto-scroll resumes |

**Methods:** `resumeAutoScroll()`, `refresh()`, `destroy()`
**Getters:** `isAutoScrolling`

**Static factories:**
- `TranscriptSync.fromVTT(audio, vttString, options)`: Parse a VTT/SRT string, render segments into container, return a synced instance.
- `TranscriptSync.fromURL(audio, url, options)`: Fetch a VTT/SRT file, render, and return a synced instance (async).
- `options.renderSegment(cue, element)`: Custom renderer for VTT cues. Default renders speaker name + text.

### `AnnotationTimeline(audio, options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | - | Timeline container element |
| `annotations` | `Array` | `[]` | Annotation data |
| `duration` | `number` | - | Total seconds (auto-detected if omitted) |
| `onSeek` | `Function` | - | `(timeInSeconds) => void` |
| `markerClass` | `string` | `'pa-timeline-marker'` | CSS class for markers |
| `playheadClass` | `string` | `'pa-timeline-playhead'` | CSS class for playhead |
| `renderMarker` | `Function` | - | `(annotation, element) => void` |

Markers get `data-type` attributes for CSS-based styling. Style with:
```css
.pa-timeline-marker[data-type="car"] { background: #60a5fa; }
.pa-timeline-marker[data-type="term"] { background: #c084fc; }
```

**Methods:** `setAnnotations(annotations)`, `destroy()`

### `ChapterSync(audio, chapters, options)`

Syncs Podcasting 2.0 JSON chapters with audio playback.

```js
// From a URL
const chapters = await ChapterSync.fromURL(audio, '/chapters.json', {
  container: document.querySelector('#chapters'),
  onChapterChange(chapter) { updateNowPlaying(chapter?.title) }
})

// From a JSON object
const chapters = ChapterSync.fromJSON(audio, chaptersData, options)

// From an array directly
const chapters = new ChapterSync(audio, chaptersArray, options)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement` | - | Container for rendered chapter list |
| `activeClass` | `string` | `'active'` | Class for current chapter |
| `autoplay` | `boolean` | `false` | Start playback when a chapter is clicked |
| `chapterClass` | `string` | `'pa-chapter'` | CSS class for chapter elements |
| `onChapterChange` | `Function` | - | `(chapter \| null, index) => void` |
| `onSeek` | `Function` | - | `(timeInSeconds) => void` |
| `renderChapter` | `Function` | - | `(chapter, element) => void` |

**Methods:** `setChapters(chapters)`, `destroy()`
**Getters:** `currentChapter`
**Static:** `ChapterSync.fromJSON(audio, json, options)`, `ChapterSync.fromURL(audio, url, options)`

### `AlignedTranscript(canonicalCues, mapping)`

Handles DAI (Dynamic Ad Insertion) alignment. Takes a canonical transcript and an alignment mapping, produces a timeline with remapped timestamps and gap regions for inserted ads/promos.

```js
import { AlignedTranscript } from 'podcast-annotations'

const aligned = new AlignedTranscript(canonicalCues, {
  confidence: 0.95,
  ranges: [
    { canonicalStart: 0, canonicalEnd: 120, variantStart: 0, variantEnd: 120 },
    { canonicalStart: 120, canonicalEnd: 300, variantStart: 150, variantEnd: 330 }
  ],
  gaps: [
    { variantStart: 120, variantEnd: 150, label: 'ad' }
  ]
})

// Interleaved content + gap segments, sorted by variant time
aligned.segments.forEach(seg => {
  if (seg.type === 'content') {
    renderCue(seg.cue, seg.variantStart, seg.variantEnd)
  } else {
    renderAdBreak(seg.gap.label, seg.gap.variantStart)
  }
})

// Feed remapped cues into TranscriptSync with gap awareness
const transcript = TranscriptSync.fromVTT(audio, vttString, {
  container: document.querySelector('#transcript'),
  gaps: aligned.gaps,
  onGapEnter(gap) { showAdIndicator(gap.label) },
  onGapExit() { hideAdIndicator() }
})
```

**Getters:** `segments`, `remappedCues`, `gaps`, `confidence`, `isSyncReliable`
**Methods:** `isInGap(variantTime)`

#### TranscriptSync gap options

When using `TranscriptSync` with DAI content, these additional options pause highlighting during ad breaks:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gaps` | `AlignmentGap[]` | `[]` | Gap ranges where highlighting pauses |
| `gapClass` | `string` | `'gap'` | Class applied to gap elements |
| `onGapEnter` | `Function` | - | `(gap) => void`, called when playback enters a gap |
| `onGapExit` | `Function` | - | `() => void`, called when playback leaves a gap |

**Methods:** `setGaps(gaps)`: update gap ranges dynamically
**Getters:** `isInGap`: whether current playback position is inside a gap

#### Types

```ts
interface AlignmentMapping {
  variantHash?: string       // Hash of the variant audio file
  confidence: number         // Confidence score 0-1
  ranges: AlignmentRange[]   // Matched content ranges
  gaps: AlignmentGap[]       // Unmapped gap ranges (ads, promos, etc)
}

interface AlignmentRange {
  canonicalStart: number     // Start time in the canonical transcript
  canonicalEnd: number       // End time in the canonical transcript
  variantStart: number       // Start time in the variant audio
  variantEnd: number         // End time in the variant audio
}

interface AlignmentGap {
  variantStart: number       // Start time in variant audio
  variantEnd: number         // End time in variant audio
  label?: string             // e.g. "ad", "transition", "unknown"
  position?: string          // "pre-roll", "mid-roll", or "post-roll"
}
```

### Timing utilities

```js
import { enrichAnnotationsWithTiming, selectCurrentAnnotation, upcomingAnnotations } from 'podcast-annotations'
```

Low-level functions if you want full control over the timing logic.

## Prior Art

The DAI alignment model was informed by Marco Arment's discussion of transcript synchronization
with dynamic ad insertion in [Overcast](https://overcast.fm) ([ATP #683](https://atp.fm/683)),
which helped shape how we combined our existing offset and signature work into the alignment API.

## License

MIT
