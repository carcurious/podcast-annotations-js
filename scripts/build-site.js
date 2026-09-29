import { execSync } from 'child_process'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { marked } from 'marked'

const slugCounts = new Map()

function getPlainText(tokens) {
  if (!tokens) return ''
  return tokens.map(t => t.tokens ? getPlainText(t.tokens) : (t.text || '')).join('')
}

marked.use({
  renderer: {
    heading(token) {
      const text = this.parser.parseInline(token.tokens)
      const plainText = getPlainText(token.tokens)
      let slug = plainText
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\p{Pd}\s]/gu, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

      if (slugCounts.has(slug)) {
        const count = slugCounts.get(slug)
        slugCounts.set(slug, count + 1)
        slug = `${slug}-${count}`
      } else {
        slugCounts.set(slug, 1)
      }

      return `<h${token.depth} id="${slug}">${text}</h${token.depth}>\n`
    }
  }
})

const spec = readFileSync('SPEC.md', 'utf-8')
// The page supplies its own title block, so render the spec from its first section on.
const specBodyStart = spec.search(/^## /m)
const specTitle = spec.match(/^# (.+)$/m)?.[1] ?? 'Podcast Annotation Format'
const body = marked.parse(spec.slice(specBodyStart))
  .replaceAll('<table>', '<div class="table-wrap"><table>')
  .replaceAll('</table>', '</table></div>')
const specVersion = spec.match(/\*\*Version ([^*]+)\*\*/)?.[1] ?? '1.1.0'
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
    !/tesla/i.test(annotation.explanation ?? '') &&
    !/tesla/i.test(annotation.data?.simplifiedExplanation ?? '')
  )

const demoMoments = selectDistributedMoments(demoCandidates, 3, featured.duration)
  .map((annotation, index) => {
    const payload = { ...annotation, image: normalizeExternalImageUrl(annotation.image) }
    if (!payload.image) delete payload.image

    return {
      index,
      startTime: annotation.startTime,
      endTime: annotation.endTime,
      title: annotation.title,
      type: annotation.type ?? 'unknown',
      // Same fallback order the spec asks of consumers: `explanation` first, alternates in `data` after.
      explanation: annotation.explanation ?? annotation.data?.simplifiedExplanation ?? '',
      quote: annotation.quote ?? '',
      image: payload.image ?? '',
      imageCredit: annotation.data?.imageAttribution ?? '',
      payload
    }
  })

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

function formatRange(start, end) {
  return `${formatTime(start ?? 0)}–${formatTime(end ?? start ?? 0)}`
}

function renderDemoMarkers(moments, duration) {
  return moments
    .map((moment, index) => {
      const left = duration > 0 ? Math.min(100, Math.max(0, (moment.startTime / duration) * 100)) : 0
      return `<span class="demo-tick${index === 0 ? ' is-active' : ''}" data-index="${moment.index}" style="left:${left.toFixed(2)}%" title="${escapeHtml(moment.title)}"></span>`
    })
    .join('')
}

function renderDemoList(moments) {
  return moments
    .map((moment, index) => {
      return `<li><button class="demo-moment" type="button" data-index="${moment.index}" aria-pressed="${index === 0}">
          <span class="demo-moment-time">${formatTime(moment.startTime)}</span> ${escapeHtml(moment.title)}
        </button></li>`
    })
    .join('\n        ')
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
  <meta property="og:image" content="https://www.podcastannotation.org/og-image.png">
  <meta property="og:image:width" content="2400">
  <meta property="og:image:height" content="1260">
  <meta property="og:image:alt" content="Podcast Annotation Format: timestamped context for podcast audio, with a minimal annotation JSON example.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Podcast Annotation Format">
  <meta name="twitter:description" content="Timestamped entity and topic references for podcast audio, anchored to the seconds where they are actually discussed.">
  <meta name="twitter:image" content="https://www.podcastannotation.org/og-image.png">
  <link rel="canonical" href="https://www.podcastannotation.org">
  <style>
    :root {
      --text: #1b1b1b;
      --muted: #5f5f5f;
      --rule: #dcdcdc;
      --link: #1f4e9c;
      --code-bg: #f5f5f2;
      --mark: #b3261e;
      --serif: Charter, "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
      --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #fff;
      color: var(--text);
      font-family: var(--serif);
      font-size: 18px;
      line-height: 1.6;
    }
    main, .masthead, footer {
      max-width: 760px;
      margin: 0 auto;
      padding: 0 20px;
    }
    a { color: var(--link); text-underline-offset: 2px; }
    a:hover { text-decoration-thickness: 2px; }
    code {
      font-family: var(--mono);
      font-size: 0.84em;
      background: var(--code-bg);
      padding: 0.1em 0.3em;
      border-radius: 3px;
    }
    pre {
      font-family: var(--mono);
      font-size: 0.8rem;
      line-height: 1.5;
      background: var(--code-bg);
      padding: 14px 16px;
      overflow: auto;
      border-radius: 3px;
    }
    pre code { background: none; padding: 0; font-size: inherit; }
    h1, h2, h3, h4 { line-height: 1.25; }
    h1 { font-size: 2.1rem; margin: 0 0 6px; }
    h2 { font-size: 1.45rem; margin: 2.4em 0 0.6em; }
    h3 { font-size: 1.12rem; margin: 1.8em 0 0.5em; }
    h4 { font-size: 1rem; margin: 1.5em 0 0.4em; }
    ul, ol { padding-left: 1.4em; }
    li { margin-bottom: 0.3em; }
    blockquote { margin: 1em 0; padding-left: 1em; border-left: 3px solid var(--rule); color: var(--muted); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-family: var(--sans);
      font-size: 0.82rem;
      line-height: 1.45;
      margin: 1em 0 1.4em;
    }
    th, td { text-align: left; vertical-align: top; padding: 7px 10px 7px 0; border-bottom: 1px solid var(--rule); }
    th { border-bottom: 2px solid var(--text); }
    td code, th code { font-size: 0.92em; }
    .table-wrap { overflow-x: auto; }

    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 6px 20px;
      padding-top: 18px;
      padding-bottom: 18px;
      font-family: var(--sans);
      font-size: 0.85rem;
    }
    .masthead a { color: var(--text); text-decoration: none; }
    .masthead a:hover { text-decoration: underline; }
    .masthead nav { display: flex; gap: 18px; flex-wrap: wrap; }
    .masthead nav a { color: var(--muted); }

    .doc-status {
      margin: 0 0 28px;
      color: var(--muted);
      font-size: 0.95rem;
    }
    .intro-example { margin: 1.4em 0; }
    .intro-example pre { margin: 0; }
    .intro-example figcaption { margin-top: 6px; color: var(--muted); font-size: 0.9rem; }

    .demo {
      margin: 1.2em 0 0;
      border-top: 2px solid var(--text);
      border-bottom: 1px solid var(--rule);
      padding: 12px 0 20px;
    }
    .demo-episode { margin: 0; font-family: var(--sans); font-size: 0.85rem; }
    .demo-episode span { color: var(--muted); }
    .demo-track {
      position: relative;
      height: 4px;
      margin: 18px 0 6px;
      background: var(--rule);
    }
    .demo-tick {
      position: absolute;
      top: -5px;
      width: 2px;
      height: 14px;
      margin-left: -1px;
      background: var(--muted);
    }
    .demo-tick.is-active { background: var(--mark); width: 4px; margin-left: -2px; }
    .demo-track-ends {
      display: flex;
      justify-content: space-between;
      font-family: var(--mono);
      font-size: 0.72rem;
      color: var(--muted);
      margin-bottom: 16px;
    }
    .demo-body {
      display: grid;
      grid-template-columns: 180px minmax(0, 1fr);
      gap: 24px;
    }
    .demo-list { list-style: none; margin: 0; padding: 0; font-family: var(--sans); font-size: 0.88rem; }
    .demo-list li { margin: 0; }
    .demo-moment {
      display: block;
      width: 100%;
      text-align: left;
      font: inherit;
      color: var(--link);
      background: none;
      border: 0;
      border-left: 3px solid transparent;
      padding: 6px 0 6px 10px;
      cursor: pointer;
    }
    .demo-moment:hover { text-decoration: underline; }
    .demo-moment[aria-pressed="true"] { color: var(--text); border-left-color: var(--mark); }
    .demo-moment-time { font-family: var(--mono); font-size: 0.8rem; color: var(--muted); margin-right: 4px; }
    .demo-detail h3 { margin: 0 0 4px; font-size: 1.3rem; }
    .demo-meta { margin: 0 0 10px; color: var(--muted); font-size: 0.9rem; }
    .demo-detail p { margin: 0 0 10px; }
    .demo-figure { float: right; width: 200px; margin: 0 0 10px 18px; }
    .demo-figure img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--code-bg); }
    .demo-figure figcaption { font-family: var(--sans); font-size: 0.72rem; color: var(--muted); margin-top: 4px; }
    .demo-detail details { clear: both; padding-top: 4px; font-size: 0.92rem; }
    .demo-detail summary { cursor: pointer; color: var(--link); }
    .demo-detail details pre { max-height: 300px; white-space: pre-wrap; overflow-wrap: anywhere; }
    [hidden] { display: none !important; }

    .spec { margin-top: 3em; }
    footer {
      margin-top: 4em;
      padding-top: 16px;
      padding-bottom: 40px;
      border-top: 1px solid var(--rule);
      color: var(--muted);
      font-size: 0.9rem;
    }

    @media (max-width: 640px) {
      body { font-size: 17px; }
      main, .masthead, footer { padding: 0 16px; }
      .masthead { padding-top: 14px; padding-bottom: 14px; }
      h1 { font-size: 1.7rem; }
      .demo-body { grid-template-columns: minmax(0, 1fr); gap: 12px; }
      .demo-figure { float: none; width: 100%; margin: 0 0 10px; }
      .demo-figure img { aspect-ratio: 16 / 9; }
    }
  </style>
</head>
<body>
  <header class="masthead">
    <a href="/">${escapeHtml(specTitle)}</a>
    <nav>
      <a href="#example">Example</a>
      <a href="#overview">Specification</a>
      <a href="#changelog">Changelog</a>
      <a href="https://github.com/carcurious/podcast-annotations-js">GitHub</a>
    </nav>
  </header>

  <main>
    <h1>${escapeHtml(specTitle)}</h1>
    <p class="doc-status">Version ${escapeHtml(specVersion)}, last changed ${lastmod}. Published under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>; source and issues on <a href="https://github.com/carcurious/podcast-annotations-js">GitHub</a>.</p>

    <p>A podcast annotation marks a moment in an episode: a car at 24:33, a person at 47:26, a place at 1:12:29. It names the entity or topic, when it appears, and the context needed to make sense of it.</p>
    <p>Only <code>startTime</code> and <code>endTime</code> are required. Fields like <code>type</code>, <code>title</code>, <code>explanation</code>, <code>url</code>, and <code>quote</code> are there for when a player, search index, archive, or show-notes tool needs more.</p>

    <figure class="intro-example">
      <pre><code>{
  "startTime": ${demoSnippet.startTime},
  "endTime": ${demoSnippet.endTime},
  "type": "${escapeHtml(demoSnippet.type)}",
  "title": "${escapeHtml(demoSnippet.title)}"
}</code></pre>
      <figcaption>A complete annotation, marking ${formatRange(demoSnippet.startTime, demoSnippet.endTime)} of a real episode.</figcaption>
    </figure>

    <p id="standards">Annotations sit beside the formats podcasts already have: WebVTT and SRT carry the words, RSS and show notes describe the episode, and Wikidata or the BBC ontologies can supply stable identifiers for the entities. The spec defines the annotation itself; a sidecar JSON file is the simplest way to ship one, and RSS or an API work too.</p>

    <h2 id="example">Example</h2>
    <p>Three annotations taken from <a href="https://github.com/carcurious/podcast-annotations-js/blob/main/examples/${escapeHtml(featured.file)}"><code>${escapeHtml(featured.file)}</code></a>, shown the way a player might show them.</p>

    <div class="demo">
      <p class="demo-episode">${escapeHtml(displayText(featured.annotationSet.episode?.title ?? featured.slug))} <span>&middot; ${featured.annotationCount} annotations, ${formatTime(featured.duration)}</span></p>
      <div class="demo-track" aria-hidden="true">
        ${renderDemoMarkers(demoMoments, featured.duration)}
      </div>
      <div class="demo-track-ends" aria-hidden="true"><span>0:00</span><span>${formatTime(featured.duration)}</span></div>

      <div class="demo-body">
        <ol class="demo-list">
        ${renderDemoList(demoMoments)}
        </ol>
        <div class="demo-detail" aria-live="polite">
          <figure class="demo-figure" id="demo-figure"${demoInitial?.image ? '' : ' hidden'}>
            <img id="demo-image" src="${escapeHtml(demoInitial?.image ?? '')}" alt="${escapeHtml(demoInitial?.title ?? '')}">
            <figcaption id="demo-credit"${demoInitial?.imageCredit ? '' : ' hidden'}>Photo: ${escapeHtml(demoInitial?.imageCredit ?? '')}</figcaption>
          </figure>
          <h3 id="demo-title">${escapeHtml(demoInitial?.title ?? '')}</h3>
          <p class="demo-meta" id="demo-meta">${escapeHtml(demoInitial?.type ?? 'unknown')}, ${formatRange(demoInitial?.startTime, demoInitial?.endTime)}</p>
          <p id="demo-explanation"${demoInitial?.explanation ? '' : ' hidden'}>${escapeHtml(demoInitial?.explanation ?? '')}</p>
          <details>
            <summary>Annotation JSON</summary>
            <pre id="demo-payload">${escapeHtml(JSON.stringify(demoInitial?.payload ?? {}, null, 2))}</pre>
          </details>
        </div>
      </div>
    </div>

    <article class="spec" id="spec">
${body}
    </article>
  </main>

  <footer>
    ${escapeHtml(specTitle)} ${escapeHtml(specVersion)}, last changed ${lastmod}. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. <a href="https://github.com/carcurious/podcast-annotations-js">GitHub</a>.
  </footer>

  <script>
    function formatTime(totalSeconds) {
      const total = Math.max(0, Math.floor(totalSeconds))
      const hours = Math.floor(total / 3600)
      const minutes = Math.floor((total % 3600) / 60)
      const seconds = total % 60
      if (hours > 0) return hours + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
      return minutes + ':' + String(seconds).padStart(2, '0')
    }

    const demoMoments = ${JSON.stringify(demoMoments).replaceAll('<', '\\u003c')}
    const buttons = [...document.querySelectorAll('.demo-moment')]
    const ticks = [...document.querySelectorAll('.demo-tick')]
    const figureEl = document.getElementById('demo-figure')
    const imageEl = document.getElementById('demo-image')
    const creditEl = document.getElementById('demo-credit')
    const titleEl = document.getElementById('demo-title')
    const metaEl = document.getElementById('demo-meta')
    const explanationEl = document.getElementById('demo-explanation')
    const payloadEl = document.getElementById('demo-payload')

    function selectDemo(index) {
      const moment = demoMoments.find((m) => m.index === index)
      if (!moment) return

      buttons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.index) === index)))
      ticks.forEach((t) => t.classList.toggle('is-active', Number(t.dataset.index) === index))
      figureEl.hidden = !moment.image
      imageEl.src = moment.image || ''
      imageEl.alt = moment.title || ''
      creditEl.hidden = !moment.imageCredit
      creditEl.textContent = 'Photo: ' + moment.imageCredit
      titleEl.textContent = moment.title
      metaEl.textContent = moment.type + ', ' + formatTime(moment.startTime || 0) + '\\u2013' + formatTime(moment.endTime || moment.startTime || 0)
      explanationEl.hidden = !moment.explanation
      explanationEl.textContent = moment.explanation
      payloadEl.textContent = JSON.stringify(moment.payload, null, 2)
    }

    imageEl.addEventListener('error', () => { figureEl.hidden = true })
    buttons.forEach((b) => b.addEventListener('click', () => selectDemo(Number(b.dataset.index))))
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
