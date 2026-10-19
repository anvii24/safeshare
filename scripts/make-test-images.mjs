// Generates the synthetic test documents in tests/images/ (synthetic-*.jpg)
// and their entries in tests/expected.json. Every name and number is made up;
// each image is marked "SPECIMEN – TEST DATA". Your own test images and their
// entries in expected.json are left alone.
//
//   npm run make-test-images
//
// Rendering uses the system's fonts (Devanagari needs e.g. Nirmala UI on
// Windows or Noto Sans Devanagari on Linux), so regenerated images can differ
// slightly between machines. The committed images are the reference set.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import QRCode from 'qrcode'
import { verhoeffCheckDigit } from '../src/lib/detectors.ts'
import { findChrome } from './lib/chrome.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const imagesDir = join(root, 'tests', 'images')
const expectedPath = join(root, 'tests', 'expected.json')

// --- Made-up data -------------------------------------------------------------
const aadhaar = (body) => body + verhoeffCheckDigit(body) // valid checksum, not a real number
const group = (digits, size = 4) => digits.match(new RegExp(`.{1,${size}}`, 'g')).join(' ')

const PEOPLE = {
  asha: {
    nameEn: 'Asha Verma', nameHi: 'आशा वर्मा', dob: '14/08/1992', aadhaar: aadhaar('27348159062'),
    vid: '9123456789012345', phone: '98765 43210',
    address: ['C/O Rakesh Verma, 12 Example Road', 'Sample Nagar, Bengaluru', 'Karnataka - 560001'],
  },
  ravi: {
    nameEn: 'Ravi Kumar', dob: '03/11/1985', pan: 'ABCPK1234F', account: '50100234567891', ifsc: 'EXMP0001234',
    phone: '+91 98450 12345', email: 'ravi.kumar@example.com', aadhaar: aadhaar('45678912345'),
  },
  meena: {
    nameEn: 'Meena Iyer', pan: 'AAKPI5678Q', aadhaar: aadhaar('83920174650'), phone: '070221 98765',
    email: 'meena.iyer@example.org', dob: '22/02/1979', account: '012345678901', ifsc: 'SMPL0004567',
  },
}
const qrData = (p) => `SPECIMEN TEST DATA|${p.nameEn}|${p.dob}|12 Example Road|${'x'.repeat(200)}`

// --- Page templates -------------------------------------------------------------
// Single quotes inside: this goes into a double-quoted style attribute.
const FONT = `font-family: Arial, 'Nirmala UI', 'Noto Sans Devanagari', Mangal, sans-serif;`
const specimen = `<div style="position:absolute;right:16px;bottom:10px;font-size:13px;color:#b91c1c;letter-spacing:1px">SPECIMEN – TEST DATA</div>`

const page = (w, h, body, style = '') =>
  `<div id="doc" style="position:relative;width:${w}px;height:${h}px;background:#fff;color:#111;${FONT}${style}">${body}${specimen}</div>`

async function aadhaarFront(p) {
  const qr = await QRCode.toDataURL(qrData(p), { margin: 1, scale: 4 })
  return page(900, 560, `
    <div style="background:#f97316;height:14px"></div>
    <div style="padding:18px 28px;font-size:22px;font-weight:bold;display:flex;justify-content:space-between">
      <span>भारत सरकार</span><span>GOVERNMENT OF INDIA</span></div>
    <div style="display:flex;padding:0 28px;gap:24px">
      <div style="width:150px;height:180px;background:#d6d3d1;border-radius:6px"></div>
      <div style="flex:1;font-size:22px;line-height:1.75">
        <div>${p.nameHi}</div><div>${p.nameEn}</div>
        <div>जन्म तिथि/DOB: ${p.dob}</div><div>महिला/ FEMALE</div></div>
      <img src="${qr}" style="width:170px;height:170px"></div>
    <div style="text-align:center;font-size:36px;font-weight:bold;letter-spacing:4px;margin-top:26px">${group(p.aadhaar)}</div>
    <div style="text-align:center;font-size:18px;margin-top:6px">VID : ${group(p.vid)}</div>
    <div style="position:absolute;left:0;right:0;bottom:30px;border-top:3px solid #dc2626;text-align:center;padding-top:6px;font-size:20px">मेरा आधार, मेरी पहचान</div>`)
}

async function aadhaarBack(p) {
  const qr = await QRCode.toDataURL(qrData(p), { margin: 1, scale: 5 })
  return page(900, 560, `
    <div style="padding:24px 28px;display:flex;gap:24px">
      <div style="flex:1;font-size:19px;line-height:1.6">
        <div style="font-weight:bold">पता:</div><div>सी/ओ राकेश वर्मा, 12 एग्ज़ाम्पल रोड, बेंगलुरु</div>
        <div style="font-weight:bold;margin-top:10px">Address:</div>${p.address.map((l) => `<div>${l}</div>`).join('')}
      </div>
      <img src="${qr}" style="width:230px;height:230px"></div>
    <div style="text-align:center;font-size:34px;font-weight:bold;letter-spacing:4px;margin-top:6px">${group(p.aadhaar)}</div>
    <div style="text-align:center;font-size:18px;margin-top:6px">VID : ${group(p.vid)}</div>
    <div style="position:absolute;left:28px;right:28px;bottom:36px;display:flex;justify-content:space-between;font-size:17px">
      <span>1947</span><span>help@example.gov.in</span><span>www.example.gov.in</span></div>`)
}

const panCard = (p) =>
  page(860, 540, `
    <div style="padding:22px 30px;font-size:21px;font-weight:bold;display:flex;justify-content:space-between;color:#1e3a8a">
      <span>आयकर विभाग</span><span>INCOME TAX DEPARTMENT</span></div>
    <div style="padding:0 30px;font-size:21px;line-height:1.7">
      <div style="font-size:15px;color:#555">नाम / Name</div><div>${p.nameEn.toUpperCase()}</div>
      <div style="font-size:15px;color:#555">पिता का नाम / Father's Name</div><div>SURESH KUMAR</div>
      <div style="font-size:15px;color:#555">जन्म की तारीख / Date of Birth</div><div>${p.dob}</div>
      <div style="font-size:15px;color:#555;margin-top:6px">स्थायी लेखा संख्या कार्ड / Permanent Account Number Card</div>
      <div style="font-size:30px;font-weight:bold;letter-spacing:3px">${p.pan}</div></div>`, 'background:#e0f2fe')

const passbook = (p) =>
  page(1000, 700, `
    <div style="background:#0f766e;color:#fff;padding:18px 30px;font-size:26px;font-weight:bold">EXAMPLE BANK · Savings Passbook</div>
    <table style="margin:24px 30px;font-size:21px;border-collapse:collapse;line-height:2">
      <tr><td style="width:260px">Customer Name</td><td>: ${p.nameEn}</td></tr>
      <tr><td>Customer ID</td><td>: 87654321</td></tr>
      <tr><td>A/c No.</td><td>: ${p.account}</td></tr>
      <tr><td>IFSC Code</td><td>: ${p.ifsc}</td></tr>
      <tr><td>MICR Code</td><td>: 560240002</td></tr>
      <tr><td>Mobile</td><td>: ${p.phone}</td></tr>
      <tr><td>Email</td><td>: ${p.email}</td></tr>
      <tr><td>Branch</td><td>: MG Road, Bengaluru 560001</td></tr>
      <tr><td>Date of Opening</td><td>: 05/06/2019</td></tr>
    </table>`)

const statement = (p) =>
  page(1100, 820, `
    <div style="padding:22px 30px;font-size:24px;font-weight:bold">SAMPLE BANK · Account Statement</div>
    <div style="padding:0 30px;font-size:18px;line-height:1.8">
      <div>Account Holder: ${p.nameEn}</div><div>Account Number: ${p.account}</div>
      <div>IFSC: ${p.ifsc} &nbsp;&nbsp; Period: 01/09/2026 to 30/09/2026</div><div>Registered Mobile: ${p.phone}</div></div>
    <table style="margin:18px 30px;font-size:16px;border-collapse:collapse;width:1040px">
      <tr style="background:#f5f5f4;font-weight:bold"><td style="padding:8px">Date</td><td>Description</td><td>Ref No.</td><td style="text-align:right">Debit</td><td style="text-align:right;padding-right:8px">Balance</td></tr>
      ${[
        ['02/09/2026', 'UPI/Grocery Store', '412345678901', '1,250.00', '48,750.00'],
        ['05/09/2026', 'NEFT/Salary Credit', 'N248260045671', '', '1,23,750.00'],
        ['09/09/2026', 'Cheque 004512', '004512', '15,000.00', '1,08,750.00'],
        ['15/09/2026', 'ATM Withdrawal 9921', '626512340987', '5,000.00', '1,03,750.00'],
        ['21/09/2026', 'Electricity Bill CA 1100234567', '789012345678', '2,340.00', '1,01,410.00'],
      ].map((r) => `<tr style="border-top:1px solid #e7e5e4"><td style="padding:8px">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td style="text-align:right">${r[3]}</td><td style="text-align:right;padding-right:8px">${r[4]}</td></tr>`).join('')}
    </table>`)

const rentalLetter = (p, q) =>
  page(1000, 900, `
    <div style="padding:36px 44px;font-size:20px;line-height:1.75">
      <div style="font-weight:bold;font-size:24px;text-align:center;margin-bottom:18px">RENTAL AGREEMENT – TENANT DETAILS</div>
      <p>This agreement is made on 01/10/2026 between the owner, ${q.nameEn}, and the tenant, ${p.nameEn}, for flat no. 304, 12 Example Road, Bengaluru 560001.</p>
      <p>The tenant's Aadhaar No. is ${group(p.aadhaar)} and PAN is ${p.pan}. The tenant can be reached on ${p.phone} or at ${p.email}.</p>
      <p>Monthly rent: Rs. 18,500. Security deposit: Rs. 55,500, refundable within 30 days.</p>
      <p>Owner's bank details for rent: A/c ${q.account}, IFSC ${q.ifsc}.</p>
      <p style="margin-top:40px">Signed: ________________ &nbsp;&nbsp;&nbsp; Date: 01/10/2026</p></div>`)

const invoice = () =>
  page(1000, 760, `
    <div style="padding:30px 40px;font-size:19px;line-height:1.8">
      <div style="font-size:26px;font-weight:bold">TAX INVOICE</div>
      <div>Example Traders Pvt Ltd, 45 Market Street, Pune 411001</div>
      <div>GSTIN: 27AAACE1234F1Z5 &nbsp;&nbsp; Invoice No: INV-2026-00123 &nbsp;&nbsp; Date: 19/10/2026</div>
      <div>Order No: 1234567890 &nbsp;&nbsp; PO Ref: 4500012345</div>
      <table style="margin-top:16px;border-collapse:collapse;width:920px;font-size:18px">
        <tr style="background:#f5f5f4;font-weight:bold"><td style="padding:6px">Item</td><td>HSN</td><td>Qty</td><td style="text-align:right">Amount</td></tr>
        <tr><td style="padding:6px">Laptop stand</td><td>84733099</td><td>2</td><td style="text-align:right">3,198.00</td></tr>
        <tr><td style="padding:6px">USB-C cable 2m</td><td>85444299</td><td>5</td><td style="text-align:right">1,495.00</td></tr>
        <tr><td style="padding:6px">Shipping</td><td>996812</td><td>1</td><td style="text-align:right">150.00</td></tr>
      </table>
      <div style="margin-top:14px">Total (incl. GST 18%): Rs. 5,714.74</div>
      <div>Amount in words: Five thousand seven hundred fourteen rupees only</div>
      <div>Payment due by 02/11/2026. Thank you for your business!</div></div>`)

const hindiForm = (p) =>
  page(1000, 640, `
    <div style="padding:30px 40px;font-size:22px;line-height:2">
      <div style="font-size:26px;font-weight:bold">आवेदन पत्र</div>
      <div>नाम: ${p.nameHi}</div>
      <div>जन्म तिथि: ${p.dob}</div>
      <div>मोबाइल नंबर: ${p.phone}</div>
      <div>आधार संख्या: ${group(p.aadhaar)}</div>
      <div>खाता संख्या: 50100987654321</div>
      <div>पिन कोड: 560001</div></div>`)

// A phone-photo look: the page on a table, slightly rotated, dimmer and softer.
const asPhoto = (html, { rotate = 3, blur = 0.6, brightness = 0.92, contrast = 1 } = {}) =>
  `<div id="photo" style="padding:70px;background:linear-gradient(135deg,#8b6b4a,#5c4630)">
     <div style="transform:rotate(${rotate}deg);filter:blur(${blur}px) brightness(${brightness}) contrast(${contrast});box-shadow:0 12px 30px rgba(0,0,0,.45);width:fit-content">${html}</div></div>`

// --- Image list (file → HTML + what it contains) ----------------------------------
const { asha, ravi, meena } = PEOPLE
const IMAGES = [
  {
    file: 'synthetic-aadhaar-front.jpg',
    description: 'Aadhaar-style card front (clean scan): Hindi + English, QR code, VID',
    html: () => aadhaarFront(asha),
    items: [{ type: 'dob', value: asha.dob }, { type: 'aadhaar', value: asha.aadhaar }, { type: 'aadhaar_vid', value: asha.vid }, { type: 'qr_code' }],
  },
  {
    file: 'synthetic-aadhaar-front-photo.jpg',
    description: 'Same card as a phone photo: rotated 3°, slightly soft, on a table',
    html: async () => asPhoto(await aadhaarFront(asha)),
    quality: 70,
    items: [{ type: 'dob', value: asha.dob }, { type: 'aadhaar', value: asha.aadhaar }, { type: 'aadhaar_vid', value: asha.vid }, { type: 'qr_code' }],
  },
  {
    file: 'synthetic-aadhaar-back.jpg',
    description: 'Aadhaar-style card back: address with PIN code, number, VID, large QR; decoys 1947 and a help email',
    html: () => aadhaarBack(asha),
    // The help email is public and printed on every card: boxing it counts as a false alarm.
    items: [{ type: 'aadhaar', value: asha.aadhaar }, { type: 'aadhaar_vid', value: asha.vid }, { type: 'qr_code' }],
  },
  {
    file: 'synthetic-pan-card.jpg',
    description: 'PAN-style card: "Permanent Account Number" label (bank-keyword decoy), date of birth',
    html: async () => panCard(ravi),
    items: [{ type: 'dob', value: ravi.dob }, { type: 'pan', value: ravi.pan }],
  },
  {
    file: 'synthetic-passbook.jpg',
    description: 'Passbook front page; decoys: customer ID, MICR code, PIN code, account-opening date',
    html: async () => passbook(ravi),
    items: [{ type: 'bank_account', value: ravi.account }, { type: 'ifsc', value: ravi.ifsc }, { type: 'phone', value: ravi.phone }, { type: 'email', value: ravi.email }],
  },
  {
    file: 'synthetic-passbook-dim.jpg',
    description: 'Same passbook as a dim, low-contrast phone photo, rotated -2°',
    html: async () => asPhoto(passbook(ravi), { rotate: -2, blur: 0.5, brightness: 0.68, contrast: 0.8 }),
    quality: 65,
    items: [{ type: 'bank_account', value: ravi.account }, { type: 'ifsc', value: ravi.ifsc }, { type: 'phone', value: ravi.phone }, { type: 'email', value: ravi.email }],
  },
  {
    file: 'synthetic-bank-statement.jpg',
    description: 'Statement with a transaction table; decoys: 12-digit UPI/ATM refs, cheque no., amounts, dates',
    html: async () => statement(meena),
    items: [{ type: 'bank_account', value: meena.account }, { type: 'ifsc', value: meena.ifsc }, { type: 'phone', value: meena.phone }],
  },
  {
    file: 'synthetic-rental-letter.jpg',
    description: 'Letter with sensitive details inside sentences',
    html: async () => rentalLetter(ravi, meena),
    items: [
      { type: 'aadhaar', value: ravi.aadhaar }, { type: 'pan', value: ravi.pan }, { type: 'phone', value: ravi.phone },
      { type: 'email', value: ravi.email }, { type: 'bank_account', value: meena.account }, { type: 'ifsc', value: meena.ifsc },
    ],
  },
  {
    file: 'synthetic-hindi-form.jpg',
    description: 'Form with Hindi labels only (जन्म तिथि, मोबाइल नंबर, आधार संख्या, खाता संख्या)',
    html: async () => hindiForm(asha),
    items: [{ type: 'dob', value: asha.dob }, { type: 'phone', value: asha.phone }, { type: 'aadhaar', value: asha.aadhaar }, { type: 'bank_account', value: '50100987654321' }],
  },
  {
    file: 'synthetic-invoice-harmless.jpg',
    description: 'Harmless invoice: GSTIN, order/PO numbers, HSN codes, amounts, dates; nothing sensitive',
    html: async () => invoice(),
    items: [],
  },
]

// --- Render -------------------------------------------------------------------------
mkdirSync(imagesDir, { recursive: true })
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true })
const tab = await browser.newPage()
await tab.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1.6 })

const expected = existsSync(expectedPath) ? JSON.parse(readFileSync(expectedPath, 'utf8')) : {}
for (const img of IMAGES) {
  await tab.setContent(`<html><body style="margin:0;background:#fff">${await img.html()}</body></html>`, { waitUntil: 'load' })
  const el = (await tab.$('#photo')) ?? (await tab.$('#doc'))
  await el.screenshot({ path: join(imagesDir, img.file), type: 'jpeg', quality: img.quality ?? 90 })
  expected[img.file] = { description: `${img.description}. Synthetic: made-up data.`, items: img.items }
  console.log('wrote', img.file)
}
await browser.close()

const sorted = Object.fromEntries(Object.entries(expected).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(expectedPath, JSON.stringify(sorted, null, 2) + '\n')
console.log(`updated tests/expected.json (${IMAGES.length} synthetic images)`)
