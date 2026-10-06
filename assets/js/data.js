/* Reference data + deterministic demo dataset.
 * Every consumer, address and transaction here is fictional and generated from a seed.
 * Tariff rates are illustrative — sync with the current BERC tariff order before production use.
 * Payment-gateway credentials (store ID / password) must live server-side only, never in this bundle. */
(function (D) {
  'use strict';
  const U = D.u;
  const pad = U.pad;

  /** Demo-only login settings. Real OTPs are generated, sent by SMS, rate-limited and verified server-side. */
  D.DEMO = {
    otp: '123456', otpTtlSec: 180, resendSec: 30, maxAttempts: 5,
    // Demo "today", set so the sample bill copy (April 2026, due 01/06/2026) is current and unpaid
    asOf: '2026-05-05',
    copyMobile: '01700000000', // fictional sign-in number for the bill-copy account
  };

  /** QR payload. Demo encodes a plain link on a reserved example domain. In production this must be the
   *  dynamic Bangla QR (EMVCo) string issued by the acquirer for DESCO's merchant ID [PLACEHOLDER_MERCHANT_ID]. */
  D.QR = {
    image: 'assets/img/qr.png', // static QR shown on every bill; set to null to generate a per-bill QR from payload()
    card: 'assets/img/bangla-qr.jpg', // full Bangla QR card shown when the customer opens the QR to scan
    payload: (b, amount) => `https://payments.example/desco/bill?no=${b.no}&acc=${b.account}&amt=${amount}`,
    apps: ['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank apps'],
  };

  /* ---------- Tariff & policy ---------- */
  D.TARIFF = {
    'LT-A': {
      id: 'LT-A', code: 'A', label: 'Residential',
      lifeline: { upto: 50, rate: 4.63 },
      slabs: [
        { upto: 75, rate: 5.26 }, { upto: 200, rate: 7.20 }, { upto: 300, rate: 7.59 },
        { upto: 400, rate: 8.02 }, { upto: 600, rate: 12.67 }, { upto: Infinity, rate: 14.61 },
      ],
      demandPerKw: 42,
    },
    'LT-E': {
      id: 'LT-E', code: 'E', label: 'Commercial & Office',
      flat: 12.58, offPeak: 11.32, peak: 15.72,
      demandPerKw: 90,
    },
  };

  D.RATES = {
    vat: 0.05,             // VAT on current dues
    lps: 0.05,             // late payment surcharge on total bill
    meterRent: { 1: 20, 3: 75 },
    dueDays: 30,           // issue → due date
    disconnectAfterDue: 17 // due → disconnection date printed on bill
  };

  D.CHANNELS = [
    { id: 'counter', label: 'DESCO Counter', sub: 'Cash at S&D office', icon: 'building', ref: null },
    { id: 'bank', label: 'Bank Counter', sub: 'Partner bank branch', icon: 'landmark', ref: 'Bank scroll no.' },
    { id: 'bkash', label: 'bKash', sub: 'MFS · Pay Bill', icon: 'phone', ref: 'TrxID' },
    { id: 'nagad', label: 'Nagad', sub: 'MFS · Bill Pay', icon: 'phone', ref: 'TrxID' },
    { id: 'rocket', label: 'Rocket', sub: 'MFS · Bill Pay', icon: 'phone', ref: 'TrxID' },
    { id: 'gateway', label: 'Card / i-Banking', sub: 'Hosted checkout', icon: 'card', ref: null, gateway: true },
  ];
  D.CHANNELS.push(
    { id: 'qr', label: 'QR payment', sub: 'Scanned from bill', icon: 'phone' },
    { id: 'upay', label: 'Upay', sub: 'MFS', icon: 'phone' },
    { id: 'card', label: 'Card', sub: 'Visa · Mastercard · Amex', icon: 'card' },
    { id: 'ibank', label: 'Internet banking', sub: 'Bank account', icon: 'landmark' },
  );
  D.channel = (id) => D.CHANNELS.find((c) => c.id === id) || { id, label: id };

  /** Online methods offered to customers — all settle through the PCI-DSS hosted checkout. */
  D.METHODS = [
    { id: 'bkash', group: 'Mobile banking', label: 'bKash', tone: '#d6246e' },
    { id: 'nagad', group: 'Mobile banking', label: 'Nagad', tone: '#ec6b1f' },
    { id: 'rocket', group: 'Mobile banking', label: 'Rocket', tone: '#8b3fa8' },
    { id: 'upay', group: 'Mobile banking', label: 'Upay', tone: '#0f7bc2' },
    { id: 'card', group: 'Card', label: 'Debit / credit card', sub: 'Visa · Mastercard · Amex', tone: '#162E84' },
    { id: 'ibank', group: 'Internet banking', label: 'Internet banking', sub: 'Pay from your bank account', tone: '#138a8a' },
  ];

  D.DC_STAGES = [
    { id: 'eligible', label: 'Eligible', hint: 'Past disconnection date on bill', next: 'notice', action: 'Issue final notice' },
    { id: 'notice', label: 'Notice issued', hint: 'Final notice served to consumer', next: 'scheduled', action: 'Assign line crew' },
    { id: 'scheduled', label: 'Field scheduled', hint: 'Line crew assigned for cut-off', next: 'disconnected', action: 'Confirm disconnection' },
    { id: 'disconnected', label: 'Disconnected', hint: 'Supply cut off at meter', next: null, action: null },
  ];

  const DIVS = [
    { id: 'GUL', name: 'Gulshan', code: 'GL', day: 24, addr: (r) => `House ${r.int(1, 120)}, Road ${r.int(1, 140)}, Gulshan-${r.pick([1, 2])}` },
    { id: 'BAN', name: 'Banani', code: 'BN', day: 24, addr: (r) => `House ${r.int(1, 90)}/${r.pick(['A', 'B', 'C'])}, Road ${r.int(1, 27)}, Block ${r.pick(['A', 'B', 'C', 'D', 'E', 'F'])}, Banani` },
    { id: 'BAR', name: 'Baridhara', code: 'BD', day: 25, addr: (r) => `House ${r.int(1, 80)}, Lane ${r.int(1, 14)}, Baridhara DOHS` },
    { id: 'UTE', name: 'Uttara East', code: 'UE', day: 25, addr: (r) => `House ${r.int(1, 70)}, Road ${r.int(1, 22)}, Sector ${r.pick([1, 3, 4, 5, 6, 7])}, Uttara` },
    { id: 'UTW', name: 'Uttara West', code: 'UW', day: 26, addr: (r) => `House ${r.int(1, 70)}, Road ${r.int(1, 18)}, Sector ${r.pick([9, 10, 11, 12, 13, 14])}, Uttara` },
    { id: 'MIR', name: 'Mirpur', code: 'MR', day: 26, addr: (r) => `Plot ${r.int(1, 40)}, Road ${r.int(1, 12)}, Section ${r.pick([2, 6, 10, 11])}, Mirpur` },
    { id: 'PAL', name: 'Pallabi', code: 'PL', day: 27, addr: (r) => `House ${r.int(1, 60)}, Road ${r.int(1, 9)}, Block ${r.pick(['A', 'B', 'C', 'D'])}, Pallabi, Mirpur-12` },
    { id: 'KAF', name: 'Kafrul', code: 'KF', day: 27, addr: (r) => `${r.int(100, 980)}/${r.int(1, 9)}, East Kafrul` },
    { id: 'AGA', name: 'Agargaon', code: 'AG', day: 24, addr: (r) => `${r.int(1, 60)} West Agargaon, Sher-e-Bangla Nagar` },
    { id: 'JOA', name: 'Joarsahara', code: 'JS', day: 25, addr: (r) => `Ka-${r.int(10, 240)}, Kuril, Joar Sahara` },
  ];
  D.DIVISIONS = DIVS.map(({ id, name, code }) => ({ id, name, code }));
  D.DIVISIONS.push({ id: 'IBR', name: 'Ibrahimpur', code: 'IB' });
  D.division = (id) => D.DIVISIONS.find((d) => d.id === id);

  /* ---------- Bill calculation ---------- */
  const r2 = (v) => Math.round(v * 100) / 100;

  D.calcBill = function (tariffId, { kwh, offPeak = 0, peak = 0, load, phase }) {
    const t = D.TARIFF[tariffId];
    const lines = [];
    let energy = 0;
    if (t.slabs) {
      if (kwh <= t.lifeline.upto) {
        energy = kwh * t.lifeline.rate;
        lines.push({ label: `Lifeline 0–${t.lifeline.upto}`, units: kwh, rate: t.lifeline.rate, amount: energy });
      } else {
        let prev = 0;
        for (const s of t.slabs) {
          if (kwh <= prev) break;
          const u = Math.min(kwh, s.upto) - prev;
          energy += u * s.rate;
          lines.push({ label: s.upto === Infinity ? `${prev + 1}+` : `${prev + 1}–${s.upto}`, units: u, rate: s.rate, amount: u * s.rate });
          prev = s.upto;
        }
      }
    } else if (offPeak || peak) {
      energy = offPeak * t.offPeak + peak * t.peak;
      lines.push({ label: 'Off-peak', units: offPeak, rate: t.offPeak, amount: offPeak * t.offPeak });
      lines.push({ label: 'Peak (17:00–23:00)', units: peak, rate: t.peak, amount: peak * t.peak });
    } else {
      energy = kwh * t.flat;
      lines.push({ label: 'Flat rate', units: kwh, rate: t.flat, amount: energy });
    }
    energy = r2(energy);
    const demand = r2(load * t.demandPerKw);
    const subTotal = r2(energy + demand);
    const currentDues = subTotal; // + service, supplementary, adjustment (0 in demo)
    const meterRent = D.RATES.meterRent[phase] || 0;
    const totalDues = Math.round(currentDues + meterRent);
    const vat = Math.round(totalDues * D.RATES.vat); // VAT on total bill incl. meter rent, as printed
    const total = totalDues + vat;
    const lps = Math.round(total * D.RATES.lps);
    return { energy, demand, subTotal, currentDues, meterRent, totalDues, vat, total, lps, lines };
  };

  /* ---------- Seeded generator ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      float: (lo, hi) => lo + next() * (hi - lo),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      weighted: (pairs) => { let x = next() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { if ((x -= w) < 0) return v; } return pairs[0][0]; },
      code: (n) => Array.from({ length: n }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(next() * 32)]).join(''),
    };
  }

  const FIRST_M = ['Rafiqul', 'Mahbub', 'Tanvir', 'Shahidul', 'Kamrul', 'Anisur', 'Faisal', 'Nazmul', 'Jahid', 'Rezaul', 'Sohel', 'Imran', 'Arif', 'Habibur', 'Mizanur', 'Saiful', 'Touhid', 'Asif', 'Nafis', 'Rashed', 'Mostafa', 'Ziaul'];
  const FIRST_F = ['Nasrin', 'Shirin', 'Farhana', 'Rokeya', 'Sabina', 'Nusrat', 'Sharmin', 'Lubna', 'Rumana', 'Jesmin', 'Afroza', 'Dilruba', 'Salma', 'Moushumi', 'Kohinoor', 'Sultana'];
  const LAST_M = ['Rahman', 'Hossain', 'Islam', 'Ahmed', 'Chowdhury', 'Karim', 'Uddin', 'Haque', 'Sarker', 'Talukder', 'Khan', 'Siddique', 'Alam', 'Kabir', 'Bhuiyan', 'Majumder'];
  const LAST_F = ['Akter', 'Begum', 'Rahman', 'Islam', 'Khatun', 'Haque', 'Chowdhury', 'Sultana', 'Parvin', 'Ahmed'];
  const BUSINESS = ['Nobanno Traders', 'Shapla Pharmacy', 'Nova Fashion House', 'Green Leaf Restaurant', 'Prime Care Diagnostic', 'Sonali Hardware', 'City Tailors & Fabrics', 'Moyna General Store', 'Apex Printing Press', 'Dristi Optical Point', 'Fresh Basket Super Shop', 'Star Electronics', 'Kadam Furniture', 'Meghna Tech Solutions', 'Padma Sweets', 'Rangdhanu Kids School', 'Bokul Beauty Parlour', 'Doel Courier Point', 'Shonar Tori Cafe', 'Karnaphuli Motors', 'Jamuna Book Corner', 'Surma Dental Care', 'Teesta Hostel', 'Agami Coaching Centre', 'Neel Akash Studio', 'Kashful Bakery', 'Sabuj Bangla Clinic', 'Amrita Garments Outlet'];

  // Relative kWh by calendar month (Dhaka load profile: summer peak)
  const SEASON = [0.78, 0.74, 0.92, 1.16, 1.32, 1.38, 1.36, 1.34, 1.3, 1.12, 0.92, 0.8];
  const CHANNEL_MIX = [['bkash', 34], ['gateway', 20], ['bank', 16], ['nagad', 14], ['counter', 10], ['rocket', 6]];

  D.generate = function (asOf) {
    const r = rng(20261006);
    const t = U.parse(asOf);
    let latest = `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
    if (t.getDate() < 28) latest = U.addMonths(latest, -1);
    const months = Array.from({ length: 12 }, (_, i) => U.addMonths(latest, i - 11));

    const consumers = [];
    const bills = [];
    const payments = [];
    const used = new Set();
    let biz = 0;
    let txnSeq = 0;

    const mkRef = (ch) => ch === 'counter' ? `CTR-${r.int(100000, 999999)}`
      : ch === 'bank' ? `SCR-${r.int(1000000, 9999999)}`
        : ch === 'gateway' ? `VAL${r.code(11)}`
          : r.code(10);
    const pay = (c, b, date, amount) => {
      const ch = c.prefChannel && r.chance(0.75) ? c.prefChannel : r.weighted(CHANNEL_MIX);
      const at = `${date}T${pad(r.int(8, 21))}:${pad(r.int(0, 59))}`;
      const p = {
        id: `DSC${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}${String(++txnSeq).padStart(5, '0')}`,
        account: c.account, date, at, amount, channel: ch, ref: mkRef(ch),
        alloc: [{ billNo: b.no, month: b.month, amount }], by: ch === 'counter' ? 'Counter-03' : 'Auto-reconciled',
      };
      payments.push(p);
      return p;
    };

    const N = 96;
    for (let i = 0; i < N; i++) {
      const div = DIVS[(i * 7 + r.int(0, 3)) % DIVS.length];
      const commercial = r.chance(0.24);
      let account;
      do { account = String(r.int(30000000, 39999999)); } while (used.has(account));
      used.add(account);
      const female = r.chance(0.42);
      const name = commercial
        ? BUSINESS[biz++ % BUSINESS.length]
        : `${r.pick(female ? FIRST_F : FIRST_M)} ${r.pick(female ? LAST_F : LAST_M)}`;
      const phase = commercial ? (r.chance(0.6) ? 3 : 1) : (r.chance(0.12) ? 3 : 1);
      const tariff = commercial ? 'LT-E' : 'LT-A';
      const tou = commercial && phase === 3;
      const load = commercial ? r.pick([5, 8, 10, 15, 20]) : r.pick([2, 2, 3, 3, 4, 5, 6]);
      const base = commercial ? r.int(380, 1350) : r.int(90, 430);
      const profile = r.weighted([['regular', 52], ['late', 20], ['arrears', 18], ['partial', 10]]);

      const c = {
        account,
        oldAccount: String(r.int(1000000, 1999999)),
        meter: String(r.int(1000, 999999)).padStart(6, '0'),
        name,
        type: commercial ? 'Commercial' : 'Residential',
        tariff, phase, load, tou,
        division: div.id,
        zone: `${div.code} / ${r.int(101, 148)}`,
        walkingOrder: `${r.int(100, 2400)}.00`,
        address: div.addr(r),
        mobile: `01${r.pick([3, 5, 6, 7, 8, 9])}XX-XXX-${String(r.int(0, 999)).padStart(3, '0')}`,
        meterType: tou ? 'Digital TOU · 3φ' : `Digital · ${phase}φ`,
        connectedOn: `${r.int(1998, 2021)}-${pad(r.int(1, 12))}-${pad(r.int(1, 28))}`,
        profile,
        prefChannel: r.chance(0.6) ? r.weighted(CHANNEL_MIX) : null,
        dcStage: null,
        status: 'Active',
        notes: [],
      };
      consumers.push(c);

      let reg = r.int(4000, 42000);
      let regPeak = r.int(900, 9000);
      const stopAt = profile === 'arrears' ? 12 - r.int(2, 7) : 99;
      const mine = [];

      months.forEach((ym, mi) => {
        const [y, m] = ym.split('-').map(Number);
        const kwh = Math.max(24, Math.round(base * SEASON[m - 1] * r.float(0.86, 1.14)));
        let offPeak = kwh;
        let peak = 0;
        if (tou) { peak = Math.round(kwh * r.float(0.22, 0.3)); offPeak = kwh - peak; }
        const ch = D.calcBill(tariff, { kwh, offPeak: tou ? offPeak : 0, peak, load, phase });
        const issue = `${ym}-${pad(div.day)}`;
        const due = U.addDays(issue, D.RATES.dueDays);
        const readDate = `${ym}-${pad(div.day - 4)}`;
        const prevReadDate = U.addDays(`${U.addMonths(ym, -1)}-${pad(div.day - 4)}`, -1);
        const prevReading = reg; reg += offPeak;
        const prevPeak = regPeak; if (tou) regPeak += peak;

        const b = {
          no: `${pad(m)}${String(y).slice(2)}${account}`,
          account, month: ym, issue, due,
          dcDate: U.addDays(due, D.RATES.disconnectAfterDue),
          readDate, prevReadDate,
          prevReading, currReading: reg,
          prevPeak: tou ? prevPeak : null, currPeak: tou ? regPeak : null,
          kwh, offPeak, peak,
          energy: ch.energy, demand: ch.demand, subTotal: ch.subTotal, currentDues: ch.currentDues,
          meterRent: ch.meterRent, totalDues: ch.totalDues, vat: ch.vat, total: ch.total, lps: ch.lps,
          paid: 0, settledOn: null, arrears: 0,
        };

        let payDate = null;
        if (profile === 'regular') payDate = U.addDays(issue, r.int(3, 27));
        else if (profile === 'late') payDate = r.chance(0.65) ? U.addDays(due, r.int(2, 15)) : U.addDays(issue, r.int(10, 29));
        else if (profile === 'arrears') payDate = mi < stopAt ? U.addDays(due, r.int(-14, 9)) : null;
        else payDate = U.addDays(issue, r.int(8, 40));

        if (payDate && payDate <= asOf) {
          const payable = b.total + (payDate > due ? b.lps : 0);
          const partial = profile === 'partial' && mi >= 8 && r.chance(0.5);
          const amount = partial ? Math.round(payable * r.float(0.4, 0.8)) : payable;
          pay(c, b, payDate, amount);
          b.paid = amount;
          b._pd = payDate;
          if (amount >= payable) b.settledOn = payDate;
        }
        mine.push(b);
        bills.push(b);
      });

      // Arrears carried on each bill = what was still unpaid on earlier bills at issue time
      mine.forEach((b, j) => {
        let arr = 0;
        for (let k = 0; k < j; k++) {
          const o = mine[k];
          if (!o.settledOn || o.settledOn > b.issue) arr += o.total - (o._pd && o._pd <= b.issue ? o.paid : 0);
        }
        b.arrears = Math.max(0, Math.round(arr));
      });
      mine.forEach((b) => delete b._pd);

      // Enforcement stage for accounts past the disconnection date
      const oldestOpen = mine.find((b) => !b.settledOn);
      if (oldestOpen && oldestOpen.dcDate < asOf) {
        const monthsOpen = mine.filter((b) => !b.settledOn).length;
        c.dcStage = monthsOpen >= 4
          ? r.weighted([['scheduled', 2], ['disconnected', 3], ['notice', 1]])
          : r.weighted([['eligible', 5], ['notice', 3], ['scheduled', 1]]);
        if (c.dcStage === 'disconnected') c.status = 'Disconnected';
      }
    }

    payments.sort((a, b) => b.at.localeCompare(a.at));

    const audit = [];
    const log = (at, user, action, target, detail) => audit.push({ id: `A${audit.length + 1}`, at, user, action, target, detail });
    months.slice(-3).forEach((ym) => {
      const n = bills.filter((b) => b.month === ym).length;
      log(`${ym}-${pad(27)}T23:40`, 'Billing Engine', 'Bill batch generated', U.monthLabel(ym), `${n} bills issued across ${DIVS.length} S&D divisions`);
    });
    const staged = consumers.filter((c) => c.dcStage && c.dcStage !== 'eligible').slice(0, 6);
    staged.forEach((c, i) => {
      const st = D.DC_STAGES.find((s) => s.id === c.dcStage);
      log(`${U.addDays(asOf, -(i + 1))}T${pad(10 + i)}:15`, 'Field Ops · Mirpur', 'Disconnection stage updated', c.account, `Moved to “${st.label}”`);
    });
    log(`${U.addDays(asOf, -1)}T06:00`, 'Reconciliation Job', 'Gateway settlement reconciled', 'Hosted checkout', 'All IPN-validated transactions matched to bank settlement file');
    log(`${asOf}T09:02`, 'Revenue Officer', 'Signed in', 'Session', 'MFA verified · IP logged');
    audit.sort((a, b) => b.at.localeCompare(a.at));

    // Group accounts under customer profiles — one mobile login can hold several accounts (home, shop…)
    const r3 = rng(777);
    const owners = [];
    for (let i = 0; i < consumers.length;) {
      const size = Math.min(consumers.length - i, r3.weighted([[1, 58], [2, 32], [3, 10]]));
      const group = consumers.slice(i, i + size);
      i += size;
      const female = r3.chance(0.42);
      const person = group.find((c) => c.type === 'Residential')?.name || `${r3.pick(female ? FIRST_F : FIRST_M)} ${r3.pick(female ? LAST_F : LAST_M)}`;
      const id = `C${String(owners.length + 1).padStart(5, '0')}`;
      // Fictional, test-pattern numbers (01X00NNNNNN). Never shown unmasked outside the demo sign-in hint.
      const mobile = `01${r3.pick([3, 5, 6, 7, 8, 9])}00${String(owners.length + 1).padStart(6, '0')}`;
      const masked = `${mobile.slice(0, 3)}XX-XXX-${mobile.slice(-3)}`;
      const nicks = {};
      const seen = {};
      group.forEach((c) => {
        c.owner = id;
        c.mobile = masked;
        if (c.type === 'Residential') c.name = person;
        seen[c.type] = (seen[c.type] || 0) + 1;
        const base = c.type === 'Residential' ? 'Home' : 'Shop';
        nicks[c.account] = seen[c.type] === 1 ? base : `${base} ${seen[c.type]}`;
      });
      owners.push({
        id, name: person, mobile, email: '',
        accounts: group.map((c) => c.account), nicks,
        prefs: { smsDue: true, smsPaid: true, ebill: false },
        activity: [],
      });
    }

    addBillCopyAccount({ months, consumers, bills, payments, owners, asOf });

    return {
      v: 4,
      owners,
      asOf,
      months,
      consumers,
      bills,
      payments,
      reminders: [],
      audit,
      user: { name: 'Revenue Officer', role: 'Accounts · Gulshan S&D' },
    };
  };

  /* ---------- Account behind the supplied bill copy (assets/img/bill-copy.jpg) ----------
   * Its April 2026 bill reproduces the printed figures exactly; earlier months are generated and paid. */
  function addBillCopyAccount({ months, consumers, bills, payments, owners }) {
    const c = {
      account: '10000001', oldAccount: 'CK0000001', meter: '600000000001',
      name: 'Demo Customer', type: 'Residential', tariff: 'LT-A', phase: 1, load: 2, tou: false,
      division: 'IBR', zone: 'IBDP / 000', walkingOrder: '0000.00', address: '1, Demo Road, Kafrul, Dhaka',
      mobile: `${D.DEMO.copyMobile.slice(0, 3)}XX-XXX-${D.DEMO.copyMobile.slice(-3)}`, meterType: 'Digital · 1φ',
      connectedOn: '2009-03-14', profile: 'regular', dcStage: null, status: 'Active', notes: [], owner: 'C00000',
    };
    const KWH = [212, 168, 154, 149, 176, 230, 248, 262, 241, 236, 251, 280];
    let reg = 36912 - KWH.reduce((a, k) => a + k, 0);
    months.forEach((ym, i) => {
      const [y, m] = ym.split('-').map(Number);
      const kwh = KWH[i % KWH.length];
      const ch = D.calcBill('LT-A', { kwh, load: c.load, phase: c.phase });
      const issue = `${ym}-26`;
      const due = U.addDays(issue, D.RATES.dueDays);
      const prevReading = reg; reg += kwh;
      const b = {
        no: `${pad(m)}${String(y).slice(2)}${c.account}`, account: c.account, month: ym, issue, due,
        dcDate: U.addDays(due, D.RATES.disconnectAfterDue), readDate: `${ym}-08`, prevReadDate: U.addDays(`${ym}-08`, -33),
        prevReading, currReading: reg, prevPeak: null, currPeak: null, kwh, offPeak: kwh, peak: 0,
        energy: ch.energy, demand: ch.demand, subTotal: ch.subTotal, currentDues: ch.currentDues,
        meterRent: ch.meterRent, totalDues: ch.totalDues, vat: ch.vat, total: ch.total, lps: ch.lps,
        paid: 0, settledOn: null, arrears: 0,
      };
      if (i === months.length - 1) {
        // The printed bill: April 2026 · 280 kWh · ৳2,106 (৳2,211 after due date)
        Object.assign(b, { issue: '2026-04-26', due: '2026-06-01', dcDate: '2026-06-16', readDate: '2026-04-08', prevReadDate: '2026-03-06', image: 'assets/img/bill-copy.jpg' });
      } else {
        const date = U.addDays(issue, 12 + (i % 9));
        b.paid = b.total; b.settledOn = date;
        payments.push({
          id: `DSC${date.slice(2).replace(/-/g, '')}9${String(i).padStart(4, '0')}`, account: c.account, date, at: `${date}T${pad(10 + (i % 9))}:2${i % 10}`,
          amount: b.total, channel: i % 3 ? 'bkash' : 'nagad', ref: `CPY${String(7300 + i * 37)}`, alloc: [{ billNo: b.no, month: ym, amount: b.total }],
        });
      }
      bills.push(b);
    });
    consumers.push(c);
    payments.sort((a, b) => b.at.localeCompare(a.at));
    owners.unshift({
      id: 'C00000', name: c.name, mobile: D.DEMO.copyMobile, email: '', accounts: [c.account], nicks: { [c.account]: 'Home' },
      prefs: { smsDue: true, smsPaid: true, ebill: false }, activity: [],
    });
  }
})(window.DESCO = window.DESCO || {});
