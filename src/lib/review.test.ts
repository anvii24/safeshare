import { describe, expect, it } from 'vitest'
import { fakeAadhaar, groupDigits, ocrWords, seededRandom } from '../test/fakes'
import { detectAll } from './detectors'
import { initReview, MASK_PAD, maskPlan, maskRects, reviewReducer, type ReviewAction, type ReviewState } from './review'

const aadhaar = fakeAadhaar(seededRandom(21))
// Words are 20px per character, 30px tall (see ocrWords).
const card = () => initReview(detectAll(ocrWords(groupDigits(aadhaar), 'PAN: ABCPK1234F')))
const run = (state: ReviewState, ...actions: ReviewAction[]) => actions.reduce(reviewReducer, state)

describe('review state', () => {
  it('starts with every detected item switched on', () => {
    const s = card()
    expect(s.items.map((i) => [i.type, i.enabled])).toEqual([
      ['aadhaar', true],
      ['pan', true],
    ])
    expect(s.style).toBe('hide_all')
  })

  it('toggles an item off and on', () => {
    const s = card()
    const off = run(s, { kind: 'toggle', id: s.items[0].id })
    expect(off.items[0].enabled).toBe(false)
    expect(run(off, { kind: 'toggle', id: s.items[0].id }).items[0].enabled).toBe(true)
  })

  it('adds custom areas, selects them, and can remove them', () => {
    const box = { x0: 10, y0: 10, x1: 100, y1: 60 }
    const s = run(card(), { kind: 'add_custom', box }, { kind: 'add_custom', box })
    const custom = s.items.filter((i) => i.type === null)
    expect(custom.map((i) => i.id)).toEqual(['c1', 'c2'])
    expect(s.selectedId).toBe('c2')

    const removed = run(s, { kind: 'remove', id: 'c2' })
    expect(removed.items.map((i) => i.id)).not.toContain('c2')
    expect(removed.selectedId).toBeNull()
  })

  it('undoes toggles, additions, removals and style changes, newest first', () => {
    const start = card()
    const s = run(
      start,
      { kind: 'toggle', id: 'd0' },
      { kind: 'add_custom', box: { x0: 0, y0: 0, x1: 50, y1: 50 } },
      { kind: 'set_style', style: 'keep_last_4' },
      { kind: 'remove', id: 'd1' },
    )
    const u1 = run(s, { kind: 'undo' })
    expect(u1.items.map((i) => i.id)).toEqual(['d0', 'd1', 'c1'])
    const u2 = run(u1, { kind: 'undo' })
    expect(u2.style).toBe('hide_all')
    const u3 = run(u2, { kind: 'undo' })
    expect(u3.items.map((i) => i.id)).toEqual(['d0', 'd1'])
    const u4 = run(u3, { kind: 'undo' })
    expect(u4.items).toEqual(start.items)
    expect(run(u4, { kind: 'undo' })).toBe(u4) // nothing left to undo
  })

  it('does not record selection in the undo history', () => {
    const s = run(card(), { kind: 'select', id: 'd1', from: 'list' })
    expect(s.past).toHaveLength(0)
    expect(s.selectedFrom).toBe('list')
  })

  it('does not record choosing the style that is already set', () => {
    expect(run(card(), { kind: 'set_style', style: 'hide_all' }).past).toHaveLength(0)
  })

  it('clears the selection when undo removes the selected custom area', () => {
    const s = run(card(), { kind: 'add_custom', box: { x0: 0, y0: 0, x1: 50, y1: 50 } }, { kind: 'undo' })
    expect(s.selectedId).toBeNull()
  })
})

describe('maskRects', () => {
  it('"Hide all" covers every word, padded', () => {
    const [item] = card().items
    const rects = maskRects(item, 'hide_all')
    expect(rects).toHaveLength(3)
    expect(rects[0]).toEqual({ x0: -MASK_PAD, y0: -MASK_PAD, x1: 80 + MASK_PAD, y1: 30 + MASK_PAD })
  })

  it('"Keep last 4" leaves the last 4-digit group of an Aadhaar uncovered', () => {
    const [item] = card().items // "1234 5678 9012" → words at x 0–80, 100–180, 200–280
    const rects = maskRects(item, 'keep_last_4')
    expect(rects).toHaveLength(2)
    expect(rects.every((r) => r.x1 <= 180 + MASK_PAD)).toBe(true)
  })

  it('"Keep last 4" cuts inside a word when the last group is longer than 4', () => {
    const [item] = initReview(detectAll(ocrWords('Mobile: +91 98765 43210'))).items
    const rects = maskRects(item, 'keep_last_4')
    // "+91", "98765" fully covered; first character of "43210" covered.
    expect(rects).toHaveLength(3)
    const last = rects[2]
    const wordStart = 'Mobile: +91 98765 '.length * 20
    expect(last.x0).toBe(wordStart - MASK_PAD)
    expect(last.x1).toBeGreaterThan(wordStart + 20) // past the "4"
    expect(last.x1).toBeLessThan(wordStart + 40) // but not over the "3"
  })

  it('"Keep last 4" cuts a single-word number', () => {
    const [item] = initReview(detectAll(ocrWords('A/c No: 123456789012345'))).items
    const [rect] = maskRects(item, 'keep_last_4')
    const wordStart = 'A/c No: '.length * 20
    expect(rect.x1).toBeCloseTo(wordStart + 11.15 * 20)
  })

  it('always fully hides PAN, email, dates and custom areas', () => {
    const s = run(
      initReview(detectAll(ocrWords('PAN: ABCPK1234F', 'Email: a.b@example.com', 'DOB: 14/08/1992'))),
      { kind: 'add_custom', box: { x0: 0, y0: 0, x1: 50, y1: 50 } },
    )
    for (const item of s.items) expect(maskRects(item, 'keep_last_4')).toEqual(maskRects(item, 'hide_all'))
  })

  it('covers nothing for items that are switched off', () => {
    const s = run(card(), { kind: 'toggle', id: 'd0' })
    expect(maskRects(s.items[0], 'hide_all')).toEqual([])
    expect(maskPlan(s)).toHaveLength(1) // only the PAN
  })
})
