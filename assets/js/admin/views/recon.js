/* Reconciliation & report: what was generated and whether it was paid.
 *   Postpaid: a month's bills — paid / part-paid / unpaid, plus customers with no bill generated yet.
 *   Prepaid:  every dynamic QR — paid / awaiting payment / expired unpaid. CSV export of the filtered rows.
 * Rows that need attention sort first; the summary cards double as filters. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;
  const DEFAULT_SORT = { postpaid: { key: 'status', dir: 'asc' }, prepaid: { key: 'at', dir: 'desc' } };
  const st = { tab: 'postpaid', ym: null, status: 'all', q: '', page: 1, days: 30, sort: { ...DEFAULT_SORT.postpaid }, appliedHash: null };
  const PER = 15;
  const TEXT_KEYS = ['name', 'book', 'id', 'status'];

  const statusChips = (opts, counts) => `
    <div class="flex flex-wrap gap-2" role="group" aria-label="Filter by status">${opts.map(([k, l]) => `<button class="chip" data-status="${k}" aria-pressed="${st.status === k}">${l}<span class="chip-count num">${U.n(counts[k] || 0)}</span></button>`).join('')}</div>`;

  const searchBox = (ph) => `
    <form class="relative w-full sm:w-80" data-search role="search">
      <label class="sr-only" for="rc-q">${ph}</label>
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">${UI.icon('search')}</span>
      <input id="rc-q" class="input num pl-9 pr-9" placeholder="${ph}" value="${U.esc(st.q)}" autocomplete="off">
      ${st.q ? `<button type="button" class="btn btn-ghost btn-icon btn-xs absolute right-1.5 top-1/2 -translate-y-1/2" data-clear aria-label="Clear search">${UI.icon('x')}</button>` : ''}
    </form>`;

  /** One summary card: how much came in out of what was issued, split by status, plus a breakdown on the side. */
  const summary = ({ label, value, of, rate, rateLabel, rateTone = '', segs, note = '', side = null }) => {
    const total = segs.reduce((t, x) => t + x.bar, 0) || 1;
    const sideTotal = side ? side.items.reduce((t, [, v]) => t + v, 0) || 1 : 1;
    return `
      <section class="card grid overflow-hidden lg:grid-cols-[1.55fr_1fr]">
        <div class="p-5 sm:p-6">
          <div class="flex items-end justify-between gap-4">
            <div class="min-w-0">
              <div class="text-xs font-medium text-ink-3">${label}</div>
              <div class="mt-1 text-[26px] font-semibold leading-tight tracking-tight"><span class="num">${value}</span> <span class="text-[15px] font-normal text-ink-3">of <span class="num">${of}</span></span></div>
            </div>
            <div class="shrink-0 text-right"><div class="num text-[26px] font-semibold leading-tight ${rateTone}">${rate}</div><div class="text-xs text-ink-3">${rateLabel}</div></div>
          </div>
          <div class="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
            ${segs.filter((x) => x.bar > 0).map((x) => `<span class="${x.color}" style="width:${((x.bar / total) * 100).toFixed(2)}%"></span>`).join('')}
          </div>
          <dl class="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
            ${segs.map((x) => `
              <div class="flex gap-2.5">
                <span class="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-sm ${x.color}" aria-hidden="true"></span>
                <div class="min-w-0">
                  <dt class="text-xs text-ink-3">${x.label}</dt>
                  <dd class="mt-0.5 text-[13.5px]"><b class="num font-semibold">${U.n(x.count)}</b> <span class="text-ink-3">·</span> <span class="num text-ink-2">${U.tk(x.amount)}</span></dd>
                  ${x.sub ? `<div class="text-[11.5px] text-ink-3">${x.sub}</div>` : ''}
                </div>
              </div>`).join('')}
          </dl>
          ${note}
        </div>
        ${side ? `
          <div class="border-t border-line bg-surface-2/60 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div class="mb-3.5 text-xs font-medium text-ink-3">${side.title}</div>
            ${side.items.length ? `<ul class="space-y-3">
              ${side.items.sort((a, b) => b[1] - a[1]).map(([l, v]) => `
                <li class="text-[13px]">
                  <div class="mb-1 flex items-baseline justify-between gap-3"><span class="text-ink-2">${U.esc(l)}</span><span class="num font-medium">${U.tk(v)}</span></div>
                  ${UI.meterBar(v / sideTotal)}
                </li>`).join('')}
            </ul>` : '<p class="text-[13px] text-ink-3">No payments yet.</p>'}
          </div>` : ''}
      </section>`;
  };

  const sortRows = (rows, get) => {
    const g = get[st.sort.key];
    return g ? UI.sortBy(rows, g, st.sort.dir) : rows;
  };

  /* ---------- Postpaid ---------- */
  const RANK = { unpaid: 1, partial: 2, missing: 3, paid: 4 };
  function postpaidRows(ym) {
    return A.customers().map((c) => {
      const base = { c, account: c.account, book: c.book, name: c.name };
      const b = A.bill(c.account, ym);
      if (!b) return { ...base, b: null, key: 'missing', label: 'Not generated', tone: 'neutral', billed: 0, paid: 0, due: 0, pay: null, rank: RANK.missing };
      const s = A.billStatus(b);
      const pays = A.paymentsForBill(b.no);
      return { ...base, b, key: s.key, label: s.label, tone: s.tone, overdue: s.overdue, billed: b.total, paid: b.paid, due: s.key === 'paid' ? 0 : b.total - b.paid, pay: pays[pays.length - 1] || null, rank: RANK[s.key] - (s.overdue ? 0.5 : 0) };
    });
  }

  function postpaid() {
    const ym = st.ym;
    const all = postpaidRows(ym);
    const counts = all.reduce((o, r) => { o[r.key] = (o[r.key] || 0) + 1; return o; }, { all: all.length });
    const gen = all.filter((r) => r.b);
    const sum = (rows, f) => rows.reduce((s, r) => s + f(r), 0);
    const billed = sum(gen, (r) => r.billed);
    const collected = sum(gen, (r) => r.paid);
    const channels = {};
    gen.forEach((r) => { if (r.pay) channels[r.pay.channel] = (channels[r.pay.channel] || 0) + r.paid; });

    let rows = A.search(all, st.q.replace(/^\d{12}$/, (n) => n.slice(4))); // a bill number ends with the Customer ID
    if (st.status !== 'all') rows = rows.filter((r) => r.key === st.status);
    // Default order: overdue unpaid → unpaid → part-paid → not generated → paid; biggest balance first within each
    rows = sortRows(rows, { status: (r) => r.rank * 1e9 - r.due, name: (r) => r.name, book: (r) => r.book, billed: (r) => r.billed, paid: (r) => r.paid });

    const paidRows = gen.filter((r) => r.key === 'paid');
    const partRows = gen.filter((r) => r.key === 'partial');
    const paidAmt = sum(paidRows, (r) => Math.min(r.paid, r.billed));
    const partAmt = sum(partRows, (r) => r.paid);
    const body = summary({
      label: `Collected for ${U.monthLabel(ym)} bills`, value: U.tk(collected), of: U.tk(billed),
      rate: U.pct(billed ? collected / billed : 0, 1), rateLabel: 'collection rate', rateTone: billed && collected / billed >= 0.8 ? 'text-ok' : '',
      segs: [
        { label: 'Paid', count: paidRows.length, amount: sum(paidRows, (r) => r.paid), bar: paidAmt, color: 'bg-ok' },
        { label: 'Part-paid', count: partRows.length, amount: partAmt, bar: partAmt, color: 'bg-violet', sub: partRows.length ? `${U.tk(sum(partRows, (r) => r.due))} still due` : '' },
        { label: 'Unpaid', count: counts.unpaid || 0, amount: sum(gen.filter((r) => r.key === 'unpaid'), (r) => r.due), bar: Math.max(0, billed - paidAmt - partAmt), color: 'bg-danger', sub: (counts.unpaid || 0) ? `${U.n(gen.filter((r) => r.key === 'unpaid' && r.overdue).length)} past the due date` : '' },
      ],
      note: counts.missing ? `<div class="mt-5 flex flex-col gap-2 rounded-lg bg-info-soft px-3.5 py-2.5 text-[13px] text-info sm:flex-row sm:items-center"><span class="flex-1">${U.plural(counts.missing, 'customer')} ${counts.missing === 1 ? 'has' : 'have'} no ${U.monthLabel(ym)} bill yet.</span><a href="#/bills" class="btn btn-secondary btn-sm">${UI.icon('layers')}Go to Bill Generation</a></div>` : '',
      side: { title: 'Collected by channel', items: Object.entries(channels).map(([ch, v]) => [D.channel(ch).label, v]) },
    });

    const s = st.sort;
    const table = `
      ${st.status === 'missing' ? `<div class="flex flex-col gap-2 border-b border-line bg-info-soft px-4 py-3 text-[13px] text-info sm:flex-row sm:items-center"><span class="flex-1">These customers have no ${U.monthLabel(ym)} bill yet.</span><a href="#/bills" class="btn btn-primary btn-sm">${UI.icon('layers')}Go to Bill Generation</a></div>` : ''}
      <div class="scroll-thin overflow-x-auto">
        <table class="tbl tbl-stack">
          <thead><tr>${UI.th('name', 'Customer', s)}${UI.th('book', 'Book', s)}<th>Bill number</th>${UI.th('billed', 'Billed', s, 'r')}${UI.th('paid', 'Paid', s, 'r')}${UI.th('status', 'Status', s)}<th>Payment</th></tr></thead>
          <tbody>
            ${rows.slice((st.page - 1) * PER, st.page * PER).map((r) => `<tr>
              <td class="c-main" data-label="Customer">${D.cell(U.esc(r.c.name), `<span class="num">${r.c.account}</span>`)}</td>
              <td class="num text-ink-2" data-label="Book">${r.c.book}</td>
              <td class="num text-ink-2" data-label="Bill number">${r.b ? r.b.no : '—'}</td>
              <td class="num r" data-label="Billed">${r.b ? U.tk(r.billed) : '—'}</td>
              <td class="num r" data-label="Paid">${r.b ? `<span class="${r.paid ? 'font-medium' : 'text-ink-3'}">${U.tk(r.paid)}</span>` : '—'}</td>
              <td data-label="Status">${UI.badge(r.label, r.tone)}</td>
              <td data-label="Payment">${r.pay
                ? D.cell(`${U.fmtDate(r.pay.date)} · ${U.esc(D.channel(r.pay.channel).label)}`, `<span class="num">${U.esc(r.pay.ref)}</span>${r.b && r.key !== 'paid' ? ` · ${U.tk(r.due)} left` : ''}`)
                : r.b ? `<span class="text-xs ${r.overdue ? 'font-medium text-danger' : 'text-ink-3'}">${r.overdue ? `Overdue since ${U.fmtShort(r.b.due)}` : `Due ${U.fmtShort(r.b.due)}`}</span>` : '<span class="text-ink-3">—</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    return {
      head: `<div class="flex items-center gap-2.5"><span class="text-xs font-medium text-ink-3">Bill month</span>${D.monthPicker(ym, 'data-rym')}</div>`,
      body,
      chips: statusChips([['all', 'All'], ['unpaid', 'Unpaid'], ['partial', 'Part-paid'], ['paid', 'Paid'], ['missing', 'Not generated']], counts),
      search: searchBox('Search customer, book or bill number'),
      rows, table,
      csv: () => [['Customer ID', 'Name', 'Book', 'Bill month', 'Bill number', 'Billed (BDT)', 'Paid (BDT)', 'Balance (BDT)', 'Status', 'Due date', 'Paid on', 'Channel', 'Reference']]
        .concat(rows.map((r) => [r.c.account, r.c.name, r.c.book, U.monthLabel(ym), r.b?.no || '', r.b ? r.billed : '', r.b ? r.paid : '', r.b ? r.due : '', r.label, r.b?.due || '', r.pay?.date || '', r.pay ? D.channel(r.pay.channel).label : '', r.pay?.ref || ''])),
      file: `DESCO-postpaid-reconciliation-${ym}.csv`,
      what: `Postpaid reconciliation · ${U.monthLabel(ym)}`,
    };
  }

  /* ---------- Prepaid ---------- */
  const QR_RANK = { pending: 1, expired: 2, paid: 3 };
  function prepaid() {
    const from = st.days ? U.addDays(A.today, -(st.days - 1)) : '';
    const all = A.qrs().filter((q) => q.at.slice(0, 10) >= from).map((q) => {
      const c = A.prepaidCustomer(q.account);
      const s = A.qrStatus(q);
      return { q, c, key: s.key, label: s.label, tone: s.tone, account: c.account, book: c.book, name: c.name, meter: c.meter, id: q.id };
    });
    const counts = all.reduce((o, r) => { o[r.key] = (o[r.key] || 0) + 1; return o; }, { all: all.length });
    const amt = (k) => all.filter((r) => !k || r.key === k).reduce((s, r) => s + r.q.amount, 0);
    const ql = st.q.trim().toUpperCase();
    let rows = ql.startsWith('QR') ? all.filter((r) => r.q.id.startsWith(ql)) : A.search(all, st.q);
    if (st.status !== 'all') rows = rows.filter((r) => r.key === st.status);
    rows = sortRows(rows, { at: (r) => r.q.at, id: (r) => r.q.id, name: (r) => r.name, amount: (r) => r.q.amount, status: (r) => `${QR_RANK[r.key]}${r.q.at}` });

    const apps = {};
    all.forEach((r) => { if (r.q.paid) apps[r.q.paid.app] = (apps[r.q.paid.app] || 0) + r.q.amount; });
    const body = summary({
      label: 'Received through prepaid QR', value: U.tk(amt('paid')), of: U.tk(amt()),
      rate: U.pct(all.length ? (counts.paid || 0) / all.length : 0, 0), rateLabel: `of ${U.plural(all.length, 'QR')} paid`,
      segs: [
        { label: 'Paid', count: counts.paid || 0, amount: amt('paid'), bar: amt('paid'), color: 'bg-ok' },
        { label: 'Awaiting payment', count: counts.pending || 0, amount: amt('pending'), bar: amt('pending'), color: 'bg-warn', sub: counts.pending ? 'QR still valid' : '' },
        { label: 'Expired · unpaid', count: counts.expired || 0, amount: amt('expired'), bar: amt('expired'), color: 'bg-ink-3/40', sub: counts.expired ? 'Customer may need a new QR' : '' },
      ],
      side: { title: 'Paid by app', items: Object.entries(apps) },
    });

    const s = st.sort;
    const table = `
      <div class="scroll-thin overflow-x-auto">
        <table class="tbl tbl-stack">
          <thead><tr>${UI.th('name', 'Customer', s)}${UI.th('id', 'QR reference', s)}${UI.th('at', 'Generated', s)}${UI.th('amount', 'Amount', s, 'r')}${UI.th('status', 'Status', s)}<th>Payment</th></tr></thead>
          <tbody>
            ${rows.slice((st.page - 1) * PER, st.page * PER).map((r) => `<tr class="${r.key === 'pending' ? 'is-attention' : ''}">
              <td class="c-main" data-label="Customer">${D.cell(U.esc(r.c.name), `<span class="num">${r.c.account}</span> · Book <span class="num">${r.c.book}</span>`)}</td>
              <td class="num text-ink-2" data-label="QR reference">${r.q.id}</td>
              <td data-label="Generated">${D.cell(`${U.fmtDate(r.q.at)} <span class="num font-normal text-ink-3">${U.fmtTime(r.q.at)}</span>`, `by ${U.esc(r.q.by)}`)}</td>
              <td class="num r font-medium" data-label="Amount">${U.tk(r.q.amount)}</td>
              <td data-label="Status">${UI.badge(r.label, r.tone)}</td>
              <td data-label="Payment">${r.q.paid ? D.cell(`${U.fmtDate(r.q.paid.at)} · ${r.q.paid.app}`, `<span class="num">${r.q.paid.ref}</span>`)
                : r.key === 'pending' ? `<span class="text-xs text-warn">Valid until ${U.fmtShort(r.q.expires)}, <span class="num">${U.fmtTime(r.q.expires)}</span></span>`
                  : '<span class="text-xs text-ink-3">Expired without payment</span>'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    const period = { 7: 'Last 7 days', 30: 'Last 30 days', 0: 'All time' };
    return {
      head: `<div class="flex items-center gap-2.5"><span class="text-xs font-medium text-ink-3">Generated in</span><div class="seg">${[7, 30, 0].map((d) => `<button data-days="${d}" aria-pressed="${st.days === d}">${period[d]}</button>`).join('')}</div></div>`,
      body,
      chips: statusChips([['all', 'All'], ['pending', 'Awaiting payment'], ['expired', 'Expired · unpaid'], ['paid', 'Paid']], counts),
      search: searchBox('Search customer, book or QR reference'),
      rows, table,
      csv: () => [['QR reference', 'Generated at', 'Customer ID', 'Name', 'Meter number', 'Book', 'Amount (BDT)', 'Status', 'Valid until', 'Paid at', 'Paid via', 'Transaction reference', 'Generated by']]
        .concat(rows.map((r) => [r.q.id, r.q.at.replace('T', ' '), r.c.account, r.c.name, r.c.meter, r.c.book, r.q.amount, r.label, r.q.expires.replace('T', ' '), r.q.paid ? r.q.paid.at.replace('T', ' ') : '', r.q.paid?.app || '', r.q.paid?.ref || '', r.q.by])),
      file: `DESCO-prepaid-qr-reconciliation-${A.today}.csv`,
      what: `Prepaid QR reconciliation · ${period[st.days]}`,
    };
  }

  (D.views = D.views || {}).recon = (el) => {
    document.title = 'Reconciliation & Report · DESCO Admin';
    // Deep links from the dashboard and Bill Generation: ?month=YYYY-MM&tab=prepaid&status=unpaid
    if (st.appliedHash !== location.hash) {
      st.appliedHash = location.hash;
      const qy = D.query;
      if (qy.month || qy.tab || qy.status) {
        st.tab = qy.tab === 'prepaid' ? 'prepaid' : 'postpaid';
        if (qy.month && A.months.includes(qy.month)) st.ym = qy.month;
        if (st.tab === 'prepaid') st.days = qy.status === 'expired' ? 7 : 30; // matches the dashboard's counts
        st.status = qy.status || 'all'; st.q = ''; st.page = 1; st.sort = { ...DEFAULT_SORT[st.tab] };
      }
    }
    if (!st.ym || !A.months.includes(st.ym)) st.ym = A.months[A.months.length - 2];
    const v = st.tab === 'postpaid' ? postpaid() : prepaid();
    const pages = Math.max(1, Math.ceil(v.rows.length / PER));
    st.page = Math.min(st.page, pages);
    const filtered = st.status !== 'all' || st.q;

    el.innerHTML = `
      ${UI.pageHeader({ eyebrow: 'Reports', title: 'Reconciliation & Report', sub: 'Who a bill or QR was generated for, and whether they have paid. Unpaid rows are listed first.',
        actions: `<button class="btn btn-secondary" data-export ${v.rows.length ? '' : 'disabled'}>${UI.icon('download')}Export ${U.plural(v.rows.length, 'row')} (CSV)</button>` })}

      <div class="mb-5 flex flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between">
        <div class="-mb-px flex gap-6" role="tablist" aria-label="Report">
          ${[['postpaid', 'Postpaid bills', 'bill'], ['prepaid', 'Prepaid QR', 'zap']].map(([k, l, ic]) => `
            <button role="tab" data-tab="${k}" aria-selected="${st.tab === k}" class="flex items-center gap-2 border-b-2 px-0.5 pb-3 text-[14px] font-medium transition-colors ${st.tab === k ? 'border-brand text-ink' : 'border-transparent text-ink-3 hover:text-ink'}">${UI.icon(ic)}${l}</button>`).join('')}
        </div>
        <div class="pb-3">${v.head}</div>
      </div>

      ${v.body}

      <section class="card mt-5">
        <div class="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">${v.chips}${v.search}</div>
        ${v.rows.length ? v.table + UI.pager(st.page, pages, v.rows.length, PER)
          : `${UI.empty('Nothing to show', st.q ? `No rows match “${U.esc(st.q)}”.` : 'No rows have this status.', 'filter')}${filtered ? '<div class="-mt-10 pb-8 text-center"><button class="btn btn-secondary btn-sm" data-reset-filters>Show all rows</button></div>' : ''}`}
      </section>`;

    el.addEventListener('change', (e) => { if (e.target.dataset.rym) { st.ym = D.pickMonth(e.target, st.ym); st.page = 1; D.refresh(); } });
    el.addEventListener('submit', (e) => { e.preventDefault(); st.q = U.$('#rc-q', el).value; st.page = 1; D.refresh(); U.$('#rc-q')?.focus(); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.tab) { st.tab = b.dataset.tab; st.status = 'all'; st.q = ''; st.page = 1; st.sort = { ...DEFAULT_SORT[st.tab] }; D.refresh(); return; }
      if (b.dataset.status) { st.status = b.dataset.status; st.page = 1; D.refresh(); return; }
      if (b.dataset.sort) {
        const k = b.dataset.sort;
        st.sort = st.sort.key === k ? { key: k, dir: st.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: TEXT_KEYS.includes(k) ? 'asc' : 'desc' };
        st.page = 1; D.refresh(); return;
      }
      if (b.dataset.days) { st.days = Number(b.dataset.days); st.page = 1; D.refresh(); return; }
      if (b.dataset.page) { st.page = Number(b.dataset.page); D.refresh(); return; }
      if (b.hasAttribute('data-clear')) { st.q = ''; st.page = 1; D.refresh(); return; }
      if (b.hasAttribute('data-reset-filters')) { st.q = ''; st.status = 'all'; st.page = 1; D.refresh(); return; }
      if (b.hasAttribute('data-export')) {
        U.csv(v.file, v.csv());
        A.log('export', 'Report exported', v.what.split(' · ')[0], `${v.what.split(' · ')[1]} · ${U.raw.n(v.rows.length)} rows · CSV`);
        UI.toast('Report exported', { sub: `${v.file} · ${U.plural(v.rows.length, 'row')}` });
      }
    });
  };
})(window.DESCO = window.DESCO || {});
