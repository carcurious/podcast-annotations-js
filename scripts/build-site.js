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
const featuredMoments = featured.annotations
  .filter((annotation) => annotation.title && (annotation.data?.explanation || annotation.image))
  .slice(0, 6)
  .map((annotation, index) => ({
    id: annotation.id ?? `featured-${index}`,
    startTime: annotation.startTime,
    endTime: annotation.endTime,
    title: annotation.title,
    type: annotation.type ?? 'unknown',
    image: annotation.image ?? '',
    quote: annotation.quote ?? '',
    explanation: annotation.data?.explanation ?? annotation.data?.simplifiedExplanation ?? '',
    attribution: annotation.data?.imageAttribution ?? ''
  }))

const totalAnnotations = exampleSets.reduce((sum, example) => sum + example.annotationCount, 0)
const totalTypes = new Set(exampleSets.flatMap((example) => example.typeCounts.map(([type]) => type))).size
const densestExample = [...exampleSets].sort((a, b) => b.densityPerMinute - a.densityPerMinute)[0]
const chartMax = Math.max(...exampleSets.map((example) => example.annotationCount), 1)

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

function renderTypePills(typeCounts, limit = 3) {
  return typeCounts
    .slice(0, limit)
    .map(([type, count]) => `<span class="type-pill">${escapeHtml(type)} <strong>${count}</strong></span>`)
    .join('')
}

function renderTimelineMarkers(annotations, duration) {
  return annotations
    .map((annotation, index) => {
      const start = duration > 0 ? (annotation.startTime / duration) * 100 : 0
      const end = duration > 0 ? (annotation.endTime / duration) * 100 : start + 0.4
      const width = Math.max(end - start, 0.45)
      return `<span class="timeline-marker" data-type="${escapeHtml(annotation.type ?? 'unknown')}" style="left:${start.toFixed(2)}%;width:${width.toFixed(2)}%" title="${escapeHtml(`${annotation.title ?? 'Untitled'} (${formatTime(annotation.startTime)})`)}"></span>`
    })
    .join('')
}

const featuredMomentButtons = featuredMoments
  .map((annotation, index) => {
    return `<button class="moment-button${index === 0 ? ' is-active' : ''}" type="button"
      data-index="${index}"
      data-start="${annotation.startTime}"
      data-title="${escapeHtml(annotation.title)}"
      data-type="${escapeHtml(annotation.type)}"
      data-explanation="${escapeHtml(annotation.explanation)}"
      data-image="${escapeHtml(annotation.image)}"
      data-attribution="${escapeHtml(annotation.attribution)}"
      data-quote="${escapeHtml(annotation.quote)}">
      <span class="moment-time">${formatTime(annotation.startTime)}</span>
      <span>${escapeHtml(annotation.title)}</span>
    </button>`
  })
  .join('')

const featuredInitial = featuredMoments[0]
const chartRows = exampleSets
  .slice()
  .sort((a, b) => b.annotationCount - a.annotationCount)
  .map((example) => {
    const width = (example.annotationCount / chartMax) * 100
    return `<div class="chart-row">
      <div class="chart-label">
        <a href="https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/${escapeHtml(example.file)}">${escapeHtml(example.slug)}</a>
        <span>${escapeHtml(example.annotationSet.episode?.title ?? '')}</span>
      </div>
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="width:${width.toFixed(2)}%"></div>
      </div>
      <div class="chart-value">${example.annotationCount} <span>${example.densityPerMinute.toFixed(2)}/min</span></div>
    </div>`
  })
  .join('')

const exampleCards = exampleSets
  .map((example) => {
    return `<article class="example-card">
      <div class="example-card-header">
        <h3>${escapeHtml(example.annotationSet.episode?.title ?? example.slug)}</h3>
        <span>${example.annotationCount} annotations</span>
      </div>
      <p>${escapeHtml(example.slug)}</p>
      <div class="example-meta">
        <span>${formatTime(example.duration)}</span>
        <span>${example.densityPerMinute.toFixed(2)} per minute</span>
      </div>
      <div class="type-pill-row">${renderTypePills(example.typeCounts, 4)}</div>
      <a class="example-link" href="https://github.com/ryanwi/podcast-annotations-js/blob/main/examples/${escapeHtml(example.file)}">Open example JSON</a>
    </article>`
  })
  .join('')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Podcast Annotation Format</title>
  <meta name="description" content="An open format for structured podcast show notes: timestamped entities, topics, and links synced to audio playback.">
  <meta property="og:title" content="Podcast Annotation Format">
  <meta property="og:description" content="WebVTT tells you what was said. Podcast annotations tell you what was said about.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.podcastannotation.org">
  <link rel="canonical" href="https://www.podcastannotation.org">
  <style>
    :root {
      --paper: #f5efe4;
      --paper-strong: #efe5d5;
      --ink: #1e1b18;
      --muted: #6d6257;
      --accent: #b94c35;
      --accent-soft: rgba(185, 76, 53, 0.14);
      --card: rgba(255, 251, 245, 0.78);
      --line: rgba(30, 27, 24, 0.12);
      --shadow: 0 20px 60px rgba(42, 24, 12, 0.10);
      --max-page: 1180px;
      --max-spec: 760px;
      --radius-lg: 28px;
      --radius-md: 18px;
      --radius-sm: 999px;
      --ui-font: "Avenir Next", "Segoe UI", sans-serif;
      --display-font: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
      --mono-font: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(185, 76, 53, 0.16), transparent 28%),
        radial-gradient(circle at top right, rgba(51, 94, 122, 0.12), transparent 24%),
        linear-gradient(180deg, #f7f0e6 0%, #f3ecdf 44%, #f7f3eb 100%);
      font-family: var(--ui-font);
      line-height: 1.65;
      padding: 32px 20px 80px;
    }
    a { color: inherit; }
    img { display: block; max-width: 100%; }
    .page {
      max-width: var(--max-page);
      margin: 0 auto;
    }
    .hero {
      position: relative;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      background: linear-gradient(145deg, rgba(255, 250, 244, 0.92), rgba(244, 234, 219, 0.84));
      box-shadow: var(--shadow);
      padding: 28px;
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: auto -60px -80px auto;
      width: 260px;
      height: 260px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(185, 76, 53, 0.22), transparent 65%);
      pointer-events: none;
    }
    .eyebrow {
      display: inline-flex;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 14px;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.95fr);
      gap: 26px;
      align-items: start;
    }
    h1, h2, h3 {
      margin: 0;
      font-weight: 600;
      line-height: 1.05;
    }
    h1 {
      font-family: var(--display-font);
      font-size: clamp(2.6rem, 5vw, 4.7rem);
      max-width: 9ch;
      margin-bottom: 14px;
      letter-spacing: -0.03em;
    }
    .hero-copy p {
      font-size: 1.05rem;
      color: var(--muted);
      max-width: 62ch;
      margin: 0 0 18px;
    }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .button-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: 0 18px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.62);
      text-decoration: none;
      font-weight: 600;
    }
    .button-link.primary {
      background: var(--ink);
      border-color: var(--ink);
      color: #f8f3ea;
    }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
    }
    .stat-card, .panel, .example-card {
      border: 1px solid var(--line);
      background: var(--card);
      backdrop-filter: blur(10px);
      box-shadow: var(--shadow);
      border-radius: var(--radius-md);
    }
    .stat-card {
      padding: 14px 16px;
    }
    .stat-card strong {
      display: block;
      font-size: 1.6rem;
      font-family: var(--display-font);
    }
    .stat-card span {
      color: var(--muted);
      font-size: 0.92rem;
    }
    .hero-panel {
      padding: 18px;
    }
    .hero-panel p {
      margin: 0;
      color: var(--muted);
    }
    .panel-kicker {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      margin-bottom: 10px;
    }
    .moment-shell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 180px;
      gap: 16px;
      align-items: start;
      margin-top: 16px;
    }
    .moment-card {
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.72);
    }
    .moment-type {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent);
      padding: 5px 10px;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 12px;
    }
    .moment-card h2 {
      font-family: var(--display-font);
      font-size: 2rem;
      margin-bottom: 10px;
    }
    .moment-card p {
      margin-bottom: 10px;
    }
    .moment-quote {
      font-style: italic;
      color: var(--muted);
      border-left: 3px solid rgba(185, 76, 53, 0.25);
      padding-left: 12px;
    }
    .moment-image {
      height: 100%;
      min-height: 170px;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, rgba(185, 76, 53, 0.12), rgba(51, 94, 122, 0.14));
    }
    .moment-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .moment-image figcaption {
      padding: 10px 12px;
      font-size: 0.78rem;
      color: var(--muted);
      background: rgba(255, 251, 245, 0.94);
    }
    .section {
      margin-top: 28px;
      padding: 24px;
    }
    .section h2 {
      font-family: var(--display-font);
      font-size: clamp(1.8rem, 3vw, 2.4rem);
      margin-bottom: 10px;
    }
    .section > p {
      margin: 0 0 20px;
      color: var(--muted);
      max-width: 70ch;
    }
    .timeline-stage {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255, 253, 250, 0.86);
      padding: 18px;
    }
    .timeline-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      margin-bottom: 12px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .timeline-track {
      position: relative;
      height: 78px;
      border-radius: 14px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(236, 226, 211, 0.85)),
        repeating-linear-gradient(90deg, transparent 0, transparent 11.5%, rgba(30, 27, 24, 0.04) 11.5%, rgba(30, 27, 24, 0.04) 12%);
      overflow: hidden;
      border: 1px solid rgba(30, 27, 24, 0.08);
    }
    .timeline-marker {
      position: absolute;
      top: 22px;
      height: 34px;
      border-radius: 8px;
      opacity: 0.9;
      background: #c97359;
    }
    .timeline-marker[data-type="car"] { background: #cf6b4f; }
    .timeline-marker[data-type="concept"] { background: #4f7d8b; }
    .timeline-marker[data-type="person"] { background: #856650; }
    .timeline-marker[data-type="term"] { background: #a8813f; }
    .timeline-marker[data-type="company"] { background: #5e6f48; }
    .timeline-marker[data-type="part"] { background: #3f5968; }
    .timeline-playhead {
      position: absolute;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--ink);
      left: 0;
      box-shadow: 0 0 0 4px rgba(30, 27, 24, 0.08);
      transition: left 240ms ease;
    }
    .timeline-playhead::before {
      content: "";
      position: absolute;
      top: -7px;
      left: -5px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--ink);
    }
    .moment-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .moment-button {
      text-align: left;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.66);
      border-radius: 14px;
      padding: 12px 14px;
      cursor: pointer;
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }
    .moment-button:hover,
    .moment-button.is-active {
      transform: translateY(-1px);
      border-color: rgba(185, 76, 53, 0.44);
      background: rgba(255, 247, 241, 0.98);
    }
    .moment-time {
      display: block;
      font-family: var(--mono-font);
      color: var(--accent);
      font-size: 0.8rem;
      margin-bottom: 6px;
    }
    .chart {
      display: grid;
      gap: 12px;
    }
    .chart-row {
      display: grid;
      grid-template-columns: minmax(0, 300px) minmax(120px, 1fr) 120px;
      gap: 14px;
      align-items: center;
    }
    .chart-label {
      display: grid;
      gap: 2px;
    }
    .chart-label a {
      font-weight: 600;
      text-decoration: none;
    }
    .chart-label span,
    .chart-value span {
      color: var(--muted);
      font-size: 0.85rem;
    }
    .chart-bar-wrap {
      width: 100%;
      height: 14px;
      border-radius: var(--radius-sm);
      background: rgba(30, 27, 24, 0.08);
      overflow: hidden;
    }
    .chart-bar {
      height: 100%;
      border-radius: var(--radius-sm);
      background: linear-gradient(90deg, #b94c35, #d18a63);
    }
    .chart-value {
      font-family: var(--mono-font);
      text-align: right;
    }
    .examples-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }
    .example-card {
      padding: 18px;
    }
    .example-card-header,
    .example-meta {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: baseline;
    }
    .example-card h3 {
      font-size: 1.15rem;
      font-family: var(--display-font);
    }
    .example-card p {
      margin: 8px 0 12px;
      color: var(--muted);
      min-height: 2.8em;
    }
    .type-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .type-pill {
      display: inline-flex;
      gap: 6px;
      align-items: center;
      padding: 5px 10px;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.72);
      font-size: 0.82rem;
    }
    .example-link {
      display: inline-block;
      margin-top: 14px;
      font-weight: 600;
      text-decoration: none;
    }
    .spec-wrap {
      margin-top: 28px;
      padding: 30px;
    }
    #spec {
      max-width: var(--max-spec);
      margin: 0 auto;
    }
    #spec h1 {
      font-size: 2.8rem;
      margin-bottom: 0.5rem;
    }
    #spec h2 {
      font-size: 1.55rem;
      margin-top: 2.7rem;
      margin-bottom: 0.8rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--line);
    }
    #spec h3 {
      font-size: 1.1rem;
      margin-top: 1.8rem;
      margin-bottom: 0.55rem;
    }
    #spec p, #spec ul, #spec ol, #spec table, #spec pre, #spec blockquote {
      margin-bottom: 1rem;
    }
    #spec ul, #spec ol {
      padding-left: 1.4rem;
    }
    #spec li {
      margin-bottom: 0.35rem;
    }
    #spec code {
      font-family: var(--mono-font);
      font-size: 0.88em;
      background: rgba(30, 27, 24, 0.05);
      padding: 0.12em 0.35em;
      border-radius: 4px;
    }
    #spec pre {
      background: #1f1a17;
      color: #f5efe4;
      padding: 1rem;
      border-radius: 12px;
      overflow-x: auto;
      line-height: 1.45;
    }
    #spec pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    #spec table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    #spec th, #spec td {
      text-align: left;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    #spec blockquote {
      margin-left: 0;
      padding-left: 1rem;
      border-left: 3px solid rgba(185, 76, 53, 0.3);
      color: var(--muted);
    }
    footer {
      margin-top: 24px;
      text-align: center;
      color: var(--muted);
      font-size: 0.9rem;
    }
    @media (max-width: 900px) {
      .hero-grid,
      .moment-shell {
        grid-template-columns: 1fr;
      }
      .stats-row {
        grid-template-columns: 1fr;
      }
      .chart-row {
        grid-template-columns: 1fr;
      }
      .chart-value {
        text-align: left;
      }
    }
    @media (max-width: 680px) {
      body {
        padding: 18px 14px 60px;
      }
      .hero,
      .section,
      .spec-wrap {
        padding: 18px;
      }
      h1 {
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <div class="eyebrow">Podcast Annotation Format</div>
      <div class="hero-grid">
        <div class="hero-copy">
          <h1>A small file for what a podcast moment is about.</h1>
          <p>WebVTT gives you the words. An annotation set gives you the entities, topics, links, and timing needed to build overlays, searchable archives, timelines, and richer show notes.</p>
          <div class="hero-actions">
            <a class="button-link primary" href="#demo">See the timeline demo</a>
            <a class="button-link" href="#spec">Read the spec</a>
          </div>
          <div class="stats-row">
            <div class="stat-card">
              <strong>${exampleSets.length}</strong>
              <span>example files in the repo</span>
            </div>
            <div class="stat-card">
              <strong>${totalAnnotations}</strong>
              <span>annotations across the corpus</span>
            </div>
            <div class="stat-card">
              <strong>${totalTypes}</strong>
              <span>entity and topic types used</span>
            </div>
          </div>
        </div>
        <aside class="hero-panel panel">
          <div class="panel-kicker">Corpus Snapshot</div>
          <p><strong>${escapeHtml(densestExample.annotationSet.episode?.title ?? densestExample.slug)}</strong> is the densest example in this repo at ${densestExample.densityPerMinute.toFixed(2)} annotations per minute.</p>
          <div class="type-pill-row" style="margin-top:16px;">
            ${renderTypePills(densestExample.typeCounts, 4)}
          </div>
          <p style="margin-top:14px;">The examples already span automotive, science, business history, culture, politics, and interview formats, which is enough to show the format is not tied to one content style.</p>
        </aside>
      </div>
    </section>

    <section class="section panel" id="demo">
      <div class="panel-kicker">Featured Example</div>
      <h2>What a player can render from one annotation file</h2>
      <p>The preview below uses <code>${escapeHtml(featured.file)}</code>. Click a moment to move the playhead and inspect the structured payload behind that timestamp.</p>
      <div class="timeline-stage">
        <div class="timeline-meta">
          <span>${escapeHtml(featured.annotationSet.episode?.title ?? featured.slug)}</span>
          <span>${featured.annotationCount} annotations across ${formatTime(featured.duration)}</span>
        </div>
        <div class="timeline-track">
          ${renderTimelineMarkers(featured.annotations, featured.duration)}
          <div class="timeline-playhead" id="timeline-playhead"></div>
        </div>
      </div>
      <div class="moment-shell">
        <article class="moment-card">
          <div class="moment-type" id="moment-type">${escapeHtml(featuredInitial?.type ?? 'unknown')}</div>
          <h2 id="moment-title">${escapeHtml(featuredInitial?.title ?? 'Featured annotation')}</h2>
          <p id="moment-explanation">${escapeHtml(featuredInitial?.explanation ?? 'Select a moment to inspect the annotation payload.')}</p>
          <p class="moment-quote" id="moment-quote">${featuredInitial?.quote ? escapeHtml(`"${featuredInitial.quote}"`) : 'Examples in this corpus often use title, type, image, and explanation without requiring a full quote.'}</p>
        </article>
        <figure class="moment-image" id="moment-figure"${featuredInitial?.image ? '' : ' style="display:none;"'}>
          <img id="moment-image" src="${escapeHtml(featuredInitial?.image ?? '')}" alt="${escapeHtml(featuredInitial?.title ?? '')}">
          <figcaption id="moment-attribution">${escapeHtml(featuredInitial?.attribution ?? '')}</figcaption>
        </figure>
      </div>
      <div class="moment-buttons">
        ${featuredMomentButtons}
      </div>
    </section>

    <section class="section panel">
      <div class="panel-kicker">Visualization</div>
      <h2>Corpus chart</h2>
      <p>This is the simplest useful chart for the project right now: how many annotations each example contains, plus density per minute. It makes the difference between chapter-like files and dense entity timelines immediately visible.</p>
      <div class="chart">
        ${chartRows}
      </div>
    </section>

    <section class="section panel">
      <div class="panel-kicker">Example Library</div>
      <h2>Real files, not placeholder cases</h2>
      <p>These examples are strong enough to anchor the spec. They should do more of the explanatory work so the prose can stay tighter and less promotional.</p>
      <div class="examples-grid">
        ${exampleCards}
      </div>
    </section>

    <section class="spec-wrap panel">
      <article id="spec">
${body}
      </article>
    </section>

    <footer>
      Developed by <a href="https://getcarcurious.com">Car Curious</a> &middot;
      <a href="https://github.com/ryanwi/podcast-annotations-js">GitHub</a> &middot;
      <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
    </footer>
  </div>

  <script>
    const duration = ${JSON.stringify(featured.duration)}
    const playhead = document.getElementById('timeline-playhead')
    const titleEl = document.getElementById('moment-title')
    const typeEl = document.getElementById('moment-type')
    const explanationEl = document.getElementById('moment-explanation')
    const quoteEl = document.getElementById('moment-quote')
    const figureEl = document.getElementById('moment-figure')
    const imageEl = document.getElementById('moment-image')
    const attributionEl = document.getElementById('moment-attribution')
    const buttons = [...document.querySelectorAll('.moment-button')]

    function setPlayhead(seconds) {
      const percent = duration > 0 ? (seconds / duration) * 100 : 0
      playhead.style.left = percent.toFixed(2) + '%'
    }

    function selectButton(button) {
      buttons.forEach((candidate) => candidate.classList.toggle('is-active', candidate === button))
      titleEl.textContent = button.dataset.title || 'Featured annotation'
      typeEl.textContent = button.dataset.type || 'unknown'
      explanationEl.textContent = button.dataset.explanation || 'No explanation provided.'
      quoteEl.textContent = button.dataset.quote ? '"' + button.dataset.quote + '"' : 'This annotation uses timing and typed metadata without relying on a quoted transcript span.'

      if (button.dataset.image) {
        figureEl.style.display = ''
        imageEl.src = button.dataset.image
        imageEl.alt = button.dataset.title || ''
        attributionEl.textContent = button.dataset.attribution || ''
      } else {
        figureEl.style.display = 'none'
      }

      setPlayhead(Number(button.dataset.start || 0))
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => selectButton(button))
    })

    if (buttons[0]) selectButton(buttons[0])
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
