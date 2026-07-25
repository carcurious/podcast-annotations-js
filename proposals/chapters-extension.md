# Annotations as a `<podcast:chapters>` extension

**Status:** Draft / exploratory. The goal is for `<podcast:chapters>` to carry the annotation model
outright, closing the standalone Podcast Annotation Format rather than running both.

Can the annotation model be carried as an extension of the Podcasting 2.0 `<podcast:chapters>`
object, so a standalone `<podcast:annotations>` tag is not needed? This maps the model onto a
chapter object field by field.

A chapter and an annotation blur together, so the distinction matters. A chapter marks a segment for
navigation: one per stretch, no overlap. An annotation marks a typed real-world entity, carries a
stable identity that links it across episodes, and can overlap others: a host names a car, its
driver, and the track in one breath, so three annotations cover the same seconds.

**Context.** James Cridland (Podnews) and Daniel J. Lewis (PodChapters) each suggested extending
`<podcast:chapters>` rather than adding a tag; Daniel's [#469](https://github.com/Podcastindex-org/podcast-namespace/discussions/469)
("super chapters") argues for richer chapter objects: multiple links, videos, text blocks,
galleries, a `children` array. Sam Sethi (Podnews Weekly) [likened it](https://podcastindex.social/@samsethi/116855095940145774)
to Apple's "Timed Links." John Spurlock argued for [stable Wikidata IDs](https://www.wikidata.org/wiki/Wikidata:Identifiers)
on mentioned entities, adopted here as `canonicalId`.

---

## What it enables

Jason (Podcast Guru) asked what experience this surfaces. These are the use cases Car Curious was
built for; the [Podnews Weekly Mastodon thread](https://hachyderm.io/@samsethi@podcastindex.social/116855096013705425)
echoed several.

- **Visual layer synced to playback.** As a host names a car, person, or place, the app shows a
  photo and context at that second, like Prime Video's X-Ray. The span (`startTime` to `endTime`) is
  when to show and hide the card; `endTime` may equal `startTime` for a point mention. Context comes
  from `data` or `url`/`canonicalId`.
- **Navigate by entity, not keyword.** Jump to where a thing is discussed, not the first place a
  word appears (the r/overcast ["poor man's chapters"](https://www.reddit.com/r/overcast/comments/1uvy9gc/transcripts_is_like_a_poor_mans_chapters/)
  workaround, made reliable). Uses each entry's `startTime` and `type`.
- **Follow an entity across shows.** "Every episode, on any show, that discusses this car, guest, or
  topic": the stable-identifier point John Spurlock and Nathan Gathright
  ([#544](https://github.com/Podcastindex-org/podcast-namespace/discussions/544)) both made. A
  `canonicalId` collapses the entity across the catalog, which a per-episode chapter cannot; Adam
  Curry put it "find all episodes with this guest." Car Curious
  [runs this today for cars](https://getcarcurious.com/cars/nissan/300-zx).
- **Alerts and digests.** Notify me when a guest or topic comes up; summarize everyone's take this
  week. Uses `canonicalId` and `type`.
- **Shareable video.** Render entity cards into a video visualization of an audio episode (James
  Cridland's Podnews Daily use, Adam Curry's "shareable clip").
- **Creator attribution in the moment.** A producer's links appear when the thing is discussed, not
  buried in show notes (Daniel Lewis). Uses `url`, `source`.

---

## Why extend chapters instead of adding a tag

A jsonChapters entry already carries an image, link, location, and a `toc` flag to hide it: a rich
timestamped-context object already. Adding a typed entity and a stable ID extends that rather than
inventing a new mechanism, which first pointed this here. Three more arguments, strongest first:

1. **DAI timestamp alignment.** Dynamic ad insertion re-stitches an episode per listener, so metadata
   keyed to absolute seconds drifts. The community is already working on keeping chapters and
   transcripts aligned under DAI; annotation data inside a chapter inherits that fix, where a
   standalone tag solves the same drift twice.
2. **Apple already treats chapters as the carrier.** Apple Podcasts (iOS 26.2) ingests timed links
   through `url` fields on `<podcast:chapters>`, no new tag.
3. **One object, two needs.** Daniel wants a chapter to hold more (text, galleries); this wants
   structured entity data. Both are a richer object at a timestamp.

## Prior art: the structure exists, with nowhere open to put it

Moment-level annotation is not a bet on future demand. Five parties already produce it, and each
silos or discards the structure for lack of an open format.

| Source | Who produces it | Structure it captures | Anchored to audio? | Where it gets stuck |
|--------|-----------------|------------------------|--------------------|---------------------|
| **[Apple Timed Links](https://podcasters.apple.com/support/5536-links-on-apple-podcasts)** (iOS 26.2) | Platform-derived plus publisher, via `<podcast:chapters>` or description timestamps | Timed links as banners, in the transcript, "From This Episode" list | Yes | Apple-catalog destinations only; no entity type, canonical ID, or provenance; locked to Apple |
| **[Snipd](https://www.snipd.com/)** | App-derived; AI chapters plus one-tap snips | Time range, transcript excerpt, AI summary, notes | Yes | No type or canonical ID; stays in-app and flattens to Markdown on export |
| **[Acquired](https://library.acquired.fm/)** "PDF companion" | Publisher, hand-authored | Timestamped chapters, plus typed people (role and org), a dated timeline, sourced entity data | Partly. Chapters are timed; the people and entity data carry no timestamps | The show does the work by hand, but nothing binds an entity to its moment, and it all sits in a PDF |
| **[Iowa State PAR-TWiM](https://iastate.pressbooks.pub/par-twim/)** (2025) | Expert courseware; five authors, DOI, open-access | "Techniques (with Time Stamps)" and "Concepts (with Time Stamps)": typed entities over spans, linked to papers and figures | Yes (ranges) | Lives in a Pressbooks ebook as prose; no machine-readable form |
| **[Overcast transcript search](https://www.reddit.com/r/overcast/comments/1uvy9gc/transcripts_is_like_a_poor_mans_chapters/)** | Listener-improvised | None. ctrl-F over a derived transcript to reach "the part about X" | Loosely | No structure; you must know the term; a keyword hit, not the discussion start; nothing carries across episodes |

The common objection ([Nathan Gathright](https://xoxo.zone/@nathan/116613844156212080), John
Spurlock): publishers will not do the work, so apps derive annotations from transcripts. Derivation
is real (Snipd, Apple) but stops at the entity layer: none produce typed, canonical, cross-episode
identifiers portably. And the premise fails at the top, where Acquired hand-produces exactly this and
it dies in a PDF. The format needs no new publisher work; it gives that work a portable home and apps
a place to publish what they derive.

---

## Adoption and incentives

Nathan Gathright drew the line this sits on: tags describing what is in an episode lose to inference;
tags carrying intent, identity, attribution, or canonical relationships give apps something they
should not guess. This is the second half.

- **Effort.** No publisher labor needed: detection is derivable, entity fields are near-zero effort
  where chapters exist, and where they do not a crawler or app publishes a derived layer under its
  own `producer`/`layer`.
- **Value capture.** The format is neutral: identity and context, not a monetization path. What an
  app cannot mint alone is a `canonicalId` meaning the same entity everywhere, plus a provenance
  trail.

Prior work: Nathan Gathright's [#544, Wikidata identifiers as topics](https://github.com/Podcastindex-org/podcast-namespace/discussions/544)
(2023) proposed a `<podcast:topics>` tag with Wikidata QIDs at episode level; this applies the same
scheme at the moment level via `canonicalId`.

---

## Field-by-field mapping

**The chapter object today.** See the [`<podcast:chapters>` tag spec](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/chapters.md).
A chapter requires only `startTime`; optional are `title`, `img`, `url`, `endTime`, `toc`,
`location`. jsonChapters 1.2 already has an explicit `endTime` and does not prohibit overlap, though
consumers treat chapters as sequential and non-overlapping.

| Annotation field | Chapter | Notes |
|------------------|---------|-------|
| `startTime`, `title`, `url` | same | 1:1. |
| `endTime` | `endTime` | 1:1; the field exists. The gap is **overlap**: many entities share a stretch, so the proposal must define overlap semantics. |
| `image` | `img` | Rename the format's `image` to match. |
| `type` | *(new)* | Entity type (`person`, `car`, `place`, `topic`). |
| `canonicalId` | *(new)* | Stable identifier (e.g. a Wikidata QID) linking the entity across episodes and shows. |
| `participation` | *(new)* | For `type: person`: `guest`, `host`, or `mentioned`. |
| `confidence`, `source` | *(new)* | Provenance; chapters have none. |
| `tags` | *(new)* | Freeform labels. |
| `priority` | *(relates to `toc`)* | Editorial importance. |
| `data` | *(new)* | Open extension object. |
| `speaker`, `quote` | *(transcript / ext)* | Usually from the transcript. Not standardized here; carriable as extension fields. |
| *(none)* | `toc` | `toc: false` hides an entry from the navigation list; reused to keep dense entries out of the human list. |

Only `type` and `canonicalId` are standardized; the rest ride as extension fields (promotable later),
and `speaker`/`quote` come from a linked [`<podcast:transcript>`](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/transcripts/transcripts.md).
The card layer (`startTime`/`endTime`/`title`/`url`/`img`) already fits, which is why Apple's timed
links work. Set-level data (`layer`, `producer`, `speakers`, `episode`, `transcripts`, `adBreaks`)
mostly maps to sibling tags; see the replacement test. Over a plain chapter the annotation adds an
entity `type`, a cross-episode `canonicalId`, provenance, and overlapping spans; over an Apple timed
link, any destination, not just Apple's.

---

## Strawman: a full chapters file

Entity entries sit beside the navigational chapters, hidden with `toc: false`, and may overlap.
Values illustrative.

```json
{
  "version": "1.2.0",
  "chapters": [
    { "startTime": 0, "title": "Intro and sponsor", "img": "…/intro.jpg" },
    { "startTime": 42, "title": "Best sports cars under $50k", "img": "…/segment.jpg" },

    { "startTime": 45.2, "endTime": 75.0, "toc": false,
      "type": "car", "canonicalId": "wikidata:Q170415",
      "title": "Porsche 911 (992)", "img": "…/992.jpg", "url": "…/porsche-911-992" },
    { "startTime": 61.0, "endTime": 88.0, "toc": false,
      "type": "car", "canonicalId": "wikidata:Q183843",
      "title": "Toyota Supra (A90)", "img": "…/supra.jpg", "url": "…/supra-a90" },

    { "startTime": 610, "title": "Listener questions" }
  ]
}
```

A strict jsonChapters 1.2 parser lists the three entries without `toc: false` and ignores
`type`/`canonicalId` as unknown fields. The two entity entries overlap (61.0 to 75.0) inside the
segment at 42. This needs one prerequisite.

### Extensibility rule

jsonChapters 1.2 says nothing about unknown fields. The smallest useful change is one sentence:
**a `<podcast:chapters>` consumer MUST ignore fields it does not recognize.** That makes both
Daniel's extensions and these entity fields safe to ship experimentally.

### Density, layering, and backwards compatibility

Episodes produce far more entity references than chapter markers. `toc: false` hides an entry from
the navigation list, but a player that ignores `toc` renders an unusable hundred-entry list.
**Multiple chapter files per episode** (ericpp, #469) solve that: a lean navigational file plus a
dense entity file, doubling as layering (official, AI-enriched, community). That file split is the
one structural ask (see scope), and it fixes backwards compatibility for the dense case: a dense set
in its own file never reaches a player loading the human list, whereas `toc: false` alone protects
only players that honor it.

## Proposed scope

Minimal, so it can ship. Three asks change no structure and need only producer/consumer convention:

1. **Extensibility rule** (behavior): a chapters consumer ignores fields it does not recognize.
2. **Two entity fields** (additive): `type` and `canonicalId`, plus `img` (renamed from `image`). The
   rest ride as extension fields; `speaker`/`quote` come from the transcript.
3. **Overlap semantics** (behavior): allow entries whose ranges intersect and define how a consumer
   renders them. `endTime` already exists, so this is a rule, not a new field.

The fourth is the only structural ask, and the only one needing Podcast Index sign-off:

4. **Multiple `<podcast:chapters>` per `<item>`.** The tag's cardinality is `Single` today. Carrying
   a dense entity set as its own file (see density above) needs it raised to allow multiple per
   item, with stable `layer`/`producer` identity to tell them apart. A leaner v1 could ship items
   1–3 with inline `toc: false` and defer this.

**Deferred.** Daniel's #469 "super chapters" display extensions (multiple links, videos, text blocks,
galleries, `children`, polls): a parallel track, kept separate so the minimal extension can ship
without waiting. And DAI alignment: producing the canonical-to-as-served time map is its own problem;
this assumes the map exists.

## The replacement test

Does a standalone `<podcast:annotations>` element still have a job? Per-entry, every annotation field
rides on the chapter object (above), so nothing is lost. Set-level, most maps to sibling tags:

| Set-level data | Where it maps | Gap? |
|----------------|---------------|------|
| `transcripts` | `<podcast:transcript>` | No |
| `speakers` | transcript voice tags; episode roles in `<podcast:person>` | No |
| `producer`, `layer` | `<podcast:chapters>` identity attributes, once cardinality allows multiple per item | With the cardinality change |
| `episode` metadata | the RSS `<item>` (`guid`, `pubDate`, `duration`, title) | No |
| `adBreaks` | nothing yet; it supports DAI alignment, which this proposal defers | **Open** |

Two prerequisites remain for full parity: the cardinality change, and a home for `adBreaks`/DAI
alignment (no sibling field carries it). A standalone file also gives self-containment outside a
feed, the format's own concern, not an in-feed blocker.

## Field naming: the `type` collision with #469

Daniel's #469 already puts a top-level `type` on the chapter object for the *block kind*
(`{ "type": "slides" }`). Ours would use `type` for the *entity kind* (`{ "type": "car" }`), a
different axis on the same key. They clash only where a chapter is both (a slideshow *about* a car),
but two specs claiming `type` for different meanings is worth resolving. Three options, none decided;
other examples use A for readability.

- **A. One shared `type`:** a single vocabulary spanning both (`slides`/`poll`/`car`/`person`…),
  `"type": "car", "canonicalId": "…"`. Simplest, but needs agreement to share the field.
- **B. Flat, renamed:** `type` stays Daniel's, ours becomes `entityType`,
  `"entityType": "car", "canonicalId": "…"`.
- **C. Nested `entity`:** group kind and id, like jsonChapters' `location: {…}`, composing with
  Daniel's `type`: `"entity": { "kind": "car", "id": "…" }`.

## Open questions

- Entity data **inline** (`toc: false`), in a **separate file**, or both? The strawman shows inline;
  density argues separate.
- **Does entity data belong in chapters at all?** #469 stalled partly on this. The test raised
  there: data belongs if it is intrinsic metadata describing the same span, authored with the chapter
  (chapter art passes; boostagrams and live comments fail). A typed entity reference passes, and the
  proposal should say so explicitly.
- `canonicalId` as a bare QID, prefixed (`wikidata:Q…`), or a URL? Named `canonicalId` rather than
  `sameAs`/`wikidataId` to stay scheme-neutral.
