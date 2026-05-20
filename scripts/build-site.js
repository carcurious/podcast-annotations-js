import { execSync } from 'child_process'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { marked } from 'marked'

const spec = readFileSync('SPEC.md', 'utf-8')
const body = marked.parse(spec)
const specVersion = spec.match(/\*\*Version ([^*]+)\*\*/)?.[1] ?? '1.0.0'
const lastmod = execSync('git log -1 --format=%cI SPEC.md', { encoding: 'utf-8' }).trim().slice(0, 10)

const assemblyBySlug = {
  'everyday-driver-episode-1013': 'AI-generated from transcript',
  'bat-podcast-just-back-from-japan': 'Converted from show notes',
  'acquired-ferrari': 'Converted from show notes',
  'lex-fridman-494-jensen-huang': 'Converted from show notes',
  'science-vs-artemis-moon': 'Converted from show notes',
  'science-vs-running': 'Converted from show notes',
  'tim-ferriss-770-elizabeth-gilbert': 'Converted from show notes',
  'higher-learning-coachella-bambaataa': 'Converted from show notes'
}

const exampleFiles = readdirSync('examples')
  .filter((file) => file.endsWith('.annotations.json'))
  .sort()

const exampleSets = exampleFiles.map((file) => {
  const annotationSet = JSON.parse(readFileSync(`examples/${file}`, 'utf-8'))
  const annotations = annotationSet.annotations ?? []
  const duration = annotations.reduce((max, annotation) => Math.max(max, annotation.endTime ?? annotation.startTime ?? 0), 0)
  const typeCounts = Object.entries(
    annotations.reduce((counts, annotation) => {
      const type = annotation.type ?? 'unknown'
      counts[type] = (counts[type] ?? 0) + 1
      return counts
    }, {})
  ).sort((a, b) => b[1] - a[1])

  return {
    file,
    slug: file.replace('.annotations.json', ''),
    annotationSet,
    annotations,
    duration,
    annotationCount: annotations.length,
    assembly: assemblyBySlug[file.replace('.annotations.json', '')] ?? 'Example file',
    typeCounts,
    densityPerMinute: duration > 0 ? annotations.length / (duration / 60) : 0
  }
})

const featured = exampleSets.find((example) => example.slug === 'everyday-driver-episode-1013') ?? exampleSets[0]
const demoCandidates = featured.annotations
  .filter((annotation) =>
    annotation.title &&
    !/tesla/i.test(annotation.title) &&
    !/tesla/i.test(annotation.data?.explanation ?? '') &&
    !/tesla/i.test(annotation.data?.simplifiedExplanation ?? '')
  )

const demoMoments = selectDistributedMoments(demoCandidates, 3, featured.duration)
  .map((annotation, index) => ({
    index,
    startTime: annotation.startTime,
    endTime: annotation.endTime,
    title: annotation.title,
    type: annotation.type ?? 'unknown',
    explanation: annotation.data?.explanation ??
      annotation.data?.simplifiedExplanation ??
      annotation.quote ??
      `This moment is about ${annotation.title}. The annotation gives a player the title, type, timing, and artwork for this reference.`,
    quote: annotation.quote ?? '',
    payload: {
      startTime: annotation.startTime,
      endTime: annotation.endTime,
      type: annotation.type ?? 'unknown',
      title: annotation.title,
      image: normalizeExternalImageUrl(annotation.image),
      quote: annotation.quote,
      data: annotation.data ?? {}
    }
  }))

function selectDistributedMoments(annotations, count, duration) {
  if (annotations.length <= count) return annotations

  const selected = []
  const targets = Array.from({ length: count }, (_, index) => ((index + 1) / (count + 1)) * duration)

  for (const target of targets) {
    const nearest = annotations
      .filter((annotation) => !selected.includes(annotation))
      .sort((a, b) => Math.abs((a.startTime ?? 0) - target) - Math.abs((b.startTime ?? 0) - target))[0]
    if (nearest) selected.push(nearest)
  }

  return selected.sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0))
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function displayText(value) {
  return String(value ?? '').replaceAll('\u2014', '-')
}

function collapsePercentEncoding(path) {
  let previous = path

  while (true) {
    const current = previous.replace(/%25([0-9A-Fa-f]{2})/g, '%$1')
    if (current === previous) return current
    previous = current
  }
}

function normalizeExternalImageUrl(url) {
  if (!url) return url

  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'upload.wikimedia.org') return url

    const segments = parsed.pathname.split('/').filter(Boolean)
    const isWikimediaThumb =
      segments[0] === 'wikipedia' &&
      segments[1] === 'commons' &&
      segments[2] === 'thumb' &&
      segments.length >= 7

    if (!isWikimediaThumb) {
      parsed.pathname = collapsePercentEncoding(parsed.pathname)
      return parsed.toString()
    }

    const originalFilename = segments[5]
    parsed.pathname = collapsePercentEncoding(`/wikipedia/commons/${segments[3]}/${segments[4]}/${originalFilename}`)
    return parsed.toString()
  } catch {
    return url
  }
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function renderDemoMarkers(moments, duration) {
  return moments
    .map((moment, index) => {
      const left = duration > 0 ? Math.min(100, Math.max(0, (moment.startTime / duration) * 100)) : 0
      return `<button class="demo-marker${index === 0 ? ' is-active' : ''}" type="button" data-index="${moment.index}" style="left:${left.toFixed(2)}%">
        <span class="demo-marker-dot"></span>
        <span class="demo-marker-time">${formatTime(moment.startTime)}</span>
      </button>`
    })
    .join('')
}

function renderDemoButtons(moments) {
  return moments
    .map((moment, index) => {
      return `<button class="demo-chip${index === 0 ? ' is-active' : ''}" type="button"
        data-index="${moment.index}"
        data-title="${escapeHtml(moment.title)}"
        data-type="${escapeHtml(moment.type)}"
        data-explanation="${escapeHtml(moment.explanation)}"
        data-quote="${escapeHtml(moment.quote)}"
        data-payload="${escapeHtml(JSON.stringify(moment.payload, null, 2))}"
        data-start="${moment.startTime}">
        <span>${formatTime(moment.startTime)}</span>
        <strong>${escapeHtml(moment.title)}</strong>
      </button>`
    })
    .join('')
}

const demoInitial = demoMoments[0]
const demoSnippet = {
  startTime: demoInitial?.startTime ?? 0,
  endTime: demoInitial?.endTime ?? 0,
  type: demoInitial?.type ?? 'topic',
  title: demoInitial?.title ?? 'Example topic'
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podcast Annotation Format</title>
  <meta name="description" content="An open format for timestamped entity and topic references inside podcast audio.">
  <meta property="og:title" content="Podcast Annotation Format">
  <meta property="og:description" content="Timestamped entity and topic references for podcast audio, anchored to the seconds where they are actually discussed.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.podcastannotation.org">
  <link rel="canonical" href="https://www.podcastannotation.org">
  <style>
    :root {
      --bg: #fbf8f1;
      --surface: #ffffff;
      --surface-muted: #f3efe5;
      --text: #161513;
      --muted: #6b665d;
      --border: #d8d2c2;
      --accent: #8a3a1a;
      --accent-soft: #f0e3d9;
      --code-bg: #f4efe3;
      --shadow: none;
      --max-page: 1040px;
      --max-spec: 720px;
      --serif: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      --sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: var(--sans);
      line-height: 1.6;
      padding: 32px 18px 72px;
    }
    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
    code {
      font-family: var(--mono);
      background: var(--code-bg);
      padding: 0.1em 0.35em;
      border-radius: 4px;
      font-size: 0.92em;
    }
    pre {
      margin: 0;
      font-family: var(--mono);
      font-size: 0.92rem;
      line-height: 1.5;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 16px;
      overflow: auto;
    }
    .page {
      max-width: var(--max-page);
      margin: 0 auto;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: baseline;
      margin-bottom: 28px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .topbar strong {
      font-size: 0.95rem;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .topbar nav {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .intro {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
      gap: 32px;
      align-items: start;
      margin-bottom: 40px;
    }
    h1, h2, h3 {
      margin: 0;
      font-weight: 600;
      line-height: 1.1;
      letter-spacing: 0;
    }
    h1 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 3.2rem;
      letter-spacing: 0;
      margin-bottom: 18px;
    }
    .intro p,
    .section p {
      margin: 0 0 14px;
      color: var(--muted);
      max-width: 64ch;
      font-size: 1rem;
    }
    .intro-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 18px;
    }
    .button-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 16px;
      border-radius: 4px;
      border: 1px solid var(--text);
      background: transparent;
      color: var(--text);
      font-weight: 500;
      text-decoration: none;
    }
    .button-link:hover { text-decoration: none; background: var(--surface-muted); }
    .button-link.primary {
      background: var(--text);
      border-color: var(--text);
      color: var(--bg);
    }
    .button-link.primary:hover { background: #000; }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 1.6rem;
      letter-spacing: 0;
      margin-bottom: 12px;
    }
    .lede {
      max-width: 64ch;
      font-size: 1.05rem;
      line-height: 1.65;
      color: var(--text);
      margin: 0 0 32px;
    }
    .field-note {
      grid-column: 1 / -1;
      margin-top: 12px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .demo {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 20px;
    }
    .demo-head {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: baseline;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .demo-head p {
      margin: 0;
      font-size: 0.95rem;
    }
    .demo-track {
      position: relative;
      height: 44px;
      margin: 8px 0 10px;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .demo-track-labels {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.78rem;
    }
    .demo-marker {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      color: var(--muted);
      text-align: center;
    }
    .demo-marker-dot {
      display: block;
      width: 10px;
      height: 10px;
      margin: 0 auto 6px;
      border-radius: 50%;
      background: var(--border);
    }
    .demo-marker-time {
      display: block;
      font-family: var(--mono);
      font-size: 0.78rem;
    }
    .demo-marker.is-active { color: var(--text); }
    .demo-marker.is-active .demo-marker-dot { background: var(--accent); }
    .demo-detail {
      max-width: 760px;
    }
    .demo-card {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(160px, 220px);
      gap: 20px;
      align-items: stretch;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface-muted);
      padding: 18px;
    }
    .demo-copy {
      min-width: 0;
    }
    .demo-art {
      min-height: 150px;
      border: 1px solid var(--border);
      border-radius: 4px;
      background: var(--code-bg);
      overflow: hidden;
      position: relative;
    }
    .demo-art img {
      width: 100%;
      height: 100%;
      min-height: 150px;
      object-fit: cover;
      display: block;
    }
    .demo-art-fallback {
      min-height: 150px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--text);
      font-family: var(--mono);
      text-align: center;
      padding: 16px;
    }
    .demo-art-type {
      color: var(--accent);
      font-size: 0.78rem;
      text-transform: uppercase;
    }
    .demo-art-title {
      font-family: var(--serif);
      font-size: 1.35rem;
      line-height: 1.1;
    }
    .demo-art-time {
      color: var(--muted);
      font-size: 0.82rem;
    }
    .demo-type {
      display: inline-block;
      font-family: var(--mono);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0;
      color: var(--accent);
      margin-bottom: 10px;
    }
    .demo-copy h3 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 1.9rem;
      letter-spacing: 0;
      margin-bottom: 10px;
    }
    .demo-copy p {
      margin: 0 0 12px;
      color: var(--muted);
    }
    .demo-quote {
      padding-left: 12px;
      border-left: 3px solid var(--border);
      font-style: italic;
    }
    .demo-quote[hidden] { display: none; }
    .demo-payload {
      margin-top: 14px;
    }
    .demo-payload summary {
      cursor: pointer;
      color: var(--accent);
      font-weight: 500;
      margin-bottom: 8px;
    }
    .demo-payload pre {
      font-size: 0.82rem;
      max-height: 260px;
    }
    .demo-jump-label {
      margin-top: 18px;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .demo-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .demo-chip {
      border: 1px solid var(--border);
      background: transparent;
      border-radius: 4px;
      padding: 10px 12px;
      text-align: left;
      cursor: pointer;
      min-width: 170px;
      font-family: inherit;
    }
    .demo-chip:hover { background: var(--surface-muted); }
    .demo-chip span,
    .demo-chip strong {
      display: block;
    }
    .demo-chip span {
      font-family: var(--mono);
      font-size: 0.78rem;
      color: var(--accent);
      margin-bottom: 4px;
    }
    .demo-chip strong {
      font-size: 0.95rem;
      color: var(--text);
    }
    .demo-chip.is-active {
      border-color: var(--text);
      background: var(--surface-muted);
    }
    .spec-wrap {
      margin-top: 40px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
    }
    #spec {
      max-width: var(--max-spec);
    }
    #spec h1 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 2.4rem;
      letter-spacing: 0;
      margin-bottom: 0.5rem;
    }
    #spec h2 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 1.55rem;
      letter-spacing: 0;
      margin-top: 2.5rem;
      margin-bottom: 0.8rem;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid var(--border);
    }
    #spec h3 {
      font-size: 1.05rem;
      font-weight: 600;
      margin-top: 1.7rem;
      margin-bottom: 0.55rem;
    }
    #spec p, #spec ul, #spec ol, #spec table, #spec pre, #spec blockquote {
      margin-bottom: 1rem;
    }
    #spec ul, #spec ol {
      padding-left: 1.35rem;
    }
    #spec li {
      margin-bottom: 0.35rem;
    }
    #spec table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    #spec th, #spec td {
      text-align: left;
      padding: 0.55rem 0.7rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }
    #spec blockquote {
      margin-left: 0;
      padding-left: 1rem;
      border-left: 3px solid var(--border);
      color: var(--muted);
    }
    footer {
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 0.92rem;
    }
    @media (max-width: 900px) {
      .intro,
      .demo-card {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      body {
        padding: 22px 14px 56px;
      }
      h1 {
        font-size: 2.4rem;
      }
      .topbar {
        display: block;
      }
      .topbar nav {
        margin-top: 10px;
      }
      .demo-chip {
        min-width: 0;
        flex: 1 1 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <strong>Podcast Annotation Format</strong>
      <nav>
        <a href="#example">Example</a>
        <a href="#standards">Standards</a>
        <a href="#spec">Specification</a>
        <a href="https://github.com/ryanwi/podcast-annotations-js">GitHub</a>
      </nav>
    </header>

    <section class="intro">
      <div>
        <h1>Timestamped context for podcast audio.</h1>
        <p class="lede">A podcast annotation marks a moment in an episode: a car at 24:33, a person at 47:26, a place at 1:12:29. It names the entity or topic, when it appears, and the context needed to make sense of it.</p>
        <div class="intro-actions">
          <a class="button-link primary" href="#spec">Read the spec</a>
          <a class="button-link" href="https://github.com/ryanwi/podcast-annotations-js">View on GitHub</a>
        </div>
      </div>
      <pre><code>{
  "startTime": ${demoSnippet.startTime},
  "endTime": ${demoSnippet.endTime},
  "type": "${escapeHtml(demoSnippet.type)}",
  "title": "${escapeHtml(demoSnippet.title)}"
}</code></pre>
      <p class="field-note">Each annotation starts with <code>startTime</code> and <code>endTime</code>. Add optional fields like <code>type</code>, <code>title</code>, <code>url</code>, <code>quote</code>, and <code>data</code> when a player, search index, archive, or show-notes workflow needs more context.</p>
    </section>

    <section class="section" id="example">
      <h2>Example</h2>
      <p>Three real annotations from <code>${escapeHtml(featured.file)}</code>. Click a marker to see what a player could show at that moment.</p>
      <div class="demo">
        <div class="demo-head">
          <strong>${escapeHtml(displayText(featured.annotationSet.episode?.title ?? featured.slug))}</strong>
          <p>${featured.annotationCount} annotations across ${formatTime(featured.duration)}</p>
        </div>
        <div class="demo-track">
          ${renderDemoMarkers(demoMoments, featured.duration)}
        </div>
        <div class="demo-track-labels">
          <span>0:00</span>
          <span>${formatTime(featured.duration)}</span>
        </div>
        <div class="demo-detail">
          <div class="demo-card">
            <div class="demo-copy">
              <div class="demo-type" id="demo-type">${escapeHtml(demoInitial?.type ?? 'unknown')}</div>
              <h3 id="demo-title">${escapeHtml(demoInitial?.title ?? 'Annotation')}</h3>
              <p id="demo-explanation">${escapeHtml(demoInitial?.explanation ?? 'This annotation provides timed context for the current moment.')}</p>
              <p class="demo-quote" id="demo-quote"${demoInitial?.quote ? '' : ' hidden'}>${demoInitial?.quote ? escapeHtml(`"${demoInitial.quote}"`) : ''}</p>
            </div>
            <div class="demo-art">
              <img id="demo-image" src="${escapeHtml(demoInitial?.payload?.image ?? '')}" alt="${escapeHtml(demoInitial?.title ?? '')}"${demoInitial?.payload?.image ? '' : ' hidden'}>
              <div class="demo-art-fallback" id="demo-art-fallback"${demoInitial?.payload?.image ? ' hidden' : ''}>
                <span class="demo-art-type" id="demo-art-type">${escapeHtml(demoInitial?.type ?? 'unknown')}</span>
                <strong class="demo-art-title" id="demo-art-title">${escapeHtml(demoInitial?.title ?? 'Annotation')}</strong>
                <span class="demo-art-time" id="demo-art-time">${formatTime(demoInitial?.startTime ?? 0)}-${formatTime(demoInitial?.endTime ?? demoInitial?.startTime ?? 0)}</span>
              </div>
            </div>
          </div>
          <details class="demo-payload">
            <summary>View annotation JSON</summary>
            <pre id="demo-payload">${escapeHtml(JSON.stringify(demoInitial?.payload ?? {}, null, 2))}</pre>
          </details>
        </div>
        <div class="demo-jump-label">Jump to moment</div>
        <div class="demo-chips">
          ${renderDemoButtons(demoMoments)}
        </div>
      </div>
    </section>

    <section class="section" id="standards">
      <h2>Where this fits</h2>
      <p>This spec defines the annotation, not the transport. A sidecar JSON file is the simplest carrier today, but the same annotation model can be embedded in RSS, returned from an API, or delivered however a producer and consumer choose.</p>
      <p>WebVTT and SRT carry the words. RSS and show notes describe the episode. BBC-style ontologies and Wikidata name the entities. Annotations sit across those layers: each one pairs an entity or topic reference with the time range where it is being discussed, plus whatever extra context (title, link, image, quote, speaker, tags) a producer wants to attach. These are references for identifiers and related concepts, not dependencies. A producer can use any, all, or none of them.</p>
      <p>Not a transcript format, not a chapter format, not a player, not a CMS. Just timestamped references on audio.</p>
    </section>

    <section class="spec-wrap">
      <article id="spec">
${body}
      </article>
    </section>

    <footer>
      Version ${escapeHtml(specVersion)}. Released under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Last updated ${lastmod}. <a href="https://github.com/ryanwi/podcast-annotations-js">GitHub</a>.
    </footer>
  </div>

  <script>
    function formatTime(totalSeconds) {
      const total = Math.max(0, Math.floor(totalSeconds))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60
      if (hours > 0) return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
      return minutes + ':' + String(seconds).padStart(2, '0')
    }

    const demoMoments = ${JSON.stringify(demoMoments)}
    const chips = [...document.querySelectorAll('.demo-chip')]
    const markers = [...document.querySelectorAll('.demo-marker')]
    const typeEl = document.getElementById('demo-type')
    const titleEl = document.getElementById('demo-title')
    const explanationEl = document.getElementById('demo-explanation')
    const quoteEl = document.getElementById('demo-quote')
    const imageEl = document.getElementById('demo-image')
    const artFallbackEl = document.getElementById('demo-art-fallback')
    const artTypeEl = document.getElementById('demo-art-type')
    const artTitleEl = document.getElementById('demo-art-title')
    const artTimeEl = document.getElementById('demo-art-time')
    const payloadEl = document.getElementById('demo-payload')

    function selectDemo(index) {
      const annotation = demoMoments.find((moment) => moment.index === index)
      if (!annotation) return

      chips.forEach((chip) => chip.classList.toggle('is-active', Number(chip.dataset.index) === index))
      markers.forEach((marker) => marker.classList.toggle('is-active', Number(marker.dataset.index) === index))
      typeEl.textContent = annotation.type || 'unknown'
      titleEl.textContent = annotation.title || 'Annotation'
      explanationEl.textContent = annotation.explanation || 'This annotation provides timed context for the current moment.'
      quoteEl.hidden = !annotation.quote
      quoteEl.textContent = annotation.quote ? '"' + annotation.quote + '"' : ''
      const image = annotation.payload && annotation.payload.image
      imageEl.hidden = !image
      imageEl.src = image || ''
      imageEl.alt = annotation.title || ''
      artFallbackEl.hidden = Boolean(image)
      artTypeEl.textContent = annotation.type || 'unknown'
      artTitleEl.textContent = annotation.title || 'Annotation'
      artTimeEl.textContent = formatTime(annotation.startTime || 0) + '-' + formatTime(annotation.endTime || annotation.startTime || 0)
      payloadEl.textContent = JSON.stringify(annotation.payload || {}, null, 2)
    }

    imageEl.addEventListener('error', () => {
      imageEl.hidden = true
      artFallbackEl.hidden = false
    })

    chips.forEach((chip) => {
      chip.addEventListener('click', () => selectDemo(Number(chip.dataset.index)))
    })

    markers.forEach((marker) => {
      marker.addEventListener('click', () => selectDemo(Number(marker.dataset.index)))
    })

    if (demoMoments[0]) selectDemo(demoMoments[0].index)
  </script>
</body>
</html>`

writeFileSync('docs/index.html', html)
console.log('docs/index.html updated')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.podcastannotation.org/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`

writeFileSync('docs/sitemap.xml', sitemap)
console.log('docs/sitemap.xml updated')
