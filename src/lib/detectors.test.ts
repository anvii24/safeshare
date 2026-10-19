// All numbers here are made up. Aadhaar numbers come from fakeAadhaar().
import { describe, expect, it } from 'vitest'
import { breakChecksum, fakeAadhaar, groupDigits, ocrWords, seededRandom } from '../test/fakes'
import {
  detectAadhaar,
  detectAadhaarVid,
  detectAll,
  detectBankAccount,
  detectDob,
  detectEmail,
  detectIfsc,
  detectPan,
  detectPhone,
  fixNumberLike,
  verhoeffCheckDigit,
  verhoeffValid,
  type Detection,
} from './detectors'

const texts = (ds: Detection[]) => ds.map((d) => d.text)
const types = (ds: Detection[]) => ds.map((d) => d.type)

/** A 12-digit, Verhoeff-valid number built from an 11-digit body. */
const withCheck = (body: string) => body + verhoeffCheckDigit(body)

describe('Verhoeff', () => {
  it('matches the published example (236 → 2363)', () => {
    expect(verhoeffCheckDigit('236')).toBe('3')
    expect(verhoeffValid('2363')).toBe(true)
    expect(verhoeffValid('2364')).toBe(false)
  })

  it('catches every single-digit typo', () => {
    const rand = seededRandom(7)
    for (let n = 0; n < 20; n++) {
      const valid = fakeAadhaar(rand)
      for (let pos = 0; pos < 12; pos++) {
        for (let d = 0; d < 10; d++) {
          if (String(d) === valid[pos]) continue
          expect(verhoeffValid(valid.slice(0, pos) + d + valid.slice(pos + 1))).toBe(false)
        }
      }
    }
  })
})

describe('fakeAadhaar helper', () => {
  it('makes 12-digit numbers starting 2–9 that pass Verhoeff', () => {
    const rand = seededRandom(1)
    for (let i = 0; i < 200; i++) {
      const n = fakeAadhaar(rand)
      expect(n).toMatch(/^[2-9]\d{11}$/)
      expect(verhoeffValid(n)).toBe(true)
      expect(verhoeffValid(breakChecksum(n))).toBe(false)
    }
  })
})

describe('fixNumberLike', () => {
  it('fixes OCR look-alikes inside number-like words', () => {
    expect(fixNumberLike('l2O4')).toBe('1204')
    expect(fixNumberLike('98B5S')).toBe('98855')
    expect(fixNumberLike('I2/O3/1990')).toBe('12/03/1990')
  })

  it('leaves real words alone', () => {
    expect(fixNumberLike('SOS')).toBeNull()
    expect(fixNumberLike('BOIL')).toBeNull()
    expect(fixNumberLike('Hello')).toBeNull()
  })
})

describe('detectAadhaar', () => {
  const rand = seededRandom(42)
  const aadhaar = fakeAadhaar(rand)

  it('finds a number split across three words', () => {
    const found = detectAadhaar(ocrWords(`Aadhaar No: ${groupDigits(aadhaar)}`))
    expect(texts(found)).toEqual([aadhaar])
    expect(found[0].boxes).toHaveLength(3)
  })

  it('finds a number written as one word or with dashes', () => {
    expect(texts(detectAadhaar(ocrWords(aadhaar)))).toEqual([aadhaar])
    expect(texts(detectAadhaar(ocrWords(groupDigits(aadhaar).replace(/ /g, '-'))))).toEqual([aadhaar])
    expect(texts(detectAadhaar(ocrWords(groupDigits(aadhaar).replace(/ /g, ' - '))))).toEqual([aadhaar])
  })

  it('fixes OCR look-alikes (O→0, l→1, S→5, B→8)', () => {
    const n = withCheck('20518150801') // 2051 8150 801?
    const garbled = `2O5l 81S0 B0${n.slice(10)}`
    expect(texts(detectAadhaar(ocrWords(garbled)))).toEqual([n])
  })

  it('does not "fix" words that are mostly letters', () => {
    const n = withCheck('20518150801')
    expect(detectAadhaar(ocrWords(`2OSl BlSO ${n.slice(8)}`))).toEqual([])
  })

  it('rejects a number that fails the checksum', () => {
    expect(detectAadhaar(ocrWords(groupDigits(breakChecksum(aadhaar))))).toEqual([])
  })

  it('rejects numbers starting with 0 or 1', () => {
    expect(detectAadhaar(ocrWords(groupDigits(withCheck('03456789012'))))).toEqual([])
    expect(detectAadhaar(ocrWords(groupDigits(withCheck('13456789012'))))).toEqual([])
  })

  it('does not join numbers from separate columns', () => {
    const [a, b, c] = groupDigits(aadhaar).split(' ')
    expect(detectAadhaar(ocrWords(`${a} ${b}          ${c}`))).toEqual([])
  })

  it('does not join numbers across lines', () => {
    const [a, b, c] = groupDigits(aadhaar).split(' ')
    expect(detectAadhaar(ocrWords(`${a} ${b}`, c))).toEqual([])
  })
})

describe('detectAadhaarVid', () => {
  const vid = '9123456789012345'

  it('finds a 16-digit VID after "VID"', () => {
    const found = detectAadhaarVid(ocrWords(`VID : ${groupDigits(vid)}`))
    expect(texts(found)).toEqual([vid])
    expect(found[0].boxes).toHaveLength(4)
  })

  it('finds a VID when the label is on the line above', () => {
    expect(texts(detectAadhaarVid(ocrWords('Your VID', groupDigits(vid))))).toEqual([vid])
  })

  it('ignores 16 digits with no "VID" nearby', () => {
    expect(detectAadhaarVid(ocrWords(`Card ${groupDigits(vid)}`))).toEqual([])
  })

  it('wins over an Aadhaar-valid piece of the same VID in detectAll', () => {
    const tricky = fakeAadhaar(seededRandom(3)) + '4567' // first 12 digits pass Verhoeff
    const found = detectAll(ocrWords(`VID: ${groupDigits(tricky)}`))
    expect(types(found)).toEqual(['aadhaar_vid'])
    expect(found[0].boxes).toHaveLength(4)
  })
})

describe('detectPan', () => {
  it('finds a PAN on its own or after a label', () => {
    expect(texts(detectPan(ocrWords('ABCPE1234F')))).toEqual(['ABCPE1234F'])
    expect(texts(detectPan(ocrWords('PAN: ABCPE1234F')))).toEqual(['ABCPE1234F'])
    expect(texts(detectPan(ocrWords('PAN:ABCPE1234F')))).toEqual(['ABCPE1234F'])
  })

  it('accepts every allowed 4th letter', () => {
    for (const c of 'ABCFGHJLPT') expect(texts(detectPan(ocrWords(`XYZ${c}K9876Q`)))).toEqual([`XYZ${c}K9876Q`])
  })

  it('rejects other 4th letters', () => {
    for (const c of 'DEIKMNOQRSUVWXYZ') expect(detectPan(ocrWords(`XYZ${c}K9876Q`))).toEqual([])
  })

  it('fixes OCR look-alikes in the digit and letter parts', () => {
    expect(texts(detectPan(ocrWords('ABCPE1O34F')))).toEqual(['ABCPE1034F'])
    expect(texts(detectPan(ocrWords('ABCPEl2S4F')))).toEqual(['ABCPE1254F'])
    expect(texts(detectPan(ocrWords('A8CPE1234F')))).toEqual(['ABCPE1234F'])
  })

  it('does not turn a plain number into a PAN', () => {
    expect(detectPan(ocrWords('5858812345'))).toEqual([])
  })
})

describe('detectBankAccount', () => {
  it('finds digits after "A/c No"', () => {
    const found = detectBankAccount(ocrWords('A/c No: 123456789012345'))
    expect(texts(found)).toEqual(['123456789012345'])
    expect(found[0].boxes).toHaveLength(1)
  })

  it('recognises each keyword', () => {
    for (const label of ['A/c', 'A/C No.', 'Account Number', 'Savings Account:', 'Acc No', 'खाता संख्या']) {
      expect(texts(detectBankAccount(ocrWords(`${label} 50100234567`)))).toEqual(['50100234567'])
    }
  })

  it('finds a number on the line below its label', () => {
    expect(texts(detectBankAccount(ocrWords('Account Number', '1234 5678 9012 3456')))).toEqual(['1234567890123456'])
  })

  it('accepts 9 to 18 digits only', () => {
    expect(texts(detectBankAccount(ocrWords('A/c 123456789')))).toEqual(['123456789'])
    expect(texts(detectBankAccount(ocrWords('A/c 123456789012345678')))).toEqual(['123456789012345678'])
    expect(detectBankAccount(ocrWords('A/c 12345678'))).toEqual([])
    expect(detectBankAccount(ocrWords('A/c 1234567890123456789'))).toEqual([])
  })

  it('only claims the first number after the keyword', () => {
    expect(texts(detectBankAccount(ocrWords('A/c No: 123456789012345 Ref 987654321098')))).toEqual(['123456789012345'])
  })

  it('does not claim a number that comes before the keyword', () => {
    expect(detectBankAccount(ocrWords('123456789012345', 'A/c No: pending'))).toEqual([])
  })

  it('ignores long numbers with no account keyword nearby', () => {
    expect(detectBankAccount(ocrWords('Ref 123456789012345'))).toEqual([])
    expect(detectBankAccount(ocrWords('Account holder name is printed on the front 123456789012345'))).toEqual([])
  })
})

describe('detectIfsc', () => {
  it('finds an IFSC code', () => {
    expect(texts(detectIfsc(ocrWords('IFSC: ABCD0123456')))).toEqual(['ABCD0123456'])
    expect(texts(detectIfsc(ocrWords('IFSC:WXYZ0AB12CD')))).toEqual(['WXYZ0AB12CD'])
  })

  it('fixes an O read in place of the 0', () => {
    expect(texts(detectIfsc(ocrWords('ABCDO123456')))).toEqual(['ABCD0123456'])
  })

  it('rejects codes without a 0 in the 5th place', () => {
    expect(detectIfsc(ocrWords('ABCD1123456'))).toEqual([])
    expect(detectIfsc(ocrWords('ABCDE123456'))).toEqual([])
  })
})

describe('detectPhone', () => {
  it('finds 10-digit mobiles in common formats', () => {
    for (const s of ['98765 43210', '9876543210', 'Mobile: 98765 43210', 'Ph:9876543210']) {
      expect(detectPhone(ocrWords(s)).map((d) => d.text.slice(-10))).toEqual(['9876543210'])
    }
  })

  it('includes a +91 or 0 prefix in the covered words', () => {
    const found = detectPhone(ocrWords('Mobile +91 98765 43210'))
    expect(texts(found)).toEqual(['919876543210'])
    expect(found[0].boxes).toHaveLength(3)
    expect(texts(detectPhone(ocrWords('+91-9876543210')))).toEqual(['919876543210'])
    expect(texts(detectPhone(ocrWords('09876543210')))).toEqual(['09876543210'])
  })

  it('fixes OCR look-alikes', () => {
    expect(texts(detectPhone(ocrWords('98765 432lO')))).toEqual(['9876543210'])
  })

  it('rejects numbers that are not Indian mobiles', () => {
    expect(detectPhone(ocrWords('5876543210'))).toEqual([])
    expect(detectPhone(ocrWords('987654321'))).toEqual([])
    expect(detectPhone(ocrWords('+1 2025550123'))).toEqual([])
  })
})

describe('detectEmail', () => {
  it('finds an email after a label, covering only the address', () => {
    for (const s of ['Email: test.user@example.com', 'Email test.user@example.com']) {
      const found = detectEmail(ocrWords(s))
      expect(texts(found)).toEqual(['test.user@example.com'])
      expect(found[0].boxes).toHaveLength(1)
    }
  })

  it('joins an address OCR split into two words', () => {
    const found = detectEmail(ocrWords('test.user@ example.co.in'))
    expect(texts(found)).toEqual(['test.user@example.co.in'])
    expect(found[0].boxes).toHaveLength(2)
  })

  it('rejects things that are not emails', () => {
    expect(detectEmail(ocrWords('user@ and more'))).toEqual([])
    expect(detectEmail(ocrWords('@handle'))).toEqual([])
  })
})

describe('detectDob', () => {
  it('finds a date after each keyword', () => {
    for (const label of ['DOB:', 'D.O.B.', 'Date of Birth', 'जन्म तिथि/DOB:', 'जन्म तिथि']) {
      expect(texts(detectDob(ocrWords(`${label} 14/08/1992`)))).toEqual(['14/08/1992'])
    }
  })

  it('accepts - and . separators and a birth year on its own', () => {
    expect(texts(detectDob(ocrWords('DOB 14-08-1992')))).toEqual(['14-08-1992'])
    expect(texts(detectDob(ocrWords('DOB 14.08.1992')))).toEqual(['14.08.1992'])
    expect(texts(detectDob(ocrWords('Year of Birth : 1985')))).toEqual(['1985'])
  })

  it('joins a date OCR split into several words', () => {
    const found = detectDob(ocrWords('DOB: 14 / 08 / 1992'))
    expect(texts(found)).toEqual(['14/08/1992'])
    expect(found[0].boxes).toHaveLength(5)
  })

  it('fixes OCR look-alikes', () => {
    expect(texts(detectDob(ocrWords('DOB: l4/O8/1992')))).toEqual(['14/08/1992'])
  })

  it('ignores dates with no birth keyword nearby', () => {
    expect(detectDob(ocrWords('Issue Date: 14/08/2020'))).toEqual([])
  })

  it('rejects impossible dates', () => {
    expect(detectDob(ocrWords('DOB: 45/13/1992'))).toEqual([])
  })
})

describe('detectAll', () => {
  it('finds everything on a fake Aadhaar card, in reading order', () => {
    const aadhaar = fakeAadhaar(seededRandom(11))
    const found = detectAll(
      ocrWords(
        'GOVERNMENT OF INDIA',
        'Asha Verma',
        'जन्म तिथि/DOB: 14/08/1992',
        'FEMALE / महिला',
        groupDigits(aadhaar),
        'VID : 9123 4567 8901 2345',
        'Mobile: 98765 43210',
      ),
    )
    expect(types(found)).toEqual(['dob', 'aadhaar', 'aadhaar_vid', 'phone'])
    expect(found[1].text).toBe(aadhaar)
  })

  it('finds everything on a fake bank passbook', () => {
    const found = detectAll(
      ocrWords(
        'Customer Name: R Kumar',
        'A/c No: 123456789012345',
        'IFSC: ABCD0123456',
        'Email: r.kumar@example.com',
        'PAN: ABCPK1234F',
      ),
    )
    expect(types(found)).toEqual(['bank_account', 'ifsc', 'email', 'pan'])
  })

  it('labels an Aadhaar number correctly when "A/c No" is on the next line', () => {
    const aadhaar = fakeAadhaar(seededRandom(9))
    const found = detectAll(ocrWords('Mobile: +91 98765 43210', groupDigits(aadhaar), 'A/c No: 123456789012345'))
    expect(types(found)).toEqual(['phone', 'aadhaar', 'bank_account'])
  })

  it('never covers the same word twice', () => {
    const aadhaar = fakeAadhaar(seededRandom(5))
    const found = detectAll(ocrWords(`A/c No: ${groupDigits(aadhaar)}`, 'Mobile +91 98765 43210'))
    expect(types(found)).toEqual(['bank_account', 'phone'])
    const boxes = found.flatMap((d) => d.boxes)
    expect(new Set(boxes).size).toBe(boxes.length)
  })

  it('finds nothing in ordinary text', () => {
    expect(detectAll(ocrWords('This is an ordinary sentence with no numbers', 'Page 2 of 10'))).toEqual([])
  })
})

describe('Hindi text', () => {
  it('reads Devanagari digits as ordinary digits', () => {
    expect(texts(detectBankAccount(ocrWords('खाता संख्या ५०१००२३४५६७')))).toEqual(['50100234567'])
    expect(texts(detectDob(ocrWords('जन्म तिथि/DOB: १४/०८/१९९२')))).toEqual(['14/08/1992'])
    expect(texts(detectPhone(ocrWords('मोबाइल ९८७६५ ४३२१०')))).toEqual(['9876543210'])
  })

  it('finds a birth year after "जन्म वर्ष"', () => {
    expect(texts(detectDob(ocrWords('जन्म वर्ष / Year of Birth : 1985')))).toEqual(['1985'])
  })

  it('handles a Hindi keyword split from its English partner', () => {
    expect(texts(detectDob(ocrWords('जन्म तिथि', 'DOB : 14/08/1992')))).toEqual(['14/08/1992'])
  })
})

describe('OCR misreads in labels', () => {
  it('finds a date when "DOB" was misread and the Hindi keyword is the only clue', () => {
    expect(texts(detectDob(ocrWords('जन्म तिथि/008: 14/08/1992')))).toEqual(['14/08/1992'])
  })

  it('accepts D0B and DO8 as DOB', () => {
    expect(texts(detectDob(ocrWords('D0B: 14/08/1992')))).toEqual(['14/08/1992'])
    expect(texts(detectDob(ocrWords('DO8 14/08/1992')))).toEqual(['14/08/1992'])
  })

  it('still lets a label claim only the first number after it', () => {
    expect(texts(detectBankAccount(ocrWords('A/c No: 123456789012345 Ref 987654321098')))).toEqual(['123456789012345'])
  })
})
