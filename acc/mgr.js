/* ---------- موافقات الكاشير: the owner approves the cashier's protected actions from here ----------
   A request the cashier sends (discount, void, cash out, device settings) appears at once as a bar on every page, with
   «موافقة» / «رفض». The dashboard also shows the one-time manager code: 6 digits that change every 5 minutes, for when the shop has
   no internet (the cashier checks it on the device with the same secret). Owner only: the database lets no one else read these. */
const MGR_STEP = 300000;
async function mgrCode(secret, step){
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode("aq-mgr:" + step)));
  const off = b[b.length - 1] & 15, v = (((b[off] & 0x7f) << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]) >>> 0;
  return String(v % 1e6).padStart(6, "0");
}
const MG = { list: [], secret: null, started: false, seen: new Set(), title: "" };
const mgrFresh = () => MG.list.filter(a => Date.now() - (a.at || 0) < 15 * 60000).sort((a, b) => a.at - b.at);
function mgrStart(){
  if (MG.started || !S.isOwner || !window.__accFb || !window.__accFb.mgr) return;
  MG.started = true;
  window.__accFb.mgr.watch(L => { MG.list = L; mgrBar(); }, e => console.error("approvals", e));
  mgrSecret();
  window.__accFb.mgr.watchCfg(c => { MG.openUntil = +(c.mgrOpenUntil || 0); MG.cashOutFree = !!c.cashOutFree; mgrOpenDraw(); });
  setInterval(() => { mgrTick(); mgrBar(); mgrOpenDraw(); }, 1000);
}
setInterval(mgrStart, 1500);
/* the secret behind the code (made once, kept in the cashier's settings); asked again every 20 s until it is there */
function mgrSecret(){
  if (MG.secret || MG.asking || Date.now() - (MG.askedAt || 0) < 20000) return;
  MG.asking = true; MG.askedAt = Date.now();
  window.__accFb.mgr.secret().then(k => { MG.secret = k || null; MG.asking = false; mgrTick(); }).catch(e => { MG.asking = false; console.error("mgr secret", e); });
}
/* the bar on top of every page while a request waits */
function mgrBar(){
  const L = mgrFresh(); let el = document.getElementById("mgrbar");
  const sig = L.map(a => a.id).join(",");
  if (!L.length){ if (el) el.remove(); if (MG.title){ document.title = MG.title; MG.title = ""; } return; }
  if (!MG.title) MG.title = document.title; document.title = `(${L.length}) طلب موافقة · ${MG.title}`;
  if (L.some(a => !MG.seen.has(a.id))){ L.forEach(a => MG.seen.add(a.id)); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch(e){} }
  if (!el){ el = document.createElement("div"); el.id = "mgrbar"; document.body.appendChild(el); }
  if (el.dataset.sig === sig){ el.querySelectorAll("[data-mgage]").forEach(s => s.textContent = mgrAge(+s.dataset.mgage)); return; }
  el.dataset.sig = sig;
  el.innerHTML = L.map(a => `<div class="mg-row"><div class="mg-t"><b>طلب موافقة من الكاشير${a.test ? " (تجريبي)" : ""}</b><span>${esc(a.title || "")}</span>
      <small>${esc(a.cashierName || "")} · منذ <span data-mgage="${a.at}">${mgrAge(a.at)}</span></small></div>
      <div class="mg-a"><button class="btn" type="button" data-mgok="${esc(a.id)}" style="background:#1B7A57 !important;color:#fff">موافقة</button><button class="btn ghost" type="button" data-mgno="${esc(a.id)}">رفض</button></div></div>`).join("");
  el.querySelectorAll("[data-mgok]").forEach(b => b.onclick = () => mgrDecide(b.dataset.mgok, "approved"));
  el.querySelectorAll("[data-mgno]").forEach(b => b.onclick = () => { const note = prompt("سبب الرفض (اختياري، يظهر للكاشير)") ; if (note === null) return; mgrDecide(b.dataset.mgno, "rejected", note); });
}
const mgrAge = t => { const s = Math.max(0, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s} ث` : `${Math.floor(s / 60)} د`; };
async function mgrDecide(id, status, note){
  try { await window.__accFb.mgr.decide(id, status, note); toast(status === "approved" ? "تمت الموافقة، وصل القرار للكاشير" : "رُفض الطلب"); }
  catch(e){ toast("تعذّر إرسال القرار: " + (e.code || e.message)); }
}
/* the one-time code card (dashboard) */
function mgrCard(){
  if (!S.isOwner) return "";
  return `<div class="card" id="mgrcard" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
    <div><h3 style="margin:0 0 4px;font-size:16px">رمز المدير المؤقت للكاشير</h3><p class="small muted" style="margin:0">أعطه للكاشير عند الحاجة لموافقتك وأنت بعيد، حتى لو انقطع الإنترنت في المحل. يُستخدم مرة واحدة، ويتغير كل 5 دقائق.</p></div>
    <div style="text-align:center"><div class="num" id="mgcode" style="font-size:32px;font-weight:800;letter-spacing:4px;direction:ltr">${MG.secret ? "······" : "—"}</div><div class="small muted" id="mgleft"></div>
    <button class="btn ghost sm" type="button" id="mgcopy" style="margin-top:4px">نسخ</button></div>
    <div id="mgopen" style="flex-basis:100%;border-top:1px solid var(--line,#e7e7eb);padding-top:10px"></div></div>`;
}
async function mgrTick(){
  const c = document.getElementById("mgcode"); if (!c) return; if (!MG.secret){ mgrSecret(); return; }
  const now = Date.now(), st = Math.floor(now / MGR_STEP), code = await mgrCode(MG.secret, st), left = Math.ceil(((st + 1) * MGR_STEP - now) / 1000);
  c.textContent = code; const l = document.getElementById("mgleft"); if (l) l.textContent = `يتغير بعد ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const b = document.getElementById("mgcopy"); if (b && !b.onclick) b.onclick = async () => { try { await navigator.clipboard.writeText(c.textContent); toast("نُسخ الرمز"); } catch(e){ toast("لم يُنسخ الرمز"); } };
}

/* صلاحيات التدريب: the owner opens discount, void and cash out on the cashier for a while, without a code (each still logged) */
function mgrOpenDraw(){
  const el = document.getElementById("mgopen"); if (!el) return;
  const on = (MG.openUntil || 0) > Date.now(), sig = (on ? "on" + MG.openUntil : "off") + "|" + (MG.cashOutFree ? 1 : 0);
  if (el.dataset.sig === sig){ const l = el.querySelector("[data-left]"); if (l) l.textContent = mgrLeft(MG.openUntil); return; }
  el.dataset.sig = sig;
  el.innerHTML = `<div class="actions" style="justify-content:space-between;flex-wrap:wrap;align-items:center;gap:8px">
      <span><b${on ? ' style="color:#B26A00"' : ""}>صلاحيات التدريب ${on ? "مفتوحة" : ""}</b> <span class="small muted">${on ? `الخصم والإلغاء والصرف من الدرج بدون رمز · <span data-left>${mgrLeft(MG.openUntil)}</span>` : "مغلقة: الخصم والإلغاء والصرف تحتاج موافقتك"}</span></span>
      ${on ? `<button class="btn sm" type="button" id="mgclose" style="background:var(--bad,#C62828) !important;color:#fff">إغلاق الصلاحيات الآن</button>`
        : `<span class="actions" style="gap:6px;flex-wrap:wrap"><button class="btn sm" type="button" data-mgopen="forever">فتح حتى أغلقها</button><span class="small muted">أو لمدة:</span><button class="btn ghost sm" type="button" data-mgopen="1">ساعة</button><button class="btn ghost sm" type="button" data-mgopen="day">حتى نهاية اليوم</button></span>`}</div>
    <div class="actions" style="justify-content:space-between;flex-wrap:wrap;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid #eee">
      <span><b>الصرف من الدرج بدون رمز</b> <span class="small muted">${MG.cashOutFree ? "مفتوح: يصرف الكاشير ويكتب السبب، ويظهر الصرف في تقرير الوردية وفي «درج الكاشير»" : "مغلق: الصرف يحتاج رمزك أو موافقتك"}</span></span>
      <button class="btn sm ${MG.cashOutFree ? "" : "ghost"}" type="button" id="mgcof" style="min-width:110px${MG.cashOutFree ? ";background:#2E7D32 !important;color:#fff" : ""}">${MG.cashOutFree ? "مفتوح · إغلاق" : "مغلق · فتح"}</button></div>`;
  const f = document.getElementById("mgcof");
  if (f) f.onclick = async () => { const v = !MG.cashOutFree; f.disabled = true;
    try { await window.__accFb.mgr.setCfg({ cashOutFree: v }); toast(v ? "صار الصرف من الدرج بدون رمز" : "عاد الصرف من الدرج يحتاج موافقتك"); } catch(e){ f.disabled = false; toast("تعذّر الحفظ: " + (e.code || e.message)); } };
  el.querySelectorAll("[data-mgopen]").forEach(b => b.onclick = async () => {
    const v = b.dataset.mgopen, now = new Date(); let until;
    if (v === "forever") until = MGR_FOREVER;
    else if (v === "day"){ const e = new Date(now); e.setHours(28, 0, 0, 0); until = e.getTime(); }   /* the business day ends at 4 am */
    else until = Date.now() + (+v) * 36e5;
    try { await window.__accFb.mgr.setOpen(until); toast("فُتحت صلاحيات التدريب على الكاشير"); } catch(e){ toast("تعذّر الحفظ: " + (e.code || e.message)); } });
  const c = document.getElementById("mgclose");
  if (c) c.onclick = async () => { try { await window.__accFb.mgr.setOpen(0); toast("أُغلقت الصلاحيات، وعاد الكاشير يحتاج موافقتك"); } catch(e){ toast("تعذّر الحفظ: " + (e.code || e.message)); } };
}
/* «until I close it»: 1/1/2100, so the cashier's check (until > now) needs no change */
const MGR_FOREVER = 4102444800000;
const mgrLeft = t => { if (t >= MGR_FOREVER) return "حتى تغلقها"; const m = Math.max(0, Math.round((t - Date.now()) / 60000)), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  return "باقٍ " + (d ? `${d} يوم ` : "") + (d || h ? `${h} س ` : "") + `${mm} د`; };
