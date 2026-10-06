/* Step 1–2 of the flow: mobile number → OTP.
 * DEMO BUILD: no validation — any number and any code sign in. Production must validate the number,
 * and generate, send, expire and rate-limit OTPs on the server. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const S = D.store; const t = D.t;
  const st = { step: 'mobile', mobile: '', sentAt: 0 };

  /** Left-hand visual: the bill with its QR, and a phone scanning it. */
  function heroArt() {
    return `
      <div class="relative mx-auto h-[310px] w-full max-w-[540px]" aria-hidden="true">
        <div class="absolute left-0 top-4 w-[410px] -rotate-[5deg] rounded-md bg-[#fffdf7] p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,.6)] ring-1 ring-white/20">
          <div class="flex items-start justify-between gap-3">
            <div><img src="assets/img/logo-desco.svg" alt="" class="h-5" draggable="false"><div class="mt-1.5 text-[11px] font-medium text-brand">Electricity Bill</div></div>
            <img src="${D.QR.image}" alt="" class="h-12 w-12" draggable="false">
          </div>
          <div class="mt-3 grid grid-cols-[1fr_150px] gap-3 border border-brand/40 p-3">
            <div class="space-y-2.5"><div class="flex items-center gap-2"><span class="block h-1.5 rounded-full bg-brand/25" style="width:28%"></span><span class="block h-1.5 rounded-full bg-brand/15" style="width:44%"></span></div><div class="flex items-center gap-2"><span class="block h-1.5 rounded-full bg-brand/25" style="width:28%"></span><span class="block h-1.5 rounded-full bg-brand/15" style="width:36%"></span></div><div class="flex items-center gap-2"><span class="block h-1.5 rounded-full bg-brand/25" style="width:28%"></span><span class="block h-1.5 rounded-full bg-brand/15" style="width:50%"></span></div><div class="flex items-center gap-2"><span class="block h-1.5 rounded-full bg-brand/25" style="width:28%"></span><span class="block h-1.5 rounded-full bg-brand/15" style="width:30%"></span></div></div>
            <div class="space-y-2.5 border-l border-brand/30 pl-3"><div class="flex items-center justify-between gap-3"><span class="block h-1.5 rounded-full bg-brand/15" style="width:46%"></span><span class="block h-1.5 rounded-full bg-brand/25" style="width:18%"></span></div><div class="flex items-center justify-between gap-3"><span class="block h-1.5 rounded-full bg-brand/15" style="width:38%"></span><span class="block h-1.5 rounded-full bg-brand/25" style="width:18%"></span></div><div class="flex items-center justify-between gap-3"><span class="block h-1.5 rounded-full bg-brand/15" style="width:52%"></span><span class="block h-1.5 rounded-full bg-brand/25" style="width:18%"></span></div><div class="flex items-center justify-between gap-3"><span class="block h-1.5 rounded-full bg-brand/15" style="width:34%"></span><span class="block h-1.5 rounded-full bg-brand/25" style="width:18%"></span></div><div class="flex items-center justify-between gap-3"><span class="block h-1.5 rounded-full bg-brand/15" style="width:44%"></span><span class="block h-1.5 rounded-full bg-brand/25" style="width:18%"></span></div><div class="flex items-center justify-between gap-3"><span class="block h-1.5 rounded-full bg-brand/15" style="width:40%"></span><span class="block h-1.5 rounded-full bg-brand/25" style="width:18%"></span></div></div>
          </div>
          <div class="mt-2 flex items-center justify-between border border-brand/40 px-3 py-2"><span class="text-[10px] font-semibold text-brand">Total Bill</span><span class="h-2 w-16 rounded-full bg-brand/30"></span></div>
        </div>
        <div class="absolute bottom-0 right-2 h-[280px] w-[152px] rotate-[7deg] rounded-[26px] bg-[#0b0f1f] p-[7px] shadow-[0_30px_60px_-15px_rgba(0,0,0,.7)] ring-1 ring-white/15">
          <div class="flex h-full flex-col items-center rounded-[20px] bg-white px-3 pt-3 text-ink">
            <div class="h-1 w-10 rounded-full bg-line"></div>
            <div class="mt-3 text-[10px] font-semibold text-ink-2">Scan QR</div>
            <div class="login-scan relative mt-2 w-full rounded-md p-1.5">
              <img src="${D.QR.image}" alt="" class="block w-full" draggable="false">
              <span class="login-scanline"></span>
            </div>
            <div class="mt-2.5 text-[12px] font-semibold">DESCO</div>
            <div class="text-[9px] text-ink-3">Electricity bill</div>
            <div class="mb-3 mt-auto w-full rounded-md bg-accent py-1.5 text-center text-[10px] font-semibold text-white">Pay</div>
          </div>
        </div>
      </div>`;
  }

  (D.views = D.views || {}).login = (root) => {
    document.title = `${t('Sign in')} · DESCO`;
    root.innerHTML = `
      <div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        <aside class="tex-grid relative hidden flex-col overflow-hidden bg-brand-900 px-12 py-10 text-white lg:flex">
          <div class="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-brand-400/25 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-48 right-0 h-[26rem] w-[26rem] rounded-full bg-accent/20 blur-3xl"></div>

          <div class="relative flex items-center gap-3">
            <span class="inline-flex rounded-md bg-white px-3 py-2.5 shadow-sm"><img src="assets/img/logo-desco.svg" alt="DESCO — Power is yours" class="h-7"></span>
            <span class="text-[13px] font-medium text-white/70">${t('Customer Portal')}</span>
          </div>

          <div class="relative my-auto py-8">
            <h1 class="max-w-md text-[38px] font-semibold leading-[1.12] tracking-tight">${t('See your dues.<br>Scan the bill. Pay.')}</h1>
            <p class="mt-3 font-bn text-[17px] text-white/65">ঘরে বসেই বিল দেখুন, বিলের QR স্ক্যান করে পরিশোধ করুন।</p>
            <div class="mt-10">${heroArt()}</div>
          </div>

          <ol class="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-[12.5px]">
            ${[['phone', 'Sign in with your mobile number'], ['bill', 'Open your due bill'], ['zap', 'Scan the QR on the bill']].map(([i, h], k) => `
              <li class="flex items-start gap-2.5">
                <span class="relative grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white/10">${UI.icon(i, 'h-[18px] w-[18px]')}<span class="num absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-accent text-[9px] font-semibold">${U.n(k + 1)}</span></span>
                <span class="leading-snug text-white/75">${t(h)}</span>
              </li>`).join('')}
          </ol>
        </aside>

        <main class="relative flex flex-col bg-paper px-5 py-6 sm:px-10">
          <div class="flex items-center justify-between">
            <img src="assets/img/logo-desco.svg" alt="DESCO" class="h-7 lg:invisible">
            <div class="seg" role="group" aria-label="Language / ভাষা">
              <button data-lang="en" lang="en" aria-pressed="${D.lang() === 'en'}">EN</button>
              <button data-lang="bn" lang="bn" class="font-bn" aria-pressed="${D.lang() === 'bn'}">বাংলা</button>
            </div>
          </div>

          <div class="mx-auto my-auto w-full max-w-[26rem] py-10">
            <div class="tex-grid mb-6 rounded-xl bg-brand-900 p-5 text-white lg:hidden">
              <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">${t('Customer Portal')}</div>
              <div class="mt-2 text-xl font-semibold leading-snug">${t('See your dues.<br>Scan the bill. Pay.')}</div>
            </div>
            <div class="rounded-2xl border border-line bg-surface p-6 shadow-[0_24px_60px_-28px_rgba(10,21,62,.35)] sm:p-7">
              <div id="auth-steps" class="mb-5 border-b border-line pb-4"></div>
              <div id="auth-form"></div>
            </div>
            <p class="mt-6 flex items-center justify-center gap-2 text-center text-xs text-ink-3">${UI.icon('shield', 'h-4 w-4 shrink-0 text-ok')}${t('DESCO never asks for your OTP or PIN.')}</p>
          </div>

          <footer class="text-center text-[11px] text-ink-3">${t("© Dhaka Electricity Supply PLC · Hotline <b class='num text-ink-2'>16120</b>")}</footer>
        </main>
      </div>`;
    renderStep();
  };

  function renderSteps() {
    const steps = ['Mobile number', 'Verify'];
    const at = st.step === 'mobile' ? 0 : 1;
    U.$('#auth-steps').innerHTML = `
      <ol class="flex items-center gap-2">
        ${steps.map((label, i) => `
          <li class="flex items-center gap-2 ${i < steps.length - 1 ? 'flex-1' : ''}" ${i === at ? 'aria-current="step"' : ''}>
            <span class="num grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${i < at ? 'bg-ok text-white' : i === at ? 'bg-brand text-white' : 'bg-surface-3 text-ink-3'}">${i < at ? UI.icon('check', 'h-3.5 w-3.5') : U.n(i + 1)}</span>
            <span class="whitespace-nowrap text-xs font-medium ${i === at ? 'text-ink' : 'text-ink-3'}">${t(label)}</span>
            ${i < steps.length - 1 ? `<span class="h-px flex-1 ${i < at ? 'bg-ok' : 'bg-line-strong'}"></span>` : ''}
          </li>`).join('')}
      </ol>`;
  }

  function renderStep() {
    const form = U.$('#auth-form');
    if (!form) return;
    renderSteps();

    /* ---- Step 1: mobile number ---- */
    if (st.step === 'mobile') {
      form.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">${UI.icon('phone', 'h-5 w-5')}</span>
          <h2 class="text-[22px] font-semibold leading-tight tracking-tight">${t('Sign in')}</h2>
        </div>
        <p class="mt-3 text-[13px] leading-relaxed text-ink-2">${t('Enter the mobile number registered with your DESCO connection. We’ll send you a one-time code.')}</p>
        <form class="mt-5" novalidate>
          <label class="field-label" for="mob-in">${t('Mobile number')}</label>
          <div class="flex h-12 overflow-hidden rounded-lg border border-line-strong bg-surface transition-shadow focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <span class="flex items-center gap-2 border-r border-line bg-surface-2 px-3.5 text-sm text-ink-2"><span class="grid h-4 w-6 place-items-center rounded-[2px] bg-[#006a4e]" aria-hidden="true"><span class="h-2.5 w-2.5 -translate-x-[2px] rounded-full bg-[#f42a41]"></span></span><span class="num">+88</span></span>
            <input id="mob-in" class="num w-full min-w-0 bg-transparent px-4 text-[17px] tracking-[0.06em] outline-none" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="14" placeholder="01XXXXXXXXX" value="${U.esc(st.mobile)}" autofocus>
          </div>
          <button class="btn btn-primary mt-4 h-11 w-full text-[14px]">${t('Send OTP')}${UI.icon('arrowUR')}</button>
        </form>`;
      const input = U.$('#mob-in', form);
      form.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        // Demo build: no validation — a known number opens its own accounts, anything else opens the bill-copy account
        st.mobile = S.normalizeMobile(input.value) || input.value.trim();
        st.step = 'otp'; st.sentAt = Date.now();
        renderStep();
      });
      return;
    }

    /* ---- Step 2: OTP ---- */
    const masked = /^\d{11}$/.test(st.mobile) ? U.maskMobile(st.mobile) : (st.mobile || '—');
    form.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand">${UI.icon('lock', 'h-5 w-5')}</span>
        <h2 class="flex-1 text-[22px] font-semibold leading-tight tracking-tight">${t('Enter verification code')}</h2>
      </div>
      <p class="mt-3 text-[13px] leading-relaxed text-ink-2">${t('We sent a 6-digit code to {m}.', { m: `<b class="num text-ink">${U.esc(masked)}</b>` })} <button type="button" class="font-medium text-brand hover:underline" data-back>${t('Change number')}</button></p>
      <form class="mt-5" novalidate>
        <label class="field-label" for="otp-in">${t('One-time code')}</label>
        <input id="otp-in" class="input num h-12 rounded-lg text-center text-xl tracking-[0.6em]" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" aria-describedby="otp-timer" autofocus>
        <div class="mt-2.5 flex items-center justify-between text-xs"><span id="otp-timer" class="text-ink-3"></span><button type="button" class="font-medium text-brand disabled:text-ink-3" id="otp-resend" disabled></button></div>
        <button class="btn btn-primary mt-4 h-11 w-full text-[14px]">${UI.icon('lock')}${t('Verify & sign in')}</button>
      </form>`;

    const input = U.$('#otp-in', form);
    const timer = U.$('#otp-timer', form);
    const resend = U.$('#otp-resend', form);
    const tick = () => {
      if (!document.body.contains(timer)) return clearInterval(iv);
      const age = (Date.now() - st.sentAt) / 1000;
      const left = Math.max(0, Math.ceil(D.DEMO.otpTtlSec - age));
      timer.textContent = left ? t('Code expires in {t}', { t: D.digits(`${Math.floor(left / 60)}:${U.pad(left % 60)}`) }) : t('Code expired — request a new one');
      const wait = Math.max(0, Math.ceil(D.DEMO.resendSec - age));
      resend.disabled = wait > 0;
      resend.textContent = wait ? t('Resend in {s}s', { s: U.n(wait) }) : t('Resend code');
    };
    const iv = setInterval(tick, 1000);
    tick();

    form.querySelector('[data-back]').onclick = () => { st.step = 'mobile'; renderStep(); };
    resend.onclick = () => { st.sentAt = Date.now(); input.value = ''; tick(); UI.toast(t('New code sent'), { tone: 'info', sub: masked }); };
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      if (input.value.length === 6) form.querySelector('form').requestSubmit();
    });
    form.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      clearInterval(iv);
      const mobile = st.mobile;
      st.step = 'mobile'; st.mobile = '';
      S.login(S.ownerByMobile(mobile) ? mobile : D.DEMO.copyMobile);
      D.afterLogin();
      UI.toast(t('Welcome, {name}', { name: S.owner().name.split(' ')[0] }), { sub: t('Signed in securely') });
    });
  }
})(window.DESCO = window.DESCO || {});
