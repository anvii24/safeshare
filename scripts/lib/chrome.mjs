// Finds an installed Chrome or Edge for the test scripts (puppeteer-core does
// not download a browser). Set CHROME_PATH to override.
import { existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const CANDIDATES = [
  process.env.CHROME_PATH,
  // Windows
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
]

export function findChrome() {
  for (const path of CANDIDATES) if (path && existsSync(path)) return path
  // Linux
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      const path = execSync(`command -v ${name}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      if (path) return path
    } catch {
      // not installed
    }
  }
  throw new Error('Chrome or Edge not found. Install one, or set CHROME_PATH to its executable.')
}
