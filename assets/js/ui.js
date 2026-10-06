/* UI primitives: icons, badges, modal, toast, tooltip, charts, pagination. */
(function (D) {
  'use strict';
  const U = D.u;
  const UI = (D.ui = {});

  /* ---------- Icons (24px stroke set) ---------- */
  const P = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    bill: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8M8 17h5M8 9h2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    arrowL: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    arrowUR: '<path d="M7 17 17 7M7 7h10v10"/>',
    sort: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
    printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    zoomIn: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
    zoomOut: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3M8 11h6"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l9 5H3z"/>',
    phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    meter: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 9h10v4H7zM8 17h.01M12 17h.01M16 17h.01"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    headset: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 16a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 16a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/><path d="M18 18v1a3 3 0 0 1-3 3h-3"/>',
    trendDown: '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    trendUp: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  };
  UI.icon = (name, cls = 'h-4 w-4') =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  /** Fill `data-icon` placeholders in static markup. */
  UI.hydrateIcons = (root = document) => U.$$('[data-icon]', root).forEach((el) => { el.outerHTML = UI.icon(el.dataset.icon, el.className || 'h-4 w-4'); });

  /* ---------- Badges ---------- */
  UI.badge = (label, tone = 'neutral', extra = '') => `<span class="badge badge-${tone} ${extra}">${U.esc(label)}</span>`;
  UI.statusBadge = (st) => { const m = D.store.STATUS[st.key]; return UI.badge(D.t(m.label), m.tone); };

  /* ---------- Page header ---------- */
  UI.pageHeader = ({ eyebrow, title, sub, actions = '' }) => `
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        ${eyebrow ? `<div class="eyebrow mb-1.5">${eyebrow}</div>` : ''}
        <h1 class="page-title">${title}</h1>
        ${sub ? `<p class="mt-1.5 max-w-2xl text-[13px] text-ink-2">${sub}</p>` : ''}
      </div>
      ${actions ? `<div class="flex flex-wrap items-center gap-2">${actions}</div>` : ''}
    </div>`;

  UI.empty = (title, sub, icon = 'search') => `
    <div class="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div class="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-surface-3 text-ink-3">${UI.icon(icon, 'h-5 w-5')}</div>
      <div class="text-sm font-semibold text-ink">${title}</div>
      <p class="mt-1 max-w-sm text-[13px] text-ink-3">${sub}</p>
    </div>`;

  /* ---------- Toast ---------- */
  UI.toast = (title, { tone = 'ok', sub = '', ms = 3800 } = {}) => {
    const root = U.$('#toast-root');
    const el = document.createElement('div');
    const ic = { ok: 'checkCircle', warn: 'alert', danger: 'alert', info: 'info' }[tone];
    el.className = 'pointer-events-auto flex translate-y-2 items-start gap-3 rounded-lg bg-brand-950 px-4 py-3 text-white opacity-0 shadow-pop transition duration-200';
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <span class="mt-0.5 ${tone === 'ok' ? 'text-[#5fd3a0]' : tone === 'info' ? 'text-brand-200' : 'text-[#ff8a80]'}">${UI.icon(ic)}</span>
      <div class="min-w-0 flex-1"><div class="text-[13px] font-medium">${U.esc(title)}</div>${sub ? `<div class="mt-0.5 text-xs text-white/60">${U.esc(sub)}</div>` : ''}</div>
      <button class="-mr-1 rounded p-0.5 text-white/50 hover:text-white" aria-label="Dismiss">${UI.icon('x')}</button>`;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.remove('translate-y-2', 'opacity-0'));
    const kill = () => { el.classList.add('opacity-0'); setTimeout(() => el.remove(), 200); };
    el.querySelector('button').onclick = kill;
    setTimeout(kill, ms);
  };

  /* ---------- Modal ---------- */
  const stack = [];
  document.addEventListener('keydown', (e) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (e.key === 'Escape' && !top.locked) { e.preventDefault(); top.close(); }
    if (e.key === 'Tab') {
      const f = U.$$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', top.panel).filter((x) => x.offsetParent);
      if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  UI.modal = ({ title, subtitle = '', body = '', footer = '', size = 'md', onClose } = {}) => {
    const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };
    const wrap = document.createElement('div');
    const tid = `m${Date.now().toString(36)}`;
    const opener = document.activeElement;
    wrap.className = 'fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6';
    wrap.innerHTML = `
      <div class="absolute inset-0 bg-brand-950/55 opacity-0 backdrop-blur-[2px] transition-opacity duration-200" data-scrim></div>
      <div role="dialog" aria-modal="true" aria-labelledby="${tid}" class="relative flex max-h-[94vh] w-full ${widths[size]} translate-y-6 flex-col rounded-t-xl bg-surface opacity-0 shadow-pop transition duration-200 ease-out sm:rounded-xl">
        <header class="flex items-start justify-between gap-4 border-b border-line px-6 pb-4 pt-5">
          <div class="min-w-0"><h2 id="${tid}" class="text-base font-semibold tracking-tight" data-title>${title}</h2><p class="mt-0.5 text-[13px] text-ink-3" data-sub>${subtitle}</p></div>
          <button class="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1" data-close aria-label="${D.t('Close')}">${UI.icon('x')}</button>
        </header>
        <div class="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 py-5" data-body>${body}</div>
        <footer class="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-line bg-surface-2 px-6 py-3.5 ${footer ? '' : 'hidden'}" data-footer>${footer}</footer>
      </div>`;
    U.$('#modal-root').appendChild(wrap);
    const panel = wrap.querySelector('[role=dialog]');
    const api = {
      el: wrap, panel, locked: false,
      body: wrap.querySelector('[data-body]'),
      setTitle: (t, s) => { wrap.querySelector('[data-title]').innerHTML = t; if (s !== undefined) wrap.querySelector('[data-sub]').innerHTML = s; },
      setBody: (h) => { api.body.innerHTML = h; api.body.scrollTop = 0; },
      setFooter: (h) => { const f = wrap.querySelector('[data-footer]'); f.innerHTML = h; f.classList.toggle('hidden', !h); },
      close: () => {
        const i = stack.indexOf(api); if (i > -1) stack.splice(i, 1);
        wrap.firstElementChild.classList.add('opacity-0');
        panel.classList.add('translate-y-6', 'opacity-0');
        setTimeout(() => wrap.remove(), 180);
        if (opener && opener.focus) opener.focus({ preventScroll: true });
        onClose && onClose();
      },
    };
    wrap.addEventListener('click', (e) => { if (!api.locked && (e.target.closest('[data-close]') || e.target.hasAttribute('data-scrim'))) api.close(); });
    stack.push(api);
    requestAnimationFrame(() => {
      wrap.firstElementChild.classList.remove('opacity-0');
      panel.classList.remove('translate-y-6', 'opacity-0');
      const f = panel.querySelector('[autofocus]') || panel.querySelector('input,select,textarea') || panel.querySelector('[data-close]');
      f && f.focus({ preventScroll: true });
    });
    return api;
  };

  UI.confirm = ({ title, body, confirm = 'Confirm', tone = 'primary' }) => new Promise((resolve) => {
    let ok = false;
    const m = UI.modal({
      title, body: `<p class="text-[13px] leading-relaxed text-ink-2">${body}</p>`, size: 'sm',
      footer: `<button class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-${tone}" data-ok>${confirm}</button>`,
      onClose: () => resolve(ok),
    });
    m.el.querySelector('[data-ok]').onclick = () => { ok = true; m.close(); };
  });

  /* ---------- Tooltip (charts) ---------- */
  const tip = () => U.$('#tooltip');
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) return tip().classList.remove('on');
    tip().innerHTML = t.getAttribute('data-tip');
    tip().classList.add('on');
  });
  document.addEventListener('mousemove', (e) => {
    const el = tip();
    if (!el.classList.contains('on')) return;
    const w = el.offsetWidth;
    const x = Math.min(window.innerWidth - w - 8, e.clientX + 14);
    el.style.left = `${x}px`;
    el.style.top = `${e.clientY + 16}px`;
  });

  /* ---------- Charts ---------- */
  const niceMax = (v) => {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  };

  /**
   * Grouped column chart.
   * data: [{ label, values: [..], tip }] · series: [{ name, cls }]
   */
  const axisFmt = (v) => D.digits(v >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${+(v / 1e3).toFixed(0)}K` : `${v}`);
  UI.columns = ({ data, series, height = 250, width = 600, fmt = axisFmt, line }) => {
    const W = width; const H = height; const L = 40; const R = 6; const T = 12; const B = 26;
    const max = niceMax(Math.max(...data.flatMap((d) => d.values)));
    const iw = W - L - R; const ih = H - T - B;
    const gw = iw / data.length;
    const bw = Math.min(15, (gw - 10) / series.length);
    const y = (v) => T + ih - (v / max) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="h-auto w-full" role="img" aria-label="Column chart">`;
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i; const yy = y(v);
      s += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="stroke-line" ${i ? 'stroke-dasharray="2 4"' : ''}/>`;
      s += `<text x="${L - 8}" y="${yy + 3.5}" text-anchor="end" class="fill-ink-3 font-mono text-[11px]">${fmt(v)}</text>`;
    }
    data.forEach((d, i) => {
      const gx = L + i * gw + (gw - bw * series.length - 2 * (series.length - 1)) / 2;
      s += `<g data-tip="${U.esc(d.tip || '')}" class="group cursor-default"><rect x="${L + i * gw}" y="${T}" width="${gw}" height="${ih}" class="fill-transparent group-hover:fill-brand-50"/>`;
      d.values.forEach((v, k) => {
        const h = Math.max(1, (v / max) * ih);
        s += `<rect x="${gx + k * (bw + 2)}" y="${T + ih - h}" width="${bw}" height="${h}" rx="1.5" class="${series[k].cls}"/>`;
      });
      s += `<text x="${L + i * gw + gw / 2}" y="${H - 9}" text-anchor="middle" class="fill-ink-3 text-[11.5px]">${U.esc(d.label)}</text></g>`;
    });
    if (line) {
      const pts = data.map((d, i) => [L + i * gw + gw / 2, T + ih - (line.values[i] / line.max) * ih]);
      s += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" class="${line.cls}" stroke-width="1.75" stroke-linejoin="round"/>`;
      pts.forEach((p) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="${line.dot}" stroke-width="1.5"/>`; });
    }
    return s + '</svg>';
  };

  /** Horizontal meter bar (HTML). */
  UI.meterBar = (ratio, cls = 'bg-brand') =>
    `<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"><div class="h-full rounded-full ${cls}" style="width:${Math.max(0, Math.min(100, ratio * 100)).toFixed(1)}%"></div></div>`;

  /** Donut (SVG) — segments: [{ value, cls, label }] */
  UI.donut = (segments, size = 132, stroke = 16) => {
    const r = (size - stroke) / 2; const C = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0) || 1;
    let off = 0;
    let s = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="-rotate-90" role="img" aria-label="Distribution">`;
    s += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="stroke-surface-3" stroke-width="${stroke}"/>`;
    segments.forEach((x) => {
      const len = (x.value / total) * C;
      s += `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" class="${x.cls}" stroke-width="${stroke}" stroke-dasharray="${Math.max(0, len - 1.5)} ${C}" stroke-dashoffset="${-off}" data-tip="${U.esc(x.tip || x.label)}"/>`;
      off += len;
    });
    return s + '</svg>';
  };

  /* ---------- Pagination ---------- */
  UI.pager = (page, pages, total, per) => {
    if (total === 0) return '';
    const from = (page - 1) * per + 1; const to = Math.min(total, page * per);
    const nums = [];
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    return `
      <div class="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
        <div class="text-xs text-ink-3">Showing <b class="num font-medium text-ink-2">${from}–${to}</b> of <b class="num font-medium text-ink-2">${U.n(total)}</b></div>
        <div class="flex items-center gap-1">
          <button class="btn btn-ghost btn-xs btn-icon" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">${UI.icon('chevL')}</button>
          ${nums.map((p) => p === '…' ? '<span class="px-1 text-xs text-ink-3">…</span>'
            : `<button class="btn btn-xs min-w-[28px] ${p === page ? 'btn-primary' : 'btn-ghost'}" data-page="${p}" ${p === page ? 'aria-current="page"' : ''}>${p}</button>`).join('')}
          <button class="btn btn-ghost btn-xs btn-icon" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Next page">${UI.icon('chevR')}</button>
        </div>
      </div>`;
  };

  /** Sortable header cell. */
  UI.th = (key, label, sort, cls = '') => {
    const active = sort.key === key;
    return `<th class="${cls}" ${active ? `aria-sort="${sort.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}>
      <button class="sort-btn ${/(^|\s)r(\s|$)/.test(cls) ? 'flex-row-reverse' : ''}" data-sort="${key}" ${active ? 'aria-sort' : ''}>${label}${UI.icon(active ? 'chevD' : 'sort', `h-3 w-3 ${active && sort.dir === 'asc' ? 'rotate-180' : ''} ${active ? '' : 'opacity-40'}`)}</button></th>`;
  };

  /** Stable sort helper. */
  UI.sortBy = (arr, getter, dir) => arr.slice().sort((a, b) => {
    const x = getter(a); const y = getter(b);
    const r = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return dir === 'asc' ? r : -r;
  });

  /* ---------- Print ---------- */
  UI.print = (html) => {
    const root = U.$('#print-root');
    root.innerHTML = html;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 50);
  };
})(window.DESCO = window.DESCO || {});
