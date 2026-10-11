/* Search-as-you-type for the admin customer searches: matching books and customers drop down under the
 * field while typing; picking one fills the field and loads its results. Arrow keys, Enter and Esc work too. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui;

  const norm = (raw) => String(raw || '').trim().toLowerCase().replace(/^book\s*/, '');
  /** Escaped text with the matched part in bold. */
  const mark = (text, q) => {
    const s = String(text);
    const i = q ? s.toLowerCase().indexOf(q) : -1;
    return i < 0 ? U.esc(s) : `${U.esc(s.slice(0, i))}<b class="font-semibold text-ink">${U.esc(s.slice(i, i + q.length))}</b>${U.esc(s.slice(i + q.length))}`;
  };

  /** Suggestions from a customer list: matching books first, then customers (ID, name, and meter number if `meter`). */
  D.suggestCustomers = (list, raw, { meter = false } = {}) => {
    const q = norm(raw);
    if (!q) return [];
    const books = new Map();
    list.forEach((c) => { if (c.book.startsWith(q)) books.set(c.book, (books.get(c.book) || 0) + 1); });
    const out = [...books].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 3)
      .map(([b, n]) => ({ value: b, icon: 'layers', html: `Book <span class="num">${mark(b, q)}</span>`, sub: `All ${U.plural(n, 'customer')} in this book` }));
    list.filter((c) => c.account.startsWith(q) || (meter && c.meter.startsWith(q)) || c.name.toLowerCase().includes(q))
      .slice(0, 8 - out.length)
      .forEach((c) => out.push({
        value: c.account, icon: 'user',
        html: `<span class="num">${mark(c.account, q)}</span> · ${mark(c.name, q)}`,
        sub: `Book <span class="num">${U.esc(c.book)}</span> · ${meter ? `Meter <span class="num">${mark(c.meter, q)}</span>` : U.esc(c.type)}`,
      }));
    return out;
  };

  /** Search field markup: input, clear button and the (hidden) suggestion list. */
  D.searchField = ({ id, value = '', placeholder, label }) => `
    <div class="relative flex-1" data-suggest="${id}">
      <label class="sr-only" for="${id}">${label}</label>
      <span class="pointer-events-none absolute left-3 top-[1.375rem] -translate-y-1/2 text-ink-3">${UI.icon('search')}</span>
      <input id="${id}" class="input h-11 pl-9 pr-10 text-[13.5px]" placeholder="${placeholder}" value="${U.esc(value)}" autocomplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list">
      <button type="button" class="btn btn-ghost btn-icon btn-sm absolute right-1.5 top-[1.375rem] -translate-y-1/2" data-clear aria-label="Clear search" ${value ? '' : 'hidden'}>${UI.icon('x')}</button>
      <ul id="${id}-list" role="listbox" aria-label="Suggestions" class="scroll-thin absolute inset-x-0 top-full z-20 mt-1 hidden max-h-80 overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-pop"></ul>
    </div>`;

  /** Wire a `D.searchField`: `source(q)` returns suggestions, `onPick(value)` loads the picked one. */
  D.bindSuggest = (root, id, source, onPick) => {
    const input = U.$(`#${id}`, root);
    const list = U.$(`#${id}-list`, root);
    const clear = U.$(`[data-suggest="${id}"] [data-clear]`, root);
    if (!input) return;
    let items = [];
    let active = -1;

    const close = () => {
      list.classList.add('hidden');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };
    const paint = () => {
      list.innerHTML = items.length
        ? items.map((it, i) => `
          <li id="${id}-opt-${i}" role="option" aria-selected="${i === active}" data-i="${i}" class="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] ${i === active ? 'bg-brand-50' : 'hover:bg-surface-2'}">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md ${it.icon === 'layers' ? 'bg-brand-50 text-brand' : 'bg-surface-3 text-ink-3'}">${UI.icon(it.icon)}</span>
            <span class="min-w-0"><span class="block truncate text-ink-2">${it.html}</span><span class="block truncate text-[11.5px] text-ink-3">${it.sub}</span></span>
          </li>`).join('')
        : `<li class="px-3 py-3 text-[13px] text-ink-3">No match for “${U.esc(input.value.trim())}”</li>`;
      list.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
      if (active >= 0) {
        input.setAttribute('aria-activedescendant', `${id}-opt-${active}`);
        U.$(`#${id}-opt-${active}`, list)?.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    };
    const update = () => {
      if (clear) clear.hidden = !input.value;
      if (!input.value.trim()) { items = []; close(); return; }
      items = source(input.value);
      active = -1;
      paint();
    };
    const pick = (i) => {
      const it = items[i];
      if (!it) return;
      input.value = it.value;
      close();
      onPick(it.value);
    };

    input.addEventListener('input', update);
    input.addEventListener('keydown', (e) => {
      const open = !list.classList.contains('hidden');
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) { update(); return; } active = Math.min(items.length - 1, active + 1); paint(); }
      else if (e.key === 'ArrowUp' && open) { e.preventDefault(); active = Math.max(-1, active - 1); paint(); }
      else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); pick(active); }
      else if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
    list.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus so the click lands
    list.addEventListener('click', (e) => { const li = e.target.closest('[data-i]'); if (li) pick(Number(li.dataset.i)); });
  };
})(window.DESCO = window.DESCO || {});
