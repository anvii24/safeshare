# Detection test results

Newest first. Produced by `npm run eval` (scripts/eval.mjs) from the images in
`tests/images/` and the answers in `tests/expected.json`. Values are masked to
their last 4 characters.

- **Catch rate**: sensitive items found ÷ sensitive items present. An item counts as
  caught if any box covers its value, even under a different label.
- **False alarms**: boxes on harmless text.

Images named `synthetic-*` are generated from made-up data (`npm run make-test-images`)
and are cleaner than real phone photos, so scores on them overstate real-world accuracy.

## 2026-10-19 14:35 · after fixes: auto page layout, capitals for PAN/IFSC, square QR

Commit `465f4d4 + uncommitted changes` · 10 images · Chrome (headless, desktop)

**Catch rate 100.0%** (34/34) · **False alarms 1**

| Type | Caught | Rate |
| --- | --- | --- |
| Aadhaar number | 5/5 | 100.0% |
| Aadhaar VID | 3/3 | 100.0% |
| Bank account number | 5/5 | 100.0% |
| Date of birth | 4/4 | 100.0% |
| Email address | 3/3 | 100.0% |
| IFSC code | 4/4 | 100.0% |
| PAN | 2/2 | 100.0% |
| Phone number | 5/5 | 100.0% |
| QR code | 3/3 | 100.0% |

| Image | Caught | False alarms | Quality | Time |
| --- | --- | --- | --- | --- |
| synthetic-aadhaar-back.jpg | 3/3 | 1 | ok | 1.5s |
| synthetic-aadhaar-front-photo.jpg | 4/4 | 0 | ok | 1.3s |
| synthetic-aadhaar-front.jpg | 4/4 | 0 | ok | 1.3s |
| synthetic-bank-statement.jpg | 3/3 | 0 | ok | 2.3s |
| synthetic-hindi-form.jpg | 4/4 | 0 | ok | 1.1s |
| synthetic-invoice-harmless.jpg | 0/0 | 0 | ok | 1.8s |
| synthetic-pan-card.jpg | 2/2 | 0 | ok | 1.2s |
| synthetic-passbook-dim.jpg | 4/4 | 0 | ok | 1.9s |
| synthetic-passbook.jpg | 4/4 | 0 | ok | 1.8s |
| synthetic-rental-letter.jpg | 6/6 | 0 | ok | 2.0s |

- False alarm in `synthetic-aadhaar-back.jpg`: email ••••v.in

## 2026-10-19 14:21 · baseline (before fixes)

Commit `465f4d4 + uncommitted changes` · 10 images · Chrome (headless, desktop)

**Catch rate 97.1%** (33/34) · **False alarms 3**

| Type | Caught | Rate |
| --- | --- | --- |
| Aadhaar number | 4/5 | 80.0% |
| Aadhaar VID | 3/3 | 100.0% |
| Bank account number | 5/5 | 100.0% |
| Date of birth | 4/4 | 100.0% |
| Email address | 3/3 | 100.0% |
| IFSC code | 4/4 | 100.0% |
| PAN | 2/2 | 100.0% |
| Phone number | 5/5 | 100.0% |
| QR code | 3/3 | 100.0% |

| Image | Caught | False alarms | Quality | Time |
| --- | --- | --- | --- | --- |
| synthetic-aadhaar-back.jpg | 2/3 | 1 | ok | 2.9s |
| synthetic-aadhaar-front-photo.jpg | 4/4 | 0 | ok | 2.0s |
| synthetic-aadhaar-front.jpg | 4/4 | 0 | ok | 2.7s |
| synthetic-bank-statement.jpg | 3/3 | 0 | ok | 2.2s |
| synthetic-hindi-form.jpg | 4/4 | 0 | ok | 1.0s |
| synthetic-invoice-harmless.jpg | 0/0 | 1 | ok | 1.7s |
| synthetic-pan-card.jpg | 2/2 | 0 | ok | 1.3s |
| synthetic-passbook-dim.jpg | 4/4 | 1 | ok | 1.6s |
| synthetic-passbook.jpg | 4/4 | 0 | ok | 1.5s |
| synthetic-rental-letter.jpg | 6/6 | 0 | ok | 2.0s |

- Missed in `synthetic-aadhaar-back.jpg`: aadhaar ••••0627
- False alarm in `synthetic-aadhaar-back.jpg`: email ••••v.in
- False alarm in `synthetic-invoice-harmless.jpg`: ifsc ••••TAND
- False alarm in `synthetic-passbook-dim.jpg`: qr_code
