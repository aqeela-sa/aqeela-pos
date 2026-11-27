/* محاسبة العقيلة على Firebase: تسجيل الدخول، وطبقة توافق تعطي البرنامج نفس واجهة قاعدة البيانات التي كان يعمل بها،
   فيبقى كود البرنامج كما هو. كل بيانات المحاسبة في مجموعات تبدأ بـ acc_ داخل مشروع الكاشير نفسه. */
import * as F from "../vendor/firebase.js";
import { firebaseConfig } from "../firebase-config.js";

const ADMIN_EMAIL = "abuabraj@gmail.com";
const STAFF_EMAILS = ["aqeelah.shawqi@gmail.com"];
const P = "acc_";

/* a separate app name: its own login and its own local storage, apart from the cashier on the same site */
const app = F.initializeApp(firebaseConfig, "acc");
const auth = F.getAuth(app);
const fs = F.initializeFirestore(app, { ignoreUndefinedProperties: true });
F.setPersistence(auth, F.indexedDBLocalPersistence).catch(() => {});

const roleOf = u => !u ? null : u.email === ADMIN_EMAIL ? "admin" : STAFF_EMAILS.includes(u.email) ? "staff" : member ? "member" : "other";
/* a team member (الإعدادات ← الفريق): read from the settings at sign-in; the rules let only listed, active members read it */
let member = null;
async function memberOf(u){
  try { const s = await F.getDoc(F.doc(fs, P + "settings", "main")); const T = s.exists() ? (s.data().team || {}) : {}, m = T[(u.email || "").toLowerCase().replace(/\./g, ",")];
    return m && m.role && !m.off ? { ...m, email: (u.email || "").toLowerCase() } : null; } catch(e){ return null; }
}
/* login accounts for the team, through Firebase Authentication's public interface (the owner stays signed in) */
const idt = async (op, body) => {
  try { const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${op}?key=${encodeURIComponent(firebaseConfig.apiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})); return r.ok ? { ok: true } : { ok: false, code: (j.error && j.error.message) || ("HTTP " + r.status) }; }
  catch(e){ return { ok: false, code: "NETWORK" }; }
};
const login = {
  create: (email, password) => idt("signUp", { email, password, returnSecureToken: false }),
  reset: email => idt("sendOobCode", { requestType: "PASSWORD_RESET", email })
};
const reserved = em => em === ADMIN_EMAIL || STAFF_EMAILS.includes(em) || em === "cashier@aqeela-pos.app";

/* ---------- the database interface the app was written against ---------- */
/* also tell when cached data is confirmed by the server unchanged: without it a listener whose first answer came from the cache
   (a document already read at sign-in, or a slow phone) never reports «from the server», and the app keeps saying it is not up to date */
const MD = { includeMetadataChanges: true };
const split = path => { const i = path.indexOf("/"); return [path.slice(0, i), path.slice(i + 1)]; };
const docSnap = s => ({ id: s.id, exists: s.exists(), data: () => s.data(), metadata: { fromCache: !!(s.metadata && s.metadata.fromCache) } });
const qSnap = q => ({ docs: q.docs.map(d => ({ id: d.id, exists: true, data: () => d.data() })), size: q.size, empty: q.empty, metadata: { fromCache: !!(q.metadata && q.metadata.fromCache) } });
function refApi(r){
  return {
    id: r.id, path: r.path,
    set: data => F.setDoc(r, data),
    update: data => F.updateDoc(r, data),
    delete: () => F.deleteDoc(r),
    get: async () => docSnap(await F.getDoc(r)),
    onSnapshot: (cb, err) => F.onSnapshot(r, MD, s => cb(docSnap(s)), e => err && err(e))
  };
}
function queryApi(q){
  return {
    get: async () => qSnap(await F.getDocs(q)),
    onSnapshot: (cb, err) => F.onSnapshot(q, MD, s => cb(qSnap(s)), e => err && err(e)),
    where: (f, op, v) => queryApi(F.query(q, F.where(f, op, v)))
  };
}
const db = {
  doc: path => { const [c, id] = split(path); return refApi(F.doc(fs, P + c, id)); },
  collection: c => {
    const col = F.collection(fs, P + c);
    return { ...queryApi(col), doc: id => refApi(id ? F.doc(col, id) : F.doc(col)) };
  },
  /* used by the one-time import: up to 400 writes per batch */
  async bulk(list, progress){
    let done = 0;
    for (let i = 0; i < list.length; i += 400){
      const b = F.writeBatch(fs);
      list.slice(i, i + 400).forEach(({ coll, id, data }) => b.set(F.doc(fs, P + coll, id), data));
      await b.commit(); done += Math.min(400, list.length - i); progress && progress(done, list.length);
    }
    return done;
  }
};

/* ---------- who is using it ---------- */
let current = null, profile = {};
const names = {};
/* a random id kept by this browser, so the account's device list has one entry per device */
const deviceId = () => { try { let k = localStorage.getItem("acc-device"); if (!k){ k = [...crypto.getRandomValues(new Uint8Array(8))].map(x => x.toString(16).padStart(2, "0")).join(""); localStorage.setItem("acc-device", k); } return k; } catch(e){ return "unknown"; } };
const deviceLabel = () => { const u = navigator.userAgent || "";
  const os = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1) ? "iPad" : /Android/.test(u) ? (/Mobile/.test(u) ? "جوال Android" : "جهاز Android") : /Windows/.test(u) ? "Windows" : /Mac OS X|Macintosh/.test(u) ? "Mac" : /Linux/.test(u) ? "Linux" : "جهاز";
  const br = /Edg\//.test(u) ? "Edge" : /SamsungBrowser/.test(u) ? "Samsung Internet" : /CriOS|Chrome\//.test(u) ? "Chrome" : /FxiOS|Firefox\//.test(u) ? "Firefox" : /Safari\//.test(u) ? "Safari" : "متصفح";
  return os + " · " + br + (matchMedia && matchMedia("(display-mode: standalone)").matches ? " (تطبيق)" : ""); };
const userApi = {
  id: async () => current ? current.uid : "",
  can: async () => !!current && (["admin", "staff"].includes(roleOf(current)) || (roleOf(current) === "member" && member.role !== "partner")),
  email: async () => current ? (current.email || "").toLowerCase() : "",
  member: () => member,
  legacy: () => roleOf(current) === "staff",
  isOwner: async () => roleOf(current) === "admin",
  canEdit: async () => roleOf(current) === "admin",
  email: () => current ? current.email : "",
  role: () => roleOf(current),
  signOut: () => F.signOut(auth).then(() => location.reload()),
  meta: () => current ? { uid: current.uid, created: current.metadata && current.metadata.creationTime, lastSignIn: current.metadata && current.metadata.lastSignInTime } : {},
  profile: () => profile,
  device: () => deviceId(),
  /* the account's own details (حسابي): the name shown on its entries, a phone and a title */
  async saveProfile(o){
    if (!current) throw new Error("signed-out");
    const d = { updatedAt: new Date().toISOString() };
    if (typeof o.name === "string" && !member){ d.name = o.name.trim(); d.nameSet = true; }
    ["phone", "title"].forEach(k => { if (typeof o[k] === "string") d[k] = o[k].trim(); });
    await F.setDoc(F.doc(fs, P + "users", current.uid), d, { merge: true });
    profile = { ...profile, ...d }; if (d.name) names[current.uid] = d.name;
    return profile;
  },
  /* a new password: the current one is checked first; Firebase then ends every other device's sign-in,
     and this device signs in again with the new password so it carries on */
  async changePassword(cur, nw){
    if (!current) return { ok: false, code: "SIGNED_OUT" };
    const em = current.email, key = encodeURIComponent(firebaseConfig.apiKey);
    const call = async (op, body) => { try { const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${op}?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({})); return r.ok ? { ok: true, j } : { ok: false, code: (j.error && j.error.message) || ("HTTP " + r.status) }; } catch(e){ return { ok: false, code: "NETWORK" }; } };
    const a = await call("signInWithPassword", { email: em, password: cur, returnSecureToken: true });
    if (!a.ok) return a;
    const b = await call("update", { idToken: a.j.idToken, password: nw, returnSecureToken: true });
    if (!b.ok) return b;
    const when = new Date().toISOString(); profile = { ...profile, pwChangedAt: when };
    try { await F.signInWithEmailAndPassword(auth, em, nw); } catch(e){ return { ok: true, relogin: true }; }
    try { await F.setDoc(F.doc(fs, P + "users", current.uid), { pwChangedAt: when }, { merge: true }); } catch(e){}
    return { ok: true };
  },
  sendReset: () => current ? login.reset(current.email) : Promise.resolve({ ok: false, code: "SIGNED_OUT" }),
  async profiles(ids){
    const out = {};
    if (!Object.keys(names).length){
      try { (await F.getDocs(F.collection(fs, P + "users"))).docs.forEach(d => { names[d.id] = (d.data() || {}).name || ""; }); } catch(e){}
    }
    ids.forEach(id => { out[id] = { name: names[id] || "" }; });
    return out;
  }
};

/* ---------- full backup and restore (owner): every accounting collection and the cashier's orders, shifts, menu and settings ---------- */
const ACC_COLLS = ["settings","sales","invoices","custody","appTransfers","recon","journal","suppliers","payments","staff","advances","payroll","stockItems","stockCounts","cfo","bankTx","menuItems","itemSales","attachments","platforms","users","posDays","ingredients","recipes","ingCounts","purchaseOrders","batches","attendance","rota","leaves","hrEvents","hrFiles"];
const POS_COLLS = ["orders","shifts","menu","config"];
/* Firestore timestamps become plain milliseconds, so the file is ordinary JSON and can be written back as it is */
const plain = v => v && typeof v === "object" ? (typeof v.toMillis === "function" ? v.toMillis() : Array.isArray(v) ? v.map(plain) : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]))) : v;
const backup = {
  ACC_COLLS, POS_COLLS,
  async dump(progress){
    const read = async name => (await F.getDocs(F.collection(fs, name))).docs.map(d => ({ id: d.id, data: plain(d.data()) }));
    const acc = {}, pos = {}; let i = 0; const all = ACC_COLLS.length + POS_COLLS.length;
    for (const c of ACC_COLLS){ acc[c] = await read(P + c); progress && progress(++i, all); }
    for (const c of POS_COLLS){ pos[c] = await read(c); progress && progress(++i, all); }
    return { format: "aqeela-full-backup", v: 1, exportedAt: new Date().toISOString(), project: firebaseConfig.projectId, by: current ? current.email : "", acc, pos };
  },
  /* the current documents, to compare with a backup before restoring */
  async current(){
    const read = async name => new Map((await F.getDocs(F.collection(fs, name))).docs.map(d => [d.id, JSON.stringify(plain(d.data()))]));
    const acc = {}, pos = {};
    for (const c of ACC_COLLS) acc[c] = await read(P + c);
    for (const c of POS_COLLS) pos[c] = await read(c);
    return { acc, pos };
  },
  /* writes only the given documents (never deletes anything), 400 per batch */
  async write(list, progress){
    let done = 0;
    for (let i = 0; i < list.length; i += 400){
      const b = F.writeBatch(fs);
      list.slice(i, i + 400).forEach(({ side, coll, id, data }) => b.set(F.doc(fs, (side === "acc" ? P : "") + coll, id), data));
      await b.commit(); done += Math.min(400, list.length - i); progress && progress(done, list.length);
    }
    return done;
  }
};

/* ---------- file downloads (reports, backups) ---------- */
const downloads = {
  async save({ filename, data, type }){
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "file";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return { ok: true };
  }
};

/* the app asks for its capabilities by name; uploads to a file store and the in-page assistant are not part of this version,
   so it falls back to compressed pictures kept in the database and hides the assistant buttons */
window.claude = {
  use: async k => k === "db" ? db : k === "user" ? userApi : k === "downloads" ? downloads : (() => { throw new Error("unavailable"); })()
};
/* the cashier's own records (orders and shifts), read-only, for the owner: the accounting program compares and imports from them */
const pos = {
  /* live: the orders whose day is from «fromDay» on, the shifts from «shFrom» on, the menu, and the daily summaries kept for the
     older days (acc_posDays). Reading only a recent window keeps the daily reads small however long the history grows. */
  watch(fromDay, shFrom, cb, onErr){
    let orders = null, shifts = null, menu = [], sums = null, sumErr = null;
    const fire = () => { if (orders && shifts && sums) cb({ orders, shifts, menu, sums, sumErr }); };
    const u1 = F.onSnapshot(F.query(F.collection(fs, "orders"), F.where("day", ">=", fromDay)), q => { orders = q.docs.map(d => ({ id: d.id, ...d.data() })); fire(); }, e => onErr && onErr(e));
    const u2 = F.onSnapshot(F.query(F.collection(fs, "shifts"), F.where("day", ">=", shFrom)), q => { shifts = q.docs.map(d => ({ id: d.id, ...d.data() })); fire(); }, e => onErr && onErr(e));
    const u3 = F.onSnapshot(F.collection(fs, "menu"), q => { menu = q.docs.map(d => ({ id: d.id, ...d.data() })); fire(); }, () => {});
    /* a missing permission here (rules not yet published) must not stop the live window: the summaries are then simply empty */
    const u4 = F.onSnapshot(F.collection(fs, P + "posDays"), q => { sums = q.docs.map(d => ({ id: d.id, ...d.data() })); sumErr = null; fire(); }, e => { sums = []; sumErr = (e && (e.code || e.message)) || "error"; fire(); });
    return () => { u1(); u2(); u3(); u4(); };
  },
  /* orders whose day is a … b+1 and shifts whose day is a−1 … b+1: every order of the business days a … b (an order after midnight
     carries the next calendar day), read once when an older period is asked for */
  async range(a, b){
    const nx = (d, k) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
    const [o, sh] = await Promise.all([
      F.getDocs(F.query(F.collection(fs, "orders"), F.where("day", ">=", a), F.where("day", "<=", nx(b, 1)))),
      F.getDocs(F.query(F.collection(fs, "shifts"), F.where("day", ">=", nx(a, -1)), F.where("day", "<=", nx(b, 1))))]);
    return { orders: o.docs.map(d => ({ id: d.id, ...d.data() })), shifts: sh.docs.map(d => ({ id: d.id, ...d.data() })) };
  },
  /* the owner's copy writes the daily summaries: {day, data} sets one, {day, data:null} removes it; «meta» is the marker doc */
  async saveSums(ops, meta){
    const all = [...ops.map(x => [x.day, x.data]), ...(meta ? [["_meta", meta]] : [])];
    for (let i = 0; i < all.length; i += 400){ const b = F.writeBatch(fs);
      all.slice(i, i + 400).forEach(([id, d]) => d ? b.set(F.doc(fs, P + "posDays", id), d) : b.delete(F.doc(fs, P + "posDays", id))); await b.commit(); }
    return all.length;
  },
  /* every order and shift, any day (for the cleanup tool) */
  async all(){
    const [o, sh] = await Promise.all([F.getDocs(F.collection(fs, "orders")), F.getDocs(F.collection(fs, "shifts"))]);
    return { orders: o.docs.map(d => ({ id: d.id, ...d.data() })), shifts: sh.docs.map(d => ({ id: d.id, ...d.data() })) };
  },
  /* delete documents of «orders» or «shifts» by id, in batches */
  async remove(coll, ids){
    if (!["orders", "shifts"].includes(coll)) throw new Error("bad collection");
    for (let i = 0; i < ids.length; i += 400){ const b = F.writeBatch(fs); ids.slice(i, i + 400).forEach(id => b.delete(F.doc(fs, coll, id))); await b.commit(); }
    return ids.length;
  }
};
/* the cashier's manager approvals (owner only): pending requests to decide, the secret behind the one-time code, and the log */
const mgr = {
  async secret(){
    const r = F.doc(fs, "config", "main"), s = await F.getDoc(r); if (!s.exists()) return null;
    let k = s.data().mgrSecret;
    if (!k){ k = [...crypto.getRandomValues(new Uint8Array(20))].map(x => x.toString(16).padStart(2, "0")).join(""); await F.setDoc(r, { mgrSecret: k }, { merge: true }); }
    return k;
  },
  watch(cb, onErr){ return F.onSnapshot(F.query(F.collection(fs, "approvals"), F.where("status", "==", "pending")), q => cb(q.docs.map(d => ({ id: d.id, ...d.data() }))), e => onErr && onErr(e)); },
  watchCfg: cb => F.onSnapshot(F.doc(fs, "config", "main"), s => cb(s.exists() ? s.data() : {}), () => {}),
  setOpen: until => F.setDoc(F.doc(fs, "config", "main"), { mgrOpenUntil: until }, { merge: true }),
  setCfg: o => F.setDoc(F.doc(fs, "config", "main"), o, { merge: true }),
  decide: (id, status, note) => F.updateDoc(F.doc(fs, "approvals", id), { status, note: note || "", decidedAt: Date.now(), decidedBy: "owner" }),
  async log(fromDay){ const q = await F.getDocs(F.query(F.collection(fs, "approvals"), F.where("day", ">=", fromDay))); return q.docs.map(d => ({ id: d.id, ...d.data() })); }
};
window.__accFb = { db, user: userApi, roleOf, ADMIN_EMAIL, pos, backup, login, reserved, mgr };

/* ---------- sign-in screen ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function loginScreen(msg){
  let el = document.getElementById("acc_login");
  if (!el){ el = document.createElement("div"); el.id = "acc_login"; document.body.appendChild(el); }
  let last = ""; try { last = localStorage.getItem("acc-last-email") || ""; } catch(e){}
  try { if (!msg && localStorage.getItem("acc-idle-out")) msg = "أُغلق البرنامج تلقائياً بعد مدة دون استخدام. سجّل الدخول من جديد."; localStorage.removeItem("acc-idle-out"); } catch(e){}
  el.innerHTML = `<form class="acc-lg" id="acc_lg_f" autocomplete="on">
      <img src="../icons/logo.png" alt="" class="acc-lg-logo">
      <h1 dir="ltr">AQ ACC</h1>
      <p class="acc-lg-sub">نظام المحاسبة والإدارة · شاورما العقيلة<br>سجّل الدخول بحسابك</p>
      ${msg ? `<div class="acc-lg-err">${esc(msg)}</div>` : ""}
      <label for="acc_em">البريد الإلكتروني</label>
      <input id="acc_em" type="email" dir="ltr" autocomplete="username" inputmode="email" required value="${esc(last)}">
      <label for="acc_pw">كلمة المرور</label>
      <input id="acc_pw" type="password" dir="ltr" autocomplete="current-password" required>
      <button type="submit" id="acc_go">دخول</button>
      <button type="button" id="acc_lg_lang" data-noi18n style="margin-top:12px;background:none;border:0;color:inherit;opacity:.75;font:inherit;font-size:14px;cursor:pointer;text-decoration:underline">${window.accLang && accLang() === "en" ? "العربية" : "English"}</button>
    </form>`;
  document.getElementById("acc_lg_lang").onclick = () => window.accSetLang && accSetLang(accLang() === "en" ? "ar" : "en");
  el.hidden = false;
  setTimeout(() => (last ? document.getElementById("acc_pw") : document.getElementById("acc_em")).focus(), 30);
  document.getElementById("acc_lg_f").onsubmit = async e => {
    e.preventDefault();
    const em = document.getElementById("acc_em").value.trim().toLowerCase(), b = document.getElementById("acc_go");
    b.disabled = true; b.textContent = "جارٍ الدخول…";
    try { await F.signInWithEmailAndPassword(auth, em, document.getElementById("acc_pw").value); try { localStorage.setItem("acc-last-email", em); } catch(e){} }
    catch(err){
      const c = err && err.code || "";
      loginScreen(c.includes("network") ? "لا يوجد اتصال بالإنترنت" : c.includes("too-many") ? "محاولات كثيرة، انتظر قليلاً ثم حاول" : "البريد أو كلمة المرور غير صحيحة");
    }
  };
}

let started = false;
F.onAuthStateChanged(auth, async u => {
  current = u;
  if (!u){ loginScreen(); return; }
  member = null;
  if (roleOf(u) === "other") member = await memberOf(u);
  if (roleOf(u) === "other"){ await F.signOut(auth); loginScreen("هذا الحساب غير مصرّح له ببرنامج المحاسبة. اطلب من المالك إضافتك إلى الفريق."); return; }
  const el = document.getElementById("acc_login"); if (el) el.hidden = true;
  /* keep a readable name for this account, shown next to every entry it makes */
  try {
    /* a name the account chose for itself (حسابي) stays; a team member's name is the one the owner gave in الفريق */
    let prev = {}; try { const s = await F.getDoc(F.doc(fs, P + "users", u.uid)); prev = s.exists() ? s.data() || {} : {}; } catch(e){}
    const name = member ? member.name || u.email : prev.nameSet && prev.name ? prev.name : roleOf(u) === "admin" ? "عاطف" : "عقيلة";
    names[u.uid] = name; profile = { ...profile, ...prev, name };
    /* this device in the account's list (حسابي ← الأجهزة): one entry per browser, its kind and when it was last used */
    const now = new Date().toISOString(), dv = { ...(prev.devices || {}) }, id = deviceId();
    dv[id] = { label: deviceLabel(), first: (dv[id] && dv[id].first) || now, last: now };
    const keep = Object.entries(dv).sort((a, b) => (b[1].last || "").localeCompare(a[1].last || "")).slice(0, 12);
    profile.devices = Object.fromEntries(keep);
    await F.setDoc(F.doc(fs, P + "users", u.uid), { name, email: u.email, role: member ? "member:" + member.role : roleOf(u), lastSeen: now, devices: profile.devices }, { merge: true });
  } catch(e){}
  if (!started){ started = true; (window.__accStart || (() => {}))(); }
});
