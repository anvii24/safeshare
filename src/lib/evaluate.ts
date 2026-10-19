// Scores detections against what a test image is known to contain
// (tests/expected.json). Used by scripts/eval.mjs.
//
// - An expected item is CAUGHT if any detection has the same value, whatever
//   label it got: the box covers it either way. A wrong label is counted
//   separately as "mislabelled".
// - A detection that matches no expected item is a FALSE ALARM: a box on
//   harmless text.
import type { DetectionType } from './detectors'

export interface ExpectedItem {
  type: DetectionType
  /** The value as printed. Not needed for qr_code. */
  value?: string
}

export interface FoundItem {
  type: DetectionType
  text: string
  boxes: number
}

export interface ImageScore {
  present: number
  caught: ExpectedItem[]
  missed: ExpectedItem[]
  mislabelled: { expected: ExpectedItem; foundAs: DetectionType }[]
  falseAlarms: FoundItem[]
}

/** Comparable form of a value for a given type: digits only for numbers, etc. */
export function normalizeValue(type: DetectionType, value: string): string {
  switch (type) {
    case 'phone':
      return value.replace(/\D/g, '').slice(-10) // ignore +91 / 0 prefixes
    case 'aadhaar':
    case 'aadhaar_vid':
    case 'bank_account':
    case 'dob':
      return value.replace(/\D/g, '')
    case 'email':
      return value.trim().toLowerCase()
    default:
      return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  }
}

/** Levenshtein distance, for allowing one misread character in long values. */
function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = temp
    }
  }
  return row[b.length]
}

/**
 * Same value? Allows one misread character in values of 8+ characters: the
 * box still lands on the right number, which is what matters for privacy.
 */
function sameValue(expected: ExpectedItem, found: FoundItem): boolean {
  if (expected.type === 'qr_code' || found.type === 'qr_code') return expected.type === found.type
  const a = normalizeValue(expected.type, expected.value ?? '')
  const b = normalizeValue(expected.type, found.text)
  if (!a || !b) return false
  return a === b || (a.length >= 8 && editDistance(a, b) <= 1)
}

export function scoreImage(expected: ExpectedItem[], found: FoundItem[]): ImageScore {
  const unused = [...found]
  const score: ImageScore = { present: expected.length, caught: [], missed: [], mislabelled: [], falseAlarms: [] }

  for (const item of expected) {
    // Prefer a detection with the right label, then any that covers the value.
    const index = [
      unused.findIndex((f) => f.type === item.type && sameValue(item, f)),
      unused.findIndex((f) => sameValue(item, f)),
    ].find((i) => i >= 0)
    if (index === undefined) {
      score.missed.push(item)
      continue
    }
    const [match] = unused.splice(index, 1)
    score.caught.push(item)
    if (match.type !== item.type) score.mislabelled.push({ expected: item, foundAs: match.type })
  }
  score.falseAlarms = unused
  return score
}

/** "aadhaar ••••0627": enough to recognise a miss without writing the full value to results.md. */
export function maskValue(item: ExpectedItem): string {
  if (!item.value) return item.type
  const clean = item.value.replace(/\s/g, '')
  return `${item.type} ${clean.length > 4 ? '••••' + clean.slice(-4) : clean}`
}
