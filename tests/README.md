# Detection tests

`npm run eval` runs every image in `images/` through the app's own pipeline
(OCR, QR scan, detectors) in headless Chrome, compares the result with
`expected.json`, prints a report, and adds a dated section to `results.md`.

**Only use fake documents.** This folder is committed to a public repository.
Never add a real Aadhaar, PAN, passbook or anyone's real details.

## Adding a test image

1. Put the image in `images/` (JPG, PNG or WebP). Don't start the name with
   `synthetic-`; that prefix belongs to the generated set.
2. Add an entry to `expected.json` listing every sensitive item that's on it:

```json
"my-fake-passbook.jpg": {
  "description": "Photo of a printed fake passbook, kitchen light",
  "items": [
    { "type": "bank_account", "value": "50100234567891" },
    { "type": "ifsc", "value": "EXMP0001234" },
    { "type": "phone", "value": "+91 98450 12345" },
    { "type": "qr_code" }
  ]
}
```

3. Run `npm run eval` (or `npm run eval -- --label "what changed"`).

Types: `aadhaar`, `aadhaar_vid`, `pan`, `bank_account`, `ifsc`, `phone`,
`email`, `dob`, `qr_code`. Write values as printed; spaces, dashes and `+91`
are ignored when comparing. QR codes have no value. A document with nothing
sensitive gets `"items": []`, so every box on it counts as a false alarm.

## How scoring works

- **Caught**: some box covers the item's value, even if it was given another
  label (e.g. an account number labelled as a phone number). Wrong labels
  are reported separately. One misread character is allowed in values of 8+
  characters, since the box still lands in the right place.
- **False alarm**: a box whose value matches nothing in the list.
- The report in `results.md` masks values to their last 4 characters.

## The synthetic set

`synthetic-*.jpg` are made by `npm run make-test-images` from made-up data
(valid-checksum but fake Aadhaar numbers, `example.com` emails, a "SPECIMEN –
TEST DATA" mark on each). Regenerating overwrites only those images and their
entries. They're rendered cleanly in Chrome, so they're easier than real
phone photos. Add real photos of printed fake documents for honest numbers.
