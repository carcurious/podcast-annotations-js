# Podcast Annotation Format

**Version 1.1.0**

A minimal JSON format for timestamped entity annotations on podcast and spoken media content.

## Overview

A transcript records the words and when they were said. It does not tell an app that a host mentioned a 1969 Camaro at 0:45, switched to turbochargers at 2:00, or spent the next 30 seconds on Carroll Shelby. Listeners follow that structure without thinking about it, but almost none of it exists anywhere as structured data.

The Podcast Annotation Format is a JSON spec for timestamped entity and topic annotations on spoken audio. Annotation sets can be produced by humans, automated pipelines, or hybrid workflows. The goal is to make the references inside a podcast episode addressable, so that a player, search index, archive, or show-notes generator can do something useful with them.

In the moment, annotations give a player something to render: an overlay, a timeline, a side panel synced to playback. The larger payoff builds up across a catalog. Once entities carry stable identifiers (see [Canonical IDs](#canonical-ids)), a single episode's annotations join a corpus-wide index, "every episode that discusses the 2JZ engine" becomes a query, and an AI agent can answer it over a back catalog without re-listening or re-transcribing. Producers publish one file per episode, but most of the value ends up in the entity graph that accumulates across those files.

This spec defines the annotation, not the transport. A sidecar JSON file is the simplest carrier today, but the same annotation model can be embedded in RSS, returned from an API, or delivered however a producer and consumer choose. Because annotations live beside the audio rather than inside it, a producer can add, correct, or remove them without re-encoding or re-publishing the episode, and several producers can annotate the same audio independently (see [Layers](#layers)).

### Design Principles

Two fields are required, `startTime` and `endTime`. Everything else is optional, and anything app-specific belongs in the open `data` object rather than in new top-level fields. The format itself is plain JSON: no JSON-LD, no XML, no runtime dependencies. It should also read well raw. A developer opening an annotation set for the first time ought to be able to work out what it means without consulting this spec.

### Non-Goals

- Transcription. Spoken text belongs in WebVTT, SRT, or a transcript JSON format, not here.
- Replacing chapters, which describe coarse segments. Annotations describe specific references within them.
- A fixed ontology. Recommended types exist for interoperability, but producers may extend the format.
- Prescribing a UI. A player may render overlays, timelines, side panels, search results, or no direct UI at all.

## Prior Art & Inspiration

Timed context on media has a long track record; podcasting has transcripts, chapters, and show notes, but no compact file for within-episode references. VH1's *Pop-Up Video* was overlaying timestamped trivia on music videos in the late 1990s. Amazon's X-Ray on Prime Video does the same job today, syncing cast, characters, and trivia to the current scene, and it is the closest thing this spec has to a canonical reference. Amazon has never published X-Ray's underlying data model, which is part of why writing this one down in the open is worth doing. On the audio side, SoundCloud's timed comments were among the earliest mainstream timestamped annotations on sound: listeners drop a comment at any `t=` position in a track, and they use the feature heavily enough to show that people will engage with audio at the level of a single moment.

Two products outside podcasting show the pattern holding up at scale. Genius built a community annotation layer on song lyrics and turned entity-level annotation on media content into a durable product; structurally it is the closest analog to this format, an annotation body attached to an anchor in the media, with a URL for more context. The BBC's public Linked Data ontologies approach the problem from the graph side, modeling "Things" (people, places, organisations, themes, programmes, web documents) so content can be connected through shared topics. Podcast annotations address a smaller layer: when one of those things becomes relevant inside an audio episode.

Podcasting itself supplies the rest of the precedent. Chapters (Podcasting 2.0, Podlove, MP4) are coarse timestamped metadata that podcast apps already implement, which is evidence the ecosystem adopts spec extensions when they improve listening. Overcast has shipped structured-metadata features for years (Smart Speed, chapters, transcript sync), and Marco Arment's public discussion of synchronizing transcripts across dynamic ad insertion informed this spec's approach to ad break alignment. Snipd lets listeners highlight and annotate moments for personal note-taking, so listener-side annotation on podcast audio is already in production; this spec makes the same capability an open, shared layer instead of a closed personal tool. Most recently, [Apple Podcasts Timed Links](https://podcasters.apple.com/support/5536-links-on-apple-podcasts) (iOS 26.2, Nov 2025) render creator-authored timed links as banners on the Now Playing screen, inline in the transcript, and in a "From This Episode" section. At the scale of Apple's own listener base, that confirms a moment inside an episode deserves its own addressable UI, not just the episode as a whole. The feature is far narrower than this spec, with link destinations limited to Apple's own ecosystem and other podcasts, and no typed entities, canonical IDs, or layers; see [Relationship to Other Standards](#relationship-to-other-standards).

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
| `participation` | `string` | No | For `type: "person"` only: how the person figures in this moment: present as a `"guest"`/`"host"`, or only `"mentioned"` (see [Participation](#participation)). Omission means unspecified, not `"mentioned"`; consumers SHOULD ignore it on other types. |
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

An annotation MAY set `endTime` equal to `startTime` to mark a point in time rather than a span, such as the `solenoid handles` entry in the [automotive example](#automotive-podcast) below. Consumers SHOULD render point annotations with a nonzero display window.

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

### Validation Rules

- `startTime` MUST be >= 0
- `endTime` MUST be >= `startTime`
- `confidence`, if provided, MUST be >= 0.0 and <= 1.0. This reflects extraction certainty: how sure the producer is that this annotation is correct.
- `priority`, if provided, MUST be >= 0.0 and <= 1.0. This reflects editorial importance: how prominently this annotation should be displayed. A high-confidence annotation may still have low priority if it's tangential.
- `speaker`, if provided, MUST reference a valid `id` in the `speakers` array
- `participation`, if provided, SHOULD be one of `"guest"`, `"host"`, or `"mentioned"`. Custom values are allowed but reduce interoperability. It applies only when `type` is `"person"`; consumers SHOULD ignore it on other types.
- An omitted `participation` is unspecified, not `"mentioned"`. Consumers MUST NOT treat absence as a claim: an annotation predating this field, or one whose producer did not set it, carries no participation assertion. Only an explicit `"mentioned"` asserts that the person was referenced but not present.
- Time values SHOULD be within the duration of the associated audio

### Canonical IDs

The `canonicalId` field provides a stable, human-readable identifier for the underlying entity, not the annotation itself. The same entity across multiple episodes or annotation sets SHOULD use the same `canonicalId`, enabling cross-episode deduplication, entity graphs, and aggregate views (e.g., "every episode that mentions the LS engine").

There is no required format, but a namespaced convention is recommended:

- `car:chevrolet:camaro:1969`
- `person:carroll-shelby`
- `place:nurburgring`

Producers MAY also use external identifiers such as Wikidata QIDs (e.g., `wikidata:Q332448`).

### Participation

`participation` records how a person figures in a single annotation: `"guest"` (present on the show), `"host"`, or `"mentioned"` (referenced but not present). Omission means unspecified, not `"mentioned"`. A producer who does not track participation, or an annotation written before the field existed, makes no claim either way, so consumers building guest graphs SHOULD treat only explicit values as signal.

It is orthogonal to `speaker` and the `speakers` array: `speaker` says who is talking during the annotation, the `speakers` array assigns episode-level roles, and `participation` describes the annotated person's role at that one moment. With explicit values, a consumer can separate "the guest was introduced here" from "the guest was named in passing" without a second extraction pass. The same person can carry different `participation` values across an episode.

```json
[
  {
    "startTime": 30.0,
    "endTime": 55.0,
    "type": "person",
    "title": "Dr. Sarah Chen",
    "participation": "guest",
    "canonicalId": "person:sarah-chen",
    "url": "https://example.com/guests/sarah-chen"
  },
  {
    "startTime": 1820.0,
    "endTime": 1827.0,
    "type": "person",
    "title": "Dr. Sarah Chen",
    "participation": "mentioned",
    "canonicalId": "person:sarah-chen",
    "speaker": "host",
    "quote": "like Sarah said earlier about direct air capture"
  }
]
```

## Annotation Set

An annotation set is the container format for a collection of annotations associated with a single episode or audio file.

```json
{
  "version": "1.1.0",
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
| `version` | `string` | **Yes** | Spec version (semver, currently `"1.1.0"`) |
| `layer` | `string` | No | Name of this annotation layer, used to distinguish concurrent sets for the same audio (see [Layers](#layers)) |
| `producer` | `string` | No | Identifier for who or what produced this set (e.g., `"everyday-driver-official"`, `"acme-ai-enrichment"`) |
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

### Layers

The same audio can carry annotations from more than one producer: a show's official set, a third-party AI enrichment pass, and a community contribution layer can all describe the same episode without coordinating. Rather than merging these into one file at the source, each producer publishes its own self-contained annotation set and consumers combine them as needed.

The optional `layer` and `producer` fields let a set identify itself so a consumer can fetch, diff, replace, or filter layers independently. `layer` names the role of the set (e.g., `"official"`, `"community"`); `producer` names who generated it. A consumer might show only the official layer by default and let the listener opt into others, or attribute each annotation to its producer in the UI.

For diff and replacement to be unambiguous, the `(producer, layer)` pair SHOULD be stable and unique for a given episode or audio file: stable so a later revision of the same layer replaces the earlier one rather than appearing as a new layer, and unique so two distinct sets do not collide. `layer` SHOULD be a slug-like string — lowercase, no spaces, hyphenated if needed (e.g., `"official"`, `"community"`, `"ai-enrichment"`) — so that `"community"` and `"Community"` are not treated as different layers. `producer` SHOULD be a stable identifier for the producing party (e.g., a reverse-DNS or namespaced handle like `"fm.getcarcurious"` or `"acme-ai-enrichment"`) rather than a display name that may change. When either field is omitted, a consumer cannot reliably diff or replace that set and SHOULD treat it as an anonymous, standalone layer.

```json
{
  "version": "1.1.0",
  "layer": "community",
  "producer": "acme-ai-enrichment",
  "annotations": [ ]
}
```

This spec does not define merge semantics across layers. When a consumer combines layers, deduplication and conflict resolution are consumer-defined. `canonicalId` identifies the underlying entity, not the timeline occurrence (see [Canonical IDs](#canonical-ids)), so it collapses cleanly in an *entity index* ("which layers mention the LS engine"). It is not sufficient on its own to dedupe *timeline annotations*: two layers may annotate the same entity at different moments, and those are distinct occurrences that should not merge. A consumer deduping annotations for a timeline SHOULD also require time-range overlap, treating same `canonicalId` plus overlapping `[startTime, endTime]` as the same occurrence. In RSS, each layer is carried by its own `<podcast:annotations>` element, mirroring how a feed already lists multiple `<podcast:transcript>` resources (see [Relationship to Other Standards](#relationship-to-other-standards)).

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
  "version": "1.1.0",
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

The full 113-annotation file is available at [`examples/everyday-driver-episode-1013.annotations.json`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/everyday-driver-episode-1013.annotations.json).

### Additional Examples

Real-world annotation sets from published podcast episodes, showing the format across genres and how each file was assembled:

| Example | Genre | Annotations | Assembly |
|---------|-------|-------------|--------|
| [`everyday-driver-episode-1013`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/everyday-driver-episode-1013.annotations.json) | Automotive review | 113 | AI-generated from transcript |
| [`bat-podcast-just-back-from-japan`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/bat-podcast-just-back-from-japan.annotations.json) | Automotive auction | 21 | Converted from timestamped show notes |
| [`acquired-ferrari`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/acquired-ferrari.annotations.json) | Business history | 16 | Converted from timestamped show notes |
| [`lex-fridman-494-jensen-huang`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/lex-fridman-494-jensen-huang.annotations.json) | Tech/AI interview | 23 | Show notes plus `participation`-tagged people |
| [`science-vs-artemis-moon`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/science-vs-artemis-moon.annotations.json) | Science journalism | 6 | Converted from timestamped show notes |
| [`science-vs-running`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/science-vs-running.annotations.json) | Health/fitness | 5 | Converted from timestamped show notes |
| [`tim-ferriss-770-elizabeth-gilbert`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/tim-ferriss-770-elizabeth-gilbert.annotations.json) | Creativity/self-help | 25 | Converted from timestamped show notes |
| [`higher-learning-coachella-bambaataa`](https://github.com/carcurious/podcast-annotations-js/blob/main/examples/higher-learning-coachella-bambaataa.annotations.json) | Culture/politics | 10 | Converted from timestamped show notes |

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

Two worked annotations show how domain-specific detail lives in `data`. (These are illustrative, like the [Minimal Interview Example](#minimal-interview-example) below; the published annotation sets in [`examples/`](https://github.com/carcurious/podcast-annotations-js/tree/main/examples) are all real episodes.)

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
  "version": "1.1.0",
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
| `participation` | Not mapped (application-specific) |
| `confidence` | Not mapped (application-specific) |
| `data` | Not mapped (application-specific) |
| `episode.audioUrl` | `target.source` |

> **Note:** The W3C mapping requires `episode.audioUrl` to populate `target.source`. Annotation sets without `episode.audioUrl` cannot produce complete W3C Web Annotations.

## Relationship to Other Standards

Podcasting 2.0 chapters and annotations are complementary. Chapters define coarse segments (intro, topic, outro) with titles and artwork; annotations are the fine-grained entity references inside those segments. An episode might carry 5 chapters and 40 annotations, and neither constrains the other. WebVTT and SRT sit on a different axis entirely. Subtitle formats carry the transcript text, this spec carries the entities and topics referenced in that text, and a player can use both at once: WebVTT for the transcript, annotations for contextual overlays.

**Apple Podcasts Timed Links.** Starting with iOS 26.2 (Nov 2025), Apple Podcasts renders creator-authored timed links as banners on the Now Playing screen, inline in the transcript, and in a "From This Episode" section on the episode page ([Apple's timed links documentation](https://podcasters.apple.com/support/5536-links-on-apple-podcasts); see also [chapters, links, and more](https://podcasters.apple.com/support/5545-enhance-episodes-with-chapters-links-more)). Creators author these links two ways: hyperlinked text and a timestamp in the episode description, or `url` fields on the existing Podcasting 2.0 `<podcast:chapters>` JSON. Apple introduced no new RSS tag for this. Apple also auto-detects podcast mentions in English-language shows and links to the mentioned show; creators can opt out via Apple Podcasts Connect.

The feature validates the moment-level pattern this spec is built on, at much narrower scope. Link destinations are limited to Apple's own ecosystem (Apple Books, Music, Music Classical, Maps, News, Podcasts, Sports, Stocks, TV, Shazam) and other podcasts; a timed link cannot point at an arbitrary URL. It also carries no typed entity (`person`, `place`, `car`, …), no `canonicalId`, no `layer`/`producer`, and no time span: it fires at a point, not across the range where an entity is discussed. Apple documents how timed links render. It has not published a data model for what one is.

*Interop guidance:* Apple already renders `url` fields on `<podcast:chapters>`, so a producer can export a slice of their highest-`priority` annotations into a chapters file and get Apple Podcasts to render them as timed links today, with no new infrastructure. This export is lossy and one-way: a chapters entry carries no `type`, `canonicalId`, `speaker`, or `confidence`, and chapters stay coarse and non-overlapping by design. iOS 26.2 also only auto-generates chapters when a feed provides none, so publishing every annotation as a chapter would suppress that auto-generation too. Export only the editorial highlights this way, and keep the full annotation set in the sidecar file or, per the RSS Distribution guidance below, a `<podcast:annotations>` element.

Show notes are the closest thing podcasting already has to annotations: episode summaries, timestamps, guest info, and links, published as freeform prose via RSS `<description>` or `<content:encoded>`. An annotation set is a structured, machine-readable representation of the same information. Where show notes describe what was discussed, annotations make each reference addressable, linkable, and renderable in sync with playback, and the two can feed each other. Producers can generate show notes from an annotation set, or start annotating from existing show notes; several of the files in [Additional Examples](#additional-examples) were assembled the second way.

Podcasting 2.0's `<podcast:person>` tag names people at the episode level: who hosted, who guested. Annotations with `type: "person"` name people at the moment level, when they are discussed, not only who is on the show. The optional `participation` field bridges the two granularities by marking whether a person is a `"guest"`, `"host"`, or merely `"mentioned"` at a given point in the timeline. The mapping is partial. `"guest"` and `"host"` correspond to `<podcast:person role="…">`, but `"mentioned"` has no `<podcast:person>` equivalent, because that tag does not model the difference between presence and reference.

**RSS Distribution.** An episode's annotation file MAY be referenced from the RSS feed or episode web page. The `<podcast:transcript>` element defined in PSP-1 provides a clear model: a `url` attribute and a `type` attribute. A `<podcast:annotations>` element would follow the same pattern:

```xml
<podcast:annotations url="https://example.com/episode1.annotations.json" type="application/json" />
```

This element would live inside `<item>`, alongside `<podcast:transcript>`. An `<item>` MAY carry more than one `<podcast:annotations>` element, one per [layer](#layers) (the official set, a third-party enrichment, a community contribution), exactly as a feed MAY list multiple `<podcast:transcript>` resources for different formats or languages.

So a consumer can choose layers *without* fetching every URL first, the element MAY carry `layer` and `producer` attributes that mirror the in-file fields of the same name. These are structured machine selectors — the feed-level equivalent of the `language` and `rel` attributes on `<podcast:transcript>` — and let a player filter to "official only" or skip community layers using the feed alone. An optional `title` attribute MAY carry a human-readable label for UI display; unlike `layer`/`producer`, `title` is not a selector and consumers MUST NOT key filtering or replacement off it.

When present, the `layer` and `producer` attributes SHOULD match the `layer` and `producer` fields inside the referenced set; the in-file fields remain authoritative if they disagree. As with the in-file fields, the `(producer, layer)` pair SHOULD be stable and unique per episode so a consumer can replace a layer across feed updates.

```xml
<podcast:annotations url="https://example.com/episode1.official.annotations.json"
                     type="application/json"
                     layer="official" producer="fm.getcarcurious" title="Official" />
<podcast:annotations url="https://example.com/episode1.community.annotations.json"
                     type="application/json"
                     layer="community" producer="acme-ai-enrichment" title="Community" />
```

See the [Podcasting 2.0 namespace](https://podcastindex.org/namespace/1.0) for the proposal process.

On the linked-data side, Schema.org's `PodcastEpisode` defines episode-level metadata for search engines, and a `PodcastEpisode` might link to an `.annotations.json` file via a custom property; the two operate at different granularities. Wikidata and DBpedia work well as targets for the `url` and `canonicalId` fields. Pointing an annotation at `https://www.wikidata.org/wiki/Q5300` gives it a canonical, language-independent entity identity without adding any machinery to the core format. Richer ontologies, such as the BBC's Linked Data Platform, describe entities, creative works, web documents, products, and provenance; podcast annotations are compatible with that model but solve a different problem, saying when an entity or topic is relevant inside an audio timeline. Implementations that live in both worlds can store ontology identifiers in `canonicalId`, `url`, `tags`, or `data` while keeping the core timing format simple.

## Reference Implementation

[podcast-annotations](https://github.com/carcurious/podcast-annotations-js) is a framework-agnostic JavaScript library for rendering podcast annotations with audio players. It supports annotation overlays, transcript sync, timelines, chapters, and DAI alignment.

This format was developed by [Car Curious](https://getcarcurious.com), a podcast annotation platform for automotive content, and is released as an open specification for the broader podcast ecosystem.

## Changelog

This changelog tracks the **specification** version (the number in the `**Version**` header and the annotation set `version` field), which is independent of the reference implementation's npm package version. The spec uses semantic versioning: additive, backward-compatible changes bump the minor version; breaking changes bump the major version.

### 1.1.0

- **Added `layer` and `producer`** container fields so multiple producers can annotate the same audio as independent [layers](#layers), with a stable-and-unique `(producer, layer)` identity rule for diff and replacement.
- **RSS:** an `<item>` MAY carry multiple `<podcast:annotations>` elements, one per layer, with machine-readable `layer`/`producer` attributes as feed-level selectors (`title` is a UI label only).
- Clarified that cross-layer annotation dedupe requires `canonicalId` **plus** time-range overlap; `canonicalId` alone keys an entity index, not a timeline occurrence.
- Promoted the cross-episode entity-graph use case into the overview and noted sidecar mutability as a design property.

### 1.0.0

- Initial specification: annotation objects, annotation sets, speakers, transcripts, ad breaks, recommended entity types, and W3C Web Annotation mapping.
- The following backward-compatible additions were folded in under `1.0.0` without a version bump: the `participation` field for `person` annotations, `company` vs `brand` disambiguation guidance, and point-in-time annotations (`endTime` equal to `startTime`).

## License

This specification is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
