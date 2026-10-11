/* Admin sign-in: ID + password. Demo build: any ID and password sign in. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const A = D.admin;

  /** Glass "preview" of the panel on the brand side, drawn from the same demo data the panel shows. */
  function preview() {
    const open = A.monthStats(A.openMonth);
    const rates = A.months.slice(-7, -1).map((m) => {
      const bills = A.billsOf(m);
      const billed = bills.reduce((t, b) => t + b.total, 0);
      return billed ? bills.reduce((t, b) => t + Math.min(b.paid, b.total), 0) / billed : 0;
    });
    const top = Math.max(...rates, 0.01);
    const paidQr = A.qrs().find((q) => q.paid);
    return `
      <div class="relative rounded-2xl bg-white/[0.06] p-4 shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)] ring-1 ring-white/15 backdrop-blur-sm" aria-hidden="true">
        <div class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50"><span>Overview</span><span>${U.monthLabel(A.openMonth)}</span></div>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <div class="text-[11.5px] text-white/60">Bills generated</div>
            <div class="num mt-1 text-[22px] font-semibold leading-none">${U.n(open.generated)}<span class="text-sm font-normal text-white/50">/${U.n(open.customers)}</span></div>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div class="h-full rounded-full bg-[#7fb0ff]" style="width:${((open.generated / open.customers) * 100).toFixed(0)}%"></div></div>
          </div>
          <div class="rounded-xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
            <div class="text-[11.5px] text-white/60">Collected, by month</div>
            <div class="mt-2 flex h-9 items-end gap-1">${rates.map((r, i) => `<span class="flex-1 rounded-[3px] ${i === rates.length - 1 ? 'bg-[#5fd3a0]' : 'bg-[#5fd3a0]/40'}" style="height:${Math.max(10, (r / top) * 100).toFixed(0)}%"></span>`).join('')}</div>
          </div>
        </div>
        ${paidQr ? `
        <div class="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.06] px-3.5 py-3 ring-1 ring-white/10">
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">${UI.icon('zap')}</span>
          <div class="min-w-0 flex-1"><div class="text-[12.5px] font-medium">Prepaid QR paid</div><div class="text-[11px] text-white/55">${U.esc(paidQr.paid.app)} · ${U.fmtShort(paidQr.paid.at)}</div></div>
          <span class="num text-[13px] font-semibold">${U.tk(paidQr.amount)}</span>
          <span class="rounded-full bg-[#5fd3a0]/20 px-2 py-0.5 text-[10.5px] font-semibold text-[#8ee6bd]">Paid</span>
        </div>` : ''}
      </div>`;
  }

  const SPIN = '<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".3" stroke-width="3"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';

  (D.views = D.views || {}).login = (root) => {
    document.title = 'Sign in · DESCO Admin';
    root.innerHTML = `
      <div class="grid min-h-screen lg:grid-cols-[minmax(0,40%)_1fr] 2xl:grid-cols-[600px_1fr]">
        <aside class="tex-grid relative hidden flex-col overflow-hidden bg-brand-900 px-10 py-10 text-white lg:flex xl:px-12">
          <div class="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-400/25 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-48 right-0 h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-3xl"></div>

          <div class="relative flex items-center gap-3">
            <span class="inline-flex rounded-md bg-white px-3 py-2.5 shadow-sm"><img src="assets/img/logo-desco.svg" alt="DESCO — Power is yours" class="h-7"></span>
            <span class="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Admin</span>
          </div>

          <div class="relative my-auto max-w-sm py-10">
            <h1 class="text-[30px] font-semibold leading-[1.15] tracking-tight">Billing back office</h1>
            <p class="mt-3 text-[14px] leading-relaxed text-white/65">Generate monthly bills, issue prepaid Bangla QR and reconcile every payment, in one place.</p>
            <div class="mt-8">${preview()}</div>
          </div>

          <p class="relative flex items-center gap-2 text-[12px] text-white/45">${UI.icon('shield', 'h-3.5 w-3.5')}For DESCO billing staff only</p>
        </aside>

        <main class="relative flex flex-col bg-paper px-5 py-6 sm:px-10">
          <div class="flex items-center justify-between">
            <img src="assets/img/logo-desco.svg" alt="DESCO" class="h-7 lg:invisible">
            <a href="index.html" class="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-brand">Customer portal${UI.icon('arrowUR', 'h-3.5 w-3.5')}</a>
          </div>

          <div class="mx-auto my-auto w-full max-w-[25rem] py-10">
            <div class="tex-grid mb-6 rounded-xl bg-brand-900 p-5 text-white lg:hidden">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">DESCO Admin</div>
              <div class="mt-1.5 text-lg font-semibold leading-snug">Billing back office</div>
            </div>

            <h2 class="text-[26px] font-semibold leading-tight tracking-tight">Welcome back</h2>
            <p class="mt-1.5 text-[13.5px] text-ink-2">Sign in with your DESCO staff ID to continue.</p>

            <form class="mt-7 space-y-5" novalidate>
              <div>
                <label class="field-label" for="adm-id">Admin ID</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">${UI.icon('user')}</span>
                  <input id="adm-id" class="input h-12 rounded-xl pl-10 text-[14px]" autocomplete="username" placeholder="For example billing.gulshan" autofocus>
                </div>
              </div>
              <div>
                <label class="field-label" for="adm-pw">Password</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">${UI.icon('lock')}</span>
                  <input id="adm-pw" class="input h-12 rounded-xl pl-10 pr-20 text-[14px]" type="password" autocomplete="current-password" placeholder="Enter your password" aria-describedby="adm-caps">
                  <button type="button" class="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-2 hover:bg-surface-3" data-toggle-pw aria-pressed="false">${UI.icon('eye', 'h-3.5 w-3.5')}<span>Show</span></button>
                </div>
                <p id="adm-caps" class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warn" hidden>${UI.icon('alert', 'h-3.5 w-3.5')}Caps Lock is on</p>
              </div>
              <button class="btn btn-primary h-12 w-full rounded-xl text-[14.5px]" data-submit>Sign in${UI.icon('chevR')}</button>
            </form>

            <p class="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-3">${UI.icon('info', 'h-3.5 w-3.5 shrink-0')}Demo build: any ID and password sign in.</p>
          </div>

          <footer class="text-center text-[11px] text-ink-3"><span class="lg:hidden">For DESCO billing staff only · </span>© Dhaka Electricity Supply PLC</footer>
        </main>
      </div>`;

    const pw = U.$('#adm-pw', root);
    const caps = U.$('#adm-caps', root);
    const toggle = root.querySelector('[data-toggle-pw]');
    toggle.addEventListener('click', () => {
      const show = pw.type === 'password';
      pw.type = show ? 'text' : 'password';
      toggle.setAttribute('aria-pressed', String(show));
      toggle.querySelector('span').textContent = show ? 'Hide' : 'Show';
      pw.focus();
    });
    const capsCheck = (e) => { if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); };
    pw.addEventListener('keydown', capsCheck);
    pw.addEventListener('keyup', capsCheck);
    pw.addEventListener('blur', () => { caps.hidden = true; });

    root.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = root.querySelector('[data-submit]');
      btn.disabled = true;
      btn.innerHTML = `${SPIN}Signing in…`;
      setTimeout(() => {
        A.login(U.$('#adm-id', root).value.trim().slice(0, 32));
        location.hash = '#/dashboard';
        UI.toast(`Welcome, ${A.user().id}`, { sub: 'Signed in to DESCO Admin' });
      }, 450);
    });
  };
})(window.DESCO = window.DESCO || {});
