// Finds sensitive details in OCR output: Aadhaar number and VID, PAN, bank
// account number, IFSC, phone number, email and date of birth.
//
// Every detector takes the OCR words and returns { type, text, boxes }, where
// `boxes` are the word boxes to cover. `detectAll` runs every detector and
// removes overlaps. Everything here is pure: no I/O, no logging.
import type { BBox, OcrWord } from './ocr'

export type DetectionType =
  | 'aadhaar'
  | 'aadhaar_vid'
  | 'pan'
  | 'bank_account'
  | 'ifsc'
  | 'phone'
  | 'email'
  | 'dob'
  /** Found by the image scan in qr.ts, not from OCR words. */
  | 'qr_code'

/** The types found from OCR text by the detectors in this file. */
type TextDetectionType = Exclude<DetectionType, 'qr_code'>

export interface Detection {
  type: DetectionType
  /** The normalised value (OCR look-alikes fixed). Never log this. */
  text: string
  boxes: BBox[]
  /** The OCR text of each box, in the same order as `boxes`. */
  words: string[]
}

export const DETECTION_LABELS: Record<DetectionType, string> = {
  aadhaar: 'Aadhaar number',
  aadhaar_vid: 'Aadhaar VID',
  pan: 'PAN',
  bank_account: 'Bank account number',
  ifsc: 'IFSC code',
  phone: 'Phone number',
  email: 'Email address',
  dob: 'Date of birth',
  qr_code: 'QR code',
}

// ---------------------------------------------------------------------------
// Verhoeff checksum (used by Aadhaar)
// ---------------------------------------------------------------------------

const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]
const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

function verhoeff(digits: string, offset: number): number {
  let c = 0
  for (let i = 0; i < digits.length; i++) {
    const d = Number(digits[digits.length - 1 - i])
    c = VERHOEFF_D[c][VERHOEFF_P[(i + offset) % 8][d]]
  }
  return c
}

/** True if the last digit is a valid Verhoeff check digit for the rest. */
export function verhoeffValid(digits: string): boolean {
  return /^\d+$/.test(digits) && verhoeff(digits, 0) === 0
}

/** The Verhoeff check digit to append to `digits`. */
export function verhoeffCheckDigit(digits: string): string {
  return String(VERHOEFF_INV[verhoeff(digits, 1)])
}

// ---------------------------------------------------------------------------
// OCR clean-up
// ---------------------------------------------------------------------------

// Letters OCR commonly reads in place of digits.
const LOOKALIKE_DIGITS: Record<string, string> = { O: '0', o: '0', I: '1', l: '1', '|': '1', S: '5', B: '8' }
// And the reverse, for letter positions in PAN and IFSC.
const LOOKALIKE_LETTERS: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' }

/**
 * If `s` looks like a number (digits, look-alike letters and - / . separators,
 * with at least as many real digits as look-alikes), returns it with the
 * look-alikes replaced by digits. Otherwise null.
 */
export function fixNumberLike(s: string): string | null {
  if (!/^[0-9OoIl|SB\-/.]+$/.test(s)) return null
  const real = s.replace(/\D/g, '').length
  const lookalikes = s.replace(/[^OoIl|SB]/g, '').length
  if (real === 0 || lookalikes > real) return null
  return s.replace(/[OoIl|SB]/g, (c) => LOOKALIKE_DIGITS[c])
}

const trimPunct = (s: string) =>
  s.replace(/^[^\p{L}\p{M}\p{N}+]+/u, '').replace(/[^\p{L}\p{M}\p{N}]+$/u, '')

/** The value part of a word: what follows a "Label:" prefix, minus edge punctuation. */
function valueOf(raw: string): string {
  const afterColon = raw.slice(raw.lastIndexOf(':') + 1)
  return trimPunct(afterColon || raw)
}

/** A word like "DOB:" or "Mobile:" that only labels the next word. */
const isLabel = (t: Token) => /:\s*$/.test(t.raw)

// ---------------------------------------------------------------------------
// Document model: words in reading order, grouped into lines
// ---------------------------------------------------------------------------

interface Token {
  /** Position in reading order across the whole page. */
  index: number
  line: number
  raw: string
  bbox: BBox
}

interface Run {
  tokens: Token[]
  digits: string
  /** The run starts with "+", like "+91". */
  plus: boolean
}

interface Hit {
  start: number
  end: number
}

interface Doc {
  tokens: Token[]
  lines: Token[][]
  runs: Run[]
  hits: { account: Hit[]; vid: Hit[]; dob: Hit[] }
}

interface Match {
  type: DetectionType
  text: string
  tokens: Token[]
}

/** How many words before its value a keyword like "A/c" or "DOB" may be. */
const CONTEXT_WINDOW = 5
/** Longest digit sequence we join: 18-digit account numbers, maybe split up. */
const MAX_RUN_DIGITS = 18
const MAX_RUN_WORDS = 6
/** Words further apart than this many line-heights are in different columns. */
const MAX_GAP_LINE_HEIGHTS = 2.5

type Phrase = RegExp[]

const ACCOUNT_PHRASES: Phrase[] = [
  [/^a[/|]c/],
  [/^alc$/], // common OCR misread of "A/c"
  [/^account/],
  [/^acct/],
  [/^acc$/, /^(no|number)$/],
  [/^खाता/],
]
const VID_PHRASES: Phrase[] = [[/(^|[^a-z])vid([^a-z]|$)/], [/^virtual$/, /^id$/]]
const DOB_PHRASES: Phrase[] = [
  // "DOB", "D.O.B", and the OCR misreads "D0B" / "DO8".
  [/(^|[^a-z])d\.?[o0]\.?[b8]([^a-z0-9]|$)/],
  [/^date$/, /^of$/, /^birth/],
  [/^year$/, /^of$/, /^birth/],
  [/^जन्म/],
]

/**
 * Tidies OCR text before matching: Unicode NFC (so Hindi matras compare
 * equal however they were encoded) and Devanagari digits ०–९ to 0–9, which
 * Hindi OCR sometimes returns for ordinary digits.
 */
export function normalizeText(text: string): string {
  return text
    .trim()
    .normalize('NFC')
    .replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966))
}

function analyse(words: OcrWord[]): Doc {
  const tokens: Token[] = words
    .filter((w) => w.text.trim())
    .map((w) => ({ index: 0, line: w.line, raw: normalizeText(w.text), bbox: w.bbox }))
    .sort((a, b) => a.line - b.line || a.bbox.x0 - b.bbox.x0)
  tokens.forEach((t, i) => (t.index = i))

  const lines: Token[][] = []
  for (const t of tokens) {
    const last = lines[lines.length - 1]
    if (last && last[0].line === t.line) last.push(t)
    else lines.push([t])
  }

  return {
    tokens,
    lines,
    runs: lines.flatMap(digitRuns),
    hits: {
      account: findPhrases(tokens, ACCOUNT_PHRASES),
      vid: findPhrases(tokens, VID_PHRASES),
      dob: findPhrases(tokens, DOB_PHRASES),
    },
  }
}

function findPhrases(tokens: Token[], phrases: Phrase[]): Hit[] {
  const norm = tokens.map((t) => trimPunct(t.raw.toLowerCase()))
  const hits: Hit[] = []
  for (let i = 0; i < tokens.length; i++) {
    for (const phrase of phrases) {
      if (phrase.every((re, k) => i + k < norm.length && re.test(norm[i + k]))) {
        hits.push({ start: i, end: i + phrase.length - 1 })
      }
    }
  }
  return hits
}

/**
 * True if a keyword labels this span: the keyword is inside it ("VID:9123…"),
 * or comes up to CONTEXT_WINDOW words before it with no other number in
 * between. A label only ever claims the first number after it. Words ending
 * in ":" in between are labels too, not values, so they don't block: e.g.
 * "जन्म तिथि/008: 14/08/1992", where OCR misread "DOB" as "008".
 */
function near(doc: Doc, span: Token[], hits: Hit[]): boolean {
  const a = span[0].index
  const b = span[span.length - 1].index
  return hits.some((h) => {
    if (h.start <= b && h.end >= a) return true
    if (h.end >= a || a - h.end > CONTEXT_WINDOW) return false
    return doc.tokens.slice(h.end + 1, a).every((t) => isLabel(t) || !/\d/.test(t.raw))
  })
}

function isGap(a: Token, b: Token): boolean {
  const height = Math.max(a.bbox.y1 - a.bbox.y0, b.bbox.y1 - b.bbox.y0, 1)
  return b.bbox.x0 - a.bbox.x1 > height * MAX_GAP_LINE_HEIGHTS
}

/** Spans of 1..maxWords neighbouring words on a line, starting at word i. */
function spansFrom(line: Token[], i: number, maxWords: number): Token[][] {
  const spans: Token[][] = []
  for (let j = i; j < line.length && j - i < maxWords; j++) {
    if (j > i && isGap(line[j - 1], line[j])) break
    spans.push(line.slice(i, j + 1))
  }
  return spans
}

/** Digits in a word for joining into a number, or null if it isn't number-like. */
function runDigits(raw: string): string | null {
  if (/^[-–]$/.test(raw)) return '' // a lone dash between groups: "1234 - 5678"
  const fixed = fixNumberLike(valueOf(raw).replace(/^\+/, ''))
  if (fixed === null || /[/.]/.test(fixed)) return null
  return fixed.replace(/-/g, '')
}

/** Every sequence of neighbouring number-like words on a line, joined. */
function digitRuns(line: Token[]): Run[] {
  const runs: Run[] = []
  for (let i = 0; i < line.length; i++) {
    if (!runDigits(line[i].raw)) continue // runs start on a word with digits
    let digits = ''
    for (const span of spansFrom(line, i, MAX_RUN_WORDS)) {
      const t = span[span.length - 1]
      // A "+" or a "Label:" can only start a number, not continue one.
      if (span.length > 1 && (/^\+/.test(valueOf(t.raw)) || t.raw.includes(':'))) break
      const d = runDigits(t.raw)
      if (d === null) break
      digits += d
      if (digits.length > MAX_RUN_DIGITS) break
      if (digits && d) runs.push({ tokens: span, digits, plus: valueOf(span[0].raw).startsWith('+') })
    }
  }
  return runs
}

const join = (span: Token[]) => valueOf(span.map((t) => t.raw).join(''))

/** Text detectors: shortest span of up to `maxWords` words whose joined text `read` accepts. */
function findInSpans(
  doc: Doc,
  type: DetectionType,
  maxWords: number,
  read: (value: string) => string | null,
  context?: Hit[],
): Match[] {
  const matches: Match[] = []
  for (const line of doc.lines) {
    for (let i = 0; i < line.length; i++) {
      if (isLabel(line[i])) continue
      for (const span of spansFrom(line, i, maxWords)) {
        const text = read(join(span))
        if (!text) continue
        // "Email name@example.com" would also match; leave that to the next start.
        if (span.length > 1 && read(join(span.slice(1)))) break
        if (!context || near(doc, span, context)) matches.push({ type, text, tokens: span })
        break
      }
    }
  }
  return matches
}

// ---------------------------------------------------------------------------
// Readers for each format
// ---------------------------------------------------------------------------

// Upper-cased input turns a misread "l" into "L", which in a digit place means 1.
const UPPER_LOOKALIKE_DIGITS: Record<string, string> = { ...LOOKALIKE_DIGITS, L: '1' }

/** Fix look-alikes in upper-cased text, position by position: 'L' = letter expected, 'D' = digit expected. */
function fixByPattern(s: string, pattern: string): string {
  return [...s]
    .map((c, i) =>
      pattern[i] === 'D' ? (UPPER_LOOKALIKE_DIGITS[c] ?? c) : pattern[i] === 'L' ? (LOOKALIKE_LETTERS[c] ?? c) : c,
    )
    .join('')
}

const countLetters = (s: string) => s.replace(/[^A-Za-z]/g, '').length

/**
 * PAN and IFSC codes are printed in capitals. Requiring that (allowing one
 * lowercase OCR slip) stops ordinary words from matching, e.g. "Laptop stand"
 * joined and "fixed" into the IFSC-shaped "LAPT0PSTAND".
 */
const mostlyCapitals = (s: string) => s.replace(/[^a-z]/g, '').length <= 1

const PAN_RE = /^[A-Z]{3}[ABCFGHJLPT][A-Z]\d{4}[A-Z]$/

function readPan(value: string): string | null {
  if (value.length !== 10 || !mostlyCapitals(value)) return null
  const upper = value.toUpperCase()
  // Need mostly real letters, so a plain number can't be "fixed" into a PAN.
  if (countLetters(upper.slice(0, 5)) < 3) return null
  const fixed = fixByPattern(upper.replace(/\|/g, 'I'), 'LLLLLDDDDL')
  return PAN_RE.test(fixed) ? fixed : null
}

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

function readIfsc(value: string): string | null {
  if (value.length !== 11 || !mostlyCapitals(value)) return null
  const upper = value.toUpperCase()
  if (countLetters(upper.slice(0, 4)) < 3) return null
  const fixed = fixByPattern(upper, 'LLLLD')
  return IFSC_RE.test(fixed) ? fixed : null
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/

const readEmail = (value: string) => (EMAIL_RE.test(value) ? value : null)

function readDate(value: string): string | null {
  const s = fixNumberLike(value)
  if (!s) return null
  const full = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s)
  if (full) {
    const [day, month, year] = full.slice(1).map(Number)
    return day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100 ? s : null
  }
  // "Year of Birth: 1985" on older Aadhaar cards.
  return /^(19|20)\d{2}$/.test(s) ? s : null
}

// ---------------------------------------------------------------------------
// Finders
// ---------------------------------------------------------------------------

const fromRuns = (doc: Doc, type: DetectionType, test: (r: Run) => boolean): Match[] =>
  doc.runs.filter(test).map((r) => ({ type, text: r.digits, tokens: r.tokens }))

const finders: Record<TextDetectionType, (doc: Doc) => Match[]> = {
  aadhaar: (doc) =>
    fromRuns(doc, 'aadhaar', (r) => !r.plus && /^[2-9]\d{11}$/.test(r.digits) && verhoeffValid(r.digits)),
  aadhaar_vid: (doc) =>
    fromRuns(doc, 'aadhaar_vid', (r) => !r.plus && /^\d{16}$/.test(r.digits) && near(doc, r.tokens, doc.hits.vid)),
  bank_account: (doc) =>
    fromRuns(doc, 'bank_account', (r) => !r.plus && /^\d{9,18}$/.test(r.digits) && near(doc, r.tokens, doc.hits.account)),
  phone: (doc) =>
    fromRuns(doc, 'phone', (r) => (r.plus ? /^91[6-9]\d{9}$/ : /^(91|0)?[6-9]\d{9}$/).test(r.digits)),
  pan: (doc) => findInSpans(doc, 'pan', 2, readPan),
  ifsc: (doc) => findInSpans(doc, 'ifsc', 2, readIfsc),
  email: (doc) => findInSpans(doc, 'email', 3, readEmail),
  dob: (doc) => findInSpans(doc, 'dob', 5, readDate, doc.hits.dob),
}

// When matches share a word, keep the one covering more words (a 16-digit VID
// beats a 12-digit piece of it), then the more specific type.
const PRIORITY: DetectionType[] = ['aadhaar_vid', 'bank_account', 'aadhaar', 'phone', 'pan', 'ifsc', 'email', 'dob']

function resolve(matches: Match[]): Detection[] {
  const sorted = [...matches].sort(
    (a, b) => b.tokens.length - a.tokens.length || PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type),
  )
  const used = new Set<number>()
  const kept: Match[] = []
  for (const m of sorted) {
    if (m.tokens.some((t) => used.has(t.index))) continue
    m.tokens.forEach((t) => used.add(t.index))
    kept.push(m)
  }
  return kept
    .sort((a, b) => a.tokens[0].index - b.tokens[0].index)
    .map((m) => ({
      type: m.type,
      text: m.text,
      boxes: m.tokens.map((t) => t.bbox),
      words: m.tokens.map((t) => t.raw),
    }))
}

const detector = (type: TextDetectionType) => (words: OcrWord[]) => resolve(finders[type](analyse(words)))

/** 12 digits, first digit 2–9, valid Verhoeff checksum. May be split "1234 5678 9012". */
export const detectAadhaar = detector('aadhaar')
/** 16-digit Aadhaar Virtual ID near the word "VID". */
export const detectAadhaarVid = detector('aadhaar_vid')
/** PAN: AAAAA9999A, 4th letter one of A B C F G H J L P T. */
export const detectPan = detector('pan')
/** 9–18 digits near "A/c", "Account", "Acc No" or "खाता". */
export const detectBankAccount = detector('bank_account')
/** IFSC: 4 letters, 0, then 6 letters or digits. */
export const detectIfsc = detector('ifsc')
/** Indian mobile: 10 digits starting 6–9, optionally +91 / 91 / 0 in front. */
export const detectPhone = detector('phone')
export const detectEmail = detector('email')
/** A date (or birth year) near "DOB", "Date of Birth", "Year of Birth" or "जन्म तिथि". */
export const detectDob = detector('dob')

/** Runs every detector and removes overlapping matches. Results are in reading order. */
export function detectAll(words: OcrWord[]): Detection[] {
  const doc = analyse(words)
  return resolve(Object.values(finders).flatMap((find) => find(doc)))
}
