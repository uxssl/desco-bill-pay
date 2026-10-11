/* Admin dashboard: four numbers that need watching (each opens the screen to act on it), billed vs collected, recent activity. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;

  /** History type → badge. Shared with the History view. */
  D.HISTORY_TYPES = {
    'bill-bulk': { label: 'Bill · Bulk', tone: 'info', icon: 'layers' },
    'bill-single': { label: 'Bill · Single', tone: 'info', icon: 'bill' },
    qr: { label: 'Prepaid QR', tone: 'violet', icon: 'zap' },
    export: { label: 'Report', tone: 'neutral', icon: 'download' },
    signin: { label: 'Sign in', tone: 'neutral', icon: 'lock' },
  };
  /** Table cell content: a main line and an optional smaller line under it. Shared by every admin table. */
  D.cell = (main, sub = '') => `<div class="font-medium text-ink">${main}</div>${sub ? `<div class="c-sub">${sub}</div>` : ''}`;

  const DOT = { 'bill-bulk': 'bg-brand', 'bill-single': 'bg-brand', qr: 'bg-violet', export: 'bg-ok', signin: 'bg-line-strong' };

  (D.views = D.views || {}).dashboard = (el) => {
    document.title = 'Dashboard · DESCO Admin';
    const open = A.monthStats(A.openMonth);
    const lastYm = A.months[A.months.length - 2];
    const last = A.billsOf(lastYm);
    const lastBilled = last.reduce((s, b) => s + b.total, 0);
    const lastPaid = last.reduce((s, b) => s + Math.min(b.paid, b.total), 0);
    const lastDue = last.reduce((d, b) => (b.due > d ? b.due : d), '');
    const lastOpen = A.today <= lastDue; // last month's bills are not all due yet
    const overdue = A.months.flatMap((m) => A.billsOf(m)).filter((b) => !b.settledOn && A.today > b.due);
    const overdueAmt = overdue.reduce((s, b) => s + b.total - b.paid, 0);
    const byMonth = {};
    overdue.forEach((b) => { byMonth[b.month] = (byMonth[b.month] || 0) + 1; });
    const overdueMonth = Object.keys(byMonth).sort((a, b) => byMonth[b] - byMonth[a] || b.localeCompare(a))[0];
    const qrs = A.qrs();
    const monthQrs = qrs.filter((q) => q.at.startsWith(A.today.slice(0, 7)));
    const monthQrPaid = monthQrs.filter((q) => q.paid);
    const pendingQrs = qrs.filter((q) => A.qrStatus(q).key === 'pending');

    const h = Number(U.nowStamp().slice(11, 13));
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const recent = A.months.slice(-7, -1);

    // One sentence on what is waiting, for the welcome banner
    const waiting = [
      open.pending && `${U.plural(open.pending, 'customer')} still ${open.pending === 1 ? 'needs' : 'need'} a ${U.monthLabel(A.openMonth)} bill`,
      overdue.length && `${U.plural(overdue.length, 'bill')} ${overdue.length === 1 ? 'is' : 'are'} overdue`,
      pendingQrs.length && `${U.plural(pendingQrs.length, 'prepaid QR')} ${pendingQrs.length === 1 ? 'is' : 'are'} awaiting payment`,
    ].filter(Boolean);
    const summary = waiting.length
      ? `${waiting.length > 1 ? `${waiting.slice(0, -1).join(', ')} and ${waiting[waiting.length - 1]}` : waiting[0]}.`.replace(/^./, (c) => c.toUpperCase())
      : 'Everything is up to date. Every bill is generated and nothing is overdue.';

    // Last six billed months, billed vs collected
    const months = recent.map((m) => {
      const bills = A.billsOf(m);
      const billed = bills.reduce((t, b) => t + b.total, 0);
      const paid = bills.reduce((t, b) => t + Math.min(b.paid, b.total), 0);
      return { m, billed, paid, rate: billed ? paid / billed : 0 };
    });
    const chart = UI.columns({
      height: 270, left: 60,
      fmt: (v) => (v ? `${+(v / 1e5).toFixed(1)} lakh` : '0'), // written out in full, no "L"
      series: [{ name: 'Billed', cls: 'fill-brand-200' }, { name: 'Collected', cls: 'fill-brand' }],
      data: months.map((x) => ({ label: U.monthShort(x.m), values: [x.billed, x.paid], tip: `<b>${U.monthLabel(x.m)}</b><br>Billed ${U.tk(x.billed)}<br>Collected ${U.tk(x.paid)} (${U.pct(x.rate, 0)})` })),
    });

    /** Tiny column chart for a card (one bar per month, the latest one solid). */
    const spark = (vals, tone, tip) => {
      const top = Math.max(...vals, 1e-9);
      return `<div class="flex h-9 items-end gap-1" aria-hidden="true">${vals.map((v, i) => `<span class="flex-1 rounded-[3px] ${tone} ${i === vals.length - 1 ? '' : 'opacity-30'}" style="height:${Math.max(8, (v / top) * 100).toFixed(0)}%" data-tip="${tip(i)}"></span>`).join('')}</div>`;
    };

    /** One number per card; the whole card opens the screen to act on it. A dot marks cards that need attention. */
    const stat = ({ href, icon, tone, label, value, sub, alert = '', foot = '' }) => `
      <a href="${href}" class="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop">
        <div class="flex items-center justify-between">
          <span class="grid h-9 w-9 place-items-center rounded-lg ${tone}">${UI.icon(icon)}</span>
          ${UI.icon('arrowUR', 'h-4 w-4 text-ink-3 transition-colors group-hover:text-brand')}
        </div>
        <div class="mt-4 flex items-center gap-2 text-[13px] text-ink-2">${alert ? `<span class="h-2 w-2 shrink-0 rounded-full ${alert}" aria-hidden="true"></span>` : ''}${label}</div>
        <div class="num mt-1.5 text-[30px] font-semibold leading-none tracking-tight">${value}</div>
        <div class="mt-2 text-xs text-ink-3">${sub}</div>
        ${foot ? `<div class="mt-auto pt-4">${foot}</div>` : ''}
      </a>`;
    const overdueByMonth = recent.map((m) => byMonth[m] || 0);

    el.innerHTML = `
      <section class="tex-grid relative mb-5 overflow-hidden rounded-xl bg-brand-900 px-6 py-6 text-white shadow-card sm:px-8 sm:py-7">
        <div class="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl" aria-hidden="true"></div>
        <div class="pointer-events-none absolute -bottom-32 right-48 h-64 w-64 rounded-full bg-accent/20 blur-3xl" aria-hidden="true"></div>
        <div class="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">Dashboard · ${U.fmtDate(A.today)}</div>
            <h1 class="mt-2 text-[24px] font-semibold leading-tight tracking-tight sm:text-[26px]">${greet}, ${U.esc(A.user().id)}</h1>
            <p class="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-white/70">${summary}</p>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <a href="#/bills" class="btn h-10 bg-white px-4 text-brand hover:bg-white/90">${UI.icon('layers')}Generate bills</a>
            <a href="#/prepaid" class="btn h-10 border border-white/25 px-4 text-white hover:bg-white/10">${UI.icon('zap')}Generate QR</a>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-2 gap-4 xl:grid-cols-4">
        ${stat({ href: open.pending ? '#/bills' : `#/recon?month=${A.openMonth}`, icon: 'layers', tone: 'bg-brand-50 text-brand', label: `${U.monthLabel(A.openMonth)} bills`, value: `${U.n(open.generated)}<span class="text-lg font-medium text-ink-3">/${U.n(open.customers)}</span>`, sub: open.pending ? `${U.n(open.pending)} still to generate` : 'All generated', alert: open.pending ? 'bg-warn' : '', foot: UI.meterBar(open.generated / open.customers, open.pending ? 'bg-brand' : 'bg-ok') })}
        ${stat({ href: `#/recon?month=${lastYm}`, icon: 'chart', tone: 'bg-ok-soft text-ok', label: `${U.monthLabel(lastYm)} collected`, value: U.pct(lastBilled ? lastPaid / lastBilled : 0, 0), sub: lastOpen ? `Due by ${U.fmtShort(lastDue)}` : `${U.tk(lastPaid)} of ${U.tk(lastBilled)}`, foot: spark(months.map((x) => x.rate), 'bg-ok', (i) => `${U.monthLabel(months[i].m)}: ${U.pct(months[i].rate, 0)} collected`) })}
        ${stat({ href: overdueMonth ? `#/recon?month=${overdueMonth}&status=unpaid` : '#/recon', icon: 'clock', tone: 'bg-danger-soft text-danger', label: 'Overdue bills', value: U.n(overdue.length), sub: overdue.length ? `${U.tk(overdueAmt)} past due` : 'Nothing overdue', alert: overdue.length ? 'bg-danger' : '', foot: overdue.length ? spark(overdueByMonth, 'bg-danger', (i) => `${U.monthLabel(recent[i])}: ${U.plural(overdueByMonth[i], 'overdue bill')}`) : '' })}
        ${stat({ href: pendingQrs.length ? '#/recon?tab=prepaid&status=pending' : '#/recon?tab=prepaid', icon: 'zap', tone: 'bg-violet-soft text-violet', label: 'Prepaid QR paid', value: `${U.n(monthQrPaid.length)}<span class="text-lg font-medium text-ink-3">/${U.n(monthQrs.length)}</span>`, sub: pendingQrs.length ? `${U.n(pendingQrs.length)} awaiting payment` : 'This month', alert: pendingQrs.length ? 'bg-warn' : '', foot: UI.meterBar(monthQrs.length ? monthQrPaid.length / monthQrs.length : 0, 'bg-violet') })}
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <section class="card">
          <div class="card-head">
            <h2 class="card-title">Billed vs collected <span class="font-normal text-ink-3">· last 6 months</span></h2>
            <div class="flex items-center gap-3 text-[11.5px] text-ink-3">
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-brand-200"></span>Billed</span>
              <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-brand"></span>Collected</span>
            </div>
          </div>
          <div class="px-5 pb-4 pt-4">${chart}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2 class="card-title">Recent activity</h2><a href="#/history" class="link text-xs">View all</a></div>
          <ul class="divide-y divide-line">
            ${A.history().slice(0, 6).map((x) => `
              <li class="flex items-center gap-3 px-5 py-3 text-[13px]">
                <span class="h-2 w-2 shrink-0 rounded-full ${DOT[x.type] || 'bg-line-strong'}" aria-hidden="true"></span>
                <span class="min-w-0 flex-1 truncate">${U.esc(x.action.split(' · ')[0])} <span class="text-ink-3">· ${U.esc(x.target)}</span></span>
                <span class="num shrink-0 text-xs text-ink-3">${U.fmtShort(x.at)}, ${U.fmtTime(x.at)}</span>
              </li>`).join('')}
          </ul>
        </section>
      </div>`;
  };
})(window.DESCO = window.DESCO || {});
