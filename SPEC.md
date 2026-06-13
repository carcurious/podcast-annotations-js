# Podcast Annotation Format

**Version 1.0.0**

A minimal JSON format for timestamped entity annotations on podcast and spoken media content.

## Overview

WebVTT tells you what was said. Podcast annotations tell you what was said *about*.

Transcripts give you words and timestamps. They do not tell an app that a host mentioned a 1969 Camaro at 0:45, switched to turbochargers at 2:00, or spent the next 30 seconds talking about Carroll Shelby. That meaning is present in the audio, but it is rarely available as structured data.

The Podcast Annotation Format is a JSON spec for timestamped entity and topic annotations on spoken audio. Annotation sets can be produced by humans, automated pipelines, or hybrid workflows. The goal is to make the references inside a podcast episode addressable, so that a player, search index, archive, or show-notes generator can do something useful with them.

This spec defines the annotation, not the transport. A sidecar JSON file is the simplest carrier today, but the same annotation model can be embedded in RSS, returned from an API, or delivered however a producer and consumer choose.

### Design Principles

- **Minimal.** Only two required fields (`startTime`, `endTime`). Everything else is optional.
- **Extensible.** The `data` object is an open extension point for app-specific metadata.
- **Framework-agnostic.** Plain JSON. No JSON-LD, no XML, no runtime dependencies.
- **Human-readable.** A developer should understand an annotation set without reading this spec.

### Non-Goals

- This is not a transcript format. Use WebVTT, SRT, or a transcript JSON format for spoken text.
- This does not replace chapters. Chapters describe coarse segments; annotations describe specific references within them.
- This does not require a fixed ontology. Recommended types exist for interoperability, but producers may extend the format.
- This does not prescribe one UI. A player may render overlays, timelines, side panels, search results, or no direct UI at all.

## Prior Art & Inspiration

Timed context around media is familiar to users. Podcasting has transcripts, chapters, and show notes, but it lacks a compact file for within-episode references.

**Proven UX pattern:**
- **VH1 Pop-Up Video.** The original mainstream example: timestamped contextual notes overlaid on media playback.
- **Amazon Prime Video X-Ray.** Cast, characters, and trivia synced to the current scene. X-Ray is the canonical reference, but Amazon has never published the underlying data model, which is part of why writing this format down in the open is worth doing.
- **SoundCloud timed comments.** One of the earliest mainstream timestamped annotations on audio. Users drop comments at any `t=` position, proving listeners engage with moment-level audio annotation.

<!-- TODO(author): Replace or supplement one of the above entries with a reference you actually leaned on while building Car Curious, such as an internal annotation tool, a forum thread, a half-abandoned project, an academic paper, or a competitor that did not quite work. One specific reference from real work would make this section feel more grounded. -->


**Proven at scale:**
- **Genius.** Community annotation layer on lyrics, proving that entity-level annotation on media content is a viable product at scale. Structurally the closest analog: annotation body attached to a media anchor, with a URL for more context.
- **BBC Linked Data.** The BBC's public ontologies model "Things" such as people, places, organisations, themes, programmes, and web documents so content can be connected through shared topics. Podcast annotations address a smaller layer: when one of those things becomes relevant inside an audio episode.

**Proven in podcasting:**
- **Podcast chapters** (Podcasting 2.0, Podlove, MP4). Coarse timestamped metadata that podcast apps already implement, proving the ecosystem will adopt spec extensions that improve the listening experience.
- **Overcast.** Podcast-native precedent for structured metadata (Smart Speed, chapters, transcript sync) improving UX. Marco Arment's public discussion of DAI transcript synchronization informed this spec's approach to ad break alignment.
- **Snipd.** A podcast app that lets listeners highlight and annotate moments for personal note-taking. Listener-side annotation on podcast audio, already in production. This spec makes the same capability possible as an open, shared layer instead of a closed personal tool.

Podcast audio already contains this information. This spec defines one way to represent it as structured data. Annotations can be derived from transcripts, but precomputed annotations allow better timing, better entity resolution, and more consistent behavior across players and archives.

## Annotation Object

An annotation represents a single entity mention or topic reference in audio. An annotation's time range represents the duration over which the entity is actively discussed or relevant, not only the exact moment it is first mentioned.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | No | Unique identifier within the annotation set |
| `startTime` | `number` | **Yes** | Start time in seconds (float) |
| `endTime` | `number` | **Yes** | End time in seconds (float) |
| `type` | `string` | No | Entity type (see [Recommended Types](#recommended-entity-types)) |
| `title` | `string` | No | Human-readable display label |
| `url` | `string` | No | URL to more information about the entity |
| `image` | `string` | No | URL to an image representing the entity |
| `speaker` | `string` | No | Speaker ID (references an entry in `speakers`) |
| `quote` | `string` | No | The exact words from the transcript that triggered this annotation |
| `tags` | `array of strings` | No | Freeform labels for search, clustering, and filtering |
| `priority` | `number` | No | Editorial importance from 0.0 to 1.0, for UI display ordering |
| `canonicalId` | `string` | No | Stable entity identifier for cross-episode deduplication |
| `confidence` | `number` | No | Confidence score from 0.0 to 1.0 |
| `source` | `string` | No | How the annotation was produced (e.g., `"human"`, `"ai"`, `"hybrid"`) |
| `data` | `object` | No | Arbitrary extension metadata |

Typical usage:

```json
{
  "startTime": 45.2,
  "endTime": 75.0,
  "type": "car",
  "title": "LS Engine",
  "url": "https://example.com/ls-engine",
  "speaker": "s1",
  "quote": "the LS is just a completely different animal"
}
```

Full example with all optional fields:

```json
{
  "id": "ls-engine-1",
  "startTime": 45.2,
  "endTime": 75.0,
  "type": "car",
  "title": "LS Engine",
  "url": "https://example.com/ls-engine",
  "image": "https://example.com/ls-engine.jpg",
  "speaker": "s1",
  "quote": "the LS is just a completely different animal",
  "tags": ["engine", "swap", "performance"],
  "priority": 0.9,
  "canonicalId": "car:chevrolet:ls",
  "confidence": 0.95,
  "source": "ai",
  "data": {
    "make": "Chevrolet",
    "displacement": "5.7L"
  }
}
```

### Time Format

All times are in **seconds as floating-point numbers**, measured from the start of the audio. This aligns with the Web Audio API, HTMLMediaElement, WebVTT, and most podcast tooling.

Time values SHOULD use millisecond precision such as `45.123`. Consumers SHOULD tolerate minor floating-point variance: when one producer emits `45.1999` and another emits `45.2` for the same mention, they describe the same moment and a consumer should treat them as equivalent.

### The `data` Field

The `data` object is an open extension point. Producers can store any JSON-serializable metadata here. Consumers should ignore fields they don't recognize.

Common uses:
- Domain-specific attributes (make, model, year for cars)
- Rendering hints (color, icon, priority)
- Additional provenance or source metadata beyond `confidence` and `source`

**Recommended conventions:**
- `data.endTimeEstimated` (`boolean`) - Set to `true` when `endTime` is approximate, such as annotations derived from show notes timestamps where only a start time is known. Consumers may use this to adjust display behavior (e.g., shorten display windows or avoid hard cuts).

### Identifiers

If provided, `id` MUST be unique within the annotation set. IDs SHOULD be stable across revisions of the same annotation set to support diffing, syncing, and caching. IDs MAY be strings or numbers, but producers SHOULD prefer strings for consistency.

### Ordering and Overlaps

Annotations SHOULD be sorted by `startTime` in ascending order. Consumers MUST NOT rely on ordering and SHOULD sort if necessary.

Annotations MAY overlap in time. Multiple annotations at the same timestamp are valid. A single moment might reference both a car and the person driving it. Implementations should define rendering behavior for overlapping annotations, such as stacking, prioritizing by type or confidence, or limiting simultaneous display.

### Density

An annotation set might contain 5 chapter-like topic markers for a 3-hour episode or 100+ fine-grained entity references for a 90-minute episode; both are valid. Producers generating dense annotation sets SHOULD assign `priority` values so that consumers can filter to a manageable subset (e.g., showing only annotations with `priority >= 0.7` in a minimal UI, or all annotations in a detailed entity view).

<!-- TODO(author): Add a concrete density story from Car Curious here: a specific Everyday Driver episode where the annotation count crossed a threshold and broke a downstream assumption; what density starts to overwhelm a player UI; whether the AI pipeline tends to over-produce or under-produce; and whether priority filtering solved the problem or only deferred it. Two or three sentences from lived experience would strengthen this section. -->


### Validation Rules

- `startTime` MUST be >= 0
- `endTime` MUST be >= `startTime`
- `confidence`, if provided, MUST be >= 0.0 and <= 1.0. This reflects extraction certainty: how sure the producer is that this annotation is correct.
- `priority`, if provided, MUST be >= 0.0 and <= 1.0. This reflects editorial importance: how prominently this annotation should be displayed. A high-confidence annotation may still have low priority if it's tangential.
- `speaker`, if provided, MUST reference a valid `id` in the `speakers` array
- Time values SHOULD be within the duration of the associated audio

### Canonical IDs

The `canonicalId` field provides a stable, human-readable identifier for the underlying entity, not the annotation itself. The same entity across multiple episodes or annotation sets SHOULD use the same `canonicalId`, enabling cross-episode deduplication, entity graphs, and aggregate views (e.g., "every episode that mentions the LS engine").

There is no required format, but a namespaced convention is recommended:

- `car:chevrolet:camaro:1969`
- `person:carroll-shelby`
- `place:nurburgring`

Producers MAY also use external identifiers such as Wikidata QIDs (e.g., `wikidata:Q332448`).

## Annotation Set

An annotation set is the container format for a collection of annotations associated with a single episode or audio file.

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "Cars That Need A Comeback (A-M), The Fourth Car, Minivan Peer Pressure | Episode 1,013",
    "url": "https://getcarcurious.com/episodes/cars-that-need-a-comeback-a-m-the-fourth-car-minivan-peer-pressure-episode-1-013",
    "audioUrl": "https://traffic.megaphone.fm/EDLLC3477736751.mp3"
  },
  "speakers": [
    { "id": "paul", "name": "Paul Zarella", "role": "host" },
    { "id": "todd", "name": "Todd Deeken", "role": "host" }
  ],
  "annotations": [
    {
      "startTime": 53.12,
      "endTime": 57.6,
      "type": "car",
      "title": "Honda Prelude"
    },
    {
      "startTime": 898.24,
      "endTime": 902.96,
      "type": "car",
      "title": "Toyota Supra"
    }
  ]
}
```

### Container Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `string` | **Yes** | Spec version (semver, currently `"1.0.0"`) |
| `episode` | `object` | No | Episode metadata |
| `episode.title` | `string` | No | Episode title |
| `episode.guid` | `string` | No | Globally unique identifier for the episode (from RSS `<guid>`) |
| `episode.url` | `string` | No | Episode web page |
| `episode.audioUrl` | `string` | No | URL to the audio file |
| `episode.description` | `string` | No | Episode summary or show notes (plain text) |
| `episode.pubDate` | `string` | No | Publication date in RFC 2822 format (e.g., `"Fri, 26 Feb 2021 00:00:00 -0500"`) |
| `episode.duration` | `number` | No | Episode duration in seconds |
| `episode.season` | `number` | No | Season number (non-zero integer) |
| `episode.episodeNumber` | `number` | No | Episode number within the season or series (non-zero integer) |
| `transcripts` | `array` | No | Transcript files (see [Transcripts](#transcripts)) |
| `speakers` | `array` | No | Speaker definitions (see [Speakers](#speakers)) |
| `adBreaks` | `array` | No | Ad/insertion break ranges (see [Ad Breaks](#ad-breaks)) |
| `annotations` | `array` | **Yes** | Array of annotation objects |

The `episode` object is optional. When annotations are delivered alongside audio (e.g., via RSS or an API), episode metadata may be redundant. Including `episode.guid`, `episode.pubDate`, and `episode.duration` makes an annotation file self-contained: a consumer can identify and play the episode without fetching the RSS feed. These fields align with the corresponding RSS item elements (`<guid>`, `<pubDate>`, `<itunes:duration>`) defined in the [PSP-1 RSS specification](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification).

Short episode summaries or show notes can be included directly via `episode.description`. The recommended format is plain text. Producers MAY use markdown, but consumers SHOULD NOT assume markdown support. For richer episode-level metadata (licensing, series info), see Schema.org `PodcastEpisode`.

## Transcripts

The `transcripts` array links to transcript files associated with the audio. Multiple formats can be provided.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` | **Yes** | URL to the transcript file |
| `type` | `string` | **Yes** | MIME type of the transcript file (see below) |
| `language` | `string` | No | BCP 47 language tag (e.g., `"en"`, `"es"`) |

**Supported MIME types:**

| MIME type | Format |
|-----------|--------|
| `text/vtt` | WebVTT |
| `application/x-subrip` | SRT |
| `application/json` | JSON transcript |
| `text/html` | HTML transcript |
| `text/plain` | Plain text |

These values align with the `<podcast:transcript>` element defined in the [PSP-1 RSS specification](https://github.com/Podcast-Standards-Project/PSP-1-Podcast-RSS-Specification), allowing RSS feeds and annotation files to reference the same transcript resources without type translation.

```json
{
  "transcripts": [
    { "url": "https://example.com/ep42.vtt", "type": "text/vtt", "language": "en" },
    { "url": "https://example.com/ep42.srt", "type": "application/x-subrip", "language": "en" }
  ]
}
```

## Speakers

The `speakers` array defines the people speaking in the audio. Annotations reference speakers by `id`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | **Yes** | Unique identifier referenced by annotations |
| `name` | `string` | **Yes** | Display name |
| `role` | `string` | No | Role in the episode (see recommended values below) |
| `url` | `string` | No | URL to the speaker's profile or website |

```json
{
  "speakers": [
    { "id": "paul", "name": "Paul Zarella", "role": "host" },
    { "id": "todd", "name": "Todd Deeken", "role": "host" }
  ]
}
```

**Recommended roles:** `"host"`, `"guest"`, `"narrator"`, `"caller"`, `"correspondent"`. Custom roles should use lowercase. Consistent role values across implementations improve interoperability.

Speaker IDs are opaque strings. Use short, stable identifiers (e.g., `"s1"`, `"matt-farah"`). The same speaker across episodes should use the same ID to enable cross-episode analysis.

## Ad Breaks

The `adBreaks` array defines time ranges where dynamically inserted content (ads, promos, sponsorships) appears. This is separate from annotations to keep the semantic distinction clean: ad breaks are structural holes in the content, not entity references.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `startTime` | `number` | **Yes** | Start time in seconds |
| `endTime` | `number` | **Yes** | End time in seconds |
| `label` | `string` | No | Type of insertion (e.g., `"ad"`, `"promo"`, `"sponsorship"`) |
| `position` | `string` | No | Placement: `"pre-roll"`, `"mid-roll"`, or `"post-roll"` |

```json
{
  "adBreaks": [
    { "startTime": 120.0, "endTime": 150.0, "label": "ad", "position": "mid-roll" },
    { "startTime": 600.0, "endTime": 630.0, "label": "promo", "position": "mid-roll" }
  ]
}
```

Players can use ad breaks to skip or realign annotations around dynamic ad insertion. When the audio variant differs from the canonical recording (different ads stitched in at different times), the ad break ranges describe where the inserted content lives.

**Overlapping annotations:** When an annotation's time range overlaps with an ad break, behavior is player-defined. A player might pause the annotation during the ad and resume after, skip the annotation entirely, or extend it past the break. This spec does not mandate a specific behavior. Implementations should document their approach.

## Recommended Entity Types

### Core types

The following types are genre-neutral and recommended for interoperability across all kinds of podcasts. This list is not exhaustive; producers may use any string value for `type`.

| Type | Description | Example |
|------|-------------|---------|
| `topic` | A discussion segment or subject | "Coachella recap", "Setting boundaries" |
| `concept` | A broader topic or idea | "Carbon capture", "Dollar-cost averaging" |
| `person` | A person referenced in the content | "Jensen Huang", "Enzo Ferrari" |
| `place` | A location or venue | "Nürburgring", "Cape Canaveral" |
| `organization` | A company, team, institution, or group | "NASA", "General Motors" |
| `company` | An organization acting as a corporate or market actor | "NVIDIA", "Stellantis" |
| `brand` | A consumer-facing product or marque identity | "Brembo", "Michelin" |
| `product` | A specific commercial product or model | "iPhone 15", "1967 Ford Mustang" |
| `work` | A creative work (book, film, album, song, paper) | "Big Magic", "Blade Runner" |
| `event` | A scheduled or historical happening | "Super Bowl LVIII", "Battle of Hastings" |
| `term` | A technical or domain-specific term | "Helium-3", "Oversteer" |

### Disambiguating `company` vs `brand`

The `company` and `brand` types overlap in practice: most brands belong to a company, and many companies are referred to by their brand name. The following guidance is non-normative. Producers MAY disregard it. It is offered as a consistency tool to keep annotator judgment from drifting between coin flips, for automated producers in particular.

The rule is a *role test*, not an *ontology test*. Tag based on how the name is being used in the surrounding utterance, not on what the entity ontologically is.

- **`brand`** - the name as it appears on a product, in marketing, or as a consumer-facing identity. Signals: product ownership, design references, model lineups, marque or livery talk.
- **`company`** - the entity as a corporate or market actor. Signals: M&A, financials, executives, hiring or layoffs, lawsuits, vendor or supplier relationships, headquarters references.

Examples:

- "I upgraded to Brembo calipers" - `brand` (product ownership)
- "Cosworth tuned the rod ratio to 1.8" - `brand` (the name on the engine)
- "The Stellantis lineup is mostly trucks and SUVs now" - `brand` (model lineup)
- "Brembo acquired Marelli's suspension business" - `company` (M&A)
- "Cosworth was sold to Engelhard in 1998" - `company` (M&A)
- "Stellantis raised prices across the portfolio" - `company` (market actor)

When both senses apply in the same mention, producers SHOULD prefer `brand`; consumer-facing podcast audio is more often product-focused than market-actor-focused. If the role cannot be decided from a 2-3 sentence window, default to `brand`.

Use `organization` as the broader umbrella when the mention invokes neither the corporate-actor (`company`) nor the consumer-brand (`brand`) role, such as a sports team, a government agency, a university, or a nonprofit.

### Domain-specific types

The core types cover most podcasts, but many genres have natural entity types of their own. These examples are non-normative; they show how the format extends to specific niches. Producers invent types freely, and consumers MUST ignore types they don't recognize (see [Ordering and Overlaps](#ordering-and-overlaps) and the `data` field for how unknown values are handled).

| Type | Genre | Example |
|------|-------|---------|
| `car` | Automotive | "1967 Ford Mustang" |
| `part` | Automotive | "Turbocharger", "LS3 crate engine" |
| `recipe` | Cooking | "Beef Wellington" |
| `ingredient` | Cooking | "San Marzano tomatoes" |
| `technique` | Cooking | "Sous vide" |
| `plant` | Gardening | "Brandywine tomato" |
| `athlete` | Sports | "Patrick Mahomes" |
| `team` | Sports | "Kansas City Chiefs" |
| `case` | True crime | "The Golden State Killer case" |
| `ticker` | Finance | "NVDA" |
| `tool` | Software | "PostgreSQL" |
| `library` | Software | "React" |

A domain-specific type often pairs with domain-specific `data` fields (e.g. a `recipe` with `data.servings`, a `plant` with `data.scientificName`). See [Cross-Genre Annotation Examples](#cross-genre-annotation-examples).

All type values use **lowercase**. Producers SHOULD use recommended types when applicable to maximize interoperability. Single words are preferred for common types. Custom types SHOULD be hyphenated (e.g., `"race-series"`, `"engine-code"`).

## File Extension and MIME Type

| | Recommendation |
|--|----------------|
| File extension | `.annotations.json` |
| MIME type | `application/json` |

## Examples

### Automotive Podcast

From [The Everyday Driver Podcast](https://getcarcurious.com), Episode 1,013 (113 annotations across ~97 minutes):

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "Cars That Need A Comeback (A-M), The Fourth Car, Minivan Peer Pressure | Episode 1,013",
    "url": "https://getcarcurious.com/episodes/cars-that-need-a-comeback-a-m-the-fourth-car-minivan-peer-pressure-episode-1-013",
    "audioUrl": "https://traffic.megaphone.fm/EDLLC3477736751.mp3"
  },
  "speakers": [
    { "id": "paul", "name": "Paul Zarella", "role": "host" },
    { "id": "todd", "name": "Todd Deeken", "role": "host" }
  ],
  "annotations": [
    {
      "startTime": 53.12,
      "endTime": 57.6,
      "type": "car",
      "title": "Honda Prelude",
      "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/1982_Honda_Prelude_%2815977118997%29.jpg/1200px-1982_Honda_Prelude_%2815977118997%29.jpg",
      "data": {
        "imageAttribution": "Riley from Christchurch, New Zealand (CC BY 2.0)"
      }
    },
    {
      "startTime": 145.1,
      "endTime": 145.1,
      "type": "part",
      "title": "solenoid handles",
      "data": {
        "explanation": "Electronic door handles that use a solenoid mechanism to lock and unlock. Common in modern EVs, they can malfunction if jammed or stuck."
      }
    },
    {
      "startTime": 760.6,
      "endTime": 773.0,
      "type": "company",
      "title": "FCP Euro",
      "data": {
        "explanation": "Supplier of automotive parts specializing in genuine OE and aftermarket performance upgrades for European vehicles."
      }
    },
    {
      "startTime": 898.2,
      "endTime": 901.0,
      "type": "term",
      "title": "2JZ engine",
      "data": {
        "explanation": "A 3.0-liter inline-six engine produced by Toyota, famous for its strength and tuning potential. Most well-known for powering the Toyota Supra Mark IV."
      }
    },
    {
      "startTime": 898.24,
      "endTime": 902.96,
      "type": "car",
      "title": "Toyota Supra",
      "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/D%C3%BClmen%2C_Auto_Bertels%2C_Toyota_GR_Supra_--_2021_--_9558.jpg/1200px-D%C3%BClmen%2C_Auto_Bertels%2C_Toyota_GR_Supra_--_2021_--_9558.jpg",
      "data": {
        "imageAttribution": "Dietmar Rabich (CC BY-SA 4.0)"
      }
    }
  ]
}
```

The full 113-annotation file is available at [`examples/everyday-driver-episode-1013.annotations.json`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/everyday-driver-episode-1013.annotations.json).

### Additional Examples

Real-world annotation sets from published podcast episodes, showing the format across genres and how each file was assembled:

| Example | Genre | Annotations | Assembly |
|---------|-------|-------------|--------|
| [`everyday-driver-episode-1013`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/everyday-driver-episode-1013.annotations.json) | Automotive review | 113 | AI-generated from transcript |
| [`bat-podcast-just-back-from-japan`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/bat-podcast-just-back-from-japan.annotations.json) | Automotive auction | 21 | Converted from timestamped show notes |
| [`acquired-ferrari`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/acquired-ferrari.annotations.json) | Business history | 16 | Converted from timestamped show notes |
| [`lex-fridman-494-jensen-huang`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/lex-fridman-494-jensen-huang.annotations.json) | Tech/AI interview | 21 | Converted from timestamped show notes |
| [`science-vs-artemis-moon`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/science-vs-artemis-moon.annotations.json) | Science journalism | 6 | Converted from timestamped show notes |
| [`science-vs-running`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/science-vs-running.annotations.json) | Health/fitness | 5 | Converted from timestamped show notes |
| [`tim-ferriss-770-elizabeth-gilbert`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/tim-ferriss-770-elizabeth-gilbert.annotations.json) | Creativity/self-help | 25 | Converted from timestamped show notes |
| [`higher-learning-coachella-bambaataa`](https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/higher-learning-coachella-bambaataa.annotations.json) | Culture/politics | 10 | Converted from timestamped show notes |

### Cross-Genre Annotation Examples

The format is genre-neutral. You annotate a car in an automotive show, a recipe in a cooking show, a plant in a gardening show, and a stock in a finance show with the same timing-plus-entity model. Only the `type` value and the domain-specific fields inside `data` change from genre to genre; the structure stays the same.

The table below maps common podcast genres to the types and references they tend to produce:

| Genre | Typical types | What gets annotated |
|-------|---------------|---------------------|
| Cooking | `recipe`, `ingredient`, `technique` | Dishes made, key ingredients, methods (e.g. "sous vide") |
| Gardening | `plant`, `term` | Plant IDs (species/cultivar), pests, soil and zone terms |
| True crime | `case`, `person`, `place` | The case, victims and suspects, locations, evidence |
| Sports | `athlete`, `team`, `event` | Players, teams, specific games and matches, records |
| History | `event`, `person`, `place` | Battles, treaties, figures, dates, sites |
| Personal finance | `ticker`, `company`, `concept` | Stocks and tickers, firms, strategies (e.g. "FIRE") |
| Software engineering | `tool`, `library`, `term` | Languages, frameworks, services, patterns |
| Books / literature | `work`, `person` | Books discussed, authors, characters |
| Travel | `place`, `term` | Destinations, attractions, lodging, transit |
| Music | `work`, `person` | Songs and albums, artists, venues, genres |

Two worked annotations show how domain-specific detail lives in `data`. (These are illustrative, like the [Minimal Interview Example](#minimal-interview-example) below; the published annotation sets in [`examples/`](https://github.com/ryanwi/podcast-annotations-js/tree/main/examples) are all real episodes.)

**Cooking, a recipe mentioned in a food podcast:**

```json
{
  "startTime": 612.0,
  "endTime": 705.0,
  "type": "recipe",
  "title": "Beef Wellington",
  "url": "https://example.com/recipes/beef-wellington",
  "quote": "you sear the tenderloin, then wrap it in mushroom duxelles and pastry",
  "data": {
    "cuisine": "British",
    "servings": 6,
    "prepTimeMinutes": 90,
    "ingredients": ["beef tenderloin", "mushroom duxelles", "puff pastry", "prosciutto"],
    "difficulty": "advanced"
  }
}
```

**Gardening, a plant identified in a gardening podcast:**

```json
{
  "startTime": 240.0,
  "endTime": 288.0,
  "type": "plant",
  "title": "Brandywine Tomato",
  "image": "https://example.com/plants/brandywine.jpg",
  "quote": "the Brandywine is the heirloom everyone asks me about",
  "data": {
    "scientificName": "Solanum lycopersicum 'Brandywine'",
    "commonNames": ["Brandywine tomato", "beefsteak heirloom"],
    "hardinessZone": "3-9",
    "sunExposure": "full sun",
    "nativeRegion": "United States (heirloom cultivar)"
  }
}
```

### Minimal Interview Example

```json
{
  "version": "1.0.0",
  "episode": {
    "title": "Climate Tech with Dr. Sarah Chen"
  },
  "speakers": [
    { "id": "host", "name": "Alex Rivera", "role": "host" },
    { "id": "guest", "name": "Dr. Sarah Chen", "role": "guest" }
  ],
  "annotations": [
    {
      "startTime": 30.0,
      "endTime": 55.0,
      "type": "person",
      "title": "Dr. Sarah Chen",
      "url": "https://example.com/guests/sarah-chen"
    },
    {
      "startTime": 120.0,
      "endTime": 180.0,
      "type": "concept",
      "title": "Carbon capture and storage",
      "url": "https://en.wikipedia.org/wiki/Carbon_capture_and_storage",
      "speaker": "guest",
      "quote": "we're pulling CO2 directly from the atmosphere"
    },
    {
      "startTime": 300.0,
      "endTime": 330.0,
      "type": "brand",
      "title": "Climeworks",
      "url": "https://climeworks.com",
      "speaker": "guest"
    },
    {
      "startTime": 450.0,
      "endTime": 480.0,
      "type": "place",
      "title": "Orca Plant, Iceland",
      "speaker": "host",
      "data": {
        "lat": 64.0,
        "lng": -21.4
      }
    }
  ]
}
```

## W3C Web Annotation Mapping

Podcast annotations can be expressed as [W3C Web Annotations](https://www.w3.org/TR/annotation-model/) for interoperability with standards-compliant tools. The mapping uses [Media Fragments](https://www.w3.org/TR/media-frags/) for temporal targeting.

A podcast annotation:

```json
{
  "startTime": 53.12,
  "endTime": 57.6,
  "type": "car",
  "title": "Honda Prelude"
}
```

Maps to this W3C Web Annotation:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "type": "Annotation",
  "body": {
    "type": "TextualBody",
    "value": "Honda Prelude",
    "purpose": "describing",
    "format": "text/plain"
  },
  "target": {
    "source": "https://traffic.megaphone.fm/EDLLC3477736751.mp3",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "t=53.12,57.6"
    }
  }
}
```

### Mapping Rules

| Podcast Annotation Field | W3C Web Annotation |
|-----------|--------------------
| `startTime`, `endTime` | `target.selector.value` as `t=start,end` |
| `title` | `body.value` |
| `type` | Custom `body.type` or encoded within `body.purpose`, depending on implementation |
| `url` | Additional `body` with `purpose: "linking"` |
| `image` | Additional `body` with `purpose: "depicting"` |
| `quote` | `body[1]` with `purpose: "quoting"` |
| `speaker` | May be represented via `creator` or external metadata in W3C systems |
| `confidence` | Not mapped (application-specific) |
| `data` | Not mapped (application-specific) |
| `episode.audioUrl` | `target.source` |

> **Note:** The W3C mapping requires `episode.audioUrl` to populate `target.source`. Annotation sets without `episode.audioUrl` cannot produce complete W3C Web Annotations.

## Relationship to Other Standards

**Podcasting 2.0 Chapters.** Chapters define coarse segments (intro, topic, outro) with titles and artwork. Podcast annotations are fine-grained entity references within those segments. They are complementary: an episode might have 5 chapters and 40 annotations.

**WebVTT / SRT.** Subtitle formats carry the transcript text. This spec carries the entities and topics referenced in that text. A player might use WebVTT for the transcript and podcast annotations for contextual overlays.

**Schema.org PodcastEpisode.** Schema.org defines episode-level metadata for search engines. This spec defines within-episode annotations. A `PodcastEpisode` might link to an `.annotations.json` file via a custom property.

**Show Notes.** Show notes are the most common form of podcast annotation today: episode summaries, timestamps, guest info, and links published as freeform prose via RSS `<description>` or `<content:encoded>`. An annotation set is a structured, machine-readable representation of the same information. Show notes describe what was discussed; annotations make it addressable, linkable, and renderable in sync with playback. Producers can use annotation sets to generate show notes, or use existing show notes as a starting point for annotation.

**Podcasting 2.0 `<podcast:person>`.** Tags people at the episode level (hosts, guests). Podcast annotations with `type: "person"` tag people at the moment level: when they are discussed, not only who is on the show.

**RSS Distribution.** An episode's annotation file MAY be referenced from the RSS feed or episode web page. The `<podcast:transcript>` element defined in PSP-1 provides a clear model: a `url` attribute and a `type` attribute. A `<podcast:annotations>` element would follow the same pattern:

```xml
<podcast:annotations url="https://example.com/episode1.annotations.json" type="application/json" />
```

This element would live inside `<item>`, alongside `<podcast:transcript>`. See the [Podcasting 2.0 namespace](https://podcastindex.org/namespace/1.0) for the proposal process.

**Wikidata / DBpedia.** The `url` field on annotations can reference Wikidata entities (e.g., `https://www.wikidata.org/wiki/Q5300`) for canonical, language-independent entity identification. This enables linked data use cases without adding complexity to the core format.

**Linked Data Ontologies.** Ontologies such as the BBC's Linked Data Platform describe entities, creative works, web documents, products, and provenance. Podcast annotations are compatible with that model, but solve a different problem: they say when an entity or topic is relevant inside an audio timeline. Implementations can store ontology identifiers in `canonicalId`, `url`, `tags`, or `data` while keeping the core timing format simple.

## Reference Implementation

[podcast-annotations](https://github.com/ryanwi/podcast-annotations-js) is a framework-agnostic JavaScript library for rendering podcast annotations with audio players. It supports annotation overlays, transcript sync, timelines, chapters, and DAI alignment.

This format was developed by [Car Curious](https://getcarcurious.com), a podcast annotation platform for automotive content, and is released as an open specification for the broader podcast ecosystem.

## License

This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
