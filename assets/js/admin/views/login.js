/* Admin sign-in: ID + password. Demo build: any ID and password sign in. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;

  (D.views = D.views || {}).login = (root) => {
    document.title = 'Sign in · DESCO Admin';
    root.innerHTML = `
      <div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <aside class="tex-grid relative hidden flex-col overflow-hidden bg-brand-900 px-12 py-10 text-white lg:flex">
          <div class="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-400/25 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-48 right-0 h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-3xl"></div>
          <div class="relative flex items-center gap-3">
            <span class="inline-flex rounded-md bg-white px-3 py-2.5 shadow-sm"><img src="assets/img/logo-desco.svg" alt="DESCO — Power is yours" class="h-7"></span>
            <span class="text-[13px] font-medium text-white/70">Admin</span>
          </div>
          <div class="relative my-auto py-8">
            <h1 class="max-w-md text-[38px] font-semibold leading-[1.12] tracking-tight">Generate bills.<br>Issue QR. Reconcile.</h1>
            <ul class="mt-10 grid max-w-lg gap-3">
              ${D.ADMIN_NAV.filter((n) => n.sub).map((n) => `
                <li class="flex items-center gap-3 rounded-lg bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10">${UI.icon(n.icon, 'h-[18px] w-[18px]')}</span>
                  <span><span class="block text-[14px] font-medium">${n.label}</span><span class="text-[12px] text-white/55">${n.sub}</span></span>
                </li>`).join('')}
            </ul>
          </div>
          <p class="relative border-t border-white/10 pt-6 text-[12px] text-white/50">For DESCO billing staff only.</p>
        </aside>

        <main class="relative flex flex-col bg-paper px-5 py-6 sm:px-10">
          <div class="flex items-center justify-between">
            <img src="assets/img/logo-desco.svg" alt="DESCO" class="h-7 lg:invisible">
            <a href="index.html" class="link text-[13px]">Customer portal</a>
          </div>
          <div class="mx-auto my-auto w-full max-w-[26rem] py-10">
            <div class="rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_60px_-28px_rgba(10,21,62,.35)] sm:p-7">
              <div class="flex items-center gap-3">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">${UI.icon('lock', 'h-5 w-5')}</span>
                <h2 class="text-[22px] font-semibold leading-tight tracking-tight">Admin sign in</h2>
              </div>
              <form class="mt-6 space-y-4" novalidate>
                <div>
                  <label class="field-label" for="adm-id">Admin ID</label>
                  <input id="adm-id" class="input h-11 rounded-lg" autocomplete="username" placeholder="For example billing.gulshan" autofocus>
                </div>
                <div>
                  <label class="field-label" for="adm-pw">Password</label>
                  <input id="adm-pw" class="input h-11 rounded-lg" type="password" autocomplete="current-password" placeholder="••••••••">
                </div>
                <button class="btn btn-primary h-11 w-full text-[14px]">${UI.icon('lock')}Sign in</button>
              </form>
              <p class="mt-4 rounded-md bg-info-soft px-3 py-2 text-[12px] text-info">Demo: any ID and password sign in.</p>
            </div>
          </div>
          <footer class="text-center text-[11px] text-ink-3">© Dhaka Electricity Supply PLC</footer>
        </main>
      </div>`;

    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      A.login(U.$('#adm-id', root).value.trim().slice(0, 32));
      location.hash = '#/dashboard';
      UI.toast(`Welcome, ${A.user().id}`, { sub: 'Signed in to DESCO Admin' });
    });
  };
})(window.DESCO = window.DESCO || {});
