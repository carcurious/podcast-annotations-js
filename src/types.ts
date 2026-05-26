/** Speaker definition for the annotation set. */
export interface Speaker {
  id: string
  name: string
  /** Role in the episode (e.g., "host", "guest", "narrator"). */
  role?: string
  url?: string
}

/** A transcript file reference. */
export interface Transcript {
  url: string
  /** MIME type of the transcript (e.g., "text/vtt", "application/x-subrip", "application/json"). */
  type: string
  /** BCP 47 language tag (e.g., "en", "es"). */
  language?: string
}

/** An ad break or insertion point. */
export interface AdBreak {
  startTime: number
  endTime: number
  /** Type of insertion (e.g., "ad", "promo", "sponsorship"). */
  label?: string
  /** Placement: "pre-roll", "mid-roll", or "post-roll". */
  position?: string
}

/** Episode metadata within an annotation set. */
export interface Episode {
  title?: string
  /** Globally unique identifier for the episode (from RSS <guid>). */
  guid?: string
  url?: string
  audioUrl?: string
  /** Episode summary or show notes (plain text). */
  description?: string
  /** Publication date in RFC 2822 format. */
  pubDate?: string
  /** Episode duration in seconds. */
  duration?: number
  /** Season number. */
  season?: number
  /** Episode number within the season or series. */
  episodeNumber?: number
}

/** Container format for a collection of annotations. */
export interface AnnotationSet {
  version: string
  episode?: Episode
  transcripts?: Transcript[]
  speakers?: Speaker[]
  adBreaks?: AdBreak[]
  annotations: Annotation[]
}

/** Base annotation shape accepted by all modules. */
export interface Annotation {
  id?: string | number
  startTime: number
  endTime: number
  /** Entity type (e.g., "car", "person", "term"). */
  type?: string
  /** Human-readable display label. */
  title?: string
  /** URL to more information about the entity. */
  url?: string
  /** URL to an image representing the entity. */
  image?: string
  /** Speaker ID (references a Speaker.id). */
  speaker?: string
  /** Exact words from the transcript that triggered this annotation. */
  quote?: string
  /** Freeform labels for search, clustering, and filtering. */
  tags?: string[]
  /** Editorial importance from 0.0 to 1.0. */
  priority?: number
  /** Stable entity identifier for cross-episode deduplication. */
  canonicalId?: string
  /** Confidence score from 0.0 to 1.0. */
  confidence?: number
  /** How the annotation was produced (e.g., "human", "ai", "hybrid"). */
  source?: string
  /** Arbitrary extension metadata. */
  data?: Record<string, unknown>
}

/** Annotation enriched with computed trigger/display windows. */
export interface EnrichedAnnotation extends Annotation {
  id: string | number
  triggerStartTime: number
  displayEndTime: number
}

/** Timing configuration for annotation display windows. */
export interface TimingOptions {
  /** Seconds before startTime to trigger display. @default 2 */
  leadTime?: number
  /** Minimum gap between consecutive annotations. @default 5 */
  transitionBuffer?: number
  /** Maximum seconds to extend display past endTime. @default 60 */
  maxExtension?: number
}

/** A parsed VTT/SRT cue. */
export interface VTTCue {
  startTime: number
  endTime: number
  text: string
  speaker: string | null
}

/** A podcast chapter (Podcasting 2.0 JSON format). */
export interface Chapter {
  startTime: number
  title: string
  img?: string
  url?: string
  toc?: boolean
}

/** Podcasting 2.0 chapters JSON file structure. */
export interface ChaptersJSON {
  version: string
  chapters: Chapter[]
}

/** A matched range in a DAI alignment mapping. */
export interface AlignmentRange {
  /** Start time in the canonical transcript. */
  canonicalStart: number
  /** End time in the canonical transcript. */
  canonicalEnd: number
  /** Start time in the variant (downloaded) audio. */
  variantStart: number
  /** End time in the variant (downloaded) audio. */
  variantEnd: number
}

/** A gap in the alignment where no canonical content maps. */
export interface AlignmentGap {
  /** Start time in the variant audio where the gap begins. */
  variantStart: number
  /** End time in the variant audio where the gap ends. */
  variantEnd: number
  /** Optional label (e.g. "ad", "transition", "unknown"). */
  label?: string
  /** Position in episode: "pre-roll", "mid-roll", or "post-roll". */
  position?: string
}

/** Full alignment mapping between canonical transcript and a variant audio file. */
export interface AlignmentMapping {
  /** Hash of the variant audio file. */
  variantHash?: string
  /** Confidence score 0-1. */
  confidence: number
  /** Matched content ranges. */
  ranges: AlignmentRange[]
  /** Unmapped gap ranges (ads, promos, etc). */
  gaps: AlignmentGap[]
}
