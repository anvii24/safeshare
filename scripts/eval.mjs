// Measures detection quality on the test documents in tests/images/.
//
//   npm run eval                      # run and add a dated section to tests/results.md
//   npm run eval -- --label "note"    # same, with a note (e.g. what changed)
//   npm run eval -- --no-save         # print only
//
// Each image goes through the app's own pipeline (src/lib/pipeline.ts: the
// same OCR, QR scan and detectors users get), in headless Chrome, via the
// Vite dev server. Results are scored against tests/expected.json:
//   catch rate   = sensitive items found ÷ sensitive items present
//   false alarms = boxes on harmless text (detections matching no expected item)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { createServer } from 'vite'
import { DETECTION_LABELS } from '../src/lib/detectors.ts'
import { maskValue, scoreImage } from '../src/lib/evaluate.ts'
import { findChrome } from './lib/chrome.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = join(root, 'tests', 'images')
const expectedPath = join(root, 'tests', 'expected.json')
const resultsPath = join(root, 'tests', 'results.md')

const args = process.argv.slice(2)
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : ''
const save = !args.includes('--no-save')

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }
const expected = JSON.parse(readFileSync(expectedPath, 'utf8'))
const images = readdirSync(imagesDir).filter((f) => MIME[extname(f).toLowerCase()]).sort()

for (const name of Object.keys(expected)) if (!images.includes(name)) console.warn(`! ${name} is in expected.json but not in tests/images/`)
const toRun = images.filter((name) => {
  if (expected[name]) return true
  console.warn(`! ${name} has no entry in tests/expected.json; skipped`)
  return false
})
if (toRun.length === 0) {
  console.error('No test images to run. Add images to tests/images/ and list them in tests/expected.json.')
  process.exit(1)
}

// --- Run every image through the app's pipeline -----------------------------------
const server = await createServer({ root, logLevel: 'error', server: { port: 0 } })
await server.listen()
const url = server.resolvedUrls.local[0]
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true })
const page = await browser.newPage()
page.on('pageerror', (e) => console.error('[page error]', e.message))
await page.goto(url, { waitUntil: 'networkidle0' })

const runs = []
try {
  for (const name of toRun) {
    const b64 = readFileSync(join(imagesDir, name)).toString('base64')
    process.stdout.write(`  ${name} … `)
    const result = await page.evaluate(
      async (b64, name, type) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        const { processDocument } = await import('/src/lib/pipeline.ts')
        const start = performance.now()
        const r = await processDocument(new File([bytes], name, { type }))
        URL.revokeObjectURL(r.image.url)
        return {
          ms: Math.round(performance.now() - start),
          quality: r.quality,
          size: `${r.image.width}×${r.image.height}`,
          found: r.detections.map((d) => ({ type: d.type, text: d.text, boxes: d.boxes.length })),
        }
      },
      b64,
      name,
      MIME[extname(name).toLowerCase()],
    )
    const score = scoreImage(expected[name].items, result.found)
    runs.push({ name, ...result, score })
    console.log(`${score.caught.length}/${score.present} caught, ${score.falseAlarms.length} false alarm(s), ${(result.ms / 1000).toFixed(1)}s`)
  }
} finally {
  await browser.close()
  await server.close()
}

// --- Totals ------------------------------------------------------------------------
const sum = (f) => runs.reduce((n, r) => n + f(r), 0)
const present = sum((r) => r.score.present)
const caught = sum((r) => r.score.caught.length)
const falseAlarms = sum((r) => r.score.falseAlarms.length)
const mislabelled = sum((r) => r.score.mislabelled.length)
const pct = (a, b) => (b === 0 ? '–' : `${((100 * a) / b).toFixed(1)}%`)

const byType = {}
for (const r of runs) {
  for (const item of r.score.caught) (byType[item.type] ??= { present: 0, caught: 0 }).caught++
  for (const item of [...r.score.caught, ...r.score.missed]) (byType[item.type] ??= { present: 0, caught: 0 }).present++
}

console.log(`\nCatch rate: ${caught}/${present} = ${pct(caught, present)}`)
console.log(`False alarms: ${falseAlarms} across ${runs.length} images (${runs.filter((r) => r.score.falseAlarms.length === 0).length} images with none)`)
if (mislabelled) console.log(`Caught but mislabelled: ${mislabelled}`)
for (const r of runs) {
  for (const m of r.score.missed) console.log(`  MISS   ${r.name}: ${m.type} ${m.value ?? ''}`)
  for (const f of r.score.falseAlarms) console.log(`  FALSE  ${r.name}: ${f.type} "${f.text}"`)
  for (const m of r.score.mislabelled) console.log(`  LABEL  ${r.name}: ${m.expected.type} found as ${m.foundAs}`)
}

// --- results.md ----------------------------------------------------------------------
if (save) {
  let commit = 'unknown'
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
    if (execSync('git status --porcelain', { cwd: root }).toString().trim()) commit += ' + uncommitted changes'
  } catch {
    // not a git checkout
  }
  const now = new Date()
  const stamp = `${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}`
  const typeRows = Object.entries(byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, v]) => `| ${DETECTION_LABELS[t] ?? t} | ${v.caught}/${v.present} | ${pct(v.caught, v.present)} |`)
  const imageRows = runs.map(
    (r) => `| ${r.name} | ${r.score.caught.length}/${r.score.present} | ${r.score.falseAlarms.length} | ${r.quality} | ${(r.ms / 1000).toFixed(1)}s |`,
  )
  const notes = runs.flatMap((r) => [
    ...r.score.missed.map((m) => `- Missed in \`${r.name}\`: ${maskValue(m)}`),
    ...r.score.falseAlarms.map((f) => `- False alarm in \`${r.name}\`: ${maskValue({ type: f.type, value: f.text })}`),
    ...r.score.mislabelled.map((m) => `- Mislabelled in \`${r.name}\`: ${m.expected.type} found as ${m.foundAs}`),
  ])

  const section = [
    `## ${stamp}${label ? ` · ${label}` : ''}`,
    '',
    `Commit \`${commit}\` · ${runs.length} images (${runs.filter((r) => r.name.startsWith('synthetic-')).length} synthetic) · Chrome (headless, desktop)`,
    '',
    `**Catch rate ${pct(caught, present)}** (${caught}/${present}) · **False alarms ${falseAlarms}**${mislabelled ? ` · Mislabelled ${mislabelled}` : ''}`,
    '',
    '| Type | Caught | Rate |',
    '| --- | --- | --- |',
    ...typeRows,
    '',
    '| Image | Caught | False alarms | Quality | Time |',
    '| --- | --- | --- | --- | --- |',
    ...imageRows,
    '',
    ...(notes.length ? [...notes, ''] : ['No misses or false alarms.', '']),
  ].join('\n')

  const header = `# Detection test results

Newest first. Produced by \`npm run eval\` (scripts/eval.mjs) from the images in
\`tests/images/\` and the answers in \`tests/expected.json\`. Values are masked to
their last 4 characters.

- **Catch rate**: sensitive items found ÷ sensitive items present. An item counts as
  caught if any box covers its value, even under a different label.
- **False alarms**: boxes on harmless text.

Images named \`synthetic-*\` are generated from made-up data (\`npm run make-test-images\`)
and are cleaner than real phone photos, so scores on them overstate real-world accuracy.
`
  const previous = existsSync(resultsPath) ? readFileSync(resultsPath, 'utf8').split(/\n(?=## )/).slice(1).join('\n') : ''
  writeFileSync(resultsPath, `${header}\n${section}${previous ? '\n' + previous : ''}`)
  console.log(`\nSaved to tests/results.md`)
}
