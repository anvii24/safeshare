// Renders the app icon PNGs from the SVG sources in public/icons/ with headless
// Chrome. Run after changing icon.svg or icon-maskable.svg:
//   node scripts/make-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'
import { findChrome } from './lib/chrome.mjs'

const dir = new URL('../public/icons/', import.meta.url)
const icon = readFileSync(new URL('icon.svg', dir), 'utf8')
const maskable = readFileSync(new URL('icon-maskable.svg', dir), 'utf8')
// iOS rounds the corners itself, so the apple-touch icon is the normal icon, full bleed.
const fullBleed = icon.replace(/ rx="\d+"/, '')

const outputs = [
  ['icon-192.png', icon, 192],
  ['icon-512.png', icon, 512],
  ['icon-maskable-512.png', maskable, 512],
  ['apple-touch-icon-180.png', fullBleed, 180],
]

const browser = await puppeteer.launch({ executablePath: findChrome() })
try {
  const page = await browser.newPage()
  for (const [name, svg, size] of outputs) {
    await page.setViewport({ width: size, height: size })
    const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`)
    const png = await page.screenshot({ omitBackground: true, type: 'png' })
    writeFileSync(new URL(name, dir), png)
    console.log(`public/icons/${name}`)
  }
} finally {
  await browser.close()
}
