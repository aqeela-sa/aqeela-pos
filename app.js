/* كاشير شاورما العقيله — المرحلة الأولى
   شاشة البيع، أنواع الطلب، طرق الدفع، الإيصال والطباعة، الطلبات اليوم، الإلغاء والخصم برمز المدير،
   ولوحة المدير (المنيو، الكاشيرون والرموز، التقرير اليومي وتصديره لبرنامج المحاسبة). */
import * as F from "./fb.js";
import { firebaseConfig } from "./firebase-config.js";

const VERSION = "1.2.1";
const ADMIN_EMAIL = "abuabraj@gmail.com";
const DEVICE_EMAIL = "cashier@aqeela-pos.app";

const CATS = [["chicken", "الدجاج"], ["meat", "اللحم"], ["extras", "الإضافات"], ["drinks", "المشروبات"]];
const TYPES = [["dine", "محلي"], ["take", "سفري"], ["lokit", "لوكيت"]];
const METHODS = { cash: "كاش", mada: "مدى", visa: "فيزا", lokit: "لوكيت" };

/* المنيو الابتدائي من مواصفات الكاشير (سعر المطعم، وسعر لوكيت أو null إن لم يكن متوفراً فيه). ref = رمز الصنف في برنامج المحاسبة */
const DEFAULT_MENU = [
  ["chicken", "كلاسيك دجاج", 8, 10, "sk-0007"],
  ["chicken", "عراقي دجاج", 12, 15, "sk-0001"],
  ["chicken", "صاج دجاج", 8, 10, "sk-0005"],
  ["chicken", "صاروخ دجاج", 13.75, 19, "sk-0003"],
  ["chicken", "صحن عربي دجاج", 20, 26, "sk-0011"],
  ["chicken", "صحن عربي دبل دجاج", 29, null, "sk-0012"],
  ["chicken", "عراقيات دجاج", 24, 31, "sk-0009"],
  ["meat", "كلاسيك لحم", 9, 12, "sk-0008"],
  ["meat", "عراقي لحم", 14, 18, "sk-0002"],
  ["meat", "صاج لحم", 12, 15, "sk-0006"],
  ["meat", "صاروخ لحم", 16, 21, "sk-0004"],
  ["meat", "صحن عربي لحم", 26, 34, "sk-0013"],
  ["meat", "عراقيات لحم", 27, 35, "sk-0010"],
  ["extras", "بطاطس", 7, 9, "sk-0014"],
  ["extras", "جبن للساندويتش", 1, null, "sk-0015", true],
  ["extras", "جبن للبوكس", 2, null, "sk-0015", true],
  ["drinks", "مشروب غازي", 2.5, 4, "sk-0016"],
  ["drinks", "بيبسي دايت", 2.5, 4, "sk-0017"],
  ["drinks", "مياه", 1, 2, "sk-0018"],
];
/* تكلفة الطعام للوحدة من برنامج المحاسبة (بدون التغليف) — حسب رمز الصنف */
const DEFAULT_COSTS = { "sk-0001": 2.53, "sk-0002": 3.75, "sk-0003": 4, "sk-0004": 6.2, "sk-0005": 2.46, "sk-0006": 3.65, "sk-0007": 2.27, "sk-0008": 3.24,
  "sk-0009": 8.2, "sk-0010": 9.39, "sk-0011": 6.54, "sk-0012": 8.92, "sk-0013": 8.59, "sk-0014": 1.5, "sk-0015": 0.44, "sk-0016": 1.8, "sk-0017": 1.8, "sk-0018": 0.5 };
const BOX_REFS = ["sk-0009", "sk-0010", "sk-0011", "sk-0012", "sk-0013"];
const DEFAULT_PACK = { boxPrice: 1.4, bagKgPrice: 9, bagsPerKg: 60, perBag: 3 };
const DEFAULT_CONFIG = {
  cutoff: 4,
  store: { name: "شاورما العقيله", address: "القطيف – الإسكان – شارع زين العابدين", phone: "0549801873", thanks: "شكراً لزيارتكم" },
  cashiers: [{ id: "c1", name: "جنيد", pinHash: null, active: true }, { id: "c2", name: "جونايدي", pinHash: null, active: true }, { id: "c3", name: "هاشم", pinHash: null, active: true }],
  managerPinHash: null, logo: null,
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const r2 = x => Math.round((+x || 0) * 100) / 100;
const m2 = x => r2(x).toFixed(2);
const money = x => `<span class="money">${m2(x)}</span>`;
const pad = (x, n = 2) => String(x).padStart(n, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dmy = s => s ? s.split("-").reverse().join("/") : "";
const hm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const addDays = (s, k) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + k); return ymd(d); };
const ls = { get: (k, d) => { try { const v = localStorage.getItem("aq_" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem("aq_" + k, JSON.stringify(v)); } catch {} } };
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const rid = (n = 6) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => "abcdefghjkmnpqrstuvwxyz23456789"[x % 31]).join("");
function toast(t, bad) { $(".toast")?.remove(); const e = document.createElement("div"); e.className = "toast" + (bad ? " bad" : ""); e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 3200); }
const bizDay = (t = Date.now()) => ymd(new Date(t - (S.config?.cutoff ?? 4) * 3600e3));

/* ---------- state ---------- */
const S = {
  user: null, role: null, config: null, menu: [], menuReady: false, configReady: false,
  cashier: ls.get("cashier", null), view: "boot", shift: ls.get("shift", null), shiftOrders: [],
  cart: { type: "take", lines: [], discount: null, sel: null }, cat: "chicken",
  today: [], pending: 0, online: navigator.onLine,
  dev: ls.get("dev", null) || (() => { const d = rid(4); ls.set("dev", d); return d; })(),
  device: Object.assign({ printMode: "browser", printerIp: "", autoPrint: true, test: false }, ls.get("device", {})),
  unsub: [],
};
const saveDevice = () => ls.set("device", S.device);
const isAdmin = () => S.role === "admin";

/* ---------- firebase ---------- */
const app = F.initializeApp(firebaseConfig);
const auth = F.getAuth(app);
let db;
try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentSingleTabManager() }) }); }
catch { db = F.initializeFirestore(app, {}); }
const D = (...p) => F.doc(db, ...p);
const C = (...p) => F.collection(db, ...p);
function fire(p, what) { p.catch(e => { console.error(what, e); toast(`تعذّر الحفظ (${what}): ${e.code || e.message}`, true); }); return p; }

addEventListener("online", () => { S.online = true; drawTop(); });
addEventListener("offline", () => { S.online = false; drawTop(); });

F.onAuthStateChanged(auth, u => {
  S.unsub.forEach(f => f()); S.unsub = []; shiftSub?.(); shiftSub = null; shiftSubId = "";
  S.user = u; S.role = !u ? null : u.email === ADMIN_EMAIL ? "admin" : u.email === DEVICE_EMAIL ? "device" : "other";
  if (!u) return render("login");
  if (S.role === "other") return render("login", "هذا الحساب غير مصرّح له بالكاشير.");
  S.configReady = S.menuReady = false; render("boot");
  if (S.shift) { shiftSubId = ""; setShift(S.shift); }
  S.unsub.push(F.onSnapshot(D("config", "main"), s => { S.config = s.exists() ? s.data() : null; S.configReady = true; migrate(); route(); },
    e => { console.error(e); render("login", "تعذّر قراءة الإعدادات: " + (e.code || e.message)); }));
  /* الوردية المفتوحة على هذا الجهاز (لاسترجاعها إن فُقدت من ذاكرة الجهاز) */
  S.unsub.push(F.onSnapshot(F.query(C("shifts"), F.where("device", "==", S.dev), F.where("status", "==", "open")), s => {
    const open = s.docs.map(d => d.data()).sort((a, b) => b.openedAt - a.openedAt)[0];
    if (!S.shift && open) { setShift(open); route(); }
  }, e => console.error(e)));
  S.unsub.push(F.onSnapshot(C("menu"), s => { S.menu = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)); S.menuReady = true; migrate(); route(); },
    e => console.error(e)));
});

let todaySub = null, todayKey = "";
function watchToday() {
  const d = bizDay(); if (todayKey === d && todaySub) return; todaySub?.(); todayKey = d;
  todaySub = F.onSnapshot(F.query(C("orders"), F.where("day", "==", d)), { includeMetadataChanges: true }, s => {
    S.today = s.docs.map(x => ({ ...x.data(), _pending: x.metadata.hasPendingWrites })).sort((a, b) => b.ts - a.ts);
    S.pending = S.today.filter(o => o._pending).length; drawTop(); if ($("#orders-list")) drawOrdersList();
  }, e => console.error(e));
}
setInterval(() => { if (S.view === "pos") watchToday(); }, 60e3);

/* ترقية بيانات قديمة مرة واحدة (من حساب المدير فقط): تكلفة الأصناف، والعلب، وأسعار التغليف */
let migrated = false;
function migrate() {
  if (migrated || !isAdmin() || !S.configReady || !S.menuReady || !S.config || !S.menu.length) return; migrated = true;
  const b = F.writeBatch(db); let n = 0;
  S.menu.forEach(m => { const u = {};
    if (!("cost" in m)) u.cost = m.ref && DEFAULT_COSTS[m.ref] != null ? DEFAULT_COSTS[m.ref] : null;
    if (!("box" in m)) u.box = BOX_REFS.includes(m.ref);
    if (Object.keys(u).length) { b.set(D("menu", m.id), u, { merge: true }); n++; } });
  if (!S.config.pack) { b.set(D("config", "main"), { pack: DEFAULT_PACK }, { merge: true }); n++; }
  if (n) b.commit().catch(e => console.error("migrate", e));
}

function route() {
  if (!S.configReady || !S.menuReady) return;
  if (!S.config || !S.menu.length) return render(isAdmin() ? "setup" : "notready");
  const c = S.cashier && S.config.cashiers.find(x => x.id === S.cashier.id && x.active);
  if (!c) { S.cashier = null; ls.set("cashier", null); }
  if (S.view === "pos" && S.cashier && S.shift) { drawMenu(); drawCart(); drawTop(); return; }
  if (S.view === "pin" || !S.cashier) return render("pin");
  render(S.shift ? "pos" : "openshift");
}

/* ---------- screens ---------- */
function render(view, msg) {
  if (S.view !== view) closeModal(); S.view = view; const A = $("#app");
  if (view === "boot") A.innerHTML = `<div class="center"><div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>شاورما العقيله</h1><p>جارٍ التحميل…</p></div></div>`;
  if (view === "login") return drawLogin(msg);
  if (view === "setup") return drawSetup();
  if (view === "notready") A.innerHTML = `<div class="center"><div class="panel"><div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>الكاشير غير مُجهّز بعد</h1><p>يجب أن يدخل المدير مرة واحدة من حسابه لتجهيز المنيو والإعدادات.</p></div>
    <button class="btn ghost block" id="lo">تسجيل الخروج</button></div></div>`, $("#lo").onclick = () => F.signOut(auth);
  if (view === "pin") return drawPin();
  if (view === "pos") { if (!S.shift) return render("openshift"); return drawPos(); }
  if (view === "openshift") return drawOpenShift();
}

function drawLogin(msg) {
  $("#app").innerHTML = `<div class="center"><form class="panel" id="lf">
    <div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>كاشير شاورما العقيله</h1><p>تسجيل دخول الجهاز (مرة واحدة)</p></div>
    ${msg ? `<div class="err">${esc(msg)}</div>` : ""}
    <div class="f"><label for="em">البريد الإلكتروني</label><input id="em" type="email" autocomplete="username" inputmode="email" dir="ltr" value="${esc(ls.get("lastEmail", DEVICE_EMAIL))}" required></div>
    <div class="f"><label for="pw">كلمة المرور</label><input id="pw" type="password" autocomplete="current-password" dir="ltr" required></div>
    <button class="btn block" id="lb">دخول</button>
    <p class="small muted" style="margin:14px 0 0;line-height:1.7">آيباد المطعم يدخل بحساب الجهاز <span class="num">${DEVICE_EMAIL}</span>. المدير يدخل ببريده لإدارة المنيو والرموز والتقارير. يبقى الجهاز مسجّلاً حتى بدون إنترنت.</p>
    <p class="small muted" style="margin:6px 0 0;text-align:center">الإصدار <span class="num">${VERSION}</span></p></form></div>`;
  $("#lf").onsubmit = async e => {
    e.preventDefault(); const b = $("#lb"); b.disabled = true; b.textContent = "جارٍ الدخول…";
    const em = $("#em").value.trim().toLowerCase(); ls.set("lastEmail", em);
    try { await F.signInWithEmailAndPassword(auth, em, $("#pw").value); }
    catch (er) { const c = er.code || ""; drawLogin(c.includes("invalid") || c.includes("wrong") || c.includes("user-not-found") ? "البريد أو كلمة المرور غير صحيحة." : c.includes("network") ? "لا يوجد اتصال بالإنترنت. أول دخول يحتاج إنترنت." : c.includes("too-many") ? "محاولات كثيرة، انتظر قليلاً ثم حاول." : "تعذّر الدخول: " + c); }
  };
}

function drawSetup() {
  const hasCfg = !!S.config, hasMenu = S.menu.length > 0;
  $("#app").innerHTML = `<div class="center"><div class="panel" style="width:min(560px,100%)">
    <div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>تجهيز الكاشير لأول مرة</h1><p>سيُنشأ المنيو والإعدادات من مواصفات الكاشير، وتستطيع تعديلها لاحقاً من لوحة المدير.</p></div>
    <div class="note" style="margin-bottom:14px">${hasMenu ? "✓ المنيو موجود" : `المنيو: ${DEFAULT_MENU.length} صنفاً بسعر المطعم وسعر لوكيت`}<br>${hasCfg ? "✓ الإعدادات موجودة" : "الإعدادات: اسم المطعم والعنوان والهاتف، والكاشيرون: جنيد، جونايدي، هاشم"}</div>
    <div class="f"><label for="mp">رمز المدير (4 إلى 8 أرقام)</label><input id="mp" type="password" inputmode="numeric" pattern="[0-9]*" dir="ltr" autocomplete="new-password"><span class="hint">يُطلب عند الخصم وإلغاء الطلب وإعدادات الجهاز. لا تشاركه مع الكاشيرين.</span></div>
    <button class="btn block" id="go">تجهيز الكاشير</button>
    <button class="link" id="lo" style="display:block;margin:12px auto 0">تسجيل الخروج</button></div></div>`;
  $("#lo").onclick = () => F.signOut(auth);
  $("#go").onclick = async () => {
    const mp = $("#mp").value.trim(); if (!/^\d{4,8}$/.test(mp)) return toast("رمز المدير من 4 إلى 8 أرقام", true);
    const b = $("#go"); b.disabled = true; b.textContent = "جارٍ التجهيز…";
    try {
      const batch = F.writeBatch(db);
      if (!hasCfg) { const salt = rid(16); batch.set(D("config", "main"), { ...DEFAULT_CONFIG, salt, managerPinHash: await sha(salt + ":" + mp), receiptKey: rid(16), updatedAt: Date.now() }); }
      if (!hasMenu) DEFAULT_MENU.forEach(([cat, name, price, lokit, ref, addon], i) =>
        batch.set(D("menu", "m" + pad(i + 1)), { cat, name, price, lokit, ref, addon: !!addon, active: true, sort: (i + 1) * 10 }));
      await batch.commit(); toast("تم تجهيز الكاشير ✓");
    } catch (e) { b.disabled = false; b.textContent = "تجهيز الكاشير"; toast("تعذّر التجهيز: " + (e.code || e.message), true); }
  };
}

/* ----- PIN ----- */
function drawPin() {
  const list = S.config.cashiers.filter(c => c.active);
  let who = list.length === 1 ? list[0].id : null, pin = "";
  const noPins = list.every(c => !c.pinHash);
  $("#app").innerHTML = `${S.device.test ? `<div class="testbar">وضع تجريبي — الطلبات لا تُحسب في المبيعات</div>` : ""}<div class="center"><div class="panel" style="width:min(460px,100%)">
    <div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>${esc(S.config.store.name)}</h1><p>اختر اسمك وأدخل رمزك</p></div>
    ${noPins ? `<div class="note warn" style="margin-bottom:12px">لم تُحدَّد رموز الكاشيرين بعد. ${isAdmin() ? "حدّدها من لوحة المدير ← الكاشيرون." : "يحددها المدير من لوحة المدير."}</div>` : ""}
    <div class="who">${list.map(c => `<button data-c="${c.id}" ${!c.pinHash ? "disabled" : ""}>${esc(c.name)}${!c.pinHash ? "<small>بدون رمز</small>" : ""}</button>`).join("")}</div>
    <div class="dots" id="dots">${"<i></i>".repeat(4)}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join("")}<button class="fn" data-k="c">مسح</button><button data-k="0">0</button><button class="fn" data-k="b">⌫</button></div>
    <div style="display:flex;justify-content:space-between;margin-top:14px">${isAdmin() ? `<button class="link" id="toadm">لوحة المدير</button>` : "<span></span>"}<button class="link" id="lo" style="color:var(--mut)">خروج الجهاز</button></div>
  </div></div>`;
  const dots = () => $$("#dots i").forEach((d, i) => d.classList.toggle("on", i < pin.length));
  const sel = () => $$("[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === who)); sel();
  $$("[data-c]").forEach(b => b.onclick = () => { who = b.dataset.c; pin = ""; sel(); dots(); });
  const check = async () => {
    const c = list.find(x => x.id === who); if (!c) { toast("اختر اسمك أولاً"); pin = ""; return dots(); }
    if (c.pinHash && await sha(S.config.salt + ":" + pin) === c.pinHash) { S.cashier = { id: c.id, name: c.name }; ls.set("cashier", S.cashier); render(S.shift ? "pos" : "openshift"); }
    else { $("#dots").classList.add("shake"); setTimeout(() => { $("#dots")?.classList.remove("shake"); pin = ""; dots(); }, 380); }
  };
  $$("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k;
    if (k === "c") pin = ""; else if (k === "b") pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
    dots(); if (pin.length === 4) check(); });
  $("#lo").onclick = () => { if (S.shift) return toast("قفّل الوردية المفتوحة أولاً", true); askManager("خروج الجهاز من الحساب", () => F.signOut(auth)); };
  if ($("#toadm")) $("#toadm").onclick = openAdmin;
}

/* ----- POS ----- */
function drawPos() {
  watchToday();
  $("#app").innerHTML = `${S.device.test ? `<div class="testbar">وضع تجريبي — الطلبات لا تُحسب في المبيعات</div>` : ""}
  <header class="top" id="top"></header>
  <main class="pos"><section class="menu"><nav class="cats" id="cats"></nav><div class="grid" id="grid"></div></section>
  <aside class="cart" id="cart"></aside></main>`;
  drawTop(); drawMenu(); drawCart();
}
function drawTop() {
  const T = $("#top"); if (!T) return; const ty = S.cart.type;
  T.innerHTML = `<div class="t-brand"><b><img src="icons/logo.png" alt=""></b><span>${esc(S.config.store.name)}</span></div>
    <div class="seg">${TYPES.map(([k, l]) => `<button data-t="${k}" class="${ty === k ? "on" : ""} ${k}">${l}</button>`).join("")}</div>
    <div class="sp"></div>
    ${S.device.test ? `<span class="pill test">تجريبي</span>` : ""}
    ${!S.online ? `<span class="pill off"><i class="d"></i>بدون إنترنت</span>` : S.pending ? `<span class="pill pend"><i class="d" style="background:var(--warn)"></i>يُرسل ${S.pending}</span>` : `<span class="pill"><i class="d"></i>متصل</span>`}
    <button class="pill" id="sh" title="الوردية">🕘 الوردية <span class="num">${S.shift ? hm(S.shift.openedAt) : ""}</span></button>
    <button class="pill" id="me" title="تبديل الكاشير">👤 ${esc(S.cashier?.name || "")}</button>
    <button class="iconbtn" id="ord" title="طلبات اليوم">🧾</button>
    <button class="iconbtn" id="more" title="القائمة">☰</button>`;
  $$("[data-t]").forEach(b => b.onclick = () => setType(b.dataset.t));
  $("#me").onclick = switchCashier;
  $("#sh").onclick = openShift;
  $("#ord").onclick = openOrders;
  $("#more").onclick = openMore;
}
const priceOf = (it, type = S.cart.type) => type === "lokit" ? it.lokit : it.price;
const avail = (it, type = S.cart.type) => it.active && priceOf(it, type) != null;
function drawMenu() {
  const G = $("#grid"); if (!G) return;
  const cats = CATS.filter(([k]) => S.menu.some(m => m.active && m.cat === k));
  if (!cats.some(([k]) => k === S.cat)) S.cat = cats[0]?.[0] || "chicken";
  $("#cats").innerHTML = cats.map(([k, l]) => `<button data-cat="${k}" class="${S.cat === k ? "on" : ""}">${l}</button>`).join("");
  $$("[data-cat]").forEach(b => b.onclick = () => { S.cat = b.dataset.cat; drawMenu(); });
  const qty = id => S.cart.lines.reduce((s, l) => s + (l.id === id ? l.qty : 0) + l.mods.filter(m => m.id === id).length * l.qty, 0);
  G.innerHTML = S.menu.filter(m => m.active && m.cat === S.cat).map(m => { const p = priceOf(m), q = qty(m.id);
    return `<button class="item ${m.addon ? "addon" : ""}" data-i="${m.id}" ${p == null ? "disabled" : ""}>
      ${q ? `<span class="q">${q}</span>` : ""}<span class="nm">${esc(m.name)}</span>
      <span class="pr">${p == null ? `<small>غير متوفر في لوكيت</small>` : `${money(p)} <small>ر.س</small>`}</span></button>`; }).join("")
    || `<div class="empty">لا أصناف في هذا القسم</div>`;
  $$("[data-i]").forEach(b => b.onclick = () => addItem(b.dataset.i));
}
function addItem(id) {
  const it = S.menu.find(m => m.id === id); if (!it || !avail(it)) return;
  const L = S.cart.lines;
  if (it.addon) {
    const tgt = L.find(l => l.key === S.cart.sel) || L.filter(l => !l.addon).at(-1);
    if (!tgt) return toast("اختر الصنف أولاً ثم أضف الجبن");
    tgt.mods.push({ id: it.id, name: it.name, price: priceOf(it), ref: it.ref || null }); S.cart.sel = tgt.key;
  } else {
    const ex = L.find(l => l.id === id && !l.mods.length);
    if (ex) { ex.qty++; S.cart.sel = ex.key; }
    else { const key = rid(5); L.push({ key, id, name: it.name, price: priceOf(it), qty: 1, mods: [], ref: it.ref || null }); S.cart.sel = key; }
  }
  drawCart(); drawMenu();
}
const lineTotal = l => r2(l.qty * (l.price + l.mods.reduce((s, m) => s + m.price, 0)));
const subtotal = () => r2(S.cart.lines.reduce((s, l) => s + lineTotal(l), 0));
const discAmt = () => { const d = S.cart.discount, st = subtotal(); if (!d) return 0; return Math.min(st, r2(d.kind === "pct" ? st * d.value / 100 : d.value)); };
const total = () => r2(subtotal() - discAmt());
function drawCart() {
  const K = $("#cart"); if (!K) return; const L = S.cart.lines, n = L.reduce((s, l) => s + l.qty, 0), lk = S.cart.type === "lokit";
  K.innerHTML = `<div class="cart-h"><h2>الطلب ${n ? `<span class="chip">${n} صنف</span>` : ""}</h2>${L.length ? `<button class="link" id="clr" style="color:var(--bad)">تفريغ</button>` : ""}</div>
    <div class="lines">${L.length ? L.map(l => `<div class="ln ${S.cart.sel === l.key ? "sel" : ""}" data-l="${l.key}">
        <div><div class="n1">${esc(l.name)}</div><div class="unit">${money(l.price)} × ${l.qty}</div></div><div class="p1">${money(lineTotal(l))}</div>
        ${l.mods.length ? `<div class="mods">${l.mods.map((m, i) => `<span>+ ${esc(m.name)} ${money(m.price)} <button data-rm="${l.key}:${i}" aria-label="حذف الإضافة">✕</button></span>`).join("")}</div>` : ""}
        <div class="ctl"><button data-dec="${l.key}" aria-label="إنقاص">−</button><span class="qn num">${l.qty}</span><button data-inc="${l.key}" aria-label="زيادة">+</button><button class="del" data-del="${l.key}">حذف</button></div></div>`).join("")
      : `<div class="empty"><span>اضغط على الأصناف لإضافتها${lk ? "<br><b style=\"color:#5B2A86\">بأسعار لوكيت</b>" : ""}</span></div>`}</div>
    <div class="tot">${S.cart.discount ? `<div class="r"><span>المجموع</span>${money(subtotal())}</div><div class="r disc"><span>خصم ${S.cart.discount.kind === "pct" ? `${S.cart.discount.value}%` : ""}</span><span>−${money(discAmt())}</span></div>` : ""}
      <div class="r big"><span>الإجمالي</span><span>${money(total())} <small style="font-size:14px;color:var(--mut)">ر.س</small></span></div></div>
    <div class="acts"><button class="btn ghost sm" id="disc" ${!L.length ? "disabled" : ""}>${S.cart.discount ? "تعديل الخصم" : "خصم"}</button><button class="btn ghost sm" id="last">🖨 آخر إيصال</button></div>
    <div class="pays ${lk ? "one" : ""}">${lk ? `<button class="btn pay-lokit" data-pay="lokit" ${!L.length ? "disabled" : ""}>تأكيد طلب لوكيت<small>${m2(total())} ر.س</small></button>`
      : `<button class="btn pay-cash" data-pay="cash" ${!L.length ? "disabled" : ""}>كاش</button><button class="btn pay-mada" data-pay="mada" ${!L.length ? "disabled" : ""}>مدى</button><button class="btn pay-visa" data-pay="visa" ${!L.length ? "disabled" : ""}>فيزا<small>ماستركارد</small></button>`}</div>`;
  const find = k => L.find(l => l.key === k);
  $$("[data-l]").forEach(e => e.onclick = ev => { if (ev.target.closest("button")) return; S.cart.sel = e.dataset.l; drawCart(); });
  $$("[data-inc]").forEach(b => b.onclick = () => { find(b.dataset.inc).qty++; drawCart(); drawMenu(); });
  $$("[data-dec]").forEach(b => b.onclick = () => { const l = find(b.dataset.dec); if (l.qty > 1) l.qty--; else S.cart.lines = L.filter(x => x !== l); drawCart(); drawMenu(); });
  $$("[data-del]").forEach(b => b.onclick = () => { S.cart.lines = L.filter(x => x.key !== b.dataset.del); if (!S.cart.lines.length) S.cart.discount = null; drawCart(); drawMenu(); });
  $$("[data-rm]").forEach(b => b.onclick = () => { const [k, i] = b.dataset.rm.split(":"); find(k).mods.splice(+i, 1); drawCart(); drawMenu(); });
  $("#clr") && ($("#clr").onclick = () => { if (confirm("تفريغ الطلب؟")) { resetCart(); } });
  $("#disc").onclick = () => askManager("الخصم يحتاج رمز المدير", openDiscount);
  $("#last").onclick = () => { const o = S.today.find(x => x.device === S.dev) || S.today[0]; if (!o) return toast("لا توجد طلبات اليوم"); printOrder(o, true); };
  $$("[data-pay]").forEach(b => b.onclick = () => openPay(b.dataset.pay));
}
function resetCart() { S.cart = { type: S.cart.type === "lokit" ? "take" : S.cart.type, lines: [], discount: null, sel: null }; drawTop(); drawCart(); drawMenu(); }
function setType(t) {
  if (t === S.cart.type) return;
  const bad = S.cart.lines.filter(l => { const it = S.menu.find(m => m.id === l.id); return !it || !avail(it, t) || l.mods.some(md => { const mi = S.menu.find(m => m.id === md.id); return !mi || !avail(mi, t); }); });
  if (bad.length && !confirm(`هذه الأصناف غير متوفرة في «${TYPES.find(x => x[0] === t)[1]}» وستُحذف من الطلب:\n${bad.map(l => l.name).join("، ")}`)) return;
  S.cart.type = t;
  S.cart.lines = S.cart.lines.filter(l => !bad.includes(l)).map(l => { const it = S.menu.find(m => m.id === l.id);
    return { ...l, price: priceOf(it, t), mods: l.mods.map(md => ({ ...md, price: priceOf(S.menu.find(m => m.id === md.id), t) })) }; });
  if (!S.cart.lines.length) S.cart.discount = null;
  drawTop(); drawMenu(); drawCart();
}

/* ----- modal ----- */
function modal(html, { wide } = {}) {
  closeModal(); const o = document.createElement("div"); o.className = "ov"; o.id = "ov";
  o.innerHTML = `<div class="mdl ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(o); o.querySelectorAll("[data-close]").forEach(b => b.onclick = closeModal); return o;
}
function closeModal() { $("#ov")?.remove(); clearTimeout(S.doneTimer); }
const mh = (t, extra = "") => `<div class="mdl-h"><h3>${t}</h3><div style="display:flex;gap:8px;align-items:center">${extra}<button class="x" data-close aria-label="إغلاق">✕</button></div></div>`;

/* manager PIN prompt → onOk() */
function askManager(title, onOk) {
  if (!S.config.managerPinHash) return toast("لم يُحدَّد رمز المدير بعد", true);
  let pin = "";
  modal(`${mh("رمز المدير")}<div class="mdl-b"><p style="margin:0 0 4px;text-align:center" class="muted">${esc(title)}</p>
    <div class="dots" id="mdots">${"<i></i>".repeat(8)}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join("")}<button class="fn" data-k="b">⌫</button><button data-k="0">0</button><button class="fn" data-k="ok" style="color:var(--red);font-weight:800">تأكيد</button></div></div>`);
  const dots = () => $$("#mdots i").forEach((d, i) => { d.classList.toggle("on", i < pin.length); d.style.display = i < Math.max(4, pin.length) ? "" : "none"; }); dots();
  $$("#ov [data-k]").forEach(b => b.onclick = async () => { const k = b.dataset.k;
    if (k === "b") pin = pin.slice(0, -1);
    else if (k === "ok") { if (await sha(S.config.salt + ":" + pin) === S.config.managerPinHash) { closeModal(); onOk(); return; }
      $("#mdots").classList.add("shake"); setTimeout(() => { $("#mdots")?.classList.remove("shake"); pin = ""; dots(); }, 380); return; }
    else if (pin.length < 8) pin += k; dots(); });
}

function openDiscount() {
  const d = S.cart.discount || { kind: "amt", value: 0, reason: "" };
  modal(`${mh("خصم على الطلب")}<div class="mdl-b">
    <div class="seg" style="margin-bottom:12px"><button data-k="amt" class="${d.kind === "amt" ? "on" : ""}" style="flex:1">مبلغ (ر.س)</button><button data-k="pct" class="${d.kind === "pct" ? "on" : ""}" style="flex:1">نسبة %</button></div>
    <div class="f"><label for="dv">القيمة</label><input id="dv" type="number" inputmode="decimal" min="0" step="0.5" dir="ltr" value="${d.value || ""}"></div>
    <div class="f"><label for="dr">السبب (يظهر في التقرير)</label><input id="dr" value="${esc(d.reason)}" placeholder="مثال: عميل دائم، تعويض تأخير"></div>
    <p class="small muted" style="margin:0">المجموع قبل الخصم: ${money(subtotal())} ر.س</p></div>
    <div class="mdl-f">${S.cart.discount ? `<button class="btn ghost" id="drm" style="margin-inline-end:auto;color:var(--bad)">إزالة الخصم</button>` : ""}<button class="btn ghost" data-close>إلغاء</button><button class="btn" id="dok">تطبيق</button></div>`);
  let kind = d.kind;
  $$("#ov [data-k]").forEach(b => b.onclick = () => { kind = b.dataset.k; $$("#ov [data-k]").forEach(x => x.classList.toggle("on", x === b)); });
  $("#drm") && ($("#drm").onclick = () => { S.cart.discount = null; closeModal(); drawCart(); });
  $("#dok").onclick = () => { const v = r2($("#dv").value), reason = $("#dr").value.trim();
    if (!(v > 0)) return toast("أدخل قيمة الخصم", true); if (kind === "pct" && v > 100) return toast("النسبة لا تتجاوز 100%", true);
    if (kind === "amt" && v > subtotal()) return toast("الخصم أكبر من المجموع", true);
    if (!reason) return toast("اكتب سبب الخصم", true);
    S.cart.discount = { kind, value: v, reason, by: "manager", at: Date.now(), cashierId: S.cashier.id }; closeModal(); drawCart(); };
}

/* ----- payment ----- */
function openPay(method) {
  if (!S.cart.lines.length) return; const T = total();
  if (method !== "cash") {
    modal(`${mh(method === "lokit" ? "تأكيد طلب لوكيت" : `الدفع بـ${METHODS[method]}`)}<div class="mdl-b" style="text-align:center">
      <div class="big-amt">${money(T)} <small style="font-size:18px">ر.س</small></div>
      <p class="muted" style="margin:0">${method === "lokit" ? "تأكد أن الطلب مطابق لطلب لوكيت في التطبيق." : "أدخل المبلغ في جهاز الدفع، وبعد نجاح العملية اضغط تأكيد."}</p></div>
      <div class="mdl-f"><button class="btn ghost" data-close>رجوع</button><button class="btn ${method === "lokit" ? "pay-lokit" : "ok"}" id="pok" style="min-width:180px">${method === "lokit" ? "تأكيد الطلب" : "تمت العملية ✓"}</button></div>`);
    $("#pok").onclick = () => { $("#pok").disabled = true; complete(method, T, 0); };
    return;
  }
  let given = "";
  const notes = [...new Set([T, Math.ceil(T / 5) * 5, Math.ceil(T / 10) * 10, Math.ceil(T / 50) * 50, Math.ceil(T / 100) * 100, 200, 500].filter(x => x >= T))].slice(0, 8);
  modal(`${mh("الدفع كاش")}<div class="mdl-b">
    <div class="big-amt">${money(T)} <small style="font-size:18px">ر.س</small></div>
    <div class="quick">${notes.map(x => `<button data-q="${x}">${x === T ? "المبلغ تماماً" : m2(x).replace(".00", "")}</button>`).join("")}</div>
    <div class="f"><label for="gv">المبلغ المستلم من العميل</label><input id="gv" type="number" inputmode="decimal" dir="ltr" min="0" step="0.5" placeholder="${m2(T)}"></div>
    <div id="chg"></div></div>
    <div class="mdl-f"><button class="btn ghost" data-close>رجوع</button><button class="btn ok" id="pok" style="min-width:180px">تأكيد الدفع</button></div>`);
  const upd = () => { const g = given === "" ? T : r2(given), c = r2(g - T);
    $("#chg").innerHTML = `<div class="chg ${c < 0 ? "neg" : ""}"><span>${c < 0 ? "المبلغ ناقص" : "الباقي للعميل"}</span><span class="money">${m2(Math.abs(c))}</span></div>`;
    $("#pok").disabled = c < 0; $$("#ov [data-q]").forEach(b => b.classList.toggle("on", given !== "" && +b.dataset.q === r2(given))); };
  $$("#ov [data-q]").forEach(b => b.onclick = () => { given = b.dataset.q; $("#gv").value = given; upd(); });
  $("#gv").oninput = () => { given = $("#gv").value; upd(); }; upd();
  $("#pok").onclick = () => { const g = given === "" ? T : r2(given); if (g < T) return; $("#pok").disabled = true; complete("cash", g, r2(g - T)); };
}

function nextNo(day) {
  /* الترقيم موحّد لكل الأجهزة: أكبر رقم وصل من أي جهاز اليوم + 1، مع عدّاد محلي يحمي الترقيم أثناء انقطاع الإنترنت */
  const k = "seq_" + day, mine = S.today.filter(o => o.day === day).reduce((m, o) => Math.max(m, o.no || 0), 0);
  const n = Math.max(ls.get(k, 0), mine) + 1; ls.set(k, n);
  /* تنظيف عدادات الأيام القديمة */
  try { Object.keys(localStorage).filter(x => x.startsWith("aq_seq_") && x < "aq_seq_" + addDays(day, -7)).forEach(x => localStorage.removeItem(x)); } catch {}
  return n;
}
async function receiptCode(o) {
  const h = await sha([S.config.receiptKey || S.config.salt, o.id, m2(o.total), o.ts, o.method].join("|"));
  return parseInt(h.slice(0, 10), 16).toString(36).toUpperCase().padStart(7, "0").slice(-6);
}
/* التكلفة والتغليف */
const itemCost = id => { const m = S.menu.find(x => x.id === id); return m && m.cost != null ? +m.cost : null; };
const isBox = l => { const m = S.menu.find(x => x.id === l.id); return m ? !!m.box : BOX_REFS.includes(l.ref); };
const isDrink = l => { const m = S.menu.find(x => x.id === l.id); return m ? m.cat === "drinks" : ["sk-0016", "sk-0017", "sk-0018"].includes(l.ref); };
/* قاعدة التغليف: كل بوكس (عراقيات وصحن عربي) = علبة ورقية + كيس. باقي الأصناف كيس لكل 3، والمشروبات كيس مستقل لكل 3 */
function packOf(lines) {
  const per = S.config?.pack?.perBag || 3; let box = 0, food = 0, drink = 0;
  lines.forEach(l => { if (isBox(l)) box += l.qty; else if (isDrink(l)) drink += l.qty; else food += l.qty; });
  return { boxes: box, bags: box + Math.ceil(food / per) + Math.ceil(drink / per) };
}
const packPrices = () => { const p = S.config?.pack || DEFAULT_PACK; return { box: p.boxPrice, bag: r2(p.bagKgPrice / p.bagsPerKg * 1000) / 1000 }; };
function orderCogs(o) {
  let food = 0, missing = 0;
  o.lines.forEach(l => { const c = l.cost ?? itemCost(l.id); if (c == null) missing++; else food += c * l.qty;
    l.mods.forEach(m => { const mc = m.cost ?? itemCost(m.id); if (mc == null) missing++; else food += mc * l.qty; }); });
  const pk = o.pack || packOf(o.lines), pp = packPrices();
  return { food: r2(food), pack: r2(pk.boxes * pp.box + pk.bags * pp.bag), missing };
}

async function complete(method, given, change) {
  const ts = Date.now(), day = bizDay(ts), no = nextNo(day), st = subtotal(), da = discAmt();
  const o = {
    id: `${day}-${S.dev}-${pad(no, 4)}-${rid(3)}`, no, day, ts, type: S.cart.type, method,
    lines: S.cart.lines.map(l => ({ id: l.id, ref: l.ref, name: l.name, price: l.price, qty: l.qty, cost: itemCost(l.id), mods: l.mods.map(m => ({ id: m.id, ref: m.ref, name: m.name, price: m.price, cost: itemCost(m.id) })), total: lineTotal(l) })),
    subtotal: st, discount: S.cart.discount ? { ...S.cart.discount, amount: da } : null, total: r2(st - da),
    given: method === "cash" ? r2(given) : null, change: method === "cash" ? r2(change) : 0,
    cashierId: S.cashier.id, cashierName: S.cashier.name, device: S.dev, shiftId: S.shift?.id || null, status: "paid", test: !!S.device.test, v: 1, app: VERSION,
  };
  o.pack = packOf(o.lines); o.cogs = orderCogs(o);
  o.code = await receiptCode(o);
  fire(F.setDoc(D("orders", o.id), { ...o, savedAt: F.serverTimestamp() }), "الطلب");
  if (!S.today.some(x => x.id === o.id)) S.today = [{ ...o, _pending: true }, ...S.today];
  if (!S.shiftOrders.some(x => x.id === o.id)) S.shiftOrders = [o, ...S.shiftOrders];
  resetCart();
  showDone(o);
  if (S.device.autoPrint) printOrder(o);
}
function showDone(o) {
  modal(`<div class="mdl-b"><div class="done"><div class="ck">✓</div><div class="muted">طلب رقم</div><div class="no num">${pad(o.no, 4)}</div>
    <div class="muted" style="margin:6px 0 4px">${TYPES.find(t => t[0] === o.type)[1]} · ${METHODS[o.method]} · ${money(o.total)} ر.س</div>
    ${o.method === "cash" && o.change > 0 ? `<div class="chg" style="margin:12px 0 0"><span>الباقي للعميل</span><span class="money">${m2(o.change)}</span></div>` : ""}
    <p id="prs" class="small muted" style="margin:10px 0 0;min-height:18px"></p></div></div>
    <div class="mdl-f" style="justify-content:stretch"><button class="btn ghost" id="rp" style="flex:1">🖨 طباعة الإيصال</button><button class="btn" data-close style="flex:1.4">طلب جديد</button></div>`);
  $("#rp").onclick = () => printOrder(o, true);
  if (!(o.method === "cash" && o.change > 0)) S.doneTimer = setTimeout(closeModal, 6000);
}

/* ----- orders today ----- */
function openOrders() {
  watchToday();
  modal(`${mh(`طلبات اليوم <span class="muted small num">${dmy(bizDay())}</span>`)}<div class="mdl-b" id="orders-list"></div>`, { wide: true });
  drawOrdersList();
}
function drawOrdersList() {
  const B = $("#orders-list"); if (!B) return; const L = S.today, tm = !!S.device.test, ok = L.filter(o => o.status !== "void" && !!o.test === tm);
  const sum = m => r2(ok.filter(o => o.method === m).reduce((s, o) => s + o.total, 0));
  B.innerHTML = `${tm ? `<div class="note warn" style="margin-bottom:10px">الأرقام أدناه للطلبات <b>التجريبية</b> فقط، لأن الجهاز في الوضع التجريبي. المبيعات الفعلية لا تتأثر بها.</div>` : L.some(o => o.test) ? `<p class="small muted" style="margin:0 0 8px">الطلبات التجريبية تظهر في القائمة ولا تدخل في الأرقام.</p>` : ""}<div class="kpis"><div class="kpi"><span>الطلبات</span><b class="num">${ok.length}</b></div><div class="kpi"><span>الإجمالي</span><b>${money(ok.reduce((s, o) => s + o.total, 0))}</b></div>
    ${Object.entries(METHODS).map(([k, l]) => `<div class="kpi"><span>${l}</span><b>${money(sum(k))}</b></div>`).join("")}</div>
    <div class="list">${L.length ? L.map(o => `<button class="row ${o.status === "void" ? "void" : ""}" data-o="${esc(o.id)}"><span class="no num">${pad(o.no, 4)}</span>
      <span><b>${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join("، ")}</b><br><span class="meta"><span class="num">${hm(o.ts)}</span> · ${esc(o.cashierName)} · ${TYPES.find(t => t[0] === o.type)[1]} · ${METHODS[o.method]}
      ${o.status === "void" ? ` <span class="chip bad">ملغي</span>` : ""}${o.discount ? ` <span class="chip warn">خصم</span>` : ""}${o.test ? ` <span class="chip test">تجريبي</span>` : ""}${o._pending ? ` <span class="chip warn">لم يُرسل بعد</span>` : ""}</span></span>
      <span class="money" style="font-weight:800;font-size:18px">${m2(o.total)}</span></button>`).join("") : `<div class="empty" style="padding:40px">لا توجد طلبات اليوم بعد</div>`}</div>`;
  $$("#orders-list [data-o]").forEach(b => b.onclick = () => openOrder(S.today.find(o => o.id === b.dataset.o)));
}
function orderDetail(o) {
  return `<table class="t"><tbody>${o.lines.map(l => `<tr><td>${l.qty} × ${esc(l.name)}${l.mods.map(m => `<br><span class="small muted">+ ${esc(m.name)} ${m2(m.price)}</span>`).join("")}</td><td class="n">${money(l.total)}</td></tr>`).join("")}</tbody>
    <tfoot>${o.discount ? `<tr><td>خصم (${esc(o.discount.reason)})</td><td class="n">−${money(o.discount.amount)}</td></tr>` : ""}<tr><td>الإجمالي · ${METHODS[o.method]}</td><td class="n">${money(o.total)}</td></tr>
    ${o.method === "cash" && o.given ? `<tr><td class="muted">المستلم / الباقي</td><td class="n muted">${m2(o.given)} / ${m2(o.change)}</td></tr>` : ""}</tfoot></table>
    <p class="small muted" style="margin:10px 0 0">${dmy(o.day)} <span class="num">${hm(o.ts)}</span> · الكاشير: ${esc(o.cashierName)} · ${TYPES.find(t => t[0] === o.type)[1]} · رمز التحقق <span class="num">${esc(o.code)}</span></p>
    ${o.status === "void" ? `<div class="note warn" style="margin-top:10px">ملغي بموافقة المدير <span class="num">${hm(o.void.at)}</span> — السبب: ${esc(o.void.reason)}</div>` : ""}`;
}
function openOrder(o) {
  if (!o) return;
  modal(`${mh(`طلب رقم <span class="num">${pad(o.no, 4)}</span>`)}<div class="mdl-b">${orderDetail(o)}</div>
    <div class="mdl-f">${o.status !== "void" && (!o.shiftId || o.shiftId === S.shift?.id) ? `<button class="btn ghost" id="vd" style="margin-inline-end:auto;color:var(--bad)">إلغاء الطلب</button>` : o.status !== "void" ? `<span class="small muted" style="margin-inline-end:auto;align-self:center">لا يُلغى: الطلب من وردية أخرى${o.device !== S.dev ? " أو جهاز آخر" : " مقفلة"}</span>` : ""}<button class="btn ghost" id="bk">رجوع</button><button class="btn" id="rp">🖨 إعادة الطباعة</button></div>`);
  $("#bk").onclick = openOrders; $("#rp").onclick = () => printOrder(o, true);
  $("#vd") && ($("#vd").onclick = () => askManager(`إلغاء الطلب ${pad(o.no, 4)} بمبلغ ${m2(o.total)}`, () => {
    modal(`${mh("سبب الإلغاء")}<div class="mdl-b"><div class="f"><label for="vr">السبب (يظهر في التقرير)</label><input id="vr" placeholder="مثال: خطأ في الطلب، العميل ألغى"></div>
      <p class="small muted" style="margin:0">${o.method === "cash" ? `أعِد ${m2(o.total)} ر.س للعميل من الدرج.` : o.method === "lokit" ? "تأكد من إلغاء الطلب في لوكيت أيضاً." : "إن كان المبلغ قد خُصم من بطاقة العميل فأعِده من جهاز الدفع."}</p></div>
      <div class="mdl-f"><button class="btn ghost" data-close>تراجع</button><button class="btn" id="vok" style="background:var(--bad)">تأكيد الإلغاء</button></div>`);
    $("#vok").onclick = () => { const r = $("#vr").value.trim(); if (!r) return toast("اكتب سبب الإلغاء", true);
      const v = { at: Date.now(), reason: r, by: "manager", cashierId: S.cashier.id, cashierName: S.cashier.name };
      const t = S.today.find(x => x.id === o.id); if (t) Object.assign(t, { status: "void", void: v });
      fire(F.updateDoc(D("orders", o.id), { status: "void", void: v }), "الإلغاء");
      toast(`تم إلغاء الطلب ${pad(o.no, 4)}`); openOrders(); };
  }));
}

/* ----- more menu & device settings ----- */
function openMore() {
  modal(`${mh("القائمة")}<div class="mdl-b"><div class="list">
    <button class="row" id="m-ord"><span style="font-size:24px">🧾</span><span><b>طلبات اليوم</b><br><span class="meta">عرض، إعادة طباعة، إلغاء</span></span><span></span></button>
    <button class="row" id="m-sh"><span style="font-size:24px">🕘</span><span><b>الوردية</b><br><span class="meta">مفتوحة منذ <span class="num">${S.shift ? hm(S.shift.openedAt) : ""}</span> · إيداع، صرف، تقفيل</span></span><span></span></button>
    <button class="row" id="m-sw"><span style="font-size:24px">👤</span><span><b>تبديل الكاشير</b><br><span class="meta">الكاشير الحالي: ${esc(S.cashier.name)}</span></span><span></span></button>
    <button class="row" id="m-dev"><span style="font-size:24px">⚙️</span><span><b>إعدادات الجهاز والطابعة</b><br><span class="meta">تحتاج رمز المدير</span></span><span></span></button>
    ${isAdmin() ? `<button class="row" id="m-adm"><span style="font-size:24px">📊</span><span><b>لوحة المدير</b><br><span class="meta">التقرير، المنيو، الكاشيرون، الإعدادات</span></span><span></span></button>` : ""}
    <button class="row" id="m-up"><span style="font-size:24px">🔄</span><span><b>تحديث الكاشير</b><br><span class="meta">الإصدار <span class="num">${VERSION}</span></span></span><span></span></button>
  </div></div>`);
  $("#m-ord").onclick = openOrders; $("#m-sh").onclick = openShift;
  $("#m-sw").onclick = switchCashier;
  $("#m-dev").onclick = () => askManager("إعدادات الجهاز", openDevice);
  $("#m-adm") && ($("#m-adm").onclick = openAdmin);
  $("#m-up").onclick = async () => { if (S.pending && !confirm("هناك طلبات لم تُرسل بعد. ستبقى محفوظة في الجهاز وتُرسل لاحقاً. هل تريد التحديث؟")) return;
    try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {} location.reload(); };
}
function openDevice() {
  const d = S.device;
  modal(`${mh("إعدادات الجهاز والطابعة")}<div class="mdl-b">
    <div class="f"><label for="pm">طريقة الطباعة</label><select id="pm">
      <option value="epos" ${d.printMode === "epos" ? "selected" : ""}>طابعة إبسون عبر الشبكة (ePOS)</option>
      <option value="browser" ${d.printMode === "browser" ? "selected" : ""}>طباعة الآيباد (AirPrint)</option>
      <option value="none" ${d.printMode === "none" ? "selected" : ""}>بدون طباعة (عرض الإيصال على الشاشة)</option></select></div>
    <div class="f" id="ipf"><label for="ip">عنوان الطابعة (IP)</label><input id="ip" dir="ltr" inputmode="decimal" placeholder="192.168.1.50" value="${esc(d.printerIp)}">
      <span class="hint">أول مرة: افتح في Safari العنوان https://<span class="num">IP</span> واقبل الشهادة، ثم ارجع هنا. يجب أن يكون «ePOS-Print» مفعّلاً في إعدادات الطابعة.</span></div>
    <div class="setrow"><div><b>طباعة تلقائية بعد كل طلب</b><span>وإلا تُطبع بزر «طباعة الإيصال»</span></div><button class="sw ${d.autoPrint ? "on" : ""}" id="ap" aria-label="طباعة تلقائية"></button></div>
    <div class="setrow"><div><b>وضع تجريبي</b><span>الطلبات تُعلَّم «تجريبي» ولا تدخل في التقارير ولا المحاسبة</span></div><button class="sw ${d.test ? "on" : ""}" id="tm" aria-label="وضع تجريبي"></button></div>
    <div class="setrow"><div><b>رمز هذا الجهاز</b><span>يظهر في أرقام الطلبات الداخلية</span></div><span class="num chip">${esc(S.dev)}</span></div>
    <p id="pt" class="small muted"></p></div>
    <div class="mdl-f"><button class="btn ghost" id="tp" style="margin-inline-end:auto">🖨 طباعة تجربة</button><button class="btn ghost" data-close>إغلاق</button><button class="btn" id="sv">حفظ</button></div>`);
  const t = { ap: d.autoPrint, tm: d.test };
  const ipv = () => $("#ipf").style.display = $("#pm").value === "epos" ? "" : "none"; ipv(); $("#pm").onchange = ipv;
  $("#ap").onclick = () => { t.ap = !t.ap; $("#ap").classList.toggle("on", t.ap); };
  $("#tm").onclick = () => { t.tm = !t.tm; $("#tm").classList.toggle("on", t.tm); };
  const apply = () => { Object.assign(S.device, { printMode: $("#pm").value, printerIp: $("#ip").value.trim(), autoPrint: t.ap, test: t.tm }); saveDevice(); };
  $("#tp").onclick = async () => { apply(); $("#pt").textContent = "جارٍ الطباعة…";
    const res = await printOrder(sampleOrder(), true, true); $("#pt").textContent = res === true ? "✓ تمت الطباعة" : res || ""; };
  $("#sv").onclick = () => { const was = S.view; apply(); closeModal(); toast("تم حفظ إعدادات الجهاز"); render(was === "pin" ? "pin" : "pos"); };
}
function sampleOrder() {
  return { id: "test", no: 0, day: bizDay(), ts: Date.now(), type: "take", method: "cash", lines: [{ name: "كلاسيك دجاج", qty: 2, price: 8, mods: [], total: 16 }, { name: "عراقيات لحم", qty: 1, price: 27, mods: [{ name: "جبن للبوكس", price: 2 }], total: 29 }],
    subtotal: 45, discount: null, total: 45, given: 50, change: 5, cashierName: S.cashier?.name || "تجربة", code: "TEST00", test: true, sample: true };
}

/* ---------- receipt (canvas 576px = 80mm @ 203dpi) ---------- */
let logoImg = null, logoSrc = null;
function loadLogo() {
  const src = S.config?.logo; if (!src) { logoImg = null; return Promise.resolve(); } if (src === logoSrc && logoImg) return Promise.resolve();
  return new Promise(res => { const im = new Image(); im.onload = () => { logoImg = im; logoSrc = src; res(); }; im.onerror = () => res(); im.src = src; });
}
async function drawReceipt(o) {
  await loadLogo();
  const W = 576, M = 16, st = S.config.store, FONT = `-apple-system,"SF Arabic","Geeza Pro",Tahoma,sans-serif`;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = 3000; const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, cv.height); g.fillStyle = "#000"; let y = 10;
  const font = (px, w = 600) => g.font = `${w} ${px}px ${FONT}`;
  const ctr = (t, px, w) => { font(px, w); g.direction = "rtl"; g.textAlign = "center"; y += px * 1.25; g.fillText(t, W / 2, y); y += px * .25; };
  const lr = (r, l, px = 26, w = 600) => { font(px, w); y += px * 1.25; g.direction = "rtl"; g.textAlign = "right"; g.fillText(r, W - M, y); if (l != null) { g.direction = "ltr"; g.textAlign = "left"; g.fillText(l, M, y); } y += px * .3; };
  const hr = (dash = true) => { y += 8; g.fillRect(M, y, W - 2 * M, 2); if (dash) { g.fillStyle = "#fff"; for (let x = M + 10; x < W - M; x += 16) g.fillRect(x, y, 6, 2); g.fillStyle = "#000"; } y += 10; };
  if (logoImg) { const w = Math.min(300, logoImg.width), h = logoImg.height * w / logoImg.width; g.drawImage(logoImg, (W - w) / 2, y, w, h); y += h + 4; }
  ctr(st.name, 42, 800); ctr(st.address, 22, 500);
  if (o.test) { y += 6; g.fillRect(M, y, W - 2 * M, 40); g.fillStyle = "#fff"; ctr(o.sample ? "طباعة تجربة" : "تجريبي — ليس فاتورة", 26, 800); g.fillStyle = "#000"; y += 6; }
  hr(false);
  const d = new Date(o.ts);
  lr(`طلب رقم ${pad(o.no, 4)}`, TYPES.find(t => t[0] === o.type)[1], 34, 800);
  lr(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${hm(o.ts)}`, null, 24, 500);
  lr(`الكاشير: ${o.cashierName}`, null, 24, 500);
  hr();
  for (const l of o.lines) {
    font(28, 700); let name = `${l.qty} × ${l.name}`; const maxW = W - 2 * M - 120;
    while (g.measureText(name).width > maxW && name.length > 4) name = name.slice(0, -2) + "…";
    lr(name, m2(l.qty * l.price), 28, 700);
    for (const m of l.mods) lr(`    + ${m.name}${l.qty > 1 ? ` × ${l.qty}` : ""}`, m2(m.price * l.qty), 24, 500);
  }
  hr();
  if (o.discount) { lr("المجموع", m2(o.subtotal), 26, 500); lr("خصم", "-" + m2(o.discount.amount), 26, 500); }
  lr("الإجمالي", m2(o.total), 38, 800);
  lr(METHODS[o.method], m2(o.method === "cash" && o.given ? o.given : o.total), 26, 600);
  if (o.method === "cash" && o.change > 0) lr("الباقي", m2(o.change), 26, 600);
  if (o.status === "void") { y += 6; ctr("*** ملغي ***", 34, 800); }
  hr(false);
  ctr(st.thanks, 30, 700); ctr(`رقم الطلبات: ${st.phone}`, 26, 600);
  y += 4; ctr(`رمز التحقق: ${o.code}`, 20, 500);
  y += 30;
  const out = document.createElement("canvas"); out.width = W; out.height = Math.ceil(y); out.getContext("2d").drawImage(cv, 0, 0); return out;
}
/* canvas → 1-bit raster (base64) لأمر <image> في ePOS-Print */
function raster(cv) {
  const { width: w, height: h } = cv, px = cv.getContext("2d").getImageData(0, 0, w, h).data, bw = Math.ceil(w / 8), out = new Uint8Array(bw * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, lum = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114;
    if (px[i + 3] > 128 && lum < 140) out[y * bw + (x >> 3)] |= 0x80 >> (x & 7); }
  let s = ""; for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000)); return btoa(s);
}
async function eposPrint(cv, ip) {
  const xml = `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
    `<image width="${cv.width}" height="${cv.height}" color="color_1" mode="mono">${raster(cv)}</image><feed line="3"/><cut type="feed"/></epos-print></s:Body></s:Envelope>`;
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(`https://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`, { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": '""' }, body: xml, signal: ac.signal });
    const t = await r.text(); const ok = /success="true"/.test(t);
    if (!ok) { const c = (t.match(/code="([^"]*)"/) || [])[1] || r.status; throw new Error(c === "EPTR_REC_EMPTY" ? "الورق انتهى" : c === "EPTR_COVER_OPEN" ? "غطاء الطابعة مفتوح" : "رمز الخطأ " + c); }
    return true;
  } finally { clearTimeout(tm); }
}
function browserPrint(cv) {
  return new Promise(res => { $("#print").innerHTML = `<img alt="">`; const im = $("#print img"); im.onload = () => { setTimeout(() => { window.print(); res(true); }, 50); }; im.src = cv.toDataURL("image/png"); });
}
function showReceipt(cv, msg) {
  modal(`${mh("الإيصال")}<div class="mdl-b">${msg ? `<div class="note warn" style="margin-bottom:10px">${esc(msg)}</div>` : ""}<img class="rcpt" src="${cv.toDataURL("image/png")}" alt="الإيصال" style="width:300px"></div>
    <div class="mdl-f"><button class="btn" data-close>إغلاق</button></div>`);
}
/* returns true | error message */
async function printOrder(o, manual, quiet) {
  let cv; try { cv = await drawReceipt(o); } catch (e) { console.error(e); toast("تعذّر تجهيز الإيصال", true); return "تعذّر تجهيز الإيصال"; }
  return printCanvas(cv, manual, quiet);
}
async function printCanvas(cv, manual, quiet) {
  const mode = S.device.printMode, st = $("#prs");
  if (mode === "none") { if (manual) showReceipt(cv); return true; }
  if (mode === "browser") { if (!manual && !quiet) return true; await browserPrint(cv); return true; }
  if (!S.device.printerIp) { const m = "لم يُحدَّد عنوان الطابعة في إعدادات الجهاز"; if (!quiet) toast(m, true); return m; }
  if (st) st.textContent = "جارٍ الطباعة…";
  try { await eposPrint(cv, S.device.printerIp); if (st) st.textContent = "✓ طُبع الإيصال"; return true; }
  catch (e) { const m = "تعذّرت الطباعة: " + (e.name === "AbortError" ? "الطابعة لا ترد (تأكد أنها تعمل وعلى نفس الشبكة)" : e.message === "Failed to fetch" ? "لا يمكن الوصول للطابعة (افتح https://" + S.device.printerIp + " في Safari واقبل الشهادة)" : e.message);
    if (st) st.textContent = m; else if (!quiet) toast(m, true); return m; }
}

/* ---------- الوردية (المرحلة الثانية) ----------
   تُفتح الوردية على الجهاز بمبلغ الدرج، وتبقى مفتوحة عند تبديل الكاشير. تُقفل بعدّ الكاش «أعمى»:
   الكاشير يعدّ الدرج أولاً، ثم يرى المتوقع والفرق. كل حركة نقدية (إيداع/صرف) تُسجّل بالسبب والوقت. */
const DENOMS = [500, 200, 100, 50, 20, 10, 5, 1, 0.5];
let shiftSub = null, shiftSubId = "";
function setShift(sh) {
  S.shift = sh; ls.set("shift", sh);
  if (!sh) { shiftSub?.(); shiftSub = null; shiftSubId = ""; S.shiftOrders = []; return; }
  if (shiftSubId === sh.id) return; shiftSub?.(); shiftSubId = sh.id;
  shiftSub = F.onSnapshot(F.query(C("orders"), F.where("shiftId", "==", sh.id)), s => {
    S.shiftOrders = s.docs.map(d => d.data()); if ($("#shift-sum")) drawShiftSum();
  }, e => console.error(e));
}
function saveShift() { const sh = { ...S.shift, updatedAt: Date.now() }; S.shift = sh; ls.set("shift", sh); fire(F.setDoc(D("shifts", sh.id), sh), "الوردية"); }

function drawOpenShift() {
  const last = ls.get("lastFloat", 0); let fl = String(last || "");
  $("#app").innerHTML = `${S.device.test ? `<div class="testbar">وضع تجريبي — الطلبات لا تُحسب في المبيعات</div>` : ""}<div class="center"><div class="panel" style="width:min(480px,100%)">
    <div class="brand"><div class="logo">🕘</div><h1>فتح الوردية</h1><p>${esc(S.cashier.name)} · <span class="num">${dmy(bizDay())}</span></p></div>
    <div class="f"><label for="fl">المبلغ الموجود في الدرج الآن (فكّة بداية الوردية)</label><input id="fl" type="number" inputmode="decimal" min="0" step="0.5" dir="ltr" value="${fl}" placeholder="0"></div>
    <div class="quick" style="grid-template-columns:repeat(5,1fr)">${[0, 50, 100, 200, 300].map(x => `<button data-fl="${x}">${x}</button>`).join("")}</div>
    <p class="small muted" style="margin:0 0 14px;line-height:1.7">عُدّ الدرج قبل البدء. هذا المبلغ يُطرح عند التقفيل، فالمتوقع في الدرج = الفكّة + مبيعات الكاش + الإيداعات − المصروفات.</p>
    <button class="btn block" id="go">فتح الوردية</button>
    <button class="link" id="bk" style="display:block;margin:12px auto 0;color:var(--mut)">تبديل الكاشير</button></div></div>`;
  $$("[data-fl]").forEach(b => b.onclick = () => { $("#fl").value = b.dataset.fl; });
  $("#bk").onclick = () => { S.cashier = null; ls.set("cashier", null); render("pin"); };
  $("#go").onclick = () => {
    const v = $("#fl").value === "" ? 0 : r2($("#fl").value); if (v < 0) return toast("المبلغ غير صحيح", true);
    const t = Date.now(), sh = { id: `${bizDay(t)}-${S.dev}-${rid(5)}`, day: bizDay(t), device: S.dev, status: "open", openedAt: t,
      openedBy: { ...S.cashier }, float: v, moves: [], cashiers: [S.cashier.name], test: !!S.device.test, app: VERSION };
    ls.set("lastFloat", v); setShift(sh); saveShift(); toast("تم فتح الوردية ✓"); render("pos");
  };
}

function switchCashier() {
  if (S.cart.lines.length && !confirm("في السلة أصناف. تبديل الكاشير يفرّغها، هل تريد المتابعة؟")) return;
  modal(`${mh("تبديل الكاشير")}<div class="mdl-b"><p style="margin:0 0 14px;line-height:1.7">الكاشير الحالي: <b>${esc(S.cashier.name)}</b>. إذا كان الكاشير التالي سيستلم الدرج ويُحاسَب عليه، قفّل الوردية أولاً ليُعدّ الدرج ويُسجّل الفرق على صاحبه.</p>
    <div class="list"><button class="row" id="sw1"><span style="font-size:24px">👤</span><span><b>تبديل فقط</b><br><span class="meta">نفس الوردية والدرج، والطلبات تُسجّل باسم الكاشير الجديد</span></span><span></span></button>
    <button class="row" id="sw2"><span style="font-size:24px">🔒</span><span><b>تقفيل الوردية ثم التبديل</b><br><span class="meta">عدّ الدرج وتسليمه</span></span><span></span></button></div></div>`);
  $("#sw1").onclick = () => { resetCart(); S.cashier = null; ls.set("cashier", null); render("pin"); };
  $("#sw2").onclick = () => { resetCart(); closeShiftFlow(); };
}

/* حسابات الوردية من طلباتها */
function shiftCalc(sh, orders) {
  const ok = orders.filter(o => o.status !== "void"), voids = orders.filter(o => o.status === "void");
  const sum = a => r2(a.reduce((s, o) => s + o.total, 0)), m = {}, n = {}, ty = {}, items = {};
  Object.keys(METHODS).forEach(k => { const a = ok.filter(o => o.method === k); m[k] = sum(a); n[k] = a.length; });
  TYPES.forEach(([k]) => ty[k] = sum(ok.filter(o => o.type === k)));
  ok.forEach(o => o.lines.forEach(l => { items[l.name] = (items[l.name] || 0) + l.qty; l.mods.forEach(md => items[md.name] = (items[md.name] || 0) + l.qty); }));
  const moves = sh.moves || [], cin = r2(moves.filter(x => x.kind === "in").reduce((s, x) => s + x.amount, 0)), cout = r2(moves.filter(x => x.kind === "out").reduce((s, x) => s + x.amount, 0));
  const expected = r2((sh.float || 0) + m.cash + cin - cout);
  return { count: ok.length, total: sum(ok), m, n, ty, items, disc: r2(ok.reduce((s, o) => s + (o.discount?.amount || 0), 0)), discN: ok.filter(o => o.discount).length,
    voidN: voids.length, voidT: sum(voids), cin, cout, expected, cards: r2(m.mada + m.visa) };
}

function openShift() {
  if (!S.shift) return;
  modal(`${mh(`الوردية <span class="muted small">منذ <span class="num">${hm(S.shift.openedAt)}</span> · فتحها ${esc(S.shift.openedBy.name)}</span>`)}<div class="mdl-b" id="shift-sum"></div>
    <div class="mdl-f"><button class="btn ghost" id="cin">＋ إيداع في الدرج</button><button class="btn ghost" id="cout">− صرف من الدرج</button><span class="sp"></span><button class="btn dark" id="cls">🔒 تقفيل الوردية</button></div>`, { wide: true });
  drawShiftSum();
  $("#cin").onclick = () => cashMove("in"); $("#cout").onclick = () => askManager("الصرف من الدرج يحتاج رمز المدير", () => cashMove("out"));
  $("#cls").onclick = closeShiftFlow;
}
function drawShiftSum() {
  const B = $("#shift-sum"); if (!B) return; const c = shiftCalc(S.shift, S.shiftOrders);
  B.innerHTML = `<div class="kpis"><div class="kpi"><span>الطلبات</span><b class="num">${c.count}</b></div><div class="kpi"><span>المبيعات</span><b>${money(c.total)}</b></div>
      ${Object.entries(METHODS).map(([k, l]) => `<div class="kpi"><span>${l}</span><b>${money(c.m[k])}</b><span>${c.n[k]} طلب</span></div>`).join("")}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
    <div><h4 style="margin:4px 0 6px">الدرج</h4><table class="t"><tbody><tr><td>فكّة بداية الوردية</td><td class="n">${money(S.shift.float)}</td></tr>
      <tr><td>الإيداعات</td><td class="n">${money(c.cin)}</td></tr><tr><td>المصروفات من الدرج</td><td class="n">${money(c.cout)}</td></tr>
      <tr><td>الخصومات</td><td class="n">${money(c.disc)} <span class="small muted">(${c.discN})</span></td></tr><tr><td>الإلغاءات</td><td class="n">${money(c.voidT)} <span class="small muted">(${c.voidN})</span></td></tr></tbody></table>
      <p class="small muted" style="margin:8px 0 0">المبلغ المتوقع في الدرج يظهر بعد عدّ الكاش عند التقفيل.</p></div>
    <div><h4 style="margin:4px 0 6px">حركات الدرج</h4>${(S.shift.moves || []).length ? `<table class="t"><tbody>${S.shift.moves.map(x => `<tr><td class="num">${hm(x.at)}</td><td>${x.kind === "in" ? `<span class="chip ok">إيداع</span>` : `<span class="chip bad">صرف</span>`} ${esc(x.reason)}<br><span class="small muted">${esc(x.by)}</span></td><td class="n">${money(x.amount)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted small">لا توجد حركات.</p>`}</div></div>`;
}
function cashMove(kind) {
  modal(`${mh(kind === "in" ? "إيداع في الدرج" : "صرف من الدرج")}<div class="mdl-b">
    <div class="f"><label for="ma">المبلغ</label><input id="ma" type="number" inputmode="decimal" min="0" step="0.5" dir="ltr"></div>
    <div class="f"><label for="mr">السبب</label><input id="mr" placeholder="${kind === "in" ? "مثال: فكّة إضافية من المدير" : "مثال: شراء خبز، ثلج، غاز"}"></div>
    ${kind === "out" ? `<p class="small muted" style="margin:0">احتفظ بالفاتورة. المصروف يُسجّل في الوردية ويظهر في تقريرها، ويُدخل في برنامج المحاسبة كمصروف من الدرج.</p>` : ""}</div>
    <div class="mdl-f"><button class="btn ghost" id="mb">رجوع</button><button class="btn" id="mok">حفظ</button></div>`);
  $("#mb").onclick = openShift;
  $("#mok").onclick = () => { const a = r2($("#ma").value), r = $("#mr").value.trim(); if (!(a > 0)) return toast("أدخل المبلغ", true); if (!r) return toast("اكتب السبب", true);
    S.shift.moves = [...(S.shift.moves || []), { kind, amount: a, reason: r, at: Date.now(), by: S.cashier.name, approved: kind === "out" ? "manager" : null }];
    saveShift(); toast(kind === "in" ? "تم تسجيل الإيداع" : "تم تسجيل الصرف"); openShift(); };
}

/* التقفيل: 1) عدّ الدرج بالفئات (بدون رؤية المتوقع) 2) النتيجة والفرق 3) التأكيد والطباعة */
function closeShiftFlow() {
  if (!S.shift) return; const q = {}; DENOMS.forEach(d => q[d] = "");
  modal(`${mh("تقفيل الوردية — عدّ الدرج")}<div class="mdl-b">
    <p class="small muted" style="margin:0 0 12px">عُدّ كل فئة في الدرج واكتب عددها. لا تكتب المبلغ المتوقع، اكتب الموجود فعلاً.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">${DENOMS.map(d => `<div class="f" style="margin:0"><label for="d${String(d).replace(".", "_")}">فئة ${d === 0.5 ? "نصف ريال" : d}</label><input id="d${String(d).replace(".", "_")}" data-d="${d}" type="number" inputmode="numeric" min="0" step="1" dir="ltr" placeholder="العدد"></div>`).join("")}</div>
    <div class="chg" style="background:var(--bg);color:var(--ink)"><span>مجموع الكاش المعدود</span><span class="money" id="ct">0.00</span></div>
    <div class="f" style="margin-top:14px"><label for="tm">إجمالي تقرير جهاز الشبكة (مدى + فيزا) — اختياري</label><input id="tm" type="number" inputmode="decimal" min="0" step="0.01" dir="ltr" placeholder="من تقرير التسوية في جهاز الدفع"></div></div>
    <div class="mdl-f"><button class="btn ghost" data-close>إلغاء</button><button class="btn" id="nx">التالي</button></div>`);
  const tot = () => r2(DENOMS.reduce((s, d) => s + d * (+$(`[data-d="${d}"]`).value || 0), 0));
  $$("#ov [data-d]").forEach(i => i.oninput = () => { $("#ct").textContent = m2(tot()); });
  $("#nx").onclick = () => {
    if ($$("#ov [data-d]").some(i => i.value !== "" && (+i.value < 0 || !Number.isInteger(+i.value)))) return toast("العدد يجب أن يكون رقماً صحيحاً", true);
    const counted = tot(), den = {}; DENOMS.forEach(d => { const v = +$(`[data-d="${d}"]`).value || 0; if (v) den[d] = v; });
    const term = $("#tm").value === "" ? null : r2($("#tm").value);
    if (!counted && !confirm("مجموع الكاش المعدود صفر. هل الدرج فارغ فعلاً؟")) return;
    closeShiftResult(counted, den, term);
  };
}
function closeShiftResult(counted, den, term) {
  const c = shiftCalc(S.shift, S.shiftOrders), diff = r2(counted - c.expected), tdiff = term == null ? null : r2(term - c.cards);
  const lab = d => Math.abs(d) < 0.005 ? `<span class="chip ok">مطابق</span>` : d < 0 ? `<span class="chip bad">عجز ${m2(-d)}</span>` : `<span class="chip warn">زيادة ${m2(d)}</span>`;
  modal(`${mh("تقفيل الوردية — النتيجة")}<div class="mdl-b">
    <table class="t"><tbody><tr><td>فكّة البداية</td><td class="n">${money(S.shift.float)}</td></tr><tr><td>+ مبيعات الكاش (${c.n.cash} طلب)</td><td class="n">${money(c.m.cash)}</td></tr>
      <tr><td>+ الإيداعات</td><td class="n">${money(c.cin)}</td></tr><tr><td>− المصروفات من الدرج</td><td class="n">${money(c.cout)}</td></tr>
      <tr><td><b>المتوقع في الدرج</b></td><td class="n"><b>${money(c.expected)}</b></td></tr><tr><td><b>المعدود فعلاً</b></td><td class="n"><b>${money(counted)}</b></td></tr></tbody></table>
    <div class="chg ${diff < -0.005 ? "neg" : ""}" style="${diff > 0.005 ? "background:var(--warnbg);color:var(--warn)" : ""}"><span>${Math.abs(diff) < 0.005 ? "الدرج مطابق ✓" : diff < 0 ? "عجز في الدرج" : "زيادة في الدرج"}</span><span class="money">${m2(Math.abs(diff))}</span></div>
    <table class="t" style="margin-top:12px"><tbody><tr><td>مدى</td><td class="n">${money(c.m.mada)}</td></tr><tr><td>فيزا / ماستركارد</td><td class="n">${money(c.m.visa)}</td></tr>
      ${term != null ? `<tr><td>جهاز الشبكة ${lab(tdiff)}</td><td class="n">${money(term)}</td></tr>` : ""}<tr><td>لوكيت</td><td class="n">${money(c.m.lokit)}</td></tr>
      <tr><td><b>إجمالي المبيعات (${c.count} طلب)</b></td><td class="n"><b>${money(c.total)}</b></td></tr></tbody></table>
    <div class="f" style="margin-top:14px"><label for="nt">ملاحظة ${Math.abs(diff) >= 1 || (tdiff != null && Math.abs(tdiff) >= 1) ? "(مطلوبة لوجود فرق)" : "(اختياري)"}</label><textarea id="nt" placeholder="سبب الفرق إن وُجد"></textarea></div></div>
    <div class="mdl-f"><button class="btn ghost" id="rb">رجوع للعدّ</button><button class="btn dark" id="ok">🔒 تأكيد التقفيل</button></div>`);
  $("#rb").onclick = closeShiftFlow;
  $("#ok").onclick = async () => {
    const note = $("#nt").value.trim(); if ((Math.abs(diff) >= 1 || (tdiff != null && Math.abs(tdiff) >= 1)) && !note) return toast("اكتب سبب الفرق", true);
    $("#ok").disabled = true;
    const sh = { ...S.shift, status: "closed", closedAt: Date.now(), closedBy: { ...S.cashier }, counted, denoms: den, terminal: term, note,
      cashiers: [...new Set([...(S.shift.cashiers || []), ...S.shiftOrders.map(o => o.cashierName)])],
      summary: { count: c.count, total: c.total, m: c.m, n: c.n, ty: c.ty, disc: c.disc, voidN: c.voidN, voidT: c.voidT, cin: c.cin, cout: c.cout, expected: c.expected, diff, tdiff, items: c.items } };
    S.shift = sh; saveShift(); const orders = S.shiftOrders;
    setShift(null); S.cashier = null; ls.set("cashier", null);
    const cv = await drawShiftReport(sh, orders); render("pin");
    modal(`${mh("تم تقفيل الوردية ✓")}<div class="mdl-b"><img class="rcpt" src="${cv.toDataURL("image/png")}" alt="تقرير الوردية" style="width:300px"></div>
      <div class="mdl-f"><button class="btn ghost" id="zp">🖨 طباعة التقرير</button><button class="btn" data-close>تم</button></div>`);
    $("#zp").onclick = () => printCanvas(cv, true);
    if (S.device.printMode === "epos") printCanvas(cv, false, true);
  };
}

/* تقرير الوردية (Z) بنفس عرض الإيصال */
async function drawShiftReport(sh, orders) {
  const c = sh.summary || shiftCalc(sh, orders), W = 576, M = 16, FONT = `-apple-system,"SF Arabic","Geeza Pro",Tahoma,sans-serif`;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = 3000; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, cv.height); g.fillStyle = "#000"; let y = 10;
  const font = (px, w = 600) => g.font = `${w} ${px}px ${FONT}`;
  const ctr = (t, px, w) => { font(px, w); g.direction = "rtl"; g.textAlign = "center"; y += px * 1.25; g.fillText(t, W / 2, y); y += px * .25; };
  const lr = (r, l, px = 25, w = 600) => { font(px, w); y += px * 1.25; g.direction = "rtl"; g.textAlign = "right"; g.fillText(r, W - M, y); if (l != null) { g.direction = "ltr"; g.textAlign = "left"; g.fillText(String(l), M, y); } y += px * .3; };
  const hr = () => { y += 8; g.fillRect(M, y, W - 2 * M, 2); y += 10; };
  const dt = t => { const d = new Date(t); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${hm(t)}`; };
  ctr(S.config.store.name, 36, 800); ctr("تقرير الوردية", 30, 800);
  if (sh.test) { y += 6; g.fillRect(M, y, W - 2 * M, 38); g.fillStyle = "#fff"; ctr("تجريبي", 24, 800); g.fillStyle = "#000"; y += 6; }
  hr(); lr("اليوم", dmy(sh.day), 24, 500); lr("الفتح", `${dt(sh.openedAt)}`, 24, 500); lr(`  ${sh.openedBy.name}`, null, 22, 500);
  if (sh.closedAt) { lr("التقفيل", dt(sh.closedAt), 24, 500); lr(`  ${sh.closedBy.name}`, null, 22, 500); }
  if ((sh.cashiers || []).length) lr(`الكاشيرون: ${sh.cashiers.join("، ")}`, null, 22, 500);
  hr(); lr(`المبيعات (${c.count} طلب)`, m2(c.total), 28, 800);
  Object.entries(METHODS).forEach(([k, l]) => lr(`  ${l} (${c.n[k]})`, m2(c.m[k]), 24, 500));
  TYPES.forEach(([k, l]) => lr(`  ${l}`, m2(c.ty[k]), 22, 500));
  lr("الخصومات", m2(c.disc), 24, 500); lr(`الإلغاءات (${c.voidN})`, m2(c.voidT), 24, 500);
  hr(); lr("الدرج", null, 28, 800); lr("  فكّة البداية", m2(sh.float), 24, 500); lr("  + مبيعات الكاش", m2(c.m.cash), 24, 500);
  lr("  + الإيداعات", m2(c.cin), 24, 500); lr("  − المصروفات", m2(c.cout), 24, 500); lr("المتوقع", m2(c.expected), 26, 700);
  if (sh.counted != null) { lr("المعدود", m2(sh.counted), 26, 700); const d = r2(sh.counted - c.expected); lr(Math.abs(d) < 0.005 ? "الفرق: مطابق" : d < 0 ? "الفرق: عجز" : "الفرق: زيادة", m2(Math.abs(d)), 28, 800); }
  if (sh.terminal != null) { lr("جهاز الشبكة", m2(sh.terminal), 24, 500); lr("  مدى + فيزا في النظام", m2(c.m.mada + c.m.visa), 22, 500); }
  if ((sh.moves || []).length) { hr(); lr("حركات الدرج", null, 26, 800); sh.moves.forEach(x => lr(`  ${hm(x.at)} ${x.kind === "in" ? "إيداع" : "صرف"}: ${x.reason}`.slice(0, 34), m2(x.amount), 22, 500)); }
  const it = Object.entries(c.items || {}).sort((a, b) => b[1] - a[1]); if (it.length) { hr(); lr("الأصناف", null, 26, 800); it.forEach(([k, v]) => lr(`  ${k}`, v, 22, 500)); }
  if (sh.note) { hr(); lr(`ملاحظة: ${sh.note}`.slice(0, 40), null, 22, 500); }
  y += 30; const out = document.createElement("canvas"); out.width = W; out.height = Math.ceil(y); out.getContext("2d").drawImage(cv, 0, 0); return out;
}

/* لوحة المدير: المخزون (التغليف بالعدد) */
async function admStock() {
  const A = $("#adm"), st = S.config.stock || {}, pk = S.config.pack || DEFAULT_PACK, pp = packPrices();
  A.innerHTML = `<p class="muted">جارٍ الحساب…</p>`;
  const since = ["boxes", "bags"].map(k => st[k]?.at).filter(Boolean).sort()[0], from = since ? bizDay(since) : addDays(bizDay(), -7);
  let L = [];
  try { L = (await F.getDocs(F.query(C("orders"), F.where("day", ">=", addDays(from < addDays(bizDay(), -7) ? from : addDays(bizDay(), -7), 0))))).docs.map(d => d.data()).filter(o => !o.test && o.status !== "void"); }
  catch (e) { A.innerHTML = `<div class="err">تعذّر تحميل الطلبات: ${esc(e.code || e.message)}</div>`; return; }
  const use = (k, t0) => L.filter(o => o.ts >= t0).reduce((s, o) => s + (o.pack || packOf(o.lines))[k], 0);
  const wk = Date.now() - 7 * 864e5, row = (k, label, unit) => {
    const c = st[k], rec = (st.receipts || []).filter(r => r.kind === k && c && r.at >= c.at).reduce((s, r) => s + r.qty, 0);
    const used = c ? use(k, c.at) : null, left = c ? c.count + rec - used : null, daily = use(k, wk) / 7, days = left != null && daily ? Math.floor(left / daily) : null;
    const low = days != null && days < (st.alertDays || 7);
    return `<div class="kpi" style="background:${low ? "var(--badbg)" : "var(--bg)"}"><span style="font-size:15px;color:var(--ink)"><b>${label}</b></span>
      ${c ? `<b class="num" style="font-size:30px">${left}</b><span>${unit} متبقية تقديرياً${k === "bags" ? ` · <span class="num">${(left / pk.bagsPerKg).toFixed(1)}</span> كيلو` : ""}</span>
      <table class="t" style="margin-top:8px;font-size:14px"><tbody><tr><td>جرد <span class="num">${dmy(bizDay(c.at))}</span></td><td class="n num">${c.count}</td></tr><tr><td>+ المستلم بعده</td><td class="n num">${rec}</td></tr><tr><td>− المستهلك من مبيعات الكاشير</td><td class="n num">${used}</td></tr></tbody></table>
      <span style="margin-top:6px">${daily ? `الاستهلاك اليومي <span class="num">${daily.toFixed(1)}</span> · ${days != null ? `يكفي نحو <strong class="num">${days}</strong> يوم` : ""}` : "لا يوجد استهلاك في آخر 7 أيام"}</span>
      ${low ? `<div class="err" style="margin:8px 0 0">قارب على النفاد، اطلب كمية جديدة.</div>` : ""}`
      : `<span>لم يُسجَّل جرد بعد. سجّل الكمية الموجودة الآن ليبدأ الخصم التلقائي.</span>`}</div>`; };
  A.innerHTML = `<div class="note" style="margin-bottom:12px">يُخصم التغليف تلقائياً مع كل طلب: كل صنف في علبة (عراقيات وصحن عربي) = علبة + كيس، وباقي الأصناف كيس لكل <span class="num">${pk.perBag}</span>، والمشروبات كيس مستقل لكل <span class="num">${pk.perBag}</span>. <b>ما دام فودكس يعمل بجانب الكاشير فالخصم يشمل مبيعات الكاشير فقط.</b></div>
    <div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">${row("boxes", "العلب الورقية المطبوعة", "علبة")}${row("bags", "الأكياس المطبوعة", "كيس")}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:6px">
      <div><h4 style="margin:4px 0 8px">تسجيل جرد أو استلام</h4>
        <div class="seg" style="margin-bottom:10px"><button data-sk="count" class="on" style="flex:1">جرد (الموجود فعلاً)</button><button data-sk="recv" style="flex:1">استلام كمية جديدة</button></div>
        <div class="f"><label for="sbx">العلب (عدد)</label><input id="sbx" type="number" inputmode="numeric" min="0" step="1" dir="ltr" placeholder="اتركه فارغاً إن لم يتغير"></div>
        <div class="f"><label for="sbg">الأكياس (كيلو)</label><input id="sbg" type="number" inputmode="decimal" min="0" step="0.1" dir="ltr" placeholder="اتركه فارغاً إن لم يتغير"><span class="hint">الكيلو = <span class="num">${pk.bagsPerKg}</span> كيس.</span></div>
        <button class="btn" id="ssv1">حفظ</button></div>
      <div><h4 style="margin:4px 0 8px">أسعار التغليف وقاعدته</h4>
        <div class="f"><label for="pb">سعر العلبة</label><input id="pb" type="number" step="0.01" min="0" dir="ltr" value="${pk.boxPrice}"></div>
        <div class="f"><label for="pg">سعر كيلو الأكياس</label><input id="pg" type="number" step="0.01" min="0" dir="ltr" value="${pk.bagKgPrice}"></div>
        <div class="f"><label for="pn">عدد الأكياس في الكيلو</label><input id="pn" type="number" step="1" min="1" dir="ltr" value="${pk.bagsPerKg}"></div>
        <div class="f"><label for="pq">أقصى عدد أصناف في الكيس</label><input id="pq" type="number" step="1" min="1" dir="ltr" value="${pk.perBag}"></div>
        <div class="f"><label for="pa">التنبيه قبل النفاد بـ (أيام)</label><input id="pa" type="number" step="1" min="1" dir="ltr" value="${st.alertDays || 7}"></div>
        <p class="small muted" style="margin:0 0 10px">تكلفة الكيس الواحد حالياً <span class="num">${pp.bag}</span> ر.س.</p>
        <button class="btn ghost" id="psv">حفظ الأسعار</button></div></div>
    ${(st.receipts || []).length ? `<h4 style="margin:18px 0 6px">آخر الحركات</h4><table class="t"><tbody>${[...st.receipts].reverse().slice(0, 10).map(r => `<tr><td class="num">${dmy(bizDay(r.at))}</td><td>استلام ${r.kind === "boxes" ? "علب" : "أكياس"}</td><td class="n num">${r.qty}</td></tr>`).join("")}</tbody></table>` : ""}`;
  let mode = "count";
  $$("[data-sk]").forEach(b => b.onclick = () => { mode = b.dataset.sk; $$("[data-sk]").forEach(x => x.classList.toggle("on", x === b)); });
  $("#ssv1").onclick = async () => {
    const bx = $("#sbx").value, bg = $("#sbg").value; if (bx === "" && bg === "") return toast("أدخل كمية العلب أو الأكياس", true);
    if ((bx !== "" && (+bx < 0 || !Number.isInteger(+bx))) || (bg !== "" && +bg < 0)) return toast("الكمية غير صحيحة", true);
    const t = Date.now(), ns = { ...st, receipts: [...(st.receipts || [])] };
    const put = (k, q) => { if (mode === "count") ns[k] = { count: q, at: t }; else { if (!ns[k]) return false; ns.receipts.push({ kind: k, qty: q, at: t }); } return true; };
    if (bx !== "" && !put("boxes", +bx)) return toast("سجّل جرد العلب أولاً قبل الاستلام", true);
    if (bg !== "" && !put("bags", Math.round(+bg * pk.bagsPerKg))) return toast("سجّل جرد الأكياس أولاً قبل الاستلام", true);
    ns.receipts = ns.receipts.slice(-50);
    try { await F.updateDoc(D("config", "main"), { stock: ns, updatedAt: t }); toast("تم الحفظ ✓"); admStock(); } catch (e) { toast("تعذّر الحفظ: " + (e.code || e.message), true); }
  };
  $("#psv").onclick = async () => {
    const v = { boxPrice: r2($("#pb").value), bagKgPrice: r2($("#pg").value), bagsPerKg: Math.max(1, Math.round(+$("#pn").value)), perBag: Math.max(1, Math.round(+$("#pq").value)) };
    if (!(v.boxPrice >= 0 && v.bagKgPrice >= 0)) return toast("أدخل أسعاراً صحيحة", true);
    try { await F.updateDoc(D("config", "main"), { pack: v, stock: { ...st, alertDays: Math.max(1, Math.round(+$("#pa").value || 7)) }, updatedAt: Date.now() }); toast("تم الحفظ ✓"); admStock(); }
    catch (e) { toast("تعذّر الحفظ: " + (e.code || e.message), true); }
  };
}

/* لوحة المدير: الورديات */
let shf = { a: null, b: null };
async function admShifts() {
  const A = $("#adm"); shf.a ||= addDays(bizDay(), -6); shf.b ||= bizDay();
  A.innerHTML = `<div class="toolbar"><div class="f"><label for="sa1">من</label><input id="sa1" type="date" value="${shf.a}"></div><div class="f"><label for="sb1">إلى</label><input id="sb1" type="date" value="${shf.b}"></div></div><div id="sbody"><p class="muted">جارٍ التحميل…</p></div>`;
  const go = () => { shf.a = $("#sa1").value; shf.b = $("#sb1").value < shf.a ? shf.a : $("#sb1").value; admShifts(); };
  $("#sa1").onchange = go; $("#sb1").onchange = go;
  let L; try { L = (await F.getDocs(F.query(C("shifts"), F.where("day", ">=", shf.a), F.where("day", "<=", shf.b)))).docs.map(d => d.data()).sort((a, b) => b.openedAt - a.openedAt); }
  catch (e) { $("#sbody").innerHTML = `<div class="err">تعذّر التحميل: ${esc(e.code || e.message)}</div>`; return; }
  const d = sh => sh.summary ? r2(sh.counted - sh.summary.expected) : null;
  $("#sbody").innerHTML = L.length ? `<table class="t"><thead><tr><th>اليوم</th><th>الوقت</th><th>الكاشيرون</th><th class="n">المبيعات</th><th class="n">كاش</th><th class="n">المتوقع</th><th class="n">المعدود</th><th>الفرق</th><th></th></tr></thead><tbody>
    ${L.map((sh, i) => `<tr><td class="num">${dmy(sh.day)}${sh.test ? ` <span class="chip test">تجريبي</span>` : ""}</td><td class="small">فتح <span class="num">${hm(sh.openedAt)}</span><br>${sh.closedAt ? `قفل <span class="num">${hm(sh.closedAt)}</span>` : `<span class="chip warn">مفتوحة</span>`}</td>
      <td>${esc((sh.cashiers || [sh.openedBy?.name]).join("، "))}</td><td class="n">${sh.summary ? money(sh.summary.total) : "—"}</td><td class="n">${sh.summary ? money(sh.summary.m.cash) : "—"}</td>
      <td class="n">${sh.summary ? money(sh.summary.expected) : "—"}</td><td class="n">${sh.summary ? money(sh.counted) : "—"}</td>
      <td>${d(sh) == null ? "" : Math.abs(d(sh)) < 0.005 ? `<span class="chip ok">مطابق</span>` : d(sh) < 0 ? `<span class="chip bad">عجز ${m2(-d(sh))}</span>` : `<span class="chip warn">زيادة ${m2(d(sh))}</span>`}${sh.note ? `<br><span class="small muted">${esc(sh.note)}</span>` : ""}</td>
      <td>${sh.summary ? `<button class="btn ghost sm" data-z="${i}">التقرير</button>` : ""}</td></tr>`).join("")}</tbody></table>` : `<div class="empty" style="padding:30px">لا توجد ورديات في هذه الفترة</div>`;
  $$("[data-z]").forEach(b => b.onclick = async () => { const cv = await drawShiftReport(L[+b.dataset.z], []);
    modal(`${mh("تقرير الوردية")}<div class="mdl-b"><img class="rcpt" src="${cv.toDataURL("image/png")}" alt="تقرير الوردية" style="width:300px"></div>
      <div class="mdl-f"><button class="btn ghost" id="zb">رجوع للورديات</button><button class="btn" id="zp">🖨 طباعة</button></div>`);
    $("#zb").onclick = openAdmin; $("#zp").onclick = () => printCanvas(cv, true); });
}

/* ---------- admin ---------- */
let admTab = "report";
function openAdmin() {
  if (!isAdmin()) return;
  modal(`${mh("لوحة المدير")}<nav class="tabs">${[["report", "التقرير"], ["shifts", "الورديات"], ["stock", "المخزون"], ["menu", "المنيو والأسعار"], ["staff", "الكاشيرون والرموز"], ["store", "الإيصال والإعدادات"], ["verify", "التحقق من إيصال"]].map(([k, l]) => `<button data-at="${k}" class="${admTab === k ? "on" : ""}">${l}</button>`).join("")}</nav><div class="mdl-b" id="adm"></div>`, { wide: true });
  $$("[data-at]").forEach(b => b.onclick = () => { admTab = b.dataset.at; $$("[data-at]").forEach(x => x.classList.toggle("on", x === b)); drawAdm(); });
  drawAdm();
}
function drawAdm() { ({ report: admReport, shifts: admShifts, stock: admStock, menu: admMenu, staff: admStaff, store: admStore, verify: admVerify })[admTab](); }

let rep = { a: null, b: null, test: false };
function download(rows, name) {
  const csv = "\ufeff" + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function admReport() {
  const A = $("#adm"); rep.a ||= bizDay(); rep.b ||= rep.a;
  A.innerHTML = `<div class="toolbar"><div class="f"><label for="ra">من</label><input id="ra" type="date" value="${rep.a}"></div><div class="f"><label for="rb">إلى</label><input id="rb" type="date" value="${rep.b}"></div>
    <button class="btn ghost sm" id="rt">اليوم</button><button class="btn ghost sm" id="ry">أمس</button>
    <label class="small" style="display:flex;gap:6px;align-items:center;min-height:42px"><input type="checkbox" id="rx" ${rep.test ? "checked" : ""}> إظهار التجريبي</label>
    <span class="sp"></span><button class="btn sm" id="rc">⬇ المبيعات للمحاسبة</button><button class="btn sm ghost" id="ri">⬇ تقرير الأصناف للمحاسبة</button></div><div id="rbody"><p class="muted">جارٍ التحميل…</p></div>`;
  const go = () => { rep.a = $("#ra").value; rep.b = $("#rb").value < rep.a ? rep.a : $("#rb").value; rep.test = $("#rx").checked; admReport(); };
  $("#ra").onchange = go; $("#rb").onchange = go; $("#rx").onchange = go;
  $("#rt").onclick = () => { rep.a = rep.b = bizDay(); admReport(); };
  $("#ry").onclick = () => { rep.a = rep.b = addDays(bizDay(), -1); admReport(); };
  let L;
  try { const s = await F.getDocs(F.query(C("orders"), F.where("day", ">=", rep.a), F.where("day", "<=", rep.b))); L = s.docs.map(d => d.data()); }
  catch (e) { $("#rbody").innerHTML = `<div class="err">تعذّر تحميل الطلبات: ${esc(e.code || e.message)}</div>`; return; }
  if (!rep.test) L = L.filter(o => !o.test);
  const ok = L.filter(o => o.status !== "void"), voids = L.filter(o => o.status === "void"), tot = r2(ok.reduce((s, o) => s + o.total, 0));
  const by = (arr, f) => arr.reduce((m, o) => { const k = f(o); m[k] = r2((m[k] || 0) + o.total); return m; }, {});
  const cnt = (arr, f) => arr.reduce((m, o) => { const k = f(o); m[k] = (m[k] || 0) + 1; return m; }, {});
  const meth = by(ok, o => o.method), methN = cnt(ok, o => o.method), typ = by(ok, o => o.type), typN = cnt(ok, o => o.type), cash = by(ok, o => o.cashierName), cashN = cnt(ok, o => o.cashierName);
  /* الأصناف: الصافي بعد توزيع خصم الطلب على أصنافه، والتكلفة من تكلفة الصنف وقت البيع */
  const items = {}, add = (key, name, ref, q, gross, f, c) => { const it = items[key] ||= { name, ref, q: 0, v: 0, net: 0, cost: 0, noCost: false };
    it.q += q; it.v = r2(it.v + gross); it.net = r2(it.net + gross * f); if (c == null) it.noCost = true; else it.cost = r2(it.cost + c * q); };
  ok.forEach(o => { const f = o.subtotal ? o.total / o.subtotal : 1;
    o.lines.forEach(l => { add(l.ref || l.name, l.name, l.ref, l.qty, l.qty * l.price, f, l.cost ?? itemCost(l.id));
      l.mods.forEach(m => add(m.ref || m.name, m.name, m.ref, l.qty, l.qty * m.price, f, m.cost ?? itemCost(m.id))); }); });
  const cg = ok.reduce((a, o) => { const c = o.cogs || orderCogs(o), pk = o.pack || packOf(o.lines); a.food += c.food; a.pack += c.pack; a.boxes += pk.boxes; a.bags += pk.bags; a.miss += c.missing; return a; }, { food: 0, pack: 0, boxes: 0, bags: 0, miss: 0 });
  const cogs = r2(cg.food + cg.pack), gp = r2(tot - cogs);
  const disc = ok.filter(o => o.discount), discT = r2(disc.reduce((s, o) => s + o.discount.amount, 0));
  const days = [...new Set(ok.map(o => o.day))].sort();
  $("#rbody").innerHTML = `<div class="kpis"><div class="kpi"><span>صافي المبيعات</span><b>${money(tot)}</b></div><div class="kpi"><span>عدد الطلبات</span><b class="num">${ok.length}</b></div>
      <div class="kpi"><span>متوسط الطلب</span><b>${money(ok.length ? tot / ok.length : 0)}</b></div><div class="kpi"><span>الخصومات</span><b>${money(discT)}</b><span>${disc.length} طلب</span></div>
      <div class="kpi"><span>الملغي</span><b>${money(voids.reduce((s, o) => s + o.total, 0))}</b><span>${voids.length} طلب</span></div></div>
    <div class="kpis"><div class="kpi"><span>تكلفة الطعام</span><b>${money(cg.food)}</b></div><div class="kpi"><span>التغليف</span><b>${money(cg.pack)}</b><span><span class="num">${cg.boxes}</span> علبة · <span class="num">${cg.bags}</span> كيس</span></div>
      <div class="kpi"><span>مجمل الربح</span><b>${money(gp)}</b></div><div class="kpi"><span>نسبة التكلفة</span><b class="num">${tot ? (cogs / tot * 100).toFixed(1) + "%" : "—"}</b><span>طعام ${tot ? (cg.food / tot * 100).toFixed(1) + "%" : "—"}</span></div></div>
    ${cg.miss ? `<div class="note warn" style="margin-bottom:12px">بعض الأصناف المباعة بدون تكلفة، فالتكلفة أقل من الحقيقة. اكتب تكلفتها في «المنيو والأسعار».</div>` : ""}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
      <div><h4 style="margin:6px 0">طرق الدفع</h4><table class="t"><thead><tr><th>الطريقة</th><th class="n">الطلبات</th><th class="n">المبلغ</th></tr></thead><tbody>${Object.entries(METHODS).map(([k, l]) => `<tr><td>${l}</td><td class="n num">${methN[k] || 0}</td><td class="n">${money(meth[k] || 0)}</td></tr>`).join("")}</tbody><tfoot><tr><td>الإجمالي</td><td class="n num">${ok.length}</td><td class="n">${money(tot)}</td></tr></tfoot></table></div>
      <div><h4 style="margin:6px 0">نوع الطلب</h4><table class="t"><thead><tr><th>النوع</th><th class="n">الطلبات</th><th class="n">المبلغ</th></tr></thead><tbody>${TYPES.map(([k, l]) => `<tr><td>${l}</td><td class="n num">${typN[k] || 0}</td><td class="n">${money(typ[k] || 0)}</td></tr>`).join("")}</tbody></table>
        <h4 style="margin:14px 0 6px">حسب الكاشير</h4><table class="t"><tbody>${Object.keys(cash).map(k => `<tr><td>${esc(k)}</td><td class="n num">${cashN[k]}</td><td class="n">${money(cash[k])}</td></tr>`).join("") || `<tr><td class="muted">—</td></tr>`}</tbody></table></div>
      </div>
    <h4 style="margin:16px 0 6px">الأصناف المباعة وربحيتها</h4><table class="t"><thead><tr><th>الصنف</th><th class="n">الكمية</th><th class="n">صافي المبيعات</th><th class="n">تكلفة الطعام</th><th class="n">نسبة التكلفة</th><th class="n">الربح</th></tr></thead><tbody>${Object.values(items).sort((a, b) => b.q - a.q).map(v => { const pc = v.net && !v.noCost ? v.cost / v.net * 100 : null;
        return `<tr><td>${esc(v.name)}</td><td class="n num">${v.q}</td><td class="n">${money(v.net)}</td><td class="n">${v.noCost ? `<span class="chip warn">بدون تكلفة</span>` : money(v.cost)}</td><td class="n">${pc == null ? "—" : `<span class="chip ${pc > 45 ? "bad" : pc > 35 ? "warn" : "ok"} num">${pc.toFixed(1)}%</span>`}</td><td class="n">${v.noCost ? "—" : money(v.net - v.cost)}</td></tr>`; }).join("") || `<tr><td class="muted">—</td></tr>`}</tbody></table>
    <p class="small muted">صافي المبيعات بعد توزيع الخصومات على الأصناف. تكلفة الطعام بدون التغليف، والتغليف محسوب أعلاه بالعدد.</p>
    ${disc.length || voids.length ? `<h4 style="margin:16px 0 6px">الخصومات والإلغاءات</h4><table class="t"><thead><tr><th>الطلب</th><th>اليوم</th><th>النوع</th><th>السبب</th><th>الكاشير</th><th class="n">المبلغ</th></tr></thead><tbody>
      ${disc.map(o => `<tr><td class="num">${pad(o.no, 4)}</td><td class="num">${dmy(o.day)} ${hm(o.ts)}</td><td><span class="chip warn">خصم</span></td><td>${esc(o.discount.reason)}</td><td>${esc(o.cashierName)}</td><td class="n">${money(o.discount.amount)}</td></tr>`).join("")}
      ${voids.map(o => `<tr><td class="num">${pad(o.no, 4)}</td><td class="num">${dmy(o.day)} ${hm(o.ts)}</td><td><span class="chip bad">إلغاء</span></td><td>${esc(o.void?.reason)}</td><td>${esc(o.cashierName)}</td><td class="n">${money(o.total)}</td></tr>`).join("")}</tbody></table>` : ""}
    <p class="small muted" style="margin-top:14px;line-height:1.7">ملف المحاسبة يُستورد في برنامج «محاسبة شاورما العقيلة» من شاشة المبيعات ← استيراد من فودكس، ويحتوي على كل يوم مقسّماً حسب طريقة الدفع (لوكيت يذهب إلى تطبيقات التوصيل). الطلبات التجريبية والملغاة لا تدخل فيه. «تقرير الأصناف» يُستورد في شاشة «تكلفة الوجبات» ← استيراد تقرير الأصناف بنفس الفترة، فتظهر التكلفة النظرية مقارنة بالفواتير الفعلية (كشف الهدر).</p>`;
  $("#ri").onclick = () => {
    const L2 = Object.values(items); if (!L2.length) return toast("لا توجد مبيعات في هذه الفترة");
    const rows = [["المنتج", "كود تعريف المنتج", "صافي الكمية", "صافي المبيعات", "إجمالي المبيعات", "كمية الإلغاء"]];
    const vq = {}; voids.forEach(o => o.lines.forEach(l => { const k = l.ref || l.name; vq[k] = (vq[k] || 0) + l.qty; }));
    L2.forEach(v => rows.push([v.name, v.ref || "", v.q, m2(v.net), m2(v.v), vq[v.ref || v.name] || 0]));
    download(rows, `أصناف-الكاشير-${rep.a}${rep.b !== rep.a ? "_" + rep.b : ""}.csv`);
  };
  $("#rc").onclick = () => {
    if (!days.length) return toast("لا توجد مبيعات في هذه الفترة");
    const rows = [["التاريخ", "طريقة الدفع", "المبلغ الصافي", "العدد"]];
    days.forEach(d => Object.entries(METHODS).forEach(([k, l]) => { const os = ok.filter(o => o.day === d && o.method === k && !o.test); if (os.length) rows.push([d, l, m2(os.reduce((s, o) => s + o.total, 0)), os.length]); }));
    download(rows, `مبيعات-الكاشير-${rep.a}${rep.b !== rep.a ? "_" + rep.b : ""}.csv`);
  };
}

function admMenu() {
  const A = $("#adm"), rows = S.menu.map(m => ({ ...m }));
  const row = (m, i) => `<div class="mrow" data-r="${i}"><input data-f="name" value="${esc(m.name)}" aria-label="اسم الصنف">
    <select data-f="cat" aria-label="القسم">${CATS.map(([k, l]) => `<option value="${k}" ${m.cat === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <input data-f="price" type="number" step="0.25" min="0" inputmode="decimal" dir="ltr" value="${m.price ?? ""}" aria-label="سعر المطعم">
    <input data-f="lokit" type="number" step="0.25" min="0" inputmode="decimal" dir="ltr" value="${m.lokit ?? ""}" placeholder="—" aria-label="سعر لوكيت">
    <input data-f="cost" type="number" step="0.01" min="0" inputmode="decimal" dir="ltr" value="${m.cost ?? ""}" placeholder="—" aria-label="تكلفة الطعام">
    <button class="sw ${m.box ? "on" : ""}" data-f="box" aria-label="يُقدَّم في علبة ورقية"></button>
    <input data-f="sort" type="number" step="1" inputmode="numeric" dir="ltr" value="${m.sort ?? 0}" aria-label="الترتيب">
    <button class="sw ${m.active ? "on" : ""}" data-f="active" aria-label="ظاهر في الكاشير"></button></div>`;
  A.innerHTML = `<div class="note" style="margin-bottom:12px">سعر لوكيت الفارغ يعني أن الصنف غير متوفر في لوكيت. «تكلفة الطعام» للحبة الواحدة بدون التغليف (من برنامج المحاسبة). «علبة» للأصناف التي تُقدَّم في علبة ورقية، ويُحسب لكل منها علبة وكيس. الأصناف المُطفأة تختفي من الكاشير وتبقى في التقارير.</div>
    <div class="mrow h"><span>الصنف</span><span>القسم</span><span>سعر المطعم</span><span>سعر لوكيت</span><span>تكلفة الطعام</span><span>علبة</span><span>الترتيب</span><span>ظاهر</span></div>
    <div id="mrows">${rows.map(row).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn ghost" id="madd">+ صنف جديد</button><span class="sp"></span><button class="btn" id="msv">حفظ المنيو</button></div>
    <p class="small muted">الإضافات (مثل الجبن) تُضاف على الصنف المحدد في السلة. لجعل صنف جديد «إضافة» اختر قسم الإضافات واكتب في اسمه كلمة «جبن» أو أضفه ثم أخبرني.</p>`;
  const bind = () => $$("#mrows [data-f=active],#mrows [data-f=box]").forEach(b => b.onclick = () => b.classList.toggle("on"));
  bind();
  $("#madd").onclick = () => { rows.push({ id: null, name: "", cat: S.cat, price: null, lokit: null, active: true, sort: (Math.max(0, ...rows.map(r => r.sort || 0)) + 10), addon: false });
    $("#mrows").insertAdjacentHTML("beforeend", row(rows.at(-1), rows.length - 1)); bind(); $("#mrows .mrow:last-child input").focus(); };
  $("#msv").onclick = async () => {
    const batch = F.writeBatch(db); let n = 0, err = "";
    $$("#mrows .mrow").forEach(e => { const i = +e.dataset.r, o = rows[i], g = f => e.querySelector(`[data-f=${f}]`);
      const v = { name: g("name").value.trim(), cat: g("cat").value, price: g("price").value === "" ? null : r2(g("price").value), lokit: g("lokit").value === "" ? null : r2(g("lokit").value), sort: +g("sort").value || 0, active: g("active").classList.contains("on"), cost: g("cost").value === "" ? null : r2(g("cost").value), box: g("box").classList.contains("on") };
      if (!v.name && !o.id) return; if (!v.name) err ||= "اسم صنف فارغ"; if (v.price == null || v.price < 0) err ||= `سعر المطعم مطلوب: ${v.name || "صنف جديد"}`;
      v.addon = o.id ? !!o.addon : v.cat === "extras" && /جبن|إضافة|اضافة/.test(v.name);
      const changed = !o.id || ["name", "cat", "price", "lokit", "sort", "active", "cost", "box"].some(k => (o[k] ?? null) !== v[k]);
      if (changed) { batch.set(D("menu", o.id || "m" + Date.now().toString(36) + rid(2)), { ...(o.id ? { ref: o.ref ?? null } : { ref: null }), ...v, updatedAt: Date.now() }, { merge: true }); n++; } });
    if (err) return toast(err, true); if (!n) return toast("لا تغييرات");
    try { await batch.commit(); toast(`تم حفظ ${n} صنف ✓`); admMenu(); } catch (e) { toast("تعذّر الحفظ: " + (e.code || e.message), true); }
  };
}

function admStaff() {
  const A = $("#adm"), cs = S.config.cashiers.map(c => ({ ...c }));
  const inp = "min-height:44px;border:1.5px solid var(--line);border-radius:10px;padding:0 12px;width:100%";
  const row = (c, i) => `<div class="setrow" data-c="${i}"><div style="flex:1;display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:center">
      <input data-f="name" value="${esc(c.name)}" placeholder="اسم الكاشير" style="${inp}" aria-label="الاسم">
      <input data-f="pin" type="password" inputmode="numeric" maxlength="4" dir="ltr" placeholder="${c.pinHash ? "•••• اتركه لعدم التغيير" : "رمز جديد (4 أرقام)"}" autocomplete="new-password" style="${inp}" aria-label="الرمز">
      <span class="chip ${c.pinHash ? "ok" : "warn"}">${c.pinHash ? "له رمز" : "بدون رمز"}</span></div>
      <button class="sw ${c.active ? "on" : ""}" data-f="active" aria-label="نشط"></button></div>`;
  A.innerHTML = `<div class="note" style="margin-bottom:12px">لكل كاشير رمز من 4 أرقام. الرموز تُحفظ مشفّرة ولا يمكن قراءتها، فإن نسي أحدهم رمزه اكتب له رمزاً جديداً. الكاشير المُطفأ لا يظهر في شاشة الدخول. كل طلب يُسجّل باسم الكاشير الذي أدخله.</div>
    <div id="cs">${cs.map(row).join("")}</div>
    <button class="btn ghost sm" id="cadd" style="margin-top:10px">+ كاشير جديد</button>
    <h4 style="margin:22px 0 6px">رمز المدير</h4>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><input id="mp1" type="password" inputmode="numeric" maxlength="8" dir="ltr" placeholder="رمز جديد (4–8 أرقام)" autocomplete="new-password" style="${inp};width:220px">
      <span class="small muted">اتركه فارغاً لعدم التغيير.</span></div>
    <div style="display:flex;margin-top:18px"><span class="sp"></span><button class="btn" id="csv">حفظ</button></div>`;
  const bind = () => $$("#cs [data-f=active]").forEach(b => b.onclick = () => b.classList.toggle("on")); bind();
  $("#cadd").onclick = () => { cs.push({ id: "c" + Date.now().toString(36), name: "", pinHash: null, active: true });
    $("#cs").insertAdjacentHTML("beforeend", row(cs.at(-1), cs.length - 1)); bind(); $("#cs .setrow:last-child input").focus(); };
  $("#csv").onclick = async () => {
    const out = [], pins = new Set(); let err = "";
    for (const e of $$("#cs [data-c]")) { const c = cs[+e.dataset.c], name = e.querySelector("[data-f=name]").value.trim(), pin = e.querySelector("[data-f=pin]").value.trim();
      if (!name) { if (!c.pinHash && !S.config.cashiers.some(x => x.id === c.id)) continue; err ||= "اسم الكاشير فارغ"; }
      if (pin && !/^\d{4}$/.test(pin)) err ||= `رمز ${name} يجب أن يكون 4 أرقام`;
      if (pin) { if (pins.has(pin)) err ||= "لا تعطِ كاشيرين نفس الرمز"; pins.add(pin); }
      out.push({ id: c.id, name, active: e.querySelector("[data-f=active]").classList.contains("on"), pinHash: pin ? await sha(S.config.salt + ":" + pin) : c.pinHash || null }); }
    const mp = $("#mp1").value.trim(); if (mp && !/^\d{4,8}$/.test(mp)) err ||= "رمز المدير من 4 إلى 8 أرقام";
    if (err) return toast(err, true);
    const upd = { cashiers: out, updatedAt: Date.now() }; if (mp) upd.managerPinHash = await sha(S.config.salt + ":" + mp);
    try { await F.updateDoc(D("config", "main"), upd); toast("تم الحفظ ✓"); admStaff(); } catch (e) { toast("تعذّر الحفظ: " + (e.code || e.message), true); }
  };
}

function admStore() {
  const A = $("#adm"), st = S.config.store;
  A.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;align-items:start"><div>
    <div class="f"><label for="sn">اسم المطعم في الإيصال</label><input id="sn" value="${esc(st.name)}"></div>
    <div class="f"><label for="sa">العنوان</label><input id="sa" value="${esc(st.address)}"></div>
    <div class="f"><label for="sp">رقم الطلبات</label><input id="sp" dir="ltr" inputmode="tel" value="${esc(st.phone)}"></div>
    <div class="f"><label for="st">عبارة الشكر</label><input id="st" value="${esc(st.thanks)}"></div>
    <div class="f"><label for="sc">بداية اليوم التشغيلي (الساعة)</label><select id="sc">${[0, 1, 2, 3, 4, 5, 6].map(h => `<option value="${h}" ${(S.config.cutoff ?? 4) === h ? "selected" : ""}>${h === 0 ? "12 منتصف الليل" : `${h} فجراً`}</option>`).join("")}</select>
      <span class="hint">الطلبات قبل هذه الساعة تُحسب على اليوم السابق، مثل فودكس.</span></div>
    <div class="f"><label>الشعار في الإيصال (أسود على أبيض)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn ghost sm" for="lg">اختيار صورة الشعار</label><input id="lg" type="file" accept="image/*" hidden>${S.config.logo ? `<button class="btn ghost sm" id="lgx" style="color:var(--bad)">إزالة الشعار</button>` : ""}</div>
      <span class="hint">تتحول الصورة تلقائياً إلى أبيض وأسود بحجم مناسب للطابعة.</span></div>
    <button class="btn" id="ssv">حفظ</button></div>
    <div><p class="small muted" style="margin:0 0 6px">معاينة الإيصال</p><img id="pv" class="rcpt" style="width:300px" alt="معاينة الإيصال"></div></div>`;
  let logo = S.config.logo || null;
  const preview = async () => { const keep = S.config; S.config = { ...S.config, logo, store: { name: $("#sn").value, address: $("#sa").value, phone: $("#sp").value, thanks: $("#st").value } };
    try { $("#pv").src = (await drawReceipt(sampleOrder())).toDataURL(); } finally { S.config = keep; } };
  ["sn", "sa", "sp", "st"].forEach(k => $("#" + k).oninput = preview); preview();
  $("#lg").onchange = async () => { const f = $("#lg").files[0]; if (!f) return; logo = await toMonoLogo(f); preview(); };
  $("#lgx") && ($("#lgx").onclick = () => { logo = null; preview(); });
  $("#ssv").onclick = async () => {
    const store = { name: $("#sn").value.trim(), address: $("#sa").value.trim(), phone: $("#sp").value.trim(), thanks: $("#st").value.trim() };
    if (!store.name) return toast("اسم المطعم مطلوب", true);
    try { await F.updateDoc(D("config", "main"), { store, cutoff: +$("#sc").value, logo, updatedAt: Date.now() }); toast("تم الحفظ ✓"); } catch (e) { toast("تعذّر الحفظ: " + (e.code || e.message), true); }
  };
}
function toMonoLogo(file) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => { const w = Math.min(300, im.width), h = Math.round(im.height * w / im.width), c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h); const d = g.getImageData(0, 0, w, h), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const v = (p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114) < 150 && p[i + 3] > 100 ? 0 : 255; p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255; }
    g.putImageData(d, 0, 0); URL.revokeObjectURL(im.src); res(c.toDataURL("image/png")); }; im.onerror = rej; im.src = URL.createObjectURL(file); });
}

function admVerify() {
  const A = $("#adm");
  A.innerHTML = `<div class="note" style="margin-bottom:12px">إذا شككت في إيصال (مبلغ معدّل أو إيصال مزوّر) أدخل تاريخه ورقم الطلب ورمز التحقق المطبوع في أسفله.</div>
    <div class="toolbar"><div class="f"><label for="vd">التاريخ</label><input id="vd" type="date" value="${bizDay()}"></div><div class="f"><label for="vn">رقم الطلب</label><input id="vn" inputmode="numeric" dir="ltr" style="width:120px"></div>
    <div class="f"><label for="vc">رمز التحقق</label><input id="vc" dir="ltr" style="width:140px;text-transform:uppercase"></div><button class="btn" id="vgo">تحقق</button></div><div id="vout"></div>`;
  $("#vgo").onclick = async () => { const d = $("#vd").value, no = +$("#vn").value, code = $("#vc").value.trim().toUpperCase(); if (!d || !no) return toast("أدخل التاريخ ورقم الطلب", true);
    const s = await F.getDocs(F.query(C("orders"), F.where("day", "==", d))); const os = s.docs.map(x => x.data()).filter(o => o.no === no);
    if (!os.length) { $("#vout").innerHTML = `<div class="err">لا يوجد طلب بهذا الرقم في هذا التاريخ.</div>`; return; }
    const res = await Promise.all(os.map(async o => ({ o, real: await receiptCode(o) })));
    $("#vout").innerHTML = res.map(({ o, real }) => `<div class="${code ? (code === o.code && code === real ? "note" : "err") : "note"}" style="margin-bottom:10px">
      ${code ? (code === o.code && code === real ? "✓ الإيصال صحيح ومطابق للنظام." : "✕ رمز التحقق لا يطابق هذا الطلب، الإيصال غير أصلي أو معدّل.") : "بيانات الطلب في النظام:"}
      ${real !== o.code ? "<br><b>تنبيه: بيانات هذا الطلب في النظام عُدّلت بعد حفظه.</b>" : ""}</div>${orderDetail(o)}`).join("<hr>");
  };
}

/* expose for tests */
window.__aq = { S, render, total, bizDay, drawReceipt, raster, shiftCalc, drawShiftReport, packOf, orderCogs };
