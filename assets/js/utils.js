/* Shared helpers: dates, money (BDT, lakh grouping), escaping, DOM, CSV. */
(function (D) {
  'use strict';
  const U = (D.u = {});

  const pad = (n) => String(n).padStart(2, '0');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  U.pad = pad;

  /* ---------- Dates (ISO yyyy-mm-dd strings, local time) ---------- */
  U.iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  U.parse = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d || 1); };
  U.today = () => U.iso(new Date());
  U.addDays = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
  U.diffDays = (a, b) => Math.round((U.parse(a) - U.parse(b)) / 864e5);
  U.addMonths = (ym, n) => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };
  U.ym = (s) => s.slice(0, 7);
  U.fmtDate = (s) => { if (!s) return '—'; const d = U.parse(s); return `${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  U.fmtShort = (s) => { const d = U.parse(s); return `${pad(d.getDate())} ${MON[d.getMonth()]}`; };
  U.dmy = (s) => { const d = U.parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  U.fmtTime = (iso) => iso && iso.length > 10 ? iso.slice(11, 16) : '';
  U.monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MON[m - 1]} ${y}`; };
  U.monthShort = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MON[m - 1]} ’${String(y).slice(2)}`; };
  U.monthAbbr = (ym) => MON[Number(ym.split('-')[1]) - 1];
  U.monthLong = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MON_LONG[m - 1].toUpperCase()}, ${y}`; };
  U.nowStamp = () => { const d = new Date(); return `${U.iso(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /** Human due-date phrasing relative to `today`. */
  U.dueText = (due, today) => {
    const d = U.diffDays(due, today);
    if (d > 1) return `Due in ${d} days`;
    if (d === 1) return 'Due tomorrow';
    if (d === 0) return 'Due today';
    return `${-d} day${d === -1 ? '' : 's'} overdue`;
  };

  /* ---------- Money (৳, South-Asian digit grouping) ---------- */
  const nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  U.n = (v) => nf0.format(Math.round(v));
  U.n2 = (v) => nf2.format(v);
  U.tk = (v, dec) => `৳${dec ? nf2.format(v) : nf0.format(Math.round(v))}`;
  U.tkShort = (v) => {
    const a = Math.abs(v);
    if (a >= 1e7) return `৳${(v / 1e7).toFixed(2)} Cr`;
    if (a >= 1e5) return `৳${(v / 1e5).toFixed(2)} L`;
    if (a >= 1e3) return `৳${(v / 1e3).toFixed(1)}K`;
    return U.tk(v);
  };
  U.pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`;

  /* Amount in words, Bangladeshi system (crore / lakh) */
  const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
  const three = (n) => [n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' : '', n % 100 ? two(n % 100) : ''].filter(Boolean).join(' ');
  U.words = (num) => {
    let n = Math.round(Math.abs(num));
    if (!n) return 'Zero';
    const out = [];
    const cr = Math.floor(n / 1e7); n %= 1e7;
    const lk = Math.floor(n / 1e5); n %= 1e5;
    const th = Math.floor(n / 1e3); n %= 1e3;
    if (cr) out.push(U.words(cr) + ' Crore');
    if (lk) out.push(two(lk) + ' Lakh');
    if (th) out.push(two(th) + ' Thousand');
    if (n) out.push(three(n));
    return out.join(' ');
  };

  /* ---------- Strings ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  U.initials = (name) => name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  U.plural = (n, one, many) => `${U.n(n)} ${n === 1 ? one : (many || one + 's')}`;

  /* ---------- DOM ---------- */
  U.$ = (sel, root = document) => root.querySelector(sel);
  U.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  /** Delegated event listener. */
  U.on = (root, type, sel, fn) => root.addEventListener(type, (e) => {
    const t = e.target.closest(sel);
    if (t && root.contains(t)) fn(e, t);
  });
  U.debounce = (fn, ms = 180) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- Export ---------- */
  /** CSV download. Cells that could be read as spreadsheet formulas are neutralised. */
  U.csv = (filename, rows) => {
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  };

  /** Simple stable hash → 32-bit int (for decorative QR, ids). */
  U.hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
})(window.DESCO = window.DESCO || {});
