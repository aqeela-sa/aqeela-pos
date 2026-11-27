/* كاشير شاورما العقيله — المرحلة الأولى
   شاشة البيع، أنواع الطلب، طرق الدفع، الإيصال والطباعة، الطلبات اليوم، الإلغاء والخصم برمز المدير،
   ولوحة المدير (المنيو، الكاشيرون والرموز، التقرير اليومي وتصديره لبرنامج المحاسبة). */
import * as F from "./fb.js";
import { firebaseConfig } from "./firebase-config.js";

const VERSION = "2.12.2";
/* the screen language (per device): Arabic or English; the receipt and kitchen ticket stay Arabic */
const isEn = () => !!(window.aqLang && window.aqLang() === "en");
const langLink = id => `<button type="button" class="link" id="${id}" data-noi18n style="color:var(--mut);font-size:14px">${isEn() ? "العربية" : "English"}</button>`;
const bindLang = id => { const b = document.getElementById(id); if (b) b.onclick = () => { if (S.pending && !confirm("هناك طلبات لم تُرسل بعد. ستبقى محفوظة في الجهاز وتُرسل لاحقاً. هل تريد المتابعة؟")) return; window.aqSetLang && window.aqSetLang(isEn() ? "ar" : "en"); }; };
const ADMIN_EMAIL = "abuabraj@gmail.com";
const DEVICE_EMAIL = "cashier@aqeela-pos.app";
const APP_NAME = `<span dir="ltr">Cashier AQ</span>`;

const CATS = [["chicken", "الدجاج"], ["meat", "اللحم"], ["extras", "الإضافات"], ["drinks", "المشروبات"]];
const TYPES = [["dine", "محلي"], ["take", "سفري"], ["delivery", "توصيل"], ["lokit", "لوكيت"], ["hunger", "هنقرستيشن"]];
const METHODS = { cash: "كاش", mada: "مدى", visa: "فيزا", lokit: "لوكيت", hunger: "هنقرستيشن" };
/* a payment may be split over cash and cards: o.method = "split", o.pays = [{m, a}]. These give what each method took */
const payParts = o => Array.isArray(o?.pays) && o.pays.length ? o.pays : o?.method ? [{ m: o.method, a: o.total }] : [];
const paidBy = (o, k) => Math.round(payParts(o).filter(p => p.m === k).reduce((s, p) => s + (+p.a || 0), 0) * 100) / 100;
const hasM = (o, k) => payParts(o).some(p => p.m === k);
const mLabel = o => Array.isArray(o?.pays) && o.pays.length ? o.pays.map(p => `${METHODS[p.m]} ${(+p.a).toFixed(2)}`).join(" + ") : o?.method ? METHODS[o.method] : "لم يُدفع";
/* تطبيقات التوصيل: لها أسعارها الخاصة (حقل بنفس اسم النوع في الصنف)، والدفع يتم داخل التطبيق */
const AGG = ["lokit", "hunger"], isAgg = t => AGG.includes(t), tName = t => TYPES.find(x => x[0] === t)?.[1] || t;

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
/* أسعار هنقرستيشن من منيو المالك (21/11/2026) — تُعبَّأ مرة واحدة في الأصناف التي ليس لها سعر هنقرستيشن */
const HUNGER_PRICES = { "sk-0007": 11, "sk-0009": 33.5, "sk-0001": 17, "sk-0005": 13, "sk-0003": 21, "sk-0011": 28, "sk-0012": 41,
  "sk-0008": 13, "sk-0010": 38, "sk-0002": 20, "sk-0006": 17, "sk-0004": 22, "sk-0013": 36 };
/* الإضافات والمشروبات (أُرسلت بعد المنيو) — بعلامة مستقلة لتُعبَّأ حتى لو عُبّئت الوجبات من قبل */
const HUNGER_EXTRAS = { "sk-0014": 10, "sk-0015": 2, "sk-0016": 4, "sk-0017": 4, "sk-0018": 2 };
const BOX_REFS = ["sk-0009", "sk-0010", "sk-0011", "sk-0012", "sk-0013"];
const DEFAULT_PACK = { boxPrice: 1.4, bagKgPrice: 9, bagsPerKg: 60, perBag: 3 };
/* ملاحظات الأصناف السريعة (مجانية) — يعدّلها المدير من «الإيصال والإعدادات» */
const INGREDIENTS = ["ثوم", "طحينة", "سبايسي", "بطاطس", "كاتشب", "مخلل", "خس", "طماطم", "بصل"];
const DEFAULT_NOTES = INGREDIENTS.flatMap(x => [`بدون ${x}`, `زيادة ${x}`]);
const noteList = () => (S.config?.notes?.length ? S.config.notes : DEFAULT_NOTES);
const hasNotes = l => (l.notes && l.notes.length) || l.note;
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
let cartBack = false;
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const SHA_K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
/* SHA-256 without await, identical to sha() */
function sha256Hex(s) {
  const m = new TextEncoder().encode(s), l = m.length, n = ((l + 9 + 63) >> 6) << 6, b = new Uint8Array(n); b.set(m); b[l] = 0x80;
  const dv = new DataView(b.buffer); dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor(l / 0x20000000));
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], c = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(c, 17) ^ r(c, 19) ^ (c >>> 10))) >>> 0; }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) >>> 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  return H.map(x => x.toString(16).padStart(8, "0")).join("");
}
const rid = (n = 6) => [...crypto.getRandomValues(new Uint8Array(n))].map(x => "abcdefghjkmnpqrstuvwxyz23456789"[x % 31]).join("");
function toast(t, bad) { $(".toast")?.remove(); const e = document.createElement("div"); e.className = "toast" + (bad ? " bad" : ""); e.textContent = t; document.body.append(e); setTimeout(() => e.remove(), 3200); }
const bizDay = (t = Date.now()) => ymd(new Date(t - (S.config?.cutoff ?? 4) * 3600e3));

/* ---------- state ---------- */
const S = {
  user: null, role: null, config: null, menu: [], menuReady: false, configReady: false,
  cashier: ls.get("cashier", null), view: "boot", shift: ls.get("shift", null), shiftOrders: [],
  /* الطلب الجاري يُحفظ في الجهاز مع كل تعديل، فإن أُعيد تحميل الصفحة (يحدث في سفاري أحياناً) يرجع كما كان */
  cart: (() => { const c = ls.get("cart", null); if (c && Array.isArray(c.lines) && c.lines.length && Date.now() - (c.at || 0) < 12 * 36e5) { cartBack = true; return { type: c.type || null, lines: c.lines, discount: c.discount || null, sel: null, ...(c.phone ? { phone: c.phone } : {}), ...(c.name ? { name: c.name } : {}), ...(c.edit ? { edit: c.edit, driver: c.driver || "" } : {}) }; } return { type: null, lines: [], discount: null, sel: null }; })(), cat: "chicken",
  today: [], pending: 0, online: navigator.onLine,
  dev: ls.get("dev", null) || (() => { const d = rid(4); ls.set("dev", d); return d; })(),
  device: Object.assign({ printMode: "browser", printerIp: "", autoPrint: true, test: false, kitchenMode: "same", kitchenIp: "", drawer: false }, ls.get("device", {})),
  printer: null, unprinted: null,
  unsub: [],
};
const saveDevice = () => ls.set("device", S.device);
/* one cashier window per device: a second tab would share the order counter and fight the first over the offline store.
   The window opened later stops and says where the cashier is open. */
try { const bc = new BroadcastChannel("aq-pos"), me = rid(6);
  bc.onmessage = e => { const m = e.data || {}; if (m.id === me) return;
    if (m.t === "ping") bc.postMessage({ t: "here", id: me });
    if (m.t === "here" && !S.dupe) { S.dupe = true; const d = document.createElement("div"); d.id = "dupe";
      d.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(24,24,27,.92);color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center";
      d.innerHTML = `<div style="max-width:440px"><h2 style="margin:0 0 10px">الكاشير مفتوح في نافذة أخرى</h2><p style="line-height:1.8;margin:0 0 18px;opacity:.9">على هذا الجهاز نافذة كاشير مفتوحة من قبل. استخدمها وأغلق هذه النافذة، حتى لا تتكرر أرقام الطلبات.</p><button class="btn" id="dupr">أغلقت الأخرى، أعد التحميل</button></div>`;
      document.body.appendChild(d); d.querySelector("#dupr").onclick = () => location.reload(); } };
  bc.postMessage({ t: "ping", id: me });
} catch {}
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
addEventListener("keydown", e => { if (S.view === "pin" && !$("#ov") && $("#dots") && S.pinKey && !e.metaKey && !e.ctrlKey) S.pinKey(e.key); });
addEventListener("offline", () => { S.online = false; drawTop(); });

F.onAuthStateChanged(auth, u => {
  /* the same account signing in again (after a password change in «حسابي») keeps the open manager console as it is */
  if (u && S.user && u.uid === S.user.uid && S.view === "admin") { S.user = u; return; }
  S.unsub.forEach(f => f()); S.unsub = []; shiftSub?.(); shiftSub = null; shiftSubId = "";
  S.user = u; S.role = !u ? null : u.email === ADMIN_EMAIL ? "admin" : u.email === DEVICE_EMAIL ? "device" : "other";
  if (!u) return render("login");
  if (S.role === "other") return render("login", "هذا الحساب غير مصرّح له بالكاشير.");
  S.configReady = S.menuReady = false; render("boot");
  if (S.shift) { shiftSubId = ""; setShift(S.shift); }
  S.unsub.push(F.onSnapshot(D("config", "main"), s => { S.config = s.exists() ? s.data() : null; S.configReady = true; migrate(); route(); loadLogo(); },
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
    S.pending = S.today.filter(o => o._pending).length; drawTop(); if ($("#orders-list")) drawOrdersList(); if ($("#prep-list")) drawPrep();
  }, e => console.error(e));
}
setInterval(() => { if (S.view === "pos") { watchToday(); if (!document.querySelector("#q:focus")) drawTop(); } }, 60e3);

/* ترقية بيانات قديمة مرة واحدة (من حساب المدير فقط): تكلفة الأصناف، والعلب، وأسعار التغليف */
let migrated = false;
function migrate() {
  if (migrated || !isAdmin() || !S.configReady || !S.menuReady || !S.config || !S.menu.length) return; migrated = true;
  const b = F.writeBatch(db); let n = 0;
  S.menu.forEach(m => { const u = {};
    if (!("cost" in m)) u.cost = m.ref && DEFAULT_COSTS[m.ref] != null ? DEFAULT_COSTS[m.ref] : null;
    if (!("box" in m)) u.box = BOX_REFS.includes(m.ref);
    if (!S.config.hungerSeeded && (m.hunger == null || m.hunger === "") && m.ref && HUNGER_PRICES[m.ref] != null) u.hunger = HUNGER_PRICES[m.ref];
    if (!S.config.hungerExtras && (m.hunger == null || m.hunger === "") && m.ref && HUNGER_EXTRAS[m.ref] != null) u.hunger = HUNGER_EXTRAS[m.ref];
    if (Object.keys(u).length) { b.set(D("menu", m.id), u, { merge: true }); n++; } });
  if (!S.config.pack) { b.set(D("config", "main"), { pack: DEFAULT_PACK }, { merge: true }); n++; }
  if (!S.config.hungerSeeded || !S.config.hungerExtras) { const t = new Date().toISOString(); b.set(D("config", "main"), { hungerSeeded: S.config.hungerSeeded || t, hungerExtras: t }, { merge: true }); n++; }
  if (n) b.commit().catch(e => console.error("migrate", e));
}

function route() {
  if (!S.configReady || !S.menuReady) return;
  if (!S.config || !S.menu.length) return render(isAdmin() ? "setup" : "notready");
  if (S.view === "admin") return;
  if (isAdmin() && location.hash.startsWith("#/admin") && S.view !== "admin") return openAdmin();
  const c = S.cashier && S.config.cashiers.find(x => x.id === S.cashier.id && x.active);
  if (!c) { S.cashier = null; ls.set("cashier", null); }
  if (S.view === "pos" && S.cashier && S.shift) { drawMenu(); drawCart(); drawTop(); return; }
  if (S.view === "pin" || !S.cashier) return render("pin");
  render(S.shift ? "pos" : "openshift");
}

/* ---------- screens ---------- */
function render(view, msg) {
  if (S.view === "admin" && view !== "admin") window.__cxUnmount?.();
  if (S.view !== view) closeModal(); S.view = view; const A = $("#app");
  if (view === "boot") A.innerHTML = `<div class="center"><div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>${APP_NAME}</h1><p>جارٍ التحميل…</p></div></div>`;
  if (view === "login") return drawLogin(msg);
  if (view === "setup") return drawSetup();
  if (view === "notready") A.innerHTML = `<div class="center"><div class="panel"><div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>الكاشير غير مُجهّز بعد</h1><p>يجب أن يدخل المدير مرة واحدة من حسابه لتجهيز المنيو والإعدادات.</p></div>
    <button class="btn ghost block" id="lo">تسجيل الخروج</button></div></div>`, $("#lo").onclick = () => F.signOut(auth);
  if (view === "pin") return drawPin();
  if (view === "admin") return openAdmin();
  if (view === "pos") { if (!S.shift) return render("openshift"); return drawPos(); }
  if (view === "openshift") return drawOpenShift();
}

function drawLogin(msg) {
  $("#app").innerHTML = `<div class="center"><form class="panel" id="lf">
    <div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>${APP_NAME}</h1><p>تسجيل دخول الجهاز (مرة واحدة)</p></div>
    ${msg ? `<div class="err">${esc(msg)}</div>` : ""}
    <div class="f"><label for="em">البريد الإلكتروني</label><input id="em" type="email" autocomplete="username" inputmode="email" dir="ltr" value="${esc(ls.get("lastEmail", DEVICE_EMAIL))}" required></div>
    <div class="f"><label for="pw">كلمة المرور</label><input id="pw" type="password" autocomplete="current-password" dir="ltr" required></div>
    <button class="btn block" id="lb">دخول</button>
    <p class="small muted" style="margin:14px 0 0;line-height:1.7">آيباد المطعم يدخل بحساب الجهاز <span class="num">${DEVICE_EMAIL}</span>. المدير يدخل ببريده لإدارة المنيو والرموز والتقارير. يبقى الجهاز مسجّلاً حتى بدون إنترنت.</p>
    <p class="small muted" style="margin:6px 0 0;text-align:center">الإصدار <span class="num">${VERSION}</span></p><div style="text-align:center;margin-top:6px">${langLink("lg_lang")}</div></form></div>`;
  bindLang("lg_lang");
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
    <div class="brand"><div class="logo"><img src="icons/logo.png" alt=""></div><h1>${APP_NAME}</h1><p>اختر اسمك وأدخل رمزك</p></div>
    ${noPins ? `<div class="note warn" style="margin-bottom:12px">لم تُحدَّد رموز الكاشيرين بعد. ${isAdmin() ? "حدّدها من لوحة المدير ← الكاشيرون." : "يحددها المدير من لوحة المدير."}</div>` : ""}
    <div class="who">${list.map(c => `<button data-c="${c.id}" ${!c.pinHash ? "disabled" : ""}>${esc(c.name)}${!c.pinHash ? "<small>بدون رمز</small>" : ""}</button>`).join("")}</div>
    <div class="dots" id="dots">${"<i></i>".repeat(4)}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join("")}<button class="fn" data-k="c">مسح</button><button data-k="0">0</button><button class="fn" data-k="b">⌫</button></div>
    <div style="display:flex;justify-content:space-between;margin-top:14px">${isAdmin() ? `<button class="link" id="toadm">لوحة المدير</button>` : `<button class="link" id="pdev" style="display:inline-flex;align-items:center;gap:6px">${ic("gear")}إعدادات الجهاز</button>`}<button class="link" id="lo" style="color:var(--mut)">خروج الجهاز</button></div>
    <div style="display:flex;justify-content:center;align-items:center;gap:14px;margin-top:10px"><button class="link" id="pup" style="color:var(--mut);font-size:13px">${ic("refresh")} تحديث الكاشير · الإصدار <span class="num">${VERSION}</span></button>${langLink("pn_lang")}</div>
  </div></div>`;
  bindLang("pn_lang");
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
  /* لوحة مفاتيح خارجية: الأرقام والحذف */
  S.pinKey = k => { if (/^\d$/.test(k) && pin.length < 4) { pin += k; dots(); if (pin.length === 4) check(); } else if (k === "Backspace") { pin = pin.slice(0, -1); dots(); } };
  $("#pdev") && ($("#pdev").onclick = () => askManager("إعدادات الجهاز", openDevice));
  $("#pup") && ($("#pup").onclick = async () => { try { const r = await navigator.serviceWorker?.getRegistration(); await r?.update(); } catch {} location.reload(); });
  $("#lo").onclick = () => { if (S.shift) return toast("قفّل الوردية المفتوحة أولاً", true); askManager("خروج الجهاز من الحساب", () => F.signOut(auth)); };
  if ($("#toadm")) $("#toadm").onclick = openAdmin;
}

/* ----- POS (شاشة البيع) ----- */
const IC = {
  globe: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95a15.65 15.65 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.987 7.987 0 0 1 5.08 16zm2.95-8H5.08a7.987 7.987 0 0 1 4.33-3.56A15.65 15.65 0 0 0 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z",
  search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  close: "M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  remove: "M19 13H5v-2h14v2z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  print: "M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z",
  person: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
  receipt: "M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z",
  check: "M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  back: "M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z",
  take: "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8 4c0 .55-.45 1-1 1s-1-.45-1-1V8h2v2zm2-6c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm4 6c0 .55-.45 1-1 1s-1-.45-1-1V8h2v2z",
  dine: "M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z",
  lokit: "M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1zM5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
  fire: "M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.75-.55C9.29 3.71 6.68 8 8.87 13.62c.18.46-.36.89-.75.59-1.81-1.37-2-3.34-1.84-4.75.06-.52-.62-.77-.91-.34C4.69 10.16 4 11.84 4 14.37c.38 5.6 5.11 7.32 6.81 7.54 2.43.31 5.06-.14 6.95-1.87 2.08-1.93 2.84-5.01 1.72-7.69zm-9.28 5.03c1.44-.35 2.18-1.39 2.38-2.31.33-1.43-.96-2.83-.09-5.09.33 1.87 3.27 3.04 3.27 5.08.08 2.53-2.66 4.7-5.56 2.32z",
  note: "M3 10h11v2H3v-2zm0-2h11V6H3v2zm0 8h7v-2H3v2zm15.01-3.13.71-.71c.39-.39 1.02-.39 1.41 0l.71.71c.39.39.39 1.02 0 1.41l-.71.71-2.12-2.12zm-.71.71-5.3 5.3V21h2.12l5.3-5.3-2.12-2.12z",
  tag: "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z",
  pause: "M9 16h2V8H9v8zm3-14C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm1-4h2V8h-2v8z",
  clock: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  swap: "M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z",
  gear: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  dash: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  refresh: "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  cash: "M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z",
  card: "M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  cart: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
  chev: "M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z",
  car: "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z",
  phone: "M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  wa: "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01c-1.77 0-3.5-.48-5.02-1.38l-.36-.21-3.73.98 1-3.64-.24-.37A9.86 9.86 0 0 1 2.18 12C2.18 6.56 6.6 2.14 12.05 2.14c2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 0 1 2.89 6.98c0 5.44-4.43 9.86-9.88 9.86zm8.41-18.27A11.82 11.82 0 0 0 12.04 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.14 1.59 5.94L.07 24l6.33-1.66a11.86 11.86 0 0 0 5.64 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.48-8.4z",
  undo: "M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
};
const ic = (k, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[k]}"/></svg>`;
const CAT_C = { chicken: "#D9822B", meat: "#A23B2A", extras: "#2E8B57", drinks: "#2F6FB5" };
const TYPE_IC = { dine: "dine", take: "take", delivery: "car", lokit: "lokit", hunger: "phone" };
const norm = s => String(s || "").replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase().trim();
const peekNo = () => { const d = bizDay(); return Math.max(ls.get("seq_" + d, 0), S.today.filter(o => o.day === d).reduce((m, o) => Math.max(m, o.no || 0), 0)) + 1; };
const parked = () => ls.get("parked", []);
S.q = ""; S.cartOpen = false;

function drawPos() {
  watchToday();
  $("#app").innerHTML = `${S.device.test ? `<div class="testbar">وضع تجريبي — الطلبات لا تُحسب في المبيعات</div>` : ""}
  <header class="top" id="top"></header>
  <main class="pos ${S.cartOpen ? "cart-open" : ""}" id="pos"><section class="menu"><nav class="cats" id="cats"></nav><div class="grid" id="grid"></div>
    <button class="cbar" id="cbar"></button></section>
  <aside class="cart" id="cart"></aside></main>`;
  drawTop(); drawMenu(); drawCart();
}
function drawTop() {
  const T = $("#top"); if (!T) return; const np = prepOpen().length;
  const net = !S.online ? `<span class="net off" title="بدون إنترنت — الطلبات تُحفظ في الجهاز وتُرسل لاحقاً"><i></i><span>بدون إنترنت</span></span>`
    : S.pending ? `<span class="net pend" title="طلبات تنتظر الإرسال"><i></i><span>يُرسل <b class="num">${S.pending}</b></span></span>` : `<span class="net" title="متصل"><i></i><span>متصل</span></span>`;
  const keep = $("#q") && document.activeElement === $("#q");
  if (keep) { /* لا نعيد رسم حقل البحث أثناء الكتابة */
    T.querySelector(".t-st").innerHTML = net + topBtns(np); bindTop(true); return; }
  T.innerHTML = `<div class="t-brand"><img src="icons/logo.png" alt=""><span>${APP_NAME}</span></div>
    <label class="srch">${ic("search")}<input id="q" type="search" placeholder="ابحث عن صنف" autocomplete="off" enterkeyhint="search" value="${esc(S.q)}"><button id="qx" aria-label="مسح البحث" ${S.q ? "" : "hidden"}>${ic("close")}</button></label>
    <div class="sp"></div><div class="t-st">${net}${topBtns(np)}</div>`;
  bindTop();
}
const prnChip = () => S.unprinted ? `<button class="tchip pbad" id="prx" title="${esc(S.unprinted.msg || "")}">${ic("print")}لم يُطبع <span class="num">${(S.unprinted.o.no ?? "")}</span></button>`
  : S.device.printMode === "epos" && S.printer?.err ? `<button class="tchip pbad" id="prc" title="${esc(S.printer.err)}">${ic("print")}الطابعة</button>`
  : S.device.printMode === "epos" && S.printer?.near ? `<button class="tchip pwarn" id="prc" title="ركّب لفة ورق جديدة قريباً">${ic("print")}الورق قارب على الانتهاء</button>` : "";
const topBtns = np => { const nu = unpaidList().length; return `${S.device.test ? `<span class="tchip test">تجريبي</span>` : ""}${mgrOpen() ? `<span class="tchip test" title="الخصم والإلغاء والصرف بدون رمز المدير، وكلها تُسجَّل">صلاحيات التدريب مفتوحة</span>` : ""}${prnChip()}
    <button class="tbtn ${nu ? "due" : ""}" id="unp" title="طلبات أُرسلت للمطبخ ولم تُدفع">${ic("clock")}<span class="tl">بانتظار الدفع</span>${nu ? `<b class="bd num">${nu}</b>` : ""}</button>
    <button class="tbtn ${np ? "hot" : ""}" id="prp" title="طلبات قيد التحضير">${ic("fire")}<span class="tl">قيد التحضير</span>${np ? `<b class="bd num">${np}</b>` : ""}</button>
    <button class="tbtn" id="ord" title="التقارير: المبيعات والطلبات والأصناف">${ic("dash")}<span class="tl">التقارير</span></button>
    <button class="tbtn who" id="me" title="الكاشير والوردية">${ic("person")}<span class="tw"><b>${esc(S.cashier?.name || "")}</b><small>وردية <span class="num">${S.shift ? hm(S.shift.openedAt) : ""}</span></small></span>${ic("chev", "cv")}</button>
    <button class="tbtn sq" id="more" title="القائمة" aria-label="القائمة">${ic("menu")}</button>`; };
function bindTop(partial) {
  if (!partial) {
    const q = $("#q");
    q.oninput = () => { S.q = q.value; $("#qx").hidden = !S.q; drawMenu(); };
    q.onkeydown = e => { if (e.key === "Escape") { S.q = ""; q.value = ""; $("#qx").hidden = true; drawMenu(); q.blur(); }
      if (e.key === "Enter") { const first = $("#grid .item:not(:disabled)"); if (first) { first.click(); q.select(); } } };
    $("#qx").onclick = () => { S.q = ""; q.value = ""; $("#qx").hidden = true; drawMenu(); };
  }
  $("#me").onclick = e => cashierMenu(e.currentTarget);
  $("#ord").onclick = () => openReports(); $("#prp").onclick = openPrep; $("#unp").onclick = openUnpaid;
  $("#more").onclick = openMore;
  if ($("#prx")) $("#prx").onclick = async () => { $("#prx").disabled = true; await retryPrint(); if ($("#prx")) $("#prx").disabled = false; };
  if ($("#prc")) $("#prc").onclick = async () => { const r = await checkPrinter(true); toast(r === true ? "الطابعة جاهزة" : r, r !== true && !/قارب/.test(r)); };
}
function cashierMenu(btn) {
  popMenu(btn, `<div class="pm-h"><b>${esc(S.cashier?.name || "")}</b><small>الوردية مفتوحة منذ <span class="num">${S.shift ? hm(S.shift.openedAt) : ""}</span> · فتحها ${esc(S.shift?.openedBy?.name || "")}</small></div>
    <button id="sh">${ic("clock")}<span>الوردية<small>الملخص، إيداع، صرف، تقفيل</small></span></button>
    <button id="sw">${ic("swap")}<span>تبديل الكاشير<small>دخول كاشير آخر برمزه</small></span></button>`,
    { sh: openShift, sw: switchCashier });
}
function popMenu(anchor, html, acts) {
  closePop(); const p = document.createElement("div"); p.className = "pmenu"; p.id = "pmenu"; p.innerHTML = html; document.body.append(p);
  const r = anchor.getBoundingClientRect(), w = p.offsetWidth;
  p.style.top = (r.bottom + 8) + "px"; p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  Object.entries(acts).forEach(([id, f]) => { const b = p.querySelector("#" + id); if (b) b.onclick = () => { closePop(); f(); }; });
  setTimeout(() => addEventListener("pointerdown", S.popOff = e => { if (!p.contains(e.target)) closePop(); }, true));
}
function closePop() { $("#pmenu")?.remove(); if (S.popOff) { removeEventListener("pointerdown", S.popOff, true); S.popOff = null; } }

const priceOf = (it, type = S.cart.type) => isAgg(type) ? it[type] : it.price;
const avail = (it, type = S.cart.type) => it.active && priceOf(it, type) != null;
function drawMenu() {
  const G = $("#grid"); if (!G) return;
  const act = S.menu.filter(m => m.active), cats = CATS.filter(([k]) => act.some(m => m.cat === k)), q = norm(S.q);
  if (!cats.some(([k]) => k === S.cat)) S.cat = cats[0]?.[0] || "chicken";
  const list = q ? act.filter(m => norm(m.name).includes(q)) : act.filter(m => m.cat === S.cat);
  $("#cats").innerHTML = q ? `<div class="sres">${ic("search")}نتائج البحث عن «${esc(S.q)}» <b class="num">${list.length}</b><button id="qx2">${ic("close")}مسح</button></div>`
    : cats.map(([k, l]) => `<button data-cat="${k}" class="${S.cat === k ? "on" : ""}" style="--c:${CAT_C[k] || "#71717A"}"><i></i>${l}<small class="num">${act.filter(m => m.cat === k).length}</small></button>`).join("");
  $$("[data-cat]").forEach(b => b.onclick = () => { S.cat = b.dataset.cat; drawMenu(); $("#grid").scrollTop = 0; });
  $("#qx2") && ($("#qx2").onclick = () => { S.q = ""; if ($("#q")) { $("#q").value = ""; $("#qx").hidden = true; } drawMenu(); });
  const qty = id => S.cart.lines.reduce((s, l) => s + (l.id === id ? l.qty : 0) + l.mods.filter(m => m.id === id).length * l.qty, 0);
  const anyImg = list.some(m => m.img);
  G.innerHTML = list.map(m => { const p = priceOf(m), n = qty(m.id);
    return `<button class="item ${m.addon ? "addon" : ""} ${n ? "in" : ""} ${m.img || anyImg ? "has-img" : ""}" data-i="${m.id}" style="--c:${CAT_C[m.cat] || "#71717A"}" ${p == null ? "disabled" : ""}>
      ${n ? `<span class="q num">${n}</span>` : ""}${m.img ? `<span class="pimg"><img src="${m.img}" alt="" loading="lazy" decoding="async"></span>` : anyImg ? `<span class="pimg ph">${esc(m.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join(" "))}</span>` : ""}<span class="nm">${esc(m.name)}</span>
      <span class="ft">${p == null ? `<small class="na">${isAgg(S.cart.type) || m.price != null ? `غير متوفر في ${tName(S.cart.type) || "المطعم"}` : `${AGG.filter(k => m[k] != null).map(tName).join(" و")} فقط`}</small>` : `<span class="pr"><span class="num">${m2(p)}</span> <small>ر.س</small></span>`}${m.addon ? `<span class="ad">إضافة</span>` : ""}</span></button>`; }).join("")
    || `<div class="empty">${q ? "لا يوجد صنف بهذا الاسم" : "لا أصناف في هذا القسم"}</div>`;
  $$("[data-i]").forEach(b => b.onclick = () => { addItem(b.dataset.i); b.classList.remove("tap"); void b.offsetWidth; b.classList.add("tap"); });
}
function addItem(id) {
  const it = S.menu.find(m => m.id === id); if (!it || !avail(it)) return;
  const L = S.cart.lines;
  if (it.addon) {
    const tgt = L.find(l => l.key === S.cart.sel) || L.filter(l => !l.addon).at(-1);
    if (!tgt) return toast("أضف الصنف أولاً ثم الإضافة عليه");
    tgt.mods.push({ id: it.id, name: it.name, price: priceOf(it), ref: it.ref || null }); S.cart.sel = tgt.key;
    toast(tgt.qty > 1 ? `أُضيف «${it.name}» إلى كل الـ ${tgt.qty} من ${tgt.name} (+${m2(priceOf(it) * tgt.qty)} ر.س). لحبة واحدة فقط: أضف الصنف سطراً مستقلاً ثم الإضافة عليه` : `أُضيف «${it.name}» إلى ${tgt.name}`);
  } else {
    const ex = L.find(l => l.id === id && !l.mods.length && !hasNotes(l));
    if (ex) { ex.qty++; S.cart.sel = ex.key; }
    else { const key = rid(5); L.push({ key, id, name: it.name, price: priceOf(it), qty: 1, mods: [], notes: [], note: "", ref: it.ref || null }); S.cart.sel = key; }
  }
  drawCart(); drawMenu();
  const s = $(`[data-l="${S.cart.sel}"]`); s?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
const lineTotal = l => r2(l.qty * (l.price + l.mods.reduce((s, m) => s + m.price, 0)));
const subtotal = () => r2(S.cart.lines.reduce((s, l) => s + lineTotal(l), 0));
const discAmt = () => { const d = S.cart.discount, st = subtotal(); if (!d) return 0; return Math.min(st, r2(d.kind === "pct" ? st * d.value / 100 : d.value)); };
const total = () => r2(subtotal() - discAmt());
function drawCart() {
  ls.set("cart", S.cart.lines.length ? { type: S.cart.type, lines: S.cart.lines, discount: S.cart.discount, phone: S.cart.phone || null, name: S.cart.name || null, ...(S.cart.edit ? { edit: S.cart.edit, driver: S.cart.driver || "" } : {}), at: Date.now() } : null);
  if (cartBack && $("#cart")) { cartBack = false; setTimeout(() => toast("استُعيد الطلب الذي لم يكتمل قبل إعادة تحميل الصفحة"), 300); }
  const K = $("#cart"); if (!K) return; const L = S.cart.lines, n = L.reduce((s, l) => s + l.qty, 0), lk = isAgg(S.cart.type), pk = parked().length, dis = !L.length ? "disabled" : "";
  K.innerHTML = `<div class="c-h"><button class="c-back" id="cback" aria-label="رجوع للأصناف">${ic("close")}</button><div class="c-t">${S.cart.edit ? `<b style="color:#C2410C">تعديل الطلب</b><span class="num">#${S.cart.edit.no ?? ""}</span>` : `<b>طلب جديد</b><span class="num">#${peekNo()}</span>`}</div>
      <button class="c-ib ${pk ? "has" : ""}" id="pkl" title="الطلبات المعلّقة" ${pk ? "" : "disabled"}>${ic("pause")}${pk ? `<b class="num">${pk}</b>` : ""}</button>
      <button class="c-ib danger" id="clr" title="تفريغ الطلب" ${dis}>${ic("trash")}</button></div>
    <div class="c-type ${L.length && !S.cart.type ? "need" : ""}">${TYPES.map(([k, l]) => `<button data-t="${k}" class="${S.cart.type === k ? "on" : ""} ${k}">${ic(TYPE_IC[k])}${l}</button>`).join("")}</div>
    <div class="lines" id="lines">${L.length ? L.map(l => { const on = S.cart.sel === l.key, nt = [...(l.notes || []), ...(l.note ? [l.note] : [])];
      return `<div class="ln ${on ? "sel" : ""}" data-l="${l.key}">
        <div class="ln-m"><span class="ln-q num">${l.qty}</span><div class="ln-n"><b>${esc(l.name)}</b>${l.qty > 1 || l.mods.length ? `<small><span class="num">${m2(l.price)}</span> للحبة</small>` : ""}</div><b class="ln-p num">${m2(lineTotal(l))}</b></div>
        ${l.mods.length ? `<div class="ln-x">${l.mods.map((m, i) => `<span>+ ${esc(m.name)} <span class="num">${m2(m.price)}</span>${on ? `<button data-rm="${l.key}:${i}" aria-label="حذف الإضافة">${ic("close")}</button>` : ""}</span>`).join("")}</div>` : ""}
        ${nt.length ? `<div class="ln-nt">${ic("note")}<span>${nt.map(esc).join(" · ")}</span></div>` : ""}
        ${on ? `<div class="ln-a"><div class="stp"><button data-dec="${l.key}" aria-label="إنقاص">${ic("remove")}</button><span class="num">${l.qty}</span><button data-inc="${l.key}" aria-label="زيادة">${ic("add")}</button></div>
          <button class="nt ${nt.length ? "on" : ""}" data-nt="${l.key}">${ic("note")}ملاحظة</button><button class="del" data-del="${l.key}" aria-label="حذف الصنف">${ic("trash")}</button></div>` : ""}</div>`; }).join("")
      : `<div class="empty c-empty">${ic("cart")}<b>السلة فارغة</b><span>اضغط على الأصناف لإضافتها${lk ? `<br><b class="lkt">بأسعار ${tName(S.cart.type)}</b>` : ""}</span></div>`}</div>
    <div class="c-f">
      <div class="tot"><div class="r"><span>المجموع <small>(<span class="num">${n}</span> صنف)</small></span><span class="num">${m2(subtotal())}</span></div>
        ${S.cart.discount ? `<div class="r disc"><span>خصم ${S.cart.discount.kind === "pct" ? `<span class="num">${S.cart.discount.value}%</span>` : ""} <small>${esc(S.cart.discount.reason || "")}</small></span><span class="num">−${m2(discAmt())}</span></div>` : ""}
        <div class="r big"><span>الإجمالي</span><span><span class="num">${m2(total())}</span> <small>ر.س</small></span></div></div>
      <div class="acts"><button id="disc" class="${S.cart.discount ? "on" : ""}" ${dis}>${ic("tag")}${S.cart.discount ? "الخصم ✓" : "خصم"}</button><button id="park" ${S.cart.edit ? "disabled" : dis}>${ic("pause")}تعليق</button><button id="last">${ic("print")}آخر إيصال</button></div>
      ${S.cart.edit ? `<div class="edit-note">${ic("note")}<span>تعديل طلب لم يُدفع: أضف الأصناف ثم «حفظ الإضافة» ليصل الجديد للمطبخ، أو اضغط طريقة الدفع مباشرة إن كان العميل حاضراً.</span></div>
        <button class="sendk" id="sendk" ${dis}>${ic("fire")}<span>حفظ الإضافة وإرسالها للمطبخ<small>يبقى الطلب بانتظار الدفع بالمبلغ الجديد</small></span></button>`
      : lk ? "" : S.cart.type === "delivery" ? `<button class="sendk" id="sendk" ${dis}>${ic("car")}<span>إرسال مع المندوب<small>تُطبع الفاتورة، والدفع عند عودة المندوب</small></span></button>`
        : `<button class="sendk" id="sendk" ${dis}>${ic("fire")}<span>إرسال للمطبخ<small>طلب اتصال — الدفع عند الاستلام</small></span></button>`}
      <div class="pays ${lk ? "one" : ""}">${lk ? `<button class="pay pay-${S.cart.type}" data-pay="${S.cart.type}" ${dis}>${ic(TYPE_IC[S.cart.type])}<span>تأكيد طلب ${tName(S.cart.type)}</span><b class="num">${m2(total())}</b></button>`
        : `<button class="pay pay-cash" data-pay="cash" ${dis}>${ic("cash")}<span>كاش</span></button><button class="pay pay-mada" data-pay="mada" ${dis}>${ic("card")}<span>مدى</span></button><button class="pay pay-visa" data-pay="visa" ${dis}>${ic("card")}<span>فيزا<small>ماستركارد</small></span></button>`}</div></div>`;
  const find = k => L.find(l => l.key === k);
  $$("[data-l]").forEach(e => e.onclick = ev => { if (ev.target.closest("button")) return; S.cart.sel = S.cart.sel === e.dataset.l ? null : e.dataset.l; drawCart(); });
  $$("[data-inc]").forEach(b => b.onclick = () => { find(b.dataset.inc).qty++; drawCart(); drawMenu(); });
  $$("[data-dec]").forEach(b => b.onclick = () => { const l = find(b.dataset.dec); if (l.qty > 1) l.qty--; else removeLine(l.key); drawCart(); drawMenu(); });
  $$("[data-del]").forEach(b => b.onclick = () => { removeLine(b.dataset.del); drawCart(); drawMenu(); });
  $$("[data-nt]").forEach(b => b.onclick = () => openNotes(b.dataset.nt));
  $$("[data-rm]").forEach(b => b.onclick = () => { const [k, i] = b.dataset.rm.split(":"); find(k).mods.splice(+i, 1); drawCart(); drawMenu(); });
  $$("[data-t]").forEach(b => b.onclick = () => setType(b.dataset.t));
  $("#clr").onclick = () => { if (confirm(S.cart.edit ? "إلغاء التعديل؟ يبقى الطلب كما كان قبل الإضافة" : "تفريغ الطلب الحالي؟")) resetCart(); };
  $("#pkl").onclick = openParked; $("#park").onclick = parkCart;
  $("#cback").onclick = () => toggleCart(false);
  $("#disc").onclick = () => askManager(`خصم على طلب بقيمة ${m2(total())} ر.س`, openDiscount, { open: true });
  $("#last").onclick = () => { const P = S.today.filter(x => x.status === "paid" && !!x.test === !!S.device.test), o = P.find(x => x.device === S.dev) || P[0]; if (!o) return toast("لا توجد طلبات اليوم"); printJob(o, { receipt: true }, true); };
  $$("[data-pay]").forEach(b => b.onclick = () => openPay(b.dataset.pay));
  $("#sendk") && ($("#sendk").onclick = () => S.cart.edit ? saveEdit() : sendKitchen());
  const cb = $("#cbar"); if (cb) { cb.innerHTML = `${ic("cart")}<span>عرض الطلب <b class="num">${n}</b></span><b class="num">${m2(total())} ر.س</b>`; cb.disabled = !L.length && !S.cartOpen; cb.onclick = () => toggleCart(true); }
}
function toggleCart(v) { S.cartOpen = v; $("#pos")?.classList.toggle("cart-open", v); }
function removeLine(key) { S.cart.lines = S.cart.lines.filter(x => x.key !== key); if (S.cart.sel === key) S.cart.sel = null; if (!S.cart.lines.length) S.cart.discount = null; }
/* بعد كل طلب تُفرَّغ السلة ويُمسح نوع الطلب، فيُختار النوع من جديد لكل طلب (إجباري قبل الدفع) */
function resetCart() { S.cart = { type: null, lines: [], discount: null, sel: null }; /* also leaves edit mode */ S.cartOpen = false; $("#pos")?.classList.remove("cart-open"); drawTop(); drawCart(); drawMenu(); }
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
/* تعليق الطلب: يُحفظ في هذا الجهاز ويُستكمل لاحقاً (مثل فودكس) */
function parkCart() {
  if (!S.cart.lines.length) return;
  const p = parked(); p.push({ id: rid(6), at: Date.now(), by: S.cashier?.name || "", cart: { ...S.cart, sel: null }, total: total() }); ls.set("parked", p.slice(-20));
  resetCart(); toast("تم تعليق الطلب ✓ تجده من زر التعليق أعلى السلة");
}
function openParked() {
  const P = parked(); if (!P.length) return toast("لا توجد طلبات معلّقة");
  modal(`${mh("الطلبات المعلّقة")}<div class="mdl-b"><div class="list">${P.slice().reverse().map(p => `<div class="row pk">
      <span class="no">${ic(TYPE_IC[p.cart.type] || "take")}</span><span><b>${p.cart.lines.map(l => `${l.qty}× ${esc(l.name)}`).join("، ")}</b><br><span class="meta">علّقه ${esc(p.by)} الساعة <span class="num">${hm(p.at)}</span> · ${TYPES.find(t => t[0] === p.cart.type)?.[1] || ""}</span></span>
      <span class="pk-a"><b class="num">${m2(p.total)}</b><button class="btn sm" data-rs="${p.id}">استكمال</button><button class="btn ghost sm icon" data-pd="${p.id}" aria-label="حذف">${ic("trash")}</button></span></div>`).join("")}</div></div>`);
  $$("#ov [data-rs]").forEach(b => b.onclick = () => {
    const all = parked(), p = all.find(x => x.id === b.dataset.rs); if (!p) return; let rest = all.filter(x => x.id !== p.id);
    if (S.cart.lines.length) { rest.push({ id: rid(6), at: Date.now(), by: S.cashier?.name || "", cart: { ...S.cart, sel: null }, total: total() }); toast("الطلب الحالي عُلّق مكانه"); }
    ls.set("parked", rest);
    const c = p.cart, gone = [];
    c.lines = c.lines.filter(l => { const it = S.menu.find(m => m.id === l.id); if (!it || !avail(it, c.type)) { gone.push(l.name); return false; } return true; })
      /* بأسعار القائمة الحالية، إن تغيّر سعر صنف بعد تعليق الطلب */
      .map(l => ({ ...l, price: priceOf(S.menu.find(m => m.id === l.id), c.type), mods: l.mods.filter(md => { const mi = S.menu.find(m => m.id === md.id); return mi && avail(mi, c.type); }).map(md => ({ ...md, price: priceOf(S.menu.find(m => m.id === md.id), c.type) })) }));
    S.cart = { ...c, sel: null }; closeModal(); drawTop(); drawCart(); drawMenu();
    if (gone.length) toast(`حُذفت أصناف لم تعد متوفرة: ${gone.join("، ")}`, true);
  });
  $$("#ov [data-pd]").forEach(b => b.onclick = () => { if (!confirm("حذف الطلب المعلّق؟")) return; ls.set("parked", parked().filter(x => x.id !== b.dataset.pd)); drawCart(); parked().length ? openParked() : closeModal(); });
}

/* ----- modal ----- */
function modal(html, { wide, mid } = {}) {
  closeModal(); const o = document.createElement("div"); o.className = "ov"; o.id = "ov";
  o.innerHTML = `<div class="mdl ${wide ? "wide" : ""} ${mid ? "mid" : ""}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.append(o); o.querySelectorAll("[data-close]").forEach(b => b.onclick = closeModal); return o;
}
function closeModal() { $("#ov")?.remove(); clearTimeout(S.doneTimer); closePop(); if (S.kh) { removeEventListener("keydown", S.kh); S.kh = null; } }
const mh = (t, extra = "") => `<div class="mdl-h"><h3>${t}</h3><div style="display:flex;gap:8px;align-items:center">${extra}<button class="x" data-close aria-label="إغلاق">${ic("close")}</button></div></div>`;

/* ---------- manager approval → onOk() ----------
   Three ways: the manager's PIN typed here; a remote approval the owner gives from the accounting program on his phone;
   or a one-time code shown there (6 digits, changes every 5 minutes, computed from a secret both sides hold, so it works
   with no internet in the shop, and is accepted once on this device). Every approval is logged in «approvals». */
const MGR_STEP = 300000;
async function mgrCode(secret, step) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("aq-mgr:" + step)));
  const off = b[b.length - 1] & 15, v = (((b[off] & 0x7f) << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
  return String(v % 1e6).padStart(6, "0");
}
async function mgrCodeOk(code) {
  const sec = S.config?.mgrSecret; if (!sec || !/^\d{6}$/.test(code)) return false;
  const now = Math.floor(Date.now() / MGR_STEP), used = ls.get("mgrUsed", []);
  for (const st of [now, now - 1]) if (await mgrCode(sec, st) === code) {
    const key = st + ":" + code; if (used.includes(key)) return "used";
    ls.set("mgrUsed", [...used.filter(x => +x.split(":")[0] >= now - 2), key]); return true; }
  return false;
}
function mgrLog(title, via, extra = {}) {
  const id = `${bizDay()}-${S.dev}-${Date.now().toString(36)}-${rid(3)}`;
  const d = { id, title, via, status: "approved", at: Date.now(), decidedAt: Date.now(), day: bizDay(), cashierId: S.cashier?.id || "", cashierName: S.cashier?.name || "", device: S.dev, test: !!S.device.test, ...extra };
  fire(F.setDoc(D("approvals", id), d), "سجل الموافقة"); return id;
}
/* training: the owner may open the everyday protected actions (discount, void, cash out) for a while from the accounting
   program; they then go through without a code, each still logged as «open». Device settings and sign-out stay protected. */
const mgrOpen = () => +(S.config?.mgrOpenUntil || 0) > Date.now();
function askManager(title, onOk, opts = {}) {
  if (opts.open && mgrOpen()) { S.mgrOk = { via: "open", id: mgrLog(title, "open"), at: Date.now() }; return onOk(); }
  if (!S.config.managerPinHash) return toast("لم يُحدَّد رمز المدير بعد", true);
  let pin = "";
  const ok = (via, id) => { S.mgrOk = { via, id: id || "", at: Date.now() }; closeModal(); onOk(); };
  modal(`${mh("موافقة المدير")}<div class="mdl-b"><p style="margin:0 0 4px;text-align:center" class="muted">${esc(title)}</p>
    <p class="small muted" style="margin:0 0 6px;text-align:center">رمز المدير، أو الرمز المؤقت من جوال المدير (6 أرقام)</p>
    <div class="dots" id="mdots">${"<i></i>".repeat(8)}</div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button data-k="${k}">${k}</button>`).join("")}<button class="fn" data-k="b">⌫</button><button data-k="0">0</button><button class="fn" data-k="ok" style="color:var(--red);font-weight:800">تأكيد</button></div>
    <button class="btn ghost block" id="mrem" style="margin-top:12px">${ic("phone")}طلب موافقة المدير عن بُعد</button>
    <p class="small muted" id="mremn" style="margin:6px 0 0;text-align:center">${S.online ? "يصل الطلب إلى المدير في برنامج المحاسبة، وينتظر هنا قراره" : "بدون إنترنت: اطلب من المدير الرمز المؤقت من جواله"}</p></div>`);
  if (!S.online) $("#mrem").disabled = true;
  const dots = () => $$("#mdots i").forEach((d, i) => { d.classList.toggle("on", i < pin.length); d.style.display = i < Math.max(4, pin.length) ? "" : "none"; }); dots();
  const bad = msg => { if (msg) toast(msg, true); $("#mdots").classList.add("shake"); setTimeout(() => { $("#mdots")?.classList.remove("shake"); pin = ""; dots(); }, 380); };
  $$("#ov [data-k]").forEach(b => b.onclick = async () => { const k = b.dataset.k;
    if (k === "b") pin = pin.slice(0, -1);
    else if (k === "ok") {
      if (await sha(S.config.salt + ":" + pin) === S.config.managerPinHash) { ok("pin", mgrLog(title, "pin")); return; }
      const c = await mgrCodeOk(pin);
      if (c === true) { ok("code", mgrLog(title, "code")); return; }
      return bad(c === "used" ? "هذا الرمز استُخدم من قبل، اطلب رمزاً جديداً" : ""); }
    else if (pin.length < 8) pin += k; dots(); });
  $("#mrem").onclick = () => remoteApproval(title, ok);
}
function remoteApproval(title, ok) {
  const id = `${bizDay()}-${S.dev}-${Date.now().toString(36)}-${rid(3)}`;
  const d = { id, title, via: "remote", status: "pending", at: Date.now(), day: bizDay(), cashierId: S.cashier?.id || "", cashierName: S.cashier?.name || "", device: S.dev, test: !!S.device.test };
  fire(F.setDoc(D("approvals", id), d), "طلب الموافقة");
  modal(`${mh("بانتظار موافقة المدير")}<div class="mdl-b" style="text-align:center"><div class="spin" style="margin:10px auto 14px"></div>
    <p style="margin:0 0 6px"><b>${esc(title)}</b></p><p class="small muted" style="margin:0" id="rwait">أُرسل الطلب إلى المدير. اترك هذه النافذة مفتوحة حتى يصل قراره.</p></div>
    <div class="mdl-f"><button class="btn ghost" id="rcan">سحب طلب الموافقة</button></div>`, { mid: true });
  let un = null; const stop = () => { un?.(); un = null; };
  $("#rcan").onclick = () => { stop(); fire(F.updateDoc(D("approvals", id), { status: "cancelled", decidedAt: Date.now() }), "إلغاء الطلب"); closeModal(); };
  un = F.onSnapshot(D("approvals", id), s => { const x = s.data(); if (!x || s.metadata.hasPendingWrites) return;
    if (x.status === "approved") { stop(); toast("وافق المدير"); ok("remote", id); }
    else if (x.status === "rejected") { stop(); if ($("#rwait")) { $("#rwait").innerHTML = `<b style="color:var(--bad)">رفض المدير الطلب</b>${x.note ? `<br>${esc(x.note)}` : ""}`; $(".spin")?.remove(); $("#rcan").textContent = "إغلاق"; $("#rcan").onclick = closeModal; } } },
    e => console.error(e));
  const obs = new MutationObserver(() => { if (!document.body.contains($("#rcan") || document.createElement("i")) || !$("#rwait")) { stop(); obs.disconnect(); } }); obs.observe(document.body, { childList: true });
}

function openDiscount() {
  const d = S.cart.discount || { kind: "amt", value: 0, reason: "" };
  modal(`${mh("خصم على الطلب")}<div class="mdl-b">
    <p class="small muted" style="margin:0 0 6px">نوع الخصم: اختر أولاً</p>
    <div style="display:flex;gap:10px;margin-bottom:12px"><button data-k="amt" class="btn ${d.kind === "amt" ? "" : "ghost"}" style="flex:1;min-height:52px;font-size:16px">مبلغ ثابت (ر.س)</button><button data-k="pct" class="btn ${d.kind === "pct" ? "" : "ghost"}" style="flex:1;min-height:52px;font-size:16px">نسبة مئوية %</button></div>
    <div class="f"><label for="dv" id="dvl">${d.kind === "pct" ? "النسبة %" : "المبلغ (ر.س)"}</label><input id="dv" type="number" inputmode="decimal" min="0" step="0.5" dir="ltr" value="${d.value || ""}"></div>
    <div class="f"><label for="dr">السبب (يظهر في التقرير)</label><input id="dr" value="${esc(d.reason)}" placeholder="مثال: عميل دائم، تعويض تأخير"></div>
    <p class="small muted" style="margin:0">المجموع قبل الخصم: ${money(subtotal())} ر.س</p>
    <p style="margin:6px 0 0;font-weight:700" id="dpv"></p></div>
    <div class="mdl-f">${S.cart.discount ? `<button class="btn ghost" id="drm" style="margin-inline-end:auto;color:var(--bad)">إزالة الخصم</button>` : ""}<button class="btn ghost" data-close>إلغاء</button><button class="btn" id="dok">تطبيق</button></div>`);
  let kind = d.kind;
  const pv = () => { const v = +$("#dv").value || 0, st = subtotal(), a = Math.min(st, r2(kind === "pct" ? st * v / 100 : v)); $("#dvl").textContent = kind === "pct" ? "النسبة %" : "المبلغ (ر.س)";
    $("#dpv").innerHTML = v > 0 ? `الخصم <span class="num">${money(a)}</span> ر.س · الإجمالي بعد الخصم <span class="num">${money(r2(st - a))}</span> ر.س` : ""; };
  $$("#ov [data-k]").forEach(b => b.onclick = () => { kind = b.dataset.k; $$("#ov [data-k]").forEach(x => x.classList.toggle("ghost", x !== b)); pv(); });
  $("#dv").oninput = pv; pv();
  $("#drm") && ($("#drm").onclick = () => { S.cart.discount = null; closeModal(); drawCart(); });
  $("#dok").onclick = () => { const v = r2($("#dv").value), reason = $("#dr").value.trim();
    if (!(v > 0)) return toast("أدخل قيمة الخصم", true); if (kind === "pct" && v > 100) return toast("النسبة لا تتجاوز 100%", true);
    if (kind === "amt" && v > subtotal()) return toast("الخصم أكبر من المجموع", true);
    if (!reason) return toast("اكتب سبب الخصم", true);
    S.cart.discount = { kind, value: v, reason, by: "manager", via: S.mgrOk?.via || "pin", approval: S.mgrOk?.id || "", at: Date.now(), cashierId: S.cashier.id }; closeModal(); drawCart(); };
}

/* ----- payment ----- */
/* نوع الطلب ظاهر في شاشة الدفع: تبديل محلي/سفري (نفس السعر) قبل التأكيد */
let PT = null, PTT = null; /* الطلب الذي يُدفع: السلة الحالية أو طلب مفتوح؛ PTT نوعه المختار قبل التأكيد */
const typeBar = (tg = PT ? { type: PTT } : S.cart) => isAgg(tg.type) ? `<div class="paytype"><span class="tchip lk ${tg.type}">${ic(TYPE_IC[tg.type])}${tName(tg.type)}</span></div>`
  : `<div class="paytype"><span>نوع الطلب</span><div class="seg2">${TYPES.filter(t => !isAgg(t[0])).map(([k, l]) => `<button data-pt="${k}" class="${tg.type === k ? "on" : ""}">${ic(TYPE_IC[k])}${l}</button>`).join("")}</div></div>`;
const bindTypeBar = () => $$("#ov [data-pt]").forEach(b => b.onclick = () => { if (PT) PTT = b.dataset.pt; else S.cart.type = b.dataset.pt; $$("#ov [data-pt]").forEach(x => x.classList.toggle("on", x === b)); if (!PT) { drawTop(); drawCart(); } });
function payKeys(h) { if (S.kh) removeEventListener("keydown", S.kh); S.kh = h; addEventListener("keydown", h); }
/* نوع الطلب إجباري: إن لم يُختر (محلي/سفري/توصيل) تظهر نافذة الاختيار قبل الدفع أو الإرسال للمطبخ */
function needType(next) {
  if (S.cart.type) return next();
  modal(`${mh("اختر نوع الطلب")}<div class="mdl-b"><p class="muted" style="margin:0 0 14px;text-align:center">لا يكتمل الطلب قبل تحديد نوعه</p>
    <div class="tpick">${TYPES.filter(t => !isAgg(t[0])).map(([k, l]) => `<button data-tp="${k}">${ic(TYPE_IC[k])}<b>${l}</b></button>`).join("")}</div></div>`, { mid: true });
  $$("#ov [data-tp]").forEach(b => b.onclick = () => { S.cart.type = b.dataset.tp; closeModal(); drawCart(); next(); });
}
/* جوال العميل في الدفع (اختياري) — للمحلي والسفري والتوصيل؛ يفيد في التذكير بواتساب */
const phoneField = () => `<div class="ph-row"><div class="f ph-f"><label for="pph">${ic("phone")}جوال العميل <small>(اختياري)</small></label><input id="pph" type="tel" inputmode="tel" dir="ltr" maxlength="16" placeholder="05xxxxxxxx" autocomplete="off" value="${esc(S.cart.phone || "")}"></div>
  <div class="f ph-f nm"><label for="pnm">${ic("person")}اسم العميل <small>(اختياري)</small></label><input id="pnm" maxlength="30" placeholder="مثال: أبو محمد" autocomplete="off" value="${esc(S.cart.name || "")}"></div></div>`;
const bindPhone = () => { const i = $("#pph"), n = $("#pnm"); if (i) i.oninput = () => { S.cart.phone = i.value; i.classList.remove("bad"); }; if (n) n.oninput = () => { S.cart.name = n.value; }; };
/* يرجع true إن كان الحقل فارغاً أو صحيحاً؛ وإن كُتب رقم ناقص ينبّه دون أن يمنع الطلب نهائياً (يكفي مسحه) */
function takePhone() {
  const i = $("#pph"); if (!i) return true; S.cart.name = ($("#pnm")?.value || "").trim(); const v = i.value.trim(); if (!v) { S.cart.phone = ""; return true; }
  const d = normPhone(v); if (/^05\d{8}$/.test(d)) { S.cart.phone = d; return true; }
  i.classList.add("bad"); i.focus(); toast("رقم الجوال غير صحيح — صحّحه أو امسحه لإكمال الطلب", true); return false;
}
function openPay(method, ord) {
  if (!ord && S.cart.edit) { const e = saveEdit(true); return e ? openPay(method, e) : undefined; }
  if (!ord && !S.cart.type && S.cart.lines.length) return needType(() => openPay(method));
  PT = ord || null; PTT = ord ? ord.type : null; if (!ord && !S.cart.lines.length) return;
  const T = ord ? ord.total : total(), n = (ord ? ord.lines : S.cart.lines).reduce((s, l) => s + l.qty, 0), hasDisc = ord ? !!ord.discount : !!S.cart.discount, dA = ord ? ord.discount?.amount || 0 : discAmt();
  if (method !== "cash") {
    const lk = isAgg(method);
    modal(`${mh(lk ? `تأكيد طلب ${tName(method)}` : `الدفع بـ${METHODS[method]}`)}<div class="mdl-b paycard">
      ${typeBar()}<div class="pc-ic ${method}">${ic(lk ? TYPE_IC[method] : "card")}</div>
      <div class="due-l">المبلغ المطلوب</div><div class="big-amt"><span class="num">${m2(T)}</span> <small>ر.س</small></div>
      <p class="muted">${lk ? `تأكد أن الطلب مطابق لطلب ${tName(method)} في التطبيق.` : "أدخل المبلغ في جهاز الدفع، وبعد نجاح العملية اضغط «تمت العملية»."}</p>
      <div class="pc-sum"><span><span class="num">${n}</span> صنف</span>${hasDisc ? `<span>بعد خصم <span class="num">${m2(dA)}</span></span>` : ""}</div>${!ord && !lk ? phoneField() : ""}
      ${lk ? "" : `<button class="btn ghost block" id="psplit" style="margin-top:10px">${ic("swap")}تقسيم الدفع (جزء كاش وجزء شبكة)</button>`}</div>
      <div class="mdl-f"><button class="btn ghost" data-close>رجوع</button><button class="btn ${lk ? "pay-" + method : "ok"} wide" id="pok">${ic("check")}${lk ? "تأكيد الطلب" : "تمت العملية"}</button></div>`);
    bindTypeBar(); bindPhone(); $("#pok").onclick = () => { if (!ord && !takePhone()) return; $("#pok").disabled = true; complete(method, T, 0, ord); };
    if ($("#psplit")) $("#psplit").onclick = () => { if (!ord && !takePhone()) return; openSplit(ord, method); };
    payKeys(e => { if (e.key === "Enter" && $("#pok") && !$("#pok").disabled) { e.preventDefault(); $("#pok").click(); } });
    return;
  }
  let given = "";
  const quick = [...new Set([Math.ceil(T / 5) * 5, Math.ceil(T / 10) * 10, Math.ceil(T / 50) * 50, Math.ceil(T / 100) * 100, 200, 500].filter(x => x > T))].slice(0, 5);
  modal(`${mh("الدفع كاش")}<div class="mdl-b cashpay">
    <div class="cp-sum">${typeBar()}
      <div class="cp-r due"><span>المطلوب</span><b class="num">${m2(T)}</b></div>
      <div class="cp-r"><span>المستلم من العميل</span><b class="num" id="pg">${m2(T)}</b></div>
      <div id="chg"></div>${!ord ? phoneField() : ""}<button class="btn ghost block" id="psplit" style="margin-top:10px">${ic("swap")}تقسيم الدفع (جزء كاش وجزء شبكة)</button></div>
    <div class="cp-pad"><div class="quick"><button data-q="${T}" class="ex">المبلغ تماماً</button>${quick.map(x => `<button data-q="${x}" class="num">${x}</button>`).join("")}</div>
      <div class="kp">${["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "b"].map(k => `<button data-kp="${k}" class="${k === "b" ? "fn" : ""}" aria-label="${k === "b" ? "حذف رقم" : k}">${k === "b" ? ic("back") : k}</button>`).join("")}</div></div></div>
    <div class="mdl-f"><button class="btn ghost" data-close>رجوع</button><button class="btn ok wide" id="pok">${ic("check")}تأكيد الدفع</button></div>`, { mid: true });
  const val = () => given === "" ? T : r2(given);
  const upd = () => { const g = val(), c = r2(g - T);
    $("#pg").textContent = given === "" ? m2(T) : given; $("#pg").classList.toggle("typed", given !== "");
    $("#chg").innerHTML = `<div class="chg ${c < 0 ? "neg" : ""}"><span>${c < 0 ? "المبلغ ناقص" : "الباقي للعميل"}</span><span class="num">${m2(Math.abs(c))}</span></div>`;
    $("#pok").disabled = c < 0; $$("#ov [data-q]").forEach(b => b.classList.toggle("on", given !== "" && +b.dataset.q === r2(given))); };
  const key = k => { if (k === "b") given = given.slice(0, -1);
    else if (k === ".") { if (!given.includes(".")) given = (given || "0") + "."; }
    else if (/^\d$/.test(k)) { if (given.includes(".") && given.split(".")[1].length >= 2) return; if (given.replace(".", "").length >= 6) return; given = given === "0" ? k : given + k; }
    upd(); };
  $$("#ov [data-q]").forEach(b => b.onclick = () => { given = String(+b.dataset.q); upd(); });
  $$("#ov [data-kp]").forEach(b => b.onclick = () => key(b.dataset.kp));
  upd(); bindTypeBar(); bindPhone();
  $("#psplit").onclick = () => { if (!ord && !takePhone()) return; openSplit(ord, "cash"); };
  $("#pok").onclick = () => { const g = val(); if (g < T) return; if (!ord && !takePhone()) return; $("#pok").disabled = true; complete("cash", g, r2(g - T), ord); };
  payKeys(e => { if (!$("#ov .cashpay") || ["pph", "pnm"].includes(document.activeElement?.id)) return; if (/^\d$/.test(e.key) || e.key === ".") { e.preventDefault(); key(e.key); } else if (e.key === "Backspace") { e.preventDefault(); key("b"); } else if (e.key === "Enter" && !$("#pok").disabled) { e.preventDefault(); $("#pok").click(); } });
}

/* تقسيم الدفع: الكاشير يسجّل الجزء الأول (مثلاً 20 كاش)، فيظهر المتبقي ويختار له الطريقة الأخرى.
   كل جزء بطريقة دفع ومبلغ، والمجموع يساوي الإجمالي. الكاش وحده يقبل «المستلم» لحساب الباقي */
function openSplit(ord, first) {
  const T = ord ? ord.total : total(), parts = [], M = ["cash", "mada", "visa"];
  let m = first && M.includes(first) ? first : "cash", amt = "", given = "";
  const done = () => r2(parts.reduce((s, p) => s + p.a, 0)), left = () => r2(T - done());
  modal(`${mh("تقسيم الدفع")}<div class="mdl-b cashpay"><div class="cp-sum">${typeBar()}
      <div class="cp-r due"><span>إجمالي الطلب</span><b class="num">${m2(T)}</b></div>
      <div id="spl"></div><div class="cp-r" id="slr"></div><div id="sgv"></div></div>
    <div class="cp-pad"><div class="seg2" id="sm">${M.map(k => `<button data-sm="${k}">${ic(k === "cash" ? "cash" : "card")}${METHODS[k]}</button>`).join("")}</div>
      <div class="cp-r" style="margin:10px 0 6px;gap:10px"><span id="sal">مبلغ الجزء</span><b class="num" id="sa" style="margin-inline-start:auto">0.00</b><button class="btn sm" id="sadd" style="min-height:40px">${ic("add")}إضافة</button></div>
      <div class="quick"><button data-sq="left" class="ex">كامل المتبقي</button><button data-sq="half">النصف</button></div>
      <div class="kp">${["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "b"].map(k => `<button data-kp="${k}" class="${k === "b" ? "fn" : ""}" aria-label="${k === "b" ? "حذف رقم" : k}">${k === "b" ? ic("back") : k}</button>`).join("")}</div>
      <p class="small muted" style="margin:8px 0 0;line-height:1.6">اكتب مبلغ الجزء الأول، ثم اضغط طريقة الدفع الأخرى، ثم «تأكيد الدفع» فيُسجَّل الباقي عليها.</p></div></div>
    <div class="mdl-f"><button class="btn ghost" id="sbk">رجوع</button><button class="btn ok wide" id="sok">${ic("check")}تأكيد الدفع</button></div>`, { mid: true });
  bindTypeBar();
  const draw = () => {
    const L = left(), cashPart = parts.filter(p => p.m === "cash").reduce((s, p) => s + p.a, 0);
    $("#spl").innerHTML = parts.map((p, i) => `<div class="cp-r"><span>${ic(p.m === "cash" ? "cash" : "card")}${METHODS[p.m]} <button class="x" data-sdel="${i}" aria-label="حذف الجزء" style="width:28px;height:28px">${ic("close")}</button></span><b class="num">${m2(p.a)}</b></div>`).join("");
    $("#slr").innerHTML = `<span>${L > 0.005 ? "المتبقي" : "مكتمل ✓"}</span><b class="num" style="color:${L > 0.005 ? "var(--bad)" : "var(--ok)"}">${m2(L)}</b>`;
    $("#sgv").innerHTML = cashPart > 0 && L <= 0.005 ? `<div class="f" style="margin-top:8px"><label for="sgi">المستلم كاش من العميل (اختياري، لحساب الباقي)</label><input id="sgi" type="number" inputmode="decimal" min="0" step="0.5" dir="ltr" value="${given}"></div><div id="sch"></div>` : "";
    if ($("#sgi")) { const ch = () => { given = $("#sgi").value; const g = r2(given), c = r2(g - cashPart); $("#sch").innerHTML = given !== "" ? `<div class="chg ${c < 0 ? "neg" : ""}"><span>${c < 0 ? "المستلم أقل من جزء الكاش" : "الباقي للعميل"}</span><span class="num">${m2(Math.abs(c))}</span></div>` : ""; $("#sok").disabled = given !== "" && c < 0; }; $("#sgi").oninput = ch; ch(); }
    else $("#sok").disabled = L > 0.005 && !parts.length && amt === "";
    $$("#ov [data-sm]").forEach(b => b.classList.toggle("on", b.dataset.sm === m));
    $("#sa").textContent = amt === "" ? m2(L) : amt; $("#sal").textContent = `مبلغ الجزء (${METHODS[m]})`;
    $("#sadd").disabled = L <= 0.005;
    $$("#ov [data-sdel]").forEach(b => b.onclick = () => { parts.splice(+b.dataset.sdel, 1); draw(); });
  };
  const key = k => { if (k === "b") amt = amt.slice(0, -1); else if (k === ".") { if (!amt.includes(".")) amt = (amt || "0") + "."; }
    else if (/^\d$/.test(k)) { if (amt.includes(".") && amt.split(".")[1].length >= 2) return; if (amt.replace(".", "").length >= 6) return; amt = amt === "0" ? k : amt + k; } draw(); };
  $$("#ov [data-kp]").forEach(b => b.onclick = () => key(b.dataset.kp));
  /* the typed amount goes to the method on screen; returns false if it is not valid */
  const commit = () => { if (amt === "") return true; const L = left(), a = r2(amt);
    if (!(a > 0)) { toast("اكتب مبلغ الجزء", true); return false; }
    if (a - L > 0.005) { toast(`المبلغ أكبر من المتبقي (${m2(L)})`, true); return false; }
    const ex = parts.find(p => p.m === m); if (ex) ex.a = r2(ex.a + a); else parts.push({ m, a }); amt = ""; return true; };
  /* choosing another method with an amount typed: that amount is recorded first, the rest goes to the new method */
  $$("#ov [data-sm]").forEach(b => b.onclick = () => { if (b.dataset.sm !== m && !commit()) return; m = b.dataset.sm; draw(); });
  $$("#ov [data-sq]").forEach(b => b.onclick = () => { amt = String(b.dataset.sq === "half" ? r2(left() / 2) : left()); draw(); });
  $("#sadd").onclick = () => { if (amt === "") amt = String(left()); if (!commit()) return; if (left() > 0.005) m = m === "cash" ? "mada" : "cash"; draw(); };
  $("#sbk").onclick = () => ord ? payOpen(ord) : openPay(first || "cash");
  $("#sok").onclick = () => { if (!commit()) return draw();
    if (left() > 0.005) { if (!parts.length) return; const ex = parts.find(p => p.m === m), L = left(); if (ex) ex.a = r2(ex.a + L); else parts.push({ m, a: L }); draw(); }
    const P = parts.filter(p => p.a > 0), cashPart = r2(P.filter(p => p.m === "cash").reduce((s, p) => s + p.a, 0));
    const g = given !== "" ? r2(given) : cashPart; if (cashPart && g < cashPart) return;
    $("#sok").disabled = true;
    if (P.length === 1) return complete(P[0].m, P[0].m === "cash" ? g : T, P[0].m === "cash" ? r2(g - T) : 0, ord);
    complete("split", g, r2(g - cashPart), ord, P.map(p => ({ m: p.m, a: r2(p.a) })));
  };
  draw();
}

function nextNo(day) {
  /* الترقيم موحّد لكل الأجهزة: أكبر رقم وصل من أي جهاز اليوم + 1، مع عدّاد محلي يحمي الترقيم أثناء انقطاع الإنترنت */
  const k = "seq_" + day, mine = S.today.filter(o => o.day === day).reduce((m, o) => Math.max(m, o.no || 0), 0);
  const n = Math.max(ls.get(k, 0), mine) + 1; ls.set(k, n);
  /* تنظيف عدادات الأيام القديمة */
  try { Object.keys(localStorage).filter(x => x.startsWith("aq_seq_") && x < "aq_seq_" + addDays(day, -7)).forEach(x => localStorage.removeItem(x)); } catch {}
  return n;
}
/* synchronous (same SHA-256 as sha()), so a sale can print inside the tap that made it */
function receiptCode(o) {
  const h = sha256Hex([S.config.receiptKey || S.config.salt, o.id, m2(o.total), o.ts, o.method].join("|"));
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

const cartLines = () => S.cart.lines.map(l => ({ id: l.id, ref: l.ref ?? null, name: l.name, price: l.price, qty: l.qty, cost: itemCost(l.id), mods: l.mods.map(m => ({ id: m.id, ref: m.ref ?? null, name: m.name, price: m.price, cost: itemCost(m.id) })), notes: l.notes || [], note: l.note || "", total: lineTotal(l) }));
function buildOrder(extra) {
  const ts = Date.now(), day = bizDay(ts), no = nextNo(day), st = subtotal(), da = discAmt();
  const o = {
    id: `${day}-${S.dev}-${pad(no, 4)}-${rid(3)}`, no, day, ts, type: S.cart.type, method: null,
    lines: cartLines(),
    subtotal: st, discount: S.cart.discount ? { ...S.cart.discount, amount: da } : null, total: r2(st - da), given: null, change: 0,
    cashierId: S.cashier.id, cashierName: S.cashier.name, device: S.dev, shiftId: S.shift?.id || null, status: "paid", prep: "open", test: !!S.device.test, v: 1, app: VERSION,
    ...(S.cart.phone && /^05\d{8}$/.test(S.cart.phone) ? { phone: S.cart.phone } : {}), ...(S.cart.name?.trim() ? { name: S.cart.name.trim().slice(0, 30) } : {}), ...extra,
  };
  o.pack = packOf(o.lines); o.cogs = orderCogs(o); return o;
}
function keepLocal(o) {
  const t = S.today.find(x => x.id === o.id); if (t) Object.assign(t, o); else if (o.day === bizDay()) S.today = [{ ...o, _pending: true }, ...S.today];
  const h = S.shiftOrders.find(x => x.id === o.id); if (h) Object.assign(h, o); else if (S.shift && o.shiftId === S.shift.id) S.shiftOrders = [o, ...S.shiftOrders];
}
async function complete(method, given, change, ord, pays) {
  /* ord: طلب مفتوح (أُرسل للمطبخ أو مع المندوب بدون دفع) يُدفع الآن. pays: أجزاء الدفع المقسّم */
  const cashIn = method === "cash" || (pays || []).some(p => p.m === "cash");
  if (ord) {
    const nt = PTT || ord.type, u = { status: "paid", method, given: cashIn ? r2(given) : null, change: cashIn ? r2(change) : 0, type: nt, paidAt: Date.now(), paidBy: S.cashier.name, ...(pays ? { pays } : {}) };
    if (nt !== ord.type) u.typeChanges = [...(ord.typeChanges || []), { from: ord.type, to: nt, at: u.paidAt, by: S.cashier.name }];
    if (ord.prep === "open") Object.assign(u, { prep: "done", deliveredAt: u.paidAt, deliveredBy: S.cashier.name });
    const o = Object.assign(ord, u); o.code = receiptCode(o); u.code = o.code;
    fire(F.updateDoc(D("orders", o.id), u), "دفع الطلب"); keepLocal(o); drawTop();
    showDone(o); if (S.device.autoPrint) autoPrint(o, { receipt: true, drawer: cashIn });
    return;
  }
  const o = buildOrder({ method, given: cashIn ? r2(given) : null, change: cashIn ? r2(change) : 0, ...(pays ? { pays } : {}) });
  o.code = receiptCode(o);
  fire(F.setDoc(D("orders", o.id), { ...o, savedAt: F.serverTimestamp() }), "الطلب");
  keepLocal(o);
  resetCart();
  showDone(o);
  if (S.device.autoPrint) autoPrint(o, { receipt: true, kitchen: true, drawer: cashIn });
}
/* automatic printing after a sale. If it fails the order is still saved: the done screen stays open with the reason and a retry,
   and the top bar keeps a red «لم يُطبع» button for it until it prints */
async function autoPrint(o, what) {
  const r = await printJob(o, what, false, true);
  if (r === true) { if (S.unprinted?.id === o.id) { S.unprinted = null; drawTop(); } return; }
  S.unprinted = { id: o.id, o, what: { ...what, drawer: false }, msg: r }; drawTop();
  const st = $("#prs"), done = $("#ov .done");
  if (done && st && $("#ov #nw")) { clearTimeout(S.doneTimer); $("#ov .autobar")?.remove(); st.classList.add("bad"); st.textContent = r;
    if (!$("#rpx")) { const b = document.createElement("button"); b.className = "btn"; b.id = "rpx"; b.style.marginTop = "10px"; b.innerHTML = `${ic("print")}إعادة الطباعة`; st.after(b);
      b.onclick = async () => { b.disabled = true; st.classList.remove("bad"); st.textContent = "جارٍ الطباعة…"; await retryPrint(); b.disabled = false; }; } }
  else toast(`الطلب ${(o.no ?? "")} حُفظ ولم يُطبع: ${r}`, true);
}
async function retryPrint() {
  const u = S.unprinted; if (!u) return true;
  const r = await printJob(u.o, u.what, false, true), st = $("#prs");
  if (r === true) { S.unprinted = null; drawTop(); if (st) { st.classList.remove("bad"); st.textContent = "✓ طُبع"; } $("#rpx")?.remove(); toast(`طُبع الطلب ${(u.o.no ?? "")}`); return true; }
  u.msg = r; if (st) { st.classList.add("bad"); st.textContent = r; } else toast(r, true); return r;
}

/* ----- طلبات الاتصال: إرسال للمطبخ بدون دفع، والدفع عند حضور العميل ----- */
const isUnpaid = o => o.status === "open";
const unpaidList = () => { const m = new Map(); [...S.shiftOrders, ...S.today].forEach(o => { if (isUnpaid(o) && !!o.test === !!S.device.test && !m.has(o.id)) m.set(o.id, o); }); return [...m.values()].sort((a, b) => a.ts - b.ts); };
const normPhone = v => { let d = String(v || "").replace(/[٠-٩]/g, c => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/\D/g, ""); if (d.startsWith("00966")) d = "0" + d.slice(5); else if (d.startsWith("966")) d = "0" + d.slice(3); else if (d.length === 9 && d[0] === "5") d = "0" + d; return d; };
/* توصيل بمندوب المطعم: تُطبع الفاتورة (غير مدفوعة) مع ورقة المطبخ، ولا يدخل الطلب في المبيعات حتى يعود المندوب
   بالمبلغ ويعتمده الكاشير من «بانتظار الدفع» بالطريقة التي دفع بها العميل (كاش، شبكة، أو مقسّم) */
function sendDelivery() {
  if (!S.cart.lines.length) return;
  const drivers = ls.get("drivers", []);
  modal(`${mh("توصيل بالمندوب — الدفع عند الاستلام")}<div class="mdl-b">
    <p class="small muted" style="margin:0 0 12px;line-height:1.7">تُطبع الفاتورة وورقة المطبخ الآن، ولا يُحسب الطلب في المبيعات حتى يعود المندوب. عند عودته افتح «بانتظار الدفع» واعتمد الطلب بطريقة الدفع التي دفع بها العميل.</p>
    <div class="f"><label for="ddr">المندوب</label><input id="ddr" list="ddl" maxlength="30" placeholder="اسم المندوب" autocomplete="off" value="${esc(S.cart.driver || drivers[0] || "")}"><datalist id="ddl">${drivers.map(d => `<option value="${esc(d)}">`).join("")}</datalist></div>
    <div class="f"><label for="dph">جوال العميل <small>(اختياري)</small></label><input id="dph" type="tel" inputmode="tel" dir="ltr" maxlength="16" placeholder="05xxxxxxxx" autocomplete="off" value="${esc(S.cart.phone || "")}"></div>
    <div class="f"><label for="dnm">اسم العميل أو العنوان <small>(اختياري)</small></label><input id="dnm" maxlength="40" placeholder="مثال: أبو محمد — حي الإسكان" autocomplete="off" value="${esc(S.cart.name || "")}"></div>
    <div class="cp-r due"><span>المبلغ عند الاستلام</span><b class="num">${m2(total())}</b></div></div>
    <div class="mdl-f"><button class="btn ghost" data-close>رجوع</button><button class="btn wide" id="dok" style="background:var(--blue)">${ic("print")}طباعة الفاتورة والإرسال</button></div>`);
  setTimeout(() => $("#ddr")?.focus(), 60);
  $("#dok").onclick = () => { const pv = $("#dph").value.trim(), ph = pv ? normPhone(pv) : "";
    if (pv && !/^05\d{8}$/.test(ph)) { toast("رقم الجوال غير صحيح — صحّحه أو امسحه", true); $("#dph").focus(); return; }
    const dr = normDriver($("#ddr").value);
    $("#dok").disabled = true;
    if (dr) ls.set("drivers", [dr, ...drivers.filter(x => x !== dr)].slice(0, 8));
    const o = buildOrder({ status: "open", type: "delivery", via: "delivery", sentAt: Date.now(), ...(ph ? { phone: ph } : {}), ...($("#dnm").value.trim() ? { name: $("#dnm").value.trim().slice(0, 40) } : {}), ...(dr ? { driver: dr } : {}) });
    fire(F.setDoc(D("orders", o.id), { ...o, savedAt: F.serverTimestamp() }), "الطلب");
    keepLocal(o); resetCart(); closeModal(); drawTop();
    toast(`الطلب ${o.no ?? ""} مع المندوب — بانتظار الدفع`);
    autoPrint(o, { receipt: true, kitchen: true });
  };
}
const normDriver = v => String(v || "").replace(/\s+/g, " ").trim().slice(0, 30);
function sendKitchen() {
  if (S.cart.lines.length && !S.cart.type) return needType(sendKitchen);
  if (S.cart.type === "delivery") return sendDelivery();
  PT = null; PTT = null; if (!S.cart.lines.length || isAgg(S.cart.type)) return;
  modal(`${mh("إرسال للمطبخ — الدفع عند الاستلام")}<div class="mdl-b">
    <p class="small muted" style="margin:0 0 12px;line-height:1.7">للطلبات بالاتصال: تُطبع ورقة المطبخ الآن، ولا يُحسب الطلب في المبيعات حتى يحضر العميل ويدفع. إن لم يحضر يُلغى من «بانتظار الدفع».</p>
    ${typeBar()}
    <div class="f"><label for="kph">رقم جوال العميل <b style="color:var(--bad)">*</b></label><input id="kph" type="tel" inputmode="tel" dir="ltr" maxlength="16" placeholder="05xxxxxxxx" autocomplete="off" value="${esc(S.cart.phone || "")}"></div>
    <div class="f"><label for="knm">اسم العميل (اختياري)</label><input id="knm" maxlength="30" placeholder="مثال: أبو محمد" autocomplete="off" value="${esc(S.cart.name || "")}"></div>
    <div class="cp-r due"><span>المبلغ عند الاستلام</span><b class="num">${m2(total())}</b></div></div>
    <div class="mdl-f"><button class="btn ghost" data-close>رجوع</button><button class="btn wide" id="kok" style="background:#C2410C">${ic("fire")}إرسال للمطبخ</button></div>`);
  bindTypeBar(); setTimeout(() => $("#kph")?.focus(), 60);
  const go = () => { const ph = normPhone($("#kph").value);
    if (!/^05\d{8}$/.test(ph)) { toast("اكتب رقم جوال صحيح يبدأ بـ 05 (10 أرقام)", true); $("#kph").focus(); return; }
    $("#kok").disabled = true;
    const o = buildOrder({ status: "open", phone: ph, name: $("#knm").value.trim(), via: "phone", sentAt: Date.now() });
    fire(F.setDoc(D("orders", o.id), { ...o, savedAt: F.serverTimestamp() }), "الطلب");
    keepLocal(o); resetCart(); closeModal();
    toast(`أُرسل الطلب ${(o.no ?? "")} للمطبخ — بانتظار الدفع`);
    if (S.device.autoPrint) printJob(o, { kitchen: true });
  };
  $("#kok").onclick = go; $("#kph").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $("#knm").focus(); } }; $("#knm").onkeydown = e => { if (e.key === "Enter") go(); };
}
/* ----- تذكير العميل بواتساب: رسالة ثابتة جاهزة برقم الطلب ----- */
const WA_DEFAULT = "عميلنا العزيز {الاسم}،\nطلبك رقم {رقم} من {المطعم} جاهز للاستلام 🌯\nالمبلغ المطلوب: {المبلغ} ريال\nتفضّل بالحضور لاستلامه، وبالعافية مقدماً.";
function waText(o, tpl = S.config?.waMsg || WA_DEFAULT) {
  /* الطلب المدفوع: لا نذكر «المبلغ المطلوب» */
  if (o.status === "paid") tpl = tpl.split("\n").filter(l => !l.includes("{المبلغ}")).join("\n");
  return tpl.replace(/\s*\{الاسم\}/g, o.name ? " " + o.name : "").replace(/\{رقم\}/g, (o.no ?? "")).replace(/\{المطعم\}/g, S.config?.store?.name || "")
    .replace(/\{المبلغ\}/g, m2(o.total)).replace(/\{الجوال\}/g, S.config?.store?.phone || "").trim();
}
const waNum = ph => { const d = normPhone(ph); return /^05\d{8}$/.test(d) ? "966" + d.slice(1) : null; };
function remind(o) {
  const n = o && waNum(o.phone); if (!n) return toast("لا يوجد رقم جوال صحيح لهذا الطلب", true);
  const w = window.open(`https://wa.me/${n}?text=${encodeURIComponent(waText(o))}`, "_blank");
  if (!w) location.href = `whatsapp://send?phone=${n}&text=${encodeURIComponent(waText(o))}`;
  const u = { remindedAt: Date.now(), reminders: (o.reminders || 0) + 1, remindedBy: S.cashier?.name || "" }; Object.assign(o, u); keepLocal(o);
  fire(F.updateDoc(D("orders", o.id), u), "التذكير"); toast(`فُتح واتساب برسالة الطلب ${(o.no ?? "")} — اضغط إرسال`);
  if ($("#unp-list")) openUnpaid(); if ($("#prep-list")) drawPrep();
}
const remBtn = (o, cls = "sm") => o.phone ? `<button class="btn wa ${cls}" data-wa="${esc(o.id)}">${ic("wa")}${o.reminders ? `ذكّر مرة أخرى` : "تذكير واتساب"}</button>` : "";
const remInfo = o => o.reminders ? ` · <span class="wa-t">${ic("wa")}ذُكّر ${o.reminders > 1 ? `<span class="num">${o.reminders}</span> مرات` : ""} منذ <span class="num">${Math.floor((Date.now() - o.remindedAt) / 60000)}</span> د</span>` : "";
function openUnpaid() {
  const L = unpaidList(), now = Date.now();
  modal(`${mh(`بانتظار الدفع <span class="muted small">(<span class="num">${L.length}</span>)</span>`)}<div class="mdl-b" id="unp-list">${L.length ? `<div class="list">${L.map(o => { const mn = Math.floor((now - o.ts) / 60000);
      return `<div class="row up"><span class="no num">${(o.no ?? "")}</span>
      <span><b>${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join("، ")}</b><br><span class="meta">${[o.via === "delivery" ? `مع المندوب${o.driver ? " " + esc(o.driver) : ""}` : "", o.phone ? `<span class="num">${esc(o.phone)}</span>` : "", o.name ? esc(o.name) : "", TYPES.find(t => t[0] === o.type)?.[1] || ""].filter(Boolean).join(" · ")} · منذ <span class="num">${mn}</span> د · ${o.prep === "open" ? "قيد التحضير" : "جاهز"}${remInfo(o)}</span></span>
      <span class="up-a"><b class="num">${m2(o.total)}</b>${remBtn(o)}<button class="btn ok sm" data-up="${esc(o.id)}">${ic("cash")}استلام ودفع</button><button class="btn ghost sm" data-uv="${esc(o.id)}" style="color:var(--bad)">إلغاء</button></span></div>`; }).join("")}</div>`
    : `<div class="empty" style="padding:40px">لا توجد طلبات بانتظار الدفع</div>`}</div>`, L.length > 4 ? { wide: true } : { mid: true });
  const get = id => unpaidList().find(o => o.id === id);
  $$("#ov [data-up]").forEach(b => b.onclick = () => payOpen(get(b.dataset.up)));
  $$("#ov [data-uv]").forEach(b => b.onclick = () => voidOpen(get(b.dataset.uv)));
  $$("#ov [data-wa]").forEach(b => b.onclick = () => remind(get(b.dataset.wa)));
}
function payOpen(o) {
  if (!o) return;
  modal(`${mh(`استلام الطلب <span class="num">${(o.no ?? "")}</span>`)}<div class="mdl-b">${orderDetail(o)}
    <div class="cp-r due" style="margin-top:12px"><span>المطلوب</span><b class="num">${m2(o.total)}</b></div>
    <div class="pays" style="margin-top:12px"><button class="pay pay-cash" data-m="cash">${ic("cash")}<span>كاش</span></button><button class="pay pay-mada" data-m="mada">${ic("card")}<span>مدى</span></button><button class="pay pay-visa" data-m="visa">${ic("card")}<span>فيزا<small>ماستركارد</small></span></button></div>
    <button class="btn ghost block" id="usp" style="margin-top:10px">${ic("swap")}تقسيم الدفع (جزء كاش وجزء شبكة)</button></div>
    <div class="mdl-f"><button class="btn ghost" id="uv" style="margin-inline-end:auto;color:var(--bad)">إلغاء الطلب</button>${remBtn(o, "")}<button class="btn ghost" id="ur">${ic("print")}الفاتورة</button><button class="btn ghost" id="uk">${ic("fire")}المطبخ</button><button class="btn ghost" id="ub">رجوع</button></div>`);
  $("#ov .mdl-b").insertAdjacentHTML("beforeend", `<button class="btn block" id="uadd" style="margin-top:10px;background:#C2410C">${ic("add")}إضافة أصناف على الطلب</button>`);
  $("#uadd").onclick = () => editOpen(o);
  $("#ur").onclick = () => printJob(o, { receipt: true }, true);
  $("#ub").onclick = openUnpaid; $("#uv").onclick = () => voidOpen(o); $("#ov [data-wa]") && ($("#ov [data-wa]").onclick = () => remind(o)); $("#uk").onclick = () => printJob(o, { kitchen: true }, true);
  $$("#ov [data-m]").forEach(b => b.onclick = () => openPay(b.dataset.m, o));
  $("#usp").onclick = () => { PT = o; PTT = o.type; openSplit(o); };
}
/* إضافة أصناف على طلب لم يُدفع (اتصال أو مندوب): يُحمَّل في السلة، ويُحفظ على نفس الطلب ونفس الرقم،
   وتُطبع للمطبخ الأصناف المضافة فقط بعنوان «إضافة على الطلب» */
function editOpen(o) {
  if (!o) return;
  if (S.cart.lines.length && S.cart.edit?.id !== o.id) return toast("في السلة طلب آخر: علّقه أو فرّغه أولاً، ثم أضف على هذا الطلب", true);
  S.cart = { type: o.type, discount: o.discount ? { kind: o.discount.kind, value: o.discount.value, reason: o.discount.reason || "", ...(o.discount.by ? { by: o.discount.by } : {}) } : null, sel: null,
    phone: o.phone || "", name: o.name || "", driver: o.driver || "", edit: { id: o.id, no: o.no ?? null },
    lines: o.lines.map(l => ({ key: rid(5), id: l.id, ref: l.ref ?? null, name: l.name, price: l.price, qty: l.qty, mods: (l.mods || []).map(m => ({ id: m.id, ref: m.ref ?? null, name: m.name, price: m.price })), notes: [...(l.notes || [])], note: l.note || "", was: l.qty, wasMods: (l.mods || []).length })) };
  closeModal(); toggleCart(true); drawTop(); drawCart(); drawMenu();
  toast(`أضف الأصناف على الطلب ${o.no ?? ""}`);
}
/* حفظ التعديل على الطلب المفتوح. forPay: يُدفع بعده مباشرة، فيرجع الطلب المحدَّث */
function saveEdit(forPay) {
  const e = S.cart.edit; if (!e) return null;
  const ord = unpaidList().find(x => x.id === e.id);
  if (!ord) { toast("هذا الطلب لم يعد بانتظار الدفع (دُفع أو أُلغي). فُرّغت السلة", true); resetCart(); return null; }
  if (!S.cart.lines.length) { toast("لا يمكن حفظ طلب بلا أصناف. لإلغائه استخدم «إلغاء الطلب» من بانتظار الدفع", true); return null; }
  const added = [];
  for (const l of S.cart.lines) {
    if (l.was == null) added.push(l);
    else if (l.qty > l.was || l.mods.length > (l.wasMods || 0)) added.push({ ...l, qty: l.qty > l.was ? l.qty - l.was : l.qty, mods: l.mods.length > (l.wasMods || 0) ? l.mods.slice(l.wasMods || 0) : l.mods });
  }
  const st = subtotal(), da = discAmt(), now = Date.now();
  const u = { lines: cartLines(), subtotal: st, discount: S.cart.discount ? { ...S.cart.discount, amount: da } : null, total: r2(st - da), type: S.cart.type || ord.type,
    edits: [...(ord.edits || []), { at: now, by: S.cashier.name, from: ord.total, to: r2(st - da) }] };
  if (u.total === ord.total && JSON.stringify(u.lines) === JSON.stringify(ord.lines)) { if (!forPay) { resetCart(); toast("لا تغيير على الطلب"); } else resetCart(); return forPay ? ord : null; }
  u.pack = packOf(u.lines); u.cogs = orderCogs({ ...ord, ...u });
  if (added.length && ord.prep === "done") u.prep = "open";
  Object.assign(ord, u); keepLocal(ord);
  fire(F.updateDoc(D("orders", ord.id), u), "تعديل الطلب");
  resetCart(); closeModal(); drawTop();
  if (added.length) {
    const k = { ...ord, addOn: true, lines: added.map(l => ({ name: l.name, qty: l.qty, mods: l.mods.map(m => ({ name: m.name })), notes: l.notes || [], note: l.note || "" })) };
    printJob(k, { kitchen: true }, false, true).then(r => { if (r !== true) toast(`الإضافة حُفظت ولم تُطبع للمطبخ: ${r}`, true); });
  }
  if (!forPay) { toast(`حُفظت الإضافة على الطلب ${ord.no ?? ""} — المطلوب الآن ${m2(ord.total)} ر.س`);
    if (ord.via === "delivery") printJob(ord, { receipt: true }, false, true); }
  return ord;
}
function voidOpen(o) {
  if (!o) return;
  const R = o.via === "delivery" ? ["رفض العميل الاستلام", "لم يُعثر على العميل", "خطأ في الطلب"] : ["لم يحضر العميل", "ألغى العميل بالاتصال", "خطأ في الطلب"];
  modal(`${mh(`إلغاء الطلب <span class="num">${(o.no ?? "")}</span>`)}<div class="mdl-b">
    <p style="margin:0 0 12px">طلب لم يُدفع بمبلغ <b class="num">${m2(o.total)}</b> ر.س${o.phone ? ` — جوال <span class="num">${esc(o.phone)}</span>` : ""}${o.driver ? ` — المندوب ${esc(o.driver)}` : ""}</p>
    <div class="nchips">${R.map((r, i) => `<button data-r="${r}" class="${i ? "" : "on"}">${r}</button>`).join("")}</div>
    <div class="f" style="margin-top:12px"><label for="uvr">ملاحظة (اختياري)</label><input id="uvr" maxlength="60"></div>
    <p class="small muted" style="margin:0">يظهر في التقارير ضمن الإلغاءات، وتُحسب تكلفة الأكل المحضّر هدراً.</p></div>
    <div class="mdl-f"><button class="btn ghost" id="ub">رجوع</button><button class="btn" id="uvok" style="background:var(--bad)">تأكيد الإلغاء</button></div>`);
  let r = R[0];
  $$("#ov [data-r]").forEach(b => b.onclick = () => { r = b.dataset.r; $$("#ov [data-r]").forEach(x => x.classList.toggle("on", x === b)); });
  $("#ub").onclick = openUnpaid;
  $("#uvok").onclick = () => { const n = $("#uvr").value.trim();
    const v = { at: Date.now(), reason: n ? `${r} — ${n}` : r, kind: ["لم يحضر العميل", "رفض العميل الاستلام", "لم يُعثر على العميل"].includes(r) ? "noshow" : "unpaid", unpaid: true, by: "cashier", cashierId: S.cashier.id, cashierName: S.cashier.name };
    const u = { status: "void", void: v, prep: "done" }; Object.assign(o, u); keepLocal(o);
    fire(F.updateDoc(D("orders", o.id), u), "الإلغاء"); drawTop(); toast(`أُلغي الطلب ${(o.no ?? "")}`);
    unpaidList().length ? openUnpaid() : closeModal(); };
}
function showDone(o) {
  const chg = hasM(o, "cash") && o.change > 0;
  modal(`<div class="mdl-b"><div class="done"><div class="ck">${ic("check")}</div><div class="muted">تم تسجيل الطلب</div><div class="no num">${(o.no ?? "")}</div>
    <div class="dmeta"><span>${ic(TYPE_IC[o.type])}${TYPES.find(t => t[0] === o.type)[1]}</span><span>${ic(o.method === "cash" ? "cash" : isAgg(o.method) ? TYPE_IC[o.method] : "card")}${mLabel(o)}</span><span><b class="num">${m2(o.total)}</b> ر.س</span></div>
    ${chg ? `<div class="chg big"><span>الباقي للعميل</span><span class="num">${m2(o.change)}</span></div><p class="small muted" style="margin:6px 0 0">المستلم <span class="num">${m2(o.given)}</span> ر.س</p>` : ""}
    <p id="prs" class="small muted" style="margin:10px 0 0;min-height:18px"></p></div></div>
    <div class="mdl-f split"><button class="btn ghost" id="rp">${ic("print")}الإيصال</button><button class="btn ghost" id="rk">${ic("fire")}المطبخ</button><button class="btn wide" data-close id="nw">طلب جديد</button></div>
    ${chg ? "" : `<div class="autobar"><i></i></div>`}`);
  $("#rp").onclick = () => printJob(o, { receipt: true }, true);
  $("#rk").onclick = () => printJob(o, { kitchen: true }, true);
  payKeys(e => { if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); closeModal(); } });
  if (!chg) S.doneTimer = setTimeout(closeModal, 6000);
  /* لمسة خارج النافذة تبدأ الطلب التالي مباشرة (إلا إذا كان هناك باقٍ للعميل يجب أن يُرى) */
  if (!chg) $("#ov").addEventListener("pointerdown", e => { if (e.target.id === "ov") closeModal(); });
}

/* ----- ملاحظات الصنف (مجانية) ----- */
function openNotes(key) {
  const l = S.cart.lines.find(x => x.key === key); if (!l) return;
  const sel = new Set(l.notes || []), all = noteList();
  /* تُرتّب الملاحظات في جدول: لكل مكوّن زر «بدون» وزر «زيادة»… وما لا يطابق هذا النمط يظهر في «أخرى» */
  const rx = /^(بدون|زيادة|قليل|كثير|بزيادة)\s+(.+)$/, rows = new Map(), cols = [], other = [];
  all.forEach(n => { const m = n.match(rx); if (!m) return other.push(n); if (!cols.includes(m[1])) cols.push(m[1]); if (!rows.has(m[2])) rows.set(m[2], {}); rows.get(m[2])[m[1]] = n; });
  const btn = n => `<button data-n="${esc(n)}" class="${sel.has(n) ? "on" : ""}">${esc(n)}</button>`;
  modal(`${mh(`ملاحظات: ${esc(l.name)}${l.qty > 1 ? ` <span class="muted small">(<span class="num">${l.qty}</span> حبات)</span>` : ""}`)}<div class="mdl-b">
    ${rows.size ? `<div class="ntab" style="--n:${cols.length}">${[...rows].map(([ing, v]) => `<div class="nr"><b>${esc(ing)}</b>${cols.map(c => v[c] ? `<button data-n="${esc(v[c])}" class="${sel.has(v[c]) ? "on" : ""} ${c === "بدون" ? "no" : "more"}">${esc(c)}</button>` : "<span></span>").join("")}</div>`).join("")}</div>` : ""}
    ${other.length ? `<h4 class="nh">أخرى</h4><div class="nchips">${other.map(btn).join("")}</div>` : ""}
    <div class="f" style="margin-top:14px"><label for="nfree">ملاحظة مكتوبة (اختياري)</label><input id="nfree" maxlength="60" value="${esc(l.note || "")}" placeholder="مثال: الخبز محمّص زيادة"></div>
    <p class="small muted" style="margin:0">الملاحظات مجانية وتُطبع في ورقة المطبخ.${l.qty > 1 ? ` تشمل الـ <span class="num">${l.qty}</span> حبات؛ لحبة واحدة فقط أنقص الكمية وأضف الصنف مرة أخرى بملاحظته.` : ""} الإضافات المدفوعة مثل الجبن من قسم «الإضافات».</p></div>
    <div class="mdl-f">${hasNotes(l) ? `<button class="btn ghost" id="nclr" style="margin-inline-end:auto;color:var(--bad)">مسح الملاحظات</button>` : ""}<button class="btn ghost" data-close>إلغاء</button><button class="btn wide" id="nok">حفظ</button></div>`, { mid: true });
  $$("#ov [data-n]").forEach(b => b.onclick = () => { const n = b.dataset.n; if (sel.has(n)) sel.delete(n); else { sel.add(n);
      /* «بدون ثوم» و«زيادة ثوم» لا يجتمعان */ const m = n.match(rx); if (m) all.forEach(x => { const k = x.match(rx); if (k && k[2] === m[2] && x !== n) sel.delete(x); }); }
    $$("#ov [data-n]").forEach(x => x.classList.toggle("on", sel.has(x.dataset.n))); });
  $("#nclr") && ($("#nclr").onclick = () => { l.notes = []; l.note = ""; closeModal(); drawCart(); });
  $("#nok").onclick = () => { l.notes = all.filter(n => sel.has(n)); l.note = $("#nfree").value.trim(); S.cart.sel = l.key; closeModal(); drawCart(); };
}

/* ----- طلبات قيد التحضير ----- */
const prepOpen = () => S.today.filter(o => o.prep === "open" && o.status !== "void" && !!o.test === !!S.device.test).sort((a, b) => a.ts - b.ts);
function openPrep() {
  modal(`${mh("طلبات قيد التحضير")}<div class="mdl-b" id="prep-list"></div>`, { wide: true });
  drawPrep();
}
function drawPrep() {
  const B = $("#prep-list"); if (!B) return; const L = prepOpen(), now = Date.now();
  const done = S.today.filter(o => o.prep === "done" && o.status !== "void" && !!o.test === !!S.device.test).sort((a, b) => (b.deliveredAt || 0) - (a.deliveredAt || 0)).slice(0, 5);
  B.innerHTML = (L.length ? `<div class="prepgrid">${L.map(o => { const mn = Math.floor((now - o.ts) / 60000), lv = mn >= 12 ? "bad" : mn >= 7 ? "warn" : "ok";
      return `<div class="prep ${lv}"><div class="ph"><span class="no num">${(o.no ?? "")}</span><span class="chip ${o.type === "hunger" ? "hg" : isAgg(o.type) ? "lk" : ""}">${TYPES.find(t => t[0] === o.type)[1]}</span>${isUnpaid(o) ? `<span class="chip warn">لم يُدفع</span>` : ""}<span class="sp"></span><span class="tm"><span class="num">${mn}</span> د</span></div>
        <ul>${o.lines.map(l => `<li><b>${l.qty} × ${esc(l.name)}</b>${l.mods.map(m => `<div class="pm">+ ${esc(m.name)}</div>`).join("")}${[...(l.notes || []), ...(l.note ? [l.note] : [])].map(t => `<div class="pn">● ${esc(t)}</div>`).join("")}</li>`).join("")}</ul>
        <div class="pf"><button class="btn ghost sm icon" data-pk="${esc(o.id)}" aria-label="طباعة ورقة المطبخ">${ic("print")}</button>${isUnpaid(o) ? `${o.phone ? `<button class="btn wa sm icon" data-wa="${esc(o.id)}" aria-label="تذكير واتساب">${ic("wa")}</button>` : ""}<button class="btn ok" data-pay-o="${esc(o.id)}" style="flex:1">${ic("cash")}استلام ودفع</button>` : `${o.phone ? `<button class="btn wa sm icon" data-wa="${esc(o.id)}" aria-label="تذكير واتساب">${ic("wa")}</button>` : ""}<button class="btn ok" data-dv="${esc(o.id)}" style="flex:1">${ic("check")}تم التسليم</button>`}</div></div>`; }).join("")}</div>`
    : `<div class="empty" style="padding:40px">لا توجد طلبات قيد التحضير</div>`) +
    (done.length ? `<h4 style="margin:18px 0 8px" class="muted">آخر الطلبات المسلّمة</h4><div class="list">${done.map(o => `<div class="row" style="cursor:default"><span class="no num">${(o.no ?? "")}</span><span class="meta">سُلّم <span class="num">${o.deliveredAt ? hm(o.deliveredAt) : ""}</span>${o.deliveredBy ? ` · ${esc(o.deliveredBy)}` : ""}</span><button class="btn ghost sm" data-un="${esc(o.id)}">إرجاع للتحضير</button></div>`).join("")}</div>` : "");
  const setPrep = (id, v) => { const o = S.today.find(x => x.id === id); if (!o) return;
    const u = v === "done" ? { prep: "done", deliveredAt: Date.now(), deliveredBy: S.cashier?.name || "" } : { prep: "open", deliveredAt: null, deliveredBy: null };
    Object.assign(o, u); fire(F.updateDoc(D("orders", id), u), "حالة الطلب"); drawPrep(); drawTop(); };
  $$("#prep-list [data-dv]").forEach(b => b.onclick = () => setPrep(b.dataset.dv, "done"));
  $$("#prep-list [data-wa]").forEach(b => b.onclick = () => remind(prepOpen().find(x => x.id === b.dataset.wa)));
  $$("#prep-list [data-pay-o]").forEach(b => b.onclick = () => payOpen(unpaidList().find(x => x.id === b.dataset.payO)));
  $$("#prep-list [data-un]").forEach(b => b.onclick = () => setPrep(b.dataset.un, "open"));
  $$("#prep-list [data-pk]").forEach(b => b.onclick = () => { const o = S.today.find(x => x.id === b.dataset.pk); if (o) printJob(o, { kitchen: true }, true); });
}
setInterval(() => { if ($("#prep-list")) drawPrep(); }, 30e3);

/* ----- orders today ----- */
/* ----- تقارير الكاشير (أثناء العمل): الملخص، الطلبات، الأصناف المباعة — بدون التكلفة والأرباح ----- */
const RP = { tab: "sum", per: "shift", type: "", method: "", cat: "", item: "", status: "all", q: "", isort: "q" };
let rpCache = { key: "", list: null };
function openOrders() { openReports("orders"); }
function openReports(tab) {
  watchToday(); if (tab) RP.tab = tab; if (RP.per === "shift" && !S.shift) RP.per = "today";
  modal(`${mh("التقارير")}<div class="rp-bar" id="rp-bar"></div><div class="mdl-b" id="orders-list"></div>`, { wide: true });
  drawOrdersList();
}
const RP_PERS = [["shift", "الوردية الحالية"], ["today", "اليوم"], ["yday", "أمس"], ["week", "هذا الأسبوع"], ["lweek", "الأسبوع الماضي"], ["month", "هذا الشهر"], ["lmonth", "الشهر الماضي"], ["custom", "تاريخ محدد…"]];
function rpRange() {
  const t = bizDay();
  switch (RP.per) {
    case "today": return [t, t];
    case "yday": { const y = addDays(t, -1); return [y, y]; }
    case "week": return [dshRange("week", t)[0], t];
    case "lweek": return dshRange("week", addDays(dshRange("week", t)[0], -1));
    case "month": return [dshRange("month", t)[0], t];
    case "lmonth": return dshRange("month", addDays(dshRange("month", t)[0], -1));
    case "custom": { let a = RP.a || t, b = RP.b || a; if (b < a) [a, b] = [b, a]; if (b > t) b = t; return [a, b]; }
  }
  return [t, t];
}
async function rpData() {
  const tm = !!S.device.test, mine = o => !!o.test === tm;
  if (RP.per === "shift") return S.shiftOrders.filter(mine);
  const [a, b] = rpRange(), t = bizDay();
  if (a === t && b === t) { const m = new Map(); [...S.today, ...S.shiftOrders].forEach(o => { if (o.day === t && mine(o)) m.set(o.id, o); }); return [...m.values()]; }
  const key = a + "|" + b;
  if (rpCache.key !== key || Date.now() - rpCache.at > 60e3) {
    const s = await F.getDocs(F.query(C("orders"), F.where("day", ">=", a), F.where("day", "<=", b)));
    rpCache = { key, at: Date.now(), list: s.docs.map(x => x.data()) };
    if (b === t) { const m = new Map(rpCache.list.map(o => [o.id, o])); [...S.today, ...S.shiftOrders].forEach(o => { if (o.day >= a && o.day <= b) m.set(o.id, o); }); rpCache.list = [...m.values()]; }
  }
  return rpCache.list.filter(mine);
}
const rpSel = (id, label, opts, v) => `<label class="rp-f"><span>${label}</span><select id="${id}"><option value="">الكل</option>${opts.map(([k, l]) => `<option value="${esc(k)}" ${v === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
async function drawOrdersList() {
  const B = $("#orders-list"), BAR = $("#rp-bar"); if (!B || !BAR) return;
  const pers = RP_PERS.filter(p => p[0] !== "shift" || S.shift), [ra, rb] = rpRange();
  const items = S.menu.filter(m => m.active || m.cat).map(m => [m.name, m.name]);
  BAR.innerHTML = `<div class="rp-tabs">${[["sum", "الملخص"], ["orders", "الطلبات"], ["items", "الأصناف المباعة"]].map(([k, l]) => `<button data-rt="${k}" class="${RP.tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="rp-ctl"><label class="rp-f"><span>الفترة</span><select id="rpp" class="per">${pers.map(([k, l]) => `<option value="${k}" ${RP.per === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      ${RP.per === "custom" ? `<label class="rp-f"><span>من</span><input type="date" id="rpa" value="${ra}" max="${bizDay()}"></label><label class="rp-f"><span>إلى</span><input type="date" id="rpb" value="${rb}" max="${bizDay()}"></label>` : ""}
      ${rpSel("rty", "النوع", TYPES, RP.type)}${rpSel("rme", "الدفع", Object.entries(METHODS), RP.method)}
      ${RP.tab === "items" ? rpSel("rca", "القسم", CATS, RP.cat) : RP.tab === "orders" ? rpSel("rit", "الصنف", items, RP.item) : ""}
      ${RP.type || RP.method || RP.cat || RP.item ? `<button class="rp-clr" id="rclr">${ic("close")}مسح التصفية</button>` : ""}</div>`;
  $$("[data-rt]").forEach(b => b.onclick = () => { RP.tab = b.dataset.rt; drawOrdersList(); });
  $$("[data-rper]").forEach(b => b.onclick = () => { RP.per = b.dataset.rper; RP.lim = 100; drawOrdersList(); });
  $("#rpp").onchange = e => { RP.per = e.target.value; RP.lim = 100; if (RP.per === "custom" && !RP.a) { RP.a = addDays(bizDay(), -6); RP.b = bizDay(); } drawOrdersList(); };
  $("#rpa") && ($("#rpa").onchange = e => { if (e.target.value) { RP.a = e.target.value; drawOrdersList(); } });
  $("#rpb") && ($("#rpb").onchange = e => { if (e.target.value) { RP.b = e.target.value; drawOrdersList(); } });
  [["rty", "type"], ["rme", "method"], ["rca", "cat"], ["rit", "item"]].forEach(([id, k]) => { const e = $("#" + id); if (e) e.onchange = () => { RP[k] = e.value; drawOrdersList(); }; });
  $("#rclr") && ($("#rclr").onclick = () => { RP.type = RP.method = RP.cat = RP.item = ""; drawOrdersList(); });
  let all; const tok = RP.tok = (RP.tok || 0) + 1;
  try { if (RP.per !== "shift" && !(ra === bizDay() && rb === ra) && rpCache.key !== ra + "|" + rb) B.innerHTML = `<div class="empty" style="padding:50px">جارٍ تحميل الطلبات…</div>`; all = await rpData(); }
  catch (e) { B.innerHTML = `<div class="err">تعذّر تحميل الطلبات: ${esc(e.code || e.message)}</div>`; return; }
  if (tok !== RP.tok) return;
  if (!$("#orders-list")) return;
  const F1 = all.filter(o => (!RP.type || o.type === RP.type) && (!RP.method || hasM(o, RP.method)));
  const paid = F1.filter(o => o.status === "paid"), voids = F1.filter(o => o.status === "void"), unp = F1.filter(isUnpaid);
  /* a split order counts under each method by the part paid that way; filtered by a method, a paid order counts by that part only */
  const sum = a => r2(a.reduce((s, o) => s + (RP.method && o.status === "paid" ? paidBy(o, RP.method) : o.total), 0)), net = sum(paid);
  const head = `${S.device.test ? `<div class="note warn" style="margin-bottom:12px">الجهاز في الوضع التجريبي: الأرقام للطلبات <b>التجريبية</b> فقط.</div>` : ""}<p class="rp-per">${RP.per === "shift" && S.shift ? `الوردية منذ <span class="num">${hm(S.shift.openedAt)}</span> · فتحها ${esc(S.shift.openedBy?.name || "")}` : ra === rb ? `يوم <span class="num">${dmy(ra)}</span>` : `من <span class="num">${dmy(ra)}</span> إلى <span class="num">${dmy(rb)}</span> · <span class="num">${Math.round((new Date(rb) - new Date(ra)) / 864e5) + 1}</span> يوم`}</p>`;
  if (RP.tab === "sum") {
    const by = (arr, key, names) => Object.entries(names).map(([k, l]) => { const g = arr.filter(o => o[key] === k); return [l, g.length, sum(g)]; }).filter(r => r[1]);
    const tbl = (t, rows) => `<div class="rp-card"><h4>${t}</h4>${rows.length ? `<table class="t"><thead><tr><th></th><th class="n">الطلبات</th><th class="n">المبلغ</th><th class="n">النسبة</th></tr></thead><tbody>${rows.map(([l, n, v]) => `<tr><td>${l}</td><td class="n num">${n}</td><td class="n">${money(v)}</td><td class="n num">${net ? (v / net * 100).toFixed(1) + "%" : "—"}</td></tr>`).join("")}</tbody><tfoot><tr><td>المجموع</td><td class="n num">${paid.length}</td><td class="n">${money(net)}</td><td></td></tr></tfoot></table>` : `<p class="muted small">لا توجد مبيعات</p>`}</div>`;
    const qty = paid.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.qty, 0), 0), disc = paid.filter(o => o.discount);
    const multi = RP.per !== "shift" && ra !== rb, hrs = {};
    if (multi) { for (let d = ra; d <= rb; d = addDays(d, 1)) hrs[d] = 0; paid.forEach(o => { if (o.day in hrs) hrs[o.day] += o.total; }); }
    else paid.forEach(o => { const h = new Date(o.ts).getHours(); hrs[h] = (hrs[h] || 0) + o.total; });
    const hk = multi ? Object.keys(hrs) : Object.keys(hrs).map(Number).sort((a, b) => ((a - 4 + 24) % 24) - ((b - 4 + 24) % 24)), hm2 = Math.max(1, ...Object.values(hrs));
    const hl = k => multi ? `${+k.slice(8)}/${+k.slice(5, 7)}` : `${(k % 12) || 12}${k < 12 ? "ص" : "م"}`;
    B.innerHTML = head + `<div class="kpis rp-k">
      <div class="kpi"><span>صافي المبيعات</span><b>${money(net)}</b><span>ر.س</span></div><div class="kpi"><span>الطلبات المكتملة</span><b class="num">${paid.length}</b><span><span class="num">${qty}</span> صنف</span></div>
      <div class="kpi"><span>متوسط الطلب</span><b>${money(paid.length ? net / paid.length : 0)}</b></div>
      <div class="kpi"><span>الخصومات</span><b>${money(sum(disc.map(o => ({ total: o.discount.amount }))))}</b><span><span class="num">${disc.length}</span> طلب</span></div>
      <div class="kpi bad"><span>الإلغاءات</span><b>${money(sum(voids))}</b><span><span class="num">${voids.length}</span> طلب${voids.some(o => o.void?.unpaid) ? ` · منها <span class="num">${voids.filter(o => o.void?.unpaid).length}</span> لم يُدفع` : ""}</span></div>
      <div class="kpi warn"><span>بانتظار الدفع</span><b>${money(sum(unp))}</b><span><span class="num">${unp.length}</span> طلب</span></div></div>
      <div class="rp-grid">${tbl("حسب طريقة الدفع", Object.entries(METHODS).filter(([k]) => !RP.method || k === RP.method).map(([k, l]) => { const g = paid.filter(o => hasM(o, k)); return [l, g.length, r2(g.reduce((s, o) => s + paidBy(o, k), 0))]; }).filter(r => r[1]))}${tbl("حسب نوع الطلب", by(paid, "type", Object.fromEntries(TYPES)))}</div>
      ${hk.length && paid.length ? `<div class="rp-card"><h4>${multi ? "المبيعات حسب اليوم" : "المبيعات حسب الساعة"}</h4><div class="rp-hrs ${hk.length > 16 ? "dense" : ""}">${hk.map(h => `<div title="${hl(h)}: ${m2(hrs[h])}"><i style="height:${hrs[h] ? Math.max(3, hrs[h] / hm2 * 100) : 0}%"></i><b class="num">${hrs[h] ? Math.round(hrs[h]) : ""}</b><span class="num">${hl(h)}</span></div>`).join("")}</div></div>` : ""}`;
  }
  if (RP.tab === "orders") {
    const q = RP.q.trim().replace(/^0+(?=\d)/, "");
    const L = F1.filter(o => (!RP.item || o.lines.some(l => l.name === RP.item || l.mods.some(m => m.name === RP.item)))
      && (RP.status === "all" || (RP.status === "paid" ? o.status === "paid" : RP.status === "unpaid" ? isUnpaid(o) : RP.status === "void" ? o.status === "void" : RP.status === "disc" ? o.discount && o.status !== "void" : true))
      && (!q || String(o.no) === q || String(o.no).includes(q) || (o.code || "").toUpperCase().includes(q.toUpperCase()) || (q.length >= 4 && (o.phone || "").includes(q)))).sort((a, b) => b.ts - a.ts);
    const okL = L.filter(o => o.status === "paid");
    B.innerHTML = head + `<div class="rp-ob"><div class="seg2">${[["all", "الكل"], ["paid", "مكتمل"], ["unpaid", "بانتظار الدفع"], ["disc", "عليه خصم"], ["void", "ملغي"]].map(([k, l]) => `<button data-rst="${k}" class="${RP.status === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <label class="srch rp-q">${ic("search")}<input id="rq" type="search" placeholder="رقم الطلب أو الجوال أو رمز التحقق" value="${esc(RP.q)}" autocomplete="off"></label></div>
      <p class="rp-sum"><b class="num">${L.length}</b> طلب · مكتمل <b class="num">${okL.length}</b> بمبلغ <b class="num">${m2(sum(okL))}</b> ر.س</p>
      <div class="list">${L.length ? L.slice(0, RP.lim || 100).map(o => `<button class="row ${o.status === "void" ? "void" : ""}" data-o="${esc(o.id)}"><span class="no num">${(o.no ?? "")}</span>
      <span><b>${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join("، ")}</b><br><span class="meta"><span class="num">${hm(o.ts)}</span> · ${esc(o.cashierName)} · ${TYPES.find(t => t[0] === o.type)?.[1] || ""} · ${mLabel(o)}
      ${o.status === "void" ? ` <span class="chip bad">${o.void?.unpaid ? "ملغي — لم يُدفع" : "ملغي"}</span>` : ""}${isUnpaid(o) ? ` <span class="chip warn">بانتظار الدفع · <span class="num">${esc(o.phone || "")}</span></span>` : ""}${o.discount ? ` <span class="chip warn">خصم</span>` : ""}${o.test ? ` <span class="chip test">تجريبي</span>` : ""}${o._pending ? ` <span class="chip warn">لم يُرسل بعد</span>` : ""}</span></span>
      <span class="money" style="font-weight:800;font-size:18px">${m2(o.total)}</span></button>`).join("") : `<div class="empty" style="padding:40px">لا توجد طلبات مطابقة</div>`}</div>
      ${L.length > (RP.lim || 100) ? `<button class="btn ghost block" id="rmore" style="margin-top:12px">عرض المزيد (<span class="num">${L.length - (RP.lim || 100)}</span> طلب متبقٍ)</button>` : ""}`;
    $("#rmore") && ($("#rmore").onclick = () => { RP.lim = (RP.lim || 100) + 100; drawOrdersList(); });
    $$("[data-rst]").forEach(b => b.onclick = () => { RP.status = b.dataset.rst; drawOrdersList(); });
    const qi = $("#rq"); qi.oninput = () => { RP.q = qi.value; clearTimeout(RP.t); RP.t = setTimeout(() => { drawOrdersList().then(() => { const n = $("#rq"); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 250); };
    $$("#orders-list [data-o]").forEach(b => b.onclick = () => openOrder(all.find(o => o.id === b.dataset.o)));
  }
  if (RP.tab === "items") {
    const catOf = id => S.menu.find(m => m.id === id)?.cat || "", it = {};
    const add = (k, name, cat, q, v) => { const x = it[k] || (it[k] = { name, cat, q: 0, v: 0, n: new Set() }); x.q += q; x.v += v; };
    paid.forEach(o => { const f = o.subtotal ? o.total / o.subtotal : 1; o.lines.forEach(l => { add(l.id || l.name, l.name, catOf(l.id), l.qty, l.qty * l.price * f); it[l.id || l.name].n.add(o.id);
      l.mods.forEach(m => { add(m.id || m.name, m.name, catOf(m.id), l.qty, l.qty * m.price * f); it[m.id || m.name].n.add(o.id); }); }); });
    let R = Object.values(it).filter(x => !RP.cat || x.cat === RP.cat);
    R.sort((a, b) => RP.isort === "v" ? b.v - a.v : RP.isort === "name" ? a.name.localeCompare(b.name, "ar") : b.q - a.q || b.v - a.v);
    const tq = R.reduce((s, x) => s + x.q, 0), tv = R.reduce((s, x) => s + x.v, 0), arrow = k => RP.isort === k ? " ▾" : "";
    B.innerHTML = head + `<table class="t rp-it"><thead><tr><th data-is="name">الصنف${arrow("name")}</th><th>القسم</th><th class="n" data-is="q">الكمية${arrow("q")}</th><th class="n">الطلبات</th><th class="n" data-is="v">صافي المبيعات${arrow("v")}</th><th class="n">النسبة</th></tr></thead>
      <tbody>${R.length ? R.map(x => `<tr><td><b>${esc(x.name)}</b></td><td class="muted">${CATS.find(c => c[0] === x.cat)?.[1] || ""}</td><td class="n num"><b>${x.q}</b></td><td class="n num">${x.n.size}</td><td class="n">${money(x.v)}</td><td class="n num">${tv ? (x.v / tv * 100).toFixed(1) + "%" : ""}</td></tr>`).join("") : `<tr><td colspan="6" class="muted" style="text-align:center;padding:30px">لا توجد مبيعات</td></tr>`}</tbody>
      ${R.length ? `<tfoot><tr><td>المجموع</td><td></td><td class="n num">${tq}</td><td></td><td class="n">${money(tv)}</td><td></td></tr></tfoot>` : ""}</table>
      <p class="small muted" style="margin:10px 0 0">صافي المبيعات بعد توزيع خصم الطلب على أصنافه. الإضافات (مثل الجبن) تظهر كأصناف مستقلة.</p>`;
    $$("[data-is]").forEach(h => h.onclick = () => { RP.isort = h.dataset.is; drawOrdersList(); });
  }
}
function orderDetail(o) {
  return `<table class="t"><tbody>${o.lines.map(l => `<tr><td>${l.qty} × ${esc(l.name)}${l.mods.map(m => `<br><span class="small muted">+ ${esc(m.name)} ${m2(m.price)}</span>`).join("")}${(l.notes || []).length || l.note ? `<br><span class="small" style="color:var(--blue);font-weight:700">• ${esc([...(l.notes || []), ...(l.note ? [l.note] : [])].join(" · "))}</span>` : ""}</td><td class="n">${money(l.total)}</td></tr>`).join("")}</tbody>
    <tfoot>${o.discount ? `<tr><td>خصم (${esc(o.discount.reason)})</td><td class="n">−${money(o.discount.amount)}</td></tr>` : ""}<tr><td>الإجمالي · ${mLabel(o)}</td><td class="n">${money(o.total)}</td></tr>
    ${hasM(o, "cash") && o.given ? `<tr><td class="muted">المستلم / الباقي</td><td class="n muted">${m2(o.given)} / ${m2(o.change)}</td></tr>` : ""}</tfoot></table>
    <p class="small muted" style="margin:10px 0 0">${dmy(o.day)} <span class="num">${hm(o.ts)}</span> · الكاشير: ${esc(o.cashierName)} · ${TYPES.find(t => t[0] === o.type)[1]}${o.code ? ` · رمز التحقق <span class="num">${esc(o.code)}</span>` : ""}${o.phone ? ` · ${o.via === "phone" ? "طلب اتصال" : "جوال"} <span class="num">${esc(o.phone)}</span>${o.name ? ` (${esc(o.name)})` : ""}` : ""}</p>
    ${o.status === "void" ? `<div class="note warn" style="margin-top:10px">${o.void.unpaid ? `أُلغي قبل الدفع بواسطة ${esc(o.void.cashierName || "")}` : "ملغي بموافقة المدير"} <span class="num">${hm(o.void.at)}</span> — السبب: ${esc(o.void.reason)}</div>` : ""}`;
}
function openOrder(o) {
  if (!o) return; if (isUnpaid(o)) return payOpen(o);
  modal(`${mh(`طلب رقم <span class="num">${(o.no ?? "")}</span>`)}<div class="mdl-b">${orderDetail(o)}</div>
    <div class="mdl-f">${o.status !== "void" && (!o.shiftId || o.shiftId === S.shift?.id) ? `<button class="btn ghost" id="vd" style="margin-inline-end:auto;color:var(--bad)">إلغاء الطلب</button>` : o.status !== "void" ? `<span class="small muted" style="margin-inline-end:auto;align-self:center">لا يُلغى: الطلب من وردية أخرى${o.device !== S.dev ? " أو جهاز آخر" : " مقفلة"}</span>` : ""}${o.status !== "void" && !isAgg(o.type) ? `<button class="btn ghost" id="ct">${ic("swap")}تغيير النوع</button>` : ""}<button class="btn ghost" id="bk">رجوع</button><button class="btn ghost" id="rk">${ic("fire")}المطبخ</button><button class="btn" id="rp">${ic("print")}الإيصال</button></div>`, { mid: true });
  $("#bk").onclick = openOrders; $("#rp").onclick = () => printJob(o, { receipt: true }, true); $("#rk").onclick = () => printJob(o, { kitchen: true }, true);
  $("#ct") && ($("#ct").onclick = () => popMenu($("#ct"), `<div class="pm-h"><b>تغيير نوع الطلب <span class="num">${(o.no ?? "")}</span></b><small>الحالي: ${tName(o.type)}</small></div>${TYPES.filter(t => !isAgg(t[0]) && t[0] !== o.type).map(([k, l]) => `<button id="ct_${k}">${ic(TYPE_IC[k])}<span>${l}</span></button>`).join("")}`,
    Object.fromEntries(TYPES.filter(t => !isAgg(t[0]) && t[0] !== o.type).map(([to]) => ["ct_" + to, () => { const ch = { from: o.type, to, at: Date.now(), by: S.cashier?.name || "" };
      const u = { type: to, typeChanges: [...(o.typeChanges || []), ch] }; Object.assign(o, u); keepLocal(o); fire(F.updateDoc(D("orders", o.id), u), "نوع الطلب");
      toast(`صار الطلب ${(o.no ?? "")} ${tName(to)}`); if (o.prep === "open") printJob(o, { kitchen: true }, true); openOrder(o); }]))));
  $("#vd") && ($("#vd").onclick = () => askManager(`إلغاء الطلب ${(o.no ?? "")} بمبلغ ${m2(o.total)}`, () => {
    modal(`${mh("سبب الإلغاء")}<div class="mdl-b"><div class="f"><label for="vr">السبب (يظهر في التقرير)</label><input id="vr" placeholder="مثال: خطأ في الطلب، العميل ألغى"></div>
      <p class="small muted" style="margin:0">${hasM(o, "cash") ? `أعِد ${m2(paidBy(o, "cash"))} ر.س للعميل من الدرج${o.pays ? `، وأرجع ${m2(r2(o.total - paidBy(o, "cash")))} على البطاقة` : ""}.` : isAgg(o.method) ? `تأكد من إلغاء الطلب في ${tName(o.method)} أيضاً.` : "إن كان المبلغ قد خُصم من بطاقة العميل فأعِده من جهاز الدفع."}</p></div>
      <div class="mdl-f"><button class="btn ghost" data-close>تراجع</button><button class="btn" id="vok" style="background:var(--bad)">تأكيد الإلغاء</button></div>`);
    $("#vok").onclick = () => { const r = $("#vr").value.trim(); if (!r) return toast("اكتب سبب الإلغاء", true);
      const v = { at: Date.now(), reason: r, by: "manager", via: S.mgrOk?.via || "pin", approval: S.mgrOk?.id || "", cashierId: S.cashier.id, cashierName: S.cashier.name };
      Object.assign(o, { status: "void", void: v }); keepLocal(o);
      fire(F.updateDoc(D("orders", o.id), { status: "void", void: v }), "الإلغاء");
      toast(`تم إلغاء الطلب ${(o.no ?? "")}`); openOrders(); };
  }, { open: true }));
}

/* ----- more menu & device settings ----- */
function openMore() {
  modal(`${mh("القائمة")}<div class="mdl-b"><div class="list">
    <button class="row" id="m-ord"><span class="ri">${ic("dash")}</span><span><b>التقارير</b><br><span class="meta">المبيعات، الطلبات (إعادة طباعة، إلغاء)، الأصناف المباعة</span></span><span></span></button>
    <button class="row" id="m-sh"><span class="ri">${ic("clock")}</span><span><b>الوردية</b><br><span class="meta">مفتوحة منذ <span class="num">${S.shift ? hm(S.shift.openedAt) : ""}</span> · إيداع، صرف، تقفيل</span></span><span></span></button>
    <button class="row" id="m-sw"><span class="ri">${ic("swap")}</span><span><b>تبديل الكاشير</b><br><span class="meta">الكاشير الحالي: ${esc(S.cashier.name)}</span></span><span></span></button>
    <button class="row" id="m-dev"><span class="ri">${ic("gear")}</span><span><b>إعدادات الجهاز والطابعة</b><br><span class="meta">تحتاج رمز المدير</span></span><span></span></button>
    ${isAdmin() ? `<button class="row" id="m-adm"><span class="ri">${ic("dash")}</span><span><b>لوحة المدير</b><br><span class="meta">التقرير، المنيو، الكاشيرون، الإعدادات</span></span><span></span></button>` : ""}
    <button class="row" id="m-up"><span class="ri">${ic("refresh")}</span><span><b>تحديث الكاشير</b><br><span class="meta">الإصدار <span class="num">${VERSION}</span></span></span><span></span></button>
    <button class="row" id="m-lang" data-noi18n><span class="ri">${ic("globe")}</span><span><b>${isEn() ? "العربية" : "English"}</b><br><span class="meta">${isEn() ? "تغيير لغة الشاشة على هذا الجهاز" : "Change the screen language on this device"}</span></span><span></span></button>
  </div><p class="small muted" style="margin:14px 2px 0;text-align:center">الحساب: <span class="num">${esc(S.user?.email || "")}</span> · <b>${isAdmin() ? "حساب المدير" : "حساب جهاز الكاشير"}</b></p></div>`);
  $("#m-ord").onclick = openOrders; $("#m-sh").onclick = openShift; bindLang("m-lang");
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
    <div class="f" style="margin-top:6px"><label for="km">ورقة المطبخ</label><select id="km">
      <option value="same" ${d.kitchenMode === "same" ? "selected" : ""}>تُطبع من نفس الطابعة بعد إيصال العميل</option>
      <option value="ip" ${d.kitchenMode === "ip" ? "selected" : ""}>طابعة مطبخ مستقلة (عنوان IP آخر)</option>
      <option value="none" ${d.kitchenMode === "none" ? "selected" : ""}>بدون ورقة مطبخ</option></select></div>
    <div class="f" id="kipf"><label for="kip">عنوان طابعة المطبخ (IP)</label><input id="kip" dir="ltr" inputmode="decimal" placeholder="192.168.1.51" value="${esc(d.kitchenIp || "")}"><span class="hint">تعمل بطابعة إبسون عبر الشبكة فقط، بنفس خطوات الطابعة الأولى.</span></div>
    <div class="setrow"><div><b>فتح درج النقود مع الدفع كاش</b><span>إن كان درج النقود موصولاً بالطابعة (منفذ DK)</span></div><button class="sw ${d.drawer ? "on" : ""}" id="dw" aria-label="فتح درج النقود"></button></div>
    <div class="setrow"><div><b>طباعة تلقائية بعد كل طلب</b><span>إيصال العميل وورقة المطبخ، وإلا تُطبع بالأزرار</span></div><button class="sw ${d.autoPrint ? "on" : ""}" id="ap" aria-label="طباعة تلقائية"></button></div>
    <div class="setrow"><div><b>وضع تجريبي</b><span>الطلبات تُعلَّم «تجريبي» ولا تدخل في التقارير ولا المحاسبة</span></div><button class="sw ${d.test ? "on" : ""}" id="tm" aria-label="وضع تجريبي"></button></div>
    <div class="setrow"><div><b>رمز هذا الجهاز</b><span>يظهر في أرقام الطلبات الداخلية</span></div><span class="num chip">${esc(S.dev)}</span></div>
    <p id="pt" class="small muted"></p></div>
    <div class="mdl-f"><button class="btn ghost" id="tp">${ic("print")}طباعة تجربة</button><button class="btn ghost" id="tc" style="margin-inline-end:auto">فحص الطابعة</button><button class="btn ghost" data-close>إغلاق</button><button class="btn" id="sv">حفظ</button></div>`);
  const t = { ap: d.autoPrint, tm: d.test, dw: !!d.drawer };
  $("#dw").onclick = () => { t.dw = !t.dw; $("#dw").classList.toggle("on", t.dw); };
  const ipv = () => { $("#ipf").style.display = $("#pm").value === "epos" ? "" : "none"; $("#kipf").style.display = $("#km").value === "ip" ? "" : "none"; }; ipv(); $("#pm").onchange = ipv; $("#km").onchange = ipv;
  $("#ap").onclick = () => { t.ap = !t.ap; $("#ap").classList.toggle("on", t.ap); };
  $("#tm").onclick = () => { t.tm = !t.tm; $("#tm").classList.toggle("on", t.tm); };
  const apply = () => { Object.assign(S.device, { printMode: $("#pm").value, printerIp: $("#ip").value.trim(), autoPrint: t.ap, test: t.tm, drawer: t.dw, kitchenMode: $("#km").value, kitchenIp: $("#kip").value.trim() }); saveDevice(); };
  $("#tp").onclick = async () => { apply(); $("#pt").textContent = "جارٍ الطباعة…";
    const res = await printJob(sampleOrder(), { receipt: true, kitchen: true }, true, true); $("#pt").textContent = res === true ? "✓ تمت الطباعة" : res || ""; };
  $("#tc").onclick = async () => { apply(); $("#pt").textContent = "جارٍ الفحص…"; const r = await checkPrinter(true); $("#pt").textContent = r === true ? "✓ الطابعة متصلة وجاهزة" : r; };
  $("#sv").onclick = () => { const was = S.view; apply(); closeModal(); toast("تم حفظ إعدادات الجهاز"); render(was === "pin" ? "pin" : "pos"); };
}
function sampleOrder() {
  return { id: "test", no: 0, day: bizDay(), ts: Date.now(), type: "take", method: "cash", lines: [{ name: "كلاسيك دجاج", qty: 2, price: 8, mods: [], notes: ["بدون ثوم"], note: "", total: 16 }, { name: "عراقيات لحم", qty: 1, price: 27, mods: [{ name: "جبن للبوكس", price: 2 }], notes: [], note: "", total: 29 }],
    subtotal: 45, discount: null, total: 45, given: 50, change: 5, cashierName: S.cashier?.name || "تجربة", code: "TEST00", test: true, sample: true };
}

/* ---------- receipt (canvas 576px = 80mm @ 203dpi) ---------- */
let logoImg = null, logoSrc = null;
function loadLogo() {
  const src = S.config?.logo; if (!src) { logoImg = null; return Promise.resolve(); } if (src === logoSrc && logoImg) return Promise.resolve();
  return new Promise(res => { const im = new Image(); im.onload = () => { logoImg = im; logoSrc = src; res(); }; im.onerror = () => res(); im.src = src; });
}
const logoReady = () => !S.config?.logo || (!!logoImg && logoSrc === S.config.logo);
async function drawReceipt(o) { await loadLogo(); return receiptCanvas(o); }
/* synchronous once the logo is loaded: on Safari the print must leave inside the tap that made the order */
function receiptCanvas(o) {
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
  /* the order number in its own box, large, so the customer can read it from across the counter */
  { const bw = 380, bh = 142, top = y + 6; g.lineWidth = 4; g.strokeRect((W - bw) / 2, top, bw, bh);
    y = top + 4; ctr("رقم الطلب", 24, 600); ctr((o.no ?? ""), 72, 900); y = top + bh + 6; }
  ctr(TYPES.find(t => t[0] === o.type)[1], 32, 800);
  lr(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}  ${hm(o.ts)}`, `الكاشير: ${o.cashierName}`, 22, 500);
  hr();
  for (const l of o.lines) {
    font(28, 700); let name = `${l.qty} × ${l.name}`; const maxW = W - 2 * M - 120;
    while (g.measureText(name).width > maxW && name.length > 4) name = name.slice(0, -2) + "…";
    lr(name, m2(l.qty * l.price), 28, 700);
    for (const m of l.mods) lr(`    + ${m.name}${l.qty > 1 ? ` × ${l.qty}` : ""}`, m2(m.price * l.qty), 24, 500);
    const nts = [...(l.notes || []), ...(l.note ? [l.note] : [])];
    if (nts.length) { font(21, 500); g.direction = "rtl"; g.textAlign = "right";
      wrapLines(g, `• ${nts.join("، ")}`, W - 2 * M - 40).forEach((s, i) => { y += 21 * (i ? 1.12 : 1.25); g.fillText(s, W - M - 28 - (i ? 12 : 0), y); }); y += 21 * .3; }
  }
  hr();
  if (o.discount) { lr("المجموع", m2(o.subtotal), 26, 500); lr("خصم", "-" + m2(o.discount.amount), 26, 500); }
  lr("الإجمالي", m2(o.total), 38, 800);
  if (o.status === "open") { y += 4; ctr("غير مدفوع — الدفع عند الاستلام", 28, 800); }
  else if (o.pays?.length) { o.pays.forEach(p => lr(METHODS[p.m], m2(p.a), 26, 600)); if (o.given && o.change > 0) { lr("المستلم كاش", m2(o.given), 24, 500); lr("الباقي", m2(o.change), 26, 600); } }
  else { lr(METHODS[o.method], m2(o.method === "cash" && o.given ? o.given : o.total), 26, 600);
    if (o.method === "cash" && o.change > 0) lr("الباقي", m2(o.change), 26, 600); }
  if (o.via === "delivery" && (o.phone || o.name || o.driver)) { hr(); if (o.name || o.phone) lr(`العميل: ${[o.name, o.phone].filter(Boolean).join(" · ")}`, null, 24, 600); if (o.driver) lr(`المندوب: ${o.driver}`, null, 24, 600); }
  if (o.status === "void") { y += 6; ctr("*** ملغي ***", 34, 800); }
  hr(false);
  ctr(st.thanks, 30, 700); ctr(`رقم الطلبات: ${st.phone}`, 26, 600);
  if (o.code) { y += 4; ctr(`رمز التحقق: ${o.code}`, 20, 500); }
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
/* ePOS-Print: one job at a time per printer (two orders a second apart never cross on the paper).
   ASB status bits Epson returns with every job: paper end / near end, cover open, offline, cutter… */
const ASB = { END: 0x00080000, NEAR: 0x00020000, COVER: 0x00000020, OFF: 0x00000008, CUT: 0x00000800, MECH: 0x00000400, UNREC: 0x00002000, AUTOREC: 0x00004000 };
const asbText = st => { st = +st || 0; return st & ASB.END ? "الورق انتهى" : st & ASB.COVER ? "غطاء الطابعة مفتوح" : st & ASB.CUT ? "مشكلة في قاطع الورق" : st & (ASB.MECH | ASB.UNREC | ASB.AUTOREC) ? "خطأ في الطابعة (أطفئها وشغّلها)" : st & ASB.OFF ? "الطابعة غير جاهزة" : ""; };
const EPOS_CODES = { EPTR_REC_EMPTY: "الورق انتهى", EPTR_COVER_OPEN: "غطاء الطابعة مفتوح", EPTR_CUTTER: "مشكلة في قاطع الورق", EPTR_MECHANICAL: "خطأ في الطابعة (أطفئها وشغّلها)", EPTR_AUTOMATICAL: "خطأ مؤقت في الطابعة", EPTR_UNRECOVERABLE: "خطأ في الطابعة (أطفئها وشغّلها)", EX_TIMEOUT: "الطابعة لم تستجب في الوقت", DeviceNotFound: "رقم الجهاز في الطابعة ليس local_printer", ParameterError: "خطأ في أمر الطباعة", SchemaError: "خطأ في أمر الطباعة" };
const eposQ = new Map();
/* Safari 27 on iPad blocks pages from fetch()-ing devices on the local network, with no prompt and no setting (Foodics, an app, is not affected).
   A form posted into a hidden frame is a navigation, which Safari still allows: the printer gets the same XML, but its reply can't be read,
   so a frame that loads counts as printed. Safari lets that navigation through only inside the tap that started it (a print sent 3 s
   later was dropped), so on Safari 27+ every print goes this way at once, submitted synchronously from the tap (sale, retry, test). */
const SAFARI_V = (() => { const u = navigator.userAgent; return /Safari\//.test(u) && !/CriOS|FxiOS|EdgiOS|Chrome|Android/.test(u) ? +((u.match(/Version\/(\d+)/) || [])[1] || 0) : 0; })();
const eposForm = SAFARI_V >= 27;
const eposUrl = ip => `https://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;
const eposXml = body => `<?xml version="1.0" encoding="utf-8"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">${body}</epos-print></s:Body></s:Envelope>`;
async function eposFetch(ip, xml) {
  const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(eposUrl(ip), { method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", "SOAPAction": '""' }, body: xml, signal: ac.signal });
    const t = await r.text(), st = +((t.match(/status="(\d+)"/) || [])[1] || 0);
    if (!/success="true"/.test(t)) { const c = (t.match(/code="([^"]*)"/) || [])[1] || ""; const e = new Error(asbText(st) || EPOS_CODES[c] || ("رمز الخطأ " + (c || r.status))); e.st = st; throw e; }
    return { st };
  } finally { clearTimeout(tm); }
}
/* text/plain form encoding sends name + "=" + value: the XML is split inside a comment, so the "=" lands in <!--=--> */
function eposFormPost(ip, xml) {
  return new Promise((res, rej) => {
    const cut = xml.indexOf(">", xml.indexOf("<epos-print")) + 1, name = "aqp" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const fr = document.createElement("iframe"); fr.name = name; fr.setAttribute("aria-hidden", "true"); fr.tabIndex = -1;
    fr.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;visibility:hidden";
    let done = false;
    const fin = ok => { if (done) return; done = true; clearTimeout(tm); setTimeout(() => fr.remove(), 1000);
      if (ok) res({ st: 0 }); else { const e = new Error("timeout"); e.name = "AbortError"; rej(e); } };
    /* the blank frame's own load is ignored: it is same-origin and readable, the printer's answer is not */
    fr.onload = () => { try { if (fr.contentWindow.location.href === "about:blank") return; } catch {} fin(true); };
    const tm = setTimeout(() => fin(false), 12000);
    document.body.appendChild(fr);
    const f = document.createElement("form"); f.method = "POST"; f.enctype = "text/plain"; f.action = eposUrl(ip); f.target = name; f.style.display = "none";
    const i = document.createElement("input"); i.type = "hidden"; i.name = xml.slice(0, cut) + "<!--"; i.value = "-->" + xml.slice(cut); f.appendChild(i);
    document.body.appendChild(f); f.submit(); f.remove();
  });
}
function eposSend(ip, body) {
  if (eposForm) return eposFormPost(ip, eposXml(body)); /* now, inside the tap; the printer queues jobs itself */
  const prev = eposQ.get(ip) || Promise.resolve();
  const job = prev.catch(() => {}).then(() => eposFetch(ip, eposXml(body)));
  eposQ.set(ip, job); return job;
}
/* receipts as raster images, each fed and cut; the cash drawer (if one is plugged into the printer) opens with the first */
async function eposPrint(cvs, ip, opts = {}) {
  cvs = [].concat(cvs);
  const body = (opts.drawer ? `<pulse drawer="drawer_1" time="pulse_100"/>` : "") + cvs.map(cv => `<image width="${cv.width}" height="${cv.height}" color="color_1" mode="mono">${raster(cv)}</image><feed line="3"/><cut type="feed"/>`).join("");
  const r = await eposSend(ip, body); notePrinter(r.st, ""); return true;
}
/* a printing error in words the cashier can act on */
/* on Safari 27 a silent timeout almost always means Safari stopped trusting the printer's certificate (an accepted warning is forgotten) */
const printErr = (e, ip, what = "الطابعة") => e.name === "AbortError" ? (eposForm ? `${what} لا ترد. افتح https://${ip} في تبويب جديد، واقبل الشهادة إن ظهر تحذير، ثم ارجع واضغط «لم يُطبع»` : `${what} لا ترد (تأكد أنها تعمل وعلى نفس الشبكة)`)
  : /Load failed|Failed to fetch|NetworkError|network/i.test(e.message || "") ? `لا يمكن الوصول إلى ${what}. افتح https://${ip} في Safari واقبل الشهادة، وتأكد أن الآيباد على نفس الواي فاي`
  : e.message;
/* printer state for the top bar: paper near its end, or the last error; checked quietly with an empty job */
function notePrinter(st, err) {
  const was = JSON.stringify(S.printer || {}); S.printer = { near: !!(st & ASB.NEAR) && !(st & ASB.END), err: err || "", at: Date.now() };
  if (JSON.stringify(S.printer) !== was) drawTop();
}
async function checkPrinter(manual) {
  if (S.device.printMode !== "epos" || !S.device.printerIp) return manual ? "طريقة الطباعة ليست طابعة إبسون عبر الشبكة" : null;
  if (eposForm && !manual) return null; /* a background check can't reach the printer on Safari 27 */
  try { const r = await eposSend(S.device.printerIp, ""); const m = asbText(r.st); notePrinter(r.st, m); return m || (r.st & ASB.NEAR ? "الطابعة جاهزة، والورق قارب على الانتهاء" : true); }
  catch (e) { const m = printErr(e, S.device.printerIp); notePrinter(e.st || 0, m); return m; }
}
setInterval(() => { if (S.view === "pos" && !$("#ov") && !document.hidden) checkPrinter(); }, 120e3);
function browserPrint(cvs) {
  cvs = [].concat(cvs);
  return new Promise(res => { $("#print").innerHTML = cvs.map(() => `<img alt="" style="display:block;page-break-after:always">`).join("");
    const ims = $$("#print img"); let n = 0; ims.forEach((im, i) => { im.onload = () => { if (++n === ims.length) setTimeout(() => { window.print(); res(true); }, 50); }; im.src = cvs[i].toDataURL("image/png"); }); });
}
function showReceipt(cvs, msg) {
  cvs = [].concat(cvs);
  modal(`${mh(cvs.length > 1 ? "الإيصال وورقة المطبخ" : cvs[0]?.dataset?.kind === "kitchen" ? "ورقة المطبخ" : "الإيصال")}<div class="mdl-b">${msg ? `<div class="note warn" style="margin-bottom:10px">${esc(msg)}</div>` : ""}<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;align-items:flex-start">${cvs.map(cv => `<img class="rcpt" src="${cv.toDataURL("image/png")}" alt="" style="width:280px;margin:0">`).join("")}</div></div>
    <div class="mdl-f"><button class="btn" data-close>إغلاق</button></div>`);
}
/* the kitchen ticket and/or receipt of an order on screen exactly as they print, with a print button; used by the manager's
   order sheet (from a phone there is often no printer). Modals sit above the console's side sheet (.ov z-index). */
async function previewJob(o, what) {
  const cvs = [];
  try { if (what.receipt) cvs.push(logoReady() ? receiptCanvas(o) : await drawReceipt(o)); if (what.kitchen) cvs.push(drawKitchen(o)); }
  catch (e) { console.error(e); return toast("تعذّر تجهيز المعاينة", true); }
  modal(`${mh(what.kitchen && !what.receipt ? "ورقة المطبخ" : "الإيصال")}<div class="mdl-b" style="background:#F4F4F5"><div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;align-items:flex-start">${cvs.map(cv => `<img class="rcpt" src="${cv.toDataURL("image/png")}" alt="" style="width:min(300px,100%);margin:0;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.12)">`).join("")}</div></div>
    <div class="mdl-f"><button class="btn" id="pvp">${ic("print")} طباعة</button><button class="btn ghost" data-close>إغلاق</button></div>`);
  $("#pvp").onclick = () => { closeModal(); printJob(o, what, true); };
}
/* returns true | error message */
async function printOrder(o, manual, quiet) { return printJob(o, { receipt: true }, manual, quiet); }
/* إيصال العميل و/أو ورقة المطبخ حسب إعدادات الجهاز. يعيد true أو رسالة الخطأ */
async function printJob(o, what, manual, quiet) {
  const d = S.device, wantK = what.kitchen && d.kitchenMode !== "none", opts = { drawer: !!what.drawer && !!d.drawer };
  let rc = null, kc = null;
  try { if (what.receipt) rc = logoReady() ? receiptCanvas(o) : await drawReceipt(o); if (wantK) kc = drawKitchen(o); }
  catch (e) { console.error(e); toast("تعذّر تجهيز الطباعة", true); return "تعذّر تجهيز الطباعة"; }
  if (!rc && !kc) { if (what.kitchen && !what.receipt && manual) toast("ورقة المطبخ مطفأة في إعدادات الجهاز"); return true; }
  if (d.printMode !== "epos" || d.kitchenMode !== "ip" || !kc) return printCanvas([rc, kc].filter(Boolean), manual, quiet, opts);
  /* طابعة مطبخ مستقلة */
  const r1 = rc ? await printCanvas(rc, manual, quiet, opts) : true;
  if (!d.kitchenIp) { const m = "لم يُحدَّد عنوان طابعة المطبخ"; if (!quiet) toast(m, true); return m; }
  try { await eposPrint(kc, d.kitchenIp); return r1; }
  catch (e) { const m = "تعذّرت طباعة ورقة المطبخ: " + printErr(e, d.kitchenIp, "طابعة المطبخ"); if (!quiet) toast(m, true); return m; }
}
/* ورقة المطبخ: رقم الطلب كبير، النوع، الأصناف والإضافات والملاحظات، بدون أسعار */
/* splits text into lines that fit maxW with the canvas's current font: by words, and a word longer than a line by letters */
function wrapLines(g, text, maxW) {
  const out = []; let cur = "";
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const t = cur ? cur + " " + w : w;
    if (g.measureText(t).width <= maxW) { cur = t; continue; }
    if (cur) out.push(cur);
    cur = w;
    while (g.measureText(cur).width > maxW && cur.length > 1) { let k = cur.length - 1; while (k > 1 && g.measureText(cur.slice(0, k)).width > maxW) k--; out.push(cur.slice(0, k)); cur = cur.slice(k); }
  }
  if (cur || !out.length) out.push(cur);
  return out;
}
function drawKitchen(o) {
  const W = 576, M = 16, FONT = `-apple-system,"SF Arabic","Geeza Pro",Tahoma,sans-serif`;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = 3000; const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, cv.height); g.fillStyle = "#000"; let y = 10;
  const font = (px, w = 700) => g.font = `${w} ${px}px ${FONT}`;
  const ctr = (t, px, w) => { font(px, w); g.direction = "rtl"; g.textAlign = "center"; y += px * 1.2; g.fillText(t, W / 2, y); y += px * .25; };
  /* a line that does not fit the paper's width goes on to the next line (word by word), so a long note is never cut */
  const rt = (t, px, w, indent = 0, cont = 0) => { font(px, w); g.direction = "rtl"; g.textAlign = "right";
    for (const [i, s] of wrapLines(g, String(t), W - 2 * M - indent - cont).entries()) { y += px * (i ? 1.12 : 1.25); g.fillText(s, W - M - indent - (i ? cont : 0), y); }
    y += px * .25; };
  const hr = () => { y += 8; g.fillRect(M, y, W - 2 * M, 3); y += 12; };
  const typ = TYPES.find(t => t[0] === o.type)?.[1] || "";
  g.fillRect(0, y, W, 120); g.fillStyle = "#fff"; y -= 4; ctr(`طلب ${(o.no ?? "")}`, 64, 900); g.fillStyle = "#000"; y = 140;
  ctr(`${typ}${o.test ? " · تجريبي" : ""}`, 44, 900);
  const d = new Date(o.ts); ctr(`${hm(o.ts)} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${o.cashierName}`, 24, 500);
  if (o.addOn) { y += 8; g.fillRect(M, y, W - 2 * M, 56); g.fillStyle = "#fff"; y -= 6; ctr("إضافة على الطلب", 40, 900); g.fillStyle = "#000"; y += 10; }
  if (o.via === "phone") { ctr(`طلب اتصال · ${o.name ? o.name + " · " : ""}${o.phone}`, 28, 800); if (o.status === "open") ctr("الدفع عند الاستلام", 26, 700); }
  if (o.via === "delivery") { ctr(`توصيل بالمندوب${o.driver ? " · " + o.driver : ""}`, 28, 800); if (o.name || o.phone) ctr([o.name, o.phone].filter(Boolean).join(" · "), 24, 700); }
  hr();
  let n = 0;
  for (const l of o.lines) {
    n += l.qty; rt(`${l.qty} × ${l.name}`, 40, 900);
    for (const m of l.mods) rt(`+ ${m.name}`, 30, 700, 30);
    for (const t of l.notes || []) rt(`● ${t}`, 32, 800, 30, 34);
    if (l.note) rt(`● ${l.note}`, 32, 800, 30, 34);
    y += 6;
  }
  hr(); ctr(`عدد الأصناف: ${n}`, 30, 800);
  y += 30; const out = document.createElement("canvas"); out.width = W; out.height = Math.ceil(y); out.getContext("2d").drawImage(cv, 0, 0); out.dataset.kind = "kitchen"; return out;
}
async function printCanvas(cv, manual, quiet, opts = {}) { /* cv: لوحة أو أكثر */
  const mode = S.device.printMode, st = $("#prs");
  if (mode === "none") { if (manual) showReceipt(cv); return true; }
  if (mode === "browser") { if (!manual && !quiet) return true; await browserPrint(cv); return true; }
  if (!S.device.printerIp) { const m = "لم يُحدَّد عنوان الطابعة في إعدادات الجهاز"; if (!quiet) toast(m, true); return m; }
  if (st) st.textContent = "جارٍ الطباعة…";
  try { await eposPrint(cv, S.device.printerIp, opts); if (st) { st.textContent = "✓ طُبع الإيصال"; st.classList.remove("bad"); } return true; }
  catch (e) { const m = "تعذّرت الطباعة: " + printErr(e, S.device.printerIp); notePrinter(e.st || 0, m);
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
    <div class="brand"><div class="logo">${ic("clock")}</div><h1>فتح الوردية</h1><p>${esc(S.cashier.name)} · <span class="num">${dmy(bizDay())}</span></p></div>
    <div class="f"><label for="fl">عهدة الصندوق (الفكّة الموجودة في الدرج الآن)</label><input id="fl" type="number" inputmode="decimal" min="0" step="0.5" dir="ltr" value="${fl}" placeholder="0"></div>
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
    <div class="list"><button class="row" id="sw1"><span class="ri">${ic("swap")}</span><span><b>تبديل فقط</b><br><span class="meta">نفس الوردية والدرج، والطلبات تُسجّل باسم الكاشير الجديد</span></span><span></span></button>
    <button class="row" id="sw2"><span class="ri">${ic("lock")}</span><span><b>تقفيل الوردية ثم التبديل</b><br><span class="meta">عدّ الدرج وتسليمه</span></span><span></span></button></div></div>`);
  $("#sw1").onclick = () => { resetCart(); S.cashier = null; ls.set("cashier", null); render("pin"); };
  $("#sw2").onclick = () => { resetCart(); closeShiftFlow(); };
}

/* حسابات الوردية من طلباتها */
function shiftCalc(sh, orders) {
  const ok = orders.filter(o => o.status === "paid"), voids = orders.filter(o => o.status === "void");
  const sum = a => r2(a.reduce((s, o) => s + o.total, 0)), m = {}, n = {}, ty = {}, items = {};
  Object.keys(METHODS).forEach(k => { m[k] = r2(ok.reduce((s, o) => s + paidBy(o, k), 0)); n[k] = ok.filter(o => hasM(o, k)).length; });
  TYPES.forEach(([k]) => ty[k] = sum(ok.filter(o => o.type === k)));
  ok.forEach(o => o.lines.forEach(l => { items[l.name] = (items[l.name] || 0) + l.qty; l.mods.forEach(md => items[md.name] = (items[md.name] || 0) + l.qty); }));
  const moves = sh.moves || [], cin = r2(moves.filter(x => x.kind === "in").reduce((s, x) => s + x.amount, 0)), cout = r2(moves.filter(x => x.kind === "out").reduce((s, x) => s + x.amount, 0));
  /* «float» close (default): the drawer is counted for its float only; the sales cash (cash sales + deposits − payouts) is handed to
     the accountant and settled with him. «full»: the whole drawer is counted against float + sales cash as before */
  const mode = sh.summary?.mode || (S.config?.drawerMode === "full" ? "full" : "float"), salesCash = r2(m.cash + cin - cout);
  const expected = mode === "float" ? r2(sh.float || 0) : r2((sh.float || 0) + salesCash);
  return { mode, salesCash, count: ok.length, total: sum(ok), m, n, ty, items, disc: r2(ok.reduce((s, o) => s + (o.discount?.amount || 0), 0)), discN: ok.filter(o => o.discount).length,
    voidN: voids.length, voidT: sum(voids), cin, cout, expected, cards: r2(m.mada + m.visa) };
}

function openShift() {
  if (!S.shift) return;
  modal(`${mh(`الوردية <span class="muted small">منذ <span class="num">${hm(S.shift.openedAt)}</span> · فتحها ${esc(S.shift.openedBy.name)}</span>`)}<div class="mdl-b" id="shift-sum"></div>
    <div class="mdl-f"><button class="btn ghost" id="cin">${ic("add")}إيداع في الدرج</button><button class="btn ghost" id="cout">${ic("remove")}صرف من الدرج</button><span class="sp"></span><button class="btn dark" id="cls">${ic("lock")}تقفيل الوردية</button></div>`, { wide: true });
  drawShiftSum();
  $("#cin").onclick = () => cashMove("in"); $("#cout").onclick = () => S.config?.cashOutFree ? cashMove("out") : askManager("صرف نقد من الدرج", () => cashMove("out"), { open: true });
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
      ${c.mode === "float" ? `<p class="small" style="margin:8px 0 0">العهدة: <b class="num">${money(S.shift.float)}</b> تبقى في الدرج وتُعدّ عند التقفيل. كاش المبيعات يُسلَّم للمحاسب ويُحاسَب عليه في المخالصة.</p>` : `<p class="small muted" style="margin:8px 0 0">المبلغ المتوقع في الدرج يظهر بعد عدّ الكاش عند التقفيل.</p>`}</div>
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
    S.shift.moves = [...(S.shift.moves || []), { kind, amount: a, reason: r, at: Date.now(), by: S.cashier.name, approved: kind === "out" ? "manager" : null, ...(kind === "out" ? { via: S.mgrOk?.via || "pin", approval: S.mgrOk?.id || "" } : {}) }];
    saveShift(); toast(kind === "in" ? "تم تسجيل الإيداع" : "تم تسجيل الصرف"); openShift(); };
}

/* التقفيل: 1) عدّ الدرج بالفئات (بدون رؤية المتوقع) 2) النتيجة والفرق 3) التأكيد والطباعة */
function closeShiftFlow() {
  if (!S.shift) return;
  const up = unpaidList().filter(o => o.shiftId === S.shift.id);
  if (up.length) { modal(`${mh("لا يمكن تقفيل الوردية")}<div class="mdl-b"><p style="margin:0;line-height:1.8">يوجد <b class="num">${up.length}</b> ${up.length === 1 ? "طلب" : "طلبات"} أُرسلت للمطبخ ولم تُدفع (${up.map(o => `<span class="num">${(o.no ?? "")}</span>`).join("، ")}). ادفعها عند حضور العميل أو ألغها إن لم يحضر، ثم قفّل الوردية.</p></div>
      <div class="mdl-f"><button class="btn ghost" data-close>إغلاق</button><button class="btn" id="gou">${ic("clock")}عرض بانتظار الدفع</button></div>`); $("#gou").onclick = openUnpaid; return; } const q = {}; DENOMS.forEach(d => q[d] = "");
  const fm = shiftCalc(S.shift, S.shiftOrders).mode === "float";
  modal(`${mh(fm ? "تقفيل الوردية — عدّ العهدة" : "تقفيل الوردية — عدّ الدرج")}<div class="mdl-b">
    <p class="small muted" style="margin:0 0 12px;line-height:1.7">${fm ? "افصل كاش المبيعات في ظرف للمحاسب، ثم عُدّ <b>العهدة (الفكّة) التي تبقى في الدرج</b> فقط واكتب عدد كل فئة. كاش المبيعات يُحاسَب عليه مع المحاسب في المخالصة." : "عُدّ كل فئة في الدرج واكتب عددها. لا تكتب المبلغ المتوقع، اكتب الموجود فعلاً."}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">${DENOMS.map(d => `<div class="f" style="margin:0"><label for="d${String(d).replace(".", "_")}">فئة ${d === 0.5 ? "نصف ريال" : d}</label><input id="d${String(d).replace(".", "_")}" data-d="${d}" type="number" inputmode="numeric" min="0" step="1" dir="ltr" placeholder="العدد"></div>`).join("")}</div>
    <div class="chg" style="background:var(--bg);color:var(--ink)"><span>${fm ? "مجموع العهدة المعدودة" : "مجموع الكاش المعدود"}</span><span class="money" id="ct">0.00</span></div>
    <div class="f" style="margin-top:14px"><label for="tm">إجمالي تقرير جهاز الشبكة (مدى + فيزا) — اختياري</label><input id="tm" type="number" inputmode="decimal" min="0" step="0.01" dir="ltr" placeholder="من تقرير التسوية في جهاز الدفع"></div></div>
    <div class="mdl-f"><button class="btn ghost" data-close>إلغاء</button><button class="btn" id="nx">التالي</button></div>`);
  const tot = () => r2(DENOMS.reduce((s, d) => s + d * (+$(`[data-d="${d}"]`).value || 0), 0));
  $$("#ov [data-d]").forEach(i => i.oninput = () => { $("#ct").textContent = m2(tot()); });
  $("#nx").onclick = () => {
    if ($$("#ov [data-d]").some(i => i.value !== "" && (+i.value < 0 || !Number.isInteger(+i.value)))) return toast("العدد يجب أن يكون رقماً صحيحاً", true);
    const counted = tot(), den = {}; DENOMS.forEach(d => { const v = +$(`[data-d="${d}"]`).value || 0; if (v) den[d] = v; });
    const term = $("#tm").value === "" ? null : r2($("#tm").value);
    if (!counted && !confirm(fm ? "العهدة المعدودة صفر. هل الدرج فارغ فعلاً؟" : "مجموع الكاش المعدود صفر. هل الدرج فارغ فعلاً؟")) return;
    closeShiftResult(counted, den, term);
  };
}
function closeShiftResult(counted, den, term) {
  const c = shiftCalc(S.shift, S.shiftOrders), diff = r2(counted - c.expected), tdiff = term == null ? null : r2(term - c.cards);
  const lab = d => Math.abs(d) < 0.005 ? `<span class="chip ok">مطابق</span>` : d < 0 ? `<span class="chip bad">عجز ${m2(-d)}</span>` : `<span class="chip warn">زيادة ${m2(d)}</span>`;
  const fm = c.mode === "float";
  modal(`${mh("تقفيل الوردية — النتيجة")}<div class="mdl-b">
    ${fm ? `<table class="t"><tbody><tr><td><b>العهدة (فكّة الدرج)</b></td><td class="n"><b>${money(S.shift.float)}</b></td></tr><tr><td><b>العهدة المعدودة</b></td><td class="n"><b>${money(counted)}</b></td></tr></tbody></table>
    <div class="chg ${diff < -0.005 ? "neg" : ""}" style="${diff > 0.005 ? "background:var(--warnbg);color:var(--warn)" : ""}"><span>${Math.abs(diff) < 0.005 ? "العهدة مطابقة ✓" : diff < 0 ? "عجز في العهدة" : "زيادة في العهدة"}</span><span class="money">${m2(Math.abs(diff))}</span></div>
    <h4 style="margin:14px 0 6px">كاش المبيعات للتسليم للمحاسب</h4>
    <table class="t"><tbody><tr><td>مبيعات الكاش (${c.n.cash} طلب)</td><td class="n">${money(c.m.cash)}</td></tr><tr><td>+ الإيداعات</td><td class="n">${money(c.cin)}</td></tr><tr><td>− المصروفات من الدرج</td><td class="n">${money(c.cout)}</td></tr>
      <tr><td><b>المطلوب تسليمه</b></td><td class="n"><b>${money(c.salesCash)}</b></td></tr></tbody></table>
    <p class="small muted" style="margin:6px 0 0">يُسلَّم في ظرف للمحاسب، ويعدّه ويطابقه في المخالصة.</p>`
    : `<table class="t"><tbody><tr><td>فكّة البداية</td><td class="n">${money(S.shift.float)}</td></tr><tr><td>+ مبيعات الكاش (${c.n.cash} طلب)</td><td class="n">${money(c.m.cash)}</td></tr>
      <tr><td>+ الإيداعات</td><td class="n">${money(c.cin)}</td></tr><tr><td>− المصروفات من الدرج</td><td class="n">${money(c.cout)}</td></tr>
      <tr><td><b>المتوقع في الدرج</b></td><td class="n"><b>${money(c.expected)}</b></td></tr><tr><td><b>المعدود فعلاً</b></td><td class="n"><b>${money(counted)}</b></td></tr></tbody></table>
    <div class="chg ${diff < -0.005 ? "neg" : ""}" style="${diff > 0.005 ? "background:var(--warnbg);color:var(--warn)" : ""}"><span>${Math.abs(diff) < 0.005 ? "الدرج مطابق ✓" : diff < 0 ? "عجز في الدرج" : "زيادة في الدرج"}</span><span class="money">${m2(Math.abs(diff))}</span></div>`}
    <table class="t" style="margin-top:12px"><tbody><tr><td>مدى</td><td class="n">${money(c.m.mada)}</td></tr><tr><td>فيزا / ماستركارد</td><td class="n">${money(c.m.visa)}</td></tr>
      ${term != null ? `<tr><td>جهاز الشبكة ${lab(tdiff)}</td><td class="n">${money(term)}</td></tr>` : ""}${AGG.map(k => `<tr><td>${tName(k)}</td><td class="n">${money(c.m[k])}</td></tr>`).join("")}
      <tr><td><b>إجمالي المبيعات (${c.count} طلب)</b></td><td class="n"><b>${money(c.total)}</b></td></tr></tbody></table>
    <div class="f" style="margin-top:14px"><label for="nt">ملاحظة ${Math.abs(diff) >= 1 || (tdiff != null && Math.abs(tdiff) >= 1) ? "(مطلوبة لوجود فرق)" : "(اختياري)"}</label><textarea id="nt" placeholder="سبب الفرق إن وُجد"></textarea></div></div>
    <div class="mdl-f"><button class="btn ghost" id="rb">رجوع للعدّ</button><button class="btn dark" id="ok">${ic("lock")}تأكيد التقفيل</button></div>`);
  $("#rb").onclick = closeShiftFlow;
  $("#ok").onclick = async () => {
    const note = $("#nt").value.trim(); if ((Math.abs(diff) >= 1 || (tdiff != null && Math.abs(tdiff) >= 1)) && !note) return toast("اكتب سبب الفرق", true);
    $("#ok").disabled = true;
    const sh = { ...S.shift, status: "closed", closedAt: Date.now(), closedBy: { ...S.cashier }, counted, denoms: den, terminal: term, note,
      cashiers: [...new Set([...(S.shift.cashiers || []), ...S.shiftOrders.map(o => o.cashierName)])],
      summary: { mode: c.mode, salesCash: c.salesCash, count: c.count, total: c.total, m: c.m, n: c.n, ty: c.ty, disc: c.disc, voidN: c.voidN, voidT: c.voidT, cin: c.cin, cout: c.cout, expected: c.expected, diff, tdiff, items: c.items } };
    S.shift = sh; saveShift(); const orders = S.shiftOrders;
    setShift(null); S.cashier = null; ls.set("cashier", null);
    const cv = await drawShiftReport(sh, orders); render("pin");
    modal(`${mh("تم تقفيل الوردية ✓")}<div class="mdl-b"><img class="rcpt" src="${cv.toDataURL("image/png")}" alt="تقرير الوردية" style="width:300px"></div>
      <div class="mdl-f"><button class="btn ghost" id="zp">${ic("print")}طباعة التقرير</button><button class="btn" data-close>تم</button></div>`);
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
  Object.entries(METHODS).forEach(([k, l]) => (c.n[k] || k in c.n) && lr(`  ${l} (${c.n[k] || 0})`, m2(c.m[k] || 0), 24, 500));
  TYPES.forEach(([k, l]) => (c.ty[k] || k in c.ty) && lr(`  ${l}`, m2(c.ty[k] || 0), 22, 500));
  lr("الخصومات", m2(c.disc), 24, 500); lr(`الإلغاءات (${c.voidN})`, m2(c.voidT), 24, 500);
  if (c.mode === "float") {
    hr(); lr("العهدة (فكّة الدرج)", m2(sh.float), 26, 800);
    if (sh.counted != null) { lr("  المعدودة", m2(sh.counted), 24, 500); const d = r2(sh.counted - c.expected); lr(Math.abs(d) < 0.005 ? "العهدة: مطابقة" : d < 0 ? "العهدة: عجز" : "العهدة: زيادة", m2(Math.abs(d)), 26, 800); }
    hr(); lr("كاش المبيعات للتسليم", null, 28, 800); lr("  مبيعات الكاش", m2(c.m.cash), 24, 500); lr("  + الإيداعات", m2(c.cin), 24, 500); lr("  − المصروفات", m2(c.cout), 24, 500);
    lr("المطلوب تسليمه للمحاسب", m2(c.salesCash ?? r2(c.m.cash + c.cin - c.cout)), 28, 800); lr("  المستلم: ............  التوقيع: ........", null, 22, 500);
  } else {
  hr(); lr("الدرج", null, 28, 800); lr("  فكّة البداية", m2(sh.float), 24, 500); lr("  + مبيعات الكاش", m2(c.m.cash), 24, 500);
  lr("  + الإيداعات", m2(c.cin), 24, 500); lr("  − المصروفات", m2(c.cout), 24, 500); lr("المتوقع", m2(c.expected), 26, 700);
  if (sh.counted != null) { lr("المعدود", m2(sh.counted), 26, 700); const d = r2(sh.counted - c.expected); lr(Math.abs(d) < 0.005 ? "الفرق: مطابق" : d < 0 ? "الفرق: عجز" : "الفرق: زيادة", m2(Math.abs(d)), 28, 800); }
  }
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
  try { L = (await F.getDocs(F.query(C("orders"), F.where("day", ">=", addDays(from < addDays(bizDay(), -7) ? from : addDays(bizDay(), -7), 0))))).docs.map(d => d.data()).filter(o => !o.test && (o.status !== "void" || o.void?.unpaid)); }
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
/* ---------- لوحة المدير: تُحمَّل من console.js عند فتحها ---------- */
function dshRange(p, d) {
  if (p === "day") return [d, d];
  if (p === "week") { const x = new Date(d + "T12:00:00"), k = (x.getDay() + 1) % 7; const a = addDays(d, -k); return [a, addDays(a, 6)]; } /* الأسبوع يبدأ السبت */
  return [d.slice(0, 8) + "01", ymd(new Date(+d.slice(0, 4), +d.slice(5, 7), 0))];
}
function download(rows, name) {
  const csv = "\ufeff" + rows.map(r => r.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const API = { S, F, D, C, VERSION, METHODS, TYPES, payParts, paidBy, hasM, mLabel, CATS, bizDay, addDays, ymd, dshRange, toast, download, render, orderCogs, packOf, itemCost, printJob, previewJob, printCanvas, drawShiftReport,
  auth, apiKey: firebaseConfig.apiKey, deviceEmail: DEVICE_EMAIL, signOut: () => F.signOut(auth), admStock: () => admStock(), admMenu: () => admMenu(), admStaff: () => admStaff(), admStore: () => admStore(), admVerify: () => admVerify() };
function openAdmin(tab) {
  if (!isAdmin()) return; closeModal(); S.view = "admin";
  import(`./console.js?v=${VERSION}`).then(m => m.mount(API, typeof tab === "string" ? tab : null))
    .catch(e => { console.error(e); toast("تعذّر فتح لوحة المدير. تأكد من الاتصال ثم حاول", true); S.view = ""; render(S.cashier ? (S.shift ? "pos" : "openshift") : "pin"); });
}

const imgBtn = m => `<button class="mimg-b ${m.img ? "has" : ""}" data-pick type="button" aria-label="صورة الصنف">${m.img ? `<img src="${m.img}" alt="">` : ic("image")}</button>${m.img ? `<button class="mimg-x" data-rmimg type="button" aria-label="حذف الصورة">${ic("close")}</button>` : ""}`;
/* تصغير الصورة إلى مربع 320×320 بجودة مناسبة (حوالي 20–40 كيلوبايت) لتُحفظ مع الصنف وتعمل بدون إنترنت */
function shrinkImg(file, S2 = 320) {
  return new Promise((ok, bad) => { const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = S2; const g = c.getContext("2d"), k = Math.min(im.width, im.height);
      g.fillStyle = "#fff"; g.fillRect(0, 0, S2, S2); g.drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, 0, 0, S2, S2); URL.revokeObjectURL(u);
      let q = .8, d = c.toDataURL("image/jpeg", q); while (d.length > 60000 && q > .4) { q -= .1; d = c.toDataURL("image/jpeg", q); } ok(d); };
    im.onerror = () => { URL.revokeObjectURL(u); bad(); }; im.src = u; });
}
function admMenu() {
  const A = $("#adm"), rows = S.menu.map(m => ({ ...m }));
  const row = (m, i) => `<div class="mrow" data-r="${i}"><div class="mimg">${imgBtn(m)}</div><input data-f="name" value="${esc(m.name)}" aria-label="اسم الصنف">
    <select data-f="cat" aria-label="القسم">${CATS.map(([k, l]) => `<option value="${k}" ${m.cat === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <input data-f="price" type="number" step="0.25" min="0" inputmode="decimal" dir="ltr" value="${m.price ?? ""}" aria-label="سعر المطعم">
    <input data-f="lokit" type="number" step="0.25" min="0" inputmode="decimal" dir="ltr" value="${m.lokit ?? ""}" placeholder="—" aria-label="سعر لوكيت">
    <input data-f="hunger" type="number" step="0.25" min="0" inputmode="decimal" dir="ltr" value="${m.hunger ?? ""}" placeholder="—" aria-label="سعر هنقرستيشن">
    <input data-f="cost" type="number" step="0.01" min="0" inputmode="decimal" dir="ltr" value="${m.cost ?? ""}" placeholder="—" aria-label="تكلفة الطعام">
    <button class="sw ${m.box ? "on" : ""}" data-f="box" aria-label="يُقدَّم في علبة ورقية"></button>
    <button class="sw ${m.addon ? "on" : ""}" data-f="addon" aria-label="إضافة تُضاف على صنف (مثل الجبن)"></button>
    <input data-f="sort" type="number" step="1" inputmode="numeric" dir="ltr" value="${m.sort ?? 0}" aria-label="الترتيب">
    <button class="sw ${m.active ? "on" : ""}" data-f="active" aria-label="ظاهر في الكاشير"></button></div>`;
  A.innerHTML = `<div class="note" style="margin-bottom:12px">السعر الفارغ يعني أن الصنف غير متوفر في ذلك المكان: اترك سعر المطعم فارغاً لصنف خاص بلوكيت أو هنقرستيشن. اضغط على مربع الصورة لإضافة صورة الصنف (تُصغَّر تلقائياً). «تكلفة الطعام» للحبة الواحدة بدون التغليف (من برنامج المحاسبة). «علبة» للأصناف التي تُقدَّم في علبة ورقية، ويُحسب لكل منها علبة وكيس. الأصناف المُطفأة تختفي من الكاشير وتبقى في التقارير.</div>
    <div class="mrow h"><span>صورة</span><span>الصنف</span><span>القسم</span><span>سعر المطعم</span><span>سعر لوكيت</span><span>سعر هنقرستيشن</span><span>تكلفة الطعام</span><span>علبة</span><span>إضافة</span><span>الترتيب</span><span>ظاهر</span></div>
    <div id="mrows">${rows.map(row).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn ghost" id="madd">+ صنف جديد</button><span class="sp"></span><button class="btn" id="msv">حفظ المنيو</button></div>
    <p class="small muted">«إضافة»: صنف يُضاف على الصنف المحدد في السلة بدل أن يكون سطراً مستقلاً (مثل الجبن). «الترتيب»: الأصغر يظهر أولاً.</p>`;
  const bind = () => { $$("#mrows [data-f=active],#mrows [data-f=box],#mrows [data-f=addon]").forEach(b => b.onclick = () => b.classList.toggle("on"));
    $$("#mrows .mimg").forEach(w => { const i = +w.closest(".mrow").dataset.r, r = rows[i];
      const pick = w.querySelector("[data-pick]"), rm = w.querySelector("[data-rmimg]");
      pick.onclick = () => { const f = document.createElement("input"); f.type = "file"; f.accept = "image/*";
        f.onchange = async () => { const file = f.files[0]; if (!file) return; try { r.img = await shrinkImg(file); r.imgChanged = true; w.innerHTML = imgBtn(r); bind(); } catch { toast("تعذّر قراءة الصورة", true); } }; f.click(); };
      rm && (rm.onclick = e => { e.stopPropagation(); r.img = null; r.imgChanged = true; w.innerHTML = imgBtn(r); bind(); }); }); };
  bind();
  $("#madd").onclick = () => { rows.push({ id: null, name: "", cat: S.cat, price: null, lokit: null, active: true, sort: (Math.max(0, ...rows.map(r => r.sort || 0)) + 10), addon: false });
    $("#mrows").insertAdjacentHTML("beforeend", row(rows.at(-1), rows.length - 1)); bind(); $("#mrows .mrow:last-child input").focus(); };
  $("#msv").onclick = async () => {
    const batch = F.writeBatch(db); let n = 0, err = "";
    $$("#mrows .mrow").forEach(e => { const i = +e.dataset.r, o = rows[i], g = f => e.querySelector(`[data-f=${f}]`);
      const v = { name: g("name").value.trim(), cat: g("cat").value, price: g("price").value === "" ? null : r2(g("price").value), lokit: g("lokit").value === "" ? null : r2(g("lokit").value), hunger: g("hunger").value === "" ? null : r2(g("hunger").value), sort: +g("sort").value || 0, active: g("active").classList.contains("on"), cost: g("cost").value === "" ? null : r2(g("cost").value), box: g("box").classList.contains("on") };
      if (!v.name && !o.id) return; if (!v.name) err ||= "اسم صنف فارغ"; /* a platform-only item (e.g. a Lokit combo) has no restaurant price: it shows only when that platform is chosen */
      if (v.price == null && v.lokit == null && v.hunger == null) err ||= `اكتب سعراً واحداً على الأقل (المطعم أو لوكيت أو هنقرستيشن): ${v.name || "صنف جديد"}`;
      v.addon = g("addon").classList.contains("on");
      if (o.imgChanged) v.img = o.img || null;
      const changed = !o.id || o.imgChanged || ["name", "cat", "price", "lokit", "hunger", "sort", "active", "cost", "box", "addon"].some(k => (o[k] ?? (k === "addon" || k === "box" ? false : null)) !== v[k]);
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
    <div class="f"><label for="snt">ملاحظات الأصناف السريعة (سطر لكل ملاحظة)</label><textarea id="snt" rows="6" style="min-height:140px">${esc(noteList().join("\n"))}</textarea><span class="hint">تظهر أزراراً عند الضغط على «ملاحظة» في السلة، وتُطبع في ورقة المطبخ. مجانية دائماً.</span></div>
    <div class="f"><label for="sc">بداية اليوم التشغيلي (الساعة)</label><select id="sc">${[0, 1, 2, 3, 4, 5, 6].map(h => `<option value="${h}" ${(S.config.cutoff ?? 4) === h ? "selected" : ""}>${h === 0 ? "12 منتصف الليل" : `${h} فجراً`}</option>`).join("")}</select>
      <span class="hint">الطلبات قبل هذه الساعة تُحسب على اليوم السابق، مثل فودكس.</span></div>
    <div class="f"><label>الشعار في الإيصال (أسود على أبيض)</label><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn ghost sm" for="lg">اختيار صورة الشعار</label><input id="lg" type="file" accept="image/*" hidden>${S.config.logo ? `<button class="btn ghost sm" id="lgx" style="color:var(--bad)">إزالة الشعار</button>` : ""}</div>
      <span class="hint">تتحول الصورة تلقائياً إلى أبيض وأسود بحجم مناسب للطابعة.</span></div>
    <div class="f"><label for="swa">رسالة تذكير العميل بواتساب</label><textarea id="swa" rows="5" style="min-height:120px">${esc(S.config.waMsg || WA_DEFAULT)}</textarea>
      <span class="hint">تُستبدل تلقائياً: {الاسم} اسم العميل (يُحذف إن لم يُكتب)، {رقم} رقم الطلب، {المبلغ}، {المطعم}، {الجوال} رقم الطلبات. <button type="button" class="link" id="swr" style="padding:0">استعادة النص الافتراضي</button></span>
      <div class="note" id="swp" data-noi18n style="white-space:pre-line;margin-top:6px"></div></div>
    <button class="btn" id="ssv">حفظ</button></div>
    <div><p class="small muted" style="margin:0 0 6px">معاينة الإيصال</p><img id="pv" class="rcpt" style="width:300px" alt="معاينة الإيصال"></div></div>`;
  let logo = S.config.logo || null;
  const preview = async () => { const keep = S.config; S.config = { ...S.config, logo, store: { name: $("#sn").value, address: $("#sa").value, phone: $("#sp").value, thanks: $("#st").value } };
    try { $("#pv").src = (await drawReceipt(sampleOrder())).toDataURL(); } finally { S.config = keep; } };
  ["sn", "sa", "sp", "st"].forEach(k => $("#" + k).oninput = preview); preview();
  const wprev = () => { $("#swp").textContent = "معاينة:\n" + waText({ no: 7, total: 32, name: "أبو محمد" }, $("#swa").value); }; $("#swa").oninput = wprev; wprev();
  $("#swr").onclick = () => { $("#swa").value = WA_DEFAULT; wprev(); };
  $("#lg").onchange = async () => { const f = $("#lg").files[0]; if (!f) return; logo = await toMonoLogo(f); preview(); };
  $("#lgx") && ($("#lgx").onclick = () => { logo = null; preview(); });
  $("#ssv").onclick = async () => {
    const store = { name: $("#sn").value.trim(), address: $("#sa").value.trim(), phone: $("#sp").value.trim(), thanks: $("#st").value.trim() };
    if (!store.name) return toast("اسم المطعم مطلوب", true);
    const notes = [...new Set($("#snt").value.split("\n").map(x => x.trim()).filter(Boolean))].slice(0, 30);
    try { await F.updateDoc(D("config", "main"), { store, cutoff: +$("#sc").value, logo, notes, waMsg: $("#swa").value.trim() || WA_DEFAULT, updatedAt: Date.now() }); toast("تم الحفظ ✓"); } catch (e) { toast("تعذّر الحفظ: " + (e.code || e.message), true); }
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
window.__aq = { S, F, D, mgrCode, render, total, bizDay, drawReceipt, drawKitchen, raster, shiftCalc, drawShiftReport, packOf, orderCogs, sha256Hex };
