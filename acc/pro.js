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
  const nameOf = v => { const a = tabOf(v); return a ? a.textContent.trim() : v; };
  const visible = v => { const a = tabOf(v); return !!a && !a.hidden; };
  const groupOf = v => (GROUPS.find(g => g[1].includes(v)) || [""])[0];
  let built = false;

  function build(){
    built = true;
    const aqSrc = (document.querySelector(".logo2 .aqlogo") || {}).src || "../icons/icon-192.png";
    const known = new Set(GROUPS.flatMap(g => g[1]));
    /* any page added later to #tabs and not placed in a section still shows, under «الإدارة» */
    [...document.querySelectorAll("#tabs a[data-v]")].forEach(a => { if (!known.has(a.dataset.v)) GROUPS[GROUPS.length - 1][1].push(a.dataset.v); });
    const nav = document.createElement("aside"); nav.id = "pxnav"; nav.className = "px-only"; nav.setAttribute("aria-label", "التنقل");
    nav.innerHTML = `<div class="px-brand"><img src="${aqSrc}" alt=""><div><b>شاورما العقيلة</b><small>نظام الإدارة والمحاسبة</small></div></div>
      <button type="button" class="px-search" id="px_find">${icon("search")}<span>انتقال سريع…</span><kbd>Ctrl K</kbd></button>
      <nav class="px-scroll">${GROUPS.map(([t, vs]) => `<div class="px-grp"><div class="px-sec">${t}</div>${vs.map(v => `<a class="px-link" href="#${v}" data-pv="${v}">${icon(v)}<span>${nameOf(v)}</span></a>`).join("")}</div>`).join("")}</nav>
      <div class="px-foot"><div class="px-av" id="px_av">A</div><div class="px-who"><b id="px_name">—</b><small id="px_role"></small></div><button type="button" class="px-out" id="px_out" title="تسجيل الخروج" aria-label="تسجيل الخروج">${icon("out")}</button></div>`;
    const top = document.createElement("div"); top.id = "pxtop"; top.className = "px-only";
    top.innerHTML = `<button type="button" class="px-menu" id="px_menu" aria-label="القائمة">${icon("bars")}</button><img class="px-mlogo" src="${aqSrc}" alt="">
      <div class="px-crumb"><span id="px_grp"></span><i>/</i><b id="px_page"></b></div><button type="button" class="px-ic" id="px_find2" aria-label="انتقال سريع">${icon("search")}</button>`;
    const st = document.getElementById("status"); if (st) top.appendChild(st);
    const scrim = document.createElement("div"); scrim.id = "pxscrim"; scrim.className = "px-only";
    const bot = document.createElement("nav"); bot.id = "pxbot"; bot.className = "px-only"; bot.setAttribute("aria-label", "الصفحات الرئيسية");
    const k = document.createElement("div"); k.id = "pxk"; k.hidden = true;
    k.innerHTML = `<div class="pxk-box" role="dialog" aria-modal="true" aria-label="انتقال سريع"><div class="pxk-in">${icon("search")}<input id="pxk_q" placeholder="اكتب اسم الصفحة…" autocomplete="off"></div><div class="pxk-list" id="pxk_l"></div></div>`;
    const main = document.getElementById("main");
    document.body.insertBefore(nav, main); document.body.insertBefore(top, main); document.body.append(scrim, bot, k);

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
    const draw = () => { const t = norm(q.value.trim());
      items = GROUPS.flatMap(([g, vs]) => vs.filter(visible).map(v => ({v, n:nameOf(v), g}))).filter(x => !t || norm(x.n).includes(t) || norm(x.g).includes(t));
      sel = Math.min(sel, Math.max(0, items.length - 1));
      list.innerHTML = items.length ? items.map((x, i) => `<a class="pxk-it ${i === sel ? "sel" : ""}" href="#${x.v}" data-i="${i}">${icon(x.v)}<span>${x.n}</span><small>${x.g}</small></a>`).join("") : `<div class="pxk-empty">لا توجد صفحة بهذا الاسم</div>`;
      const s = list.querySelector(".sel"); if (s) s.scrollIntoView({block:"nearest"}); };
    const openK = () => { if (!pro()) return; close(); k.hidden = false; q.value = ""; sel = 0; draw(); setTimeout(() => q.focus(), 20); };
    const closeK = () => { k.hidden = true; };
    document.getElementById("px_find").onclick = openK; document.getElementById("px_find2").onclick = openK;
    q.oninput = () => { sel = 0; draw(); };
    q.onkeydown = e => { if (e.key === "ArrowDown"){ e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); draw(); }
      else if (e.key === "ArrowUp"){ e.preventDefault(); sel = Math.max(0, sel - 1); draw(); }
      else if (e.key === "Enter" && items[sel]){ e.preventDefault(); location.hash = "#" + items[sel].v; closeK(); } };
    list.onclick = e => { if (e.target.closest("a")) closeK(); };
    k.onclick = e => { if (e.target === k) closeK(); };
    addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.key === "ك")){ e.preventDefault(); k.hidden ? openK() : closeK(); }
      else if (e.key === "Escape"){ if (!k.hidden) closeK(); close(); } });
  }

  function who(){
    try {
      const me = typeof teamMe === "function" ? teamMe() : null;
      const role = typeof S !== "undefined" && S.canEdit ? "المالك" : me ? ((typeof TEAM_ROLES !== "undefined" && TEAM_ROLES[me.role] && TEAM_ROLES[me.role].l) || "عضو الفريق") : "موظف";
      const nm = me && me.name ? me.name : (typeof S !== "undefined" && S.canEdit ? "حساب المالك" : "حساب الإدخال");
      return {nm, role};
    } catch(e){ return {nm:"—", role:""}; }
  }

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
    if (n) n.textContent = w.nm; if (r) r.textContent = w.role; if (av) av.textContent = (w.nm || "A").trim().charAt(0) || "A";
  };
})();
