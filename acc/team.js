/* ---------- الفريق: حسابات الموظفين وأدوارهم ومساحات عملهم ----------
   Each member signs in to this same program with an own e-mail and password, and lands on the page of the role:
   the operations manager / chef on «التشغيل اليومي», the purchasing officer on «المشتريات». The owner keeps the team in
   settings.team = {"<email with , for .>": {email, name, role, views:[pages], emp:"<custody holder>", off, addedAt}} (a dot cannot sit
   safely in a map key, so «a.b@x.com» is kept under «a,b@x,com»); the database rules read the
   same map, so a page that is not granted stays closed at the data, not only on screen. A purchase request then moves between them:
   the kitchen raises it → the owner approves (and the partner above the second limit) → the buyer sends it and records the
   invoice from his custody → the kitchen confirms what arrived. Ordered, received and invoiced quantities are compared (three-way match). */

const TEAM_ROLES = {
  ops:{l:"مدير التشغيل / الشيف", home:"ops", views:["ops","kitchen"],
    d:"صفحته «التشغيل اليومي»: جرد المكونات، دفعات التحضير، استلام البضاعة من المشتري، ورفع طلبات الشراء بالنواقص."},
  buyer:{l:"مسؤول المشتريات", home:"buy", views:["buy","invoices","suppliers","custody"],
    d:"صفحته «المشتريات»: الطلبات المعتمدة، إرسالها للمورد، وتسجيل الفاتورة من عهدته، ورصيد عهدته."},
  accountant:{l:"محاسب / مدخل بيانات", home:"guide", views:["guide","daily","sales","invoices","suppliers","custody","recon"],
    d:"صفحته «دليل العمل اليومي»: المبيعات والفواتير والعهد والمطابقة، مثل حساب الإدخال الحالي."},
  partner:{l:"شريك (اطلاع واعتماد)", home:"dashboard", views:null,
    d:"يرى كل الصفحات دون تعديل، ويوافق على طلبات الشراء فوق حد قرار الشريكين بعد اعتماد المالك."}
};
const ACC_URL = "https://aqeela-sa.github.io/aqeela-pos/acc/";
const teamKey = em => String(em || "").trim().toLowerCase().replace(/\./g, ",");
const teamAll = () => { const T = S.settings && S.settings.team; return T && typeof T === "object" && !Array.isArray(T) ? T : {}; };
/* the signed-in member (not the owner, not the original data-entry account): the live entry once settings arrived, else the one read at sign-in */
function teamMe(){
  if (S.canEdit || S.legacy || !S.email) return null;
  const T = S.settings && S.settings.team;
  if (T && typeof T === "object"){ const m = T[teamKey(S.email)]; return m && m.role && !m.off ? m : null; }
  return S.member0 || null;
}
const isPartnerU = () => { const m = teamMe(); return !!(m && m.role === "partner"); };
const hasPartner = () => Object.values(teamAll()).some(m => m && m.role === "partner" && !m.off);
const memberHome = m => (m && TEAM_ROLES[m.role] && TEAM_ROLES[m.role].home) || "guide";
const memberViews = m => { if (!m) return [];
  if (m.role === "partner") return STAFF_PAGES.map(p => p[0]).filter(k => k !== "setup");
  return Array.isArray(m.views) ? m.views : ((TEAM_ROLES[m.role] || {}).views || []); };
const teamName = () => { const m = teamMe(); return m ? m.name || "" : ""; };
const teamBuyer = () => { const m = teamMe(); return m ? (m.emp || m.name || "") : ""; };
/* a member taken off the team (or switched off) loses the data at once by the rules; the screen follows */
function teamWatch(){
  if (S.canEdit || S.legacy || !S.email || S.teamGone) return;
  const T = S.settings && S.settings.team;
  if (T && typeof T === "object" && !teamMe()){ S.teamGone = true; toast("أُوقف حسابك في البرنامج. تواصل مع المالك.");
    setTimeout(() => window.__accFb && window.__accFb.user.signOut(), 1800); }
}

/* ================= owner: settings ← الفريق ================= */
function teamCard(){
  if (!S.canEdit) return "";
  const T = Object.entries(teamAll()).sort((a, b) => (a[1].name || "").localeCompare(b[1].name || ""));   // [key, member]
  return `<div class="card" id="tm_card"><div class="actions" style="justify-content:space-between"><h3 style="margin:0">الفريق والحسابات</h3><button class="btn" type="button" id="tm_add">+ إضافة عضو</button></div>
    <p class="small muted" style="margin:6px 0 12px">لكل موظف حساب دخول باسمه على رابط البرنامج نفسه، ويفتح على صفحة دوره بما يخصه فقط. الصفحات غير المسموحة مغلقة في قاعدة البيانات نفسها، لا على الشاشة فقط. يسري أي تغيير فوراً بعد الحفظ.</p>
    <div class="tw"><table><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الصفحات</th><th>العهدة باسم</th><th>الحالة</th></tr></thead><tbody>
    <tr><td><b>حساب الإدخال الأساسي</b></td><td class="small muted" dir="ltr">—</td><td>محاسب / مدخل بيانات</td><td class="small muted" colspan="3">صلاحياته من بطاقة «صلاحيات الموظفين» أدناه</td></tr>
    ${T.map(([k, m]) => `<tr class="click" data-tm="${esc(k)}"><td><b>${esc(m.name || "—")}</b></td><td class="small" dir="ltr">${esc(m.email || k)}</td><td>${esc((TEAM_ROLES[m.role] || {}).l || m.role)}</td>
      <td class="small">${m.role === "partner" ? "كل الصفحات (اطلاع)" : memberViews(m).map(k => (STAFF_PAGES.find(p => p[0] === k) || [k, k])[1]).join("، ")}</td><td>${esc(m.emp || "—")}</td>
      <td>${m.off ? `<span class="pill bad">موقوف</span>` : `<span class="pill ok">فعّال</span>`}</td></tr>`).join("")}</tbody></table></div>
    ${T.length ? "" : `<p class="small muted" style="margin:8px 0 0">ابدأ بمدير التشغيل (الشيف) ومسؤول المشتريات. الشريك اختياري: إذا أضفته صار اعتماد الطلبات الكبيرة بتوقيعين.</p>`}</div>`;
}
function bindTeamCard(){
  if ($("#tm_add")) $("#tm_add").onclick = () => teamOpen();
  document.querySelectorAll("[data-tm]").forEach(tr => tr.onclick = () => teamOpen(tr.dataset.tm));
}
const teamPw = () => { const a = "abcdefghjkmnpqrstuvwxyz", d = "23456789", r = k => k[Math.floor(Math.random() * k.length)];
  return r("ABCDEFGHJKLMNPQRSTUVWXYZ") + Array.from({length:5}, () => r(a)).join("") + r(d) + r(d); };
function teamOpen(key){
  const x = key ? teamAll()[key] : null, em = x ? x.email || key : "", role0 = x ? x.role : "ops", pw = teamPw();
  const emps = [...new Set([...(S.settings.employees || []), ...custodyBalances().map(c => c.name)])].filter(Boolean);
  $("#sheet").innerHTML = `<form class="entry" id="ftm"><h3 style="margin:0">${x ? "تعديل عضو" : "عضو جديد في الفريق"}</h3>
    <div class="grid g2"><div class="f"><label for="tm_n">الاسم</label><input id="tm_n" required value="${esc(x ? x.name || "" : "")}" placeholder="مثل: الشيف محمد"></div>
      <div class="f"><label for="tm_e">البريد الإلكتروني (للدخول)</label><input id="tm_e" type="email" dir="ltr" required ${x ? "readonly" : ""} value="${esc(em || "")}" placeholder="name@example.com"></div>
      <div class="f"><label for="tm_r">الدور</label><select id="tm_r">${Object.entries(TEAM_ROLES).map(([k, r]) => `<option value="${k}" ${k === role0 ? "selected" : ""}>${r.l}</option>`).join("")}</select></div>
      <div class="f"><label for="tm_c">العهدة باسم <span class="muted" style="font-weight:400">(للمشتري)</span></label><input id="tm_c" list="tm_emps" value="${esc(x ? x.emp || "" : "")}" placeholder="اسمه في صفحة العهد"><datalist id="tm_emps">${emps.map(e => `<option value="${esc(e)}">`).join("")}</datalist></div></div>
    <p class="small muted" id="tm_rd" style="margin:0"></p>
    <div id="tm_vw"></div>
    ${x ? `<label class="tag" for="tm_off"><input type="checkbox" id="tm_off" ${x.off ? "checked" : ""}> إيقاف الحساب مؤقتاً</label>`
      : `<div class="sp-box"><div class="sp-head"><b>حساب الدخول</b><span class="small muted">يُنشأ الآن بكلمة مرور مؤقتة ترسلها له، ويغيّرها من رابط «نسيت كلمة المرور» إن شاء</span></div>
        <div class="grid g2"><div class="f"><label for="tm_p">كلمة المرور المؤقتة</label><input id="tm_p" dir="ltr" value="${pw}" minlength="6" required></div>
        <div class="f"><label class="tag" for="tm_mk" style="margin-top:22px"><input type="checkbox" id="tm_mk" checked> إنشاء حساب الدخول الآن</label></div></div></div>`}
    <div id="tm_out"></div>
    <div class="actions"><button class="btn" type="submit" id="tm_save">${x ? "حفظ" : "إضافة"}</button><button class="btn ghost" type="button" id="tm_x">إغلاق</button>
      ${x ? `<button class="btn ghost sm" type="button" id="tm_rs">إرسال رابط تعيين كلمة مرور لبريده</button><button class="btn danger sm" type="button" id="tm_del">حذف من الفريق</button>` : ""}</div></form>`;
  $("#modal").classList.add("open"); $("#tm_x").onclick = closeModal;
  let views = new Set(x ? memberViews(x) : TEAM_ROLES[role0].views);
  const draw = () => { const r = $("#tm_r").value; $("#tm_rd").textContent = TEAM_ROLES[r].d;
    $("#tm_vw").innerHTML = r === "partner" ? `<p class="small" style="margin:0">الشريك يرى كل الصفحات للاطلاع، ولا يعدّل شيئاً.</p>`
      : `<p class="small" style="margin:0 0 6px;font-weight:700">الصفحات المسموحة</p><div class="actions" style="flex-wrap:wrap">${STAFF_PAGES.filter(p => p[0] !== "setup").map(([k, l]) => `<label class="tag" for="tmv_${k}"><input type="checkbox" id="tmv_${k}" data-tmv="${k}" ${views.has(k) ? "checked" : ""} ${k === TEAM_ROLES[r].home ? "disabled" : ""}> ${l}</label>`).join("")}</div>`;
    document.querySelectorAll("[data-tmv]").forEach(c => c.onchange = () => { c.checked ? views.add(c.dataset.tmv) : views.delete(c.dataset.tmv); }); };
  $("#tm_r").onchange = () => { views = new Set(TEAM_ROLES[$("#tm_r").value].views || []); draw(); }; draw();
  const saveTeam = async T => { const base = {...S.settings}; delete base.id; const ok = await write(() => setSettingsDoc({...base, team:T, ...stamp()}), ""); if (ok) S.settings.team = T; return ok; };
  if ($("#tm_del")) armDelete($("#tm_del"), async () => { const T = {...teamAll()}; delete T[key]; if (await saveTeam(T)){ toast("حُذف من الفريق، وأُغلق دخوله للبرنامج"); closeModal(); render(); } }, "اضغط مرة أخرى للحذف");
  if ($("#tm_rs")) $("#tm_rs").onclick = async () => { const r = await window.__accFb.login.reset(em);
    toast(r.ok ? "أُرسل رابط تعيين كلمة المرور إلى بريده" : "تعذّر الإرسال: " + r.code); };
  $("#ftm").onsubmit = async e => { e.preventDefault();
    const mail = $("#tm_e").value.trim().toLowerCase(), r = $("#tm_r").value, name = normName($("#tm_n").value);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){ toast("البريد غير صحيح"); return; }
    if (!x && (teamAll()[teamKey(mail)] || (window.__accFb && window.__accFb.reserved(mail)))){ toast("هذا البريد مستخدم لحساب آخر في البرنامج"); return; }
    const home = TEAM_ROLES[r].home, entry = {email:mail, name, role:r, views: r === "partner" ? [] : [home, ...[...views].filter(k => k !== home)], emp:normName($("#tm_c").value), off: x ? $("#tm_off").checked : false, addedAt: x ? x.addedAt || "" : new Date().toISOString()};
    $("#tm_save").disabled = true;
    let made = null;
    if (!x && $("#tm_mk").checked){ const pw = $("#tm_p").value; if (pw.length < 6){ toast("كلمة المرور 6 أحرف على الأقل"); $("#tm_save").disabled = false; return; }
      made = await window.__accFb.login.create(mail, pw); made.pw = pw; }
    if (!(await saveTeam({...teamAll(), [x ? key : teamKey(mail)]: entry}))){ $("#tm_save").disabled = false; return; }
    toast(x ? "تم الحفظ" : "أُضيف إلى الفريق");
    if (x){ closeModal(); render(); return; }
    const msg = `السلام عليكم ${name}،\nتم إنشاء حسابك في برنامج ${S.settings.brandName || "شاورما العقيلة"} (${TEAM_ROLES[r].l}).\nالرابط: ${ACC_URL}\nالبريد: ${mail}\nكلمة المرور: ${made ? made.pw : "(كلمة مرور حسابك الحالية)"}\nاحفظ الرابط على الشاشة الرئيسية لجوالك.`;
    const state = !made ? `<div class="note">أُضيف إلى الفريق دون إنشاء حساب دخول. أنشئه من Firebase ← Authentication ← Users ← Add user بنفس البريد.</div>`
      : made.ok ? `<div class="note ok">أُنشئ حساب الدخول. أرسل له هذه الرسالة:</div>`
      : made.code === "EMAIL_EXISTS" ? `<div class="note">البريد له حساب دخول من قبل، فيدخل بكلمة مروره الحالية (أو أرسل له رابط تعيين كلمة مرور من «تعديل»).</div>`
      : /ADMIN_ONLY|OPERATION_NOT_ALLOWED/.test(made.code) ? `<div class="note warn">أُضيف إلى الفريق، لكن إنشاء الحسابات من البرنامج مغلق في Firebase. أنشئ حسابه مرة واحدة من Firebase ← Authentication ← Users ← <b>Add user</b> بالبريد <b dir="ltr">${esc(mail)}</b> وكلمة المرور <b dir="ltr">${esc(made.pw)}</b>، ثم أرسل له الرسالة.</div>`
      : `<div class="note warn">أُضيف إلى الفريق، وتعذّر إنشاء حساب الدخول (${esc(made.code)}). أنشئه من Firebase ← Authentication ← Users ← Add user.</div>`;
    $("#tm_out").innerHTML = `${state}<textarea readonly rows="6" style="width:100%;margin-top:8px">${esc(msg)}</textarea>
      <div class="actions"><button class="btn" type="button" id="tm_cp">نسخ الرسالة</button><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">إرسال واتساب</a></div>`;
    $("#tm_save").hidden = true;
    $("#tm_cp").onclick = async () => { try { await navigator.clipboard.writeText(msg); toast("نُسخت الرسالة"); } catch(e){ toast("لم يُنسخ النص"); } };
    $("#tm_x").onclick = () => { closeModal(); render(); };
  };
}

/* ================= purchase-request flow shared by the workspaces ================= */
const poRecvd = p => !!(p && p.recv && p.recv.at);
/* requests the buyer may act on: approved (or under the limit), not cancelled, not yet invoiced */
const poToBuy = () => poAll().filter(p => poOpen(p) && poOk(p) && !p.invId);
const poWaiting = () => poAll().filter(p => p.status === "pending" && !poOk(p));
/* deliveries the kitchen has not confirmed: sent or invoiced, within the last 30 days */
const poToReceive = () => poAll().filter(p => !p.deleted && !poRecvd(p) && (p.status === "ordered" || p.status === "received") && (p.date || "") >= addDays(today(), -30));
/* the three quantities of a line: ordered, received by the kitchen, invoiced */
function poMatch(p){
  const inv = p.invId ? (S.invoices || []).find(v => v.id === p.invId && !v.deleted) : null, R = (p.recv && p.recv.lines) || [];
  const ids = [...new Set([...(p.lines || []).map(l => l.ing), ...R.map(l => l.ing), ...(inv ? (inv.items || []).map(i => i.ing) : [])])];
  return ids.map(ing => ({ing, ord: sumBy((p.lines || []).filter(l => l.ing === ing), l => n(l.q)), got: poRecvd(p) ? sumBy(R.filter(l => l.ing === ing), l => n(l.q)) : null,
    inv: inv && (inv.items || []).length ? sumBy(inv.items.filter(i => i.ing === ing), i => n(i.q)) : null}));
}
/* a received request whose invoice bills more than the kitchen confirmed */
const poShort = p => poRecvd(p) && poMatch(p).some(r => r.inv != null && r.got != null && r.inv - r.got > 1e-6);
function poReceive(id){
  const p = (S.purchaseOrders || []).find(x => x.id === id); if (!p) return;
  const L = (p.lines || []).map(l => ({ing:l.ing, q:l.q, got: poRecvd(p) ? sumBy(p.recv.lines.filter(r => r.ing === l.ing), r => n(r.q)) : l.q}));
  $("#sheet").innerHTML = `<form class="entry" id="frv"><h3 style="margin:0">استلام طلب رقم <span class="num">${esc(String(p.no))}</span></h3>
    <p class="small muted" style="margin:0">${esc(p.supplier || "")}${p.buyer ? " · المشتري: " + esc(p.buyer) : ""}. زِن أو عُدّ ما وصل فعلاً، واكتب الكمية المستلمة لكل صنف.</p>
    <div class="tw"><table><thead><tr><th>المكوّن</th><th class="n">المطلوب</th><th>المستلم فعلاً</th></tr></thead><tbody>
    ${L.map((l, i) => { const g = ktIng(l.ing); return `<tr><td><b>${esc(g ? g.name : "—")}</b></td><td class="n num">${ktQ(l.q)} <small class="muted">${esc(g ? g.unit || "" : "")}</small></td>
      <td><input data-rvq="${i}" type="number" step="0.001" min="0" inputmode="decimal" value="${l.got}" style="max-width:110px" aria-label="المستلم"></td></tr>`; }).join("")}</tbody></table></div>
    <div class="f"><label for="rv_n">ملاحظات الاستلام <span class="muted" style="font-weight:400">(جودة، تالف، ناقص…)</span></label><input id="rv_n" value="${esc(p.recv ? p.recv.notes || "" : "")}"></div>
    <div class="actions"><button class="btn" type="submit" style="background:#1B7A57">تأكيد الاستلام</button><button class="btn ghost" type="button" id="rv_x">إغلاق</button></div></form>`;
  $("#modal").classList.add("open"); $("#rv_x").onclick = closeModal;
  $("#frv").onsubmit = async e => { e.preventDefault();
    const lines = L.map((l, i) => ({ing:l.ing, q:Math.round(n(document.querySelector(`[data-rvq="${i}"]`).value) * 1000) / 1000}));
    const recv = {at:new Date().toISOString(), by:S.uid || "", name: teamName() || (S.canEdit ? "المالك" : ""), lines, notes:$("#rv_n").value.trim()};
    const p2 = {...strip(p), recv, status: p.status === "pending" ? "ordered" : p.status};
    if (await recWrite("purchaseOrders", id, p2, null, "تم تأكيد الاستلام")) closeModal(); };
}
async function poMakeFrom(rows, buyer, note){
  const by = new Map(); for (const r of rows){ const s = supKey(r.sup || ""); (by.get(s) || by.set(s, []).get(s)).push({ing:r.g.id, q:Math.round(n(r.q) * 1000) / 1000, p:Math.round(r.p * 1000) / 1000}); }
  let k = 0, no = Math.max(0, ...(S.raw.purchaseOrders || []).map(p => n(p.no)));
  for (const [sup, lines] of by)
    if (await recWrite("purchaseOrders", null, {no: ++no, date: today(), supplier: sup === "بدون مورد" ? "" : sup, buyer: buyerCanon(buyer || ""), lines, est: poEst(lines), notes: note || "", status:"pending", approvedBy:"", partnerOk:"", invId:"", raisedBy: teamName() || ""}, "create", "")) k++;
  return k;
}
const poCard = (p, acts) => { const G = (p.lines || []).map(l => { const g = ktIng(l.ing); return `${esc(g ? g.name : "—")} <span class="num">${ktQ(l.q)}</span> ${esc(g ? g.unit || "" : "")}`; }).join(" · ");
  return `<div class="card" style="margin-bottom:10px"><div class="actions" style="justify-content:space-between;flex-wrap:wrap"><b>طلب <span class="num">${esc(String(p.no))}</span> · ${esc(p.supplier || "بدون مورد")}</b>${poChip(p)}</div>
    <p class="small" style="margin:6px 0">${G || "—"}</p><p class="small muted" style="margin:0 0 8px"><span class="num">${dmy(p.date)}</span> · التقدير <b class="num">${fmt(p.est)}</b>${p.raisedBy ? ` · طلبه ${esc(p.raisedBy)}` : ""}${p.buyer ? ` · المشتري ${esc(p.buyer)}` : ""}${poRecvd(p) ? ` · <span style="color:#1B7A57">استلمه المطبخ ${esc(p.recv.name || "")}</span>` : ""}</p>
    <div class="actions" style="flex-wrap:wrap">${acts}<button class="btn ghost sm" type="button" data-wpo="${esc(p.id)}">التفاصيل</button></div></div>`; };
const wsHead = (title, sub) => `<div class="bar"><h2>${title}</h2><div class="actions"><span class="small muted">${dayName(today())} <span class="num">${dmy(today())}</span>${teamName() ? " · " + esc(teamName()) : ""}</span>${S.canEdit ? "" : `<button class="btn ghost sm" type="button" id="ws_out">خروج</button>`}</div></div>${sub || ""}${readonlyNote()}<div id="list"></div>`;
const wsTask = (done, title, body) => `<div class="card" style="margin-bottom:12px;border-inline-start:4px solid ${done ? "#1B7A57" : "#B26A00"}"><div class="actions" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0;font-size:16px">${done ? "✓ " : ""}${title}</h3></div>${body}</div>`;
function wsBindCommon(el){
  el.querySelectorAll("[data-wpo]").forEach(b => b.onclick = () => poOpenOrder(b.dataset.wpo));
  el.querySelectorAll("[data-wrv]").forEach(b => b.onclick = () => poReceive(b.dataset.wrv));
}

/* ================= التشغيل اليومي: مدير التشغيل / الشيف ================= */
function viewOps(){ return wsHead("التشغيل اليومي"); }
function bindOps(){ if ($("#ws_out")) $("#ws_out").onclick = () => window.__accFb && window.__accFb.user.signOut(); }
function renderOps(){
  const el = $("#list"); if (!el) return;
  if (!(S.ingredients || []).length){ el.innerHTML = `<div class="empty card">لم تُعرَّف المكونات والوصفات بعد. يجهزها المالك من «الوصفات والمخزون»، ثم تظهر هنا مهامك اليومية.</div>`; return; }
  if (!S.pos || !S.pos.ready){ el.innerHTML = '<div class="empty card">جارٍ تحميل بيانات الكاشير…</div>'; return; }
  const t = today(); if (ktNeedOld(addDays(t, -28), el, renderOps)) return;
  const cnt = (S.ingCounts || []).filter(c => !c.deleted && c.date === t), last = ktCounts().filter(c => !c.deleted).pop();
  const P = (S.ingredients || []).filter(ktIsPrep), B = (S.batches || []).filter(b => !b.deleted && b.date === t);
  const rec = poToReceive(), sug = poSuggest().filter(r => r.q > 0), mine = poAll().filter(p => !p.deleted && (p.date || "") >= addDays(t, -7)).slice(0, 8);
  const y = addDays(t, -1), use = ktCons(y, y), top = [...use.use].map(([k, v]) => ({g: ktIng(k), v})).filter(r => r.g).sort((a, b) => b.v * ktPrice(b.g) - a.v * ktPrice(a.g)).slice(0, 8);
  /* the quantities follow the suggestion (a new count changes it) until the chef types his own */
  S.opsPick = S.opsPick || {}; sug.forEach(r => { const k = S.opsPick[r.g.id]; if (!k || !k.ed) S.opsPick[r.g.id] = {on: k ? k.on : true, q:r.q}; });
  el.innerHTML = `
    ${wsTask(cnt.length > 0, "جرد المكونات", `<p class="small muted" style="margin:6px 0">${cnt.length ? "سُجّل جرد اليوم. يمكنك تعديله إن لزم." : `عُدّ المكونات في نهاية اليوم وسجّلها. ${last ? `آخر جرد: <span class="num">${dmy(last.date)}</span>` : "لا يوجد جرد بعد."}`}</p>
      <div class="actions">${S.canWrite ? `<button class="btn${cnt.length ? " ghost" : ""}" type="button" id="op_cnt">${cnt.length ? "تعديل جرد اليوم" : "تسجيل الجرد"}</button>` : ""}</div>`)}
    ${P.length ? wsTask(B.length > 0, "دفعات التحضير", `<p class="small muted" style="margin:6px 0">سجّل وزن كل دفعة قبل وبعد (التتبيل، ثم الشوي)، ليظهر الفقد الحقيقي مقابل المعيار.</p>
      ${B.length ? `<div class="tw"><table><thead><tr><th>المحضّر</th><th class="n">الداخل</th><th class="n">الناتج</th><th class="n">الناتج %</th><th class="n">المعيار</th></tr></thead><tbody>${B.map(b => { const g = ktIng(b.ing), s = g ? ktStdYield(g) : null, yy = n(b.inW) ? n(b.outW) / n(b.inW) : null;
        return `<tr class="click" data-opb="${esc(b.id)}"><td>${esc(g ? g.name : "—")}</td><td class="n num">${ktQ(b.inW)}</td><td class="n num">${ktQ(b.outW)}</td><td class="n"><b class="num" style="color:${s != null && yy != null && yy < s - 0.02 ? "var(--bad,#C62828)" : "inherit"}">${yy == null ? "—" : pct(yy)}</b></td><td class="n num">${s == null ? "—" : pct(s)}</td></tr>`; }).join("")}</tbody></table></div>` : ""}
      <div class="actions">${S.canWrite ? `<button class="btn${B.length ? " ghost" : ""}" type="button" id="op_bt">تسجيل دفعة</button>` : ""}</div>`) : ""}
    ${wsTask(!rec.length, `استلام البضاعة${rec.length ? ` <span class="pill warn">${rec.length}</span>` : ""}`, rec.length ? `<p class="small muted" style="margin:6px 0">عند وصول المشتري بالبضاعة: زِنها وأكّد الكمية المستلمة. يقارنها البرنامج بالمطلوب وبالفاتورة.</p>${rec.map(p => poCard(p, S.canWrite ? `<button class="btn sm" type="button" data-wrv="${esc(p.id)}" style="background:#1B7A57">استلام</button>` : "")).join("")}` : `<p class="small muted" style="margin:6px 0">لا توجد بضاعة بانتظار الاستلام.</p>`)}
    ${wsTask(!sug.length, "النواقص وطلب الشراء", sug.length ? `<p class="small muted" style="margin:6px 0">حسب الرصيد بعد الجرد، والمتوقع بيعه في الأيام القادمة، والحد الأدنى، وما هو مطلوب أصلاً.</p>
      <div class="tw"><table><thead><tr><th></th><th>المكوّن</th><th class="n">الرصيد</th><th class="n">المتوقع</th><th>الكمية</th></tr></thead><tbody>
      ${sug.map(r => `<tr><td><input type="checkbox" data-opn="${esc(r.g.id)}" ${S.opsPick[r.g.id].on ? "checked" : ""} aria-label="اختيار"></td><td><b>${esc(r.g.name)}</b></td><td class="n num">${r.noCount ? "—" : ktQ(r.have)}</td><td class="n num">${ktQ(r.fc)}</td>
        <td><input data-opq="${esc(r.g.id)}" type="number" step="0.001" min="0" inputmode="decimal" value="${S.opsPick[r.g.id].q}" style="max-width:100px"> <small class="muted">${esc(r.g.unit || "")}</small></td></tr>`).join("")}</tbody></table></div>
      <div class="f"><label for="op_note">ملاحظة للمشتري</label><input id="op_note" placeholder="اختياري"></div>
      <div class="actions">${S.canWrite ? `<button class="btn" type="button" id="op_po">رفع طلب الشراء</button>` : ""}<span class="small muted">يُرسل للاعتماد ثم للمشتري، طلب لكل مورد</span></div>` : `<p class="small muted" style="margin:6px 0">المخزون يكفي حسب آخر جرد والمبيعات المتوقعة.</p>`)}
    <h3 style="margin:16px 0 8px;font-size:16px">طلبات الشراء (آخر 7 أيام)</h3>
    ${mine.length ? mine.map(p => poCard(p, "")).join("") : `<div class="empty card">لا توجد طلبات</div>`}
    ${top.length ? `<h3 style="margin:16px 0 8px;font-size:16px">استهلاك أمس حسب المبيعات <span class="small muted">(${dmy(y)})</span></h3>
      <div class="card tw"><table><thead><tr><th>المكوّن</th><th class="n">الكمية</th></tr></thead><tbody>${top.map(r => `<tr><td>${esc(r.g.name)}</td><td class="n num">${ktQ(r.v)} <small class="muted">${esc(r.g.unit || "")}</small></td></tr>`).join("")}</tbody></table></div>` : ""}`;
  wsBindCommon(el);
  if ($("#op_cnt")) $("#op_cnt").onclick = () => ktOpenCount(cnt.length ? cnt[cnt.length - 1].id : undefined);
  if ($("#op_bt")) $("#op_bt").onclick = () => ktOpenBatch();
  el.querySelectorAll("[data-opb]").forEach(tr => tr.onclick = () => ktOpenBatch(tr.dataset.opb));
  el.querySelectorAll("[data-opn]").forEach(c => c.onchange = () => { S.opsPick[c.dataset.opn].on = c.checked; });
  el.querySelectorAll("[data-opq]").forEach(c => c.onchange = () => { S.opsPick[c.dataset.opq] = {q: n(c.value), on: n(c.value) > 0, ed: true}; });
  if ($("#op_note")){ $("#op_note").value = S.opsNote || ""; $("#op_note").oninput = () => { S.opsNote = $("#op_note").value; }; }
  if ($("#op_po")) $("#op_po").onclick = async () => {
    const rows = sug.filter(r => S.opsPick[r.g.id].on && n(S.opsPick[r.g.id].q) > 0).map(r => ({...r, q: S.opsPick[r.g.id].q}));
    if (!rows.length){ toast("اختر صنفاً واحداً على الأقل بكمية"); return; }
    $("#op_po").disabled = true; const k = await poMakeFrom(rows, "", $("#op_note").value.trim()); S.opsPick = {}; S.opsNote = "";
    toast(k ? `رُفع ${k} طلب شراء` : "تعذّر رفع الطلب"); renderOps(); };
}

/* ================= المشتريات: مسؤول المشتريات ================= */
function viewBuy(){ return wsHead("المشتريات"); }
function bindBuy(){ if ($("#ws_out")) $("#ws_out").onclick = () => window.__accFb && window.__accFb.user.signOut(); }
function renderBuy(){
  const el = $("#list"); if (!el) return;
  const go = poToBuy(), wait = poWaiting(), me = teamBuyer(), cb = me ? custodyBalances().find(c => normName(c.name) === normName(me)) : null;
  const done = poAll().filter(p => !p.deleted && p.status === "received" && (p.date || "") >= addDays(today(), -14)).slice(0, 10);
  el.innerHTML = `
    ${cb ? `<div class="card" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><div class="small muted">عهدتي المتبقية</div><div class="num" style="font-size:26px;font-weight:800;color:${cb.left < 0 ? "var(--bad,#C62828)" : "#1B7A57"}">${fmt(cb.left)}</div></div>
      <div class="small muted" style="text-align:end">استلمت <b class="num">${fmt(cb.rec)}</b> · صرفت <b class="num">${fmt(cb.spent)}</b>${cb.ret ? ` · أرجعت <b class="num">${fmt(cb.ret)}</b>` : ""}</div></div>` : ""}
    ${wsTask(!go.length, `للشراء الآن${go.length ? ` <span class="pill warn">${go.length}</span>` : ""}`, go.length ? `<p class="small muted" style="margin:6px 0">أرسل الطلب للمورد، وبعد الشراء اضغط «سجّل الفاتورة»: تُفتح الفاتورة جاهزة بأصناف الطلب ومدفوعة من عهدتك، فعدّل الكميات والمبالغ حسب الفاتورة وأرفق صورتها.</p>
      ${go.map(p => poCard(p, S.canWrite ? `${p.status === "pending" ? `<button class="btn ghost sm" type="button" data-bsend="${esc(p.id)}">إرسال للمورد</button>` : ""}<button class="btn sm" type="button" data-binv="${esc(p.id)}">اشتريت · سجّل الفاتورة</button>` : "")).join("")}` : `<p class="small muted" style="margin:6px 0">لا توجد طلبات معتمدة بانتظار الشراء.</p>`)}
    ${wait.length ? `<h3 style="margin:16px 0 8px;font-size:16px">بانتظار الاعتماد</h3>${wait.map(p => poCard(p, "")).join("")}` : ""}
    <div class="actions" style="margin:6px 0 14px">${S.canWrite ? `<button class="btn ghost" type="button" id="by_new">طلب شراء جديد</button><a class="btn ghost" href="#invoices">فاتورة بدون طلب</a>` : ""}</div>
    ${done.length ? `<h3 style="margin:16px 0 8px;font-size:16px">اشتريت مؤخراً</h3><div class="card tw"><table><thead><tr><th>طلب</th><th>المورد</th><th class="n">التقدير</th><th class="n">الفاتورة</th><th>المطبخ</th></tr></thead><tbody>
      ${done.map(p => { const inv = (S.invoices || []).find(v => v.id === p.invId); return `<tr class="click" data-wpo="${esc(p.id)}"><td class="num">${esc(String(p.no))}</td><td>${esc(p.supplier || "—")}</td><td class="n">${money(p.est)}</td><td class="n">${inv ? money(invTotal(inv)) : "—"}</td>
        <td>${poRecvd(p) ? (poShort(p) ? `<span class="pill bad">ناقص عن الفاتورة</span>` : `<span class="pill ok">استُلم</span>`) : `<span class="pill warn">لم يؤكد</span>`}</td></tr>`; }).join("")}</tbody></table></div>` : ""}`;
  wsBindCommon(el);
  el.querySelectorAll("[data-bsend]").forEach(b => b.onclick = () => poOpenOrder(b.dataset.bsend));
  el.querySelectorAll("[data-binv]").forEach(b => b.onclick = () => { S.invPreset = {po:b.dataset.binv, buyer: me, pay: me ? "من العهدة" : ""}; location.hash = "#invoices"; });
  if ($("#by_new")) $("#by_new").onclick = async () => { const g = ktRaws()[0]; if (!g){ toast("لا توجد مكونات معرّفة"); return; }
    const id = S.db.collection("purchaseOrders").doc().id, no = Math.max(0, ...(S.raw.purchaseOrders || []).map(p => n(p.no))) + 1, lines = [{ing:g.id, q:1, p:Math.round(ktPrice(g) * 1000) / 1000}];
    if (await recWrite("purchaseOrders", id, {no, date:today(), supplier:"", buyer: buyerCanon(me || ""), lines, est:poEst(lines), notes:"", status:"pending", approvedBy:"", partnerOk:"", invId:"", raisedBy: teamName() || ""}, "create", "")) setTimeout(() => poOpenOrder(id), 300); };
}

/* ================= the owner's and partner's inbox on the dashboard ================= */
function teamInbox(){
  if (!S.canEdit && !isPartnerU()) return "";
  const out = [], P = S.purchaseOrders || [];
  if (S.canEdit){
    const ap = P.filter(p => !p.deleted && p.status === "pending" && poNeeds(p) && !p.approvedBy);
    if (ap.length) out.push(["warn", `<b>${ap.length} طلب شراء بانتظار اعتمادك</b> بإجمالي <span class="num">${fmt(sumBy(ap, p => n(p.est)))}</span>`, "po", "اعتمادها"]);
    const sh = P.filter(p => !p.deleted && p.status === "received" && poShort(p));
    if (sh.length) out.push(["bad", `<b>${sh.length} فاتورة بكمية أكبر مما استلمه المطبخ</b>: راجعها مع المشتري`, "po", "المقارنة"]);
    const nr = P.filter(p => !p.deleted && p.status === "received" && !poRecvd(p) && (p.receivedAt || "").slice(0, 10) < today() && (p.date || "") >= addDays(today(), -30));
    if (nr.length) out.push(["warn", `${nr.length} طلب سُجّلت فاتورته ولم يؤكد المطبخ استلامه`, "po", "الطلبات"]);
    const d7 = addDays(today(), -6), low = (S.batches || []).filter(b => { if (b.deleted || b.date < d7 || !n(b.inW)) return false; const g = ktIng(b.ing), s = g ? ktStdYield(g) : null; return s != null && n(b.outW) / n(b.inW) < s - 0.03; });
    if (low.length){ const v = sumBy(low, b => { const g = ktIng(b.ing); return (n(b.inW) * ktStdYield(g) - n(b.outW)) * ktPrice(g); });
      out.push(["warn", `${low.length} دفعة تحضير هذا الأسبوع بفقد أعلى من المعيار (قيمة النقص <span class="num">${fmt(v)}</span>)`, "prep", "التحضير"]); }
  } else {
    const ps = P.filter(p => !p.deleted && p.status === "pending" && p.approvedBy && poNeedsPartner(p) && !p.partnerOk);
    if (ps.length) out.push(["warn", `<b>${ps.length} طلب شراء بانتظار موافقتك</b> (اعتمده المالك) بإجمالي <span class="num">${fmt(sumBy(ps, p => n(p.est)))}</span>`, "po", "مراجعتها"]);
  }
  if (!out.length) return "";
  return `<div class="card inbox" style="margin-bottom:14px"><h3 style="margin:0 0 8px;font-size:16px">بانتظار قرارك</h3>${out.map(([k, t, tab, l]) => `<div class="note ${k}" style="margin:6px 0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span>${t}</span><a class="btn ghost sm" href="#kitchen" data-ktgo="${tab}">${l}</a></div>`).join("")}</div>`;
}
document.addEventListener("click", e => { const a = e.target.closest && e.target.closest("[data-ktgo]"); if (a) S.ktTab = a.dataset.ktgo; }, true);

VIEWS.ops = {v:viewOps, bind:bindOps, list:renderOps};
VIEWS.buy = {v:viewBuy, bind:bindBuy, list:renderBuy};
