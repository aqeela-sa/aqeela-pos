/* AQ Pro — the dashboard. One reading order, top to bottom:
   decisions → the month in four numbers → quick actions → cash and bank → the month day by day and how customers paid →
   where the money went and what is owed → the cashier controls → the year.
   Every figure comes from the program's own functions (monthStats, balances, appReceivable…); nothing is recalculated here. */
function proDash(el, D){
  const {inbox, mgr, ns, b, st, yr} = D;
  const can = v => typeof staffSees !== "function" || staffSees(v);
  const P = (d, c) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${c ? ` class="${c}"` : ""}>${d}</svg>`;
  const I = {
    sales:'<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>', net:'<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.5 0-2.7-.6-3.2-1.7M12 6.5V8M12 16.8v1.7"/>',
    prod:'<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>', avg:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    inv:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>', sale:'<path d="M12 5v14M5 12h14"/>', recon:'<path d="M12 3v18M5 7h14"/><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    day:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>', rep:'<path d="M6 3h9l4 4v14H6z"/><path d="M9 17v-3M12 17v-6M15 17v-4"/>',
    cus:'<path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/>', app:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-3-7H9M14 6h3l3 8"/>',
    sup:'<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>', arrow:'<path d="m15 18-6-6 6-6"/>'
  };
  const mName = MONTHS[S.m - 1], R = monthRange(S.y, S.m), t = today();
  const pm = S.m === 1 ? 12 : S.m - 1, py = S.m === 1 ? S.y - 1 : S.y, sp = monthStats(py, pm);
  const delta = (cur, prev, unit) => { if (!prev || !isFinite(cur) || !isFinite(prev)) return "";
    const d = unit === "pp" ? (cur - prev) * 100 : (cur - prev) / Math.abs(prev) * 100; if (!isFinite(d) || Math.abs(d) < 0.05) return `<span class="pdx-d eq">— مثل ${MONTHS[pm - 1]}</span>`;
    const up = d > 0; return `<span class="pdx-d ${up ? "up" : "dn"}">${up ? "▲" : "▼"} <span class="num">${Math.abs(d).toFixed(1)}${unit === "pp" ? " نقطة" : "%"}</span> عن ${MONTHS[pm - 1]}</span>`; };
  const lvTxt = p => { const v = p * 100; return v < 40 ? ["lv1", "ممتازة"] : v < 45 ? ["lv2", "جيدة"] : v < 47 ? ["lv3", "مقبولة"] : ["lv4", "مرتفعة"]; };
  const margin = st.netSales ? st.net / st.netSales : 0, pmargin = sp.netSales ? sp.net / sp.netSales : 0;
  const lv = lvTxt(st.prodPct);

  /* 1 · the month in four numbers */
  const stat = (ic, label, value, sub, extra, cls) => `<div class="pdx-stat ${cls || ""}"><div class="pdx-sh"><span class="pdx-ic">${P(I[ic])}</span><span>${label}</span></div>
    <div class="pdx-v num">${value}</div><div class="pdx-sub">${sub}</div>${extra || ""}</div>`;
  const hero = `<div class="pdx-hero">
    ${stat("sales", `المبيعات الفعلية · ${mName}`, fmt(st.netSales), `بعد عمولة التوصيل <span class="num">${fmt(st.comm)}</span>`, delta(st.avg, sp.avg))}
    ${stat("net", "صافي التشغيل التقريبي", fmt(st.net), `هامش <b class="num">${st.netSales ? pct(margin) : "—"}</b> من المبيعات`, sp.netSales ? delta(margin, pmargin, "pp") : "", st.net < 0 ? "neg" : "")}
    ${stat("prod", "تكلفة الإنتاج", st.netSales ? pct(st.prodPct) : "—", `<span class="num">${fmt(st.prod)}</span> ر.س مواد وتغليف`, st.netSales ? `<span class="pdx-lv ${lv[0]}">${lv[1]}</span>` : "")}
    ${stat("avg", "متوسط البيع اليومي", fmt(st.avg), `<span class="num">${st.days}</span> يوم بيع هذا الشهر`, delta(st.avg, sp.avg))}
  </div>`;

  /* 2 · quick actions */
  const act = [["invoices", "inv", "فاتورة جديدة"], ["sales", "sale", "مبيعات يوم"], ["recon", "recon", "جرد الخزنة والبنك"], ["daily", "day", "الملخص اليومي"], ["reports", "rep", "التقارير"]].filter(a => can(a[0]));
  const actions = act.length ? `<div class="pdx-acts">${act.map(([v, ic, l]) => `<a class="pdx-act" href="#${v}">${P(I[ic])}<span>${l}</span></a>`).join("")}</div>` : "";

  /* 3 · the month day by day */
  const days = []; for (let d = R[0]; d <= R[1]; d = addDays(d, 1)) { const s = S.sales.get(d); days.push({d, v: s && saleTotal(s) > 0 ? saleTotal(s) - saleComm(s, d) : null}); }
  const vals = days.filter(x => x.v != null).map(x => x.v), max = Math.max(1, ...vals, sp.avg || 0);
  const best = vals.length ? days.filter(x => x.v != null).reduce((a, c) => c.v > a.v ? c : a) : null, low = vals.length ? days.filter(x => x.v != null).reduce((a, c) => c.v < a.v ? c : a) : null;
  const chart = (() => {
    const ltr = document.documentElement.dir === "ltr", W = 720, H = 230, pl = ltr ? 50 : 6, pr = ltr ? 6 : 50, pt = 14, pb = 26, step = niceStep(max / 4), top = Math.ceil(max / step) * step || 1;
    const cw = (W - pl - pr) / days.length, bw = Math.max(4, Math.min(18, cw * .62)), y = v => pt + (H - pt - pb) * (1 - v / top);
    let g = "";
    for (let v = 0; v <= top + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" ${v ? 'stroke-dasharray="2 4"' : ""}/><text x="${ltr ? pl - 8 : W - pr + 8}" y="${y(v) + 4}" font-size="10.5" fill="var(--muted)"${ltr ? ' text-anchor="end"' : ""}>${fmt0(v)}</text>`;
    days.forEach((x, i) => { const cx = ltr ? pl + cw * (i + .5) : W - pr - cw * (i + .5);   /* the 1st on the right in Arabic, on the left in English */
      if (x.v != null) g += `<rect x="${cx - bw / 2}" y="${y(x.v)}" width="${bw}" height="${Math.max(1, y(0) - y(x.v))}" rx="${Math.min(4, bw / 3)}" fill="${x.d === (best && best.d) ? "var(--red)" : "color-mix(in srgb,var(--red) 55%,var(--card))"}"><title>${dayName(x.d)} ${dmy(x.d)}: ${fmt(x.v)}</title></rect>`;
      else if (x.d <= t) g += `<rect x="${cx - bw / 2}" y="${y(0) - 2}" width="${bw}" height="2" fill="var(--line)"/>`;
      const dn = +x.d.slice(8); if (dn === 1 || dn % 5 === 0) g += `<text x="${cx}" y="${H - 8}" font-size="10.5" fill="var(--muted)" text-anchor="middle">${dn}</text>`; });
    if (st.avg) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(st.avg)}" y2="${y(st.avg)}" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="5 4"/>`;
    if (sp.avg) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(sp.avg)}" y2="${y(sp.avg)}" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="1 4" opacity=".9"/>`;
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="المبيعات اليومية">${g}</svg>`; })();
  const daysCard = `<div class="card pdx-card"><div class="pdx-ch"><div><h3>المبيعات اليومية · ${mName}</h3><p class="pdx-cap">صافي كل يوم بعد عمولة التوصيل</p></div><a class="pdx-link" href="#sales">كل الأيام ${P(I.arrow)}</a></div>
    <div class="pdx-chart">${chart}</div>
    <div class="pdx-leg"><span><i style="background:color-mix(in srgb,var(--red) 55%,var(--card))"></i>صافي اليوم</span><span><i style="background:var(--red)"></i>أفضل يوم</span><span><i class="ln"></i>متوسط ${mName} <b class="num">${fmt(st.avg)}</b></span>${sp.avg ? `<span><i class="ln dot"></i>متوسط ${MONTHS[pm - 1]} <b class="num">${fmt(sp.avg)}</b></span>` : ""}</div>
    ${best ? `<div class="pdx-mini"><div><small>أفضل يوم</small><b class="num">${fmt(best.v)}</b><span>${dayName(best.d)} <span class="num">${dmy(best.d).slice(0, 5)}</span></span></div><div><small>أضعف يوم</small><b class="num">${fmt(low.v)}</b><span>${dayName(low.d)} <span class="num">${dmy(low.d).slice(0, 5)}</span></span></div><div><small>إجمالي المبيعات</small><b class="num">${fmt(st.total)}</b><span>قبل العمولة</span></div></div>` : ""}</div>`;

  /* 4 · how customers paid */
  const COL = {cash:"#1B7A57", mada:"#2563EB", visa:"#7C3AED", delivery:"#E8590C", transfer:"#0891B2", credit:"#9CA3AF"};
  const by = st.by.filter(x => x.v > 0.004).sort((a, c) => c.v - a.v), tot = st.total || 1;
  const mix = `<div class="card pdx-card"><div class="pdx-ch"><div><h3>طرق الدفع</h3><p class="pdx-cap">من إجمالي <span class="num">${fmt(st.total)}</span> ر.س</p></div></div>
    ${by.length ? `<div class="pdx-stack">${by.map(x => `<i style="width:${(x.v / tot * 100).toFixed(2)}%;background:${COL[x.k] || "#9CA3AF"}" title="${x.l}"></i>`).join("")}</div>
    <div class="pdx-list">${by.map(x => `<div class="pdx-row"><span class="pdx-dot" style="background:${COL[x.k] || "#9CA3AF"}"></span><span class="pdx-l">${x.l}</span><b class="num">${fmt(x.v)}</b><span class="pdx-p num">${pct(x.v / tot)}</span></div>`).join("")}
    ${st.comm ? `<div class="pdx-row sub"><span class="pdx-dot" style="background:transparent"></span><span class="pdx-l">عمولة التطبيقات</span><b class="num neg">-${fmt(st.comm)}</b><span class="pdx-p"></span></div>` : ""}</div>`
    : `<div class="pdx-empty">لا توجد مبيعات مسجّلة في ${mName}</div>`}</div>`;

  /* 5 · where the money went */
  const cats = st.cats.slice(0, 6), cmax = Math.max(1, ...cats.map(x => x.v));
  const spend = `<div class="card pdx-card"><div class="pdx-ch"><div><h3>أعلى بنود المصروفات</h3><p class="pdx-cap">فواتير ${mName}: <span class="num">${fmt(st.invTotal)}</span> ر.س في <span class="num">${st.cats.length}</span> تصنيف</p></div>${can("reports") ? `<a class="pdx-link" href="#reports">التقرير ${P(I.arrow)}</a>` : ""}</div>
    ${cats.length ? `<div class="pdx-bars">${cats.map(x => `<div class="pdx-bar"><div class="pdx-bt"><span>${esc(x.c)}</span><b class="num">${fmt(x.v)}</b><span class="pdx-p num">${pct(x.v / (st.invTotal || 1))}</span></div><div class="pdx-track"><i style="width:${(x.v / cmax * 100).toFixed(1)}%"></i></div></div>`).join("")}</div>`
    : `<div class="pdx-empty">لا توجد فواتير في ${mName}</div>`}</div>`;

  /* 6 · what is owed */
  const ar = appReceivable(), cb = custodyBalances(), cusLeft = cb.reduce((s, x) => s + x.left, 0), ap = typeof apTotal === "function" ? apTotal() : 0;
  const owe = (ic, l, v, sub, href, warn) => `<a class="pdx-owe" href="${href}"><span class="pdx-ic">${P(I[ic])}</span><span class="pdx-ot"><span>${l}</span><small>${sub}</small></span><b class="num ${warn ? "neg" : ""}">${fmt(v)}</b></a>`;
  const owed = `<div class="card pdx-card"><div class="pdx-ch"><div><h3>المستحقات والأرصدة</h3><p class="pdx-cap">ما لك وما عليك الآن</p></div></div>
    <div class="pdx-owes">
      ${owe("app", "مستحقات التطبيقات", ar.left, ar.late > 0.009 ? `منها متأخر <span class="num">${fmt(ar.late)}</span>` : ar.next ? `التحويل المتوقع <span class="num">${dmy(ar.next)}</span>` : "صافي بعد العمولة", ar.byContract ? "#platforms" : "#apps", ar.late > 0.009)}
      ${owe("sup", "المستحق للموردين", ap, "فواتير آجلة لم تُسدد", "#suppliers", ap > 0.004)}
      ${owe("cus", "العهد لدى الموظفين", cusLeft, `<span class="num">${cb.filter(x => Math.abs(x.left) > 0.004).length}</span> موظف لديه رصيد`, "#custody", cusLeft < -0.004)}
    </div>
    ${S.canWrite ? `<button class="btn ghost sm" type="button" id="d_app" style="width:100%;margin-top:12px">تسجيل تحويل من التطبيقات</button>` : ""}</div>`;

  /* 7 · the year, only the months that have numbers */
  const yrs = yr.map((r, i) => ({...r, i})).filter(r => r.s || r.e || r.i + 1 === S.m);
  const ymax = Math.max(1, ...yrs.map(r => Math.max(r.s, r.e)));
  const year = `<div class="card pdx-card"><div class="pdx-ch"><div><h3>أشهر ${S.y}</h3><p class="pdx-cap">المبيعات الفعلية والمصروفات والصافي لكل شهر</p></div></div>
    <div class="tw pdx-tw"><table><thead><tr><th>الشهر</th><th class="n">المبيعات الفعلية</th><th class="n">المصروفات</th><th class="n">الصافي</th><th class="n">تكلفة الإنتاج</th><th style="width:28%"></th></tr></thead><tbody>
    ${yrs.map(r => `<tr ${r.i + 1 === S.m ? 'class="today"' : ""}><td>${r.m}${r.man ? ' <span class="small muted" title="من الملخصات الشهرية اليدوية">*</span>' : ""}</td><td class="n num">${fmt(r.s)}</td><td class="n num">${fmt(r.e)}</td><td class="n num ${r.n < 0 ? "neg" : ""}">${fmt(r.n)}</td><td class="n">${r.s ? `<span class="pdx-lv ${lvTxt(r.p)[0]}">${pct(r.p)}</span>` : "—"}</td>
      <td><div class="pdx-yb"><i class="s" style="width:${(r.s / ymax * 100).toFixed(1)}%"></i><i class="e" style="width:${(r.e / ymax * 100).toFixed(1)}%"></i></div></td></tr>`).join("")}
    <tr class="tot"><td>السنة</td><td class="n num">${fmt(yr.reduce((a, r) => a + r.s, 0))}</td><td class="n num">${fmt(yr.reduce((a, r) => a + r.e, 0))}</td><td class="n num">${fmt(yr.reduce((a, r) => a + r.n, 0))}</td><td class="n num">${(() => { const S1 = yr.reduce((a, r) => a + r.s, 0), P1 = yr.reduce((a, r) => a + r.pv, 0); return S1 ? pct(P1 / S1) : "—"; })()}</td><td><div class="pdx-leg sm"><span><i style="background:var(--red)"></i>مبيعات</span><span><i style="background:var(--ink)"></i>مصروفات</span></div></td></tr></tbody></table></div></div>`;

  el.innerHTML = `<div class="pdx">
    ${inbox}${ns}
    ${hero}
    ${actions}
    ${D.balG ? `<div class="pdx-bal">${D.balG}</div>` : ""}
    <div class="pdx-g2">${daysCard}${mix}</div>
    <div class="pdx-g3">${spend}${owed}${mgr ? `<div class="pdx-mgr">${mgr}</div>` : ""}</div>
    ${typeof bgDashCard === "function" ? bgDashCard() : ""}
    ${year}
    <p class="pdx-foot">الصافي تقديري: لا يشمل تكلفة المخزون الفعلية ولا الاستهلاكات. المصروفات = الفواتير (عدا المدفوعة من العهدة ومسحوبات الشركاء وشراء المعدات وسداد الالتزامات السابقة) + صرف العهد + الرواتب المعتمدة + حصة الأيام من الإيجار والرخصة والإقامات + التغليف المستهلك. المقارنة بالشهر السابق على أساس المتوسط اليومي.</p>
  </div>`;
}
