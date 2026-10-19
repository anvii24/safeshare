import { describe, expect, it } from 'vitest'
import { maskValue, normalizeValue, scoreImage, type FoundItem } from './evaluate'

const found = (type: FoundItem['type'], text: string): FoundItem => ({ type, text, boxes: 1 })

describe('normalizeValue', () => {
  it('compares numbers by digits, phones by their last 10 digits', () => {
    expect(normalizeValue('aadhaar', '2734 8159 0627')).toBe('273481590627')
    expect(normalizeValue('phone', '+91 98765 43210')).toBe('9876543210')
    expect(normalizeValue('dob', '14/08/1992')).toBe('14081992')
    expect(normalizeValue('pan', 'abcpk 1234f')).toBe('ABCPK1234F')
  })
})

describe('scoreImage', () => {
  it('counts caught, missed and false alarms', () => {
    const s = scoreImage(
      [
        { type: 'aadhaar', value: '2734 8159 0627' },
        { type: 'pan', value: 'ABCPK1234F' },
      ],
      [found('aadhaar', '273481590627'), found('phone', '9876543210')],
    )
    expect(s.caught).toHaveLength(1)
    expect(s.missed).toEqual([{ type: 'pan', value: 'ABCPK1234F' }])
    expect(s.falseAlarms.map((f) => f.type)).toEqual(['phone'])
  })

  it('counts an item found under another label as caught, and mislabelled', () => {
    const s = scoreImage([{ type: 'bank_account', value: '9876543210' }], [found('phone', '9876543210')])
    expect(s.caught).toHaveLength(1)
    expect(s.mislabelled).toEqual([{ expected: { type: 'bank_account', value: '9876543210' }, foundAs: 'phone' }])
    expect(s.falseAlarms).toEqual([])
  })

  it('allows one misread character in long values only', () => {
    expect(scoreImage([{ type: 'phone', value: '98765 43210' }], [found('phone', '9876543270')]).caught).toHaveLength(1)
    expect(scoreImage([{ type: 'dob', value: '1990' }], [found('dob', '1996')]).caught).toHaveLength(0)
  })

  it('matches QR codes by count', () => {
    const s = scoreImage([{ type: 'qr_code' }], [found('qr_code', ''), found('qr_code', '')])
    expect(s.caught).toHaveLength(1)
    expect(s.falseAlarms).toHaveLength(1)
  })

  it('uses each detection for one expected item only', () => {
    const s = scoreImage(
      [
        { type: 'phone', value: '9876543210' },
        { type: 'phone', value: '9876543210' },
      ],
      [found('phone', '9876543210')],
    )
    expect(s.caught).toHaveLength(1)
    expect(s.missed).toHaveLength(1)
  })
})

describe('maskValue', () => {
  it('shows only the last 4 characters', () => {
    expect(maskValue({ type: 'aadhaar', value: '2734 8159 0627' })).toBe('aadhaar ••••0627')
    expect(maskValue({ type: 'qr_code' })).toBe('qr_code')
  })
})
