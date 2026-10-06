/* Step 4: Due Bills — unpaid bills across the customer's accounts; paid history on a second tab. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const S = D.store; const t = D.t;
  const st = { tab: 'due', acc: 'all', appliedHash: null };

  (D.views = D.views || {}).bills = (el) => {
    if (st.appliedHash !== location.hash) { st.appliedHash = location.hash; if (D.query.acc) { st.acc = D.query.acc; st.tab = 'due'; } if (D.query.tab === 'paid') { st.tab = 'paid'; st.acc = 'all'; } }
    const accs = S.accounts();
    if (st.acc !== 'all' && !S.owns(st.acc)) st.acc = 'all';
    const scope = accs.filter((c) => st.acc === 'all' || c.account === st.acc);
    const due = scope.flatMap((c) => S.summary(c.account).open).sort((a, b) => a.due.localeCompare(b.due));
    const paid = scope.flatMap((c) => S.billsOf(c.account).filter((b) => S.status(b).key === 'paid')).sort((a, b) => b.month.localeCompare(a.month) || a.account.localeCompare(b.account));
    const total = due.reduce((n, b) => n + S.status(b).balance, 0);
    const list = st.tab === 'due' ? due : paid;
    document.title = `${t('Due Bills')} · DESCO`;

    const accLine = (b) => accs.length > 1 ? `<span class="num text-xs text-ink-3">${U.esc(D.nickLabel(S.nick(b.account)))} · ${b.account}</span>` : `<span class="num text-xs text-ink-3">${t('Bill no.')} ${b.no}</span>`;

    el.innerHTML = `
      ${UI.pageHeader({ title: t('Due Bills'), sub: t('Open a bill to see the full bill and the QR code to pay it from your mobile banking app.') })}

      <div class="mb-5 flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-center">
        <div class="flex-1">
          <div class="text-xs font-medium text-ink-2">${t('Total due')}${st.acc !== 'all' ? ` · <span class="num">${st.acc}</span>` : ''}</div>
          <div class="num mt-0.5 text-3xl font-semibold tracking-tight ${due.some((b) => S.status(b).dpd) ? 'text-danger' : total ? '' : 'text-ok'}">${U.tk(total)}</div>
        </div>
        <div class="text-xs text-ink-3 sm:text-right">${due.length ? D.tp(due.length, '{n} unpaid bill', '{n} unpaid bills') : t('Nothing to pay')}</div>
      </div>

      <div class="mb-3 flex flex-wrap items-center gap-2">
        <div class="seg" role="tablist">
          <button role="tab" data-tab="due" aria-pressed="${st.tab === 'due'}" aria-selected="${st.tab === 'due'}">${t('Due')} <span class="num">(${U.n(due.length)})</span></button>
          <button role="tab" data-tab="paid" aria-pressed="${st.tab === 'paid'}" aria-selected="${st.tab === 'paid'}">${t('Paid')}</button>
        </div>
        ${accs.length > 1 ? `
          <select class="select ml-auto w-auto min-w-[12rem]" data-acc aria-label="${t('Account')}">
            <option value="all">${t('All accounts')}</option>
            ${accs.map((c) => `<option value="${c.account}" ${st.acc === c.account ? 'selected' : ''}>${U.esc(D.nickLabel(S.nick(c.account)))} · ${c.account}</option>`).join('')}
          </select>` : ''}
      </div>

      ${!list.length ? `<div class="card">${st.tab === 'due'
        ? UI.empty(t('No due bills'), t('All bills are paid. New bills appear here as soon as they are issued.'), 'checkCircle')
        : UI.empty(t('No paid bills yet'), t('Bills you pay will appear here.'), 'bill')}</div>` : `
      <ul class="space-y-3">
        ${list.map((b) => {
          const s = S.status(b);
          const isDue = st.tab === 'due';
          return `
          <li class="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 ${s.critical ? 'border-danger/40' : ''}">
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <span class="w-14 shrink-0 rounded-md border border-line bg-surface-2 py-2 text-center leading-none"><span class="block text-[13px] font-semibold">${U.monthAbbr(b.month)}</span><span class="num mt-1 block text-[11px] text-ink-3">${D.digits(b.month.slice(0, 4))}</span></span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2"><span class="text-[15px] font-semibold">${U.monthLabel(b.month)}</span>${UI.statusBadge(s)}</div>
                ${accLine(b)}
                <div class="mt-0.5 text-xs ${isDue && s.dpd ? 'font-medium text-danger' : 'text-ink-3'}">${isDue ? `${t('Due date')} ${U.fmtDate(b.due)} · ${U.dueText(b.due, S.today)}` : t('Paid on {date}', { date: U.fmtDate(b.settledOn) })}</div>
              </div>
            </div>
            <div class="flex items-center justify-between gap-4 sm:justify-end">
              <div class="text-left sm:text-right">
                <div class="num text-xl font-semibold">${U.tk(isDue ? s.balance : b.paid)}</div>
                ${isDue && s.lpsApplied ? `<div class="text-[11px] text-warn">${t('incl. late fee {fee}', { fee: U.tk(b.lps) })}</div>` : isDue ? `<div class="text-[11px] text-ink-3">${t('{amt} after due date', { amt: U.tk(b.total + b.lps) })}</div>` : ''}
              </div>
              <a href="#/bills/${b.no}" class="btn ${isDue ? 'btn-primary' : 'btn-secondary'} shrink-0">${UI.icon(isDue ? 'zap' : 'eye')}${t(isDue ? 'View bill & pay' : 'View bill')}</a>
            </div>
          </li>`;
        }).join('')}
      </ul>`}`;

    el.addEventListener('click', (e) => {
      const tb = e.target.closest('[data-tab]');
      if (tb) { st.tab = tb.dataset.tab; D.refresh(); }
    });
    el.addEventListener('change', (e) => { if (e.target.hasAttribute('data-acc')) { st.acc = e.target.value; D.refresh(); } });
  };
})(window.DESCO = window.DESCO || {});
