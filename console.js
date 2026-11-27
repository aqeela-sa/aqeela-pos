/* Cashier AQ — لوحة المدير
   لوحة كاملة بعرض الشاشة على طريقة لوحة فودكس: قائمة جانبية بمجموعات، شريط علوي، ملخص بتبويبات
   (عام، المطبخ، الكاشيرون)، تقارير بتجميع وترتيب وتصدير، الطلبات بتفاصيلها، الخصومات والإلغاءات، والورديات.
   تُحمَّل عند فتح اللوحة فقط، وتعتمد على دوال الكاشير عبر الكائن A. */

let A, root, ro, st;
const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
const ls = { get: (k, d) => { try { const v = localStorage.getItem("cx_" + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set: (k, v) => { try { localStorage.setItem("cx_" + k, JSON.stringify(v)); } catch {} } };

/* ---------- تنسيق ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r2 = x => Math.round((+x || 0) * 100) / 100;
const nf = (x, d = 2) => r2(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const ni = x => Math.round(+x || 0).toLocaleString("en-US");
const sar = x => `<span class="num">${nf(x)}</span><small>ر.س</small>`;
const pct = x => isFinite(x) ? `\u2066${nf(x, 1)}%\u2069` : "—";
const pad = (x, n = 2) => String(x).padStart(n, "0");
const AR_M = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const dLab = d => `${+d.slice(8)} ${AR_M[+d.slice(5, 7) - 1]}`;
const dFull = d => `${+d.slice(8)} ${AR_M[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;
const rLab = (a, b) => a === b ? dFull(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)} – ${dFull(b)}` : `${dLab(a)} – ${dFull(b)}`;
const tm = t => { const d = new Date(t); let h = d.getHours(); const ap = h < 12 ? "ص" : "م"; h = h % 12 || 12; return `${h}:${pad(d.getMinutes())} ${ap}`; };
const hrLab = h => window.aqLang && window.aqLang() === "en" ? `${(h % 12) || 12} ${h < 12 ? "AM" : "PM"}` : `${(h % 12) || 12}${h < 12 ? "ص" : "م"}`;
const COLORS = ["#C1121F", "#1F4E9E", "#F28C28", "#2A9D8F", "#7B2CBF", "#E9C46A", "#6B7280", "#0EA5E9"];
const TYPE_C = { dine: "#F28C28", take: "#C1121F", delivery: "#0E7490", lokit: "#7B2CBF", hunger: "#B45309" };

/* ---------- أيقونات (Material) ---------- */
const P = {
  compare: "M9.01 14H2v2h7.01v3L13 15l-3.99-4v3zm5.98-1v-3H22V8h-7.01V5L11 9l3.99 4z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  globe: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z",
  people: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  chat: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z",
  call: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  dash: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  cart: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
  trend: "M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
  bag: "M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-2.76 0-5-2.24-5-5h2c0 1.66 1.34 3 3 3s3-1.34 3-3h2c0 2.76-2.24 5-5 5z",
  food: "M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z",
  gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  store: "M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z",
  chev: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  refresh: "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  cal: "M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z",
  cloud: "M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",
  filter: "M4.25 5.61C6.27 8.2 10 13 10 13v6c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-6s3.72-4.8 5.74-7.39A.998.998 0 0018.95 4H5.04c-.83 0-1.3.95-.79 1.61z",
  print: "M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  chart: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
  logout: "M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z",
  inbox: "M19 3H4.99C3.88 3 3 3.9 3 5l.01 14c0 1.1.88 2 1.99 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c0 1.66-1.35 3-3 3s-3-1.34-3-3H4.99V5H19v10z",
  receipt: "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  chef: "M12.5 1.5c-1.77 0-3.33 1.17-3.83 2.87C8.14 4.13 7.58 4 7 4 4.79 4 3 5.79 3 8c0 2.05 1.53 3.76 3.56 3.97L7 21h10l.44-9.03C19.47 11.76 21 10.05 21 8c0-2.21-1.79-4-4-4-.58 0-1.14.13-1.67.37-.5-1.7-2.06-2.87-3.83-2.87zM8 18h8v1.5H8z",
};
const ic = (k, cls = "i") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}"/></svg>`;

/* ---------- الهيكل والتنقل ---------- */
const NAV = [
  { id: "dash", ic: "dash", t: "الملخص" },
  { id: "orders", ic: "cart", t: "الطلبات" },
  { id: "customers", ic: "people", t: "العملاء" },
  { id: "compare", ic: "compare", t: "المقارنة" },
  { g: "reports", ic: "trend", t: "التقارير", items: [["sales", "المبيعات"], ["hours", "المبيعات بالساعة"], ["pays", "المدفوعات"], ["items", "تحليل القائمة"], ["disc", "الخصومات والإلغاءات"], ["shifts", "الورديات"]] },
  { id: "stock", ic: "bag", t: "المخزون" },
  { id: "menu", ic: "food", t: "قائمة المنتجات" },
  { g: "admin", ic: "gear", t: "إدارة", items: [["staff", "الكاشيرون والرموز"], ["store", "الإيصال والإعدادات"], ["verify", "التحقق من إيصال"], ["account", "حسابي وكلمة المرور"]] },
];
const TITLES = { compare: "المقارنة", dash: "الملخص", orders: "الطلبات", customers: "العملاء", sales: "تقرير المبيعات", hours: "المبيعات بالساعة", pays: "تقرير المدفوعات", items: "تحليل القائمة", disc: "الخصومات والإلغاءات", shifts: "الورديات", stock: "المخزون — التغليف", menu: "قائمة المنتجات والأسعار", staff: "الكاشيرون والرموز", store: "الإيصال والإعدادات", verify: "التحقق من إيصال", account: "حسابي" };
const PARENT = { sales: "التقارير", hours: "التقارير", pays: "التقارير", items: "التقارير", disc: "التقارير", shifts: "التقارير", staff: "إدارة", store: "إدارة", verify: "إدارة", account: "إدارة" };

export function mount(api, tab) {
  A = api; window.__cxUnmount = unmount;
  const t = A.bizDay();
  st = Object.assign({ page: "dash", open: { reports: true, admin: false }, p: "day", d: t, cmp: false, dtab: "gen", flt: { type: "", method: "", cashier: "", test: false },
    a: t, b: t, grp: "day", pgrp: "none", igrp: "none", q: "", status: "all", pg: 0, cat: "", chart: false, dkind: "disc" }, ls.get("st", {}));
  if (!Array.isArray(st.hrs)) st.hrs = []; st.hrs = st.hrs.filter(h => Number.isInteger(h) && h >= 0 && h < 24);
  st.d = st.a = st.b = t; st.q = ""; st.pg = 0;
  const h = location.hash.match(/^#\/admin\/(\w+)/);
  st.page = tab || (h && TITLES[h[1]] ? h[1] : st.page);
  root = document.getElementById("app");
  root.innerHTML = `<div class="cx" id="cx">
    <aside class="cx-side"><div class="cx-logo"><img src="icons/logo.png" alt=""><b dir="ltr">Cashier AQ</b></div><nav class="cx-nav" id="cxnav"></nav>
      <div class="cx-foot"><a class="cx-ni" href="acc/" target="_blank" rel="noopener" title="برنامج المحاسبة (نافذة جديدة)">${ic("chart")}<span>برنامج المحاسبة ↗</span></a><button class="cx-ni" data-act="pos">${ic("store")}<span>شاشة البيع</span></button></div></aside>
    <div class="cx-scrim" data-act="nav"></div>
    <div class="cx-main"><header class="cx-top"><button class="cx-burger" data-act="nav" aria-label="القائمة">${ic("menu")}</button>
      <div class="cx-crumb" id="cxcrumb"></div><span class="cx-sp"></span>
      <span class="cx-net" id="cxnet"><i></i><span></span></span>
      <button class="cx-ib" data-act="reload" title="تحديث البيانات" aria-label="تحديث البيانات">${ic("refresh")}</button>
      <div class="cx-user"><button class="cx-av" data-act="user"><span>${esc(userName())}</span><img src="icons/logo.png" alt="AQ"></button></div></header>
      <main class="cx-page" id="cxp"></main></div></div>`;
  root.addEventListener("click", onClick);
  addEventListener("hashchange", onHash); addEventListener("online", net); addEventListener("offline", net);
  ro = new ResizeObserver(() => { clearTimeout(ro.t); ro.t = setTimeout(drawCharts, 80); }); ro.observe($("#cxp"));
  net(); go(st.page, true);
  idleLast = Date.now(); idleWatch(); accLoad(true).then(() => { const n = root.querySelector(".cx-av span"); if (n && ACC.name) n.textContent = ACC.name; });
}
function unmount() {
  removeEventListener("hashchange", onHash); removeEventListener("online", net); removeEventListener("offline", net);
  clearInterval(idleT); ro?.disconnect(); closePop(); closeDrawer(); root?.removeEventListener("click", onClick); window.__cxUnmount = null;
  if (location.hash.startsWith("#/admin")) history.replaceState(null, "", location.pathname + location.search);
}
const userName = () => ACC.name || (A.S.user?.email ==="abuabraj@gmail.com" ? "عاطف" : (A.S.cashier?.name || "المدير"));
function net() { const n = $("#cxnet"); if (!n) return; n.classList.toggle("off", !navigator.onLine); n.querySelector("span").textContent = navigator.onLine ? "متصل" : "بدون إنترنت"; }
function onHash() { const h = location.hash.match(/^#\/admin\/(\w+)/); if (h && TITLES[h[1]] && h[1] !== st.page) go(h[1], true); }
const save = () => ls.set("st", { open: st.open, p: st.p, cmp: st.cmp, dtab: st.dtab, grp: st.grp, pgrp: st.pgrp, igrp: st.igrp, chart: st.chart, hrs: st.hrs, flt: { ...st.flt }, page: st.page, dkind: st.dkind, ra: st.ra, rb: st.rb, cmpS: st.cmpS, cmpB: st.cmpB });

function go(page, noPush) {
  closePop(); closeDrawer(); st.page = page; st.pg = 0; save();
  const hh = `#/admin/${page}`; if (location.hash !== hh) noPush ? history.replaceState(null, "", hh) : history.pushState(null, "", hh);
  root.querySelector("#cx").classList.remove("nav");
  for (const n of NAV) if (n.items?.some(([k]) => k === page)) st.open[n.g] = true;
  drawNav();
  $("#cxcrumb").innerHTML = PARENT[page] ? `<span>${PARENT[page]}</span><span>›</span><b>${TITLES[page]}</b>` : `<b>${TITLES[page]}</b>`;
  charts.clear(); $("#cxp").scrollTop = 0;
  (PAGES[page] || PAGES.dash)();
}
function drawNav() {
  $("#cxnav").innerHTML = NAV.map(n => n.g
    ? `<div class="cx-grp ${st.open[n.g] ? "open" : ""}"><button class="cx-ni ${n.items.some(([k]) => k === st.page) ? "" : ""}" data-grp="${n.g}">${ic(n.ic)}<span>${n.t}</span>${ic("chev", "i chev")}</button>
       <div class="cx-sub">${n.items.map(([k, t]) => `<button class="cx-si ${st.page === k ? "on" : ""}" data-go="${k}">${t}</button>`).join("")}</div></div>`
    : `<button class="cx-ni ${st.page === n.id ? "on" : ""}" data-go="${n.id}">${ic(n.ic)}<span>${n.t}</span></button>`).join("");
}
function onClick(e) {
  const b = e.target.closest("[data-go],[data-grp],[data-act]"); if (!b || !root.contains(b)) return;
  if (b.dataset.go) return go(b.dataset.go);
  if (b.dataset.grp) { const g = b.dataset.grp, on = st.open[g] = !st.open[g]; save(); drawNav();
    /* an opened group at the bottom of the menu: bring its pages into view */
    if (on) requestAnimationFrame(() => { const el = document.querySelector(`[data-grp="${g}"]`)?.closest(".cx-grp"); el?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }); return; }
  const a = b.dataset.act;
  if (a === "nav") return root.querySelector("#cx").classList.toggle("nav");
  if (a === "pos") return exitToPos();
  if (a === "reload") { cache.clear(); b.classList.add("spin"); setTimeout(() => b.classList.remove("spin"), 700); return go(st.page, true); }
  if (a === "user") return userMenu(b);
}
function exitToPos() { unmount(); A.render(A.S.cashier ? (A.S.shift ? "pos" : "openshift") : "pin"); }
function userMenu(anchor) {
  pop(anchor, `<div class="cx-menu"><div class="hd"><b>${esc(userName())}</b><small class="num">${esc(A.S.user?.email || "")}</small></div>
    <button data-m="acct">${ic("gear")}حسابي وكلمة المرور</button><button data-m="pos">${ic("store")}شاشة البيع</button><button data-m="upd">${ic("refresh")}تحديث التطبيق <small class="num" style="margin-inline-start:auto;color:#A1A1AA">${A.VERSION}</small></button><button data-m="lang" data-noi18n>${ic("globe")}${window.aqLang && window.aqLang() === "en" ? "العربية" : "English"}</button><hr>
    <button data-m="out" style="color:#C2261F">${ic("logout")}تسجيل الخروج</button></div>`, { align: "end" }, el => {
    el.querySelector("[data-m=lang]").onclick = () => { closePop(); window.aqSetLang && window.aqSetLang(window.aqLang() === "en" ? "ar" : "en"); };
    el.querySelector("[data-m=acct]").onclick = () => { closePop(); go("account"); };
    el.querySelector("[data-m=pos]").onclick = () => { closePop(); exitToPos(); };
    el.querySelector("[data-m=upd]").onclick = async () => { closePop(); try { await (await navigator.serviceWorker?.getRegistration())?.update(); } catch {} location.reload(); };
    el.querySelector("[data-m=out]").onclick = () => { closePop(); if (A.S.shift) return A.toast("قفّل الوردية المفتوحة في هذا الجهاز أولاً", true); if (confirm("تسجيل الخروج من حساب المدير في هذا الجهاز؟")) { unmount(); A.signOut(); } };
  });
}

/* ---------- نوافذ منبثقة ---------- */
let popEl = null;
function closePop() { popEl?.remove(); popEl = null; document.removeEventListener("pointerdown", popOut, true); }
function popOut(e) { if (popEl && !popEl.contains(e.target) && !e.target.closest("[data-popper]")) closePop(); }
function pop(anchor, html, o = {}, bind) {
  const same = popEl && popEl._a === anchor; closePop(); if (same) return;
  anchor.setAttribute("data-popper", ""); popEl = document.createElement("div"); popEl.className = "cx-pop"; popEl._a = anchor; popEl.innerHTML = html; document.body.append(popEl);
  const r = anchor.getBoundingClientRect(), w = popEl.offsetWidth, h = popEl.offsetHeight;
  let left = o.align === "end" ? r.left : r.right - w; left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = r.bottom + 6; if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
  popEl.style.left = left + "px"; popEl.style.top = Math.max(8, top) + "px";
  bind?.(popEl); setTimeout(() => document.addEventListener("pointerdown", popOut, true), 0);
}

/* ---------- منتقي التاريخ ---------- */
function picker(anchor, o) {
  const t = A.bizDay(); let y = +(o.a || t).slice(0, 4), m = +(o.a || t).slice(5, 7) - 1, half = null;
  const presets = [["اليوم", t, t], ["الأمس", A.addDays(t, -1), A.addDays(t, -1)], ["هذا الأسبوع", ...A.dshRange("week", t)], ["الأسبوع السابق", ...A.dshRange("week", A.addDays(t, -7))], ["هذا الشهر", ...A.dshRange("month", t)], ["الشهر السابق", ...A.dshRange("month", A.addDays(t.slice(0, 8) + "01", -1))]];
  const done = (a, b) => { closePop(); o.onPick(a, b); };
  const sw = () => o.switchable ? `<div class="pk2-sw"><button data-sm="day" class="${o.mode === "day" ? "on" : ""}">يوم واحد</button><button data-sm="range" class="${o.mode === "range" ? "on" : ""}">فترة من – إلى</button></div>` : "";
  const html = () => sw() + html0();
  const html0 = () => {
    const head = title => `<div class="pk2-h"><button data-n="-1" aria-label="السابق"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6z"/></svg></button><b>${title}</b><button data-n="1" aria-label="التالي"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15.4 7.4 10.8 12l4.6 4.6L14 18l-6-6 6-6z"/></svg></button></div>`;
    if (o.mode === "month") return head(y) + `<div class="pk2-m">${AR_M.map((n, i) => { const k = `${y}-${pad(i + 1)}`; return `<button data-mo="${k}" class="${o.a.slice(0, 7) === k ? "on" : ""}">${n}</button>`; }).join("")}</div>`;
    if (o.mode === "week") {
      const first = `${y}-${pad(m + 1)}-01`, last = A.ymd(new Date(y, m + 1, 0)); let w = A.dshRange("week", first)[0]; const L = [];
      while (w <= last) { L.push([w, A.addDays(w, 6)]); w = A.addDays(w, 7); }
      return head(`${AR_M[m]} ${y}`) + `<div class="pk2-w">${L.map(([s, e]) => `<button data-wk="${s}|${e}" class="${o.a === s ? "on" : ""}">${dLab(s)} - ${dLab(e)}</button>`).join("")}</div>`;
    }
    /* الأسبوع يبدأ السبت مثل تقارير المطعم */
    const f = new Date(y, m, 1), start = A.addDays(A.ymd(f), -((f.getDay() + 1) % 7)), cells = [...Array(42).keys()].map(i => A.addDays(start, i));
    const lo = half || o.a, hi = half ? null : o.b;
    const cal = head(`${AR_M[m]} ${y}`) + `<div class="pk2-d">${(window.aqLang && window.aqLang() === "en" ? ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"] : ["س", "ح", "ن", "ث", "ر", "خ", "ج"]).map(d => `<i>${d}</i>`).join("")}${cells.map(d => {
      const cls = [+d.slice(5, 7) !== m + 1 ? "out" : "", lo && hi && d > lo && d < hi ? "in" : "", d === lo || d === hi ? "end" : "", d === t ? "today" : ""].join(" ");
      return `<button data-dy="${d}" class="${cls}" ${d > t ? "disabled" : ""}>${+d.slice(8)}</button>`; }).join("")}</div>`;
    if (o.mode === "day") return cal;
    return `<div class="pk2-r"><div>${cal}<p class="pk2-hint">${half ? "اختر يوم النهاية" : "اختر يوم البداية ثم يوم النهاية"}</p></div><div class="pk2-p">${presets.map(([l, a, b]) => `<button data-pr="${a}|${b}" class="${o.a === a && o.b === b ? "on" : ""}">${l}</button>`).join("")}</div></div>`;
  };
  const bind = el => {
    el.querySelectorAll("[data-sm]").forEach(x => x.onclick = () => { o.mode = x.dataset.sm; half = null; redraw(); });
    el.querySelectorAll("[data-n]").forEach(x => x.onclick = () => { const s = +x.dataset.n; if (o.mode === "month") y += s; else { m += s; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } } redraw(); });
    el.querySelectorAll("[data-mo]").forEach(x => x.onclick = () => done(...A.dshRange("month", x.dataset.mo + "-01")));
    el.querySelectorAll("[data-wk]").forEach(x => x.onclick = () => done(...x.dataset.wk.split("|")));
    el.querySelectorAll("[data-pr]").forEach(x => x.onclick = () => done(...x.dataset.pr.split("|")));
    el.querySelectorAll("[data-dy]").forEach(x => x.onclick = () => { const d = x.dataset.dy; if (o.mode === "day") return done(d, d); if (!half) { half = d; redraw(); } else done(...(d < half ? [d, half] : [half, d])); });
  };
  const redraw = () => { popEl.firstElementChild.innerHTML = html(); bind(popEl); };
  pop(anchor, `<div class="pk2">${html()}</div>`, {}, bind);
}

/* ---------- البيانات ---------- */
const cache = new Map();
async function load(a, b, coll = "orders") {
  const k = `${coll}|${a}|${b}`, c = cache.get(k); if (c && Date.now() - c.t < 45e3) return c.L;
  let L;
  if (coll === "orders") {
    /* اليوم التشغيلي = يوم الوردية (كما في برنامج المحاسبة): طلب بعد بداية اليوم الجديد في وردية فُتحت قبلها يتبع يوم فتح الوردية */
    const q = (cl, x, y) => A.F.getDocs(A.F.query(A.C(cl), A.F.where("day", ">=", x), A.F.where("day", "<=", y)));
    const [so, ss] = await Promise.all([q("orders", a, A.addDays(b, 1)), q("shifts", A.addDays(a, -1), A.addDays(b, 1))]);
    const sday = new Map(ss.docs.map(d => [d.id, d.data().day]));
    L = so.docs.map(d => d.data()).map(o => { const sd = o.shiftId && sday.get(o.shiftId); return sd && sd !== o.day ? { ...o, day: sd, dayOrig: o.day } : o; }).filter(o => o.day >= a && o.day <= b);
  } else L = (await A.F.getDocs(A.F.query(A.C(coll), A.F.where("day", ">=", a), A.F.where("day", "<=", b)))).docs.map(d => d.data());
  cache.set(k, { t: Date.now(), L }); return L;
}
const applyF = L => L.filter(o => (st.flt.test || !o.test) && (!st.flt.type || o.type === st.flt.type) && (!st.flt.method || A.hasM(o, st.flt.method)) && (!st.flt.cashier || o.cashierName === st.flt.cashier));
const isOk = o => o.status === "paid" || !o.status, isVoid = o => o.status === "void", isUnpaid = o => o.status === "open";
const cogsOf = o => o.cogs || A.orderCogs(o);
const costOf = o => { const c = cogsOf(o); return c.food + c.pack; };
const qtyOf = o => o.lines.reduce((s, l) => s + l.qty, 0);
const prepMin = o => o.deliveredAt ? (o.deliveredAt - o.ts) / 60000 : null;
function agg(L) {
  const ok = L.filter(isOk), vd = L.filter(o => isVoid(o)), sum = (a, f) => a.reduce((s, o) => s + f(o), 0);
  const net = sum(ok, o => o.total), gross = sum(ok, o => o.subtotal ?? o.total), disc = sum(ok, o => o.discount?.amount || 0), cost = sum(ok, costOf), food = sum(ok, o => cogsOf(o).food);
  const pm = ok.map(prepMin).filter(x => x != null);
  return { n: ok.length, net, gross, disc, discN: ok.filter(o => o.discount).length, vN: vd.length, vT: sum(vd, o => o.total), cost, food, pack: cost - food, gp: net - cost, qty: sum(ok, qtyOf),
    avg: ok.length ? net / ok.length : 0, cpct: net ? cost / net * 100 : NaN, prep: pm.length ? pm.reduce((a, b) => a + b, 0) / pm.length : null, prepN: pm.length };
}
const loadingCards = (n = 6, h = 300) => `<div class="cx-grid">${Array(n).fill(`<div class="cx-card" style="height:${h}px"><div class="sk" style="height:18px;width:40%"></div><div class="sk" style="height:34px;width:55%;margin-top:14px"></div><div class="sk" style="flex:1;margin-top:22px"></div></div>`).join("")}</div>`;
const loadingTable = () => `<div class="cx-tcard"><div style="padding:18px;display:grid;gap:14px">${Array(7).fill(`<div class="sk" style="height:22px"></div>`).join("")}</div></div>`;
const errBox = e => `<div class="cx-err"><b>تعذّر تحميل البيانات</b><p style="color:#71717A;margin:6px 0 14px">${esc(e?.code || e?.message || "")}</p><button class="cx-btn" data-act="reload">${ic("refresh")}إعادة المحاولة</button></div>`;
const emptyBox = (t = "لا توجد بيانات في هذه الفترة") => `<div class="cx-empty"><div>${ic("inbox")}<div>${t}</div></div></div>`;

/* ---------- الرسوم البيانية ---------- */
const charts = new Map(); let cid = 0;
function chart(spec, h = 170) { const id = "cxc" + (++cid); charts.set(id, spec); return `<div class="cx-chart" id="${id}" style="height:${h}px"></div>`; }
function drawCharts() { for (const [id, s] of charts) { const el = root?.querySelector("#" + id); if (!el) { charts.delete(id); continue; } (s.kind === "bar" ? drawBar : drawLine)(el, s); } }
const fmtV = (v, f) => f === "int" ? ni(v) : f === "pct" ? pct(v) : f === "min" ? `${nf(v, 1)} د` : nf(v);
function tipAt(el, x, y, html, anchorY) { let t = el.querySelector(".cx-tip"); if (!t) { t = document.createElement("div"); t.className = "cx-tip"; el.append(t); } t.innerHTML = html; t.hidden = false;
  const W = el.clientWidth, tw = t.offsetWidth, th = t.offsetHeight, ay = anchorY ?? y - 14;
  let top = ay - th - 10; if (top < 0) top = ay + 12;
  t.style.left = Math.max(2, Math.min(W - tw - 2, x - tw / 2)) + "px"; t.style.top = top + "px"; }
function drawLine(el, s) {
  const W = el.clientWidth, H = el.clientHeight - 14, pl = 10, pr = 10, pt = 8, pb = 26, n = s.labels.length; if (!W || n < 1) return;
  const all = s.series.flatMap(x => x.values.filter(v => v != null)), mx = Math.max(1e-9, ...all, 0) * 1.08;
  const X = i => n === 1 ? W / 2 : pl + i * (W - pl - pr) / (n - 1), Y = v => pt + (H - pt - pb) * (1 - (v || 0) / mx);
  const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(W / 64))));
  const runs = vals => { const out = []; let cur = []; vals.forEach((v, i) => { if (v == null) { if (cur.length) out.push(cur); cur = []; } else cur.push(i); }); if (cur.length) out.push(cur); return out; };
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="#E4E4E8"/>`;
  s.series.slice().reverse().forEach(sr => {
    runs(sr.values).forEach(run => {
      const pts = run.map(i => `${X(i).toFixed(1)},${Y(sr.values[i]).toFixed(1)}`).join(" ");
      if (!sr.dash && s.series.length === 1 && run.length > 1) svg += `<polygon points="${X(run[0])},${Y(0)} ${pts} ${X(run[run.length - 1])},${Y(0)}" fill="${sr.color}" opacity=".07"/>`;
      svg += `<polyline points="${pts}" fill="none" stroke="${sr.color}" stroke-width="${sr.dash ? 1.6 : 2.2}" ${sr.dash ? `stroke-dasharray="5 5" opacity=".7"` : ""} stroke-linejoin="round" stroke-linecap="round"/>`;
      if (!sr.dash && (n <= 40 || run.length === 1)) svg += run.map(i => `<circle cx="${X(i).toFixed(1)}" cy="${Y(sr.values[i]).toFixed(1)}" r="3" fill="${sr.color}"/>`).join("");
    });
  });
  for (let i = 0; i < n; i += step) svg += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${esc(s.labels[i])}</text>`;
  svg += `<line class="hl" x1="0" x2="0" y1="${pt}" y2="${Y(0)}" stroke="#A1A1AA" stroke-dasharray="3 3" visibility="hidden"/><rect width="${W}" height="${H}" fill="transparent"/></svg>`;
  el.innerHTML = svg; const sv = el.querySelector("svg"), hl = sv.querySelector(".hl");
  sv.onpointermove = e => { const r = sv.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.round(n === 1 ? 0 : (e.clientX - r.left - pl) / ((W - pl - pr) / (n - 1)))));
    const rows = s.series.filter(sr => sr.values[i] != null); if (!rows.length) { sv.onpointerleave(); return; }
    hl.setAttribute("x1", X(i)); hl.setAttribute("x2", X(i)); hl.setAttribute("visibility", "visible");
    const top = Math.min(...rows.map(sr => Y(sr.values[i])));
    tipAt(el, X(i), top + 14, `<b>${esc(s.tips?.[i] || s.labels[i])}</b>${rows.map(sr => `<div><i style="background:${sr.color}"></i>${esc(sr.name || "")} ${fmtV(sr.values[i], s.f)}</div>`).join("")}`, top); };
  sv.onpointerleave = () => { hl.setAttribute("visibility", "hidden"); const t = el.querySelector(".cx-tip"); if (t) t.hidden = true; };
}
function drawBar(el, s) {
  const W = el.clientWidth, H = el.clientHeight - 14, pl = 46, pr = 6, pt = 18, pb = 26, n = s.labels.length; if (!W || !n) return;
  const vals = s.series[0].values, mxr = Math.max(1, ...vals), mag = Math.pow(10, Math.floor(Math.log10(mxr))), mx = Math.ceil(mxr / mag * 1.1) * mag;
  const bw = (W - pl - pr) / n, X = i => pl + i * bw, Y = v => pt + (H - pt - pb) * (1 - v / mx);
  let svg = `<svg width="${W}" height="${H}">`;
  for (let k = 0; k <= 4; k++) { const v = mx * k / 4; svg += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#F1F1F4"/><text x="${pl - 8}" y="${Y(v) + 4}" text-anchor="end">${v >= 1000 ? nf(v / 1000, v % 1000 ? 1 : 0) + "k" : ni(v)}</text>`; }
  const showVal = bw > 26, step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - pl) / 44))));
  vals.forEach((v, i) => { const w = Math.min(64, bw * .68), x = X(i) + (bw - w) / 2, y = Y(v);
    if (v > 0) svg += `<rect data-i="${i}" x="${x}" y="${y}" width="${w}" height="${Y(0) - y}" rx="${Math.min(4, w / 3)}" fill="${s.series[0].color}"/>`;
    if (v > 0 && showVal) svg += `<text x="${x + w / 2}" y="${y - 5}" text-anchor="middle" style="fill:#3F3F46;font-size:10.5px">${v >= 1000 ? nf(v / 1000, 1) + "k" : ni(v)}</text>`;
    if (i % step === 0) svg += `<text x="${X(i) + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(s.labels[i])}</text>`; });
  svg += `<rect x="${pl}" width="${W - pl}" height="${H}" fill="transparent"/></svg>`;
  el.innerHTML = svg; const sv = el.querySelector("svg");
  sv.onpointermove = e => { const r = sv.getBoundingClientRect(), i = Math.floor((e.clientX - r.left - pl) / bw); if (i < 0 || i >= n) return;
    tipAt(el, X(i) + bw / 2, Y(vals[i]) + 14, `<b>${esc(s.tips?.[i] || s.labels[i])}</b><div>${fmtV(vals[i], s.f)}${s.f ? "" : " ر.س"}</div>${s.sub ? `<div style="color:#A1A1AA">${esc(s.sub[i])}</div>` : ""}`, Y(vals[i])); };
  sv.onpointerleave = () => { const t = el.querySelector(".cx-tip"); if (t) t.hidden = true; };
}
function donut(entries, names = {}, f) {
  const e = entries.filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]), t = e.reduce((s, x) => s + x[1], 0);
  if (!t) return emptyBox();
  const top = e.slice(0, 6); if (e.length > 6) top.push(["أخرى", e.slice(6).reduce((s, x) => s + x[1], 0)]);
  const R = 80, r = 50, c = 84; let a0 = -Math.PI / 2;
  const pt = (a, rr) => `${(c + rr * Math.cos(a)).toFixed(2)} ${(c + rr * Math.sin(a)).toFixed(2)}`;
  const segs = top.map(([k, v], i) => { const sw = v / t * Math.PI * 2, a1 = a0, a2 = a0 + sw - (top.length > 1 ? .02 : 0); a0 += sw; const big = a2 - a1 > Math.PI ? 1 : 0;
    const d = top.length === 1 ? `M${pt(0, R)}A${R} ${R} 0 1 1 ${pt(Math.PI - .0001, R)}A${R} ${R} 0 1 1 ${pt(-.0001, R)}L${pt(-.0001, r)}A${r} ${r} 0 1 0 ${pt(Math.PI, r)}A${r} ${r} 0 1 0 ${pt(0, r)}Z`
      : `M${pt(a1, R)}A${R} ${R} 0 ${big} 1 ${pt(a2, R)}L${pt(a2, r)}A${r} ${r} 0 ${big} 0 ${pt(a1, r)}Z`;
    return `<path d="${d}" fill="${COLORS[i % COLORS.length]}"><title>${esc(names[k] || k)}: ${fmtV(v, f)}</title></path>`; }).join("");
  return `<div class="cx-donut"><svg viewBox="0 0 168 168">${segs}<text x="84" y="80" text-anchor="middle" style="font-size:11px;fill:#71717A">الإجمالي</text><text x="84" y="98" text-anchor="middle" style="font-size:15px;font-weight:600;fill:#18181B">${f === "int" ? ni(t) : nf(t, t >= 10000 ? 0 : 2)}</text></svg>
    <ul>${top.map(([k, v], i) => `<li><i style="background:${COLORS[i % COLORS.length]}"></i><span title="${esc(names[k] || k)}">${esc(names[k] || k)}</span><b class="num">${fmtV(v, f)}</b><small class="num">${nf(v / t * 100, 0)}%</small></li>`).join("")}</ul></div>`;
}

/* ---------- أدوات مشتركة ---------- */
let CMPLAB = "السابق", CMPK = 1, LEG = null;   /* CMPK: the comparison scaled to the same number of days; LEG: the two lines of every chart */
function deltaHtml(cur, prev, inverse) {
  if (!st.cmp || prev == null || !isFinite(prev) || !isFinite(cur)) return `<div class="cx-dl"></div>`;
  if (!prev && !cur) return `<div class="cx-dl"><b class="eq">0%</b><span>${st.cmpR ? "مقارنة بفترة المقارنة" : "مقارنة بالفترة السابقة"}</span></div>`;
  if (!prev) return `<div class="cx-dl"><b class="up">جديد</b><span>السابق 0</span></div>`;
  const d = (cur - prev) / Math.abs(prev) * 100, good = inverse ? d <= 0 : d >= 0;
  return `<div class="cx-dl"><b class="${Math.abs(d) < .05 ? "eq" : good ? "up" : "dn"} num">${d >= 0 ? "▲" : "▼"} ${nf(Math.abs(d), 1)}%</b><span>${CMPLAB} <span class="num">${typeof prev === "number" && !Number.isInteger(prev) ? nf(prev) : ni(prev)}</span></span></div>`;
}
const fltCount = () => ["type", "method", "cashier"].filter(k => st.flt[k]).length + (st.flt.test ? 1 : 0);
function fltBtn() { const n = fltCount(); return `<button class="cx-btn ${n ? "on" : ""}" id="cxflt">${ic("filter")}تصفية${n ? `<span class="bdg">${n}</span>` : ""}</button>`; }
function fltChips(redraw) {
  const c = [], F2 = st.flt; if (F2.type) c.push(["type", `النوع: ${A.TYPES.find(t => t[0] === F2.type)?.[1]}`]); if (F2.method) c.push(["method", `الدفع: ${A.METHODS[F2.method]}`]);
  if (F2.cashier) c.push(["cashier", `الكاشير: ${F2.cashier}`]); if (F2.test) c.push(["test", "يشمل التجريبي"]);
  return c.length ? `<div class="cx-chips">${c.map(([k, l]) => `<span class="cx-chip">${esc(l)}<button data-rmf="${k}" aria-label="إزالة">✕</button></span>`).join("")}</div>` : "";
}
function bindFlt(redraw, cashiers = []) {
  $$("[data-rmf]").forEach(b => b.onclick = () => { const k = b.dataset.rmf; st.flt[k] = k === "test" ? false : ""; save(); redraw(); });
  const fb = $("#cxflt"); if (!fb) return;
  fb.onclick = () => { const known = [...new Set([...cashiers, ...(A.S.config?.cashiers || []).map(c => c.name), st.flt.cashier].filter(Boolean))];
    pop(fb, `<div class="cx-flt"><label>نوع الطلب<select class="cx-sel" id="ft"><option value="">الكل</option>${A.TYPES.map(([k, l]) => `<option value="${k}" ${st.flt.type === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>طريقة الدفع<select class="cx-sel" id="fm"><option value="">الكل</option>${Object.entries(A.METHODS).map(([k, l]) => `<option value="${k}" ${st.flt.method === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>الكاشير<select class="cx-sel" id="fc"><option value="">الكل</option>${known.map(n => `<option ${st.flt.cashier === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <button class="cx-sw ${st.flt.test ? "on" : ""}" id="fx" type="button"><i></i>إظهار الطلبات التجريبية</button>
      <div class="cx-frow"><button class="cx-btn" id="fclr">مسح</button><button class="cx-btn pri" id="fok">تطبيق</button></div></div>`, {}, el => {
      el.querySelector("#fx").onclick = e => e.currentTarget.classList.toggle("on");
      el.querySelector("#fclr").onclick = () => { st.flt = { type: "", method: "", cashier: "", test: false }; save(); closePop(); redraw(); };
      el.querySelector("#fok").onclick = () => { st.flt = { type: el.querySelector("#ft").value, method: el.querySelector("#fm").value, cashier: el.querySelector("#fc").value, test: el.querySelector("#fx").classList.contains("on") }; save(); closePop(); redraw(); };
    }); };
}
function rangeBtn(redraw) { return [`<button class="cx-btn" id="cxrange">${ic("cal")}<span>${rLab(st.a, st.b)}</span></button>`, () => { $("#cxrange").onclick = e => picker(e.currentTarget, { mode: "range", a: st.a, b: st.b, onPick: (a, b) => { st.a = a; st.b = b; st.pg = 0; redraw(); } }); }]; }

/* جداول قابلة للترتيب */
const tbls = {};
function table(host, key, cols, rows, o = {}) {
  const S2 = tbls[key] ||= { k: o.sort || null, d: o.dir || -1 }; const el = typeof host === "string" ? $(host) : host;
  const render = () => {
    let R = rows.slice(); if (S2.k) { const c = cols.find(x => x.k === S2.k); const v = r => c?.sv ? c.sv(r) : r[S2.k]; R.sort((a, b) => { const x = v(a), y = v(b); return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "ar")) * S2.d; }); }
    const ps = o.pageSize, pages = ps ? Math.max(1, Math.ceil(R.length / ps)) : 1; if (ps) { st.pg = Math.min(st.pg, pages - 1); } const P2 = ps ? R.slice(st.pg * ps, st.pg * ps + ps) : R;
    el.innerHTML = `<div class="cx-tw"><table class="cx-t"><thead><tr>${cols.map(c => `<th class="${c.num ? "n" : ""} ${c.nos ? "" : "s"}" data-k="${c.k}">${c.t}${S2.k === c.k ? `<span class="ar">${S2.d < 0 ? "▼" : "▲"}</span>` : ""}</th>`).join("")}</tr></thead>
      <tbody>${P2.length ? P2.map((r, i) => `<tr class="${o.onRow ? "ck" : ""}" data-i="${rows.indexOf(r)}">${cols.map(c => `<td class="${c.num ? "n" : ""} ${c.cls || ""}">${c.f ? c.f(r) : esc(r[c.k])}</td>`).join("")}</tr>`).join("")
        : `<tr><td colspan="${cols.length}">${emptyBox(o.empty)}</td></tr>`}</tbody>
      ${o.foot && rows.length ? `<tfoot><tr>${cols.map(c => `<td class="${c.num ? "n" : ""}">${o.foot[c.k] ?? ""}</td>`).join("")}</tr></tfoot>` : ""}</table></div>
      ${ps && R.length > ps ? `<div class="cx-pg"><button data-pp="-1" ${st.pg ? "" : "disabled"}>السابق</button><span class="num">${ni(st.pg * ps + 1)}–${ni(Math.min(R.length, st.pg * ps + ps))} من ${ni(R.length)}</span><button data-pp="1" ${st.pg < pages - 1 ? "" : "disabled"}>التالي</button></div>` : ""}`;
    el.querySelectorAll("th.s").forEach(th => th.onclick = () => { const k = th.dataset.k; if (S2.k === k) S2.d = -S2.d; else { S2.k = k; S2.d = -1; } st.pg = 0; render(); });
    el.querySelectorAll("[data-pp]").forEach(b => b.onclick = () => { st.pg += +b.dataset.pp; render(); el.scrollIntoView({ block: "nearest" }); });
    if (o.onRow) el.querySelectorAll("tbody tr[data-i]").forEach(tr => tr.onclick = () => o.onRow(rows[+tr.dataset.i]));
  };
  render(); EXP.push({ title: o.title || TITLES[st.page], cols, rows, foot: o.foot });
}

/* التصدير */
let EXP = [], EXTRA = {};
const expT = (title, cols, rows, foot) => EXP.push({ title, cols: cols.map(([k, t]) => ({ k, t })), rows, foot });
function expBtn(extra = []) { EXTRA = Object.fromEntries(extra.map(([id, , fn]) => [id, fn])); return `<button class="cx-btn" id="cxexp" data-x='${JSON.stringify(extra.map(([id, l]) => [id, l]))}'>${ic("cloud")}تصدير<svg class="i" viewBox="0 0 24 24" style="width:18px"><path d="${P.chev}"/></svg></button>`; }
function bindExp() {
  const b = $("#cxexp"); if (!b) return; const extra = JSON.parse(b.dataset.x || "[]");
  b.onclick = () => pop(b, `<div class="cx-menu"><button data-x="csv">في ملف CSV</button><button data-x="xlsx">في ملف إكسل</button>${extra.length ? "<hr>" + extra.map(([id, l]) => `<button data-x="${id}">${l}</button>`).join("") : ""}</div>`, {}, el => {
    el.querySelectorAll("[data-x]").forEach(x => x.onclick = () => { closePop(); const k = x.dataset.x; k === "csv" || k === "xlsx" ? exportNow(k) : EXTRA[k]?.(); }); });
}
const plain = h => { const d = document.createElement("div"); d.innerHTML = String(h ?? ""); return d.textContent.replace(/[\u2066-\u2069\u200e\u200f]/g, "").trim(); };
function expRows() {
  const per = st.page === "dash" ? rLab(...dashRange()) : st.page === "customers" && st.cAll !== false ? "كل الفترات" : ["menu", "stock"].includes(st.page) ? `حتى ${A.ymd(new Date())}` : rLab(st.a, st.b);
  const out = [[TITLES[st.page]], [`الفترة: ${per}`], []];
  $$(".cx-st").forEach(x => out.push([x.querySelector("span")?.textContent, plain(x.querySelector("b")?.innerHTML).replace(/[^\d.,\-%]/g, "").replace(/,/g, ""), plain(x.querySelector("small")?.innerHTML || "")]));
  if ($$(".cx-st").length) out.push([]);
  for (const t of EXP) {
    if (EXP.length > 1) out.push([t.title]);
    out.push(t.cols.map(c => plain(c.t)));
    t.rows.forEach(r => out.push(t.cols.map(c => { if (/^ts$|At$/.test(c.k) && c.f) return plain(c.f(r));
      const v = c.x ? c.x(r) : r[c.k] !== undefined ? r[c.k] : c.sv ? c.sv(r) : undefined; return typeof v === "number" ? r2(v) : plain(c.x ? v : c.f ? c.f(r) : v); })));
    if (t.foot) out.push(t.cols.map(c => plain(t.foot[c.k] ?? "").replace(/,/g, "").replace(/ر\.س/, "").trim()));
    out.push([]);
  }
  return out;
}
let xlsxP = null;
const loadXlsx = () => xlsxP ||= new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; s.onload = () => res(window.XLSX); s.onerror = () => { xlsxP = null; rej(); }; document.head.append(s); });
async function exportNow(kind) {
  if (LEGX) { EXP = []; LEGX(); }
  const rows = expRows(), [ea, eb] = st.page === "dash" ? dashRange() : [st.a, st.b];
  const name = st.page === "customers" && st.cAll !== false ? `العملاء-${A.ymd(new Date())}` : ["menu", "stock"].includes(st.page) ? `${TITLES[st.page]}-${A.ymd(new Date())}` : `${TITLES[st.page]}-${ea}${eb !== ea ? "_" + eb : ""}`;
  if (kind === "csv") return A.download(rows, name + ".csv");
  try { const X = await loadXlsx(), ws = X.utils.aoa_to_sheet(rows); ws["!cols"] = rows[3]?.map(() => ({ wch: 18 })) || []; const wb = X.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; X.utils.book_append_sheet(wb, ws, "التقرير"); X.writeFile(wb, name + ".xlsx"); }
  catch { A.toast("تصدير إكسل يحتاج اتصالاً بالإنترنت. استخدم CSV", true); }
}

/* الدرج الجانبي */
function closeDrawer() { document.querySelector(".cx-dr")?.remove(); document.querySelector(".cx-scrim2")?.remove(); }
function drawer(head, body, foot, bind) {
  closeDrawer(); const s = document.createElement("div"); s.className = "cx-scrim2"; s.onclick = closeDrawer;
  const d = document.createElement("aside"); d.className = "cx-dr"; d.setAttribute("role", "dialog");
  d.innerHTML = `<div class="cx-drh">${head}<span class="cx-sp"></span><button class="cx-ib" data-x aria-label="إغلاق">${ic("close")}</button></div><div class="cx-drb">${body}</div>${foot ? `<div class="cx-drf">${foot}</div>` : ""}`;
  document.body.append(s, d); d.querySelector("[data-x]").onclick = closeDrawer; bind?.(d);
}
const typeTag = t => `<span class="cx-tag ${t === "lokit" ? "lk" : t === "hunger" ? "hg" : t === "delivery" ? "blue" : t === "dine" ? "warn" : ""}">${A.TYPES.find(x => x[0] === t)?.[1] || t}</span>`;
const mName = o => A.mLabel(o);
const statusTag = o => o.status === "void" ? `<span class="cx-tag bad">${o.void?.kind === "noshow" ? "ملغي — لم يحضر" : o.void?.unpaid ? "ملغي قبل الدفع" : "ملغي"}</span>` : isUnpaid(o) ? `<span class="cx-tag warn">بانتظار الدفع</span>` : o.prep === "open" ? `<span class="cx-tag blue">قيد التحضير</span>` : `<span class="cx-tag ok">مكتمل</span>`;
function orderDrawer(o) {
  const c = cogsOf(o), pk = o.pack || A.packOf(o.lines), pm = prepMin(o), ev = o.via === "phone" ? [[o.ts, "طلب اتصال أُرسل للمطبخ", `${esc(o.cashierName)} · جوال <span class="num">${esc(o.phone)}</span>${o.name ? ` (${esc(o.name)})` : ""}`]] : [[o.ts, "أُنشئ الطلب ودُفع", `${mName(o)} · ${esc(o.cashierName)}`]];
  if (o.paidAt) ev.push([o.paidAt, "حضر العميل ودفع", `${mName(o)} · ${esc(o.paidBy || "")}`]);
  (o.typeChanges || []).forEach(x => ev.push([x.at, `تغيير النوع إلى ${A.TYPES.find(t => t[0] === x.to)?.[1]}`, esc(x.by)]));
  if (o.deliveredAt) ev.push([o.deliveredAt, "سُلّم للعميل", `${pm != null ? `بعد ${nf(pm, 0)} دقيقة` : ""}${o.deliveredBy ? " · " + esc(o.deliveredBy) : ""}`]);
  if (o.void) ev.push([o.void.at, o.void.unpaid ? `أُلغي قبل الدفع${o.void.cashierName ? " · " + esc(o.void.cashierName) : ""}` : "أُلغي الطلب بموافقة المدير", `السبب: ${esc(o.void.reason)}`]);
  ev.sort((a, b) => a[0] - b[0]);
  drawer(`<h2>طلب <span class="num">${(o.no ?? "")}</span></h2>${statusTag(o)}${o.test ? `<span class="cx-tag test">تجريبي</span>` : ""}`,
    `<div class="cx-sec"><div class="cx-kv"><div><span>تاريخ العمل</span><b>${dFull(o.day)}</b></div><div><span>وقت الطلب</span><b class="tm">${tm(o.ts)}</b></div>
      <div><span>النوع</span><b>${A.TYPES.find(t => t[0] === o.type)?.[1]}</b></div><div><span>طريقة الدفع</span><b>${mName(o)}</b></div>
      <div><span>الكاشير</span><b>${esc(o.cashierName)}</b></div><div><span>رمز التحقق</span><b class="num">${esc(o.code || "—")}</b></div>${o.phone ? `<div><span>جوال العميل</span><b class="num">${esc(o.phone)}${o.name ? ` · ${esc(o.name)}` : ""}</b></div>` : ""}</div></div>
    <div class="cx-sec"><h4>الأصناف</h4><div class="cx-it">${o.lines.map(l => `<div class="r"><span class="q num">${l.qty}</span><div><b>${esc(l.name)}</b>${l.mods.map(m => `<div class="m">+ ${esc(m.name)} (${nf(m.price)})</div>`).join("")}
      ${[...(l.notes || []), ...(l.note ? [l.note] : [])].length ? `<div class="nt">● ${esc([...(l.notes || []), ...(l.note ? [l.note] : [])].join(" · "))}</div>` : ""}</div><b class="num">${nf(l.total ?? l.qty * l.price)}</b></div>`).join("")}</div>
      <div class="cx-tot"><div><span>المجموع</span><b class="num">${nf(o.subtotal ?? o.total)}</b></div>${o.discount ? `<div style="color:#B45309"><span>خصم (${esc(o.discount.reason)})</span><b class="num">−${nf(o.discount.amount)}</b></div>` : ""}
      <div class="big"><span>الإجمالي</span><span class="num">${nf(o.total)} ر.س</span></div>${A.hasM(o, "cash") && o.given ? `<div style="color:#71717A"><span>المستلم / الباقي</span><span class="num">${nf(o.given)} / ${nf(o.change)}</span></div>` : ""}</div></div>
    <div class="cx-sec"><h4>التكلفة والربح</h4><div class="cx-kv"><div><span>تكلفة الطعام</span><b class="num">${nf(c.food)}</b></div><div><span>التغليف (${pk.boxes} علبة · ${pk.bags} كيس)</span><b class="num">${nf(c.pack)}</b></div>
      <div><span>مجمل الربح</span><b class="num">${nf(o.total - c.food - c.pack)}</b></div><div><span>نسبة التكلفة</span><b class="num">${o.total ? pct((c.food + c.pack) / o.total * 100) : "—"}</b></div></div></div>
    <div class="cx-sec"><h4>سجل الطلب</h4><ul class="cx-tl">${ev.map(([t, a, b]) => `<li><b>${a}</b><small><span class="tm">${tm(t)}</span> · ${b}</small></li>`).join("")}</ul></div>`,
    `<button class="cx-btn" id="drk">${ic("chef")}ورقة المطبخ</button><button class="cx-btn pri" id="drp">${ic("print")}طباعة الإيصال</button>`,
    d => { d.querySelector("#drp").onclick = () => A.printJob(o, { receipt: true }, true); d.querySelector("#drk").onclick = () => (A.previewJob ? A.previewJob(o, { kitchen: true }) : A.printJob(o, { kitchen: true }, true)); });
}

/* =================== الصفحات =================== */
const PAGES = {};
let LEGX = null;
const page = (inner, opt = {}) => { LEGX = null; $("#cxp").innerHTML = `<div class="cx-ph"><div><h1>${opt.h1 || TITLES[st.page]}</h1>${opt.sub ? `<p>${opt.sub}</p>` : ""}</div><div class="cx-acts">${opt.acts || ""}</div></div>${inner}`; };

/* ---------- الملخص ---------- */
function dashRange() { if (st.p === "range" && st.ra && st.rb) return [st.ra, st.rb]; if (st.p === "range") st.p = "day"; return A.dshRange(st.p, st.d); }
/* one day is shown hour by hour; a longer period day by day */
const oneDay = R => R[0] === R[1];
/* «4 أيام» … the right Arabic form for a count of days */
const daysAr = n => n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `<span class="num">${n}</span> أيام` : `<span class="num">${n}</span> يوماً`;
const lenNote = (a, b) => window.aqLang && window.aqLang() === "en"
  ? `The current period is <span class="num">${a}</span> day(s) and the comparison period <span class="num">${b}</span>, so figures are compared with ${a === 1 ? "the comparison period's average day" : `the comparison period scaled to <span class="num">${a}</span> days`} to keep it fair. Each day is listed in “Days compared” below.`
  : `الفترة الحالية ${daysAr(a)} وفترة المقارنة ${daysAr(b)}، لذلك تُقارَن الأرقام ${a === 1 ? "بمتوسط اليوم الواحد من فترة المقارنة" : `بفترة المقارنة بعد حسابها على ${daysAr(a)}`} حتى تكون المقارنة عادلة. أرقام كل يوم في جدول «أيام المقارنة» تحت هذا التنبيه.`;
const nDays = R => Math.round((new Date(R[1]) - new Date(R[0])) / 864e5) + 1;
function prevRange([a, b]) { if (st.cmpR) return st.cmpR;   /* a period the manager picked to compare with */
  if (st.p === "month") return A.dshRange("month", A.addDays(a, -1)); const n = Math.round((new Date(b) - new Date(a)) / 864e5) + 1; return [A.addDays(a, -n), A.addDays(b, -n)]; }
PAGES.dash = async () => {
  const R = dashRange(); st.cmp = false; st.cmpR = null;   /* comparing lives on its own page now */
  page(`<div class="cx-tabs">${[["gen", "عام"], ["kitchen", "المطبخ"], ["cash", "الكاشيرون"]].map(([k, l]) => `<button data-dt="${k}" class="${st.dtab === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="cx-ctl"><div class="cx-seg">${[["day", "يوم"], ["week", "أسبوع"], ["month", "شهر"], ["range", "مخصص"]].map(([k, l]) => `<button data-p="${k}" class="${st.p === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <button class="cx-btn" id="cxd">${ic("cal")}<span>${rLab(...R)}</span></button><button class="cx-btn" data-go="compare">${ic("compare")}مقارنة</button><span class="cx-sp"></span>${fltBtn()}</div>
    ${fltChips()}${st.cmp && st.dtab === "gen" && nDays(R) !== nDays(prevRange(R)) ? `<p class="cx-note" data-noi18n>${lenNote(nDays(R), nDays(prevRange(R)))}</p>` : ""}<div id="dbody">${loadingCards()}</div>`, { h1: `${window.aqLang && window.aqLang() === "en" ? "Hello, " : "مرحباً، "}<span data-noi18n>${esc(userName())}</span>`, acts: expBtn() });
  bindExp();
  $$("[data-dt]").forEach(b => b.onclick = () => { st.dtab = b.dataset.dt; save(); PAGES.dash(); });
  const pickRange = (el, a, b, done) => picker(el, { mode: "range", a, b, onPick: (x, y) => { done(x, y); save(); PAGES.dash(); } });
  $$("[data-p]").forEach(b => b.onclick = () => { if (b.dataset.p === "range") return pickRange(b, st.ra || R[0], st.rb || R[1], (x, y) => { st.p = "range"; st.ra = x; st.rb = y; });
    st.p = b.dataset.p; save(); PAGES.dash(); });
  $("#cxd").onclick = e => st.p === "range" ? pickRange(e.currentTarget, R[0], R[1], (x, y) => { st.ra = x; st.rb = y; })
    : picker(e.currentTarget, { mode: st.p, a: R[0], b: R[1], onPick: a => { st.d = a; PAGES.dash(); } });
  if ($("#cxcmp")) $("#cxcmp").onclick = () => { st.cmp = !st.cmp; if (!st.cmp) st.cmpR = null; save(); PAGES.dash(); };
  if ($("#cxcr")) $("#cxcr").onclick = e => { const P = prevRange(R);
    picker(e.currentTarget, { mode: oneDay(P) ? "day" : "range", switchable: true, a: P[0], b: P[1], onPick: (x, y) => { st.cmpR = [x, y || x]; save(); PAGES.dash(); } }); };
  if ($("#cxcrx")) $("#cxcrx").onclick = () => { st.cmpR = null; save(); PAGES.dash(); };
  let L, Lp = [];
  try { const all = await load(...R); L = applyF(all); if (st.cmp && st.dtab === "gen") Lp = applyF(await load(...prevRange(R))); bindFlt(PAGES.dash, all.map(o => o.cashierName)); }
  catch (e) { $("#dbody").innerHTML = errBox(e); return; }
  if (st.page !== "dash") return;
  charts.clear(); EXP = [];
  const nc = nDays(R), np = nDays(prevRange(R)); CMPK = st.cmp && nc !== np ? nc / np : 1;
  CMPLAB = CMPK !== 1 ? (nc === 1 ? "متوسط يوم في فترة المقارنة" : `فترة المقارنة محسوبة على ${nc} أيام`) : st.cmpR ? "فترة المقارنة" : partial(R) ? "السابق لنفس المدة" : "السابق";
  LEG = st.cmp ? [rLab(...R), rLab(...prevRange(R)) + (oneDay(R) && np > 1 ? " · متوسط اليوم" : "")] : null;
  await ({ gen: dashGen, kitchen: dashKitchen, cash: dashCash })[st.dtab](L, Lp, R);
  if (st.page === "dash") drawCharts();
};
/* =================== المقارنة =================== */
/* Two or three sides (أ، ب، ج), each one of: a day, a from–to period, separate days picked one by one, or some weekdays within a period.
   Compared by total or by average day; scorecard, hour chart, payment/type/product breakdown, every day of each side, and a one-line finding. */
const CMP_COL = ["#C1121F", "#71717A", "#1F4E9E"], CMP_AR = ["أ", "ب", "ج"], CMP_EN = ["A", "B", "C"];
const CMP_N = new Proxy([], { get: (_, i) => (window.aqLang && window.aqLang() === "en" ? CMP_EN : CMP_AR)[i] });
const WDN_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"], WDN_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WDN = new Proxy([], { get: (_, i) => (window.aqLang && window.aqLang() === "en" ? WDN_EN : WDN_AR)[i] });
const sideT = i => (window.aqLang && window.aqLang() === "en" ? "Side " : "الطرف ") + CMP_N[i];
const daysTx = n => window.aqLang && window.aqLang() === "en" ? `<span class="num">${n}</span> day${n === 1 ? "" : "s"}` : daysAr(n);
const wdOf = d => new Date(d + "T12:00:00").getDay();
const isEnL = () => !!(window.aqLang && window.aqLang() === "en");
function cmpPresets() {
  const t = A.bizDay(), y = A.addDays(t, -1), w = A.dshRange("week", t), n = Math.round((new Date(t) - new Date(w[0])) / 864e5);
  const m0 = t.slice(0, 8) + "01", pm0 = A.dshRange("month", A.addDays(m0, -1))[0], dm = +t.slice(8) - 1;
  const pmEnd = A.addDays(pm0, Math.min(dm, Math.round((new Date(m0) - new Date(pm0)) / 864e5) - 1));
  const four = [A.addDays(t, -27), t];
  return [
    ["اليوم مقابل الأمس", [{ k: "day", a: t }, { k: "day", a: y }]],
    ["اليوم مقابل نفس اليوم قبل أسبوع", [{ k: "day", a: t }, { k: "day", a: A.addDays(t, -7) }]],
    ["الأمس مقابل قبل أسبوع", [{ k: "day", a: y }, { k: "day", a: A.addDays(y, -7) }]],
    ["هذا الأسبوع مقابل الماضي", [{ k: "range", a: w[0], b: t }, { k: "range", a: A.addDays(w[0], -7), b: A.addDays(w[0], n - 7) }]],
    ["هذا الشهر مقابل الماضي", [{ k: "range", a: m0, b: t }, { k: "range", a: pm0, b: pmEnd }]],
    ["آخر 7 أيام مقابل التي قبلها", [{ k: "range", a: A.addDays(t, -6), b: t }, { k: "range", a: A.addDays(t, -13), b: A.addDays(t, -7) }]],
    ["الخميس والجمعة مقابل بقية الأيام", [{ k: "wd", wd: [4, 5], a: four[0], b: four[1] }, { k: "wd", wd: [6, 0, 1, 2, 3], a: four[0], b: four[1] }]],
  ];
}
function sideDays(s) {
  const t = A.bizDay(); let out = [];
  if (s.k === "day") out = [s.a];
  else if (s.k === "days") out = [...(s.days || [])].sort();
  else { for (let d = s.a; d <= s.b; d = A.addDays(d, 1)) if (s.k === "range" || (s.wd || []).includes(wdOf(d))) out.push(d); }
  return out.filter(d => d <= t);
}
function sideLabel(s) {
  if (s.k === "day") return [dFull(s.a), wdName(s.a)];
  const en = isEnL();
  if (s.k === "range") return [rLab(s.a, s.b), daysTx(sideDays(s).length)];
  if (s.k === "days") { const d = sideDays(s), sep = en ? ", " : "، "; return [d.length > 3 ? `${d.slice(0, 3).map(dLab).join(sep)} …` : d.map(dLab).join(sep) || "—", en ? `${daysTx(d.length)}, separate` : `${daysAr(d.length)} متفرقة`]; }
  const names = (s.wd || []).map(i => WDN[i]);
  const list = (L, sep, and) => L.length < 2 ? L.join("") : L.slice(0, -1).join(sep) + and + L[L.length - 1];
  return [en ? `Every ${list(names, ", ", " and ")}` : `كل ${list(names, "، ", " و")}`, `${rLab(s.a, s.b)} · ${daysTx(sideDays(s).length)}`];
}
const wdName = d => new Date(d + "T12:00:00").toLocaleDateString(isEnL() ? "en-GB" : "ar", { weekday: "long" });
function cmpDefault() { return cmpPresets()[0][1]; }

PAGES.compare = async () => {
  if (!Array.isArray(st.cmpS) || st.cmpS.length < 2) st.cmpS = cmpDefault();
  const S2 = st.cmpS, D = S2.map(sideDays), eq = D.every(d => d.length === D[0].length);
  const basis = st.cmpB || (eq ? "sum" : "avg");
  const pres = cmpPresets(), curKey = JSON.stringify(S2);
  page(`<div class="cq-pre">${pres.map(([l, v], i) => `<button class="cq-chip ${JSON.stringify(v) === curKey ? "on" : ""}" data-pre="${i}">${l}</button>`).join("")}</div>
    <div class="cq-sides">${S2.map((s, i) => { const [l1, l2] = sideLabel(s); return `<button class="cq-side" data-side="${i}" style="--c:${CMP_COL[i]}">
      <span class="cq-tag">${sideT(i)}</span><b>${l1}</b><small>${l2}</small><span class="cq-ed">${ic("edit")}تغيير</span>${i > 1 ? `<span class="cq-rm" data-rm="${i}" aria-label="حذف الطرف">✕</span>` : ""}</button>`; }).join("")}
      ${S2.length < 3 ? `<button class="cq-add" id="cqadd">＋ إضافة طرف ثالث</button>` : ""}</div>
    <div class="cq-bar"><div class="cx-seg"><button data-basis="sum" class="${basis === "sum" ? "on" : ""}">المجموع</button><button data-basis="avg" class="${basis === "avg" ? "on" : ""}">متوسط اليوم</button></div><span class="cx-sp"></span>${fltBtn()}</div>
    ${!eq && basis === "sum" ? `<p class="cx-note" data-noi18n>${isEnL() ? `The sides have different numbers of days (${D.map((d, i) => `${CMP_EN[i]}: ${daysTx(d.length)}`).join(", ")}), so totals favour the longer one. “Average day” is fairer here.` : `عدد الأيام مختلف (${D.map((d, i) => `${CMP_N[i]}: ${daysAr(d.length)}`).join("، ")})، فمقارنة المجموع تميل للأطول. «متوسط اليوم» أعدل هنا.`}</p>` : ""}
    ${fltChips()}<div id="cqbody">${loadingCards(3, 220)}</div>`, { acts: expBtn() });
  bindExp();
  $$("[data-pre]").forEach(b => b.onclick = () => { st.cmpS = JSON.parse(JSON.stringify(pres[+b.dataset.pre][1])); st.cmpB = null; save(); PAGES.compare(); });
  $$("[data-basis]").forEach(b => b.onclick = () => { st.cmpB = b.dataset.basis; save(); PAGES.compare(); });
  $$("[data-side]").forEach(b => b.onclick = e => { if (e.target.closest("[data-rm]")) { st.cmpS.splice(+e.target.closest("[data-rm]").dataset.rm, 1); save(); return PAGES.compare(); } sideEditor(+b.dataset.side); });
  if ($("#cqadd")) $("#cqadd").onclick = () => { st.cmpS.push({ k: "day", a: A.addDays(A.bizDay(), -14) }); save(); sideEditor(st.cmpS.length - 1); };
  const all = D.flat(); if (!all.length) { $("#cqbody").innerHTML = `<div class="cx-card">${emptyBox("اختر أياماً سابقة أو اليوم لكل طرف")}</div>`; return; }
  const lo = all.reduce((a, b) => a < b ? a : b), hi = all.reduce((a, b) => a > b ? a : b);
  let L; try { const raw = await load(lo, hi); L = applyF(raw); bindFlt(PAGES.compare, raw.map(o => o.cashierName)); } catch (e) { $("#cqbody").innerHTML = errBox(e); return; }
  if (st.page !== "compare") return;
  charts.clear(); EXP = [];
  const sides = S2.map((s, i) => { const set = new Set(D[i]), Ls = L.filter(o => set.has(o.day)); return { i, s, days: D[i], L: Ls, ok: Ls.filter(isOk), a: agg(Ls) }; });
  $("#cqbody").innerHTML = cmpBody(sides, basis);
  $$("[data-more]").forEach(b => b.onclick = () => { $$(".cq-h" + b.dataset.more).forEach(r => r.classList.remove("cq-hid")); b.closest("tr").remove(); });
  drawCharts();
};

function cmpBody(sides, basis) {
  const k = sd => basis === "avg" ? 1 / Math.max(1, sd.days.length) : 1, A0 = sides[0];
  const val = (sd, f) => f.avg ? sd.a[f.k] : sd.a[f.k] * k(sd);
  const F = [
    { t: "صافي المبيعات", k: "net", m: 1 }, { t: "الطلبات", k: "n", i: 1 }, { t: "متوسط الطلب", k: "avg", m: 1, avg: 1 },
    { t: "مجمل الربح", k: "gp", m: 1 }, { t: "نسبة التكلفة", k: "cpct", p: 1, avg: 1, inv: 1 }, { t: "عدد القطع", k: "qty", i: 1 },
    { t: "مبلغ الخصم", k: "disc", m: 1, inv: 1 }, { t: "مبلغ الإلغاء", k: "vT", m: 1, inv: 1 }, { t: "متوسط التحضير (د)", k: "prep", avg: 1, inv: 1, d1: 1 } ];
  const fmt = (f, v) => v == null || !isFinite(v) ? "—" : f.p ? pct(v) : f.i ? (basis === "avg" && !f.avg ? nf(v, 1) : ni(v)) : f.d1 ? nf(v, 1) : nf(v);
  const dlt = (f, a, b) => { if (a == null || b == null || !isFinite(a) || !isFinite(b)) return `<span class="cq-d eq">—</span>`;
    if (f.p) { const d = a - b; return `<span class="cq-d ${Math.abs(d) < .05 ? "eq" : (d < 0) === !!f.inv ? "up" : "dn"}">${d >= 0 ? "▲" : "▼"} ${nf(Math.abs(d), 1)} نقطة</span>`; }
    if (!b) return a ? `<span class="cq-d up">جديد</span>` : `<span class="cq-d eq">0%</span>`;
    const d = (a - b) / Math.abs(b) * 100; return `<span class="cq-d ${Math.abs(d) < .05 ? "eq" : (d >= 0) !== !!f.inv ? "up" : "dn"}">${d >= 0 ? "▲" : "▼"} ${nf(Math.abs(d), 1)}%</span>`; };
  const head = `<th>المؤشر</th>${sides.map(sd => `<th><i class="cq-dot" style="background:${CMP_COL[sd.i]}"></i>${CMP_N[sd.i]}</th>`).join("")}${sides.slice(1).map(sd => `<th>${CMP_N[0]} مقابل ${CMP_N[sd.i]}</th>`).join("")}`;
  const rows = F.map(f => `<tr><td>${f.t}</td>${sides.map(sd => `<td class="num ${sd.i === 0 ? "b" : ""}">${fmt(f, val(sd, f))}</td>`).join("")}${sides.slice(1).map(sd => `<td>${dlt(f, val(A0, f), val(sd, f))}</td>`).join("")}</tr>`).join("");
  expT("المقارنة", [["t", "المؤشر"], ...sides.map(sd => [`s${sd.i}`, `${CMP_N[sd.i]}: ${sideLabel(sd.s).join(" · ")}`])], F.map(f => ({ t: f.t, ...Object.fromEntries(sides.map(sd => { const v = val(sd, f); return [`s${sd.i}`, v == null || !isFinite(v) ? "" : r2(v)]; })) })));
  /* hours of the business day, per side (total or average day) */
  const cut = A.S.config?.cutoff ?? 4, hrs = [...Array(24).keys()].map(i => (i + cut) % 24);
  const hv = sd => hrs.map(h => sd.ok.filter(o => new Date(o.ts).getHours() === h).reduce((s, o) => s + o.total, 0) * k(sd));
  const H = sides.map(hv), used = hrs.map((_, j) => H.some(v => v[j] > 0)), f0 = used.indexOf(true), l0 = used.lastIndexOf(true);
  const span = f0 < 0 ? [0, 23] : [Math.max(0, f0 - 1), Math.min(23, l0 + 1)], hk = hrs.slice(span[0], span[1] + 1);
  const hchart = chart({ kind: "line", labels: hk.map(hrLab), tips: hk.map(h => `${hrLab(h)} – ${hrLab((h + 1) % 24)}`), series: sides.map(sd => ({ name: `${CMP_N[sd.i]}`, color: CMP_COL[sd.i], dash: sd.i ? 1 : 0, values: H[sd.i].slice(span[0], span[1] + 1) })) }, 220);
  const leg = `<div class="cx-leg2">${sides.map(sd => `<span><i class="${sd.i ? "d" : ""}" style="border-top-color:${CMP_COL[sd.i]}"></i>${CMP_N[sd.i]}: ${sideLabel(sd.s)[0]}</span>`).join("")}</div>`;
  /* side-by-side breakdown */
  const brk = (title, keys, lab, f) => { const R = keys.map(key => [lab(key), ...sides.map(sd => f(sd, key) * k(sd))]).filter(r => r.slice(1).some(v => v));
    if (!R.length) return ""; const mx = Math.max(1e-9, ...R.flatMap(r => r.slice(1)));
    return `<div class="cx-card"><div class="cx-ch"><h3>${title}</h3></div><div class="cq-brk">${R.map(r => `<div class="cq-br"><div class="cq-bl">${r[0]}</div>${sides.map(sd => `<div class="cq-bb"><i style="width:${Math.max(2, r[sd.i + 1] / mx * 100)}%;background:${CMP_COL[sd.i]}"></i><span class="num">${nf(r[sd.i + 1])}</span></div>`).join("")}</div>`).join("")}</div></div>`; };
  const itemVal = (sd, name) => sd.ok.reduce((s, o) => { const fct = o.subtotal ? o.total / o.subtotal : 1; return s + o.lines.filter(l => l.name === name).reduce((x, l) => x + l.qty * l.price * fct, 0); }, 0);
  const names = [...new Set(sides.flatMap(sd => sd.ok.flatMap(o => o.lines.map(l => l.name))))];
  const topN = names.map(n => [n, Math.max(...sides.map(sd => itemVal(sd, n) * k(sd)))]).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
  /* finding: where the difference comes from */
  const B1 = sides[1], dn = val(A0, F[0]) - val(B1, F[0]);
  let find = "";
  if (A0.ok.length || B1.ok.length) {
    const hd = hk.map((h, j) => [h, H[0][span[0] + j] - H[1][span[0] + j]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0];
    const idf = names.map(n => [n, itemVal(A0, n) * k(A0) - itemVal(B1, n) * k(B1)]).filter(x => Math.sign(x[1]) === Math.sign(dn) && Math.abs(x[1]) >= .5).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2);
    const en = isEnL(), pr = basis === "avg" ? (en ? "per average day " : "في متوسط اليوم ") : "";
    const sh = Math.abs(dn), pc = val(B1, F[0]) ? ` (<span class="num">${nf(sh / val(B1, F[0]) * 100, 1)}%</span>)` : "";
    const hT = hd && Math.abs(hd[1]) >= .5 ? `${hrLab(hd[0])} – ${hrLab((hd[0] + 1) % 24)}` : "";
    const iT = idf.map(x => `<b>${esc(en && window.tr ? window.tr(x[0]) : x[0])}</b> (<span class="num">${nf(Math.abs(x[1]))}</span>)`).join(en ? " and " : " و");
    find = en
      ? (sh < .5 ? `Both sides are about equal ${pr}in net sales.` : `${CMP_N[0]} is ${dn > 0 ? "higher" : "lower"} than ${CMP_N[1]} ${pr}by <b class="num">${nf(sh)}</b> SAR${pc}, with <span class="num">${fmt(F[1], val(A0, F[1]))}</span> orders vs <span class="num">${fmt(F[1], val(B1, F[1]))}</span>.` + (hT ? ` The biggest gap is at <b>${hT}</b> (<span class="num">${nf(Math.abs(hd[1]))}</span> SAR).` : "") + (iT ? ` Items that moved it most: ${iT}.` : ""))
      : (sh < .5 ? `الطرفان متساويان تقريباً ${pr}في صافي المبيعات.` : `${CMP_N[0]} ${dn > 0 ? "أعلى" : "أقل"} من ${CMP_N[1]} ${pr}بـ <b class="num">${nf(sh)}</b> ر.س${pc}، وعدد الطلبات <span class="num">${fmt(F[1], val(A0, F[1]))}</span> مقابل <span class="num">${fmt(F[1], val(B1, F[1]))}</span>.` + (hT ? ` أكبر فرق في الساعة <b>${hT}</b> (<span class="num">${nf(Math.abs(hd[1]))}</span> ر.س).` : "") + (iT ? ` وأكثر الأصناف تأثيراً: ${iT}.` : ""));
  }
  /* every day of each side */
  const dayRows = sd => sd.days.map((d, j) => { const g = sd.ok.filter(o => o.day === d); return `<tr class="${sd.days.length > 7 && j >= 5 ? `cq-hid cq-h${sd.i}` : ""}"><td><b>${dLab(d)}</b><span class="cx-mut">${wdName(d)}</span></td><td class="num">${ni(g.length)}</td><td class="num">${nf(g.reduce((s, o) => s + o.total, 0))}</td></tr>`; }).join("");
  const days = `<div class="cx-card s3"><div class="cx-ch"><h3>أيام كل طرف</h3></div><table class="cx-t cx-cmpt"><thead><tr><th>اليوم</th><th>الطلبات</th><th>صافي المبيعات</th></tr></thead><tbody>
    ${sides.map(sd => `<tr class="cx-sec" style="--c:${CMP_COL[sd.i]}"><td colspan="3">${sideT(sd.i)} · ${sideLabel(sd.s)[0]}</td></tr>${dayRows(sd)}${sd.days.length > 7 ? `<tr class="cq-mo"><td colspan="3"><button class="cx-link" data-more="${sd.i}">عرض كل الأيام (<span class="num">${sd.days.length}</span>)</button></td></tr>` : ""}
      ${sd.days.length > 1 ? `<tr class="cx-sumr"><td>المجموع · ${daysAr(sd.days.length)}</td><td class="num">${ni(sd.a.n)}</td><td class="num">${nf(sd.a.net)}</td></tr><tr class="cx-sumr"><td>متوسط اليوم</td><td class="num">${nf(sd.a.n / sd.days.length, 1)}</td><td class="num">${nf(sd.a.net / sd.days.length)}</td></tr>` : ""}`).join("")}</tbody></table></div>`;
  return `${find ? `<div class="cq-find" data-noi18n>${ic("trend")}<div>${find}</div></div>` : ""}
    <div class="cx-grid"><div class="cx-card s3"><div class="cx-ch"><h3>النتيجة${basis === "avg" ? " · متوسط اليوم" : " · المجموع"}</h3></div><div class="cx-tw"><table class="cx-t cq-t"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>
    <div class="cx-card s3"><div class="cx-ch"><h3>المبيعات حسب الساعة${basis === "avg" ? " · متوسط اليوم" : ""}</h3></div>${hchart}${leg}</div>
    ${brk("طرق الدفع", Object.keys(A.METHODS), m => A.METHODS[m], (sd, m) => sd.ok.reduce((s, o) => s + A.paidBy(o, m), 0))}
    ${brk("أنواع الطلب", A.TYPES.map(t => t[0]), t => A.TYPES.find(x => x[0] === t)[1], (sd, t) => sd.ok.filter(o => o.type === t).reduce((s, o) => s + o.total, 0))}
    ${brk("أعلى الأصناف", topN, n => esc(n), itemVal)}
    ${days}</div>`;
}

/* editing one side: its kind, then its days */
function sideEditor(i) {
  const s0 = st.cmpS[i], s = JSON.parse(JSON.stringify(s0)), t = A.bizDay();
  if (!s.a) s.a = t; let y = +s.a.slice(0, 4), m = +s.a.slice(5, 7) - 1, half = null;
  const KINDS = [["day", "يوم"], ["range", "فترة من – إلى"], ["days", "أيام متفرقة"], ["wd", "أيام من الأسبوع"]];
  const cal = () => { const f = new Date(y, m, 1), start = A.addDays(A.ymd(f), -((f.getDay() + 1) % 7)), cells = [...Array(42).keys()].map(j => A.addDays(start, j));
    const picked = d => s.k === "day" ? d === s.a : s.k === "days" ? (s.days || []).includes(d) : s.k === "range" ? (half ? d === half : d >= s.a && d <= s.b) : (d >= s.a && d <= s.b && (s.wd || []).includes(wdOf(d)));
    const inR = d => (s.k === "range" || s.k === "wd") && !half && s.b && d > s.a && d < s.b;
    return `<div class="pk2-h"><button data-n="-1" aria-label="الشهر السابق">‹</button><b>${AR_M[m]} ${y}</b><button data-n="1" aria-label="الشهر التالي">›</button></div>
      <div class="pk2-d">${(isEnL() ? ["Sa", "Su", "Mo", "Tu", "We", "Th", "Fr"] : ["س", "ح", "ن", "ث", "ر", "خ", "ج"]).map(d => `<i>${d}</i>`).join("")}${cells.map(d => `<button data-dy="${d}" class="${+d.slice(5, 7) !== m + 1 ? "out" : ""} ${picked(d) ? "end" : inR(d) ? "in" : ""} ${d === t ? "today" : ""}" ${d > t ? "disabled" : ""}>${+d.slice(8)}</button>`).join("")}</div>`; };
  const hint = () => s.k === "day" ? "اضغط اليوم" : s.k === "range" ? (half ? "اختر يوم النهاية" : "اختر يوم البداية ثم يوم النهاية") : s.k === "days" ? `اضغط كل يوم تريده · المختار: <b class="num">${(s.days || []).length}</b>` : (half ? "اختر نهاية الفترة" : "اختر الأيام، ثم بداية الفترة ونهايتها من التقويم");
  const body = () => `<div class="cx-seg cq-kinds">${KINDS.map(([kk, l]) => `<button data-kind="${kk}" class="${s.k === kk ? "on" : ""}">${l}</button>`).join("")}</div>
    ${s.k === "wd" ? `<div class="cq-wd">${[6, 0, 1, 2, 3, 4, 5].map(w => `<button data-wd="${w}" class="${(s.wd || []).includes(w) ? "on" : ""}">${WDN[w]}</button>`).join("")}</div>
      <div class="cq-q">${[["آخر 4 أسابيع", A.addDays(t, -27), t], ["آخر 8 أسابيع", A.addDays(t, -55), t], ["هذا الشهر", t.slice(0, 8) + "01", t], ["الشهر الماضي", ...A.dshRange("month", A.addDays(t.slice(0, 8) + "01", -1))]].map(([l, a, b]) => `<button data-q="${a}|${b}" class="${s.a === a && s.b === b ? "on" : ""}">${l}</button>`).join("")}</div>` : ""}
    <div class="pk2 cq-cal">${cal()}</div><p class="pk2-hint">${hint()}</p>
    <div class="cq-sum"><b>${sideLabel(s)[0]}</b><small>${sideLabel(s)[1]}</small></div>`;
  const ok = () => s.k === "day" ? !!s.a : s.k === "range" ? !half && s.a && s.b : s.k === "days" ? (s.days || []).length > 0 : (s.wd || []).length && s.a && s.b && !half;
  drawer(`<b>${sideT(i)}</b>`, `<div id="cqed"></div>`, `<button class="cx-btn" data-x2>إلغاء</button><button class="cx-btn pri" id="cqok">تطبيق</button>`, d => {
    const draw = () => { d.querySelector("#cqed").innerHTML = body(); bind(); };
    const bind = () => {
      d.querySelectorAll("[data-kind]").forEach(b => b.onclick = () => { const nk = b.dataset.kind; if (nk === s.k) return; s.k = nk; half = null;
        if (nk === "range" || nk === "wd") { s.b = s.b && s.b >= s.a ? s.b : t; if (nk === "wd") { s.a = A.addDays(t, -27); s.b = t; s.wd = s.wd?.length ? s.wd : [wdOf(t)]; } }
        if (nk === "days") s.days = s.days?.length ? s.days : [s.a]; draw(); });
      d.querySelectorAll("[data-n]").forEach(b => b.onclick = () => { m += +b.dataset.n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } draw(); });
      d.querySelectorAll("[data-wd]").forEach(b => b.onclick = () => { const w = +b.dataset.wd, L = new Set(s.wd || []); L.has(w) ? L.delete(w) : L.add(w); s.wd = [...L]; draw(); });
      d.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { [s.a, s.b] = b.dataset.q.split("|"); half = null; draw(); });
      d.querySelectorAll("[data-dy]").forEach(b => b.onclick = () => { const dd = b.dataset.dy;
        if (s.k === "day") s.a = dd;
        else if (s.k === "days") { const L = new Set(s.days || []); L.has(dd) ? L.delete(dd) : L.add(dd); s.days = [...L].sort(); }
        else if (!half) { half = dd; s.a = dd; s.b = null; }
        else { [s.a, s.b] = dd < half ? [dd, half] : [half, dd]; half = null; }
        draw(); });
    };
    d.querySelector("[data-x2]").onclick = closeDrawer;
    d.querySelector("#cqok").onclick = () => { if (!ok()) return A.toast(s.k === "wd" && !(s.wd || []).length ? "اختر يوماً واحداً على الأقل من الأسبوع" : "أكمل اختيار الأيام أولاً"); st.cmpS[i] = s; st.cmpB = null; save(); closeDrawer(); PAGES.compare(); };
    draw();
  });
}

function buckets(L, R, hourly = oneDay(R)) {
  const cut = A.S.config?.cutoff ?? 4;
  if (hourly) { const hrs = [...Array(24).keys()].map(i => (i + cut) % 24); return { keys: hrs, labels: hrs.map(hrLab), tips: hrs.map(h => `${hrLab(h)} – ${hrLab((h + 1) % 24)}`), of: o => new Date(o.ts).getHours() }; }
  const days = []; for (let d = R[0]; d <= R[1]; d = A.addDays(d, 1)) days.push(d);
  return { keys: days, labels: days.map(dLab), tips: days.map(dFull), of: o => o.day };
}
/* نقاط المستقبل تُترك فارغة (لا تُرسم صفراً) */
function futureMask(B, R) {
  const t = A.bizDay();
  if (oneDay(R)) { if (R[0] !== t) return B.keys.map(() => R[0] > t); const cut = A.S.config?.cutoff ?? 4, cur = (new Date().getHours() - cut + 24) % 24; return B.keys.map((h, i) => i > cur); }
  return B.keys.map(d => d > t);
}
/* المقارنة العادلة: إن كانت الفترة الحالية لم تكتمل بعد تُقارن بنفس المدة المنقضية من الفترة السابقة */
function partial(R) { const t = A.bizDay(); return oneDay(R) ? R[0] === t : R[1] > t && R[0] <= t; }
function likeFor(Lp, R) {
  if (st.cmpR || !partial(R)) return Lp;   /* a period picked by hand is compared whole */
  const t = A.bizDay(), cut = A.S.config?.cutoff ?? 4, hi = (h => (h - cut + 24) % 24), nowI = hi(new Date().getHours()), now = new Date(), nowM = now.getMinutes();
  if (oneDay(R)) return Lp.filter(o => { const d = new Date(o.ts), i = hi(d.getHours()); return i < nowI || (i === nowI && d.getMinutes() <= nowM); });
  const n = Math.round((new Date(t) - new Date(R[0])) / 864e5), pr = prevRange(R), last = A.addDays(pr[0], n);
  return Lp.filter(o => o.day <= last);
}
function series(L, B, f, avg) { return B.keys.map(k => { const g = L.filter(o => B.of(o) === k); if (avg) { const v = g.map(f).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : (avg === "zero" ? 0 : null); } return g.reduce((s, o) => s + f(o), 0); }); }
/* totals of the comparison period brought to the current period's number of days; averages and ratios stay as they are */
function scaleAgg(p, k) { if (k === 1) return p; const q = { ...p }; ["n", "net", "gross", "disc", "discN", "vN", "vT", "cost", "food", "pack", "gp", "qty"].forEach(f => q[f] = p[f] * k); return q; }
/* every day of the two periods, side by side: orders and net sales, with the total and the average day */
function cmpTable(L, Lp, R) {
  const P = prevRange(R), en = window.aqLang && window.aqLang() === "en";
  const wd = d => new Date(d + "T12:00:00").toLocaleDateString(en ? "en-GB" : "ar", { weekday: "long" });
  const part = (arr, a, b, title, cls) => { const ok = arr.filter(isOk), days = []; for (let d = a; d <= b; d = A.addDays(d, 1)) days.push(d);
    const rows = days.map(d => { const g = ok.filter(o => o.day === d); return [d, g.length, g.reduce((s, o) => s + o.total, 0)]; });
    const n = rows.reduce((s, r) => s + r[1], 0), v = rows.reduce((s, r) => s + r[2], 0);
    return `<tr class="cx-sec ${cls}"><td colspan="3">${title}</td></tr>`
      + (rows.length <= 31 ? rows.map(r => `<tr><td><b>${dLab(r[0])}</b><span class="cx-mut">${wd(r[0])}</span></td><td class="num">${ni(r[1])}</td><td class="num">${nf(r[2])}</td></tr>`).join("") : "")
      + (rows.length > 1 ? `<tr class="cx-sumr"><td>المجموع · ${daysAr(rows.length)}</td><td class="num">${ni(n)}</td><td class="num">${nf(v)}</td></tr><tr class="cx-sumr"><td>متوسط اليوم</td><td class="num">${nf(n / rows.length, 1)}</td><td class="num">${nf(v / rows.length)}</td></tr>` : ""); };
  return `<div class="cx-card s3"><div class="cx-ch"><h3>أيام المقارنة</h3></div><table class="cx-t cx-cmpt"><thead><tr><th>اليوم</th><th>الطلبات</th><th>صافي المبيعات</th></tr></thead>
    <tbody>${part(L, R[0], R[1], "الفترة الحالية", "cur")}${part(Lp, P[0], P[1], "فترة المقارنة", "cmp")}</tbody></table></div>`;
}
function kpiCard(o) {
  const ser = [{ name: st.cmp && o.ps ? "الفترة الحالية" : o.t, color: o.color || "#C1121F", values: o.s }]; if (st.cmp && o.ps) ser.push({ name: st.cmpR ? rLab(...st.cmpR) : "الفترة السابقة", color: "#A1A1AA", values: o.ps, dash: 1 });
  return `<div class="cx-card ${o.span || ""}"><div class="cx-ch"><h3>${o.t}</h3>${o.go ? `<button class="cx-link" data-go="${o.go}">عرض التقرير</button>` : ""}</div>
    <div class="cx-val">${o.html}</div>${deltaHtml(o.v, o.pv, o.inv)}${o.s ? chart({ kind: "line", labels: o.B.labels, tips: o.B.tips, series: ser, f: o.f }) : ""}${st.cmp && o.ps && LEG ? `<div class="cx-leg2"><span><i></i>${LEG[0]}</span><span><i class="d"></i>${LEG[1]}</span></div>` : ""}</div>`;
}
function dashGen(L, Lp, R) {
  const B = buckets(L, R), ok = L.filter(isOk), okp = Lp.filter(isOk), vd = L.filter(o => isVoid(o)), vdp = Lp.filter(o => isVoid(o)), a = agg(L), p = st.cmp ? scaleAgg(agg(likeFor(Lp, R)), CMPK) : {};
  const fut = futureMask(B, R), Bp = st.cmp ? buckets(Lp, prevRange(R), oneDay(R)) : B;
  const S = (arr, f, avg) => series(arr, B, f, avg).map((v, i) => fut[i] ? null : v);
  const hk = oneDay(R) && nDays(prevRange(R)) > 1 ? 1 / nDays(prevRange(R)) : 1;   /* one day by the hour vs several days: their average day */
  const SP = (arr, f, avg) => { const v = series(arr, Bp, f, avg).map(x => x == null || avg ? x : x * hk); return B.keys.map((_, i) => i < v.length ? v[i] : null); };
  if (!L.length && !st.cmp) { $("#dbody").innerHTML = `<div class="cx-card">${emptyBox("لا توجد طلبات في هذه الفترة. جرّب يوماً آخر أو فعّل «إظهار الطلبات التجريبية» من التصفية.")}</div>`; return; }
  const hrs = [...Array(24).keys()].map(i => (i + (A.S.config?.cutoff ?? 4)) % 24), hv = hrs.map(h => ok.filter(o => new Date(o.ts).getHours() === h).reduce((s, o) => s + o.total, 0)), hn = hrs.map(h => ok.filter(o => new Date(o.ts).getHours() === h).length);
  const items = {}; ok.forEach(o => { const f = o.subtotal ? o.total / o.subtotal : 1; o.lines.forEach(l => { items[l.name] = (items[l.name] || 0) + l.qty * l.price * f; }); });
  const by = (arr, k) => { const m = {}; arr.forEach(o => { if (k === "method") A.payParts(o).forEach(p => m[p.m] = (m[p.m] || 0) + (+p.a || 0)); else m[o[k]] = (m[o[k]] || 0) + o.total; }); return Object.entries(m); };
  const typeSeries = A.TYPES.map(([k, l]) => ({ name: l, color: TYPE_C[k], values: S(ok.filter(o => o.type === k), () => 1) }));
  $("#dbody").innerHTML = `<div class="cx-grid">
    ${st.cmp ? cmpTable(L, Lp, R) : ""}
    ${kpiCard({ t: "الطلبات", v: a.n, pv: p.n, html: `<span class="num">${ni(a.n)}</span>`, s: S(ok, () => 1), ps: st.cmp ? SP(okp, () => 1) : null, B, f: "int", go: "orders" })}
    ${kpiCard({ t: "صافي المبيعات", v: a.net, pv: p.net, html: sar(a.net), s: S(ok, o => o.total), ps: st.cmp ? SP(okp, o => o.total) : null, B, go: "sales" })}
    ${kpiCard({ t: "مجمل الربح", v: a.gp, pv: p.gp, html: sar(a.gp), s: S(ok, o => o.total - costOf(o)), ps: st.cmp ? SP(okp, o => o.total - costOf(o)) : null, B, go: "sales", color: "#15803D" })}
    ${kpiCard({ t: "متوسط الطلب", v: a.avg, pv: p.avg, html: sar(a.avg), s: S(ok, o => o.total, "zero"), ps: st.cmp ? SP(okp, o => o.total, "zero") : null, B, go: "sales", color: "#1F4E9E" })}
    ${kpiCard({ t: "مبلغ الخصم", v: a.disc, pv: p.disc, inv: 1, html: sar(a.disc), s: S(ok, o => o.discount?.amount || 0), ps: st.cmp ? SP(okp, o => o.discount?.amount || 0) : null, B, go: "disc", color: "#B45309" })}
    ${kpiCard({ t: "مبلغ الإلغاء", v: a.vT, pv: p.vT, inv: 1, html: sar(a.vT), s: S(vd, o => o.total), ps: st.cmp ? SP(vdp, o => o.total) : null, B, go: "disc", color: "#6B7280" })}
    <div class="cx-card s2"><div class="cx-ch"><h3>المبيعات لكل ساعة</h3><span class="cx-sub2">${oneDay(R) ? "" : "مجموع الفترة حسب ساعة اليوم"}</span></div>${chart({ kind: "bar", labels: hrs.map(hrLab), tips: hrs.map(h => `${hrLab(h)} – ${hrLab((h + 1) % 24)}`), sub: hn.map(n => `${n} طلب`), series: [{ color: "#C1121F", values: hv }] }, 260)}</div>
    ${kpiCard({ t: "نسبة التكلفة", v: a.cpct, pv: p.cpct, inv: 1, html: `<span class="num">${pct(a.cpct)}</span>`, s: S(ok, o => o.total ? costOf(o) / o.total * 100 : null, "avg"), ps: st.cmp ? SP(okp, o => o.total ? costOf(o) / o.total * 100 : null, "avg") : null, B, f: "pct", go: "items", color: "#B45309" })}
    <div class="cx-card s2"><div class="cx-ch"><h3>أنواع الطلب</h3><button class="cx-link" data-go="sales">عرض التقرير</button></div>${chart({ kind: "line", labels: B.labels, tips: B.tips, series: typeSeries, f: "int" }, 220)}
      <div class="cx-leg">${A.TYPES.map(([k, l]) => `<span><i style="background:${TYPE_C[k]}"></i>${l} <b class="num">${ni(ok.filter(o => o.type === k).length)}</b></span>`).join("")}</div></div>
    <div class="cx-card"><div class="cx-ch"><h3>أعلى المدفوعات</h3><button class="cx-link" data-go="pays">عرض التقرير</button></div>${donut(by(ok, "method"), A.METHODS)}</div>
    <div class="cx-card"><div class="cx-ch"><h3>أعلى المنتجات حسب صافي البيع</h3><button class="cx-link" data-go="items">عرض التقرير</button></div>${donut(Object.entries(items))}</div>
    <div class="cx-card"><div class="cx-ch"><h3>أعلى الكاشيرين</h3><button class="cx-link" data-dtab="cash">التفاصيل</button></div>${donut(by(ok, "cashierName"))}</div>
    ${kpiCard({ t: "متوسط مدة التحضير", v: a.prep || 0, pv: st.cmp ? p.prep || 0 : null, inv: 1, html: a.prep == null ? `<span style="color:#A1A1AA">—</span>` : `<span class="num">${nf(a.prep, 1)}</span><small>دقيقة</small>`, s: S(ok, prepMin, "avg"), B, f: "min", color: "#0EA5E9" }).replace('<h3>متوسط مدة التحضير</h3>', '<h3>متوسط مدة التحضير</h3><button class="cx-link" data-dtab="kitchen">المطبخ</button>')}
  </div>`;
  /* بيانات التصدير */
  const K = [["الطلبات", a.n, p.n], ["صافي المبيعات", a.net, p.net], ["مجمل الربح", a.gp, p.gp], ["متوسط الطلب", a.avg, p.avg], ["مبلغ الخصم", a.disc, p.disc], ["مبلغ الإلغاء", a.vT, p.vT], ["نسبة التكلفة %", a.cpct, p.cpct], ["متوسط مدة التحضير (دقيقة)", a.prep, p.prep]];
  expT("المؤشرات", [["t", "المؤشر"], ["v", "الفترة الحالية"], ...(st.cmp ? [["p", CMPLAB], ["d", "التغير %"]] : [])],
    K.map(([t, v, pv]) => ({ t, v: v == null || !isFinite(v) ? "" : r2(v), p: pv == null || !isFinite(pv) ? "" : r2(pv), d: pv && isFinite(v) && isFinite(pv) ? r2((v - pv) / Math.abs(pv) * 100) : "" })));
  const so = S(ok, () => 1), sn = S(ok, o => o.total), sd = S(ok, o => o.discount?.amount || 0), sv = S(vd, o => o.total);
  expT(oneDay(R) ? "حسب الساعة" : "حسب اليوم", [["l", oneDay(R) ? "الساعة" : "اليوم"], ["o", "الطلبات"], ["n", "صافي المبيعات"], ["d", "الخصم"], ["v", "الإلغاء"]],
    B.keys.map((k, i) => ({ l: B.tips[i], o: so[i] ?? "", n: sn[i] == null ? "" : r2(sn[i]), d: sd[i] == null ? "" : r2(sd[i]), v: sv[i] == null ? "" : r2(sv[i]) })).filter(r => r.o !== ""));
  const mrows = Object.keys(A.METHODS).map(k => ({ k: A.METHODS[k], n: ok.filter(o => A.hasM(o, k)).length, v: r2(ok.reduce((s2, o) => s2 + A.paidBy(o, k), 0)) })).filter(r => r.n).sort((x, y) => y.v - x.v);
  expT("حسب طريقة الدفع", [["k", "طريقة الدفع"], ["n", "الطلبات"], ["v", "المبلغ"]], mrows);
  expT("حسب نوع الطلب", [["k", "النوع"], ["n", "الطلبات"], ["v", "المبلغ"]], A.TYPES.map(([k, l]) => { const g = ok.filter(o => o.type === k); return { k: l, n: g.length, v: r2(g.reduce((s2, o) => s2 + o.total, 0)) }; }).filter(r => r.n));
  expT("أعلى المنتجات", [["k", "المنتج"], ["v", "صافي البيع"]], Object.entries(items).sort((x, y) => y[1] - x[1]).map(([k, v]) => ({ k, v: r2(v) })));
  $$("[data-dtab]").forEach(b => b.onclick = () => { st.dtab = b.dataset.dtab; save(); PAGES.dash(); });
}
function dashKitchen(L) {
  const ok = L.filter(isOk), done = ok.filter(o => o.deliveredAt), open = ok.filter(o => o.prep === "open"), mins = done.map(prepMin), a = agg(L);
  const late = done.filter(o => prepMin(o) > 12), hrs = [...Array(24).keys()].map(i => (i + (A.S.config?.cutoff ?? 4)) % 24);
  const hp = hrs.map(h => { const g = done.filter(o => new Date(o.ts).getHours() === h).map(prepMin); return g.length ? g.reduce((x, y) => x + y, 0) / g.length : 0; });
  $("#dbody").innerHTML = `<div class="cx-stats">
      <div class="cx-st"><span>متوسط مدة التحضير</span><b>${a.prep == null ? "—" : `<span class="num">${nf(a.prep, 1)}</span> د`}</b><small>${ni(done.length)} طلب مسلّم</small></div>
      <div class="cx-st"><span>أسرع طلب</span><b>${mins.length ? `<span class="num">${nf(Math.min(...mins), 1)}</span> د` : "—"}</b></div>
      <div class="cx-st"><span>أبطأ طلب</span><b>${mins.length ? `<span class="num">${nf(Math.max(...mins), 1)}</span> د` : "—"}</b></div>
      <div class="cx-st"><span>تجاوزت 12 دقيقة</span><b class="num">${ni(late.length)}</b><small>${done.length ? pct(late.length / done.length * 100) + " من المسلّم" : ""}</small></div>
      <div class="cx-st"><span>لم تُعلَّم «تم التسليم»</span><b class="num">${ni(open.length)}</b><small>من ${ni(ok.length)} طلب</small></div></div>
    <div class="cx-grid"><div class="cx-card s3"><div class="cx-ch"><h3>متوسط مدة التحضير حسب الساعة</h3><span class="cx-sub2">بالدقائق</span></div>${chart({ kind: "bar", f: "min", labels: hrs.map(hrLab), series: [{ color: "#0EA5E9", values: hp }] }, 240)}</div></div>
    <div class="cx-tcard" style="margin-top:20px"><div class="cx-tbar"><h3>أبطأ الطلبات</h3></div><div id="kt"></div></div>
    ${open.length && done.length < ok.length / 2 ? `<p style="color:#71717A;font-size:13px;margin-top:12px">ملاحظة: مدة التحضير تُحسب فقط للطلبات التي ضغط الكاشير عليها «تم التسليم» في خانة «قيد التحضير».</p>` : ""}`;
  table("#kt", "kitchen", [{ k: "no", t: "الطلب", f: o => `<b class="num">${(o.no ?? "")}</b>` }, { k: "day", t: "اليوم", f: o => dLab(o.day) }, { k: "ts", t: "الوقت", f: o => `<span class="tm">${tm(o.ts)}</span>` },
    { k: "type", t: "النوع", f: o => typeTag(o.type) }, { k: "items", t: "الأصناف", sv: qtyOf, num: 1, f: o => `<span class="num">${qtyOf(o)}</span>` }, { k: "cashierName", t: "الكاشير" },
    { k: "m", t: "مدة التحضير", num: 1, sv: prepMin, f: o => `<b class="num" style="color:${prepMin(o) > 12 ? "#C2261F" : "inherit"}">${nf(prepMin(o), 1)} د</b>` }],
    done.sort((x, y) => prepMin(y) - prepMin(x)).slice(0, 15), { onRow: orderDrawer, empty: "لا توجد طلبات مسلّمة في هذه الفترة", title: "أبطأ الطلبات" });
}
async function dashCash(L, Lp, R) {
  const ok = L.filter(isOk), names = [...new Set(L.map(o => o.cashierName))];
  let shifts = []; try { shifts = (await load(R[0], R[1], "shifts")).filter(s => st.flt.test || !s.test); } catch {}
  const rows = names.map(n => { const g = L.filter(o => o.cashierName === n), a = agg(g), sh = shifts.filter(s => s.closedBy?.name === n && s.summary);
    const diff = sh.reduce((s, x) => s + r2(x.counted - x.summary.expected), 0);
    return { n, orders: a.n, net: a.net, avg: a.avg, discN: a.discN, disc: a.disc, vN: a.vN, vT: a.vT, shN: sh.length, diff, prep: a.prep }; });
  $("#dbody").innerHTML = `<div class="cx-grid"><div class="cx-card s2"><div class="cx-ch"><h3>صافي المبيعات حسب الكاشير</h3></div>${chart({ kind: "bar", labels: rows.map(r => r.n), series: [{ color: "#C1121F", values: rows.map(r => r.net) }], sub: rows.map(r => `${r.orders} طلب`) }, 240)}</div>
    <div class="cx-card"><div class="cx-ch"><h3>الطلبات حسب الكاشير</h3></div>${donut(rows.map(r => [r.n, r.orders]), {}, "int")}</div></div>
    <div class="cx-tcard" style="margin-top:20px"><div class="cx-tbar"><h3>أداء الكاشيرين</h3><span style="color:#71717A;font-size:13px">الخصومات والإلغاءات تتم برمز المدير، وفروقات الدرج من الورديات المقفلة</span></div><div id="ct"></div></div>`;
  const money = k => r => `<span class="num">${nf(r[k])}</span>`;
  table("#ct", "cash", [{ k: "n", t: "الكاشير", f: r => `<b>${esc(r.n)}</b>` }, { k: "orders", t: "الطلبات", num: 1, f: r => `<span class="num">${ni(r.orders)}</span>` }, { k: "net", t: "صافي المبيعات", num: 1, f: money("net") }, { k: "avg", t: "متوسط الطلب", num: 1, f: money("avg") },
    { k: "disc", t: "الخصومات", num: 1, f: r => `<span class="num">${nf(r.disc)}</span> <small style="color:#71717A">(${r.discN})</small>` }, { k: "vT", t: "الإلغاءات", num: 1, f: r => `<span class="num">${nf(r.vT)}</span> <small style="color:#71717A">(${r.vN})</small>` },
    { k: "prep", t: "متوسط التحضير", num: 1, sv: r => r.prep ?? -1, f: r => r.prep == null ? "—" : `<span class="num">${nf(r.prep, 1)}</span> د` }, { k: "shN", t: "ورديات أقفلها", num: 1, f: r => `<span class="num">${r.shN}</span>` },
    { k: "diff", t: "فروقات الدرج", num: 1, f: r => !r.shN ? "—" : Math.abs(r.diff) < .005 ? `<span class="cx-tag ok">مطابق</span>` : `<span class="cx-tag ${r.diff < 0 ? "bad" : "warn"} num">${r.diff < 0 ? "عجز " : "زيادة "}${nf(Math.abs(r.diff))}</span>` }],
    rows, { sort: "net", title: "أداء الكاشيرين", empty: "لا توجد طلبات" });
}

/* ---------- الطلبات ---------- */
PAGES.orders = async () => {
  const [rb, rbind] = rangeBtn(PAGES.orders);
  page(`<div class="cx-ctl">${rb}<div class="cx-seg">${[["all", "الكل"], ["paid", "مكتمل"], ["open", "قيد التحضير"], ["unpaid", "بانتظار الدفع"], ["disc", "عليه خصم"], ["void", "ملغي"]].map(([k, l]) => `<button data-s="${k}" class="${st.status === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div style="position:relative;display:flex;align-items:center"><input class="cx-in" id="oq" placeholder="بحث برقم الطلب أو رمز التحقق أو الجوال" value="${esc(st.q)}" style="width:250px;padding-inline-start:38px"><span style="position:absolute;inset-inline-start:10px;color:#A1A1AA;display:flex">${ic("search")}</span></div>
      <span class="cx-sp"></span>${fltBtn()}</div>${fltChips()}<div id="ob">${loadingTable()}</div>`, { acts: expBtn() });
  rbind(); bindExp();
  $$("[data-s]").forEach(b => b.onclick = () => { st.status = b.dataset.s; st.pg = 0; PAGES.orders(); });
  let all; try { all = await load(st.a, st.b); bindFlt(PAGES.orders, all.map(o => o.cashierName)); } catch (e) { $("#ob").innerHTML = errBox(e); return; }
  const draw = () => {
    const q = st.q.trim().toUpperCase().replace(/^0+/, "");
    const L = applyF(all).filter(o => (st.status === "all" || (st.status === "void" ? isVoid(o) : st.status === "disc" ? o.discount && isOk(o) : st.status === "open" ? o.prep === "open" && !isVoid(o) : st.status === "unpaid" ? isUnpaid(o) : isOk(o) && o.prep !== "open"))
      && (!q || String(o.no) === q || String(o.no).includes(q) || (o.code || "").includes(q) || (q.length >= 4 && (o.phone || "").includes(q)))).sort((x, y) => y.ts - x.ts);
    EXP = [];
    $("#ob").innerHTML = `<div class="cx-tcard"><div class="cx-tbar"><h3><span class="num">${ni(L.length)}</span> طلب</h3><span style="color:#71717A;font-size:13px">صافي <b class="num">${nf(L.filter(isOk).reduce((s, o) => s + o.total, 0))}</b> ر.س · اضغط على أي طلب لعرض تفاصيله</span></div><div id="otb"></div></div>`;
    table("#otb", "orders", [{ k: "no", t: "الرقم", num: 0, f: o => `<b class="num">${(o.no ?? "")}</b>` }, { k: "code", t: "رمز التحقق", f: o => `<span class="num" style="color:#71717A">${esc(o.code || "")}</span>` },
      { k: "status", t: "الحالة", sv: o => o.status + (o.prep || ""), f: o => statusTag(o) + (o.discount ? ` <span class="cx-tag warn">خصم</span>` : "") + (o.test ? ` <span class="cx-tag test">تجريبي</span>` : "") },
      { k: "type", t: "النوع", f: o => typeTag(o.type) }, { k: "method", t: "الدفع", f: o => mName(o) }, { k: "cashierName", t: "الكاشير" },
      { k: "total", t: "الإجمالي", num: 1, f: o => `<b class="num" style="${isOk(o) ? "" : "text-decoration:line-through;color:#A1A1AA"}">${nf(o.total)}</b>` },
      { k: "day", t: "تاريخ العمل", f: o => `<span class="num">${o.day}</span>` }, { k: "ts", t: "وقت الفتح", f: o => `<span class="tm">${tm(o.ts)}</span>` }],
      L, { pageSize: 25, onRow: orderDrawer, empty: "لا توجد طلبات مطابقة" });
  };
  let tmo; $("#oq").oninput = e => { st.q = e.target.value; st.pg = 0; clearTimeout(tmo); tmo = setTimeout(draw, 200); };
  draw();
};

/* ---------- تقرير المبيعات ---------- */
const GROUPS = { none: "لا شيء", day: "يوم", week: "أسبوع", month: "شهر", hour: "ساعة", cashier: "الكاشير", type: "نوع الطلب", method: "طريقة الدفع" };
const GROUPS_DEF = { day: "اليوم", week: "الأسبوع", month: "الشهر", hour: "الساعة" };   /* the same with «ال», inside a sentence */
function grpKey(o, g) { if (g === "day") return o.day; if (g === "week") return A.dshRange("week", o.day)[0]; if (g === "month") return o.day.slice(0, 7); if (g === "hour") return new Date(o.ts).getHours(); if (g === "cashier") return o.cashierName; if (g === "type") return o.type; if (g === "method") return o.pays?.length ? "split" : o.method; return "all"; }
function grpLabel(k, g) { if (g === "day") return dFull(k); if (g === "week") return `${dLab(k)} – ${dLab(A.addDays(k, 6))}`; if (g === "month") return `${AR_M[+k.slice(5) - 1]} ${k.slice(0, 4)}`; if (g === "hour") return `${hrLab(+k)} – ${hrLab((+k + 1) % 24)}`; if (g === "type") return A.TYPES.find(t => t[0] === k)?.[1] || k; if (g === "method") return k === "split" ? "مقسّم (كاش + شبكة)" : A.METHODS[k] || k; if (g === "none") return "كل المبيعات"; return k; }
const grpSel = (id, cur, opts) => `<label style="display:inline-flex;align-items:center;gap:8px;color:#71717A;font-size:14px">تجميع بـ<select class="cx-sel" id="${id}">${opts.map(k => `<option value="${k}" ${cur === k ? "selected" : ""}>${GROUPS[k]}</option>`).join("")}</select></label>`;
function salesCsv(L) { const ok = L.filter(o => isOk(o) && !o.test), rows = [["التاريخ", "طريقة الدفع", "المبلغ الصافي", "العدد"]];
  [...new Set(ok.map(o => o.day))].sort().forEach(d => Object.entries(A.METHODS).forEach(([k, l]) => { const g = ok.filter(o => o.day === d && A.hasM(o, k)); if (g.length) rows.push([d, l, nf(g.reduce((s, o) => s + A.paidBy(o, k), 0)).replace(/,/g, ""), g.length]); }));
  if (rows.length < 2) return A.toast("لا توجد مبيعات في هذه الفترة"); A.download(rows, `مبيعات-الكاشير-${st.a}${st.b !== st.a ? "_" + st.b : ""}.csv`); }
PAGES.sales = async () => {
  const [rb, rbind] = rangeBtn(PAGES.sales); let all = [];
  page(`<div class="cx-ctl">${rb}${grpSel("sg", st.grp, ["none", "day", "week", "month", "hour", "cashier", "type", "method"])}<span class="cx-sp"></span><button class="cx-btn ${st.chart ? "on" : ""}" id="sch">${ic("chart")}الرسم البياني</button>${fltBtn()}</div>${fltChips()}<div id="sb">${loadingTable()}</div>`,
    { sub: "صافي المبيعات والتكلفة والربح للفترة، مع إمكانية التجميع", acts: expBtn([["xs", "ملف المبيعات للمحاسبة", () => salesCsv(applyF(all))]]) });
  rbind(); bindExp();
  $("#sg").onchange = e => { st.grp = e.target.value; save(); PAGES.sales(); }; $("#sch").onclick = () => { st.chart = !st.chart; save(); PAGES.sales(); };
  try { all = await load(st.a, st.b); bindFlt(PAGES.sales, all.map(o => o.cashierName)); } catch (e) { $("#sb").innerHTML = errBox(e); return; }
  const L = applyF(all), a = agg(L), g = st.grp, keys = [...new Set(L.map(o => grpKey(o, g)))];
  const rows = keys.map(k => { const s = agg(L.filter(o => grpKey(o, g) === k)); return { k, label: grpLabel(k, g), ...s }; });
  if (["day", "week", "month", "hour"].includes(g)) rows.sort((x, y) => x.k < y.k ? -1 : 1); else rows.sort((x, y) => y.net - x.net);
  const m = k => r => `<span class="num">${nf(r[k])}</span>`; charts.clear(); EXP = [];
  $("#sb").innerHTML = `<div class="cx-stats"><div class="cx-st"><span>إجمالي المبيعات</span><b class="num">${nf(a.gross)}</b><small>قبل الخصم</small></div><div class="cx-st"><span>الخصومات</span><b class="num">${nf(a.disc)}</b><small>${a.discN} طلب</small></div>
      <div class="cx-st"><span>صافي المبيعات</span><b class="num">${nf(a.net)}</b><small>${ni(a.n)} طلب · ${ni(a.qty)} صنف</small></div><div class="cx-st"><span>التكلفة</span><b class="num">${nf(a.cost)}</b><small>طعام ${nf(a.food)} · تغليف ${nf(a.pack)}</small></div>
      <div class="cx-st"><span>مجمل الربح</span><b class="num" style="color:#15803D">${nf(a.gp)}</b><small>نسبة التكلفة ${pct(a.cpct)}</small></div><div class="cx-st"><span>الإلغاءات</span><b class="num">${nf(a.vT)}</b><small>${a.vN} طلب</small></div></div>
    ${st.chart && rows.length ? `<div class="cx-card" style="margin-bottom:20px"><div class="cx-ch"><h3>صافي المبيعات حسب ${GROUPS_DEF[g] || GROUPS[g]}</h3></div>${chart({ kind: rows.length > 16 ? "line" : "bar", labels: rows.map(r => g === "day" ? dLab(r.k) : r.label), tips: rows.map(r => r.label), series: [{ name: "صافي المبيعات", color: "#C1121F", values: rows.map(r => r.net) }], sub: rows.map(r => `${r.n} طلب`) }, 260)}</div>` : ""}
    <div class="cx-tcard"><div id="stb"></div></div>`;
  table("#stb", "sales" + g, [{ k: "label", t: GROUPS[g] === "لا شيء" ? "الفترة" : GROUPS[g], sv: r => r.k, f: r => `<b>${esc(r.label)}</b>` }, { k: "n", t: "الطلبات", num: 1, f: r => `<span class="num">${ni(r.n)}</span>` }, { k: "qty", t: "الكمية", num: 1, f: r => `<span class="num">${ni(r.qty)}</span>` },
    { k: "gross", t: "إجمالي المبيعات", num: 1, f: m("gross") }, { k: "disc", t: "الخصم", num: 1, f: m("disc") }, { k: "net", t: "صافي المبيعات", num: 1, f: r => `<b class="num">${nf(r.net)}</b>` }, { k: "vT", t: "الإلغاء", num: 1, f: m("vT") },
    { k: "cost", t: "التكلفة", num: 1, f: m("cost") }, { k: "gp", t: "مجمل الربح", num: 1, f: r => `<span class="num" style="color:#15803D;font-weight:600">${nf(r.gp)}</span>` }, { k: "cpct", t: "نسبة التكلفة", num: 1, sv: r => r.cpct || 0, f: r => `<span class="num">${pct(r.cpct)}</span>` }, { k: "avg", t: "متوسط الطلب", num: 1, f: m("avg") }],
    rows, { foot: { label: "المجموع", n: ni(a.n), qty: ni(a.qty), gross: nf(a.gross), disc: nf(a.disc), net: nf(a.net), vT: nf(a.vT), cost: nf(a.cost), gp: nf(a.gp), cpct: pct(a.cpct), avg: nf(a.avg) }, empty: "لا توجد مبيعات في هذه الفترة" });
  drawCharts();
};

/* ---------- المبيعات بالساعة: يختار المدير يوماً (أو فترة) وساعة أو أكثر، والساعة 6م تعني 6:00 إلى 6:59 ---------- */
const hrSpan = h => { const x = (h % 12) || 12, m = h < 12 ? "ص" : "م"; return `${x}:00 – ${x}:59 ${m}`; };
PAGES.hours = async () => {
  const [rb, rbind] = rangeBtn(PAGES.hours), cut = A.S.config?.cutoff ?? 4, HRS = [...Array(24).keys()].map(i => (i + cut) % 24);
  const sel = HRS.filter(h => st.hrs.includes(h));
  page(`<div class="cx-ctl">${rb}<span class="cx-sp"></span>${fltBtn()}</div>${fltChips()}
    <div class="cx-card" style="margin-bottom:16px"><div class="cx-ch"><h3>اختر الساعات</h3><div style="display:flex;gap:8px"><button class="cx-btn" id="hall">الكل</button><button class="cx-btn" id="hclr">مسح</button></div></div>
      <div class="cx-hrs">${HRS.map(h => `<button class="cx-hr ${st.hrs.includes(h) ? "on" : ""}" data-h="${h}" title="${hrSpan(h)}">${hrLab(h)}</button>`).join("")}</div>
      <p style="color:#71717A;font-size:13px;margin:10px 0 0">كل ساعة تشمل الدقائق من :00 إلى :59 — اضغط أكثر من ساعة لجمعها. الساعات بعد منتصف الليل تُحسب لليوم التجاري (الوردية) نفسه.</p></div>
    <div id="hb">${sel.length ? loadingTable() : emptyBox("اختر ساعة أو أكثر من الأعلى لعرض مبيعاتها")}</div>`,
    { sub: "مبيعات ساعة محددة أو مجموع عدة ساعات في يوم أو فترة", acts: expBtn() });
  rbind(); bindExp();
  const set = v => { st.hrs = v; save(); PAGES.hours(); };
  $$(".cx-hr").forEach(b => b.onclick = () => { const h = +b.dataset.h; set(st.hrs.includes(h) ? st.hrs.filter(x => x !== h) : [...st.hrs, h]); });
  $("#hall").onclick = () => set(HRS.slice()); $("#hclr").onclick = () => set([]);
  let all; try { all = await load(st.a, st.b); bindFlt(PAGES.hours, all.map(o => o.cashierName)); } catch (e) { $("#hb").innerHTML = errBox(e); return; }
  if (!sel.length) return;
  const L = applyF(all), hOf = o => new Date(o.ts).getHours(), inSel = L.filter(o => st.hrs.includes(hOf(o))), ok = inSel.filter(isOk);
  const dayTot = L.filter(isOk).reduce((s, o) => s + o.total, 0), a = agg(inSel), sum = G => G.reduce((s, o) => s + o.total, 0);
  const MS = Object.keys(A.METHODS).filter(k => k === "cash" || ok.some(o => A.hasM(o, k)));
  const row = (G, extra) => { const g = G.filter(isOk), s = agg(G); const r = { ...extra, n: s.n, net: s.net, avg: s.avg, vN: s.vN, vT: s.vT, share: dayTot ? s.net / dayTot * 100 : 0 }; MS.forEach(k => r["m_" + k] = g.reduce((s2, o) => s2 + A.paidBy(o, k), 0)); return r; };
  const rows = sel.map((h, i) => row(L.filter(o => hOf(o) === h), { h, i, label: hrSpan(h) }));
  const multi = st.a !== st.b, days = multi ? [...new Set(inSel.map(o => o.day))].sort() : [];
  charts.clear(); EXP = [];
  $("#hb").innerHTML = `<div class="cx-stats"><div class="cx-st"><span>صافي مبيعات الساعات المختارة</span><b class="num">${nf(a.net)}</b><small>${sel.length === 24 ? "كل الساعات" : sel.length > 6 ? `${ni(sel.length)} ساعات مختارة` : sel.map(hrLab).join(" + ")}</small></div>
      <div class="cx-st"><span>عدد الطلبات</span><b class="num">${ni(a.n)}</b><small>${ni(a.qty)} صنف</small></div>
      <div class="cx-st"><span>متوسط الطلب</span><b class="num">${nf(a.avg)}</b><small>للساعات المختارة</small></div>
      <div class="cx-st"><span>من مبيعات ${multi ? "الفترة" : "اليوم"}</span><b class="num">${dayTot ? pct(a.net / dayTot * 100) : "0%"}</b><small>من أصل ${nf(dayTot)}</small></div></div>
    <div class="cx-tcard"><div id="htb"></div></div>${multi ? `<h3 style="margin:22px 0 10px;font-size:16px">الساعات المختارة حسب اليوم</h3><div class="cx-tcard"><div id="hdb"></div></div>` : ""}`;
  const mc = MS.map(k => ({ k: "m_" + k, t: A.METHODS[k], num: 1, f: r => `<span class="num">${nf(r["m_" + k])}</span>` }));
  const base = [{ k: "n", t: "الطلبات", num: 1, f: r => `<span class="num">${ni(r.n)}</span>` }, ...mc, { k: "net", t: "صافي المبيعات", num: 1, f: r => `<b class="num">${nf(r.net)}</b>` },
    { k: "avg", t: "متوسط الطلب", num: 1, f: r => `<span class="num">${nf(r.avg)}</span>` }, { k: "vT", t: "الإلغاءات", num: 1, f: r => `<span class="num">${nf(r.vT)}</span>${r.vN ? ` <small style="color:#71717A">(${r.vN})</small>` : ""}` },
    { k: "share", t: "النسبة", num: 1, f: r => `<span class="num">${pct(r.share)}</span>` }];
  const g = row(inSel, {}), foot = { n: ni(g.n), net: nf(g.net), avg: nf(g.avg), vT: nf(g.vT), share: pct(g.share), ...Object.fromEntries(MS.map(k => ["m_" + k, nf(g["m_" + k])])) };
  table("#htb", "hours", [{ k: "label", t: "الساعة", sv: r => r.i, f: r => `<b dir="rtl">${r.label}</b>` }, ...base], rows,
    { foot: { label: sel.length > 1 ? `مجموع ${ni(sel.length)} ساعات` : "المجموع", ...foot }, title: "المبيعات بالساعة", empty: "لا توجد مبيعات في الساعات المختارة" });
  if (multi) table("#hdb", "hoursd", [{ k: "label", t: "اليوم", sv: r => r.d, f: r => `<b>${esc(r.label)}</b>` }, ...base], days.map(d => row(inSel.filter(o => o.day === d), { d, label: dFull(d) })),
    { foot: { label: "المجموع", ...foot }, title: "الساعات المختارة حسب اليوم", empty: "لا توجد مبيعات في الساعات المختارة" });
};

/* ---------- تقرير المدفوعات ---------- */
PAGES.pays = async () => {
  const [rb, rbind] = rangeBtn(PAGES.pays);
  page(`<div class="cx-ctl">${rb}${grpSel("pg2", st.pgrp, ["none", "day", "week", "month", "cashier"])}<span class="cx-sp"></span><button class="cx-btn ${st.chart ? "on" : ""}" id="pch">${ic("chart")}الرسم البياني</button>${fltBtn()}</div>${fltChips()}<div id="pb">${loadingTable()}</div>`,
    { sub: "المبالغ المحصّلة حسب طريقة الدفع", acts: expBtn() });
  rbind(); bindExp(); $("#pg2").onchange = e => { st.pgrp = e.target.value; save(); PAGES.pays(); }; $("#pch").onclick = () => { st.chart = !st.chart; save(); PAGES.pays(); };
  let all; try { all = await load(st.a, st.b); bindFlt(PAGES.pays, all.map(o => o.cashierName)); } catch (e) { $("#pb").innerHTML = errBox(e); return; }
  const L = applyF(all), g = st.pgrp, ok = L.filter(isOk), tot = ok.reduce((s, o) => s + o.total, 0), rows = [];
  [...new Set(L.map(o => grpKey(o, g)))].sort().forEach(k => Object.entries(A.METHODS).forEach(([mk, ml]) => {
    const G = L.filter(o => grpKey(o, g) === k && A.hasM(o, mk)); if (!G.length && g !== "none") return; const gok = G.filter(isOk), gv = G.filter(o => isVoid(o)), net = gok.reduce((s, o) => s + A.paidBy(o, mk), 0), vT = gv.reduce((s, o) => s + A.paidBy(o, mk), 0);
    rows.push({ gk: k, grp: grpLabel(k, g), m: mk, ml, n: gok.length, val: net + vT, vN: gv.length, vT, net, share: tot ? net / tot * 100 : 0 }); }));
  const byM = Object.entries(A.METHODS).map(([k, l]) => [k, ok.reduce((s, o) => s + A.paidBy(o, k), 0)]);
  charts.clear(); EXP = [];
  $("#pb").innerHTML = `<div class="cx-stats">${Object.entries(A.METHODS).map(([k, l]) => { const v = byM.find(x => x[0] === k)[1]; return `<div class="cx-st"><span>${l}</span><b class="num">${nf(v)}</b><small>${ni(ok.filter(o => A.hasM(o, k)).length)} عملية · ${tot ? pct(v / tot * 100) : "0%"}</small></div>`; }).join("")}<div class="cx-st"><span>المجموع</span><b class="num">${nf(tot)}</b><small>${ni(ok.length)} عملية</small></div></div>
    ${st.chart ? `<div class="cx-grid" style="margin-bottom:20px"><div class="cx-card"><div class="cx-ch"><h3>نسبة طرق الدفع</h3></div>${donut(byM, A.METHODS)}</div>
      <div class="cx-card s2"><div class="cx-ch"><h3>المبالغ حسب الطريقة</h3></div>${chart({ kind: "bar", labels: byM.map(x => A.METHODS[x[0]]), series: [{ color: "#1F4E9E", values: byM.map(x => x[1]) }] }, 230)}</div></div>` : ""}
    <div class="cx-tcard"><div id="ptb"></div></div>`;
  const cols = [...(g !== "none" ? [{ k: "grp", t: GROUPS[g], sv: r => r.gk, f: r => `<b>${esc(r.grp)}</b>` }] : []), { k: "ml", t: "طريقة الدفع", f: r => `<b>${r.ml}</b>` }, { k: "n", t: "العدد", num: 1, f: r => `<span class="num">${ni(r.n)}</span>` },
    { k: "val", t: "القيمة", num: 1, f: r => `<span class="num">${nf(r.val)}</span>` }, { k: "vT", t: "مبلغ الإلغاء", num: 1, f: r => `<span class="num">${nf(r.vT)}</span>${r.vN ? ` <small style="color:#71717A">(${r.vN})</small>` : ""}` },
    { k: "net", t: "المبلغ الصافي", num: 1, f: r => `<b class="num">${nf(r.net)}</b>` }, { k: "share", t: "النسبة", num: 1, f: r => `<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="cx-bar"><i style="width:${r.share}%"></i></div><span class="num">${pct(r.share)}</span></div>` }];
  table("#ptb", "pays" + g, cols, rows, { foot: { [g !== "none" ? "grp" : "ml"]: "المجموع", n: ni(ok.length), val: nf(tot + L.filter(o => isVoid(o)).reduce((s, o) => s + o.total, 0)), vT: nf(L.filter(o => isVoid(o)).reduce((s, o) => s + o.total, 0)), net: nf(tot), share: "100%" } });
  drawCharts();
};

/* ---------- تحليل القائمة ---------- */
const ENG = { star: ["نجم", "ok", "مبيعات عالية وربح عالٍ: حافظ عليه وأبرزه"], horse: ["محبوب", "blue", "مبيعات عالية وربح أقل: راجع تكلفته أو سعره"], puzzle: ["لغز", "warn", "ربح عالٍ ومبيعات أقل: روّج له"], dog: ["ضعيف", "bad", "مبيعات وربح منخفضان: فكّر في تطويره أو إيقافه"] };
function itemsAgg(L) {
  const ok = L.filter(isOk), it = {}, catOf = id => A.S.menu.find(m => m.id === id)?.cat || "";
  const add = (key, name, cat, q, g, f, c) => { const x = it[key] ||= { name, cat, q: 0, gross: 0, net: 0, cost: 0, nc: false, vq: 0, ref: key }; x.q += q; x.gross += g; x.net += g * f; if (c == null) x.nc = true; else x.cost += c * q; };
  ok.forEach(o => { const f = o.subtotal ? o.total / o.subtotal : 1; o.lines.forEach(l => { add(l.ref || l.name, l.name, catOf(l.id), l.qty, l.qty * l.price, f, l.cost ?? A.itemCost(l.id)); l.mods.forEach(m => add(m.ref || m.name, m.name, catOf(m.id) || "extras", l.qty, l.qty * m.price, f, m.cost ?? A.itemCost(m.id))); }); });
  L.filter(o => isVoid(o)).forEach(o => o.lines.forEach(l => { const x = it[l.ref || l.name]; if (x) x.vq += l.qty; }));
  const V = Object.values(it), T = V.reduce((s, x) => s + x.net, 0), main = V.filter(x => !x.nc && x.q > 0);
  const aq = main.length ? main.reduce((s, x) => s + x.q, 0) / main.length : 0, am = main.length ? main.reduce((s, x) => s + (x.net - x.cost) / x.q, 0) / main.length : 0;
  V.forEach(x => { x.disc = x.gross - x.net; x.share = T ? x.net / T * 100 : 0; x.gp = x.net - x.cost; x.cpct = x.net && !x.nc ? x.cost / x.net * 100 : NaN; x.um = x.q ? x.gp / x.q : 0;
    x.eng = x.nc || !x.q ? null : x.q >= aq ? (x.um >= am ? "star" : "horse") : (x.um >= am ? "puzzle" : "dog"); });
  return { V, T };
}
PAGES.items = async () => {
  const [rb, rbind] = rangeBtn(PAGES.items); let all = [];
  page(`<div class="cx-ctl">${rb}<select class="cx-sel" id="icat"><option value="">كل الأقسام</option>${A.CATS.map(([k, l]) => `<option value="${k}" ${st.cat === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div style="position:relative;display:flex;align-items:center"><input class="cx-in" id="iq" placeholder="بحث عن منتج" style="width:200px;padding-inline-start:38px"><span style="position:absolute;inset-inline-start:10px;color:#A1A1AA;display:flex">${ic("search")}</span></div>
    <span class="cx-sp"></span><button class="cx-btn ${st.chart ? "on" : ""}" id="ich">${ic("chart")}الرسم البياني</button>${fltBtn()}</div>${fltChips()}<div id="ib">${loadingTable()}</div>`,
    { sub: "مبيعات كل منتج وتكلفته وربحه، وتصنيفه في هندسة القائمة", acts: expBtn([["xi", "ملف الأصناف للمحاسبة", () => itemsCsv(applyF(all))]]) });
  rbind(); bindExp(); $("#icat").onchange = e => { st.cat = e.target.value; PAGES.items(); }; $("#ich").onclick = () => { st.chart = !st.chart; save(); PAGES.items(); };
  try { all = await load(st.a, st.b); bindFlt(PAGES.items, all.map(o => o.cashierName)); } catch (e) { $("#ib").innerHTML = errBox(e); return; }
  const { V, T } = itemsAgg(applyF(all)), base = V.filter(x => !st.cat || x.cat === st.cat), catL = k => A.CATS.find(c => c[0] === k)?.[1] || "—";
  const draw = (q = "") => {
    const R = base.filter(x => !q || x.name.includes(q)); charts.clear(); EXP = [];
    const tq = R.reduce((s, x) => s + x.q, 0), tn = R.reduce((s, x) => s + x.net, 0), tc = R.reduce((s, x) => s + x.cost, 0), top = R.slice().sort((a, b) => b.net - a.net).slice(0, 10);
    $("#ib").innerHTML = `${st.chart && top.length ? `<div class="cx-card" style="margin-bottom:20px"><div class="cx-ch"><h3>أعلى ${top.length} منتجات حسب صافي البيع</h3></div>${chart({ kind: "bar", labels: top.map(x => x.name.length > 10 ? x.name.slice(0, 9) + "…" : x.name), tips: top.map(x => x.name), sub: top.map(x => `${x.q} حبة`), series: [{ color: "#C1121F", values: top.map(x => x.net) }] }, 260)}</div>` : ""}
      <div class="cx-tcard"><div id="itb"></div></div>
      <div class="cx-leg" style="justify-content:flex-start;margin-top:14px">${Object.values(ENG).map(([l, c, d]) => `<span><span class="cx-tag ${c}">${l}</span><span style="color:#71717A">${d}</span></span>`).join("")}</div>`;
    table("#itb", "items", [{ k: "name", t: "المنتج", f: x => `<b>${esc(x.name)}</b>` }, { k: "cat", t: "القسم", f: x => catL(x.cat) }, { k: "q", t: "الكمية", num: 1, f: x => `<span class="num">${ni(x.q)}</span>` },
      { k: "gross", t: "إجمالي المبيعات", num: 1, f: x => `<span class="num">${nf(x.gross)}</span>` }, { k: "net", t: "صافي المبيعات", num: 1, f: x => `<b class="num">${nf(x.net)}</b>` },
      { k: "share", t: "من المبيعات", num: 1, f: x => `<div style="display:flex;align-items:center;gap:8px;justify-content:flex-end"><div class="cx-bar"><i style="width:${Math.min(100, x.share * 3)}%"></i></div><span class="num">${pct(x.share)}</span></div>` },
      { k: "cost", t: "التكلفة", num: 1, f: x => x.nc ? `<span class="cx-tag warn">بدون تكلفة</span>` : `<span class="num">${nf(x.cost)}</span>` },
      { k: "cpct", t: "نسبة التكلفة", num: 1, sv: x => isNaN(x.cpct) ? -1 : x.cpct, f: x => isNaN(x.cpct) ? "—" : `<span class="cx-tag ${x.cpct > 45 ? "bad" : x.cpct > 35 ? "warn" : "ok"} num">${pct(x.cpct)}</span>` },
      { k: "gp", t: "الربح", num: 1, f: x => x.nc ? "—" : `<span class="num" style="color:#15803D;font-weight:600">${nf(x.gp)}</span>` },
      { k: "vq", t: "الإلغاء", num: 1, f: x => `<span class="num">${ni(x.vq)}</span>` }, { k: "eng", t: "التصنيف", sv: x => ["star", "horse", "puzzle", "dog"].indexOf(x.eng), f: x => x.eng ? `<span class="cx-tag ${ENG[x.eng][1]}" title="${ENG[x.eng][2]}">${ENG[x.eng][0]}</span>` : "—" }],
      R, { sort: "net", foot: { name: "المجموع", q: ni(tq), net: nf(tn), share: T ? pct(tn / T * 100) : "", cost: nf(tc), gp: nf(tn - tc), gross: nf(R.reduce((s, x) => s + x.gross, 0)), vq: ni(R.reduce((s, x) => s + x.vq, 0)), cpct: tn ? pct(tc / tn * 100) : "" }, empty: "لا توجد مبيعات" });
    drawCharts();
  };
  let tmo; $("#iq").oninput = e => { clearTimeout(tmo); tmo = setTimeout(() => draw(e.target.value.trim()), 180); };
  draw();
};
function itemsCsv(L) { const { V } = itemsAgg(L.filter(o => !o.test)); if (!V.length) return A.toast("لا توجد مبيعات في هذه الفترة");
  A.download([["المنتج", "كود تعريف المنتج", "صافي الكمية", "صافي المبيعات", "إجمالي المبيعات", "كمية الإلغاء"], ...V.map(x => [x.name, x.ref || "", x.q, nf(x.net).replace(/,/g, ""), nf(x.gross).replace(/,/g, ""), x.vq])], `أصناف-الكاشير-${st.a}${st.b !== st.a ? "_" + st.b : ""}.csv`); }

/* ---------- الخصومات والإلغاءات ---------- */
PAGES.disc = async () => {
  const [rb, rbind] = rangeBtn(PAGES.disc);
  page(`<div class="cx-tabs">${[["disc", "الخصومات"], ["void", "الإلغاءات"], ["type", "تغيير نوع الطلب"]].map(([k, l]) => `<button data-k="${k}" class="${st.dkind === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="cx-ctl">${rb}<span class="cx-sp"></span>${fltBtn()}</div>${fltChips()}<div id="xb">${loadingTable()}</div>`, { sub: "كل عملية تمت برمز المدير مع سببها، للمتابعة ومنع التلاعب", acts: expBtn() });
  rbind(); bindExp(); $$("[data-k]").forEach(b => b.onclick = () => { st.dkind = b.dataset.k; save(); PAGES.disc(); });
  let all; try { all = await load(st.a, st.b); bindFlt(PAGES.disc, all.map(o => o.cashierName)); } catch (e) { $("#xb").innerHTML = errBox(e); return; }
  const L = applyF(all), net = L.filter(isOk).reduce((s, o) => s + o.total, 0), k = st.dkind; EXP = [];
  const R = k === "disc" ? L.filter(o => o.discount && isOk(o)) : k === "void" ? L.filter(o => isVoid(o)) : L.filter(o => o.typeChanges?.length);
  const amt = o => k === "disc" ? o.discount.amount : o.total, sum = R.reduce((s, o) => s + amt(o), 0);
  const reasons = {}; R.forEach(o => { const r = (k === "disc" ? o.discount?.reason : o.void?.reason) || "—"; reasons[r] = (reasons[r] || 0) + 1; });
  const topR = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0];
  $("#xb").innerHTML = `<div class="cx-stats"><div class="cx-st"><span>عدد العمليات</span><b class="num">${ni(R.length)}</b></div>${k !== "type" ? `<div class="cx-st"><span>المبلغ</span><b class="num">${nf(sum)}</b><small>${net ? pct(sum / net * 100) + " من صافي المبيعات" : ""}</small></div>
    <div class="cx-st"><span>أكثر سبب</span><b style="font-size:17px">${topR ? esc(topR[0]) : "—"}</b><small>${topR ? topR[1] + " مرة" : ""}</small></div>` : ""}</div><div class="cx-tcard"><div id="xtb"></div></div>`;
  const base = [{ k: "no", t: "الطلب", f: o => `<b class="num">${(o.no ?? "")}</b>` }, { k: "day", t: "اليوم", f: o => `<span class="num">${o.day}</span>` }, { k: "ts", t: "الوقت", f: o => `<span class="tm">${tm(k === "void" ? o.void.at : o.ts)}</span>` }, { k: "cashierName", t: "الكاشير" }];
  const cols = k === "disc" ? [...base, { k: "subtotal", t: "قبل الخصم", num: 1, f: o => `<span class="num">${nf(o.subtotal)}</span>` }, { k: "amt", t: "الخصم", num: 1, sv: amt, f: o => `<b class="num" style="color:#B45309">${nf(o.discount.amount)}</b>${o.discount.kind === "pct" ? ` <small style="color:#71717A">(${o.discount.value}%)</small>` : ""}` }, { k: "total", t: "بعد الخصم", num: 1, f: o => `<span class="num">${nf(o.total)}</span>` }, { k: "reason", t: "السبب", sv: o => o.discount.reason, cls: "wrap", f: o => esc(o.discount.reason) }]
    : k === "void" ? [...base, { k: "method", t: "الدفع", f: o => mName(o) }, { k: "total", t: "المبلغ", num: 1, f: o => `<b class="num" style="color:#C2261F">${nf(o.total)}</b>` }, { k: "reason", t: "السبب", sv: o => o.void?.reason, cls: "wrap", f: o => esc(o.void?.reason) }, { k: "by", t: "ألغاه", sv: o => o.void?.cashierName, f: o => esc(o.void?.cashierName || "") + ` <small style="color:#71717A">بموافقة المدير</small>` }]
    : [...base, { k: "chg", t: "التغيير", sv: o => o.typeChanges.length, f: o => o.typeChanges.map(c => `${A.TYPES.find(t => t[0] === c.from)?.[1]} ← ${A.TYPES.find(t => t[0] === c.to)?.[1]}`).join("، ") }, { k: "by", t: "بواسطة", sv: o => o.typeChanges.at(-1).by, f: o => esc(o.typeChanges.at(-1).by) }, { k: "total", t: "المبلغ", num: 1, f: o => `<span class="num">${nf(o.total)}</span>` }];
  table("#xtb", "disc" + k, cols, R.sort((a, b) => b.ts - a.ts), { onRow: orderDrawer, foot: k === "type" ? null : { no: "المجموع", [k === "disc" ? "amt" : "total"]: nf(sum) }, empty: k === "disc" ? "لا توجد خصومات في هذه الفترة" : k === "void" ? "لا توجد إلغاءات في هذه الفترة" : "لا توجد تغييرات" });
};

/* ---------- الورديات ---------- */
const diffTag = sh => { if (!sh.summary) return `<span class="cx-tag blue">مفتوحة</span>`; const d = r2(sh.counted - sh.summary.expected); return Math.abs(d) < .005 ? `<span class="cx-tag ok">مطابق</span>` : `<span class="cx-tag ${d < 0 ? "bad" : "warn"} num">${d < 0 ? "عجز" : "زيادة"} ${nf(Math.abs(d))}</span>`; };
PAGES.shifts = async () => {
  if (st.a === st.b && st.a === A.bizDay() && !PAGES.shifts.init) { st.a = A.addDays(st.b, -6); PAGES.shifts.init = 1; }
  const [rb, rbind] = rangeBtn(PAGES.shifts);
  page(`<div class="cx-ctl">${rb}<span class="cx-sp"></span><button class="cx-sw ${st.flt.test ? "on" : ""}" id="shx" type="button"><i></i>إظهار التجريبي</button></div><div id="shb">${loadingTable()}</div>`, { sub: "فتح الورديات وتقفيلها، وعدّ الدرج والفروقات", acts: expBtn() });
  rbind(); bindExp(); $("#shx").onclick = () => { st.flt.test = !st.flt.test; save(); PAGES.shifts(); };
  let L; try { L = (await load(st.a, st.b, "shifts")).filter(s => st.flt.test || !s.test).sort((a, b) => b.openedAt - a.openedAt); } catch (e) { $("#shb").innerHTML = errBox(e); return; }
  const cl = L.filter(s => s.summary), dsum = cl.reduce((s, x) => s + r2(x.counted - x.summary.expected), 0), short = cl.filter(x => x.counted - x.summary.expected < -.005).length; EXP = [];
  $("#shb").innerHTML = `<div class="cx-stats"><div class="cx-st"><span>الورديات</span><b class="num">${ni(L.length)}</b><small>${ni(L.length - cl.length)} مفتوحة</small></div><div class="cx-st"><span>مبيعات الورديات المقفلة</span><b class="num">${nf(cl.reduce((s, x) => s + x.summary.total, 0))}</b></div>
    <div class="cx-st"><span>صافي فروقات الدرج</span><b class="num" style="color:${dsum < -.005 ? "#C2261F" : dsum > .005 ? "#B45309" : "#15803D"}">${nf(dsum)}</b><small>${short} وردية بعجز</small></div></div><div class="cx-tcard"><div id="shtb"></div></div>`;
  table("#shtb", "shifts", [{ k: "day", t: "اليوم", f: s => `<span class="num">${s.day}</span>${s.test ? ` <span class="cx-tag test">تجريبي</span>` : ""}` }, { k: "openedAt", t: "الفتح", f: s => `<span class="tm">${tm(s.openedAt)}</span>` }, { k: "closedAt", t: "التقفيل", sv: s => s.closedAt || 0, f: s => s.closedAt ? `<span class="tm">${tm(s.closedAt)}</span>` : "—" },
    { k: "cash", t: "الكاشيرون", sv: s => (s.cashiers || []).join("،"), cls: "wrap", f: s => esc((s.cashiers || [s.openedBy?.name]).join("، ")) }, { k: "total", t: "المبيعات", num: 1, sv: s => s.summary?.total ?? -1, f: s => s.summary ? `<span class="num">${nf(s.summary.total)}</span>` : "—" },
    { k: "exp", t: "المتوقع في الدرج", num: 1, sv: s => s.summary?.expected ?? -1, f: s => s.summary ? `<span class="num">${nf(s.summary.expected)}</span>` : "—" }, { k: "counted", t: "المعدود", num: 1, sv: s => s.counted ?? -1, f: s => s.counted != null ? `<span class="num">${nf(s.counted)}</span>` : "—" },
    { k: "diff", t: "الفرق", sv: s => s.summary ? s.counted - s.summary.expected : 0, f: diffTag }], L, { onRow: shiftDrawer, empty: "لا توجد ورديات في هذه الفترة" });
};
async function shiftDrawer(sh) {
  const c = sh.summary; let img = "";
  try { img = (await A.drawShiftReport(sh, [])).toDataURL("image/png"); } catch {}
  drawer(`<h2>وردية <span class="num">${dLab(sh.day)}</span></h2>${diffTag(sh)}`,
    `<div class="cx-sec"><div class="cx-kv"><div><span>الفتح</span><b><span class="tm">${tm(sh.openedAt)}</span> · ${esc(sh.openedBy?.name)}</b></div><div><span>التقفيل</span><b>${sh.closedAt ? `<span class="tm">${tm(sh.closedAt)}</span> · ${esc(sh.closedBy?.name)}` : "مفتوحة"}</b></div>
      <div><span>فكّة البداية</span><b class="num">${nf(sh.float)}</b></div><div><span>الكاشيرون</span><b>${esc((sh.cashiers || []).join("، "))}</b></div>
      ${c ? `<div><span>مبيعات الكاش</span><b class="num">${nf(c.m.cash)}</b></div><div><span>الإيداعات / المصروفات</span><b class="num">${nf(c.cin)} / ${nf(c.cout)}</b></div>
      ${c.mode === "float" ? `<div><span>العهدة / المعدودة</span><b class="num">${nf(c.expected)} / ${nf(sh.counted)}</b></div><div><span>كاش المبيعات للتسليم</span><b class="num">${nf(c.salesCash)}</b></div>`
        : `<div><span>المتوقع في الدرج</span><b class="num">${nf(c.expected)}</b></div><div><span>المعدود</span><b class="num">${nf(sh.counted)}</b></div>`}
      <div><span>إجمالي المبيعات</span><b class="num">${nf(c.total)} <small style="color:#71717A">(${c.count} طلب)</small></b></div><div><span>جهاز الشبكة</span><b class="num">${sh.terminal != null ? nf(sh.terminal) + " / " + nf(c.m.mada + c.m.visa) : "—"}</b></div>` : ""}</div>
      ${sh.note ? `<p style="background:#FFF5E6;color:#92400E;padding:10px 12px;border-radius:10px;margin:12px 0 0">ملاحظة: ${esc(sh.note)}</p>` : ""}</div>
    ${(sh.moves || []).length ? `<div class="cx-sec"><h4>حركات الدرج</h4><ul class="cx-tl">${sh.moves.map(m => `<li><b>${m.kind === "in" ? "إيداع" : "صرف"} <span class="num">${nf(m.amount)}</span></b><small><span class="tm">${tm(m.at)}</span> · ${esc(m.reason)} · ${esc(m.by)}</small></li>`).join("")}</ul></div>` : ""}
    ${img ? `<div class="cx-sec"><h4>تقرير الوردية</h4><img src="${img}" alt="تقرير الوردية" style="width:300px;max-width:100%;border:1px solid #E7E7EB;border-radius:8px;display:block;margin:0 auto"></div>` : ""}`,
    (c ? `<button class="cx-btn pri" id="zp">${ic("print")}طباعة تقرير الوردية</button>` : "")
      + (A.S.role === "admin" ? `<button class="cx-btn" id="zt" style="margin-inline-start:auto">${sh.test ? "إرجاعها وردية حقيقية" : "تحويلها إلى تجريبية"}</button>` : ""),
    d => { d.querySelector("#zp") && (d.querySelector("#zp").onclick = async () => A.printCanvas(await A.drawShiftReport(sh, []), true));
      d.querySelector("#zt") && (d.querySelector("#zt").onclick = () => markShiftTest(sh, !sh.test, d.querySelector("#zt"))); });
}
/* the owner only: a shift run by mistake outside test mode (setup, printer trials) becomes test with all its orders, so it leaves the
   reports, the shift list and the accounting import; nothing is deleted, and the same button turns it back */
async function markShiftTest(sh, on, btn) {
  btn.disabled = true;
  try {
    const os = (await A.F.getDocs(A.F.query(A.C("orders"), A.F.where("shiftId", "==", sh.id)))).docs.map(x => x.data());
    /* an open shift with sales is still in use on a device; an empty one left open (another browser, a trial) can go */
    if (sh.status === "open" && on && os.some(o => !o.test)) { btn.disabled = false; return A.toast("قفّل الوردية من الكاشير أولاً، ثم حوّلها إلى تجريبية", true); }
    const sum = r2(os.filter(isOk).reduce((s, o) => s + (+o.total || 0), 0));
    if (!confirm(on ? `تحويل وردية ${dLab(sh.day)} (فتحت ${tm(sh.openedAt)}) و${os.length} طلب فيها بمبلغ ${nf(sum)} ر.س إلى تجريبية؟\nتخرج من التقارير والمحاسبة، ولا يُحذف شيء، ويمكن إرجاعها من نفس الزر.`
      : `إرجاع وردية ${dLab(sh.day)} و${os.length} طلب فيها إلى المبيعات الحقيقية؟`)) { btn.disabled = false; return; }
    const mark = on ? { test: true, testMarked: { at: Date.now(), by: "owner" } } : { test: false, testMarked: null };
    await Promise.all([...os.map(o => A.F.updateDoc(A.D("orders", o.id), mark)), A.F.updateDoc(A.D("shifts", sh.id), mark)]);
    cache.clear(); A.toast(on ? `تم: الوردية و${os.length} طلب صارت تجريبية` : "تم إرجاعها إلى المبيعات الحقيقية");
    closeDrawer?.(); PAGES.shifts();
  } catch (e) { btn.disabled = false; A.toast("تعذّر التحويل: " + (e?.code || e?.message || ""), true); }
}

/* ---------- العملاء: يُجمَّع كل رقم جوال في سطر واحد مهما تكرر طلبه ---------- */
let phoneCache = null;
async function loadPhones() {
  if (phoneCache && Date.now() - phoneCache.t < 45e3) return phoneCache.L;
  const s = await A.F.getDocs(A.F.query(A.C("orders"), A.F.where("phone", ">=", "0")));
  const L = s.docs.map(d => d.data()).filter(o => o.phone); phoneCache = { t: Date.now(), L }; return L;
}
const normPh = p => { let d = String(p || "").replace(/\D/g, ""); if (d.startsWith("966")) d = "0" + d.slice(3); if (d.length === 9 && d[0] === "5") d = "0" + d; return d; };
function customers(L) {
  const m = new Map();
  L.forEach(o => { const k = normPh(o.phone); if (!k) return; const c = m.get(k) || m.set(k, { phone: k, orders: [], names: new Map() }).get(k); c.orders.push(o); if (o.name?.trim()) c.names.set(o.name.trim(), Math.max(c.names.get(o.name.trim()) || 0, o.ts)); });
  return [...m.values()].map(c => {
    const all = c.orders.sort((a, b) => b.ts - a.ts), ok = all.filter(isOk), ty = {};
    ok.forEach(o => ty[o.type] = (ty[o.type] || 0) + 1);
    const types = Object.entries(ty).sort((a, b) => b[1] - a[1]), names = [...c.names].sort((a, b) => b[1] - a[1]).map(x => x[0]);
    return { phone: c.phone, name: names[0] || "", names, all, n: ok.length, value: r2(ok.reduce((s, o) => s + o.total, 0)), avg: ok.length ? ok.reduce((s, o) => s + o.total, 0) / ok.length : 0,
      last: all[0].ts, first: all[all.length - 1].ts, types, mainType: types[0]?.[0] || "", noshow: all.filter(o => isVoid(o) && o.void?.unpaid).length, open: all.filter(isUnpaid).length };
  });
}
const typesHtml = c => c.types.length ? c.types.map(([k, n]) => `${typeTag(k).replace("</span>", ` <b class="num">${n}</b></span>`)}`).join(" ") : `<span style="color:#A1A1AA">—</span>`;
const typesTxt = c => c.types.map(([k, n]) => `${A.TYPES.find(t => t[0] === k)?.[1] || k} (${n})`).join("، ");
PAGES.customers = async () => {
  const [rb, rbind] = rangeBtn(PAGES.customers), all = st.cAll !== false;
  page(`<div class="cx-ctl"><div class="cx-seg"><button data-ca="1" class="${all ? "on" : ""}">كل الفترات</button><button data-ca="0" class="${all ? "" : "on"}">فترة محددة</button></div>${all ? "" : rb}
      <div style="position:relative;display:flex;align-items:center"><input class="cx-in" id="cq" placeholder="بحث بالاسم أو رقم الجوال" value="${esc(st.cq || "")}" style="width:240px;padding-inline-start:38px"><span style="position:absolute;inset-inline-start:10px;color:#A1A1AA;display:flex">${ic("search")}</span></div>
      <span class="cx-sp"></span>${fltBtn()}</div>${fltChips()}<div id="cb">${loadingTable()}</div>`,
    { sub: "كل عميل سُجّل رقم جواله في طلب، مرة واحدة مهما تكرر طلبه — اضغط على العميل لعرض طلباته", acts: expBtn() });
  if (!all) rbind(); bindExp();
  $$("[data-ca]").forEach(b => b.onclick = () => { st.cAll = b.dataset.ca === "1"; st.pg = 0; save(); PAGES.customers(); });
  let L; try { L = await loadPhones(); bindFlt(PAGES.customers, L.map(o => o.cashierName)); } catch (e) { $("#cb").innerHTML = errBox(e); return; }
  if (st.page !== "customers") return;
  const draw = () => {
    const src = applyF(L).filter(o => all || (o.day >= st.a && o.day <= st.b)), q = (st.cq || "").trim(), qd = normPh(q);
    const C = customers(src).filter(c => !q || c.names.some(n => n.includes(q)) || (qd.length >= 3 && c.phone.includes(qd.replace(/^0/, ""))));
    const rep = C.filter(c => c.n >= 2).length, val = C.reduce((s, c) => s + c.value, 0), ords = C.reduce((s, c) => s + c.n, 0);
    EXP = [];
    $("#cb").innerHTML = `<div class="cx-stats"><div class="cx-st"><span>عدد العملاء</span><b class="num">${ni(C.length)}</b></div>
        <div class="cx-st"><span>عملاء متكررون</span><b class="num">${ni(rep)}</b><small>${C.length ? pct(rep / C.length * 100) + " طلبوا مرتين أو أكثر" : ""}</small></div>
        <div class="cx-st"><span>طلباتهم المكتملة</span><b class="num">${ni(ords)}</b><small>${C.length ? `<span class="num">${nf(ords / C.length, 1)}</span> طلب لكل عميل` : ""}</small></div>
        <div class="cx-st"><span>إجمالي قيمة طلباتهم</span><b class="num">${nf(val)}</b><small>ر.س</small></div></div>
      <div class="cx-tcard"><div class="cx-tbar"><h3><span class="num">${ni(C.length)}</span> عميل</h3><span style="color:#71717A;font-size:13px">اضغط على عنوان أي عمود للترتيب، ومرة ثانية لعكسه</span></div><div id="ctb"></div></div>`;
    table("#ctb", "customers", [
      { k: "name", t: "الاسم", f: c => c.name ? `<b>${esc(c.name)}</b>${c.names.length > 1 ? ` <small style="color:#A1A1AA">+${c.names.length - 1}</small>` : ""}` : `<span style="color:#A1A1AA">بدون اسم</span>` },
      { k: "phone", t: "الجوال", f: c => `<span class="num">${c.phone}</span>`, x: c => c.phone },
      { k: "n", t: "عدد الطلبات", num: 1, f: c => `<b class="num">${ni(c.n)}</b>${c.open ? ` <span class="cx-tag warn">${c.open} بانتظار الدفع</span>` : ""}` },
      { k: "last", t: "آخر طلب", f: c => `<span class="num">${A.bizDay(c.last)}</span> <small style="color:#A1A1AA">${ago(c.last)}</small>`, x: c => A.bizDay(c.last) },
      { k: "value", t: "القيمة الإجمالية", num: 1, f: c => `<b class="num">${nf(c.value)}</b>` },
      { k: "mainType", t: "نوع الطلب", sv: c => A.TYPES.find(t => t[0] === c.mainType)?.[1] || "", f: typesHtml, x: typesTxt },
      { k: "noshow", t: "لم يحضر", num: 1, f: c => c.noshow ? `<span class="cx-tag bad num">${c.noshow}</span>` : `<span style="color:#A1A1AA">—</span>`, x: c => c.noshow }],
      C, { sort: "last", pageSize: 50, onRow: custDrawer, title: "العملاء", empty: q ? "لا يوجد عميل مطابق" : "لا يوجد عملاء بعد. يُسجَّل العميل عند كتابة رقم جواله في الدفع أو في طلب الاتصال.",
        foot: { name: "المجموع", n: ni(ords), value: nf(val) } });
  };
  let tmo; $("#cq").oninput = e => { st.cq = e.target.value; st.pg = 0; clearTimeout(tmo); tmo = setTimeout(draw, 200); };
  draw();
};
function ago(ts) { const d = Math.floor((A.bizDay() > A.bizDay(ts) ? (new Date(A.bizDay()) - new Date(A.bizDay(ts))) / 864e5 : 0)); return d === 0 ? "اليوم" : d === 1 ? "أمس" : d < 30 ? `منذ ${d} يوم` : d < 365 ? `منذ ${Math.floor(d / 30)} شهر` : `منذ ${Math.floor(d / 365)} سنة`; }
function custDrawer(c) {
  const items = {}; c.all.filter(isOk).forEach(o => o.lines.forEach(l => items[l.name] = (items[l.name] || 0) + l.qty));
  const top = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 5), wa = "966" + c.phone.slice(1);
  drawer(`<h2>${esc(c.name || "عميل بدون اسم")}</h2><span class="cx-tag num">${c.phone}</span>`,
    `<div class="cx-sec"><div class="cx-kv"><div><span>عدد الطلبات المكتملة</span><b class="num">${ni(c.n)}</b></div><div><span>القيمة الإجمالية</span><b class="num">${nf(c.value)} ر.س</b></div>
      <div><span>متوسط الطلب</span><b class="num">${nf(c.avg)}</b></div><div><span>لم يحضر</span><b class="num">${c.noshow}</b></div>
      <div><span>أول طلب</span><b class="num">${A.bizDay(c.first)}</b></div><div><span>آخر طلب</span><b><span class="num">${A.bizDay(c.last)}</span> <small style="color:#71717A;font-weight:500">${ago(c.last)}</small></b></div>
      ${c.names.length > 1 ? `<div style="grid-column:1/-1"><span>أسماء سُجّلت بهذا الرقم</span><b>${c.names.map(esc).join("، ")}</b></div>` : ""}</div></div>
    <div class="cx-sec"><h4>أنواع طلباته</h4><div style="display:flex;gap:6px;flex-wrap:wrap">${typesHtml(c)}</div></div>
    ${top.length ? `<div class="cx-sec"><h4>أكثر ما يطلبه</h4><table class="cx-t sm"><tbody>${top.map(([n, q]) => `<tr><td>${esc(n)}</td><td class="n"><b class="num">${q}</b></td></tr>`).join("")}</tbody></table></div>` : ""}
    <div class="cx-sec"><h4>طلباته (<span class="num">${c.all.length}</span>)</h4><div id="cdo"></div></div>`,
    `<a class="cx-btn pri" href="https://wa.me/${wa}" target="_blank" rel="noopener">${ic("chat")}مراسلة واتساب</a><a class="cx-btn" href="tel:${c.phone}">${ic("call")}اتصال</a>`,
    d => { const h = d.querySelector("#cdo"); h.innerHTML = `<div class="cx-list">${c.all.map(o => `<button class="cx-li" data-o="${esc(o.id)}"><b class="num">${(o.no ?? "")}</b><span>${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join("، ")}<br><small><span class="num">${o.day}</span> · ${A.TYPES.find(t => t[0] === o.type)?.[1] || ""} · ${mName(o)}</small></span>${statusTag(o)}<b class="num">${nf(o.total)}</b></button>`).join("")}</div>`;
      h.querySelectorAll("[data-o]").forEach(b => b.onclick = () => orderDrawer(c.all.find(o => o.id === b.dataset.o))); });
}

/* ---------- صفحات الإدارة (المحرّرات الحالية داخل تصميم اللوحة) ---------- */
const legacy = (fn, sub, exp) => () => { page(`<div class="cx-legacy"><div id="adm"></div></div>`, { sub, acts: exp ? expBtn() : "" }); LEGX = exp || null; if (exp) bindExp(); fn(); };
const yn = v => v ? "نعم" : "لا";
function menuExp() {
  const cat = k => A.CATS.find(c => c[0] === k)?.[1] || k;
  const L = A.S.menu.slice().sort((x, y) => A.CATS.findIndex(c => c[0] === x.cat) - A.CATS.findIndex(c => c[0] === y.cat) || (x.sort ?? 0) - (y.sort ?? 0));
  expT("قائمة المنتجات والأسعار", [["name", "الصنف"], ["cat", "القسم"], ["price", "سعر المطعم"], ["lokit", "سعر لوكيت"], ["hunger", "سعر هنقرستيشن"], ["cost", "تكلفة الطعام"], ["box", "علبة"], ["active", "ظاهر"], ["img", "صورة"]],
    L.map(m => ({ name: m.name, cat: cat(m.cat), price: m.price ?? "", lokit: m.lokit ?? "", hunger: m.hunger ?? "", cost: m.cost ?? "", box: yn(m.box), active: yn(m.active), img: yn(m.img) })));
}
function stockExp() {
  document.querySelectorAll("#adm .kpi").forEach(k => {
    const t = k.querySelector("b")?.textContent.trim() || "", big = k.querySelector("b.num")?.textContent.trim();
    const rows = []; if (big) rows.push({ a: "المتبقي تقديرياً", b: big });
    k.querySelectorAll("table tr").forEach(tr => { const td = tr.querySelectorAll("td"); if (td.length >= 2) rows.push({ a: plain(td[0].innerHTML), b: plain(td[1].innerHTML) }); });
    const last = [...k.querySelectorAll(":scope > span")].pop(); if (last) rows.push({ a: "ملاحظة", b: plain(last.innerHTML) });
    expT(t, [["a", "البند"], ["b", "القيمة"]], rows);
  });
}
PAGES.stock = legacy(() => A.admStock(), "رصيد العلب والأكياس، ويُخصم تلقائياً مع كل طلب", stockExp);
PAGES.menu = legacy(() => A.admMenu(), "الأصناف وأسعار المطعم ولوكيت وهنقرستيشن والتكلفة والصور", menuExp);
PAGES.staff = legacy(() => A.admStaff(), "أسماء الكاشيرين ورموز الدخول ورمز المدير");
PAGES.store = legacy(() => A.admStore(), "بيانات الإيصال والشعار وملاحظات الأصناف ورسالة واتساب واليوم التشغيلي");
PAGES.verify = legacy(() => A.admVerify(), "تأكد من صحة أي إيصال برقم الطلب ورمز التحقق");

/* ---------- حسابي: بيانات حساب المدير وكلمة المرور والأجهزة والقفل التلقائي ----------
   هو نفس حساب المالك في AQ ACC: الاسم والجوال والمسمى محفوظة في acc_users/{uid}، وتغيير كلمة المرور يسري على البرنامجين */
const ACC = { name: "" };
const IDLE_K = "cx_idle", IDLE_OPT = [[0, "بدون قفل"], [10, "بعد 10 دقائق"], [30, "بعد 30 دقيقة"], [60, "بعد ساعة"]];
const idleMin = () => { try { return +localStorage.getItem(IDLE_K) || 0; } catch { return 0; } };
let idleLast = Date.now(), idleT = null;
["pointerdown", "keydown", "wheel", "touchstart", "input"].forEach(t => addEventListener(t, () => { idleLast = Date.now(); }, { capture: true, passive: true }));
function idleWatch() {
  clearInterval(idleT);
  idleT = setInterval(() => {
    const m = idleMin(); if (!m || !window.__cxUnmount || Date.now() - idleLast < m * 60000) return;
    /* مع وردية مفتوحة في هذا الجهاز: تُغلق اللوحة ويعود لشاشة البيع، وإلا يخرج من حساب المدير */
    if (A.S.shift) { exitToPos(); A.toast("أُغلقت لوحة المدير تلقائياً بعد مدة دون استخدام"); }
    else { unmount(); A.signOut(); }
  }, 20000);
}
const devId = () => { try { let k = localStorage.getItem("acc-device"); if (!k) { k = [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2, "0")).join(""); localStorage.setItem("acc-device", k); } return k; } catch { return "unknown"; } };
const devLabel = () => { const u = navigator.userAgent || "";
  const os = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) ? "iPad" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X|Macintosh/.test(u) ? "Mac" : "جهاز";
  const br = /Edg\//.test(u) ? "Edge" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "متصفح";
  return os + " · " + br; };
const accRef = () => A.D("acc_users", A.auth.currentUser.uid);
async function accLoad(touch) {
  const u = A.auth.currentUser; if (!u) return {};
  let d = {}; try { const s = await A.F.getDoc(accRef()); d = s.exists() ? s.data() || {} : {}; } catch {}
  if (touch) { const now = new Date().toISOString(), dv = { ...(d.devices || {}) }, k = devId();
    dv[k] = { label: devLabel() + " (الكاشير)", first: dv[k]?.first || now, last: now };
    d.devices = Object.fromEntries(Object.entries(dv).sort((a, b) => String(b[1].last).localeCompare(String(a[1].last))).slice(0, 12));
    try { await A.F.setDoc(accRef(), { devices: d.devices, lastSeen: now }, { merge: true }); } catch {} }
  ACC.name = d.nameSet && d.name ? d.name : ""; return d;
}
const idt = async (op, body) => {
  try { const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${op}?key=${encodeURIComponent(A.apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, j } : { ok: false, code: j.error?.message || "HTTP " + r.status }; }
  catch { return { ok: false, code: "NETWORK" }; } };
const pwErr = c => /INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|INVALID_CREDENTIAL/.test(c) ? "كلمة المرور الحالية غير صحيحة"
  : /TOO_MANY/.test(c) ? "محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى" : /WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET/.test(c) ? "كلمة المرور الجديدة ضعيفة"
  : /NETWORK/.test(c) ? "لا يوجد اتصال بالإنترنت" : "تعذّر التنفيذ (" + c + ")";
const pwRules = p => [[p.length >= 8, "8 أحرف على الأقل"], [/[A-Za-z؀-ۿ]/.test(p), "حرف واحد على الأقل"], [/\d/.test(p), "رقم واحد على الأقل"]];
const pwStr = p => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p)) s++; if ((/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^A-Za-z0-9؀-ۿ]/.test(p)) s++; return s; };
const EYE_ON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.5M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/></svg>`;
const STR_T = ["", "ضعيفة", "مقبولة", "جيدة", "قوية"], STR_C = ["#E7E7EB", "#C2261F", "#B45309", "#2F7D4F", "#15803D"];
const when = t => { if (!t) return "—"; const d = new Date(t); if (isNaN(d)) return "—"; return `<span class="num">${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${tm(d)}</span>`; };
const agoTx = t => { const m = Math.round((Date.now() - new Date(t)) / 60000); return !t || isNaN(m) ? "" : m < 2 ? "الآن" : m < 60 ? `قبل ${m} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم`; };

PAGES.account = async () => {
  page(`<div id="acb">${loadingCards(2, 220)}</div>`, { sub: "بيانات حساب المدير وكلمة المرور، وهو نفس حسابك في برنامج المحاسبة AQ ACC" });
  const d = await accLoad(false); if (st.page !== "account") return;
  const u = A.auth.currentUser || {}, md = u.metadata || {}, nm = ACC.name || userName(), em = u.email || "", dev = devId();
  const devs = Object.entries(d.devices || {}).sort((a, b) => String(b[1].last).localeCompare(String(a[1].last)));
  const eye = id => `<button type="button" class="cx-eye" data-eye="${id}" aria-label="إظهار كلمة المرور" title="إظهار">${EYE_ON}</button>`;
  $("#acb").innerHTML = `
    <div class="cx-card cx-ahero"><div class="cx-aav">${esc((nm || "م").trim().charAt(0))}</div>
      <div class="cx-aid"><b>${esc(nm)}</b><span class="cx-chip ok">المالك · كل الصلاحيات</span><small dir="ltr">${esc(em)}</small></div>
      <div class="cx-ameta"><div><small>آخر تسجيل دخول</small>${when(md.lastSignInTime)}</div><div><small>الحساب منذ</small>${when(md.creationTime)}</div><div><small>آخر تغيير لكلمة المرور</small>${d.pwChangedAt ? when(d.pwChangedAt) : `<span class="mut">لم تتغير من البرنامج</span>`}</div></div></div>
    <div class="cx-agrid">
      <form class="cx-card cx-af" id="acp" autocomplete="off"><h3>البيانات الشخصية</h3>
        <label>الاسم الظاهر<input class="cx-in" id="ac_nm" maxlength="40" value="${esc(nm)}" required></label>
        <label>المسمى<input class="cx-in" id="ac_tt" maxlength="40" value="${esc(d.title || "المالك والمدير العام")}"></label>
        <label>رقم الجوال<input class="cx-in" id="ac_ph" type="tel" dir="ltr" inputmode="tel" maxlength="20" placeholder="05xxxxxxxx" value="${esc(d.phone || "")}"></label>
        <label>البريد الإلكتروني (اسم الدخول)<input class="cx-in" dir="ltr" value="${esc(em)}" readonly></label>
        <p class="cx-hint">الاسم يظهر في لوحة المدير وفي برنامج المحاسبة. البريد هو اسم الدخول ومرتبط بالصلاحيات، فلا يتغير من هنا.</p>
        <div class="cx-aact"><button class="cx-btn pri" type="submit" id="ac_ps">حفظ البيانات</button></div></form>
      <form class="cx-card cx-af" id="acw" autocomplete="on" novalidate><h3>تغيير كلمة المرور</h3>
        <input type="email" autocomplete="username" value="${esc(em)}" hidden>
        <label>كلمة المرور الحالية<span class="cx-pin"><input class="cx-in" id="ac_c" type="password" dir="ltr" autocomplete="current-password">${eye("ac_c")}</span></label>
        <label>كلمة المرور الجديدة<span class="cx-pin"><input class="cx-in" id="ac_n" type="password" dir="ltr" autocomplete="new-password">${eye("ac_n")}</span><span class="cx-meter"><i id="ac_bar"></i></span><small id="ac_st"></small></label>
        <label>تأكيد كلمة المرور الجديدة<span class="cx-pin"><input class="cx-in" id="ac_r" type="password" dir="ltr" autocomplete="new-password">${eye("ac_r")}</span><small id="ac_mt"></small></label>
        <ul class="cx-rules" id="ac_rl">${pwRules("").map(([, t]) => `<li>${t}</li>`).join("")}</ul>
        <div id="ac_msg"></div>
        <p class="cx-hint">تتغير لحساب المالك في لوحة المدير وفي برنامج المحاسبة، وتخرج الأجهزة الأخرى خلال ساعة على الأكثر. هذا الجهاز يبقى داخلاً.</p>
        <div class="cx-aact"><button class="cx-btn pri" type="submit" id="ac_go">تغيير كلمة المرور</button><button class="cx-btn" type="button" id="ac_rs">نسيت الحالية؟ أرسل رابط التعيين لبريدي</button></div></form>
    </div>
    <div class="cx-agrid">
      <div class="cx-card cx-af"><h3>الأمان على هذا الجهاز</h3>
        <label>قفل لوحة المدير عند عدم الاستخدام<select class="cx-in" id="ac_idle">${IDLE_OPT.map(([v, l]) => `<option value="${v}" ${v === idleMin() ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <p class="cx-hint">بعد المدة المختارة دون لمس يخرج من حساب المدير ويطلب كلمة المرور من جديد. وإذا كانت في الجهاز وردية مفتوحة، تُغلق اللوحة ويعود لشاشة البيع دون الخروج. مناسب لجهاز الكاشير الذي يستخدمه الموظفون.</p>
        <div class="cx-aact"><button class="cx-btn" type="button" id="ac_out">${ic("logout")}تسجيل الخروج من هذا الجهاز</button></div></div>
      <div class="cx-card cx-af"><h3>الأجهزة التي استُخدم بها الحساب</h3>
        ${devs.length ? `<div class="cx-devs">${devs.map(([k, v]) => `<div class="cx-dev"><div><b>${esc(v.label || "جهاز")}</b>${k === dev ? ` <span class="cx-chip ok">هذا الجهاز</span>` : ""}<small>أول استخدام ${when(v.first)}</small></div><div class="cx-dw">${k === dev ? "الآن" : esc(agoTx(v.last))}<small>${when(v.last)}</small></div></div>`).join("")}</div>` : `<p class="cx-hint">تظهر الأجهزة هنا بعد أول فتح للوحة أو لبرنامج المحاسبة منها.</p>`}
        <p class="cx-hint">إذا رأيت جهازاً لا تعرفه، غيّر كلمة المرور فوراً.</p></div>
    </div>
    <form class="cx-card cx-af" id="acd" autocomplete="off" novalidate><h3>حساب جهاز الكاشير</h3>
      <p class="cx-hint">الحساب الذي تُسجَّل به أجهزة الكاشير، ويدخل بعده كل موظف برمزه. صلاحياته البيع والورديات فقط.${A.S.config?.devicePwAt ? ` آخر تغيير لكلمة مروره: ${when(A.S.config.devicePwAt)}.` : ""}</p>
      <div class="cx-agrid" style="margin:0">
        <label>البريد (اسم الدخول)<input class="cx-in" dir="ltr" value="${esc(A.deviceEmail || "")}" readonly></label>
        <label>كلمة المرور الحالية للجهاز<span class="cx-pin"><input class="cx-in" id="dv_c" type="password" dir="ltr" autocomplete="off">${eye("dv_c")}</span></label>
        <label>كلمة المرور الجديدة<span class="cx-pin"><input class="cx-in" id="dv_n" type="password" dir="ltr" autocomplete="new-password">${eye("dv_n")}</span><span class="cx-meter"><i id="dv_bar"></i></span><small id="dv_st"></small></label>
        <label>تأكيد كلمة المرور الجديدة<span class="cx-pin"><input class="cx-in" id="dv_r" type="password" dir="ltr" autocomplete="new-password">${eye("dv_r")}</span><small id="dv_mt"></small></label>
      </div>
      <ul class="cx-rules" id="dv_rl">${pwRules("").map(([, t]) => `<li>${t}</li>`).join("")}</ul>
      <div id="dv_open"></div><div id="dv_msg"></div>
      <p class="cx-hint"><b>بعد التغيير:</b> تخرج كل أجهزة الكاشير من الحساب خلال ساعة على الأكثر، وتظهر فيها شاشة الدخول بالبريد نفسه، فاكتب كلمة المرور الجديدة في كل جهاز. الأفضل تغييرها بعد إغلاق الورديات. لا تتأثر أي بيانات.</p>
      <div class="cx-aact"><button class="cx-btn pri" type="submit" id="dv_go">تغيير كلمة مرور الجهاز</button></div></form>`;
  /* open shifts on any cashier device: they keep their data, but their devices will have to sign in again */
  (async () => { try { const q = await A.F.getDocs(A.F.query(A.C("shifts"), A.F.where("status", "==", "open"))); const n = q.docs.filter(x => !x.data().test).length; const el = $("#dv_open");
    if (el && n) el.innerHTML = `<div class="cx-amsg bad">توجد ${n === 1 ? "وردية مفتوحة" : `${n} ورديات مفتوحة`} الآن. يمكنك التغيير، لكن الكاشير سيحتاج تسجيل الدخول من جديد قبل إغلاقها.</div>`; } catch {} })();
  const dn = $("#dv_n"), dr = $("#dv_r");
  const dlive = () => { const v = dn.value, k = v ? pwStr(v) : 0; $("#dv_bar").style.cssText = `width:${k * 25}%;background:${STR_C[k]}`;
    $("#dv_st").textContent = v ? "القوة: " + STR_T[k] : ""; $("#dv_st").style.color = STR_C[k];
    $("#dv_rl").innerHTML = pwRules(v).map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
    $("#dv_mt").textContent = dr.value ? (dr.value === v ? "✓ متطابقة" : "غير متطابقة") : ""; $("#dv_mt").style.color = dr.value === v ? "#15803D" : "#C2261F"; };
  dn.oninput = dlive; dr.oninput = dlive;
  $("#acd").onsubmit = async e => { e.preventDefault(); const m = $("#dv_msg"), say2 = (t, ok) => { m.innerHTML = `<div class="cx-amsg ${ok ? "ok" : "bad"}">${t}</div>`; }; m.innerHTML = "";
    const cur = $("#dv_c").value, v = dn.value;
    if (!cur) return say2("اكتب كلمة المرور الحالية للجهاز.");
    if (!pwRules(v).every(x => x[0])) return say2("كلمة المرور الجديدة لا تحقق الشروط: 8 أحرف على الأقل فيها حرف ورقم.");
    if (v !== dr.value) return say2("تأكيد كلمة المرور لا يطابق الجديدة."); if (v === cur) return say2("كلمة المرور الجديدة هي نفسها الحالية.");
    if (!confirm("تغيير كلمة مرور جهاز الكاشير؟ ستحتاج كتابتها في كل جهاز كاشير بعد خروجه.")) return;
    const b = $("#dv_go"); b.disabled = true; b.textContent = "جارٍ التغيير…";
    const a1 = await idt("signInWithPassword", { email: A.deviceEmail, password: cur, returnSecureToken: true });
    const a2 = a1.ok ? await idt("update", { idToken: a1.j.idToken, password: v, returnSecureToken: true }) : a1;
    b.disabled = false; b.textContent = "تغيير كلمة مرور الجهاز";
    if (!a2.ok) return say2(esc(pwErr(a2.code || "")).replace("الحالية غير صحيحة", "الحالية للجهاز غير صحيحة"));
    try { await A.F.updateDoc(A.D("config", "main"), { devicePwAt: new Date().toISOString() }); } catch {}
    $("#dv_c").value = dn.value = dr.value = ""; dlive();
    say2("✓ تغيّرت كلمة مرور جهاز الكاشير. احفظها في مكان آمن، واكتبها في أجهزة الكاشير عندما تطلب الدخول.", true); A.toast("تغيّرت كلمة مرور الجهاز ✓"); };
  $$("[data-eye]").forEach(b => b.onclick = () => { const i = $("#" + b.dataset.eye), sh = i.type === "password"; i.type = sh ? "text" : "password"; b.innerHTML = sh ? EYE_OFF : EYE_ON; b.title = sh ? "إخفاء" : "إظهار"; b.setAttribute("aria-label", sh ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"); });
  $("#ac_idle").onchange = e => { try { localStorage.setItem(IDLE_K, e.target.value); } catch {} idleLast = Date.now(); A.toast(+e.target.value ? "سيُقفل " + e.target.selectedOptions[0].textContent : "أُلغي القفل التلقائي"); };
  $("#ac_out").onclick = () => { if (A.S.shift) return A.toast("قفّل الوردية المفتوحة في هذا الجهاز أولاً", true); if (confirm("تسجيل الخروج من حساب المدير في هذا الجهاز؟")) { unmount(); A.signOut(); } };
  $("#acp").onsubmit = async e => { e.preventDefault(); const n = $("#ac_nm").value.trim(), ph = $("#ac_ph").value.trim();
    if (n.length < 2) return A.toast("اكتب الاسم الظاهر", true); if (ph && !/^\+?[0-9 ]{7,20}$/.test(ph)) return A.toast("رقم الجوال غير صحيح", true);
    const b = $("#ac_ps"); b.disabled = true;
    try { await A.F.setDoc(accRef(), { name: n, nameSet: true, title: $("#ac_tt").value.trim(), phone: ph, updatedAt: new Date().toISOString() }, { merge: true }); ACC.name = n; A.toast("حُفظت بياناتك ✓"); const sp = root.querySelector(".cx-av span"); if (sp) sp.textContent = n; PAGES.account(); }
    catch (x) { A.toast("تعذّر الحفظ: " + (x.code || x.message), true); b.disabled = false; } };
  const c = $("#ac_c"), nw = $("#ac_n"), rp = $("#ac_r"), msg = $("#ac_msg");
  const live = () => { const v = nw.value, k = v ? pwStr(v) : 0; $("#ac_bar").style.cssText = `width:${k * 25}%;background:${STR_C[k]}`;
    $("#ac_st").textContent = v ? "القوة: " + STR_T[k] : ""; $("#ac_st").style.color = STR_C[k];
    $("#ac_rl").innerHTML = pwRules(v).map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
    $("#ac_mt").textContent = rp.value ? (rp.value === v ? "✓ متطابقة" : "غير متطابقة") : ""; $("#ac_mt").style.color = rp.value === v ? "#15803D" : "#C2261F"; };
  nw.oninput = live; rp.oninput = live;
  const say = (t, ok) => { msg.innerHTML = `<div class="cx-amsg ${ok ? "ok" : "bad"}">${t}</div>`; };
  $("#acw").onsubmit = async e => { e.preventDefault(); msg.innerHTML = ""; const v = nw.value;
    if (!pwRules(v).every(x => x[0])) return say("كلمة المرور الجديدة لا تحقق الشروط: 8 أحرف على الأقل فيها حرف ورقم.");
    if (v !== rp.value) return say("تأكيد كلمة المرور لا يطابق الجديدة."); if (v === c.value) return say("كلمة المرور الجديدة هي نفسها الحالية.");
    const b = $("#ac_go"); b.disabled = true; b.textContent = "جارٍ التغيير…";
    const a1 = await idt("signInWithPassword", { email: em, password: c.value, returnSecureToken: true });
    const a2 = a1.ok ? await idt("update", { idToken: a1.j.idToken, password: v, returnSecureToken: true }) : a1;
    b.disabled = false; b.textContent = "تغيير كلمة المرور";
    if (!a2.ok) { say(esc(pwErr(a2.code || ""))); if (/INVALID/.test(a2.code || "")) { c.value = ""; c.focus(); } return; }
    const t = new Date().toISOString();
    try { await A.F.signInWithEmailAndPassword(A.auth, em, v); } catch { say("تغيّرت كلمة المرور. سجّل الدخول بها من جديد.", true); setTimeout(() => { unmount(); A.signOut(); }, 2500); return; }
    try { await A.F.setDoc(accRef(), { pwChangedAt: t }, { merge: true }); } catch {}
    A.toast("تغيّرت كلمة المرور ✓"); PAGES.account(); };
  $("#ac_rs").onclick = async () => { if (!confirm("نرسل رابط تعيين كلمة مرور جديدة إلى " + em + "؟")) return;
    const r = await idt("sendOobCode", { requestType: "PASSWORD_RESET", email: em });
    say(r.ok ? "أُرسل الرابط إلى بريدك. افتحه واختر كلمة مرور جديدة، وإن لم تجده فانظر في البريد غير المرغوب." : esc(pwErr(r.code || "")), r.ok); };
};
