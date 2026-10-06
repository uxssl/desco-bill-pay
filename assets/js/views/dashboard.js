/* Step 3: Dashboard — what is due and by when, how this account is doing, and recently paid bills. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const S = D.store; const t = D.t;
  const st = { acc: null };

  /** Most urgent notice across the customer's accounts. */
  D.urgentAlert = (accs) => {
    const rows = accs.map((c) => ({ c, s: S.summary(c.account) }));
    const box = (tone, icon, title, body, href) => `
      <div class="mb-5 flex flex-col gap-3 rounded-lg border px-4 py-3.5 sm:flex-row sm:items-center ${tone}" role="alert">
        ${UI.icon(icon, 'h-5 w-5 shrink-0')}
        <div class="flex-1 text-[13px] leading-relaxed"><b>${title}</b> ${body}</div>
        ${href ? `<a href="${href}" class="btn btn-danger btn-sm shrink-0">${UI.icon('bill')}${t('View bill')}</a>` : ''}
      </div>`;
    const recon = rows.find((r) => r.c.reconnectPending);
    if (recon) return box('border-info/30 bg-info-soft text-info', 'refresh', t('Payment received — reconnection requested.'), t('Our field team restores supply within 24 hours. Call 16120 if it is not restored.'));
    const cut = rows.find((r) => r.c.dcStage === 'disconnected' && r.s.outstanding);
    if (cut) return box('border-danger/30 bg-danger-soft text-danger', 'power', t('Supply disconnected ({acc}).', { acc: cut.c.account }), t('Pay all dues of {amt} to request reconnection.', { amt: `<b class="num">${U.tk(cut.s.outstanding)}</b>` }), `#/bills/${cut.s.open[0].no}`);
    const crit = rows.find((r) => r.s.critical || (r.c.dcStage && r.s.outstanding));
    if (crit) {
      const b = crit.s.critical || crit.s.open[0];
      return box('border-danger/30 bg-danger-soft text-danger', 'alert', t('Disconnection notice ({acc}).', { acc: crit.c.account }), t('Your {month} bill passed its disconnection date ({date}). Pay now to keep your supply connected.', { month: U.monthLabel(b.month), date: U.fmtDate(b.dcDate) }), `#/bills/${b.no}`);
    }
    const late = rows.find((r) => r.s.overdue.length);
    if (late) {
      const b = late.s.overdue[0];
      return box('border-warn/30 bg-warn-soft text-warn', 'clock', t('{month} bill is overdue ({acc}).', { month: U.monthLabel(b.month), acc: late.c.account }), t('A 5% late fee of {fee} has been added. Pay before {date} to avoid disconnection.', { fee: `<b class="num">${U.tk(b.lps)}</b>`, date: U.fmtDate(b.dcDate) }), `#/bills/${b.no}`);
    }
    return '';
  };

  (D.views = D.views || {}).dashboard = (el) => {
    const o = S.owner();
    const accs = S.accounts();
    const rows = accs.map((c) => ({ c, s: S.summary(c.account) }));
    const total = rows.reduce((n, r) => n + r.s.outstanding, 0);
    const openBills = rows.flatMap((r) => r.s.open).sort((a, b) => a.due.localeCompare(b.due));
    const withDues = rows.filter((r) => r.s.outstanding).length;
    const anyOverdue = rows.some((r) => r.s.overdue.length);
    const focus = openBills[0];
    document.title = `${t('Dashboard')} · DESCO`;

    // Account the insight panels describe (first with dues, unless the customer picked one)
    if (!st.acc || !S.owns(st.acc)) st.acc = (rows.find((r) => r.s.outstanding) || rows[0]).c.account;
    const sel = S.consumer(st.acc);
    const bills = S.billsOf(sel.account);
    const chrono = bills.slice().reverse();
    const latest = bills[0]; const prev = bills[1];
    const change = prev ? (latest.kwh - prev.kwh) / prev.kwh : 0;
    const avgBill = chrono.reduce((n, b) => n + b.total, 0) / chrono.length;
    const yearAgo = U.addDays(S.today, -365);
    const paidYear = S.paymentsOf(sel.account).filter((p) => p.date > yearAgo).reduce((n, p) => n + p.amount, 0);
    const settled = bills.filter((b) => b.settledOn);
    const onTime = settled.filter((b) => b.settledOn <= b.due).length;
    const maxK = Math.max(...chrono.map((b) => b.kwh));

    const paidBills = accs.flatMap((c) => S.billsOf(c.account).filter((b) => b.settledOn))
      .sort((a, b) => b.settledOn.localeCompare(a.settledOn)).slice(0, 6);
    const payFor = (b) => S.paymentsForBill(b.no)[0];

    // Countdown from issue to due date for the most pressing open bill
    let countdown = '';
    if (focus) {
      const span = Math.max(1, U.diffDays(focus.due, focus.issue));
      const gone = Math.min(span, Math.max(0, U.diffDays(S.today, focus.issue)));
      const left = U.diffDays(focus.due, S.today);
      countdown = `
        <div class="mt-6 rounded-lg bg-white/[0.06] p-4 ring-1 ring-white/10">
          <div class="flex items-baseline justify-between gap-3 text-xs text-white/60">
            <span>${t('Issued {date}', { date: U.fmtDate(focus.issue) })}</span>
            <span class="text-[13px] font-semibold ${left < 0 ? 'text-[#ffb4ab]' : left <= 7 ? 'text-[#ffd48a]' : 'text-white'}">${left > 0 ? D.tp(left, '{n} day left', '{n} days left') : left === 0 ? t('Due today') : D.tp(-left, 'Overdue by {n} day', 'Overdue by {n} days')}</span>
            <span>${t('Due {date}', { date: U.fmtDate(focus.due) })}</span>
          </div>
          <div class="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10"><div class="h-full rounded-full ${left < 0 ? 'bg-accent' : left <= 7 ? 'bg-[#e0a23a]' : 'bg-[#7fb0ff]'}" style="width:${(gone / span * 100).toFixed(1)}%"></div></div>
          <div class="mt-2 text-[11px] text-white/50">${t('{month} bill · {amt} after the due date', { month: U.monthLabel(focus.month), amt: U.tk(focus.total + focus.lps) })}</div>
        </div>`;
    }

    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const tile = (icon, tone, label, value, sub) => `
      <div class="card p-4 sm:p-5">
        <div class="flex items-center gap-2.5"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-md ${tone}">${UI.icon(icon)}</span><span class="text-xs font-medium leading-tight text-ink-2">${label}</span></div>
        <div class="num mt-3 text-[22px] font-semibold leading-tight tracking-tight sm:text-[26px]">${value}</div>
        <div class="mt-0.5 text-xs text-ink-3">${sub}</div>
      </div>`;

    el.innerHTML = `
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="page-title">${t(greet)}, ${U.esc(o.name.split(' ')[0])}</h1>
          <p class="mt-1 text-[13px] text-ink-3">${D.tp(accs.length, '{n} DESCO account on {m}', '{n} DESCO accounts on {m}', { m: `<span class="num">${U.maskMobile(o.mobile)}</span>` })}</p>
        </div>
        <div class="text-xs text-ink-3">${U.fmtDate(S.today)}</div>
      </div>

      ${D.urgentAlert(accs)}

      <section class="grid gap-4 lg:grid-cols-3">
        ${total ? `
          <div class="tex-grid relative overflow-hidden rounded-xl bg-brand-900 p-6 text-white shadow-card sm:p-7 lg:col-span-2">
            <svg viewBox="0 0 24 24" class="pointer-events-none absolute -right-8 -top-6 h-56 w-56 text-accent/20" aria-hidden="true"><path d="M13.5 2 5 13.5h6L9.5 22 19 9.5h-6.2z" fill="currentColor"/></svg>
            <div class="relative">
              <div class="eyebrow !text-white/60">${t('Total amount due')}</div>
              <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div class="num text-[44px] font-semibold leading-none tracking-tight sm:text-[56px]">${U.tk(total)}</div>
                  <div class="mt-3 text-[13px] text-white/70">${D.tp(openBills.length, '{n} unpaid bill', '{n} unpaid bills')}${accs.length > 1 ? ` · ${D.tp(withDues, 'in {n} account', 'in {n} accounts')}` : ''}${anyOverdue ? ` · <span class="font-semibold text-[#ffb4ab]">${t('includes overdue')}</span>` : ''}</div>
                </div>
                <a href="${openBills.length === 1 ? `#/bills/${focus.no}` : '#/bills'}" class="btn h-11 bg-white px-5 text-[14px] font-semibold text-brand shadow-sm hover:bg-brand-50">${UI.icon('bill')}${t(openBills.length === 1 ? 'View bill & pay' : 'View due bills')}</a>
              </div>
              ${countdown}
            </div>
          </div>` : `
          <div class="flex flex-col justify-center rounded-xl border border-ok/25 bg-ok-soft p-6 sm:p-7 lg:col-span-2">
            <span class="grid h-11 w-11 place-items-center rounded-full bg-ok text-white">${UI.icon('check', 'h-5 w-5')}</span>
            <h2 class="mt-4 text-2xl font-semibold tracking-tight text-ok">${t('You’re all paid up')}</h2>
            <p class="mt-1.5 text-[13px] text-ink-2">${t('There are no unpaid bills on your accounts.')}</p>
          </div>`}

        <div class="card p-5 sm:p-6">
          <div class="eyebrow">${t('How to pay')}</div>
          <ol class="mt-4 space-y-4 text-[13px]">
            ${[['Open a due bill', 'From Due Bills, tap “View bill”.'],
               ['Scan the QR on the bill', 'Use bKash, Nagad, Rocket, Upay or your bank app.'],
               ['Confirm in your app', 'Enter the bill amount and confirm with your PIN.']].map(([a, b], i) => `
              <li class="flex gap-3"><span class="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">${U.n(i + 1)}</span><span><b class="block font-medium">${t(a)}</b><span class="text-xs text-ink-3">${t(b)}</span></span></li>`).join('')}
          </ol>
          <div class="mt-5 flex items-center gap-2 border-t border-line pt-4 text-xs text-ink-3">${UI.icon('headset', 'h-4 w-4 text-brand')}${t('Need help? Call {n}', { n: `<b class="num text-ink-2">${D.digits('16120')}</b>` })}</div>
        </div>
      </section>

      <div class="mb-3 mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 class="eyebrow">${t('Account summary')}</h2>
        ${accs.length > 1 ? `<select class="select h-8 w-auto min-w-[12rem] text-xs" data-acc aria-label="${t('Account')}">${accs.map((c) => `<option value="${c.account}" ${c.account === sel.account ? 'selected' : ''}>${U.esc(D.nickLabel(S.nick(c.account)))} · ${c.account}</option>`).join('')}</select>` : `<span class="num text-xs text-ink-3">${t('A/C')} ${sel.account}</span>`}
      </div>
      <section class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        ${tile('gauge', 'bg-brand-50 text-brand', t('Last bill · units used'), `${U.n(latest.kwh)} <span class="text-sm font-normal text-ink-3">kWh</span>`,
          prev ? `<span class="${change > 0 ? 'text-warn' : 'text-ok'}">${change > 0 ? '▲' : '▼'} ${U.pct(Math.abs(change), 0)}</span> ${t('vs {month}', { month: U.monthLabel(prev.month) })}` : U.monthLabel(latest.month))}
        ${tile('bill', 'bg-info-soft text-info', t('Average monthly bill'), U.tk(avgBill), t('last 12 months'))}
        ${tile('wallet', 'bg-ok-soft text-ok', t('Paid in last 12 months'), U.tk(paidYear), D.tp(S.paymentsOf(sel.account).filter((p) => p.date > yearAgo).length, '{n} payment', '{n} payments'))}
        ${tile('checkCircle', onTime === settled.length ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn', t('Paid on time'), `${U.n(onTime)}<span class="text-base font-normal text-ink-3">/${U.n(settled.length)}</span>`, t('bills paid by the due date'))}
      </section>

      <section class="mt-4 grid gap-4 lg:grid-cols-3">
        <div class="card p-5 sm:p-6 lg:col-span-2">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div><div class="card-title">${t('Electricity use')}</div><div class="text-xs text-ink-3">${t('kWh per month · tap a bar to open that bill')}</div></div>
            <div class="flex gap-3 text-[11px] text-ink-2"><span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-brand-200"></span>${t('Paid')}</span><span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm bg-accent"></span>${t('Unpaid')}</span></div>
          </div>
          <div class="mt-6 flex h-44 items-end gap-1.5 sm:gap-2.5">
            ${chrono.map((b) => { const unpaid = !b.settledOn; return `
              <a href="#/bills/${b.no}" class="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" data-tip="<b>${U.monthLabel(b.month)}</b><br>${U.n(b.kwh)} kWh · ${U.tk(b.total)}<br>${t(unpaid ? 'Unpaid' : 'Paid')}">
                <span class="num text-[10px] ${unpaid ? 'font-semibold text-accent' : 'text-ink-3 opacity-0 group-hover:opacity-100'}">${U.n(b.kwh)}</span>
                <span class="w-full rounded-t-[3px] transition-opacity group-hover:opacity-80 ${unpaid ? 'bg-accent' : 'bg-brand-200'}" style="height:${(b.kwh / maxK * 100).toFixed(1)}%"></span>
                <span class="text-[10px] text-ink-3">${U.monthAbbr(b.month)}</span>
              </a>`; }).join('')}
          </div>
        </div>

        <div class="card flex flex-col">
          <div class="card-head"><div class="card-title">${t('Your accounts')}</div></div>
          <ul class="flex-1 divide-y divide-line ${rows.length > 2 ? 'max-h-64 overflow-y-auto scroll-thin' : ''}">
            ${rows.map(({ c, s }) => {
              const tone = s.critical || c.dcStage ? 'danger' : s.overdue.length ? 'warn' : s.outstanding ? 'info' : 'ok';
              const state = c.dcStage === 'disconnected' ? t('Disconnected') : s.critical || c.dcStage ? t('Disconnection notice') : s.overdue.length ? t('Overdue') : s.outstanding ? t('Due {date}', { date: U.fmtDate(s.upcoming?.due || s.open[0].due) }) : t('All paid');
              return `
              <li><a href="${s.outstanding ? (s.open.length === 1 ? `#/bills/${s.open[0].no}` : `#/bills?acc=${c.account}`) : `#/bills/${s.latest.no}`}" class="flex items-start gap-3 px-5 py-4 hover:bg-surface-2">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-brand-50 text-brand">${UI.icon(c.type === 'Commercial' ? 'building' : 'home')}</span>
                <span class="min-w-0 flex-1">
                  <span class="block text-[13px] font-semibold">${U.esc(D.nickLabel(S.nick(c.account)))} <span class="num font-normal text-ink-3">· ${c.account}</span></span>
                  <span class="block truncate text-xs text-ink-3">${U.esc(c.address)}</span>
                  <span class="mt-1.5 block">${UI.badge(state, tone)}</span>
                </span>
                <span class="num text-[14px] font-semibold ${tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : tone === 'ok' ? 'text-ok' : ''}">${s.outstanding ? U.tk(s.outstanding) : '✓'}</span>
              </a></li>`;
            }).join('')}
          </ul>
          <div class="border-t border-line bg-surface-2 px-5 py-4">
            <div class="eyebrow mb-3">${t('Connection details')}${accs.length > 1 ? ` · <span class="num normal-case tracking-normal">${sel.account}</span>` : ''}</div>
            <dl class="kv text-xs">
              <dt>${t('Tariff')}</dt><dd>${sel.tariff} · ${t(sel.type)}</dd>
              <dt>${t('Sanctioned load')}</dt><dd class="num">${D.digits(sel.load)} kW</dd>
              <dt>${t('Meter no.')}</dt><dd class="num">${sel.meter}</dd>
              <dt>${t('Zone / Block')}</dt><dd class="num">${sel.zone}</dd>
              <dt>${t('S&D division')}</dt><dd>${t(D.division(sel.division).name)}</dd>
            </dl>
          </div>
        </div>
      </section>

      <section class="card mt-4 overflow-hidden">
        <div class="card-head"><div class="card-title">${t('Recently paid bills')}</div><a href="#/bills?tab=paid" class="link text-xs">${t('All paid bills')}</a></div>
        ${!paidBills.length ? UI.empty(t('No paid bills yet'), t('Bills you pay will appear here.'), 'bill') : `
        <div class="hidden overflow-x-auto md:block"><table class="tbl tbl-compact">
          <thead><tr><th>${t('Billing month')}</th>${accs.length > 1 ? `<th>${t('Account')}</th>` : ''}<th>${t('Bill no.')}</th><th class="r">${t('Units used')}</th><th class="r">${t('Amount')}</th><th>${t('Paid on')}</th><th>${t('Paid via')}</th><th></th></tr></thead>
          <tbody>${paidBills.map((b) => { const p = payFor(b); return `<tr>
            <td class="font-medium">${U.monthLabel(b.month)}</td>
            ${accs.length > 1 ? `<td class="text-ink-2">${U.esc(D.nickLabel(S.nick(b.account)))}</td>` : ''}
            <td class="num text-xs text-ink-3">${b.no}</td>
            <td class="num r text-ink-2">${U.n(b.kwh)} kWh</td>
            <td class="num r font-semibold">${U.tk(b.paid)}</td>
            <td><div class="num">${U.fmtDate(b.settledOn)}</div><div class="text-[11px] ${b.settledOn <= b.due ? 'text-ok' : 'text-warn'}">${t(b.settledOn <= b.due ? 'On time' : 'After due date')}</div></td>
            <td>${p ? `${t(D.channel(p.channel).label)}${p.app ? ` · ${p.app}` : ''}` : '—'}</td>
            <td class="r"><a href="#/bills/${b.no}" class="btn btn-ghost btn-xs">${UI.icon('eye')}${t('View bill')}</a></td>
          </tr>`; }).join('')}</tbody>
        </table></div>
        <ul class="divide-y divide-line md:hidden">${paidBills.map((b) => { const p = payFor(b); return `
          <li><a href="#/bills/${b.no}" class="flex items-center gap-3 px-4 py-3.5">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ok-soft text-ok">${UI.icon('check')}</span>
            <span class="min-w-0 flex-1"><span class="block text-[13px] font-semibold">${U.monthLabel(b.month)}</span><span class="block text-xs text-ink-3">${U.fmtDate(b.settledOn)}${p ? ` · ${t(D.channel(p.channel).label)}` : ''}</span></span>
            <span class="num text-[14px] font-semibold">${U.tk(b.paid)}</span>
          </a></li>`; }).join('')}</ul>`}
      </section>`;

    el.addEventListener('change', (e) => { if (e.target.hasAttribute('data-acc')) { st.acc = e.target.value; D.refresh(); } });
  };
})(window.DESCO = window.DESCO || {});
