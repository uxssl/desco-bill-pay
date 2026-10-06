/* Customer-portal state: persistence, mobile-number session, bill status.
 * In production each function maps to an authenticated API call; the browser is never the
 * source of truth for balances, OTPs or payment status. */
(function (D) {
  'use strict';
  const U = D.u;
  const KEY = 'desco.portal.v4';
  const SKEY = 'desco.portal.session';
  const S = (D.store = { state: null, session: null, today: D.DEMO?.asOf || U.today() });

  let byAcc = new Map();
  let billsByAcc = new Map();
  let billByNo = new Map();
  let paysByAcc = new Map();

  const read = (store, k) => { try { return JSON.parse(store.getItem(k)); } catch (e) { return null; } };
  const write = (store, k, v) => { try { v == null ? store.removeItem(k) : store.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } };

  S.init = () => {
    // Demo: always start from the generated dataset so the bill-copy bill is due on every load.
    // Clear anything saved by earlier builds (e.g. a simulated payment) so it can't leak into the demo.
    try { Object.keys(localStorage).filter((k) => k.startsWith('desco.portal.v')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
    S.state = D.generate(S.today);
    S.session = read(sessionStorage, SKEY);
    if (S.session && !S.owner()) S.session = null;
    S.reindex();
  };
  S.save = () => {}; // nothing persists in the demo
  S.reset = () => { write(localStorage, KEY, null); S.state = D.generate(S.today); S.reindex(); S.save(); };

  S.reindex = () => {
    const st = S.state;
    byAcc = new Map(st.consumers.map((c) => [c.account, c]));
    billByNo = new Map(st.bills.map((b) => [b.no, b]));
    billsByAcc = new Map();
    st.bills.forEach((b) => { if (!billsByAcc.has(b.account)) billsByAcc.set(b.account, []); billsByAcc.get(b.account).push(b); });
    billsByAcc.forEach((list) => list.sort((a, b) => b.month.localeCompare(a.month)));
    paysByAcc = new Map();
    st.payments.forEach((p) => { if (!paysByAcc.has(p.account)) paysByAcc.set(p.account, []); paysByAcc.get(p.account).push(p); });
  };

  /* ---------- Lookups ---------- */
  S.consumer = (acc) => byAcc.get(acc);
  S.bill = (no) => billByNo.get(no);
  S.billsOf = (acc) => billsByAcc.get(acc) || [];
  S.paymentsOf = (acc) => paysByAcc.get(acc) || [];
  S.paymentsForBill = (no) => S.paymentsOf(S.bill(no)?.account).filter((p) => p.alloc.some((a) => a.billNo === no));

  /* ---------- Mobile-number session ---------- */
  /** Accepts 01XXXXXXXXX, +8801XXXXXXXXX or 8801XXXXXXXXX (spaces/dashes ignored). Returns 11-digit form or null. */
  S.normalizeMobile = (raw) => {
    const d = String(raw).replace(/[\s-]/g, '').replace(/^\+?88(?=01)/, '');
    return /^01[3-9]\d{8}$/.test(d) ? d : null;
  };
  S.ownerByMobile = (mobile) => S.state.owners.find((o) => o.mobile === mobile);
  S.owner = () => S.session && S.state.owners.find((o) => o.id === S.session.ownerId);
  S.accounts = () => (S.owner()?.accounts || []).map(S.consumer).filter(Boolean);
  S.owns = (acc) => !!S.owner()?.accounts.includes(acc);
  S.nick = (acc) => S.owner()?.nicks?.[acc] || '';

  S.login = (mobile) => {
    const o = S.ownerByMobile(mobile);
    S.session = { ownerId: o.id, at: U.nowStamp() };
    write(sessionStorage, SKEY, S.session);
  };
  S.logout = () => { S.session = null; write(sessionStorage, SKEY, null); };

  /* ---------- Derived status ---------- */
  S.STATUS = {
    paid: { label: 'Paid', tone: 'ok' },
    partial: { label: 'Part-paid', tone: 'violet' },
    due: { label: 'Unpaid', tone: 'info' },
    overdue: { label: 'Overdue', tone: 'warn' },
    critical: { label: 'Disconnection due', tone: 'danger' },
  };

  S.status = (b) => {
    const today = S.today;
    if (b.settledOn) return { key: 'paid', balance: 0, dpd: 0, payable: b.paid, lpsApplied: b.paid > b.total };
    const overdue = today > b.due;
    const payable = b.total + (overdue ? b.lps : 0);
    const balance = Math.max(0, payable - b.paid);
    const dpd = Math.max(0, U.diffDays(today, b.due));
    const key = b.paid > 0 ? 'partial' : !overdue ? 'due' : today > b.dcDate ? 'critical' : 'overdue';
    return { key, balance, dpd, payable, lpsApplied: overdue, critical: today > b.dcDate };
  };

  S.summary = (acc) => {
    const bills = S.billsOf(acc);
    const open = bills.filter((b) => S.status(b).key !== 'paid').slice().sort((a, b) => a.month.localeCompare(b.month));
    const outstanding = open.reduce((s, b) => s + S.status(b).balance, 0);
    const overdue = open.filter((b) => S.status(b).dpd > 0);
    const upcoming = open.filter((b) => S.today <= b.due).sort((a, b) => a.due.localeCompare(b.due))[0] || null;
    const critical = open.find((b) => S.status(b).critical) || null;
    return { bills, open, outstanding, overdue, upcoming, critical, latest: bills[0], lastPayment: S.paymentsOf(acc)[0] || null };
  };

  /* ---------- External payment confirmation ----------
   * Customers pay outside the portal by scanning the bill QR in their MFS / bank app. The gateway notifies
   * DESCO's server (IPN), which validates and settles the bill; the portal only reads the new status.
   * `confirmExternalPayment` stands in for that server-side event in the demo. */
  S.confirmExternalPayment = (billNo, app) => {
    const b = S.bill(billNo);
    const st = S.status(b);
    if (!st.balance) return null;
    b.paid += st.balance;
    b.settledOn = S.today;
    const p = {
      id: `DSC${S.today.replace(/-/g, '').slice(2)}${String(Date.now() % 100000).padStart(5, '0')}`,
      account: b.account, date: S.today, at: U.nowStamp(), amount: st.balance, channel: 'qr', app,
      ref: Math.random().toString(36).slice(2, 12).toUpperCase(), alloc: [{ billNo: b.no, month: b.month, amount: st.balance }],
    };
    S.state.payments.unshift(p);
    S.reindex();
    const c = S.consumer(b.account);
    if (c.dcStage && !S.billsOf(b.account).some((x) => S.status(x).critical)) {
      if (c.dcStage === 'disconnected') c.reconnectPending = true; else c.dcStage = null;
    }
    S.save();
    return p;
  };
})(window.DESCO = window.DESCO || {});
