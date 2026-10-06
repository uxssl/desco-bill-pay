# DESCO Customer Portal — demo

**Flow:** Login (mobile number) → OTP → Dashboard → Due Bills → View the actual bill → Scan the QR on the bill → Pay in bKash / Nagad / Rocket / Upay / bank app.

Built with HTML5, vanilla JavaScript and Tailwind CSS. English ⇄ বাংলা toggle in the header and on the sign-in page.

## Run

```bash
node .claude/serve.mjs
```

Open <http://127.0.0.1:5178>. **Demo build: no validation** — any mobile number and any OTP (even blank) sign in. A number that isn’t in the demo data opens the bill-copy account, whose April 2026 bill is the supplied bill copy.

## Demo set-up

- **Demo date** is fixed at 5 May 2026 (`D.DEMO.asOf` in `assets/js/data.js`) so the April 2026 bill is current and unpaid.
- **Bill copy:** `assets/img/bill-copy.jpg` (from `assets/bill.pdf`) is shown as-is. The payment QR `assets/img/qr.png` is placed in the printed QR’s slot without covering any bill text (`COPY_QR_BOX` in `bill-viewer.js`); clicking it opens it full size for scanning. The portal’s figures for that bill match the print exactly.
- **QR:** `D.QR.image` puts the same static QR on every bill. Set it to `null` to generate a per-bill QR from `D.QR.payload()` instead.
- **Flow ends at payment:** the customer opens the QR (click the QR on the bill or “Open QR to scan”) and pays in their app. The demo does not show the post-payment “Paid” state.
- Other accounts are fictional and use the HTML version of the bill.

## Structure

```
index.html                    Page shell (markup only — no inline CSS)
assets/css/tokens.css         Design tokens, bill styles, print
assets/css/components.css     Base reset + component classes (buttons, cards, forms, badges, tables, nav)
assets/js/i18n.js             English/Bangla strings, Bangla digits, dates
assets/js/data.js             Tariff, QR config, demo data (incl. bill-copy account)
assets/js/store.js            Session (mobile number), bill status, payment confirmation
assets/js/views/login.js      Mobile number → OTP
assets/js/views/dashboard.js  Accounts and total due
assets/js/views/bills.js      Due / paid bills
assets/js/views/bill-viewer.js  Bill (scan or HTML), QR, pay instructions
assets/js/app.js              Router, auth guard, language toggle, idle sign-out
```

## Before production

- **Privacy:** `assets/bill.pdf` and `assets/img/bill-copy.jpg` contain a real customer’s details, so they are git-ignored and not in the repo. Supply your own (redacted) bill scan at that path to run the demo; the bill-copy account in `data.js` uses fictional details.
- **Sign-in:** validation is switched off for the demo (`views/login.js`). Production must validate the mobile number and generate, send, expire and rate-limit OTPs on the server.
- **QR:** use the acquirer-issued Bangla QR (EMVCo) with DESCO’s merchant ID `[PLACEHOLDER_MERCHANT_ID]`, ideally dynamic per bill with the amount. Mark bills paid only after the server validates the gateway confirmation (IPN).
- **Tailwind:** replace the CDN runtime with a compiled build (keep `corePlugins.preflight: false`; the reset is in `components.css`).
