/* Admin shell: auth guard, hash router, sidebar navigation.
 * Menu: Dashboard · Bill Generation · Prepaid QR · Reconciliation & Report · History. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;
  const $ = U.$;

  const ROUTES = [
    [/^\/login$/, 'login', null, true],
    [/^\/dashboard$/, 'dashboard', 'dashboard'],
    [/^\/bills$/, 'billGen', 'bills'],
    [/^\/prepaid$/, 'prepaidQr', 'prepaid'],
    [/^\/recon$/, 'recon', 'recon'],
    [/^\/history$/, 'history', 'history'],
  ];
  D.ADMIN_NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/dashboard', group: 'Overview' },
    { id: 'bills', label: 'Bill Generation', icon: 'bill', href: '#/bills', sub: 'Monthly · bulk or single', group: 'Daily work' },
    { id: 'prepaid', label: 'Prepaid QR', icon: 'zap', href: '#/prepaid', sub: 'Dynamic Bangla QR', group: 'Daily work' },
    { id: 'recon', label: 'Reconciliation & Report', icon: 'chart', href: '#/recon', sub: 'Generated vs paid', group: 'Reports' },
    { id: 'history', label: 'History', icon: 'history', href: '#/history', sub: 'Who did what, when', group: 'Reports' },
  ];
  const VIEW_CLASS = 'mx-auto w-full max-w-6xl px-4 pb-12 pt-6 outline-none sm:px-6 lg:px-8 lg:pt-8';

  D.query = {};
  let current = null;

  /** Things waiting on staff, shown as a count next to the menu item. */
  const navCount = (id) => {
    if (id === 'bills') return A.monthStats(A.openMonth).pending;
    if (id === 'prepaid') return A.prepaid.filter((c) => { const q = A.qrsOf(c.account)[0]; return q && A.qrStatus(q).key === 'pending'; }).length;
    return 0;
  };

  function renderChrome(navId) {
    const counts = Object.fromEntries(D.ADMIN_NAV.map((n) => [n.id, navCount(n.id)]));
    const hint = { bills: 'customers still need a bill', prepaid: 'QRs awaiting payment' };
    const link = (n, cls, pill) => `<a href="${n.href}" class="${cls}" ${n.id === navId ? 'aria-current="page"' : ''}>${UI.icon(n.icon)}<span class="min-w-0 flex-1 truncate">${n.label}</span>${counts[n.id] ? `<span class="num ${pill}" title="${U.n(counts[n.id])} ${hint[n.id]}">${U.n(counts[n.id])}</span><span class="sr-only"> (${U.n(counts[n.id])} ${hint[n.id]})</span>` : ''}</a>`;
    const groups = [...new Set(D.ADMIN_NAV.map((n) => n.group))];
    $('#sidenav').innerHTML = groups.map((g) => `
      <div class="mb-4">
        <div class="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/35">${g}</div>
        <div class="flex flex-col gap-0.5">${D.ADMIN_NAV.filter((n) => n.group === g).map((n) => link(n, 'snav', 'rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-[18px] text-white')).join('')}</div>
      </div>`).join('');
    $('#tabnav').innerHTML = D.ADMIN_NAV.map((n) => link(n, 'tnav shrink-0', 'rounded-full bg-accent px-1.5 text-[10.5px] font-semibold leading-[17px] text-white')).join('');
    // Keep the current page's tab in view on the scrolling mobile menu (after layout and web fonts settle)
    const centre = () => { const a = U.$('#tabnav [aria-current]'); const nav = U.$('#tabnav'); if (a && nav.offsetParent) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2; };
    requestAnimationFrame(centre);
    document.fonts?.ready.then(centre);
    const u = A.user();
    $('#side-user').innerHTML = `
      <div class="flex items-center gap-3 px-2">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-[12px] font-semibold">${U.esc(u.id.slice(0, 2).toUpperCase())}</span>
        <div class="min-w-0 flex-1"><div class="truncate text-[13px] font-medium">${U.esc(u.name)}</div><div class="text-[11px] text-white/50">Billing admin</div></div>
        <button class="btn btn-ghost btn-icon btn-sm text-white/60 hover:bg-white/10 hover:text-white" data-logout aria-label="Sign out" data-tip="Sign out">${UI.icon('logout')}</button>
      </div>
      <button class="mt-3 w-full rounded-md px-2 py-1.5 text-left text-[11.5px] text-white/45 hover:bg-white/5 hover:text-white/80" data-reset>Reset demo data</button>`;
  }

  function mount(name, navId, params, keepScroll) {
    const old = $('#view');
    const el = old.cloneNode(false); // drop listeners from the previous view
    old.replaceWith(el);
    el.className = VIEW_CLASS;
    $('#tooltip').classList.remove('on');
    current = { name, navId, params };
    renderChrome(navId);
    D.views[name](el, ...params);
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function route() {
    const raw = location.hash.slice(1) || '/dashboard';
    const [path, qs] = raw.split('?');
    D.query = Object.fromEntries(new URLSearchParams(qs || ''));
    const hit = ROUTES.map(([re, name, nav, pub]) => ({ m: path.match(re), name, nav, pub })).find((r) => r.m);
    if (!hit) return location.replace('#/dashboard');

    if (!A.session) {
      if (!hit.pub) return location.replace('#/login');
      current = null;
      $('#shell').hidden = true;
      D.views.login($('#auth-root'));
      return;
    }
    if (hit.pub) return location.replace('#/dashboard');
    $('#auth-root').innerHTML = '';
    $('#shell').hidden = false;
    mount(hit.name, hit.nav, hit.m.slice(1));
  }

  D.refresh = () => {
    if (!current || !A.session) return route();
    const y = window.scrollY;
    mount(current.name, current.navId, current.params, true);
    window.scrollTo(0, y);
  };

  function boot() {
    D.setLang('en', false); // admin panel is English-only; leaves the customer's saved language alone
    A.init();
    document.addEventListener('click', async (e) => {
      if (e.target.closest('[data-logout]')) { A.logout(); location.hash = '#/login'; UI.toast('You have signed out', { tone: 'info' }); return; }
      if (e.target.closest('[data-reset]')) {
        const ok = await UI.confirm({ title: 'Reset demo data?', body: 'Bills and QRs generated in this browser, and their history entries, will be removed. The seeded demo data stays.', confirm: 'Reset', tone: 'danger' });
        if (ok) { A.reset(); D.refresh(); UI.toast('Demo data reset'); }
      }
    });
    window.addEventListener('hashchange', route);
    route();
  }

  boot();
})(window.DESCO = window.DESCO || {});
