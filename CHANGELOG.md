# Changelog

## 0.9.2 (2026-07-03)

### Added
- Non-normative **Wikidata QID guidance** in `SPEC.md`'s Canonical IDs section: a QID lets uncoordinated producers arrive at the same identifier, so it is the stronger `canonicalId` choice for cross-show joins; coverage was live-tested against the Everyday Driver example set (10 of 12 entities resolve, FCP Euro and "solenoid handles" do not, so the namespaced form covers what the registry does not); and an assigned `canonicalId` SHOULD NOT change. Motivated by John Spurlock's ask for publisher-delineated entities with agreed-upon stable identifiers such as Wikidata IDs. No data-model change; spec version remains `1.1.0`.

## 0.9.1 (2026-07-02)

### Added
- Non-normative guidance on interop with **Apple Podcasts Timed Links** (iOS 26.2, Nov 2025) in `SPEC.md`'s Relationship to Other Standards section: how the feature compares to this spec, and how to export high-`priority` annotations into `<podcast:chapters>` for Apple Podcasts to render today. No data-model change; spec version remains `1.1.0`.
- New Prior Art & Inspiration bullet noting that Apple's timed links confirm the moment-level annotation pattern at platform scale.
- Sources: [Apple Podcasts: Timed Links](https://podcasters.apple.com/support/5536-links-on-apple-podcasts), [Apple Podcasts: Enhance Episodes with Chapters, Links, and More](https://podcasters.apple.com/support/5545-enhance-episodes-with-chapters-links-more).

## 0.9.0 (2026-06-17)

### Added
- **Annotation layers.** Optional `layer` and `producer` fields on the annotation set let multiple producers (an official set, a third-party AI enrichment, a community contribution) annotate the same audio independently instead of merging into one file at the source. The `(producer, layer)` pair SHOULD be stable and unique per episode so a consumer can fetch, diff, replace, or filter layers; `layer` is a lowercase slug and `producer` a stable namespaced identifier. Additive and backward compatible.
- `AnnotationSet.layer` and `AnnotationSet.producer` added to the TypeScript types.

### Changed
- **Spec version bumped to `1.1.0`** for the additive `layer`/`producer` fields. `examples/`, generated `docs/`, and tests updated to `1.1.0`.
- `SPEC.md`: new Layers section covering the multi-producer model, the stable-and-unique `(producer, layer)` identity rule, and consumer-defined merge semantics. Clarified that cross-layer dedupe needs `canonicalId` **plus** time-range overlap — `canonicalId` keys an entity index, not a timeline occurrence.
- `SPEC.md` RSS Distribution: an `<item>` MAY carry multiple `<podcast:annotations>` elements, one per layer, with machine-readable `layer`/`producer` attributes as feed-level selectors (mirroring `language`/`rel` on `<podcast:transcript>`). The `title` attribute is a UI label only and MUST NOT be used as a selector.
- `SPEC.md` overview: promoted the cross-episode entity-graph use case (corpus-wide queries, agent discovery) alongside in-playback rendering, and noted sidecar mutability as a design property.

## 0.8.0 (2026-06-15)

### Added
- `Annotation.participation`: optional moment-level role for `type: "person"` annotations. Recommended values are `"guest"`, `"host"`, and `"mentioned"`. Omission means unspecified, not `"mentioned"`, so a legacy or untagged annotation is never read as not-present. Typed as a loose union (`'guest' | 'host' | 'mentioned' | (string & {})`) so IDEs autocomplete the recommended values while custom strings stay valid. Additive and backward compatible; spec version remains `1.0.0`.

### Changed
- `SPEC.md`: added a Participation section with a worked guest/mentioned example, validation rules, a W3C mapping row (application-specific), and a `<podcast:person>` note framing `participation` as the moment-level complement to episode-level person tagging.
- `SPEC.md` Time Format: documented that `endTime` equal to `startTime` marks a point in time, and that consumers render point annotations with a nonzero display window.
- `examples/lex-fridman-494-jensen-huang.annotations.json`: added a `"guest"` and a `"mentioned"` `person` annotation to demonstrate the field.

## 0.7.0 (2026-05-26)

### Changed
- **Breaking:** `Transcript.format` renamed to `Transcript.type` and now takes MIME type strings (`"text/vtt"`, `"application/x-subrip"`, `"application/json"`, etc.) instead of shorthand strings (`"vtt"`, `"srt"`, `"json"`). Aligns with the `<podcast:transcript>` element in the PSP-1 RSS specification so RSS feeds and annotation files can reference the same transcript resources without type translation.
- `SPEC.md` transcript section updated with MIME type table and PSP-1 alignment note.
- `SPEC.md` episode container fields table updated with PSP-1 alignment note for `guid`, `pubDate`, `duration`.
- `SPEC.md` RSS Distribution section now includes a concrete `<podcast:annotations url="..." type="application/json" />` example modeled on `<podcast:transcript>`.

### Added
- `Episode.guid` — globally unique identifier for the episode (from RSS `<guid>`).
- `Episode.pubDate` — publication date in RFC 2822 format (aligns with RSS `<pubDate>`).
- `Episode.duration` — episode duration in seconds (aligns with `<itunes:duration>`).
- `Episode.season` — season number (aligns with `<itunes:season>`).
- `Episode.episodeNumber` — episode number within the season or series (aligns with `<itunes:episode>`).

### Fixed
- `upcomingAnnotations` no longer returns an annotation that is already active. Previously compared against `startTime`; now compares against `triggerStartTime` (which is 2s earlier by default), so an annotation in its lead window doesn't appear in both the current and upcoming lists simultaneously.
- `TranscriptSync.setGaps()` now resets `activeSegmentIndex` so a stale `active` CSS class is cleared on the next `timeupdate` after gaps are updated mid-playback.
- `formatTime` uses `isNaN` instead of falsy check, fixing incorrect `"0:00"` return for `triggerStartTime` values that are negative.

## 0.6.1 (2026-04-29)

### Added
- Non-normative guidance for disambiguating `company` vs `brand` entity types in `SPEC.md` — role-test framing with worked examples covering same-name reversals (Brembo, Cosworth, Stellantis). No data-model change; spec version remains 1.0.0.

## 0.6.0 (2026-04-16)

### Added
- `episode.description` field — optional plain text episode summary or show notes.
- "Show Notes" entry in spec's "Relationship to Other Standards" section.
- `show-notes` npm keyword.

## 0.5.1 (2026-04-12)

### Added
- `fetchAnnotationSet(url)` — fetch and parse a `.annotations.json` file.
- `AnnotationOverlay.fromURL(audio, url, options)` — static factory that fetches an annotation set and creates a synced overlay. Returns `{ overlay, annotationSet }` so consumers also get episode metadata, speakers, transcripts, and ad breaks.

## 0.5.0 (2026-04-11)

### Added
- **Podcast Annotation Format spec** (`SPEC.md`) — open specification (v1.0.0) for timestamped entity annotations on podcast audio. Defines annotation objects, annotation sets, speakers, transcripts, ad breaks, recommended entity types, and W3C Web Annotation mapping.
- Spec fields promoted to top-level on `Annotation` interface: `type`, `title`, `url`, `image`, `speaker`, `quote`, `tags`, `priority`, `canonicalId`, `confidence`, `source`. All optional, backwards-compatible — `data` is still accepted.
- New types: `AnnotationSet`, `Speaker`, `Transcript`, `AdBreak`, `Episode`.
- `AnnotationTimeline` reads top-level `type`/`title` first, falls back to `data.type`/`data.title`.

### Changed
- README updated with spec link, visual mental model, and examples using top-level annotation fields.

## 0.4.3 (2026-04-11)

### Fixed
- `TranscriptSync` did not clear segment classes when seeking backward past all segments. The adjacent-move optimization skipped the full reclassify when `newIndex` was -1 due to an off-by-one in the threshold check.

## 0.4.2 (2026-04-10)

### Added
- `position` field on `AlignmentGap` type — `"pre-roll"`, `"mid-roll"`, or `"post-roll"` classification from the alignment pipeline.
- Documentation for `AlignedTranscript`, `TranscriptSync` gap options, and alignment types in README.
- Prior Art section crediting Overcast DAI discussion.

## 0.4.1 (2026-04-10)

### Added
- `ChapterSync.fromURL` test coverage — success, 404 error, and network error cases.

## 0.4.0 (2026-04-09)

### Added
- **Gap-aware `TranscriptSync`** — `gaps` option accepts `AlignmentGap[]` to define unmapped DAI regions. Highlighting pauses inside gaps and resumes at the next matched segment.
  - `onGapEnter(gap)` / `onGapExit()` callbacks
  - `isInGap` getter
  - `setGaps(gaps)` method for runtime updates
- **`AlignedTranscript`** — takes canonical VTT cues + `AlignmentMapping`, produces a timeline of interleaved content and gap segments with remapped variant timestamps.
  - `remappedCues` getter for feeding into `TranscriptSync`
  - `isInGap(variantTime)` to check if a time falls in a gap
  - `isSyncReliable` getter (confidence >= 0.7)
- New types: `AlignmentRange`, `AlignmentGap`, `AlignmentMapping`, `AlignedSegment`

## 0.3.1 (2026-04-09)

### Fixed
- `ChapterSync` rendered wrong timestamps for podcasts over 1 hour (e.g. `63:00` instead of `1:03:00`). Now uses shared `formatTime` utility.
- Seeking backward in `TranscriptSync` left segments with stale CSS classes. Non-adjacent index changes now trigger a full reclassify.
- `upcomingAnnotations` scanned the entire array on every `timeupdate` tick. Replaced with binary search + slice.
- `ChapterSync` active chapter lookup used linear scan. Replaced with binary search.

### Changed
- `enrichAnnotationsWithTiming` now checks `data.id` as a fallback when assigning IDs, matching the previously documented but unreachable behavior.

### Removed
- Dead `_assignIds` method from `AnnotationOverlay` — ID assignment is now fully handled by `enrichAnnotationsWithTiming`.
- Duplicate `_formatTime` from `ChapterSync`.

## 0.3.0 (2026-04-09)

### Added
- `AnnotationOverlay.queryAtTime(time)` — query annotation state at an arbitrary time, independent of `audio.currentTime`. Useful for postMessage-based sync with external players.

## 0.2.0 (2026-04-09)

### Added
- **TypeScript** — full rewrite with exported types for all options and data shapes.
- **`ChapterSync`** — Podcasting 2.0 JSON chapters parser and sync. `ChapterSync.fromJSON()` and `ChapterSync.fromURL()` static factories. Active chapter highlighting, click-to-seek, `onChapterChange` callback, `renderChapter` hook.
- **VTT/SRT parsing** — `parseVTT()` and `fetchVTT()` for lightweight WebVTT and SRT file parsing. Extracts timestamps, text, and speaker names from VTT voice tags.
- **`TranscriptSync.fromVTT()`** and **`TranscriptSync.fromURL()`** — static factories that parse VTT/SRT content and render synced transcript segments automatically.
- **`TranscriptSync.refresh()`** — re-cache segments from DOM and immediately re-evaluate active segment. For dynamic transcripts.
- **Build step** — tsup outputs `dist/index.js` (ESM) + `dist/index.d.ts` (type declarations).
- Exported types: `Annotation`, `EnrichedAnnotation`, `TimingOptions`, `VTTCue`, `Chapter`, `ChaptersJSON`.

### Changed
- `AnnotationTimeline` no longer renders inline styles on markers. Markers get `data-type` attributes and CSS classes — style with `.pa-timeline-marker[data-type="car"]` selectors.
- `TranscriptSync` caches segments on init and uses binary search instead of linear scan. Only toggles CSS classes on changed segments (prev + next) instead of all N segments.
- `AnnotationOverlay` uses explicit `id` field for change detection instead of `startTime:endTime`. Falls back to auto-assigned `_pa_0`, `_pa_1`, etc.
- `TranscriptSync.fromVTT()`/`fromURL()` clear the container before rendering to prevent duplicate nodes on repeated calls.
- `ChapterSync` click-to-seek no longer forces autoplay. Opt-in via `autoplay: true` (defaults to `false`).

### Removed
- `typeColors`, `defaultColor`, `playheadColor` options from `AnnotationTimeline` (use CSS instead).
- `playheadClass` from `ChapterSyncOptions` (was never used).

## 0.1.0 (2026-04-08)

### Added
- Initial release with three framework-agnostic vanilla JS modules:
  - **`AnnotationOverlay`** — auto-trigger contextual content at specific moments during audio playback.
  - **`TranscriptSync`** — highlight active transcript segments with auto-scroll and user-interrupt detection.
  - **`AnnotationTimeline`** — visual annotation markers with playhead and click-to-seek.
- Core timing utilities: `enrichAnnotationsWithTiming()`, `selectCurrentAnnotation()`, `upcomingAnnotations()`.
- `formatTime()` helper.
- Zero dependencies.
