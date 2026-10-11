/* Admin back-office state: postpaid bill generation, prepaid dynamic Bangla QR, reconciliation, history.
 * Demo only — built on the same seeded dataset as the customer portal, with the admin's own actions kept in
 * this browser. In production each action is a server call (billing engine, QR issued by the acquirer) and
 * History is the server's audit log. */
(function (D) {
  'use strict';
  const U = D.u;
  const pad = U.pad;
  const KEY = 'desco.admin.v1';
  const SKEY = 'desco.admin.session';
  const QR_VALID_H = 24;
  const A = (D.admin = { today: D.DEMO.asOf, session: null });

  /* Admin panel writes dates out in full: "5 May 2026", "April 2026" — no abbreviated month names. */
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const ymd = (s) => s.slice(0, 10).split('-').map(Number);
  U.monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
  U.monthShort = (ym) => MONTHS[Number(ym.split('-')[1]) - 1]; // chart axis; the tooltip carries the year
  U.monthAbbr = U.monthShort;
  U.fmtDate = (s) => { if (!s) return '—'; const [y, m, d] = ymd(s); return `${d} ${MONTHS[m - 1]} ${y}`; };
  U.fmtShort = (s) => { const [, m, d] = ymd(s); return `${d} ${MONTHS[m - 1]}`; };

  const read = (store, k) => { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } };
  const write = (store, k, v) => { try { v == null ? store.removeItem(k) : store.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      code: (n) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(next() * 32)]).join(''),
    };
  }

  const FIRST = ['Rafiqul', 'Nasrin', 'Tanvir', 'Farhana', 'Kamrul', 'Sabina', 'Faisal', 'Nusrat', 'Jahid', 'Sharmin', 'Imran', 'Rumana', 'Arif', 'Jesmin', 'Saiful', 'Afroza', 'Asif', 'Salma', 'Rashed', 'Sultana'];
  const LAST = ['Rahman', 'Hossain', 'Islam', 'Ahmed', 'Chowdhury', 'Akter', 'Uddin', 'Haque', 'Begum', 'Khan', 'Alam', 'Kabir'];
  const STAFF = ['Billing Officer · Gulshan', 'Billing Officer · Mirpur', 'Revenue Officer'];
  A.APPS = ['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank app'];
  A.AMOUNTS = [500, 1000, 1500, 2000, 3000];

  let base = null;
  let saved = null;
  let seed = null;
  let custByAcc = new Map();
  let prepaidByAcc = new Map();
  let billsByMonth = new Map();
  let paysByBill = new Map();
  let qrs = [];

  /** Demo clock: the demo date with the real time of day. */
  A.now = () => `${A.today}T${U.nowStamp().slice(11)}`;
  const addHours = (stamp, h) => { const d = new Date(`${stamp}:00`); d.setHours(d.getHours() + h); return `${U.iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  A.init = () => {
    base = D.generate(A.today);
    A.months = [...base.months, U.addMonths(base.months[base.months.length - 1], 1)];
    A.openMonth = A.months[A.months.length - 1];
    assignBooks();
    seedPrepaid();
    saved = read(localStorage, KEY) || { bills: [], qrs: [], history: [] };
    A.session = read(sessionStorage, SKEY);
    index();
  };
  const save = () => write(localStorage, KEY, saved);
  A.reset = () => { saved = { bills: [], qrs: [], history: [] }; save(); index(); };

  /** Book = meter-reading route: 5 digits, 1 + division (2) + book within the division (2), e.g. 10101. */
  function assignBooks() {
    D.DIVISIONS.forEach((d, di) => {
      let book = 0; let left = 0;
      base.consumers.filter((c) => c.division === d.id).sort((a, b) => a.account.localeCompare(b.account)).forEach((c, i) => {
        if (!left) { book += 1; left = 3 + (i % 2); }
        c.book = `1${pad(di + 1)}${pad(book)}`;
        left -= 1;
      });
    });
  }

  /** Prepaid customers (fictional), their past dynamic QRs and the payments made against them. */
  function seedPrepaid() {
    const r = rng(4242);
    const used = new Set();
    A.prepaid = [];
    D.DIVISIONS.slice(0, 10).forEach((d, di) => {
      [3, 2].forEach((n, bi) => {
        for (let k = 0; k < n; k++) {
          let account;
          do { account = `4${pad(di + 1)}${r.int(10000, 99999)}`; } while (used.has(account));
          used.add(account);
          A.prepaid.push({
            account, meter: `5${r.int(10000, 99999)}${r.int(100000, 999999)}`,
            name: `${r.pick(FIRST)} ${r.pick(LAST)}`, division: d.id, book: `1${pad(di + 1)}${pad(bi + 1)}`,
            address: `House ${r.int(1, 90)}, Road ${r.int(1, 20)}, ${d.name}`, load: r.pick([2, 3, 4, 5]),
            mobile: `01${r.pick([3, 5, 6, 7, 8, 9])}XX-XXX-${r.int(100, 999)}`,
          });
        }
      });
    });

    seed = { qrs: [], history: [] };
    let n = 0;
    A.prepaid.forEach((c) => {
      const count = r.pick([0, 1, 1, 2, 3]);
      for (let k = 0; k < count; k++) {
        const day = U.addDays(A.today, -r.int(0, 80));
        const t = `${day}T${pad(r.int(9, 16))}:${pad(r.int(0, 59))}`;
        const at = t > A.now() ? A.now() : t;
        const q = { id: `QR${day.replace(/-/g, '').slice(2)}${String(++n).padStart(4, '0')}`, account: c.account, amount: r.pick(A.AMOUNTS), at, expires: addHours(at, QR_VALID_H), by: r.pick(STAFF), paid: null };
        const recent = day === A.today;
        if (recent ? r.chance(0.4) : r.chance(0.78)) {
          const pAt = addHours(at, r.int(0, 20));
          q.paid = { at: pAt <= A.now() ? pAt : at, app: r.pick(A.APPS), ref: r.code(10) };
        }
        seed.qrs.push(q);
        seed.history.push({ at, by: q.by, type: 'qr', action: 'Dynamic QR generated', target: c.account, detail: `${c.name} · Book ${c.book} · ${U.raw.tk(q.amount)}` });
      }
    });

    base.months.forEach((ym) => {
      const list = base.bills.filter((b) => b.month === ym);
      seed.history.push({ at: `${ym}-23T22:10`, by: 'Billing Officer · Head Office', type: 'bill-bulk', action: 'Monthly bills generated · Bulk', target: U.monthLabel(ym), detail: `${U.raw.n(list.length)} bills · ${U.raw.tk(list.reduce((s, b) => s + b.total, 0))}` });
    });
    [[-1, '09:04'], [-2, '09:12'], [-4, '10:01']].forEach(([d, tm], i) => seed.history.push({ at: `${U.addDays(A.today, d)}T${tm}`, by: STAFF[i % STAFF.length], type: 'signin', action: 'Signed in', target: 'Admin panel', detail: 'ID & password' }));
    seed.history.push({ at: `${U.addDays(A.today, -3)}T16:40`, by: 'Revenue Officer', type: 'export', action: 'Report exported', target: 'Postpaid reconciliation', detail: `${U.monthLabel(base.months[base.months.length - 1])} · CSV` });
  }

  function index() {
    custByAcc = new Map(base.consumers.map((c) => [c.account, c]));
    prepaidByAcc = new Map(A.prepaid.map((c) => [c.account, c]));
    billsByMonth = new Map();
    base.bills.concat(saved.bills).forEach((b) => {
      if (!billsByMonth.has(b.month)) billsByMonth.set(b.month, new Map());
      billsByMonth.get(b.month).set(b.account, b);
    });
    paysByBill = new Map();
    base.payments.forEach((p) => p.alloc.forEach((a) => { if (!paysByBill.has(a.billNo)) paysByBill.set(a.billNo, []); paysByBill.get(a.billNo).push(p); }));
    qrs = seed.qrs.concat(saved.qrs).sort((a, b) => b.at.localeCompare(a.at));
  }

  /* ---------- Session (demo: any ID and password) ---------- */
  A.login = (id) => { A.session = { id: id || 'admin', at: A.now() }; write(sessionStorage, SKEY, A.session); A.log('signin', 'Signed in', 'Admin panel', 'ID & password'); };
  A.logout = () => { A.session = null; write(sessionStorage, SKEY, null); };
  A.user = () => ({ id: A.session?.id || 'admin', name: `Admin (${A.session?.id || 'admin'})` });

  /* ---------- History ---------- */
  A.log = (type, action, target, detail) => { saved.history.push({ at: A.now(), by: A.user().name, type, action, target, detail }); save(); };
  A.history = () => seed.history.concat(saved.history).map((h, i) => [h, i]).sort((a, b) => b[0].at.localeCompare(a[0].at) || b[1] - a[1]).map(([h]) => h);

  /* ---------- Search ---------- */
  /** Customer ID / meter number (prefix), book no. (exact) or name (contains). "Book 10101" also works. */
  A.search = (list, raw) => {
    const q = String(raw || '').trim().toLowerCase().replace(/^book\s*/, '');
    if (!q) return list;
    return list.filter((c) => c.book === q || c.account.startsWith(q) || (c.meter && c.meter.startsWith(q)) || c.name.toLowerCase().includes(q));
  };

  /* ---------- Postpaid bills ---------- */
  A.customers = () => base.consumers;
  A.customer = (acc) => custByAcc.get(acc);
  A.bill = (acc, ym) => billsByMonth.get(ym)?.get(acc) || null;
  A.billsOf = (ym) => Array.from(billsByMonth.get(ym)?.values() || []);
  A.paymentsForBill = (no) => paysByBill.get(no) || [];
  A.monthStats = (ym) => {
    const bills = A.billsOf(ym);
    return { customers: base.consumers.length, generated: bills.length, pending: base.consumers.length - bills.length, amount: bills.reduce((s, b) => s + b.total, 0) };
  };

  /** Paid / part-paid / unpaid as of the demo date, plus whether the due date has passed. */
  A.billStatus = (b) => {
    if (b.settledOn) return { key: 'paid', label: 'Paid', tone: 'ok', overdue: false };
    const overdue = A.today > b.due;
    if (b.paid > 0) return { key: 'partial', label: 'Part-paid', tone: 'violet', overdue };
    return { key: 'unpaid', label: overdue ? 'Unpaid · overdue' : 'Unpaid', tone: overdue ? 'danger' : 'warn', overdue };
  };

  function makeBill(c, ym, mode) {
    const prev = base.months.slice().reverse().map((m) => A.bill(c.account, m)).find((b) => b && b.month < ym);
    const kwh = Math.max(24, Math.round((prev ? prev.kwh : 150) * (0.92 + (U.hash(c.account + ym) % 17) / 100)));
    const peak = c.tou ? Math.round(kwh * 0.26) : 0;
    const ch = D.calcBill(c.tariff, { kwh, offPeak: c.tou ? kwh - peak : 0, peak, load: c.load, phase: c.phase });
    const [y, m] = ym.split('-').map(Number);
    const issue = A.today;
    const due = U.addDays(issue, D.RATES.dueDays);
    const arrears = A.months.filter((x) => x < ym).map((x) => A.bill(c.account, x)).filter((b) => b && !b.settledOn).reduce((s, b) => s + b.total - b.paid, 0);
    return {
      no: `${pad(m)}${String(y).slice(2)}${c.account}`, account: c.account, month: ym, issue, due,
      dcDate: U.addDays(due, D.RATES.disconnectAfterDue), readDate: U.addDays(issue, -4), prevReadDate: prev ? prev.readDate : U.addDays(issue, -34),
      prevReading: prev ? prev.currReading : 0, currReading: (prev ? prev.currReading : 0) + (kwh - peak), prevPeak: null, currPeak: null,
      kwh, offPeak: kwh - peak, peak,
      energy: ch.energy, demand: ch.demand, subTotal: ch.subTotal, currentDues: ch.currentDues,
      meterRent: ch.meterRent, totalDues: ch.totalDues, vat: ch.vat, total: ch.total, lps: ch.lps,
      paid: 0, settledOn: null, arrears: Math.round(arrears), generatedAt: A.now(), by: A.user().name, mode,
    };
  }

  /** Generate the month's bill for each account that doesn't have one yet. */
  A.generateBills = (ym, accounts, mode) => {
    const created = [];
    let skipped = 0;
    accounts.forEach((acc) => {
      if (A.bill(acc, ym)) { skipped += 1; return; }
      const b = makeBill(A.customer(acc), ym, mode);
      saved.bills.push(b);
      created.push(b);
      if (!billsByMonth.has(ym)) billsByMonth.set(ym, new Map());
      billsByMonth.get(ym).set(acc, b);
    });
    const amount = created.reduce((s, b) => s + b.total, 0);
    if (created.length) {
      const one = created.length === 1 ? A.customer(created[0].account) : null;
      A.log(mode === 'bulk' ? 'bill-bulk' : 'bill-single', `Monthly bills generated · ${mode === 'bulk' ? 'Bulk' : 'Single'}`, one ? one.account : U.monthLabel(ym),
        one ? `${one.name} · ${U.monthLabel(ym)} · ${U.raw.tk(amount)}` : `${U.raw.n(created.length)} bills · ${U.raw.tk(amount)}`);
    } else save();
    return { created, skipped, amount };
  };

  /* ---------- Prepaid dynamic QR ---------- */
  A.prepaidCustomer = (acc) => prepaidByAcc.get(acc);
  A.qrs = () => qrs;
  A.qrsOf = (acc) => qrs.filter((q) => q.account === acc);
  A.qr = (id) => qrs.find((q) => q.id === id);
  A.qrStatus = (q) => (q.paid ? { key: 'paid', label: 'Paid', tone: 'ok' }
    : A.now() > q.expires ? { key: 'expired', label: 'Expired · unpaid', tone: 'neutral' }
      : { key: 'pending', label: 'Awaiting payment', tone: 'warn' });
  A.QR_VALID_H = QR_VALID_H;

  /** QR content. Demo: a link on a reserved example domain. Production: the acquirer's dynamic Bangla QR (EMVCo)
   *  for DESCO's merchant ID [PLACEHOLDER_MERCHANT_ID], carrying this amount and reference. */
  A.qrPayload = (q) => {
    const c = A.prepaidCustomer(q.account);
    return `https://payments.example/desco/prepaid?ref=${q.id}&acc=${c.account}&meter=${c.meter}&amt=${q.amount}`;
  };

  A.generateQR = (acc, amount) => {
    const c = A.prepaidCustomer(acc);
    const at = A.now();
    const q = { id: `QR${A.today.replace(/-/g, '').slice(2)}${String(Date.now() % 1e5).padStart(5, '0')}`, account: acc, amount, at, expires: addHours(at, QR_VALID_H), by: A.user().name, paid: null };
    saved.qrs.push(q);
    qrs.unshift(q);
    A.log('qr', 'Dynamic QR generated', acc, `${c.name} · Book ${c.book} · ${U.raw.tk(amount)}`);
    return q;
  };
})(window.DESCO = window.DESCO || {});
