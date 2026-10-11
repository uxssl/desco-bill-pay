/* Monthly bill generation. Pick the bill month (page header), then
 *   Bulk:   every postpaid customer without a bill for that month → success summary
 *   Single: search by Customer ID, name or Book number → generate per customer (or the whole book) → success
 * Both sit on the page together, so there is no mode to switch. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;
  const st = { ym: null, q: '' };

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /** Year + month selects limited to the months the demo can bill. Shared with Reconciliation. */
  D.monthPicker = (ym, attr = 'data-ym') => {
    const years = [...new Set(A.months.map((m) => m.slice(0, 4)))];
    const [y] = ym.split('-');
    return `
      <div class="flex gap-2">
        <label class="sr-only" for="pick-y">Year</label>
        <select id="pick-y" class="select w-[6.5rem]" ${attr}="y">${years.map((x) => `<option ${x === y ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <label class="sr-only" for="pick-m">Month</label>
        <select id="pick-m" class="select w-[9.5rem]" ${attr}="m">${A.months.filter((m) => m.startsWith(y)).map((m) => `<option value="${m}" ${m === ym ? 'selected' : ''}>${MONTHS[Number(m.slice(5)) - 1]}</option>`).join('')}</select>
      </div>`;
  };
  /** New month after a year/month select changed (keeps the month when the new year has it). */
  D.pickMonth = (sel, ym) => {
    if (sel.dataset.ym === 'm' || sel.dataset.rym === 'm') return sel.value;
    const list = A.months.filter((m) => m.startsWith(sel.value));
    return list.find((m) => m.slice(5) === ym.slice(5)) || list[list.length - 1];
  };

  function successBody(ym, res) {
    const one = res.created.length === 1 ? res.created[0] : null;
    const c = one && A.customer(one.account);
    return `
      <div class="py-2 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-soft text-ok">${UI.icon('checkCircle', 'h-7 w-7')}</span>
        <h3 class="mt-4 text-lg font-semibold">Success</h3>
        <p class="mt-1 text-[13px] text-ink-2">${one ? `${U.monthLabel(ym)} bill generated for <b>${U.esc(c.name)}</b>.` : `${U.plural(res.created.length, 'bill')} generated for ${U.monthLabel(ym)}.`}</p>
      </div>
      <dl class="kv mt-5 rounded-lg bg-surface-2 p-4 ring-1 ring-line">
        ${one ? `
          <dt>Bill number</dt><dd class="num">${one.no}</dd>
          <dt>Customer ID</dt><dd class="num">${one.account}</dd>
          <dt>Units</dt><dd class="num">${U.n(one.kwh)} kWh</dd>
          <dt>Due date</dt><dd>${U.fmtDate(one.due)}</dd>
          <dt>Amount</dt><dd class="num text-base">${U.tk(one.total)}</dd>` : `
          <dt>Bills generated</dt><dd class="num">${U.n(res.created.length)}</dd>
          ${res.skipped ? `<dt>Already had a bill (skipped)</dt><dd class="num">${U.n(res.skipped)}</dd>` : ''}
          <dt>Due date</dt><dd>${U.fmtDate(res.created[0].due)}</dd>
          <dt>Total billed</dt><dd class="num text-base">${U.tk(res.amount)}</dd>`}
      </dl>`;
  }

  function showSuccess(m, ym, res) {
    m.locked = false;
    m.setTitle('Bill generation', U.monthLabel(ym));
    m.setBody(successBody(ym, res));
    m.setFooter(`<a href="#/recon?month=${ym}" class="btn btn-secondary" data-close>${UI.icon('chart')}View in Reconciliation</a><button class="btn btn-primary" data-close>Done</button>`);
  }

  /** Progress, then the success summary. */
  function run(ym, accounts, mode) {
    const m = UI.modal({
      title: 'Generating bills…', subtitle: U.monthLabel(ym), size: 'sm',
      body: `<div class="py-4"><div class="mb-2 flex justify-between text-xs text-ink-3"><span>Calculating ${U.plural(accounts.length, 'bill')}</span><span class="num" data-pct>0%</span></div><div class="h-2 overflow-hidden rounded-full bg-surface-3"><div class="h-full w-0 rounded-full bg-brand transition-[width] duration-200" data-bar></div></div></div>`,
      onClose: () => D.refresh(),
    });
    m.locked = true;
    const steps = accounts.length > 1 ? 8 : 3;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      const p = Math.round((i / steps) * 100);
      const bar = m.el.querySelector('[data-bar]');
      if (bar) { bar.style.width = `${p}%`; m.el.querySelector('[data-pct]').textContent = `${p}%`; }
      if (i >= steps) { clearInterval(iv); showSuccess(m, ym, A.generateBills(ym, accounts, mode)); }
    }, 140);
  }

  /** Card with an icon heading; Bulk and Single each get one. */
  const panel = (icon, title, sub, body, extra = '') => `
    <section class="card">
      <div class="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">${UI.icon(icon)}</span>
        <div class="min-w-0 flex-1"><h2 class="text-[14.5px] font-semibold">${title}</h2><p class="mt-0.5 text-xs text-ink-3">${sub}</p></div>
        ${extra}
      </div>
      <div class="p-5 sm:p-6">${body}</div>
    </section>`;

  (D.views = D.views || {}).billGen = (el) => {
    document.title = 'Bill Generation · DESCO Admin';
    if (!st.ym || !A.months.includes(st.ym)) st.ym = A.openMonth;
    const ym = st.ym;
    const s = A.monthStats(ym);
    const done = s.pending === 0;
    const due = U.addDays(A.today, D.RATES.dueDays);
    const results = st.q.trim() ? A.search(A.customers(), st.q) : [];
    const pendingInResults = results.filter((c) => !A.bill(c.account, ym));

    /* ---- Bulk: where the month stands, and the one action ---- */
    const bulk = panel('layers', 'Bulk · all customers', `Generate the ${U.monthLabel(ym)} bill for every postpaid customer who doesn't have one yet.`, `
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="num text-[32px] font-semibold leading-none tracking-tight">${U.n(s.generated)}</span>
            <span class="text-[14px] text-ink-3">of ${U.plural(s.customers, 'customer')} billed</span>
          </div>
          <div class="mt-3">${UI.meterBar(s.generated / s.customers, done ? 'bg-ok' : 'bg-brand')}</div>
          <div class="mt-2 text-xs text-ink-3">${s.generated ? `${U.tk(s.amount)} billed so far` : 'No bills generated for this month yet'}${done ? '' : ` · <b class="font-medium text-ink-2">${U.plural(s.pending, 'bill')} to generate</b>`}</div>
        </div>
        <div class="md:w-72 md:shrink-0">
          ${done ? `
            <div class="flex items-center gap-2 text-[13px] font-medium text-ok">${UI.icon('checkCircle', 'h-5 w-5')}All bills generated</div>
            <a href="#/recon?month=${ym}" class="btn btn-secondary mt-3 w-full">${UI.icon('chart')}View in Reconciliation</a>` : `
            <button class="btn btn-primary h-11 w-full text-[14px]" data-bulk>${UI.icon('layers')}Generate ${U.plural(s.pending, 'bill')}</button>
            <p class="mt-2 text-center text-[11.5px] text-ink-3">Dated ${U.fmtDate(A.today)} · due ${U.fmtDate(due)}</p>`}
        </div>
      </div>`, done ? '' : UI.badge(`${U.n(s.pending)} to go`, 'warn'));

    /* ---- Single: find a customer or a whole book ---- */
    const examples = [...new Set(A.customers().map((c) => c.book))].sort().slice(0, 3).map((b) => [b, `Book ${b}`]);
    const someone = A.customers().find((c) => !A.bill(c.account, ym)) || A.customers()[0];
    examples.push([someone.account, someone.account]);
    const table = `
      <div class="mt-5 flex flex-wrap items-center justify-between gap-2">
        <div class="text-[13px] text-ink-2"><b class="font-semibold text-ink">${U.plural(results.length, 'customer')}</b> found · ${U.n(results.length - pendingInResults.length)} already billed for ${U.monthLabel(ym)}</div>
        ${pendingInResults.length > 1 ? `<button class="btn btn-primary btn-sm" data-gen-all>${UI.icon('layers')}Generate all ${U.n(pendingInResults.length)}</button>` : ''}
      </div>
      <div class="scroll-thin mt-3 overflow-x-auto rounded-lg border border-line">
        <table class="tbl tbl-stack">
          <thead><tr><th>Customer</th><th>Book</th><th>Tariff</th><th>${U.monthLabel(ym)} bill</th><th class="r">Amount</th><th class="c-actions">Action</th></tr></thead>
          <tbody>
            ${results.slice(0, 50).map((c) => {
              const b = A.bill(c.account, ym);
              return `<tr>
                <td class="c-main" data-label="Customer">${D.cell(U.esc(c.name), `<span class="num">${c.account}</span> · ${U.esc(c.type)}`)}</td>
                <td class="num text-ink-2" data-label="Book">${c.book}</td>
                <td data-label="Tariff">${D.cell(U.esc(D.TARIFF[c.tariff].label), U.esc(c.tariff))}</td>
                <td data-label="${U.monthLabel(ym)} bill">${b ? D.cell(UI.badge('Generated', 'ok'), `<span class="num">${b.no}</span>`) : UI.badge('Not generated', 'neutral')}</td>
                <td class="num r" data-label="Amount">${b ? `<span class="font-medium">${U.tk(b.total)}</span>` : '<span class="text-ink-3">—</span>'}</td>
                <td class="c-actions">${b ? '' : `<button class="btn btn-primary btn-xs" data-gen="${c.account}">${UI.icon('plus')}Generate bill</button>`}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    const single = panel('user', 'Single · customer or book', 'Find one customer by Customer ID or name, or enter a Book number to see everyone in that book.', `
      <form class="flex flex-col gap-2 sm:flex-row sm:items-start" data-search role="search">
        ${D.searchField({ id: 'bg-q', value: st.q, label: 'Customer ID, name or Book number', placeholder: 'Customer ID, name or Book number' })}
        <button class="btn btn-primary h-11 px-5">${UI.icon('search')}Search</button>
      </form>
      ${!st.q.trim() ? `
        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">Try
          ${examples.map(([v, l]) => `<button type="button" class="chip h-7 px-3 text-xs" data-try="${v}"><span class="num">${l}</span></button>`).join('')}
        </div>`
        : !results.length ? `
        <div class="mt-5 flex items-start gap-3 rounded-lg bg-surface-2 px-4 py-3.5 text-[13px] text-ink-2 ring-1 ring-line">${UI.icon('search', 'mt-0.5 h-4 w-4 shrink-0 text-ink-3')}<span>No postpaid customer matches “<b>${U.esc(st.q)}</b>”. Check the Customer ID or Book number.</span></div>`
        : table}`);

    el.innerHTML = `
      ${UI.pageHeader({ eyebrow: 'Postpaid', title: 'Monthly Bill Generation', sub: 'Generate the month’s bills for everyone at once, or for one customer or book.',
        actions: `<div class="flex items-center gap-2.5"><span class="text-xs font-medium text-ink-3">Bill month</span>${D.monthPicker(ym)}</div>` })}
      <div class="space-y-5">${bulk}${single}</div>`;

    const q = U.$('#bg-q', el);
    D.bindSuggest(el, 'bg-q', (v) => D.suggestCustomers(A.customers(), v), (v) => { st.q = v; D.refresh(); });

    el.addEventListener('change', (e) => {
      if (e.target.dataset.ym) { st.ym = D.pickMonth(e.target, st.ym); D.refresh(); }
    });
    el.addEventListener('submit', (e) => { e.preventDefault(); st.q = q.value; D.refresh(); U.$('#bg-q')?.focus(); });
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.try) { st.q = b.dataset.try; D.refresh(); return; }
      if (b.hasAttribute('data-clear')) { st.q = ''; D.refresh(); return; }
      if (b.dataset.gen) { run(ym, [b.dataset.gen], 'single'); return; }
      if (b.hasAttribute('data-gen-all')) { run(ym, pendingInResults.map((c) => c.account), 'single'); return; }
      if (b.hasAttribute('data-bulk')) {
        const ok = await UI.confirm({ title: `Generate ${U.monthLabel(ym)} bills?`, body: `${U.plural(s.pending, 'bill')} (one per customer without a ${U.monthLabel(ym)} bill) will be generated, dated ${U.fmtDate(A.today)} and due ${U.fmtDate(due)}. Bills already generated are not changed.`, confirm: `Generate ${U.plural(s.pending, 'bill')}` });
        if (ok) run(ym, A.customers().filter((c) => !A.bill(c.account, ym)).map((c) => c.account), 'bulk');
      }
    });
  };
})(window.DESCO = window.DESCO || {});
