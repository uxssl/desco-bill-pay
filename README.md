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
- **Bill copy:** `assets/img/bill-copy.jpg` (from `assets/bill.pdf`) is shown exactly as issued, with its own printed QR. Customers open the payment QR with “Open QR to scan”. The portal’s figures for that bill match the print exactly.
- **QR:** `D.QR.image` puts the same static QR on every bill. Set it to `null` to generate a per-bill QR from `D.QR.payload()` instead.
- **Flow ends at payment:** the customer opens the QR (“Open QR to scan”) and pays in their app. The demo does not show the post-payment “Paid” state.
- Other accounts are fictional and use the HTML version of the bill.

## Admin panel

Open <http://127.0.0.1:5178/admin.html>. **Demo build:** any Admin ID and password sign in.

1. **Bill Generation:** pick year and month, then **Bulk** (every postpaid customer without a bill for that month) or **Single** (search a Customer ID, or a Book no. such as `10101` to list that book’s customers). May 2026 is the month still to bill.
2. **Prepaid QR:** search by Customer ID, meter no. or Book no., then **Gen QR**, enter the recharge amount and get a **dynamic** Bangla QR: amount and one-time reference inside, valid 24 hours. Download as PNG or print.
3. **Reconciliation & Report:** generated vs paid. *Postpaid bills* per month (paid / part-paid / unpaid / not generated, by channel); *Prepaid QR* (paid / awaiting payment / expired unpaid). Export the filtered rows to CSV.
4. **History:** every bill and QR generation, export and sign-in, with who and when.

Bills and QRs generated in the panel are kept in this browser’s storage. Use **Reset demo data** in the sidebar to clear them. Prepaid customers and earlier QRs are fictional seeded data (`assets/js/admin/store.js`).

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
admin.html                    Admin panel shell
assets/js/admin/store.js      Admin state: books, prepaid customers, bill & QR generation, history
assets/js/admin/suggest.js    Search-as-you-type dropdown (books and customers)
assets/js/admin/views/*.js    Sign-in, dashboard, bill generation, prepaid QR, reconciliation, history
assets/js/admin/app.js        Admin router and sidebar
```

## Before production

- **Privacy:** `assets/bill.pdf` and `assets/img/bill-copy.jpg` contain a real customer’s details, so they are git-ignored and not in the repo. Supply your own (redacted) bill scan at that path to run the demo; the bill-copy account in `data.js` uses fictional details.
- **Sign-in:** validation is switched off for the demo (`views/login.js`). Production must validate the mobile number and generate, send, expire and rate-limit OTPs on the server.
- **QR:** use the acquirer-issued Bangla QR (EMVCo) with DESCO’s merchant ID `[PLACEHOLDER_MERCHANT_ID]`, ideally dynamic per bill with the amount. The admin panel’s prepaid QR payload (`A.qrPayload`) is a placeholder link and must be replaced by the acquirer-issued dynamic QR. Mark bills paid only after the server validates the gateway confirmation (IPN).
- **Tailwind:** replace the CDN runtime with a compiled build (keep `corePlugins.preflight: false`; the reset is in `components.css`).
