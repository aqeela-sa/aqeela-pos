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

const roleOf = u => !u ? null : u.email === ADMIN_EMAIL ? "admin" : STAFF_EMAILS.includes(u.email) ? "staff" : "other";

/* ---------- the database interface the app was written against ---------- */
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
    onSnapshot: (cb, err) => F.onSnapshot(r, s => cb(docSnap(s)), e => err && err(e))
  };
}
function queryApi(q){
  return {
    get: async () => qSnap(await F.getDocs(q)),
    onSnapshot: (cb, err) => F.onSnapshot(q, s => cb(qSnap(s)), e => err && err(e)),
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
let current = null;
const names = {};
const userApi = {
  id: async () => current ? current.uid : "",
  can: async () => !!current && ["admin", "staff"].includes(roleOf(current)),
  isOwner: async () => roleOf(current) === "admin",
  canEdit: async () => roleOf(current) === "admin",
  email: () => current ? current.email : "",
  role: () => roleOf(current),
  signOut: () => F.signOut(auth).then(() => location.reload()),
  async profiles(ids){
    const out = {};
    if (!Object.keys(names).length){
      try { (await F.getDocs(F.collection(fs, P + "users"))).docs.forEach(d => { names[d.id] = (d.data() || {}).name || ""; }); } catch(e){}
    }
    ids.forEach(id => { out[id] = { name: names[id] || "" }; });
    return out;
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
window.__accFb = { db, user: userApi, roleOf, ADMIN_EMAIL };

/* ---------- sign-in screen ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function loginScreen(msg){
  let el = document.getElementById("acc_login");
  if (!el){ el = document.createElement("div"); el.id = "acc_login"; document.body.appendChild(el); }
  let last = ""; try { last = localStorage.getItem("acc-last-email") || ""; } catch(e){}
  el.innerHTML = `<form class="acc-lg" id="acc_lg_f" autocomplete="on">
      <img src="../icons/logo.png" alt="" class="acc-lg-logo">
      <h1>محاسبة شاورما العقيلة</h1>
      <p class="acc-lg-sub">سجّل الدخول بحسابك</p>
      ${msg ? `<div class="acc-lg-err">${esc(msg)}</div>` : ""}
      <label for="acc_em">البريد الإلكتروني</label>
      <input id="acc_em" type="email" dir="ltr" autocomplete="username" inputmode="email" required value="${esc(last)}">
      <label for="acc_pw">كلمة المرور</label>
      <input id="acc_pw" type="password" dir="ltr" autocomplete="current-password" required>
      <button type="submit" id="acc_go">دخول</button>
    </form>`;
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
  if (roleOf(u) === "other"){ await F.signOut(auth); loginScreen("هذا الحساب غير مصرّح له ببرنامج المحاسبة."); return; }
  const el = document.getElementById("acc_login"); if (el) el.hidden = true;
  /* keep a readable name for this account, shown next to every entry it makes */
  try {
    const name = roleOf(u) === "admin" ? "عاطف" : "عقيلة";
    names[u.uid] = name;
    await F.setDoc(F.doc(fs, P + "users", u.uid), { name, email: u.email, role: roleOf(u), lastSeen: new Date().toISOString() }, { merge: true });
  } catch(e){}
  if (!started){ started = true; (window.__accStart || (() => {}))(); }
});
