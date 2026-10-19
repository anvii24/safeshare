// State and rules for the review screen: which areas will be hidden, custom
// boxes the user drew, undo, and the masking style. Pure, so it's easy to test.
import { DETECTION_LABELS, type Detection, type DetectionType } from './detectors'
import type { BBox } from './ocr'

export type MaskStyle = 'hide_all' | 'keep_last_4'

export interface ReviewItem {
  id: string
  /** null for an area the user drew themselves. */
  type: DetectionType | null
  boxes: BBox[]
  /** OCR text of each box, same order as `boxes`. Empty for custom areas. */
  words: string[]
  /** Will this item be hidden? */
  enabled: boolean
}

interface Snapshot {
  items: ReviewItem[]
  style: MaskStyle
}

export interface ReviewState extends Snapshot {
  selectedId: string | null
  /** Where the selection was made, so the other view can scroll to it. */
  selectedFrom: 'image' | 'list' | null
  /** Earlier versions of items + style, newest last, for Undo. */
  past: Snapshot[]
  nextCustomId: number
}

export type ReviewAction =
  | { kind: 'init'; detections: Detection[] }
  | { kind: 'toggle'; id: string }
  | { kind: 'add_custom'; box: BBox }
  | { kind: 'remove'; id: string }
  | { kind: 'set_style'; style: MaskStyle }
  | { kind: 'select'; id: string | null; from: 'image' | 'list' }
  | { kind: 'undo' }

export function initReview(detections: Detection[]): ReviewState {
  return {
    items: detections.map((d, i) => ({ id: `d${i}`, type: d.type, boxes: d.boxes, words: d.words, enabled: true })),
    style: 'hide_all',
    selectedId: null,
    selectedFrom: null,
    past: [],
    nextCustomId: 1,
  }
}

/** Records the current items + style for Undo, then applies the change. */
function commit(state: ReviewState, change: Partial<Snapshot>): ReviewState {
  return { ...state, past: [...state.past, { items: state.items, style: state.style }], ...change }
}

export function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  switch (action.kind) {
    case 'init':
      return initReview(action.detections)

    case 'toggle':
      return commit(state, {
        items: state.items.map((it) => (it.id === action.id ? { ...it, enabled: !it.enabled } : it)),
      })

    case 'add_custom': {
      const id = `c${state.nextCustomId}`
      const item: ReviewItem = { id, type: null, boxes: [action.box], words: [], enabled: true }
      return {
        ...commit(state, { items: [...state.items, item] }),
        nextCustomId: state.nextCustomId + 1,
        selectedId: id,
        selectedFrom: 'image',
      }
    }

    case 'remove': {
      const next = commit(state, { items: state.items.filter((it) => it.id !== action.id) })
      return state.selectedId === action.id ? { ...next, selectedId: null, selectedFrom: null } : next
    }

    case 'set_style':
      return action.style === state.style ? state : commit(state, { style: action.style })

    case 'select':
      return { ...state, selectedId: action.id, selectedFrom: action.id ? action.from : null }

    case 'undo': {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      const stillThere = previous.items.some((it) => it.id === state.selectedId)
      return {
        ...state,
        ...previous,
        past: state.past.slice(0, -1),
        selectedId: stillThere ? state.selectedId : null,
        selectedFrom: stillThere ? state.selectedFrom : null,
      }
    }
  }
}

export const itemLabel = (item: ReviewItem) => (item.type ? DETECTION_LABELS[item.type] : 'Custom area')

/** Number types where "Keep last 4 digits" applies. Everything else is always fully hidden. */
export const LAST_4_TYPES: ReadonlySet<DetectionType> = new Set(['aadhaar', 'aadhaar_vid', 'bank_account', 'phone'])

export const keepsLast4 = (item: ReviewItem, style: MaskStyle) =>
  style === 'keep_last_4' && item.type !== null && LAST_4_TYPES.has(item.type)

export function itemStatus(item: ReviewItem, style: MaskStyle): string {
  // A QR code's risk isn't obvious from looking at it, so say what it holds.
  if (item.type === 'qr_code') return item.enabled ? 'contains personal data' : 'visible, contains personal data'
  if (!item.enabled) return 'visible'
  return keepsLast4(item, style) ? 'last 4 digits shown' : 'hidden'
}

// ---------------------------------------------------------------------------
// Mask rectangles
// ---------------------------------------------------------------------------

/** Extra cover around each word box, in image pixels, so character edges don't peek out. */
export const MASK_PAD = 4

// Characters that count as digits when finding the last 4 (OCR look-alikes included).
const DIGITISH = /[0-9OoIl|SB]/

const pad = (b: BBox): BBox => ({ x0: b.x0 - MASK_PAD, y0: b.y0 - MASK_PAD, x1: b.x1 + MASK_PAD, y1: b.y1 + MASK_PAD })

/**
 * The rectangles to paint over for one item. With "keep last 4", the last 4
 * digits are left uncovered. OCR gives boxes per word, not per character, so
 * the cut inside a word is estimated from character widths and errs towards
 * covering slightly more.
 */
export function maskRects(item: ReviewItem, style: MaskStyle): BBox[] {
  if (!item.enabled) return []
  if (!keepsLast4(item, style)) return item.boxes.map(pad)

  const digitCount = item.words.join('').split('').filter((c) => DIGITISH.test(c)).length
  // Too few digits to safely show 4 of them: hide the lot.
  if (digitCount < 8 || item.words.length !== item.boxes.length) return item.boxes.map(pad)

  const rects: BBox[] = []
  let toKeep = 4
  for (let i = item.boxes.length - 1; i >= 0; i--) {
    const box = item.boxes[i]
    const chars = [...item.words[i]]
    if (toKeep === 0) {
      rects.push(pad(box))
      continue
    }
    const digitsHere = chars.filter((c) => DIGITISH.test(c)).length
    if (digitsHere < toKeep) {
      toKeep -= digitsHere // the whole word stays visible
      continue
    }
    // Walk back from the end of the word to the first character we keep.
    let cut = chars.length
    while (toKeep > 0) {
      cut--
      if (DIGITISH.test(chars[cut])) toKeep--
    }
    if (cut > 0) {
      const charWidth = (box.x1 - box.x0) / chars.length
      // Cover a sliver of the first kept digit rather than reveal part of the one before it.
      rects.push({ ...pad(box), x1: box.x0 + (cut + 0.15) * charWidth })
    }
  }
  return rects.reverse()
}

/** Every rectangle to paint over, for all items that are switched on. */
export const maskPlan = (state: Pick<ReviewState, 'items' | 'style'>): BBox[] =>
  state.items.flatMap((it) => maskRects(it, state.style))
