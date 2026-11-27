/* AQ Pro — sidebar navigation, the content's top bar, the phone's bottom tabs and a quick switcher (Ctrl/⌘ K).
   Active only with <html data-pro="1">. The links mirror the hidden #tabs strip: a page the account may not open there
   is not shown here either, and render() calls proNavSync() after every page change. */
(function(){
  "use strict";
  const pro = () => document.documentElement.dataset.pro === "1";
  const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const IC = {
    dashboard:'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    guide:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    daily:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h3M8 17h6"/>',
    sales:'<path d="M3 17 9 11l4 4 8-8"/><path d="M15 7h6v6"/>',
    invoices:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    recon:'<path d="M12 3v18M5 7h14"/><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0zM8 21h8"/>',
    custody:'<path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.3"/>',
    pos:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4M7 9h4M7 12h7"/>',
    platforms:'<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17h6l-3-7H9M14 6h3l3 8"/>',
    apps:'<path d="M7 4 3 8l4 4"/><path d="M3 8h13"/><path d="m17 12 4 4-4 4"/><path d="M21 16H8"/>',
    kitchen:'<path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9V20H6z"/><path d="M6 17h12"/>',
    ops:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3M9 11h6M9 15h4"/>',
    buy:'<path d="M6 7h12l-1 13H7z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
    suppliers:'<path d="M3 7h11v10H3zM14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    stock:'<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
    prodcost:'<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    menu:'<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5a2 2 0 0 0 4 0V3"/><path d="M17 21V3c-2 1.5-3 4-3 7v4h3"/>',
    budget:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    reports:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 17v-3M12 17v-6M15 17v-4"/>',
    cfo:'<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    accounting:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13v2H6M9 7h6M9 11h4"/>',
    payroll:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    setup:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bars:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    out:'<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
  };
  const icon = k => P(IC[k] || IC.dashboard);
  /* the sections, in the order of the daily work */
  const GROUPS = [
    ["الرئيسية", ["dashboard", "guide", "daily"]],
    ["العمل اليومي", ["sales", "invoices", "recon", "custody", "pos", "platforms", "apps"]],
    ["المطبخ والمشتريات", ["kitchen", "ops", "buy", "suppliers", "stock"]],
    ["التكاليف والتحليل", ["prodcost", "menu", "budget", "reports", "cfo"]],
    ["الإدارة", ["accounting", "payroll", "history", "setup"]]
  ];
  const BOTTOM = ["dashboard", "sales", "invoices", "recon"];
  const tabOf = v => document.querySelector(`#tabs a[data-v="${v}"]`);
  const EXTRA = {account:["حسابي", "الحساب"]};   // pages outside the tab strip
  const nameOf = v => { const a = tabOf(v); return a ? a.textContent.trim() : EXTRA[v] ? EXTRA[v][0] : v; };
  const visible = v => { const a = tabOf(v); return !!a && !a.hidden; };
  const groupOf = v => EXTRA[v] ? EXTRA[v][1] : (GROUPS.find(g => g[1].includes(v)) || [""])[0];
  let built = false;

  function build(){
    built = true;
    const aqSrc = (document.querySelector(".logo2 .aqlogo") || {}).src || "../icons/icon-192.png";
    const known = new Set(GROUPS.flatMap(g => g[1]));
    /* any page added later to #tabs and not placed in a section still shows, under «الإدارة» */
    [...document.querySelectorAll("#tabs a[data-v]")].forEach(a => { if (!known.has(a.dataset.v)) GROUPS[GROUPS.length - 1][1].push(a.dataset.v); });
    const nav = document.createElement("aside"); nav.id = "pxnav"; nav.className = "px-only"; nav.setAttribute("aria-label", "التنقل");
    nav.innerHTML = `<div class="px-brand"><img src="${aqSrc}" alt=""><div><b dir="ltr" class="px-name">AQ <span>ACC</span></b><small>شاورما العقيلة · المحاسبة والإدارة</small></div></div>
      <button type="button" class="px-search" id="px_find">${icon("search")}<span>بحث وانتقال سريع…</span><kbd>Ctrl K</kbd></button>
      <nav class="px-scroll">${GROUPS.map(([t, vs]) => `<div class="px-grp"><div class="px-sec">${t}</div>${vs.map(v => `<a class="px-link" href="#${v}" data-pv="${v}">${icon(v)}<span>${nameOf(v)}</span></a>`).join("")}</div>`).join("")}</nav>
      <div class="px-foot"><a class="px-me" id="px_me" href="#account" title="حسابي: البيانات وكلمة المرور"><div class="px-av" id="px_av">A</div><div class="px-who"><b id="px_name">—</b><small id="px_role"></small></div></a><button type="button" class="px-out" id="px_out" title="تسجيل الخروج" aria-label="تسجيل الخروج">${icon("out")}</button></div>`;
    const top = document.createElement("div"); top.id = "pxtop"; top.className = "px-only";
    top.innerHTML = `<button type="button" class="px-menu" id="px_menu" aria-label="القائمة">${icon("bars")}</button><img class="px-mlogo" src="${aqSrc}" alt="">
      <div class="px-crumb"><span id="px_grp"></span><i>/</i><b id="px_page"></b></div>
      <div class="px-neww"><button type="button" class="px-new" id="px_new" aria-haspopup="true" aria-expanded="false"><b>+</b><span>إضافة</span></button><div class="px-pop" id="px_pop" hidden></div></div>
      <button type="button" class="px-ic" id="px_find2" aria-label="بحث وانتقال سريع">${icon("search")}</button>
      <button type="button" class="px-ic px-rl" id="px_rl" title="تحديث البرنامج" aria-label="تحديث البرنامج"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg></button>
      <button type="button" class="px-ic px-lang" id="px_lang" data-noi18n title="${window.accLang && accLang() === "en" ? "العربية" : "English"}">${window.accLang && accLang() === "en" ? "ع" : "EN"}</button>`;
    const st = document.getElementById("status"); if (st) top.appendChild(st);
    const scrim = document.createElement("div"); scrim.id = "pxscrim"; scrim.className = "px-only";
    const bot = document.createElement("nav"); bot.id = "pxbot"; bot.className = "px-only"; bot.setAttribute("aria-label", "الصفحات الرئيسية");
    const k = document.createElement("div"); k.id = "pxk"; k.hidden = true;
    k.innerHTML = `<div class="pxk-box" role="dialog" aria-modal="true" aria-label="انتقال سريع"><div class="pxk-in">${icon("search")}<input id="pxk_q" placeholder="ابحث عن صفحة، مورد، فاتورة بمبلغها أو رقمها، موظف، أو تاريخ…" autocomplete="off"></div><div class="pxk-list" id="pxk_l"></div></div>`;
    const main = document.getElementById("main");
    document.body.insertBefore(nav, main); document.body.insertBefore(top, main); document.body.append(scrim, bot, k);

    /* «+ إضافة»: the everyday entries one tap away, each opens its page with the form ready */
    const NEW = [["invoices", "فاتورة جديدة", "#i_date"], ["sales", "مبيعات يوم", "#s_date"], ["custody", "حركة عهدة", "#c_date"], ["recon", "جرد الخزنة والبنك", ""], ["buy", "طلب شراء", ""]];
    const pop = document.getElementById("px_pop"), nb = document.getElementById("px_new");
    const popClose = () => { pop.hidden = true; nb.setAttribute("aria-expanded", "false"); };
    nb.onclick = e => { e.stopPropagation(); if (!pop.hidden) return popClose();
      const L = NEW.filter(x => visible(x[0])); if (!L.length) return;
      pop.innerHTML = L.map(([v, l, f]) => `<a href="#${v}" data-f="${f}">${icon(v)}<span>${l}</span></a>`).join(""); pop.hidden = false; nb.setAttribute("aria-expanded", "true"); };
    pop.onclick = e => { const a = e.target.closest("a"); if (!a) return; popClose(); const f = a.dataset.f;
      if (f) setTimeout(() => { const el = document.querySelector(f); if (el){ el.scrollIntoView({block:"center", behavior:"smooth"}); el.focus({preventScroll:true}); } }, 450); };
    document.addEventListener("click", e => { if (!pop.hidden && !pop.contains(e.target)) popClose(); });
    const close = () => { nav.classList.remove("open"); scrim.classList.remove("open"); document.body.classList.remove("px-lock"); };
    document.getElementById("px_menu").onclick = () => { nav.classList.add("open"); scrim.classList.add("open"); document.body.classList.add("px-lock"); };
    scrim.onclick = close;
    nav.addEventListener("click", e => { if (e.target.closest("a")) close(); });
    document.getElementById("px_out").onclick = () => { if (confirm("تسجيل الخروج من البرنامج؟")) window.__accFb && window.__accFb.user.signOut(); };
    addEventListener("scroll", () => top.classList.toggle("sc", scrollY > 4), {passive:true});

    /* quick switcher */
    let items = [], sel = 0;
    const q = document.getElementById("pxk_q"), list = document.getElementById("pxk_l");
    const norm = s => String(s).replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
    /* besides the pages: invoices (supplier, number, amount, category), suppliers, employees and a day by its date */
    const esc2 = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
    const recs = raw => { const out = [], invs = [], t = norm(raw); if (raw.length < 2 || typeof S === "undefined") return out;
      const go = (v, fn) => () => { location.hash = "#" + v; setTimeout(() => { try { fn && fn(); } catch(e){} }, 350); };
      const dm = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/) || raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (dm && visible("daily")){ let y, m, d; if (dm[0].length >= 8 && /^\d{4}/.test(dm[0])){ y = +dm[1]; m = +dm[2]; d = +dm[3]; } else { d = +dm[1]; m = +dm[2]; y = dm[3] ? (+dm[3] < 100 ? 2000 + +dm[3] : +dm[3]) : S.y; }
        const iso2 = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) out.push({ic:"daily", n:`الملخص اليومي · ${d}/${m}/${y}`, g:"يوم", run: () => { S.dyPick = true; S.dyDate = iso2; if (location.hash === "#daily") render(); else location.hash = "#daily"; }}); }
      const num = raw.replace(/,/g, ""), isNum = /^\d+(\.\d+)?$/.test(num);
      if (visible("invoices") && Array.isArray(S.invoices)){
        const hit = S.invoices.filter(x => !x.deleted && (isNum ? (String(x.no || "") === num || Math.abs((+x.beforeTax || 0) + (+x.vat || 0) - +num) < 0.006 || String(x.no || "").includes(num))
          : norm(x.supplier || "").includes(t) || norm(x.category || "").includes(t) || norm(x.buyer || "").includes(t) || norm(x.notes || "").includes(t)))
          .sort((a, b2) => (b2.date || "").localeCompare(a.date || "")).slice(0, 6);
        hit.forEach(x => invs.push({ic:"invoices", n:`${esc2(x.supplier || x.category || "فاتورة")} · <span class="num">${((+x.beforeTax || 0) + (+x.vat || 0)).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</span>`, g:`فاتورة ${esc2((x.date || "").split("-").reverse().join("/"))}`, run: go("invoices", () => S.loadInv && S.loadInv(x.id))})); }
      if (!isNum && visible("suppliers") && Array.isArray(S.suppliers)) S.suppliers.filter(x => !x.deleted && norm(x.name || "").includes(t)).slice(0, 3)
        .forEach(x => out.push({ic:"suppliers", n:esc2(x.name), g:"مورد", run: go("suppliers")}));
      if (!isNum && visible("payroll") && Array.isArray(S.staff)) S.staff.filter(x => !x.deleted && norm(x.name || "").includes(t)).slice(0, 3)
        .forEach(x => out.push({ic:"payroll", n:esc2(x.name), g:"موظف", run: go("payroll", () => typeof openHrProfile === "function" && openHrProfile(x.id))}));
      return [...out, ...invs]; };
    const draw = () => { const raw = q.value.trim(), t = norm(raw);
      const pages = GROUPS.flatMap(([g, vs]) => vs.filter(visible).map(v => ({v, ic:v, n:nameOf(v), g}))).filter(x => !t || norm(x.n).includes(t) || norm(x.g).includes(t));
      if (!t || norm("حسابي كلمة المرور الحساب الملف الشخصي").includes(t)) pages.push({v:"account", ic:"user", n:"حسابي وكلمة المرور", g:"الحساب"});
      const rs = recs(raw); items = [...pages, ...rs];
      sel = Math.min(sel, Math.max(0, items.length - 1));
      const row = (x, i) => `<a class="pxk-it ${i === sel ? "sel" : ""}" href="${x.v ? "#" + x.v : "#"}" data-i="${i}">${icon(x.ic)}<span>${x.n}</span><small>${x.g}</small></a>`;
      list.innerHTML = items.length ? (pages.length ? `<div class="pxk-h">الصفحات</div>` + pages.map((x, i) => row(x, i)).join("") : "") + (rs.length ? `<div class="pxk-h">السجلات</div>` + rs.map((x, i) => row(x, pages.length + i)).join("") : "")
        : `<div class="pxk-empty">لا توجد نتيجة. جرّب اسم صفحة أو مورد أو مبلغ فاتورة أو تاريخاً مثل 12/11</div>`;
      const s = list.querySelector(".sel"); if (s) s.scrollIntoView({block:"nearest"}); };
    const pick = i => { const x = items[i]; if (!x) return; closeK(); if (x.run) x.run(); else location.hash = "#" + x.v; };
    const openK = () => { if (!pro()) return; close(); k.hidden = false; q.value = ""; sel = 0; draw(); setTimeout(() => q.focus(), 20); };
    const closeK = () => { k.hidden = true; };
    document.getElementById("px_find").onclick = openK; document.getElementById("px_find2").onclick = openK;
    document.getElementById("px_rl").onclick = e => { e.currentTarget.classList.add("spin"); window.accReload ? accReload() : location.reload(); };
    document.getElementById("px_lang").onclick = () => window.accSetLang && accSetLang(accLang() === "en" ? "ar" : "en");
    q.oninput = () => { sel = 0; draw(); };
    q.onkeydown = e => { if (e.key === "ArrowDown"){ e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      else if (e.key === "Enter" && items[sel]){ e.preventDefault(); pick(sel); } };
    list.onclick = e => { const a = e.target.closest("a[data-i]"); if (a){ e.preventDefault(); pick(+a.dataset.i); } };
    k.onclick = e => { if (e.target === k) closeK(); };
    addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.key === "ك")){ e.preventDefault(); k.hidden ? openK() : closeK(); }
      else if (e.key === "Escape"){ if (!k.hidden) closeK(); close(); popClose(); } });
  }

  function who(){
    try {
      const me = typeof teamMe === "function" ? teamMe() : null;
      const role = typeof S !== "undefined" && S.canEdit ? "المالك" : me ? ((typeof TEAM_ROLES !== "undefined" && TEAM_ROLES[me.role] && TEAM_ROLES[me.role].l) || "عضو الفريق") : "موظف";
      const nm = typeof accMyName === "function" ? accMyName() : me && me.name ? me.name : (typeof S !== "undefined" && S.canEdit ? "حساب المالك" : "حساب الإدخال");
      return {nm, role};
    } catch(e){ return {nm:"—", role:""}; }
  }

  /* long text in a table cell (a long supplier name, a note) wraps inside a bounded width instead of stretching its column across the page */
  let wrapT = 0;
  const markWrap = () => { wrapT = 0; document.querySelectorAll("#main td:not([data-pw]), #sheet td:not([data-pw])").forEach(td => { td.dataset.pw = "1";
    if (td.querySelector("input,select,textarea,button")) return; const t = (td.textContent || "").replace(/\s+/g, " ").trim(); if (t.length > 40) td.classList.add("px-wrap"); }); };
  const mo = new MutationObserver(() => { if (pro() && !wrapT) wrapT = setTimeout(markWrap, 40); });
  document.addEventListener("DOMContentLoaded", () => { const m = document.getElementById("main"), sh = document.getElementById("sheet");
    if (m) mo.observe(m, {childList:true, subtree:true}); if (sh) mo.observe(sh, {childList:true, subtree:true}); });

  window.proNavSync = function(){
    if (!pro()) return;
    if (!built) build();
    const cur = typeof S !== "undefined" ? S.view : "";
    document.querySelectorAll("#pxnav .px-link").forEach(a => { a.hidden = !visible(a.dataset.pv); a.classList.toggle("on", a.dataset.pv === cur); a.lastElementChild.textContent = nameOf(a.dataset.pv); });
    document.querySelectorAll("#pxnav .px-grp").forEach(g => { g.hidden = !g.querySelector(".px-link:not([hidden])"); });
    const pg = document.getElementById("px_page"), gr = document.getElementById("px_grp");
    if (pg) pg.textContent = nameOf(cur); if (gr) gr.textContent = groupOf(cur);
    const bot = document.getElementById("pxbot");
    if (bot){ const vs = BOTTOM.filter(visible).slice(0, 4);
      bot.innerHTML = vs.map(v => `<a href="#${v}" class="${v === cur ? "on" : ""}">${icon(v)}<span>${nameOf(v)}</span></a>`).join("") +
        `<button type="button" class="${vs.includes(cur) ? "" : "on"}" id="px_more">${icon("more")}<span>المزيد</span></button>`;
      bot.style.gridTemplateColumns = `repeat(${vs.length + 1},1fr)`;
      document.getElementById("px_more").onclick = () => document.getElementById("px_menu").click(); }
    const w = who(); const n = document.getElementById("px_name"), r = document.getElementById("px_role"), av = document.getElementById("px_av");
    const pm = document.getElementById("px_me"); if (pm) pm.classList.toggle("on", cur === "account");
    if (n) n.textContent = w.nm; if (r) r.textContent = w.role; if (av) av.textContent = (w.nm || "A").trim().charAt(0) || "A";
  };
})();

/* Keeping the program current, above all when it runs as an app from the home screen (no address bar, no reload button):
   - it checks the published page now and then, and when a newer version is out it offers «تحديث الآن» at the bottom;
   - pulling the page down from the very top reloads it, as in other phone apps;
   - «تحديث البرنامج» in the menu does the same at any time.
   A reload asks the server for a fresh copy (a new address each time), so an old copy kept by the phone is not reused. */
(function(){
  const fresh = () => { const u = new URL(location.href); u.searchParams.set("r", Date.now().toString(36)); location.replace(u.pathname + u.search + u.hash); };
  window.accReload = fresh;
  /* a newer version is out when the published page names a program file (file.js?v=12 …) that this copy has not loaded */
  let shown = false;
  async function check(){
    if (shown || document.hidden || !navigator.onLine) return;
    try {
      const r = await fetch(location.pathname + "?chk=" + Date.now(), { cache: "no-store" }); if (!r.ok) return;
      const h = await r.text();
      const want = [...h.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+\?v=[^"]+)"/g)].map(m => m[1]);
      if (!want.length) return;
      const have = new Set([...document.querySelectorAll("script[src],link[href]")].map(e => e.getAttribute("src") || e.getAttribute("href")));
      if (want.some(u => !have.has(u))) offer();
    } catch(e){}
  }
  function offer(){
    if (shown) return; shown = true;
    const b = document.createElement("div"); b.id = "acc_upd"; b.setAttribute("role", "status");
    b.innerHTML = `<span>يتوفر تحديث جديد للبرنامج</span><button type="button">تحديث الآن</button>`;
    b.querySelector("button").onclick = fresh;
    document.body.appendChild(b);
  }
  setTimeout(check, 4000); setInterval(check, 5 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });

  /* pull down from the top to reload (phones only; not while a window, the menu or a text field is in use) */
  const busy = () => document.querySelector(".modal-bg:not([hidden]), .modal:not([hidden]), #pxnav.open, #pxk:not([hidden]), dialog[open]") || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "");
  let y0 = null, pull = 0, ind = null;
  const show = d => {
    if (!ind){ ind = document.createElement("div"); ind.id = "acc_ptr"; ind.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`; document.body.appendChild(ind); }
    const p = Math.min(1, d / 90); ind.style.opacity = p; ind.style.transform = `translate(-50%, ${Math.min(d, 110) * 0.7}px) rotate(${p * 300}deg)`; ind.classList.toggle("go", d >= 90);
  };
  const hide = () => { if (ind){ ind.style.opacity = 0; ind.style.transform = "translate(-50%,0)"; } };
  addEventListener("touchstart", e => { y0 = (window.scrollY <= 0 && e.touches.length === 1 && !busy()) ? e.touches[0].clientY : null; pull = 0; }, { passive: true });
  addEventListener("touchmove", e => { if (y0 == null) return; pull = e.touches[0].clientY - y0; if (pull > 10 && window.scrollY <= 0) show(pull - 10); else if (pull <= 0) { y0 = null; hide(); } }, { passive: true });
  addEventListener("touchend", () => { if (y0 != null && pull - 10 >= 90){ if (ind) ind.classList.add("spin"); fresh(); } else hide(); y0 = null; }, { passive: true });
  const st = document.createElement("style"); st.textContent = `
#acc_upd{position:fixed;z-index:60;inset-inline:12px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:#1D1D22;color:#fff;font-weight:600;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:520px;margin-inline:auto}
#acc_upd button{flex:none;border:0;border-radius:10px;background:#C8102E;color:#fff;font:inherit;font-weight:700;padding:8px 14px;cursor:pointer}
@media (max-width:1023px){#acc_upd{bottom:calc(76px + env(safe-area-inset-bottom))}}
#acc_ptr{position:fixed;z-index:70;left:50%;top:calc(8px + env(safe-area-inset-top));width:38px;height:38px;border-radius:50%;background:var(--card,#fff);color:var(--muted,#777);display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.16);opacity:0;transform:translate(-50%,0);pointer-events:none;transition:opacity .15s}
#acc_ptr svg{width:20px;height:20px}#acc_ptr.go{color:var(--red,#C8102E)}
#acc_ptr.spin{animation:accspin .8s linear infinite;opacity:1}@keyframes accspin{to{transform:translate(-50%,77px) rotate(360deg)}}
`; document.head.appendChild(st);
})();
