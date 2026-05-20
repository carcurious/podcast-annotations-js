import { execSync } from 'child_process'
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { marked } from 'marked'

const spec = readFileSync('SPEC.md', 'utf-8')
const body = marked.parse(spec)
const lastmod = execSync('git log -1 --format=%cI SPEC.md', { encoding: 'utf-8' }).trim().slice(0, 10)

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
    typeCounts,
    densityPerMinute: duration > 0 ? annotations.length / (duration / 60) : 0
  }
})

const featured = exampleSets.find((example) => example.slug === 'everyday-driver-episode-1013') ?? exampleSets[0]
const demoMoments = featured.annotations
  .filter((annotation) =>
    annotation.title &&
    (annotation.data?.explanation || annotation.data?.simplifiedExplanation || annotation.quote) &&
    !/tesla/i.test(annotation.title) &&
    !/tesla/i.test(annotation.data?.explanation ?? '') &&
    !/tesla/i.test(annotation.data?.simplifiedExplanation ?? '')
  )
  .slice(0, 3)
  .map((annotation, index) => ({
    index,
    startTime: annotation.startTime,
    endTime: annotation.endTime,
    title: annotation.title,
    type: annotation.type ?? 'unknown',
    explanation: annotation.data?.explanation ?? annotation.data?.simplifiedExplanation ?? '',
    quote: annotation.quote ?? '',
    payload: {
      startTime: annotation.startTime,
      endTime: annotation.endTime,
      type: annotation.type ?? 'unknown',
      title: annotation.title,
      image: annotation.image,
      quote: annotation.quote,
      data: annotation.data ?? {}
    }
  }))

const totalAnnotations = exampleSets.reduce((sum, example) => sum + example.annotationCount, 0)

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(total / 3600)
  const mins = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function renderExampleRows(examples) {
  return examples
    .map((example) => {
      return `<tr>
        <td><a href="https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/${escapeHtml(example.file)}">${escapeHtml(example.slug)}</a></td>
        <td>${escapeHtml(example.annotationSet.episode?.title ?? '')}</td>
        <td>${example.annotationCount}</td>
        <td>${formatTime(example.duration)}</td>
      </tr>`
    })
    .join('')
}

function renderDemoMarkers(moments) {
  const count = Math.max(moments.length - 1, 1)
  return moments
    .map((moment, index) => {
      const left = count === 0 ? 0 : (index / count) * 100
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

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podcast Annotation Format</title>
  <meta name="description" content="A JSON format for timestamped topics, entities, and links in spoken audio.">
  <meta property="og:title" content="Podcast Annotation Format">
  <meta property="og:description" content="Transcripts say what was said. Annotations say what the moment is about.">
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
      letter-spacing: 0.04em;
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
      letter-spacing: -0.01em;
    }
    h1 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: clamp(2.4rem, 5.5vw, 3.6rem);
      letter-spacing: -0.02em;
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
      letter-spacing: -0.01em;
      margin-bottom: 12px;
    }
    .lede {
      max-width: 64ch;
      font-size: 1.05rem;
      line-height: 1.65;
      color: var(--text);
      margin: 0 0 32px;
    }
    .lede em {
      font-style: normal;
      color: var(--accent);
      font-weight: 500;
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
      margin: 8px 0 20px;
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
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
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 0.9fr);
      gap: 18px;
      align-items: start;
    }
    .demo-copy {
      min-width: 0;
    }
    .demo-type {
      display: inline-block;
      font-family: var(--mono);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      margin-bottom: 10px;
    }
    .demo-copy h3 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 1.9rem;
      letter-spacing: -0.01em;
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
    .demo-chips {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 18px;
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
    .examples-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
    }
    .examples-table th,
    .examples-table td {
      text-align: left;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      font-size: 0.95rem;
    }
    .examples-table th {
      font-size: 0.84rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      background: var(--surface-muted);
    }
    .examples-table tr:last-child td {
      border-bottom: 0;
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
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    #spec h2 {
      font-family: var(--serif);
      font-weight: 500;
      font-size: 1.55rem;
      letter-spacing: -0.01em;
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
      .demo-detail,
      .why-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 720px) {
      body {
        padding: 22px 14px 56px;
      }
      .topbar {
        display: block;
      }
      .topbar nav {
        margin-top: 10px;
      }
      .examples-table {
        display: block;
        overflow-x: auto;
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
        <a href="#example">Small example</a>
        <a href="#examples">Example files</a>
        <a href="#spec">Specification</a>
        <a href="https://github.com/ryanwi/podcast-annotations-js">GitHub</a>
      </nav>
    </header>

    <section class="intro">
      <div>
        <h1>When a podcast mentions something you do not know, you should be able to understand it right there.</h1>
        <p class="lede">Transcripts tell you what was said. An annotation set adds the missing context: what the moment is about, when it starts, when it ends, and where to send the listener next.</p>
        <p>That lets a player show a brief explanation, link to a source, or index the moment for search without guessing from freeform show notes.</p>
        <div class="intro-actions">
          <a class="button-link primary" href="#spec">Read the spec</a>
          <a class="button-link" href="#example">See an example</a>
        </div>
      </div>
      <pre><code>{
  "startTime": 154.8,
  "endTime": 158.48,
  "type": "car",
  "title": "Chevrolet Corvette"
}</code></pre>
    </section>

    <section class="section" id="example">
      <h2>Small example</h2>
      <p>Three real annotations from <code>${escapeHtml(featured.file)}</code>. Click a marker to see the structured payload for that moment.</p>
      <div class="demo">
        <div class="demo-head">
          <strong>${escapeHtml(featured.annotationSet.episode?.title ?? featured.slug)}</strong>
          <p>${featured.annotationCount} annotations across ${formatTime(featured.duration)}</p>
        </div>
        <div class="demo-track">
          ${renderDemoMarkers(demoMoments)}
        </div>
        <div class="demo-detail">
          <div class="demo-copy">
            <div class="demo-type" id="demo-type">${escapeHtml(demoInitial?.type ?? 'unknown')}</div>
            <h3 id="demo-title">${escapeHtml(demoInitial?.title ?? 'Annotation')}</h3>
            <p id="demo-explanation">${escapeHtml(demoInitial?.explanation ?? 'No explanation provided.')}</p>
            <p class="demo-quote" id="demo-quote">${demoInitial?.quote ? escapeHtml(`"${demoInitial.quote}"`) : 'This annotation uses timing and typed metadata without relying on a quoted transcript span.'}</p>
          </div>
          <pre id="demo-payload">${escapeHtml(JSON.stringify(demoInitial?.payload ?? {}, null, 2))}</pre>
        </div>
        <div class="demo-chips">
          ${renderDemoButtons(demoMoments)}
        </div>
      </div>
    </section>

    <section class="section" id="examples">
      <h2>Example files</h2>
      <p>${exampleSets.length} files, ${totalAnnotations} annotations, and a mix of sparse chapter-like sets and denser moment-by-moment sets.</p>
      <table class="examples-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Episode</th>
            <th>Count</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          ${renderExampleRows(exampleSets)}
        </tbody>
      </table>
    </section>

    <section class="spec-wrap">
      <article id="spec">
${body}
      </article>
    </section>

    <footer>
      <a href="https://github.com/ryanwi/podcast-annotations-js">GitHub</a>
    </footer>
  </div>

  <script>
    const demoMoments = ${JSON.stringify(demoMoments)}
    const chips = [...document.querySelectorAll('.demo-chip')]
    const markers = [...document.querySelectorAll('.demo-marker')]
    const typeEl = document.getElementById('demo-type')
    const titleEl = document.getElementById('demo-title')
    const explanationEl = document.getElementById('demo-explanation')
    const quoteEl = document.getElementById('demo-quote')
    const payloadEl = document.getElementById('demo-payload')

    function selectDemo(index) {
      const annotation = demoMoments.find((moment) => moment.index === index)
      if (!annotation) return

      chips.forEach((chip) => chip.classList.toggle('is-active', Number(chip.dataset.index) === index))
      markers.forEach((marker) => marker.classList.toggle('is-active', Number(marker.dataset.index) === index))
      typeEl.textContent = annotation.type || 'unknown'
      titleEl.textContent = annotation.title || 'Annotation'
      explanationEl.textContent = annotation.explanation || 'No explanation provided.'
      quoteEl.textContent = annotation.quote
        ? '"' + annotation.quote + '"'
        : 'This annotation uses timing and typed metadata without relying on a quoted transcript span.'
      payloadEl.textContent = JSON.stringify(annotation.payload || {}, null, 2)
    }

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
