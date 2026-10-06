/* Portal shell: auth guard, hash router, navigation, language toggle, idle sign-out.
 * Flow: Login (mobile) → OTP → Dashboard → Due Bills → View bill → Scan QR → pay in MFS/bank app. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const S = D.store; const t = D.t;
  const $ = U.$;

  const ROUTES = [
    [/^\/login$/, 'login', null, true],
    [/^\/dashboard$/, 'dashboard', 'dashboard'],
    [/^\/bills$/, 'bills', 'bills'],
    [/^\/bills\/(\d{12})$/, 'bill', 'bills'],
  ];
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/dashboard' },
    { id: 'bills', label: 'Due Bills', icon: 'bill', href: '#/bills' },
  ];
  const VIEW_CLASS = 'mx-auto w-full max-w-6xl px-4 pb-12 pt-6 outline-none sm:px-6 lg:pt-8';
  const IDLE_MS = 15 * 60 * 1000;

  D.query = {};
  let current = null;

  /* ---------- Language ---------- */
  function applyLang() {
    document.documentElement.lang = D.lang();
    U.$$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === D.lang())));
    U.$$('[data-t]').forEach((el) => { el.innerHTML = t(el.dataset.t); });
  }

  /* ---------- Chrome ---------- */
  function renderChrome(navId) {
    const dueCount = S.accounts().reduce((n, c) => n + S.summary(c.account).open.length, 0);
    const link = (n, cls) => `<a href="${n.href}" class="${cls}" ${n.id === navId ? 'aria-current="page"' : ''}>${UI.icon(n.icon)}${t(n.label)}${n.id === 'bills' && dueCount ? `<span class="num ml-1 rounded-full bg-accent px-1.5 text-[10.5px] font-semibold leading-[18px] text-white">${U.n(dueCount)}</span>` : ''}</a>`;
    $('#topnav').innerHTML = NAV.map((n) => link(n, 'tnav')).join('');
    $('#tabnav').innerHTML = NAV.map((n) => link(n, 'tnav justify-center')).join('');

    const o = S.owner();
    $('#user-menu').innerHTML = `
      <button class="grid h-10 w-10 place-items-center rounded-full bg-accent text-[12px] font-semibold text-white" data-menu="user" aria-haspopup="true" aria-expanded="false" aria-label="${t('Account menu')}">${U.esc(U.initials(o.name))}</button>
      <div class="menu hidden" data-pop="user" role="menu">
        <div class="border-b border-line px-4 py-3">
          <div class="truncate text-[13px] font-semibold">${U.esc(o.name)}</div>
          <div class="num text-xs text-ink-3">${U.maskMobile(o.mobile)}</div>
          <div class="mt-1 text-xs text-ink-3">${D.tp(o.accounts.length, '{n} account on this number', '{n} accounts on this number')}</div>
        </div>
        <button class="menu-item text-danger" data-logout role="menuitem">${UI.icon('logout')}${t('Sign out')}</button>
      </div>`;
  }

  function closeMenus() {
    U.$$('[data-pop]').forEach((p) => p.classList.add('hidden'));
    U.$$('[data-menu]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  /* ---------- Router ---------- */
  function mount(name, navId, params, keepScroll) {
    const old = $('#view');
    const el = old.cloneNode(false); // drop listeners from the previous view
    old.replaceWith(el);
    el.className = VIEW_CLASS;
    $('#tooltip').classList.remove('on');
    closeMenus();
    current = { name, navId, params };
    document.body.classList.toggle('view-bill', name === 'bill');
    renderChrome(navId);
    D.views[name](el, ...params);
    if (!keepScroll) window.scrollTo(0, 0);
  }

  function route() {
    applyLang();
    const raw = location.hash.slice(1) || '/dashboard';
    const [path, qs] = raw.split('?');
    D.query = Object.fromEntries(new URLSearchParams(qs || ''));
    const hit = ROUTES.map(([re, name, nav, pub]) => ({ m: path.match(re), name, nav, pub })).find((r) => r.m);
    if (!hit) return location.replace('#/dashboard');

    if (!S.session) {
      if (!hit.pub) { try { sessionStorage.setItem('desco.portal.next', raw); } catch (e) { /* ignore */ } return location.replace('#/login'); }
      current = null;
      document.body.classList.remove('view-bill');
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
    if (!current || !S.session) return route();
    const y = window.scrollY;
    mount(current.name, current.navId, current.params, true);
    window.scrollTo(0, y);
  };
  D.afterLogin = () => {
    let next = null;
    try { next = sessionStorage.getItem('desco.portal.next'); sessionStorage.removeItem('desco.portal.next'); } catch (e) { /* ignore */ }
    location.hash = next && next !== '/login' ? `#${next}` : '#/dashboard';
  };
  D.signOut = (reason) => {
    S.logout();
    current = null;
    location.hash = '#/login';
    if (reason) UI.toast(t(reason), { tone: 'info' });
  };

  /* ---------- Idle sign-out ---------- */
  let idleTimer;
  const bumpIdle = () => {
    clearTimeout(idleTimer);
    if (S.session) idleTimer = setTimeout(() => D.signOut('Signed out after 15 minutes of inactivity'), IDLE_MS);
  };

  /* ---------- Boot ---------- */
  function boot() {
    S.init();
    UI.hydrateIcons();

    document.addEventListener('click', (e) => {
      const lang = e.target.closest('[data-lang]');
      if (lang) {
        if (lang.dataset.lang !== D.lang()) { D.setLang(lang.dataset.lang); applyLang(); S.session ? D.refresh() : route(); }
        return;
      }
      const m = e.target.closest('[data-menu]');
      if (m) {
        const pop = $(`[data-pop="${m.dataset.menu}"]`);
        const open = pop.classList.contains('hidden');
        closeMenus();
        pop.classList.toggle('hidden', !open);
        m.setAttribute('aria-expanded', String(open));
        return;
      }
      if (e.target.closest('[data-logout]')) { closeMenus(); D.signOut('You have signed out securely'); return; }
      if (!e.target.closest('[data-pop]')) closeMenus();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
    ['click', 'keydown', 'scroll', 'touchstart'].forEach((ev) => document.addEventListener(ev, bumpIdle, { passive: true }));

    window.addEventListener('hashchange', () => { route(); bumpIdle(); });
    route();
    bumpIdle();
  }

  boot();
})(window.DESCO = window.DESCO || {});
