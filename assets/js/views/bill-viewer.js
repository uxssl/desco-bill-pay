/* Step 5–7: View the actual bill → scan its QR → pay in an MFS / bank app (outside the portal).
 * The portal never takes payment itself; it shows the bill's payment QR and reflects the status
 * once DESCO's server receives the gateway's confirmation. */
(function (D) {
  'use strict';
  const U = D.u; const UI = D.ui; const S = D.store; const t = D.t;
  const vs = { zoom: null }; // zoom null = fit to width

  /** Scannable QR as inline SVG (4-module quiet zone). */
  D.qrSVG = (text, cls = '') => {
    if (typeof qrcode !== 'function') return `<svg viewBox="0 0 10 10" class="${cls}" role="img" aria-label="QR unavailable"><rect width="10" height="10" fill="#eee"/></svg>`;
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-4 -4 ${n + 8} ${n + 8}" class="${cls}" shape-rendering="crispEdges" role="img" aria-label="Payment QR code"><rect x="-4" y="-4" width="${n + 8}" height="${n + 8}" fill="#fff"/><path d="${d}" fill="#0a153e"/></svg>`;
  };

  /** The bill's payment QR — configured image, or a generated per-bill code. */
  D.qrMarkup = (b, amount, cls = '') => (D.QR.image
    ? `<img src="${D.QR.image}" alt="Payment QR code" class="${cls}" draggable="false">`
    : D.qrSVG(D.QR.payload(b, amount), cls));

  /** Save the QR as a PNG (for paying from the same phone via "scan from gallery"). */
  function saveQR(b, amount) {
    const file = D.QR.card || D.QR.image;
    if (file) { const a = document.createElement('a'); a.href = file; a.download = `DESCO-QR-${b.no}${file.slice(file.lastIndexOf('.'))}`; a.click(); return; }
    const svg = D.qrSVG(D.QR.payload(b, amount)).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="560" height="560" ');
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = 640; cv.height = 760;
      const g = cv.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, 40, 40, 560, 560);
      g.fillStyle = '#0a153e'; g.textAlign = 'center';
      g.font = '600 34px "IBM Plex Sans", sans-serif'; g.fillText(`DESCO · BDT ${U.raw.n(amount)}`, 320, 660);
      g.font = '24px "IBM Plex Mono", monospace'; g.fillStyle = '#4a5168'; g.fillText(`Bill ${b.no} · A/C ${b.account}`, 320, 705);
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = `DESCO-QR-${b.no}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  const SIGN = '<svg viewBox="0 0 120 38" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6 28c6-14 10-20 12-18s-6 20-2 20 8-16 12-16-2 12 2 12 6-8 9-8 1 6 5 6 6-10 10-10-2 8 3 8c6 0 10-6 16-6s8 4 14 2 10-8 16-8"/><path d="M30 33c20-3 46-4 80-6"/></svg>';

  /** Full bill document markup (also used for thumbnails and printing). */
  /** Bills that come as a scanned copy: shown exactly as issued, payment QR placed over the printed QR. */
  // % of the scan, measured on bill-copy.jpg: the largest square that fits the printed QR's slot — between the top edge
  // and the Tariff box line, right-aligned with the printed QR — so no bill text is covered. Click opens it full size.
  const COPY_QR_BOX = { left: 76.27, top: 0.48, width: 5.47, height: 7.8 };
  function billCopyHTML(b, live) {
    const box = `left:${COPY_QR_BOX.left}%;top:${COPY_QR_BOX.top}%;width:${COPY_QR_BOX.width}%;height:${COPY_QR_BOX.height}%`;
    const qr = `<img src="${D.QR.image}" alt="" draggable="false">`;
    return `
      <article class="bill-copy" aria-label="Electricity bill ${b.no}">
        <img src="${b.image}" alt="Electricity bill ${b.no}" class="bill-copy-scan" draggable="false">
        ${D.QR.image ? (live
          ? `<button type="button" class="bill-copy-qr ${S.status(b).key !== 'paid' ? 'qr-live' : ''}" style="${box}" data-qr aria-label="${t('Payment QR — tap to enlarge')}">${qr}${S.status(b).key !== 'paid' ? `<span class="qr-tag">${t('Click QR to scan')}</span>` : ''}</button>`
          : `<span class="bill-copy-qr" style="${box}">${qr}</span>`) : ''}
      </article>`;
  }

  D.billDocHTML = (b, { copy = 'customer', stamp = false, live = false } = {}) => {
    if (b.image) return billCopyHTML(b, live);
    const c = S.consumer(b.account);
    const div = D.division(c.division);
    const s = S.status(b);
    const tou = c.tou;
    const m = (v) => U.raw.n2(v);
    const seq = String(U.hash(b.no) % 1e9).padStart(9, '0');
    const qrAmount = s.key === 'paid' ? b.total : s.balance;

    const charges = [
      ['Normal KWH Charge', b.energy], ['PFC Charge', 0], ['X-former Loss', 0],
      ['Total Energy Charges', b.energy, 'strong'], ['Demand Charge', b.demand],
      ['Sub-Total or Minimum Charge', b.subTotal, 'strong'], ['Service Charge', 0], ['Supplementary Bill', 0], ['Adjustment', 0],
      ['CURRENT BILL', b.currentDues, 'strong'], ['Re-Print Charge', 0], ['Installment of S/Drop', 0], ['Meter Rent', b.meterRent],
      ['TOTAL BILL (Without VAT)', b.totalDues, 'strong'], ['VAT (On Current Bill)', b.vat],
      ['Total Bill', b.total, 'strong'], ['Total if paid after due date', b.total + b.lps, 'strong late'],
    ];

    let stampHTML = '';
    if (stamp) {
      if (s.key === 'paid') stampHTML = `<div class="bd-stamp paid">Paid<small>${U.raw.fmtDate(b.settledOn)}</small></div>`;
      else if (s.key === 'partial') stampHTML = `<div class="bd-stamp partial">Part-paid<small>${U.raw.tk(b.paid)} received</small></div>`;
      else if (s.key === 'critical') stampHTML = `<div class="bd-stamp critical">Disconnection due<small>${s.dpd} days past due</small></div>`;
      else if (s.key === 'overdue') stampHTML = `<div class="bd-stamp overdue">Overdue<small>${s.dpd} days</small></div>`;
    }

    return `
    <article class="bill-doc" aria-label="Electricity bill ${b.no}">
      <div class="bd-watermark"><img src="assets/img/logo-desco.svg" alt=""></div>
      ${stampHTML}
      <div class="bd-bin">BIN: 0000XXXXX-XXXX</div>

      <div class="bd-top">
        <p class="bd-slogan">“দেশ প্রেমের শপথ নিন, দুর্নীতিকে বিদায় দিন”</p>
        <span class="bd-hot">Hotline: 16120</span>
        <div class="bd-copy">${live && s.key !== 'paid'
          ? `<button type="button" class="bd-qr qr-live" data-qr aria-label="${t('Payment QR — tap to enlarge')}">${D.qrMarkup(b, qrAmount)}<span class="qr-tag">${t('Click QR to scan')}</span></button>`
          : D.qrMarkup(b, qrAmount)}<span>(${copy === 'office' ? 'Office' : 'Customer'} Copy)</span></div>
      </div>

      <div class="bd-frame">
        <div class="bd-head">
          <div class="bd-logo"><img src="assets/img/logo-desco.svg" alt="DESCO"><small>ISO 9001:2008 &amp; 45001:2018 Certified</small></div>
          <div class="bd-co" style="flex:1">
            <div>Dhaka Electricity Supply PLC (DESCO)</div>
            <div>${U.esc(div.name)} Sales &amp; Distribution Division</div>
            <div class="bd-co-title"><span>Electricity Bill</span><span class="bd-seq">LT-${c.tariff.slice(3)} ${seq}</span></div>
          </div>
        </div>
        <div class="bd-meta">
          <dl>
            <dt>Tariff</dt><dd>:</dd><dd class="bd-val">${c.tariff.slice(3)}</dd>
            <dt>Zone / Block</dt><dd>:</dd><dd class="bd-val">${c.zone}</dd>
            <dt>Walking Order</dt><dd>:</dd><dd class="bd-val">${c.walkingOrder}</dd>
            <dt>Account No.</dt><dd>:</dd><dd class="bd-val lg">${c.account}</dd>
            <dt>Meter No.</dt><dd>:</dd><dd class="bd-val">${c.meter}</dd>
            <dt>Sanctioned Load</dt><dd>:</dd><dd class="bd-val">${c.load} kW</dd>
            <dt>Meter Status</dt><dd>:</dd><dd class="bd-val">Normal</dd>
          </dl>
        </div>
        <div class="bd-name">
          <span class="bd-label">Name &amp; Address :</span>
          <span class="bd-val lg">${U.esc(c.name)}<br>${U.esc(c.address)}</span>
        </div>

        <div class="bd-left">
          <div class="bd-row split"><span class="bd-label">Billing Month</span><span class="bd-val lg">${U.monthLong(b.month)}</span><span class="bd-label" style="background:none;margin:0;padding:0">Old Acc :</span><span class="bd-val">${c.oldAccount}</span></div>
          <div class="bd-row"><span class="bd-label">Bill No.</span><span class="bd-val lg">${b.no}</span></div>
          <div class="bd-row split"><span class="bd-label">Issue Date</span><span class="bd-val">${U.dmy(b.issue)}</span><span class="bd-label" style="background:none;margin:0;padding:0">Due Date :</span><span class="bd-val lg">${U.dmy(b.due)}</span></div>
          <table class="bd-read">
            <thead><tr><th></th><th style="text-align:left">Date</th><th>${tou ? 'Off Peak' : 'Sig. Reg.'}</th><th>Peak</th></tr></thead>
            <tbody>
              <tr><td>Current</td><td class="bd-val">${U.dmy(b.readDate)}</td><td class="bd-val">${U.raw.n(b.currReading).replace(/,/g, '')}</td><td class="bd-val">${tou ? b.currPeak : '—'}</td></tr>
              <tr><td>Previous</td><td class="bd-val">${U.dmy(b.prevReadDate)}</td><td class="bd-val">${U.raw.n(b.prevReading).replace(/,/g, '')}</td><td class="bd-val">${tou ? b.prevPeak : '—'}</td></tr>
              <tr><td>Difference</td><td></td><td class="bd-val">${b.offPeak}</td><td class="bd-val">${tou ? b.peak : '—'}</td></tr>
              <tr><td>KWH Consumed</td><td class="bd-val" style="color:var(--bd-blue);font-family:inherit;text-transform:none;font-size:11.5px">MF: 1</td><td class="bd-val">${b.offPeak}</td><td class="bd-val">${tou ? b.peak : '—'}</td></tr>
              <tr><td>Sub A/C Use</td><td></td><td></td><td></td></tr>
            </tbody>
          </table>
          <div class="bd-msg">
            <div class="bd-msgbox">
              <div class="bd-label" style="font-size:11.5px">Common / Check Meter Use :</div>
              <div class="bd-val" style="margin-top:4px;line-height:1.5">${b.arrears ? `Prev. Dues : ${U.raw.n(b.arrears).replace(/,/g, '')} Tk.<br>Please pay by next 7 days.` : 'No previous dues.<br>Thank you for paying on time.'}</div>
              <div class="bd-val" style="margin-top:6px;font-size:12px">${c.tariff}-${div.code} · ${Math.round(b.kwh / 30 * 10) / 10} kWh/day</div>
            </div>
            <div class="bd-warn"><b>-ঃ সতর্কীকরণ ঃ-</b>নির্ধারিত তারিখের মধ্যে বিল পরিশোধ না করলে পূর্ব নোটিশ ছাড়াই বিদ্যুৎ সংযোগ বিচ্ছিন্ন করা হবে। ব্যাংক, মোবাইল ব্যাংকিং বা অনলাইনে বিল পরিশোধ করুন। ঘুষ বা অতিরিক্ত অর্থ দাবি করলে হটলাইনে জানান।</div>
          </div>
        </div>

        <div class="bd-charges">
          <div class="bd-ch-head">Amount (Taka)</div>
          ${charges.map(([l, v, cls]) => `<div class="bd-ch ${cls || ''}"><span class="bd-label">${l}</span><span class="bd-label">:</span><span class="bd-val">${m(v)}</span></div>`).join('')}
        </div>

        <div class="bd-words"><span class="bd-label">Not less than Tk. :</span><span class="bd-val lg">${U.raw.words(b.total)} Only</span></div>
        <div class="bd-foot">
          <div class="bd-notice">Notice : If this bill is not paid within <b class="bd-val" style="color:inherit;font-style:normal">${U.dmy(b.dcDate)}</b>, line will be disconnected. No further notice will be issued.<br>This bill will be treated as final notice for disconnection.</div>
          <div class="bd-sign">${SIGN}<span>Executive Engineer</span></div>
        </div>
      </div>
      <div class="bd-hotline">বিশেষ জ্ঞাতব্য: বিল পরিশোধের পর রশিদ সংরক্ষণ করুন। &nbsp;|&nbsp; Hotline : Power Division 16999, DESCO 16120</div>
    </article>`;
  };

  D.downloadBill = (b) => {
    UI.toast(t('Choose “Save as PDF” to download'), { tone: 'info', sub: U.monthLabel(b.month) });
    UI.print(D.billDocHTML(b, { stamp: false }));
  };

  (D.views = D.views || {}).bill = (el, no) => {
    const b = S.bill(no);
    if (!b || !S.owns(b.account)) {
      el.innerHTML = `<div class="card">${UI.empty(t('Bill not found'), t('This bill does not belong to an account on your mobile number.'), 'bill')}<div class="pb-8 text-center"><a href="#/bills" class="btn btn-secondary">${t('Back to Due Bills')}</a></div></div>`;
      return;
    }
    el.className = 'pb-10 outline-none lg:overflow-hidden lg:pb-0';
    document.title = `${U.monthLabel(b.month)} · DESCO`;
    const c = S.consumer(b.account);
    const s = S.status(b);
    const paid = s.key === 'paid';
    const hist = S.billsOf(b.account);
    const idx = hist.indexOf(b);
    const older = hist[idx + 1]; const newer = hist[idx - 1];
    const pay = S.paymentsForBill(b.no)[0];
    const sum = S.summary(b.account);
    const olderOpen = sum.open.filter((x) => x.month < b.month);
    const calc = D.calcBill(c.tariff, { kwh: b.kwh, offPeak: c.tou ? b.offPeak : 0, peak: b.peak, load: c.load, phase: c.phase });
    const dot = (h) => ({ ok: 'bg-ok', violet: 'bg-violet', info: 'bg-info', warn: 'bg-warn', danger: 'bg-danger' }[S.STATUS[S.status(h).key].tone]);

    const payPanel = paid ? `
      <section class="border-b border-line p-5">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ok text-white">${UI.icon('check', 'h-5 w-5')}</span>
          <div><div class="text-lg font-semibold text-ok">${t('Paid')}</div><div class="text-xs text-ink-3">${t('Paid on {date}', { date: U.fmtDate(b.settledOn) })}</div></div>
        </div>
        <dl class="kv mt-4">
          <dt>${t('Amount')}</dt><dd class="num">${U.tk(b.paid)}</dd>
          ${pay ? `<dt>${t('Paid via')}</dt><dd>${t(D.channel(pay.channel).label)}${pay.app ? ` · ${pay.app}` : ''}</dd><dt>${t('Reference')}</dt><dd class="num">${U.esc(pay.ref)}</dd>` : ''}
        </dl>
      </section>` : `
      <section class="border-b border-line p-5">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-[15px] font-semibold">${t('Scan to pay')}</h2>
          ${UI.statusBadge(s)}
        </div>
        <div class="mt-4 rounded-lg bg-surface-2 p-4 ring-1 ring-line">
          <div class="text-xs text-ink-3">${t('Amount to pay')}</div>
          <div class="num text-3xl font-semibold tracking-tight ${s.dpd ? 'text-danger' : ''}">${U.tk(s.balance)}</div>
          <div class="text-[11px] text-ink-3">${s.lpsApplied ? t('Includes late fee {fee}', { fee: U.tk(b.lps) }) : t('Pay by {date}', { date: U.fmtDate(b.due) })}</div>
        </div>
        <button class="btn btn-primary mt-3 h-12 w-full text-[14px]" data-qr>${UI.icon('zoomIn')}${t('Open QR to scan')}</button>
        <p class="mt-2 text-center text-[11.5px] text-ink-3">${t('Click the QR on the bill to open it full size, then scan it with your app.')}</p>
        ${!s.lpsApplied ? `<p class="mt-3 text-xs text-ink-3">${t(D.QR.image ? 'After {date} the amount becomes {amt}.' : 'After {date} the amount becomes {amt} and a new QR is shown.', { date: U.fmtDate(b.due), amt: U.tk(b.total + b.lps) })}</p>` : ''}
        ${olderOpen.length ? `<p class="mt-3 rounded-md bg-warn-soft px-3 py-2 text-xs text-warn">${t('This account also has an older unpaid bill ({month}). Please pay it too.', { month: U.monthLabel(olderOpen[0].month) })} <a class="font-semibold underline" href="#/bills/${olderOpen[0].no}">${t('View bill')}</a></p>` : ''}
        ${s.critical ? `<p class="mt-3 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">${t('The disconnection date ({date}) has passed. Pay now to keep your supply connected.', { date: U.fmtDate(b.dcDate) })}</p>` : ''}

        <ol class="mt-5 space-y-3 text-[13px]">
          ${[['Open your mobile banking app', D.QR.apps.join(' · ')], ['Open the QR full size and scan it from your app', 'Paying from this phone? Save the QR and use “scan from gallery”.'], [D.QR.image ? 'Enter the amount shown here, then confirm with your PIN' : 'Check DESCO, bill number and amount, then confirm with your PIN', 'Never share your PIN or OTP with anyone.']].map(([a, d2], i) => `
            <li class="flex gap-3"><span class="num grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">${U.n(i + 1)}</span><span><span class="block font-medium">${t(a)}</span><span class="text-xs text-ink-3">${i === 0 ? d2.replace('Bank apps', t('Bank apps')) : t(d2)}</span></span></li>`).join('')}
        </ol>
        <button class="btn btn-secondary mt-5 w-full" data-saveqr>${UI.icon('download')}${t('Save QR')}</button>
      </section>`;

    el.innerHTML = `
      <div class="flex flex-col lg:h-full">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-line bg-surface px-3 py-2 sm:px-4">
          <a href="#/bills" class="btn btn-ghost btn-sm btn-icon" aria-label="${t('Back to Due Bills')}">${UI.icon('arrowL')}</a>
          <div class="mr-auto min-w-0">
            <div class="flex items-center gap-2"><h1 class="truncate text-[15px] font-semibold tracking-tight">${U.monthLabel(b.month)}</h1>${UI.statusBadge(s)}</div>
            <div class="num truncate text-xs text-ink-3">${t('Bill no.')} ${b.no} · ${t('A/C')} ${c.account}</div>
          </div>
          <div class="flex flex-wrap items-center gap-1">
            <a ${older ? `href="#/bills/${older.no}"` : 'aria-disabled="true"'} class="btn btn-ghost btn-sm btn-icon ${older ? '' : 'pointer-events-none opacity-40'}" title="${t('Previous month')}" aria-label="${t('Previous month')}">${UI.icon('chevL')}</a>
            <a ${newer ? `href="#/bills/${newer.no}"` : 'aria-disabled="true"'} class="btn btn-ghost btn-sm btn-icon ${newer ? '' : 'pointer-events-none opacity-40'}" title="${t('Next month')}" aria-label="${t('Next month')}">${UI.icon('chevR')}</a>
            <span class="mx-1 hidden h-5 w-px bg-line sm:block"></span>
            <button class="btn btn-secondary btn-sm" data-pdf>${UI.icon('download')}<span class="hidden sm:inline">${t('Download PDF')}</span></button>
          </div>
        </div>

        <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
          <aside class="scroll-thin hidden w-[212px] shrink-0 overflow-y-auto border-r border-line bg-surface-2 p-2 xl:block" aria-label="${t('Previous bills')}">
            <div class="eyebrow px-2 pb-2 pt-1">${t('Previous bills')}</div>
            <ul class="space-y-1">
              ${hist.map((h) => `
                <li><a href="#/bills/${h.no}" class="block rounded-md p-2 transition-colors ${h === b ? 'bg-brand-50 ring-1 ring-brand/40' : 'hover:bg-surface-3'}" ${h === b ? 'aria-current="page"' : ''}>
                  <div class="pointer-events-none h-[132px] overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-line" aria-hidden="true"><div style="zoom:.17">${D.billDocHTML(h, { stamp: false })}</div></div>
                  <div class="mt-1.5 flex items-center justify-between gap-2 text-xs"><span class="font-medium">${U.monthShort(h.month)}</span><span class="num text-ink-3">${U.tk(h.total)}</span><span class="h-2 w-2 rounded-full ${dot(h)}" title="${t(S.STATUS[S.status(h).key].label)}"></span></div>
                </a></li>`).join('')}
            </ul>
          </aside>

          <div id="stage" class="tex-stage relative min-w-0 flex-1 overflow-hidden">
            <div class="flex justify-center p-4 sm:p-8"><div id="doc">${D.billDocHTML(b, { live: true })}</div></div>
          </div>
          <aside class="scroll-thin w-full shrink-0 overflow-y-auto border-t border-line bg-surface lg:w-[360px] lg:border-l lg:border-t-0" aria-label="${t('Pay this bill')}">
            ${payPanel}
            <section class="border-b border-line p-5">
              <h2 class="eyebrow mb-3">${t('Bill at a glance')}</h2>
              <dl class="kv">
                <dt>${t('Units used')}</dt><dd class="num">${U.n(b.kwh)} kWh</dd>
                <dt>${t('Bill amount')}</dt><dd class="num">${U.tk(b.total)}</dd>
                <dt>${t('Issue date')}</dt><dd class="num">${U.fmtDate(b.issue)}</dd>
                <dt>${t('Due date')}</dt><dd class="num">${U.fmtDate(b.due)}</dd>
                <dt>${t('Disconnection date')}</dt><dd class="num ${s.critical ? 'text-danger' : ''}">${U.fmtDate(b.dcDate)}</dd>
              </dl>
            </section>
            <section class="p-5">
              <h2 class="eyebrow mb-3">${t('How your bill is calculated')}</h2>
              <table class="w-full text-xs">
                <tbody class="num">${calc.lines.map((l) => `<tr class="border-t border-line first:border-0"><td class="py-1.5 font-sans text-ink-2">${D.digits(l.label)} kWh</td><td class="py-1.5 text-right text-ink-3">${U.n(l.units)} × ${D.digits(l.rate.toFixed(2))}</td><td class="py-1.5 text-right">${U.n2(l.amount)}</td></tr>`).join('')}</tbody>
              </table>
              <dl class="kv mt-3 border-t border-line-strong pt-3 text-xs">
                <dt>${t('Energy charge')}</dt><dd class="num">${U.n2(b.energy)}</dd>
                <dt>${t('Demand charge')}</dt><dd class="num">${U.n2(b.demand)}</dd>
                <dt>${t('Meter rent')}</dt><dd class="num">${U.n2(b.meterRent)}</dd>
                <dt>${t('VAT 5%')}</dt><dd class="num">${U.n2(b.vat)}</dd>
                <dt class="font-semibold text-ink">${t('Total bill')}</dt><dd class="num font-semibold">${U.n2(b.total)}</dd>
              </dl>
            </section>
          </aside>

        </div>
      </div>`;

    /* --- Fit: the whole bill is always visible, no scrolling (desktop fits width and height, phone fits width) --- */
    const stage = el.querySelector('#stage');
    const doc = el.querySelector('#doc');
    let last = '';
    const applyFit = () => {
      if (!document.body.contains(stage)) return ro.disconnect();
      const lg = window.matchMedia('(min-width: 1024px)').matches;
      const key = lg ? `${stage.clientWidth}x${stage.clientHeight}` : `${stage.clientWidth}`;
      if (key === last) return; // ignore height changes we caused ourselves on phones
      last = key;
      const pad = window.innerWidth >= 640 ? 64 : 32;
      doc.style.zoom = 1;
      const r = doc.getBoundingClientRect();
      const byW = (stage.clientWidth - pad) / r.width;
      const byH = lg ? (stage.clientHeight - pad) / r.height : Infinity;
      doc.style.zoom = Math.max(0.2, Math.min(1.25, byW, byH));
    };
    const ro = new ResizeObserver(applyFit);
    ro.observe(stage);
    doc.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => { last = ''; applyFit(); }, { once: true }));
    applyFit();

    /** Scan-to-pay: the Bangla QR card and the amount to enter. */
    function openScan() {
      const qr = D.QR.card
        ? `<img src="${D.QR.card}" alt="Bangla QR — scan and pay DESCO" class="qr-card mx-auto block h-auto rounded-xl border border-line shadow-card" draggable="false">`
        : `<div class="qr-card mx-auto rounded-xl border border-line bg-white p-5 shadow-card">${D.qrMarkup(b, s.balance, 'block h-auto w-full')}</div>`;
      UI.modal({
        title: t('Scan to pay'), subtitle: `${U.monthLabel(b.month)} · ${t('Bill no.')} <span class="num">${b.no}</span>`, size: 'sm',
        body: `${qr}
          <p class="mt-4 text-center text-[13px] text-ink-2">${t(D.QR.image ? 'Enter this amount in your app' : 'Amount to pay')}: <b class="num text-lg text-ink">${U.tk(s.balance)}</b></p>
          <p class="mt-1 text-center text-[11px] text-ink-3">${t('Hold your phone 15–25 cm from the screen and turn up screen brightness.')}</p>`,
      });
    }

    el.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.hasAttribute('data-qr')) openScan();
      else if (btn.hasAttribute('data-pdf')) D.downloadBill(b);
      else if (btn.hasAttribute('data-saveqr')) { saveQR(b, s.balance); UI.toast(t('QR saved'), { sub: t('Open your app and choose “scan from gallery”.') }); }
    });
  };
})(window.DESCO = window.DESCO || {});
