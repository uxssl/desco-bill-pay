/* English ⇄ বাংলা. English text is the key; missing Bangla entries fall back to English.
 * In Bangla mode amounts, dates and counts use Bangla digits. Identifiers people type or read out
 * (account, bill, meter and mobile numbers) stay in Latin digits, as on the printed bill. */
(function (D) {
  'use strict';
  const U = D.u;
  const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  const MON_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const MON_BN_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

  let lang = 'en';
  try { lang = localStorage.getItem('desco.lang') === 'bn' ? 'bn' : 'en'; } catch (e) { /* per-viewer preference only */ }
  D.lang = () => lang;
  D.setLang = (l) => { lang = l === 'bn' ? 'bn' : 'en'; try { localStorage.setItem('desco.lang', lang); } catch (e) { /* ignore */ } };
  D.digits = (s) => (lang === 'bn' ? String(s).replace(/\d/g, (d) => BN_DIGITS[d]) : String(s));

  /* ---------- Formatters ---------- */
  // Untranslated originals, used by the printed-bill replica (always English, like the paper bill)
  U.raw = { n: U.n, n2: U.n2, tk: U.tk, tkShort: U.tkShort, pct: U.pct, words: U.words, fmtDate: U.fmtDate };
  const R = U.raw;
  const parts = (s) => { const d = U.parse(s); return [d.getDate(), d.getMonth(), d.getFullYear()]; };

  U.n = (v) => D.digits(R.n(v));
  U.n2 = (v) => D.digits(R.n2(v));
  U.tk = (v, dec) => D.digits(R.tk(v, dec));
  U.pct = (v, d) => D.digits(R.pct(v, d));
  U.tkShort = (v) => (lang === 'bn' ? D.digits(R.tkShort(v).replace(' Cr', ' কোটি').replace(' L', ' লাখ').replace('K', ' হাজার')) : R.tkShort(v));
  U.fmtDate = (s) => { if (!s || lang !== 'bn') return R.fmtDate(s); const [d, m, y] = parts(s); return D.digits(`${U.pad(d)} ${MON_BN[m]} ${y}`); };
  const fmtShort = U.fmtShort;
  U.fmtShort = (s) => { if (lang !== 'bn') return fmtShort(s); const [d, m] = parts(s); return D.digits(`${U.pad(d)} ${MON_BN_SHORT[m]}`); };
  const monthLabel = U.monthLabel; const monthShort = U.monthShort; const monthAbbr = U.monthAbbr;
  U.monthLabel = (ym) => { if (lang !== 'bn') return monthLabel(ym); const [y, m] = ym.split('-').map(Number); return D.digits(`${MON_BN[m - 1]} ${y}`); };
  U.monthShort = (ym) => { if (lang !== 'bn') return monthShort(ym); const [y, m] = ym.split('-').map(Number); return D.digits(`${MON_BN_SHORT[m - 1]} ’${String(y).slice(2)}`); };
  U.monthAbbr = (ym) => (lang === 'bn' ? MON_BN_SHORT[Number(ym.split('-')[1]) - 1] : monthAbbr(ym));
  const dueText = U.dueText;
  U.dueText = (due, today) => {
    if (lang !== 'bn') return dueText(due, today);
    const d = U.diffDays(due, today);
    if (d > 1) return `আর ${U.n(d)} দিন বাকি`;
    if (d === 1) return 'কাল শেষ দিন';
    if (d === 0) return 'আজ শেষ দিন';
    return `${U.n(-d)} দিন পার হয়েছে`;
  };
  U.maskMobile = (m) => `${m.slice(0, 3)}XX-XXX-${m.slice(-3)}`;

  /* ---------- Translation ---------- */
  D.t = (key, vars) => {
    let s = (lang === 'bn' && BN[key]) || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
    return s;
  };
  /** Count-aware: English picks singular/plural; Bangla has one form (keyed by the singular). */
  D.tp = (n, one, many, vars = {}) => D.t(lang === 'bn' || n === 1 ? one : many, { n: U.n(n), ...vars });
  /** Account nicknames like "Home 2" → "বাসা ২". */
  D.nickLabel = (nick) => D.digits(String(nick).replace(/^(Home|Shop)/, (w) => D.t(w)));

  const BN = {
    // Shell
    'Customer Portal': 'গ্রাহক পোর্টাল',
    'Dashboard': 'ড্যাশবোর্ড',
    'Due Bills': 'বকেয়া বিল',
    'Account menu': 'অ্যাকাউন্ট মেনু',
    'Sign out': 'সাইন আউট',
    '{n} account on this number': 'এই নম্বরে {n}টি অ্যাকাউন্ট',
    'Signed out after 15 minutes of inactivity': '১৫ মিনিট নিষ্ক্রিয় থাকায় সাইন আউট করা হয়েছে',
    'You have signed out securely': 'আপনি নিরাপদে সাইন আউট করেছেন',
    "© Dhaka Electricity Supply PLC · Hotline <b class='num text-ink-2'>16120</b>": "© ঢাকা ইলেকট্রিসিটি সাপ্লাই পিএলসি · হটলাইন <b class='num text-ink-2'>১৬১২০</b>",
    'DESCO never asks for your OTP or PIN.': 'ডেসকো কখনো আপনার OTP বা PIN চায় না।',
    'Close': 'বন্ধ করুন',

    // Login
    'Sign in': 'সাইন ইন',
    'See your dues.<br>Scan the bill. Pay.': 'বকেয়া দেখুন।<br>বিলের QR স্ক্যান করুন।<br>পরিশোধ করুন।',
    'Sign in with your mobile number': 'মোবাইল নম্বর দিয়ে লগইন করুন',
    'The number registered with your DESCO connection': 'যে নম্বরটি আপনার ডেসকো সংযোগে নিবন্ধিত',
    'Open your due bill': 'বকেয়া বিলটি খুলুন',
    'The same bill you get on paper': 'কাগজে যে বিল পান, হুবহু সেটি',
    'Scan the QR on the bill': 'বিলের QR কোড স্ক্যান করুন',
    'Pay from bKash, Nagad, Rocket or your bank app': 'বিকাশ, নগদ, রকেট বা ব্যাংকের অ্যাপ থেকে পরিশোধ করুন',
    'OTP sign-in': 'OTP দিয়ে লগইন',
    'Hotline': 'হটলাইন',
    'Demo mode': 'ডেমো মোড',
    'Fictional data': 'কাল্পনিক তথ্য',
    'Pick a sample number. The demo OTP is {otp}.': 'একটি নমুনা নম্বর বেছে নিন। ডেমো OTP: {otp}',
    'Bill copy · April 2026 due': 'বিলের কপি · এপ্রিল ২০২৬ বকেয়া',
    'Two accounts · one overdue': 'দুটি অ্যাকাউন্ট · একটি মেয়াদোত্তীর্ণ',
    'One bill due · not late': 'একটি বিল বকেয়া · মেয়াদ আছে',
    'Enter the mobile number registered with your DESCO connection. We’ll send you a one-time code.': 'আপনার ডেসকো সংযোগে নিবন্ধিত মোবাইল নম্বরটি দিন। আমরা একটি এককালীন কোড (OTP) পাঠাব।',
    'Mobile number': 'মোবাইল নম্বর',
    'Verify': 'যাচাই',
    'Send OTP': 'OTP পাঠান',
    'Enter an 11-digit mobile number starting with 01, e.g. 017XXXXXXXX.': '01 দিয়ে শুরু ১১ সংখ্যার মোবাইল নম্বর দিন, যেমন 017XXXXXXXX।',
    'Too many wrong codes. Try again in {m} min.': 'অনেকবার ভুল কোড দেওয়া হয়েছে। {m} মিনিট পর আবার চেষ্টা করুন।',
    'No DESCO account is registered with this number. Use the number given for your connection, or contact your S&D office to update it.': 'এই নম্বরে কোনো ডেসকো অ্যাকাউন্ট নিবন্ধিত নেই। সংযোগ নেওয়ার সময় দেওয়া নম্বরটি ব্যবহার করুন, অথবা নম্বর হালনাগাদ করতে আপনার বিক্রয় ও বিতরণ (S&D) অফিসে যোগাযোগ করুন।',
    'Change number': 'নম্বর পরিবর্তন',
    'Enter verification code': 'যাচাই কোড দিন',
    'We sent a 6-digit code to {m}.': '{m} নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে।',
    'One-time code': 'এককালীন কোড',
    'Verify & sign in': 'যাচাই করে লগইন করুন',
    'Never share this code. DESCO staff will never ask for your OTP or PIN.': 'এই কোড কাউকে দেবেন না। ডেসকোর কোনো কর্মী কখনো আপনার OTP বা PIN চাইবেন না।',
    'Code expires in {t}': 'কোডের মেয়াদ আর {t}',
    'Code expired — request a new one': 'কোডের মেয়াদ শেষ — নতুন কোড নিন',
    'Resend in {s}s': '{s} সেকেন্ড পর আবার পাঠানো যাবে',
    'Resend code': 'আবার কোড পাঠান',
    'New code sent': 'নতুন কোড পাঠানো হয়েছে',
    'Enter all 6 digits.': '৬টি সংখ্যাই দিন।',
    'This code has expired. Tap “Resend code”.': 'কোডের মেয়াদ শেষ। “আবার কোড পাঠান” চাপুন।',
    'Too many wrong codes. For your security, sign-in is paused for 5 minutes.': 'অনেকবার ভুল কোড দেওয়া হয়েছে। আপনার নিরাপত্তার জন্য ৫ মিনিট লগইন বন্ধ থাকবে।',
    'That code is incorrect. {n} attempt left.': 'কোডটি সঠিক নয়। আর {n} বার চেষ্টা করতে পারবেন।',
    'Welcome, {name}': 'স্বাগতম, {name}',
    'Signed in securely': 'নিরাপদে লগইন হয়েছে',

    // Dashboard
    'Good morning': 'শুভ সকাল',
    'Good afternoon': 'শুভ অপরাহ্ন',
    'Good evening': 'শুভ সন্ধ্যা',
    '{n} DESCO account on {m}': '{m} নম্বরে {n}টি ডেসকো অ্যাকাউন্ট',
    'Total amount due': 'মোট বকেয়া',
    '{n} unpaid bill': '{n}টি অপরিশোধিত বিল',
    'in {n} account': '{n}টি অ্যাকাউন্টে',
    'includes overdue': 'মেয়াদোত্তীর্ণ বিলসহ',
    'next due {date}': 'পরবর্তী শেষ তারিখ {date}',
    'View due bills': 'বকেয়া বিল দেখুন',
    'You’re all paid up': 'আপনার কোনো বকেয়া নেই',
    'There are no unpaid bills on your accounts.': 'আপনার অ্যাকাউন্টগুলোতে কোনো অপরিশোধিত বিল নেই।',
    'How to pay': 'কীভাবে পরিশোধ করবেন',
    'Open a due bill': 'বকেয়া বিল খুলুন',
    'From Due Bills, tap “View bill”.': '“বকেয়া বিল” থেকে “বিল দেখুন” চাপুন।',
    'Use bKash, Nagad, Rocket, Upay or your bank app.': 'বিকাশ, নগদ, রকেট, উপায় বা ব্যাংকের অ্যাপ ব্যবহার করুন।',
    'Confirm in your app': 'অ্যাপে নিশ্চিত করুন',
    'Enter the bill amount and confirm with your PIN.': 'বিলের টাকার পরিমাণ লিখে PIN দিয়ে নিশ্চিত করুন।',
    'Your accounts': 'আপনার অ্যাকাউন্ট',
    'Home': 'বাসা',
    'Shop': 'দোকান',
    'A/C': 'হিসাব নং',
    'Meter': 'মিটার',
    'Disconnected': 'সংযোগ বিচ্ছিন্ন',
    'Disconnection notice': 'বিচ্ছিন্নের নোটিশ',
    'Overdue': 'মেয়াদোত্তীর্ণ',
    'Due {date}': 'শেষ তারিখ {date}',
    'All paid': 'সব পরিশোধিত',
    'Due · {n} bill': 'বকেয়া · {n}টি বিল',
    'Last payment': 'সর্বশেষ পরিশোধ',
    'View bill': 'বিল দেখুন',
    'View bills': 'বিলগুলো দেখুন',
    'Latest bill': 'সর্বশেষ বিল',
    'Recent payments': 'সাম্প্রতিক পরিশোধ',
    'Payment received — reconnection requested.': 'পরিশোধ পাওয়া গেছে — পুনঃসংযোগের অনুরোধ করা হয়েছে।',
    'Our field team restores supply within 24 hours. Call 16120 if it is not restored.': '২৪ ঘণ্টার মধ্যে আমাদের মাঠকর্মীরা সংযোগ চালু করবেন। না হলে ১৬১২০ নম্বরে কল করুন।',
    'Supply disconnected ({acc}).': 'সংযোগ বিচ্ছিন্ন ({acc})।',
    'Pay all dues of {amt} to request reconnection.': 'পুনঃসংযোগের জন্য সমস্ত বকেয়া {amt} পরিশোধ করুন।',
    'Disconnection notice ({acc}).': 'সংযোগ বিচ্ছিন্নের নোটিশ ({acc})।',
    'Your {month} bill passed its disconnection date ({date}). Pay now to keep your supply connected.': 'আপনার {month} মাসের বিলের সংযোগ বিচ্ছিন্নের তারিখ ({date}) পার হয়ে গেছে। সংযোগ চালু রাখতে এখনই পরিশোধ করুন।',
    '{month} bill is overdue ({acc}).': '{month} মাসের বিল মেয়াদোত্তীর্ণ ({acc})।',
    'A 5% late fee of {fee} has been added. Pay before {date} to avoid disconnection.': '৫% বিলম্ব মাশুল {fee} যোগ হয়েছে। সংযোগ বিচ্ছিন্ন এড়াতে {date}-এর আগে পরিশোধ করুন।',

    'Issued {date}': '{date} ইস্যু',
    '{n} day left': '{n} দিন বাকি',
    'Due today': 'আজ শেষ দিন',
    'Overdue by {n} day': '{n} দিন পার হয়েছে',
    '{month} bill · {amt} after the due date': '{month} মাসের বিল · শেষ তারিখের পর {amt}',
    'Need help? Call {n}': 'সাহায্য দরকার? কল করুন {n}',
    'Account summary': 'অ্যাকাউন্ট সারসংক্ষেপ',
    'Last bill · units used': 'সর্বশেষ বিল · ব্যবহৃত ইউনিট',
    'vs {month}': '{month}-এর তুলনায়',
    'Average monthly bill': 'গড় মাসিক বিল',
    'last 12 months': 'গত ১২ মাস',
    'Paid in last 12 months': 'গত ১২ মাসে পরিশোধ',
    '{n} payment': '{n}টি পরিশোধ',
    'Paid on time': 'সময়মতো পরিশোধ',
    'bills paid by the due date': 'শেষ তারিখের মধ্যে পরিশোধিত বিল',
    'Electricity use': 'বিদ্যুৎ ব্যবহার',
    'kWh per month · tap a bar to open that bill': 'মাসভিত্তিক kWh · বারে চাপলে সেই মাসের বিল খুলবে',
    'Recently paid bills': 'সম্প্রতি পরিশোধিত বিল',
    'All paid bills': 'সব পরিশোধিত বিল',
    'Billing month': 'বিলের মাস',
    'Paid on': 'পরিশোধের তারিখ',
    'On time': 'সময়মতো',
    'After due date': 'শেষ তারিখের পরে',

    'Connection details': 'সংযোগের তথ্য',
    'Tariff': 'ট্যারিফ',
    'Residential': 'আবাসিক',
    'Commercial': 'বাণিজ্যিক',
    'Sanctioned load': 'অনুমোদিত লোড',
    'Meter no.': 'মিটার নং',
    'Zone / Block': 'জোন / ব্লক',
    'S&D division': 'বিক্রয় ও বিতরণ বিভাগ',
    'Ibrahimpur': 'ইব্রাহিমপুর', 'Gulshan': 'গুলশান', 'Banani': 'বনানী', 'Baridhara': 'বারিধারা', 'Uttara East': 'উত্তরা পূর্ব',
    'Uttara West': 'উত্তরা পশ্চিম', 'Mirpur': 'মিরপুর', 'Pallabi': 'পল্লবী', 'Kafrul': 'কাফরুল', 'Agargaon': 'আগারগাঁও', 'Joarsahara': 'জোয়ারসাহারা',

    // Due bills
    'Open a bill to see the full bill and the QR code to pay it from your mobile banking app.': 'বিল খুললে পুরো বিল ও বিলের QR কোড দেখতে পাবেন — মোবাইল ব্যাংকিং অ্যাপ দিয়ে স্ক্যান করে পরিশোধ করুন।',
    'Total due': 'মোট বকেয়া',
    'Nothing to pay': 'পরিশোধের কিছু নেই',
    'Due': 'বকেয়া',
    'Paid': 'পরিশোধিত',
    'Account': 'অ্যাকাউন্ট',
    'All accounts': 'সব অ্যাকাউন্ট',
    'Bill no.': 'বিল নং',
    'Due date': 'পরিশোধের শেষ তারিখ',
    'Paid on {date}': '{date} তারিখে পরিশোধিত',
    'incl. late fee {fee}': 'বিলম্ব মাশুল {fee} সহ',
    '{amt} after due date': 'শেষ তারিখের পর {amt}',
    'View bill & pay': 'বিল দেখুন ও পরিশোধ করুন',
    'No due bills': 'কোনো বকেয়া বিল নেই',
    'All bills are paid. New bills appear here as soon as they are issued.': 'সব বিল পরিশোধিত। নতুন বিল ইস্যু হলেই এখানে দেখা যাবে।',
    'No paid bills yet': 'এখনো কোনো পরিশোধিত বিল নেই',
    'Bills you pay will appear here.': 'পরিশোধ করা বিলগুলো এখানে দেখা যাবে।',

    // Bill view & QR
    'Bill not found': 'বিল পাওয়া যায়নি',
    'This bill does not belong to an account on your mobile number.': 'এই বিলটি আপনার মোবাইল নম্বরের কোনো অ্যাকাউন্টের নয়।',
    'Back to Due Bills': 'বকেয়া বিলে ফিরে যান',
    'Previous month': 'আগের মাস',
    'Next month': 'পরের মাস',
    'Zoom out': 'ছোট করুন',
    'Zoom in': 'বড় করুন',
    'Fit to width': 'প্রস্থে মিলিয়ে নিন',
    'Download PDF': 'PDF ডাউনলোড',
    'Choose “Save as PDF” to download': 'ডাউনলোড করতে “Save as PDF” বেছে নিন',
    'Previous bills': 'আগের বিল',
    'Pay this bill': 'বিলটি পরিশোধ করুন',
    'Scan to pay': 'স্ক্যান করে পরিশোধ',
    'Payment QR — tap to enlarge': 'পেমেন্ট QR — বড় করতে চাপুন',
    'Amount to pay': 'পরিশোধযোগ্য টাকা',
    'Includes late fee {fee}': 'বিলম্ব মাশুল {fee} সহ',
    'Pay by {date}': '{date}-এর মধ্যে পরিশোধ করুন',
    'Scan the QR code at the top-right of the bill. Tap it to enlarge.': 'বিলের উপরে ডান দিকের QR কোডটি স্ক্যান করুন। বড় করতে QR-এ চাপুন।',
    'After {date} the amount becomes {amt}.': '{date}-এর পর পরিমাণ হবে {amt}।',
    'After {date} the amount becomes {amt} and a new QR is shown.': '{date}-এর পর পরিমাণ হবে {amt} এবং নতুন QR দেখানো হবে।',
    'This account also has an older unpaid bill ({month}). Please pay it too.': 'এই অ্যাকাউন্টে আগের একটি অপরিশোধিত বিলও আছে ({month})। সেটিও পরিশোধ করুন।',
    'The disconnection date ({date}) has passed. Pay now to keep your supply connected.': 'সংযোগ বিচ্ছিন্নের তারিখ ({date}) পার হয়ে গেছে। সংযোগ চালু রাখতে এখনই পরিশোধ করুন।',
    'Open your mobile banking app': 'মোবাইল ব্যাংকিং অ্যাপ খুলুন',
    'Bank apps': 'ব্যাংক অ্যাপ',
    'Tap “Scan QR” and point at the QR on the bill': '“Scan QR” চেপে বিলের QR কোডের দিকে ক্যামেরা ধরুন',
    'Paying from this phone? Save the QR and use “scan from gallery”.': 'এই ফোন থেকেই দিচ্ছেন? QR সেভ করে অ্যাপে “গ্যালারি থেকে স্ক্যান” ব্যবহার করুন।',
    'Check DESCO, bill number and amount, then confirm with your PIN': 'ডেসকো, বিল নম্বর ও টাকার পরিমাণ মিলিয়ে PIN দিয়ে নিশ্চিত করুন',
    'Never share your PIN or OTP with anyone.': 'PIN বা OTP কখনো কাউকে দেবেন না।',
    'Enlarge': 'বড় করুন',
    'Amount to enter': 'যে পরিমাণ লিখবেন',
    'Copy': 'কপি',
    'Amount copied': 'টাকার পরিমাণ কপি হয়েছে',
    'Scan this QR from your app': 'অ্যাপ থেকে এই QR স্ক্যান করুন',
    'Enter the amount, then confirm with your PIN': 'টাকার পরিমাণ লিখে PIN দিয়ে নিশ্চিত করুন',
    'Check the amount, then confirm with your PIN': 'টাকার পরিমাণ মিলিয়ে PIN দিয়ে নিশ্চিত করুন',
    'Works with': 'যেসব অ্যাপে চলে',
    'Open QR to scan': 'স্ক্যান করতে QR খুলুন',
    'Click QR to scan': 'স্ক্যান করতে QR-এ ক্লিক করুন',
    'Click the QR on the bill to open it full size, then scan it with your app.': 'বিলের QR-এ ক্লিক করে পূর্ণ আকারে খুলুন, তারপর অ্যাপ দিয়ে স্ক্যান করুন।',
    'Open the QR full size and scan it from your app': 'QR পূর্ণ আকারে খুলে অ্যাপ দিয়ে স্ক্যান করুন',
    'Enter the amount shown here, then confirm with your PIN': 'এখানে দেখানো টাকার পরিমাণ লিখে PIN দিয়ে নিশ্চিত করুন',
    'Enter this amount in your app': 'অ্যাপে এই পরিমাণ লিখুন',
    'Hold your phone 15–25 cm from the screen and turn up screen brightness.': 'ফোনটি স্ক্রিন থেকে ১৫–২৫ সেমি দূরে ধরুন এবং স্ক্রিনের উজ্জ্বলতা বাড়িয়ে দিন।',
    'Save QR': 'QR সেভ',
    'Check status': 'স্ট্যাটাস দেখুন',
    'Your payment is confirmed by DESCO within a few minutes. This bill will then show “Paid”.': 'কয়েক মিনিটের মধ্যে ডেসকো আপনার পরিশোধ নিশ্চিত করবে, তখন বিলটি “পরিশোধিত” দেখাবে।',
    'Simulate the payment confirmation that DESCO receives after a customer pays by QR.': 'গ্রাহক QR দিয়ে পরিশোধের পর ডেসকো যে নিশ্চিতকরণ পায়, তা অনুকরণ করুন।',
    'Simulate payment': 'পরিশোধ অনুকরণ',
    'Same QR as printed on your bill': 'বিলে ছাপা একই QR',
    'QR saved': 'QR সেভ হয়েছে',
    'Open your app and choose “scan from gallery”.': 'অ্যাপ খুলে “গ্যালারি থেকে স্ক্যান” বেছে নিন।',
    'No payment received yet': 'এখনো কোনো পরিশোধ পাওয়া যায়নি',
    'If you just paid, check again in a minute.': 'এইমাত্র পরিশোধ করে থাকলে এক মিনিট পর আবার দেখুন।',
    'Payment received': 'পরিশোধ পাওয়া গেছে',
    'Amount': 'পরিমাণ',
    'Paid via': 'পরিশোধের মাধ্যম',
    'Reference': 'রেফারেন্স',
    'Bill at a glance': 'বিলের সারসংক্ষেপ',
    'Units used': 'ব্যবহৃত ইউনিট',
    'Bill amount': 'বিলের পরিমাণ',
    'Issue date': 'ইস্যুর তারিখ',
    'Disconnection date': 'সংযোগ বিচ্ছিন্নের তারিখ',
    'How your bill is calculated': 'বিল কীভাবে হিসাব করা হয়েছে',
    'Energy charge': 'এনার্জি চার্জ',
    'Demand charge': 'ডিমান্ড চার্জ',
    'Meter rent': 'মিটার ভাড়া',
    'VAT 5%': 'ভ্যাট ৫%',
    'Total bill': 'মোট বিল',

    // Status & channels
    'Part-paid': 'আংশিক পরিশোধিত',
    'Unpaid': 'অপরিশোধিত',
    'Disconnection due': 'বিচ্ছিন্নযোগ্য',
    'QR payment': 'QR পেমেন্ট',
    'Bank Counter': 'ব্যাংক কাউন্টার',
    'DESCO Counter': 'ডেসকো কাউন্টার',
    'Card / i-Banking': 'কার্ড / ইন্টারনেট ব্যাংকিং',
    'Card': 'কার্ড',
    'Internet banking': 'ইন্টারনেট ব্যাংকিং',
    'bKash': 'বিকাশ',
    'Nagad': 'নগদ',
    'Rocket': 'রকেট',
    'Upay': 'উপায়',
  };
})(window.DESCO = window.DESCO || {});
