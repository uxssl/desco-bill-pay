/* History: every bill generation, QR generation, report export and sign-in — who, when, what. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;
  const st = { type: 'all', q: '', page: 1 };
  const PER = 20;
  const TONE = { info: 'bg-info-soft text-info', violet: 'bg-violet-soft text-violet', ok: 'bg-ok-soft text-ok', neutral: 'bg-surface-3 text-ink-2' };
  /** Group a page of entries by day, keeping order. */
  const days = (list) => list.reduce((out, h) => {
    const d = h.at.slice(0, 10);
    if (!out.length || out[out.length - 1][0] !== d) out.push([d, []]);
    out[out.length - 1][1].push(h);
    return out;
  }, []);

  (D.views = D.views || {}).history = (el) => {
    document.title = 'History · DESCO Admin';
    const all = A.history();
    const counts = all.reduce((o, h) => { o[h.type] = (o[h.type] || 0) + 1; return o; }, { all: all.length });
    const q = st.q.trim().toLowerCase();
    const rows = all.filter((h) => (st.type === 'all' || h.type === st.type)
      && (!q || [h.action, h.target, h.detail, h.by].some((x) => String(x).toLowerCase().includes(q))));
    const pages = Math.max(1, Math.ceil(rows.length / PER));
    const perDay = rows.reduce((o, h) => { const d = h.at.slice(0, 10); o[d] = (o[d] || 0) + 1; return o; }, {});
    st.page = Math.min(st.page, pages);

    el.innerHTML = `
      ${UI.pageHeader({ eyebrow: 'Audit trail', title: 'History', sub: 'Every bill and QR generated, report exported and sign-in — who did it and when.',
        actions: `<button class="btn btn-secondary" data-export ${rows.length ? '' : 'disabled'}>${UI.icon('download')}Export CSV</button>` })}
      <section class="card">
        <div class="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2">
            ${[['all', 'All']].concat(Object.entries(D.HISTORY_TYPES).map(([k, v]) => [k, v.label])).map(([k, l]) => `<button class="chip" data-type="${k}" aria-pressed="${st.type === k}">${l}<span class="chip-count num">${U.n(counts[k] || 0)}</span></button>`).join('')}
          </div>
          <form class="relative w-full lg:w-64 xl:w-72" role="search">
            <label class="sr-only" for="hs-q">Search history</label>
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">${UI.icon('search')}</span>
            <input id="hs-q" class="input pl-9 pr-9" placeholder="Search customer, month or person" value="${U.esc(st.q)}" autocomplete="off">
            ${st.q ? `<button type="button" class="btn btn-ghost btn-icon btn-xs absolute right-1.5 top-1/2 -translate-y-1/2" data-clear aria-label="Clear search">${UI.icon('x')}</button>` : ''}
          </form>
        </div>
        ${rows.length ? `
          <div>
            ${days(rows.slice((st.page - 1) * PER, st.page * PER)).map(([day, items]) => {
              const ago = U.diffDays(A.today, day);
              return `
              <div class="sticky top-[101px] z-[1] flex items-baseline gap-2 border-b border-line bg-surface-2/95 px-5 py-2 backdrop-blur lg:top-0">
                <span class="text-[12.5px] font-semibold">${ago === 0 ? 'Today' : ago === 1 ? 'Yesterday' : U.fmtDate(day)}</span>
                <span class="text-xs text-ink-3">${ago <= 1 ? `${U.fmtDate(day)} · ` : ''}${U.plural(perDay[day], 'action')}</span>
              </div>
              <ol class="relative">
                ${items.map((h, i) => {
                  const ty = D.HISTORY_TYPES[h.type] || { label: h.type, tone: 'neutral', icon: 'info' };
                  return `
                  <li class="relative flex gap-4 px-5 py-3.5 hover:bg-surface-2/60">
                    ${i < items.length - 1 ? '<span class="absolute bottom-0 left-[2.35rem] top-12 w-px bg-line" aria-hidden="true"></span>' : ''}
                    <span class="relative grid h-9 w-9 shrink-0 place-items-center rounded-full ring-4 ring-surface ${TONE[ty.tone] || TONE.neutral}">${UI.icon(ty.icon)}</span>
                    <div class="min-w-0 flex-1 pt-0.5">
                      <div class="text-[13.5px]"><span class="font-medium">${U.esc(h.action)}</span> <span class="${/^\d+$/.test(h.target) ? 'num ' : ''}text-ink-3">· ${U.esc(h.target)}</span></div>
                      <div class="mt-0.5 text-xs text-ink-3">${U.esc(h.detail)}</div>
                    </div>
                    <div class="shrink-0 pt-0.5 text-right">
                      <div class="num text-[13px] font-medium text-ink-2">${U.fmtTime(h.at)}</div>
                      <div class="mt-1 flex items-center justify-end gap-1.5 text-[11.5px] text-ink-3">
                        <span class="grid h-5 w-5 place-items-center rounded-full bg-surface-3 text-[9px] font-semibold text-ink-2" aria-hidden="true">${U.esc(U.initials(h.by.replace(/\(.*\)/, '')) || '?')}</span>
                        <span class="hidden max-w-[11rem] truncate sm:inline">${U.esc(h.by)}</span>
                      </div>
                    </div>
                  </li>`;
                }).join('')}
              </ol>`;
            }).join('')}
          </div>
          ${UI.pager(st.page, pages, rows.length, PER)}` : UI.empty('Nothing to show', 'No history matches this filter.', 'history')}
      </section>`;

    el.addEventListener('submit', (e) => { e.preventDefault(); st.q = U.$('#hs-q', el).value; st.page = 1; D.refresh(); U.$('#hs-q')?.focus(); });
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.type) { st.type = b.dataset.type; st.page = 1; D.refresh(); return; }
      if (b.dataset.page) { st.page = Number(b.dataset.page); D.refresh(); return; }
      if (b.hasAttribute('data-clear')) { st.q = ''; st.page = 1; D.refresh(); return; }
      if (b.hasAttribute('data-export')) {
        U.csv(`DESCO-admin-history-${A.today}.csv`, [['Date', 'Time', 'Type', 'Action', 'For', 'Details', 'By']]
          .concat(rows.map((h) => [h.at.slice(0, 10), U.fmtTime(h.at), (D.HISTORY_TYPES[h.type] || {}).label || h.type, h.action, h.target, h.detail, h.by])));
        UI.toast('History exported');
      }
    });
  };
})(window.DESCO = window.DESCO || {});
