/* Prepaid: generate a dynamic Bangla QR for a customer. Search by Customer ID, meter number or Book number →
 * pick the customer → enter the recharge amount → one-time QR with that amount and a reference, valid 24 h. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;
  const st = { q: '', page: 1, filter: 'all' };
  const PER = 10;
  const MIN = 100; const MAX = 50000;

  /** Who the QR is for: name and address, then the three numbers staff check against the meter. */
  const custLine = (c) => `
    <div class="rounded-xl border border-line bg-surface-2">
      <div class="flex items-center gap-3 px-4 py-3.5">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-semibold text-white">${U.esc(U.initials(c.name))}</span>
        <div class="min-w-0"><div class="truncate text-[14px] font-semibold">${U.esc(c.name)}</div><div class="truncate text-xs text-ink-3">${U.esc(c.address)}</div></div>
      </div>
      <dl class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)_minmax(0,.75fr)] divide-x divide-line border-t border-line text-[13px]">
        ${[['Customer ID', c.account], ['Meter number', c.meter], ['Book', c.book]].map(([l, v]) => `
          <div class="min-w-0 px-3 py-2.5 sm:px-4"><dt class="text-[11px] text-ink-3">${l}</dt><dd class="mt-0.5 break-all font-medium tabular-nums">${v}</dd></div>`).join('')}
      </dl>
    </div>`;

  /** "3 hours 20 minutes left" until the QR expires. */
  const timeLeft = (q) => {
    const mins = Math.max(0, Math.round((new Date(`${q.expires}:00`) - new Date(`${A.now()}:00`)) / 6e4));
    const h = Math.floor(mins / 60); const m = mins % 60;
    return `${h ? `${U.plural(h, 'hour')} ` : ''}${U.plural(m, 'minute')} left`;
  };
  const when = (stamp) => `${U.fmtDate(stamp)} at <span class="num">${U.fmtTime(stamp)}</span>`;

  /** The generated QR on the Bangla QR card, with the amount, payment progress and customer beside it. */
  function qrBody(q) {
    const c = A.prepaidCustomer(q.account);
    const s = A.qrStatus(q);
    const steps = [{ dot: 'bg-brand', title: 'QR generated', sub: `${when(q.at)} · by ${U.esc(q.by)}` }];
    if (q.paid) steps.push({ dot: 'bg-ok', title: `Paid with ${q.paid.app}`, sub: `${when(q.paid.at)} · Transaction <span class="num">${U.esc(q.paid.ref)}</span>`, tone: 'text-ok' });
    else if (s.key === 'pending') steps.push({ dot: 'bg-warn ring-4 ring-warn/20', title: 'Waiting for the customer to pay', sub: `Valid until ${when(q.expires)} · <b class="font-medium text-warn">${timeLeft(q)}</b>`, tone: 'text-warn' });
    else steps.push({ dot: 'bg-ink-3', title: 'Expired without payment', sub: `Expired ${when(q.expires)}. Generate a new QR if the customer still wants to recharge.`, tone: 'text-ink-2' });
    const field = (label, value, mono) => `<div><dt class="text-[11.5px] text-ink-3">${label}</dt><dd class="mt-0.5 font-medium ${mono ? 'num' : ''}">${value}</dd></div>`;

    return `
      <div class="grid gap-6 sm:grid-cols-[minmax(0,17rem)_1fr]">
        <div class="rounded-xl bg-surface-2 p-4 ring-1 ring-line sm:p-5">
          ${D.qrCard(A.qrPayload(q), 'mx-auto w-full max-w-[15rem] rounded-lg shadow-[0_10px_30px_-12px_rgba(10,21,62,.35)]')}
        </div>
        <div class="flex min-w-0 flex-col gap-5">
          <div class="rounded-xl border border-line p-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-xs font-medium text-ink-3">Recharge amount</div>
                <div class="mt-1 text-[34px] font-semibold leading-none tracking-tight tabular-nums">${U.tk(q.amount)}</div>
              </div>
              ${UI.badge(s.label, s.tone)}
            </div>
            <div class="mt-3 text-xs text-ink-3">QR reference <span class="num font-medium text-ink-2">${q.id}</span></div>
          </div>

          <ol class="relative ml-1 space-y-4 border-l border-line pl-5" aria-label="Payment progress">
            ${steps.map((x) => `
              <li class="relative">
                <span class="absolute -left-[25.5px] top-1 h-2.5 w-2.5 rounded-full ${x.dot}" aria-hidden="true"></span>
                <div class="text-[13px] font-medium ${x.tone || ''}">${x.title}</div>
                <div class="mt-0.5 text-xs text-ink-3">${x.sub}</div>
              </li>`).join('')}
          </ol>

          <div>
            <div class="eyebrow mb-2.5">Customer</div>
            <dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              ${field('Name', U.esc(c.name))}
              ${field('Customer ID', c.account, true)}
              ${field('Meter number', c.meter, true)}
              ${field('Book', c.book, true)}
            </dl>
          </div>

          ${s.key === 'pending' ? `<p class="flex gap-2 rounded-lg bg-info-soft px-3 py-2.5 text-xs text-info">${UI.icon('info', 'mt-px h-4 w-4 shrink-0')}<span>The customer scans this with bKash, Nagad, Rocket, Upay or a bank app. The amount is fixed in the QR and it can be paid once.</span></p>` : ''}
        </div>
      </div>`;
  }

  /** Lines printed / saved under the card. */
  const qrLines = (q) => [`BDT ${U.raw.n(q.amount)} · Prepaid recharge`, `Customer ${q.account} · Reference ${q.id}`, `Valid until ${U.fmtDate(q.expires)} ${U.fmtTime(q.expires)}`];

  function openQR(q, m) {
    const pending = A.qrStatus(q).key === 'pending';
    const footer = `${pending ? `<button class="btn btn-ghost mr-auto" data-new-qr>${UI.icon('plus')}Generate new QR</button>` : ''}<button class="btn btn-secondary" data-dl>${UI.icon('download')}Download</button><button class="btn btn-secondary" data-print>${UI.icon('printer')}Print</button><button class="btn btn-primary" data-close>Done</button>`;
    const title = 'Dynamic Bangla QR';
    const sub = `Prepaid · ${q.account}`;
    if (m) {
      m.panel.classList.replace('sm:max-w-md', 'sm:max-w-3xl');
      m.setTitle(title, sub); m.setBody(qrBody(q)); m.setFooter(footer);
    } else m = UI.modal({ title, subtitle: sub, size: 'lg', body: qrBody(q), footer, onClose: () => D.refresh() });
    const again = m.el.querySelector('[data-new-qr]');
    if (again) again.onclick = () => { m.close(); genModal(q.account); }; // the generate dialog still warns about this open QR
    m.el.querySelector('[data-dl]').onclick = () => UI.qrCardPNG({ text: A.qrPayload(q), lines: qrLines(q), file: `DESCO-QR-${q.id}.png` });
    m.el.querySelector('[data-print]').onclick = () => UI.print(`
      <div class="receipt-doc text-center">
        ${D.qrCard(A.qrPayload(q), 'mx-auto w-[300px]')}
        ${qrLines(q).map((l, i) => `<div class="${i ? 'num mt-1 text-[13px] text-ink-2' : 'mt-4 text-lg font-semibold'}">${U.esc(l)}</div>`).join('')}
      </div>`);
  }

  /** The customer's QR that can still be paid, if any — a second one could be paid twice. */
  const openQrOf = (acc) => A.qrsOf(acc).find((q) => A.qrStatus(q).key === 'pending');

  /** When a QR generated now would expire, e.g. "6 May 2026 at 15:57". */
  const validUntil = () => {
    const d = new Date(`${A.now()}:00`);
    d.setHours(d.getHours() + A.QR_VALID_H);
    const stamp = `${U.iso(d)}T${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
    return `${U.fmtDate(stamp)} at ${U.fmtTime(stamp)}`;
  };

  function genModal(acc) {
    const c = A.prepaidCustomer(acc);
    const live = openQrOf(acc);
    const m = UI.modal({
      title: 'Generate dynamic QR', subtitle: 'Prepaid recharge', size: 'sm',
      body: `
        ${custLine(c)}
        ${live ? `
          <div class="mt-4 rounded-lg border border-warn/30 bg-warn-soft p-3.5 text-[13px] text-warn" role="alert">
            <div class="flex gap-2.5">${UI.icon('alert', 'mt-0.5 h-4 w-4 shrink-0')}
              <div><b>This customer already has an unpaid QR.</b> ${U.tk(live.amount)}, valid until ${U.fmtShort(live.expires)} <span class="num">${U.fmtTime(live.expires)}</span>. Hand over that QR instead, or the customer may pay twice.</div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm mt-3" data-show-live>${UI.icon('eye')}Show the existing QR</button>
          </div>` : ''}
        <form class="mt-6" novalidate data-amt-form>
          <label class="text-[13px] font-semibold" for="qr-amt">Recharge amount</label>
          <div class="mt-2 flex h-14 items-center overflow-hidden rounded-xl border border-line-strong bg-surface transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10" data-amt-box>
            <span class="pl-4 pr-1 text-2xl font-semibold text-ink-3" aria-hidden="true">৳</span>
            <input id="qr-amt" class="h-full w-full min-w-0 bg-transparent pr-4 text-2xl font-semibold tabular-nums tracking-tight outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-ink-3/60" inputmode="numeric" placeholder="0" autocomplete="off" aria-describedby="qr-amt-hint qr-amt-err" ${live ? '' : 'autofocus'}>
          </div>
          <div id="qr-amt-hint" class="mt-1.5 text-xs text-ink-3">Between ${U.tk(MIN)} and ${U.tk(MAX)}, in whole taka.</div>
          <div id="qr-amt-err" class="field-error" hidden></div>
          <div class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Quick amounts">
            ${A.AMOUNTS.map((a) => `<button type="button" class="h-10 rounded-lg border border-line-strong bg-surface text-[13px] font-medium tabular-nums text-ink-2 transition-colors hover:border-brand/50 hover:text-ink aria-pressed:border-brand aria-pressed:bg-brand-50 aria-pressed:text-brand" data-amt="${a}" aria-pressed="false">${U.tk(a)}</button>`).join('')}
          </div>
          <ul class="mt-5 space-y-2 rounded-lg bg-surface-2 px-3.5 py-3 text-xs text-ink-2">
            <li class="flex items-center gap-2.5">${UI.icon('clock', 'h-4 w-4 shrink-0 text-ink-3')}<span>Valid for ${A.QR_VALID_H} hours, until <b class="font-medium text-ink">${validUntil()}</b></span></li>
            <li class="flex items-center gap-2.5">${UI.icon('lock', 'h-4 w-4 shrink-0 text-ink-3')}<span>The amount is fixed in the QR, and it can be paid only once</span></li>
          </ul>
        </form>`,
      footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary" data-go>${UI.icon('zap')}<span data-go-label>${live ? 'Generate another QR' : 'Generate QR'}</span></button>`,
      onClose: () => D.refresh(),
    });
    const input = m.el.querySelector('#qr-amt');
    const err = m.el.querySelector('#qr-amt-err');
    const label = m.el.querySelector('[data-go-label]');
    const box = m.el.querySelector('[data-amt-box]');
    const amount = () => Number(input.value.replace(/[^\d]/g, ''));
    const sync = () => {
      const v = amount();
      label.textContent = `${live ? 'Generate another QR' : 'Generate QR'}${v >= MIN && v <= MAX ? ` · ${U.tk(v)}` : ''}`;
      U.$$('[data-amt]', m.el).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.amt) === v)));
      err.hidden = true; input.removeAttribute('aria-invalid'); box.classList.remove('!border-danger');
    };
    const go = () => {
      const v = amount();
      if (!v || v < MIN || v > MAX) {
        err.textContent = v ? `${U.tk(v)} is outside the allowed range. Enter ${U.tk(MIN)} to ${U.tk(MAX)}.` : 'Enter the recharge amount the customer wants to pay.';
        err.hidden = false; input.setAttribute('aria-invalid', 'true'); box.classList.add('!border-danger'); input.focus();
        return;
      }
      openQR(A.generateQR(acc, v), m);
      UI.toast('QR generated', { sub: `${c.name} · ${U.tk(v)}` });
    };
    input.addEventListener('input', () => { const d = input.value.replace(/[^\d]/g, '').replace(/^0+/, '').slice(0, 6); input.value = d ? U.n(Number(d)) : ''; sync(); });
    m.el.querySelector('[data-amt-form]').addEventListener('submit', (e) => { e.preventDefault(); go(); });
    m.el.querySelector('[data-go]').onclick = go;
    m.el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-amt]');
      if (a) { input.value = U.n(Number(a.dataset.amt)); sync(); input.focus(); return; }
      if (e.target.closest('[data-show-live]')) openQR(live, m);
    });
  }

  const FILTERS = [['all', 'All'], ['pending', 'Awaiting payment'], ['none', 'No QR yet'], ['expired', 'Expired · unpaid'], ['paid', 'Paid']];
  /** Status of the customer's latest QR, or 'none'. */
  const latestKey = (c) => { const q = A.qrsOf(c.account)[0]; return q ? A.qrStatus(q).key : 'none'; };

  (D.views = D.views || {}).prepaidQr = (el) => {
    document.title = 'Prepaid QR · DESCO Admin';
    const all = A.prepaid;
    const found = A.search(all, st.q);
    const counts = found.reduce((o, c) => { const k = latestKey(c); o[k] = (o[k] || 0) + 1; return o; }, { all: found.length });
    const list = st.filter === 'all' ? found : found.filter((c) => latestKey(c) === st.filter);
    const pages = Math.max(1, Math.ceil(list.length / PER));
    st.page = Math.min(st.page, pages);
    const rows = list.slice((st.page - 1) * PER, st.page * PER);
    const qrs = A.qrs();
    const today = qrs.filter((q) => q.at.startsWith(A.today));
    const paidToday = qrs.filter((q) => q.paid && q.paid.at.startsWith(A.today));
    const pending = all.map((c) => A.qrsOf(c.account)[0]).filter((q) => q && A.qrStatus(q).key === 'pending'); // one per customer, as in the list
    const noQr = all.filter((c) => latestKey(c) === 'none').length;
    const sum = (l) => U.tk(l.reduce((t, q) => t + q.amount, 0));

    /** Summary tile; with a filter it also narrows the list below. */
    const tile = (icon, tone, label, value, sub, filter) => {
      const on = filter && st.filter === filter;
      const inner = `
        <span class="hidden h-9 w-9 shrink-0 place-items-center rounded-lg sm:grid ${tone}">${UI.icon(icon)}</span>
        <span class="min-w-0"><span class="block text-xs text-ink-3">${label}</span><span class="num block text-xl font-semibold leading-tight">${value}</span><span class="block truncate text-[11.5px] text-ink-3">${sub}</span></span>`;
      return filter
        ? `<button type="button" class="card flex min-w-0 items-center gap-3 p-3.5 text-left transition sm:p-4 hover:border-brand/40 ${on ? '!border-brand ring-2 ring-brand/15' : ''}" data-filter="${on ? 'all' : filter}" aria-pressed="${on}">${inner}</button>`
        : `<div class="card flex min-w-0 items-center gap-3 p-3.5 sm:p-4">${inner}</div>`;
    };

    el.innerHTML = `
      ${UI.pageHeader({ eyebrow: 'Prepaid', title: 'Generate Bangla QR (Prepaid)', sub: `Find the customer, enter the recharge amount, and hand over the QR. Each QR carries the amount and a one-time reference, and is valid for ${A.QR_VALID_H} hours.` })}

      <div class="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        ${tile('zap', 'bg-brand-50 text-brand', 'Generated today', U.n(today.length), today.length ? `${sum(today)} in total` : 'None yet today')}
        ${tile('checkCircle', 'bg-ok-soft text-ok', 'Paid today', U.n(paidToday.length), paidToday.length ? `${sum(paidToday)} received` : 'No payments yet today')}
        ${tile('clock', 'bg-warn-soft text-warn', 'Awaiting payment', U.n(pending.length), pending.length ? `${pending.length === 1 ? 'customer' : 'customers'} · ${sum(pending)}` : 'Nothing waiting', 'pending')}
        ${tile('user', 'bg-surface-3 text-ink-2', 'Customers without a QR', U.n(noQr), `of ${U.plural(all.length, 'prepaid customer')}`, 'none')}
      </div>

      <section class="card">
        <div class="space-y-4 border-b border-line p-4 sm:p-5">
          <form class="flex flex-col gap-2 sm:flex-row sm:items-start" data-search role="search">
            ${D.searchField({ id: 'pq-q', value: st.q, label: 'Customer ID, meter number or Book number', placeholder: 'Customer, meter or book number' })}
            <button class="btn btn-primary h-11 px-5">${UI.icon('search')}Search</button>
          </form>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap gap-2" role="group" aria-label="Filter by latest QR">
              ${FILTERS.map(([k, l]) => `<button class="chip" data-filter="${k}" aria-pressed="${st.filter === k}">${l}<span class="chip-count num">${U.n(counts[k] || 0)}</span></button>`).join('')}
            </div>
            <div class="text-xs text-ink-3">${st.q ? `${U.plural(found.length, 'customer')} match “${U.esc(st.q)}”` : `${U.plural(all.length, 'prepaid customer')}`}</div>
          </div>
        </div>
        ${!list.length ? `${UI.empty(st.q && !found.length ? 'No prepaid customer found' : 'No customers in this filter',
            st.q && !found.length ? `Nothing matches “${U.esc(st.q)}”. Check the Customer ID, meter number or Book number.` : 'Try another filter, or show everyone.', 'search')}
          <div class="-mt-10 pb-8 text-center"><button class="btn btn-secondary btn-sm" data-reset>Show all customers</button></div>` : `
        <div class="scroll-thin overflow-x-auto">
          <table class="tbl tbl-stack">
            <thead><tr><th>Customer</th><th>Meter number</th><th>Latest QR</th><th class="r">Amount</th><th class="c-actions">Action</th></tr></thead>
            <tbody>
              ${rows.map((c) => {
                const last = A.qrsOf(c.account)[0];
                const s = last && A.qrStatus(last);
                const waiting = s?.key === 'pending';
                return `<tr class="${waiting ? 'is-attention' : ''}">
                  <td class="c-main" data-label="Customer">${D.cell(U.esc(c.name), `<span class="num">${c.account}</span> · Book <span class="num">${c.book}</span>`)}</td>
                  <td class="num text-ink-2" data-label="Meter number">${c.meter}</td>
                  <td data-label="Latest QR">${last ? `
                    <button type="button" class="group -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-surface-3" data-view="${last.id}" aria-label="Open the latest QR, ${U.tk(last.amount)}, ${s.label}">
                      ${UI.badge(s.label, s.tone)}${UI.icon('chevR', 'h-3.5 w-3.5 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100')}
                    </button>${waiting ? `<div class="c-sub">Valid until ${U.fmtShort(last.expires)}, ${U.fmtTime(last.expires)}</div>` : ''}`
                    : '<span class="text-[13px] text-ink-3">No QR yet</span>'}</td>
                  <td class="num r" data-label="Amount">${last ? `<span class="font-medium">${U.tk(last.amount)}</span>` : '<span class="text-ink-3">—</span>'}</td>
                  <td class="c-actions">${waiting
                    ? `<button class="btn btn-secondary btn-xs" data-view="${last.id}">${UI.icon('eye')}Show QR</button>`
                    : `<button class="btn btn-primary btn-xs" data-gen="${c.account}">${UI.icon('zap')}Generate QR</button>`}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ${UI.pager(st.page, pages, list.length, PER)}`}
      </section>`;

    const q = U.$('#pq-q', el);
    D.bindSuggest(el, 'pq-q', (v) => D.suggestCustomers(A.prepaid, v, { meter: true }), (v) => { st.q = v; st.page = 1; D.refresh(); });
    el.addEventListener('submit', (e) => { e.preventDefault(); st.q = q.value; st.page = 1; D.refresh(); U.$('#pq-q')?.focus(); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-clear')) { st.q = ''; st.page = 1; D.refresh(); return; }
      if (b.dataset.filter) { st.filter = b.dataset.filter; st.page = 1; D.refresh(); return; }
      if (b.hasAttribute('data-reset')) { st.q = ''; st.filter = 'all'; st.page = 1; D.refresh(); return; }
      if (b.dataset.page) { st.page = Number(b.dataset.page); D.refresh(); return; }
      if (b.dataset.gen) { genModal(b.dataset.gen); return; }
      if (b.dataset.view) openQR(A.qr(b.dataset.view));
    });
  };
})(window.DESCO = window.DESCO || {});
