/* ---------- طلبات الشراء الذكية ----------
   acc_purchaseOrders/{id} = {no, date, supplier, buyer, lines:[{ing, q, p}], est, notes, status, approvedBy, approvedAt, orderedAt, invId, receivedAt}
   status: «pending» (open request) · «ordered» (sent to the supplier) · «received» (an invoice was linked) · «cancelled».
   Approval (dastoor art. 11/13): a request whose estimate is above the first limit needs the manager's approval (approvedBy);
   above the second limit it is a partners' decision, recorded the same way. The employee can never set approvedBy (rules).
   The suggested list comes from the kitchen: stock now, sales forecast by weekday, minimum level, and what is already on order. */

const poLim = () => { const L = S.settings.poLimits || {}; return {l1: has(L.l1) ? n(L.l1) : 500, l2: has(L.l2) ? n(L.l2) : 2000, cover: has(L.cover) ? Math.max(1, n(L.cover)) : 2}; };
const poAll = () => [...(S.purchaseOrders || [])].sort((a, b) => (b.date || "").localeCompare(a.date || "") || n(b.no) - n(a.no));
const poNeeds = p => n(p.est) > poLim().l1;                         // needs approval before buying
const poOk = p => !poNeeds(p) || !!p.approvedBy;                     // may be bought now
const poOpen = p => p && !p.deleted && (p.status === "pending" || p.status === "ordered");
const PO_ST = {pending:["طلب مفتوح","info"], ordered:["أُرسل للمورد","info"], received:["مستلم","ok"], cancelled:["ملغي","bad"]};
function poChip(p){
  if (p.status === "pending" && !poOk(p)) return `<span class="pill warn">بانتظار ${n(p.est) > poLim().l2 ? "قرار الشريكين" : "اعتماد المدير"}</span>`;
  const s = PO_ST[p.status] || PO_ST.pending; return `<span class="pill ${s[1]}">${s[0]}${p.status === "pending" && poNeeds(p) ? " · معتمد" : ""}</span>`;
}
const poEst = lines => r2(sumBy(lines, l => n(l.q) * n(l.p)));
/* the supplier an ingredient is usually bought from: set on it, else the supplier of its last invoice line */
function poSupOf(g){
  if (g.supplier) return g.supplier;
  const L = ktInItems("0000-00-00", today()).filter(it => it.ing === g.id).sort((a, b) => a.date < b.date ? -1 : 1);
  return L.length ? supKey(L[L.length - 1].inv.supplier) : "";
}

/* use of each ingredient per business day over a..b, in one pass over the orders */
function ktUseByDay(a, b){
  const days = new Map();
  if (!S.pos || !S.pos.ready) return days;
  const {orders, sday} = posSrc();
  for (const o of orders){
    if (o.test || o.status !== "paid") continue;
    const d = pfDayOf(o, sday); if (!d || d < a || d > b) continue;
    const m = days.get(d) || new Map(); days.set(d, m);
    for (const l of (o.lines || [])) for (const u of [l, ...(l.mods || [])]) for (const r of ktRecipe(u.id || u.ref)) ktRawAdd(m, r.ing, n(l.qty) * n(r.q));
  }
  return days;
}
/* expected use of each ingredient over the next `cover` days: for each day, the average of the same weekday over the last four weeks
   (a Thursday is not a Sunday); when there is no history for that weekday, the daily average of the last 14 days */
function poForecast(cover){
  const t = today(), past = ktUseByDay(addDays(t, -28), addDays(t, -1)), out = new Map(), wd = d => new Date(d + "T12:00:00").getDay();
  const avg14 = new Map(); for (let i = 1; i <= 14; i++){ const m = past.get(addDays(t, -i)); if (m) for (const [k, v] of m) avg14.set(k, (avg14.get(k) || 0) + v / 14); }
  for (let i = 1; i <= cover; i++){
    const d = addDays(t, i), same = [7, 14, 21, 28].map(k => addDays(d, -k)).filter(x => x < t && x >= addDays(t, -28));
    const seen = same.filter(x => past.has(x));
    for (const g of ktRaws()){
      const v = seen.length ? sumBy(seen, x => past.get(x).get(g.id) || 0) / same.length : (avg14.get(g.id) || 0);
      out.set(g.id, (out.get(g.id) || 0) + v);
    }
  }
  return out;
}
/* quantity of each ingredient on open purchase orders */
function poOnOrder(){ const m = new Map(); for (const p of (S.purchaseOrders || [])) if (poOpen(p)) for (const l of (p.lines || [])) m.set(l.ing, (m.get(l.ing) || 0) + n(l.q)); return m; }
const poRound = (q, unit) => { const u = String(unit || ""); return /كجم|لتر/.test(u) ? Math.ceil(q * 2) / 2 : Math.ceil(q - 1e-9); };
/* the suggested list: what each ingredient needs to cover the coming days and keep its minimum, less stock and open orders */
function poSuggest(){
  const L = poLim(), st = ktStock(today()), fc = poForecast(L.cover), oo = poOnOrder();
  return ktRaws().map(g => { const x = st.get(g.id), have = x ? Math.max(0, x.qty) : null, need = (fc.get(g.id) || 0) + n(g.min), on = oo.get(g.id) || 0;
    const want = have == null ? null : need - have - on;
    return {g, have, fc: fc.get(g.id) || 0, min: n(g.min), on, q: want != null && want > 1e-6 ? poRound(want, g.unit) : 0, p: ktPrice(g, today()), sup: poSupOf(g), noCount: have == null}; });
}

function ktPO(el){
  const G = S.ingredients || [], L = poLim();
  if (!G.length){ el.innerHTML = `<div class="empty card">أضف المكونات ووصفاتها وسجّل جرداً، ثم يقترح البرنامج قائمة الشراء.</div>`; return; }
  const t = today(); if (ktNeedOld(addDays(t, -28), el, renderKitchen)) return;
  const sug = poSuggest(), pick = S.poPick = S.poPick || {};
  sug.forEach(r => { if (!pick[r.g.id]) pick[r.g.id] = {q: r.q, sup: r.sup, on: r.q > 0}; });
  const all = poAll(), open = all.filter(poOpen), wait = open.filter(p => p.status === "pending" && !poOk(p));
  el.innerHTML = `${wait.length && S.canEdit ? `<div class="note warn" style="margin-bottom:12px"><b>${wait.length} طلب شراء بانتظار اعتمادك</b> بإجمالي <span class="num">${fmt(sumBy(wait, p => n(p.est)))}</span>. افتحه من القائمة أدناه.</div>` : ""}
    <div class="card" style="margin-bottom:14px"><div class="actions" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0">قائمة الشراء المقترحة</h3>
      <span class="small muted">تكفي <b class="num">${L.cover}</b> يوم حسب مبيعات نفس أيام الأسبوع، مع الحد الأدنى، بعد خصم الرصيد والطلبات المفتوحة · بدون اعتماد حتى <b class="num">${fmt(L.l1)}</b>${S.canEdit ? ` · <a href="#" id="po_set">تعديل</a>` : ""}</span></div>
      <div class="tw"><table><thead><tr><th></th><th>المكوّن</th><th class="n">الرصيد</th><th class="n">المتوقع استهلاكه</th><th class="n">الحد الأدنى</th><th class="n">في طلبات مفتوحة</th><th>الكمية المطلوبة</th><th>المورد</th><th class="n">التقدير</th></tr></thead><tbody>
      ${sug.map(r => { const k = pick[r.g.id]; return `<tr${r.q > 0 ? "" : ` style="opacity:.6"`}><td><input type="checkbox" data-pon="${esc(r.g.id)}" ${k.on ? "checked" : ""} aria-label="اختيار"></td>
        <td><b>${esc(r.g.name)}</b><small class="muted"> ${esc(r.g.unit || "")}</small></td><td class="n num">${r.noCount ? `<span class="muted">لا جرد</span>` : ktQ(r.have)}</td><td class="n num">${ktQ(r.fc)}</td><td class="n num">${r.min ? ktQ(r.min) : "—"}</td><td class="n num">${r.on ? ktQ(r.on) : "—"}</td>
        <td><input data-poq="${esc(r.g.id)}" type="number" step="0.001" min="0" inputmode="decimal" value="${k.q || ""}" style="max-width:110px"></td>
        <td><input data-pos="${esc(r.g.id)}" list="po_sups" value="${esc(k.sup || "")}" style="max-width:170px" placeholder="المورد"></td><td class="n">${money(n(k.q) * r.p)}</td></tr>`; }).join("")}</tbody></table></div>
      <datalist id="po_sups">${(S.suppliers || []).map(s => `<option value="${esc(s.name)}">`).join("")}</datalist>
      <div class="actions"><label class="small">المشتري <input id="po_buy" list="po_buyers" value="${esc(S.poBuyer || "")}" style="max-width:160px"></label><datalist id="po_buyers">${(S.settings.employees || []).map(e => `<option value="${esc(e)}">`).join("")}</datalist>
        ${S.canWrite ? `<button class="btn" type="button" id="po_make">إنشاء طلبات الشراء</button>` : ""}<span class="small muted">طلب لكل مورد من المكونات المختارة</span></div></div>
    <h3 style="margin:18px 0 8px">طلبات الشراء</h3>
    <div class="card tw"><table><thead><tr><th>رقم</th><th>التاريخ</th><th>المورد</th><th>المشتري</th><th class="n">الأصناف</th><th class="n">التقدير</th><th>الحالة</th><th>الفاتورة</th></tr></thead><tbody>
    ${all.slice(0, 60).map(p => { const inv = p.invId ? (S.invoices || []).find(v => v.id === p.invId) : null;
      return `<tr class="click" data-po="${esc(p.id)}"><td class="num"><b>${esc(String(p.no || ""))}</b></td><td class="num">${dmy(p.date)}</td><td>${esc(p.supplier || "—")}</td><td>${esc(p.buyer || "")}</td><td class="n num">${(p.lines || []).length}</td><td class="n">${money(p.est)}</td><td>${poChip(p)}</td>
        <td>${inv ? `<span class="num">${money(invTotal(inv))}</span>${Math.abs(invTotal(inv) - n(p.est)) > 0.005 ? ` <small class="muted">(${invTotal(inv) > n(p.est) ? "+" : ""}${fmt(invTotal(inv) - n(p.est))})</small>` : ""}` : "—"}</td></tr>`; }).join("") || `<tr><td colspan="8" class="empty">لا توجد طلبات شراء بعد</td></tr>`}</tbody></table></div>`;
  el.querySelectorAll("[data-pon]").forEach(c => c.onchange = () => { pick[c.dataset.pon].on = c.checked; });
  el.querySelectorAll("[data-poq]").forEach(c => c.onchange = () => { pick[c.dataset.poq].q = c.value; pick[c.dataset.poq].on = n(c.value) > 0; ktPO(el); });
  el.querySelectorAll("[data-pos]").forEach(c => c.onchange = () => { pick[c.dataset.pos].sup = c.value.trim(); });
  el.querySelectorAll("[data-po]").forEach(tr => tr.onclick = () => poOpenOrder(tr.dataset.po));
  if ($("#po_set")) $("#po_set").onclick = e => { e.preventDefault(); poSettings(); };
  if ($("#po_make")) $("#po_make").onclick = async () => {
    S.poBuyer = $("#po_buy").value.trim();
    const chosen = sug.filter(r => pick[r.g.id].on && n(pick[r.g.id].q) > 0);
    if (!chosen.length){ toast("اختر مكوّناً واحداً على الأقل بكمية"); return; }
    const by = new Map(); for (const r of chosen){ const s = supKey(pick[r.g.id].sup || "") ; (by.get(s) || by.set(s, []).get(s)).push({ing:r.g.id, q:Math.round(n(pick[r.g.id].q) * 1000) / 1000, p:Math.round(r.p * 1000) / 1000}); }
    $("#po_make").disabled = true; let k = 0, no = Math.max(0, ...(S.raw.purchaseOrders || []).map(p => n(p.no)));
    for (const [sup, lines] of by){ const est = poEst(lines);
      if (await recWrite("purchaseOrders", null, {no: ++no, date: t, supplier: sup === "بدون مورد" ? "" : sup, buyer: buyerCanon(S.poBuyer), lines, est, notes:"", status:"pending", approvedBy:"", invId:""}, "create", "")) k++; }
    S.poPick = {}; toast(`أُنشئ ${k} طلب شراء`);
  };
}

function poSettings(){
  const L = poLim();
  $("#sheet").innerHTML = `<form class="entry" id="fpos"><h3 style="margin:0">إعدادات طلبات الشراء</h3>
    <div class="grid g2"><div class="f"><label for="ps_l1">بدون اعتماد حتى (ر.س)</label><input id="ps_l1" type="number" min="0" step="1" value="${L.l1}"></div>
      <div class="f"><label for="ps_l2">قرار الشريكين فوق (ر.س)</label><input id="ps_l2" type="number" min="0" step="1" value="${L.l2}"></div>
      <div class="f"><label for="ps_c">القائمة المقترحة تكفي (أيام)</label><input id="ps_c" type="number" min="1" max="14" step="1" value="${L.cover}"></div></div>
    <p class="small muted" style="margin:0">حسب دستور الحوكمة (المادتان 11 و13).</p>
    <div class="actions"><button class="btn" type="submit">حفظ</button><button class="btn ghost" type="button" id="ps_x">إغلاق</button></div></form>`;
  $("#modal").classList.add("open"); $("#ps_x").onclick = closeModal;
  $("#fpos").onsubmit = async e => { e.preventDefault();
    const v = {l1:Math.max(0, n($("#ps_l1").value)), l2:Math.max(0, n($("#ps_l2").value)), cover:Math.min(14, Math.max(1, Math.round(n($("#ps_c").value) || 2)))};
    if (v.l2 < v.l1){ toast("حد الشريكين يكون أكبر من حد الاعتماد"); return; }
    const base = {...S.settings}; delete base.id;
    if (await write(() => setSettingsDoc({...base, poLimits:v, ...stamp()}), "تم الحفظ")) closeModal(); };
}

/* the message to the supplier, ready for WhatsApp */
function poText(p){
  const lines = (p.lines || []).map(l => { const g = ktIng(l.ing); return `• ${g ? g.name : "صنف"}: ${ktQ(l.q)} ${g ? g.unit || "" : ""}`; });
  return [`السلام عليكم${p.supplier ? " " + p.supplier : ""}،`, `طلب شراء رقم ${p.no} من ${S.settings.brandName || "شاورما العقيلة"}:`, ...lines, p.buyer ? `المستلم: ${p.buyer}` : "", "نرجو تأكيد التوفر والسعر، وإصدار الفاتورة باسم شاورما العقيلة. شكراً."].filter(Boolean).join("\n");
}

function poOpenOrder(id){
  const p = (S.purchaseOrders || []).find(x => x.id === id); if (!p) return;
  const G = S.ingredients || [], edit = p.status === "pending" && S.canWrite, L = (p.lines || []).map(l => ({...l}));
  const inv = p.invId ? (S.invoices || []).find(v => v.id === p.invId) : null, sp = supplierOf(p.supplier || ""), phone = sp && sp.phone ? String(sp.phone).replace(/\D/g, "").replace(/^0/, "966") : "";
  const cmp = inv ? L.map(l => { const g = ktIng(l.ing), got = (inv.items || []).filter(it => it.ing === l.ing), gq = sumBy(got, it => n(it.q)), ga = sumBy(got, it => n(it.a));
      return {g, l, gq, gp: gq ? ga / gq : null}; }) : [];
  const extra = inv ? (inv.items || []).filter(it => !L.some(l => l.ing === it.ing)) : [];
  const draw = () => {
    $("#po_rows").innerHTML = L.map((l, i) => { const g = ktIng(l.ing);
      return `<tr><td>${edit ? `<select data-pli="${i}">${G.map(z => `<option value="${esc(z.id)}" ${z.id === l.ing ? "selected" : ""}>${esc(z.name)}</option>`).join("")}</select>` : `<b>${esc(g ? g.name : "—")}</b>`}</td>
        <td>${edit ? `<input data-plq="${i}" type="number" step="0.001" min="0" value="${l.q}" style="max-width:100px">` : `<span class="num">${ktQ(l.q)}</span>`} <small class="muted">${esc(g ? g.unit || "" : "")}</small></td>
        <td class="n">${money(l.p)}</td><td class="n">${money(n(l.q) * n(l.p))}</td>${edit ? `<td><button type="button" class="btn danger sm" data-pld="${i}">×</button></td>` : ""}</tr>`; }).join("");
    $("#po_est").textContent = fmt(poEst(L));
    document.querySelectorAll("[data-pli]").forEach(s => s.onchange = () => { L[+s.dataset.pli].ing = s.value; const g = ktIng(s.value); if (g) L[+s.dataset.pli].p = Math.round(ktPrice(g) * 1000) / 1000; draw(); });
    document.querySelectorAll("[data-plq]").forEach(s => s.onchange = () => { L[+s.dataset.plq].q = n(s.value); draw(); });
    document.querySelectorAll("[data-pld]").forEach(b => b.onclick = () => { L.splice(+b.dataset.pld, 1); draw(); });
  };
  const canApprove = S.canEdit && p.status === "pending" && poNeeds(p) && !p.approvedBy;
  $("#sheet").innerHTML = `<div class="entry"><div class="actions" style="justify-content:space-between"><h3 style="margin:0">طلب شراء رقم <span class="num">${esc(String(p.no))}</span></h3>${poChip(p)}</div>
    <p class="small muted" style="margin:0"><span class="num">${dmy(p.date)}</span> · المورد: <b>${esc(p.supplier || "—")}</b>${p.buyer ? ` · المشتري: <b>${esc(p.buyer)}</b>` : ""}${p.approvedBy ? ` · اعتُمد <span class="num">${dmy((p.approvedAt || "").slice(0, 10))}</span>` : ""}</p>
    ${poNeeds(p) && !p.approvedBy && p.status === "pending" ? `<div class="note warn">التقدير <b class="num">${fmt(p.est)}</b> فوق حد الشراء بدون اعتماد (<span class="num">${fmt(poLim().l1)}</span>)${n(p.est) > poLim().l2 ? "، وفوق حد قرار الشريكين" : ""}: لا يُشترى قبل الاعتماد.</div>` : ""}
    <div class="tw"><table><thead><tr><th>المكوّن</th><th>الكمية</th><th class="n">سعر تقديري</th><th class="n">المبلغ</th>${edit ? "<th></th>" : ""}</tr></thead><tbody id="po_rows"></tbody>
      <tfoot><tr><td colspan="3"><b>التقدير</b></td><td class="n"><b class="num" id="po_est"></b></td>${edit ? "<td></td>" : ""}</tr></tfoot></table></div>
    ${edit ? `<div class="actions"><button type="button" class="btn ghost sm" id="po_addl">+ مكوّن</button></div>` : ""}
    ${inv ? `<h4 style="margin:10px 0 4px">المستلم بالفاتورة <span class="num">${esc(inv.no || "")}</span> · <span class="num">${money(invTotal(inv))}</span></h4>
      <div class="tw"><table><thead><tr><th>المكوّن</th><th class="n">المطلوب</th><th class="n">المستلم</th><th class="n">السعر التقديري</th><th class="n">السعر الفعلي</th></tr></thead><tbody>
      ${cmp.map(c => `<tr><td>${esc(c.g ? c.g.name : "—")}</td><td class="n num">${ktQ(c.l.q)}</td><td class="n"><b class="num" style="color:${Math.abs(c.gq - n(c.l.q)) > 1e-6 ? "#B26A00" : "inherit"}">${ktQ(c.gq)}</b></td>
        <td class="n">${money(c.l.p)}</td><td class="n">${c.gp == null ? "—" : `<b class="num" style="color:${c.gp > n(c.l.p) * 1.1 ? "var(--bad,#C62828)" : "inherit"}">${fmt(c.gp)}</b>`}</td></tr>`).join("")}
      ${extra.map(it => { const g = ktIng(it.ing); return `<tr><td>${esc(g ? g.name : "—")} <small class="muted">(غير مطلوب)</small></td><td class="n">—</td><td class="n num">${ktQ(it.q)}</td><td class="n">—</td><td class="n num">${n(it.q) ? fmt(n(it.a) / n(it.q)) : "—"}</td></tr>`; }).join("")}</tbody></table></div>
      ${(inv.items || []).length ? "" : `<p class="small muted">الفاتورة بلا أصناف مخزون، فلا مقارنة بالكميات. أضفها من نموذج الفاتورة.</p>`}` : ""}
    <div class="actions" style="flex-wrap:wrap">
      ${edit ? `<button class="btn" type="button" id="po_save">حفظ التعديل</button>` : ""}
      ${canApprove ? `<button class="btn" type="button" id="po_ok" style="background:#1B7A57">اعتماد الطلب</button>` : ""}
      ${poOpen(p) && poOk(p) && S.canWrite ? `<button class="btn ghost" type="button" id="po_wa">${phone ? "إرسال للمورد واتساب" : "نسخ رسالة المورد"}</button>` : ""}
      ${poOpen(p) && S.canWrite ? `<button class="btn danger sm" type="button" id="po_cancel">إلغاء الطلب</button>` : ""}
      ${p.status === "cancelled" && S.canWrite ? `<button class="btn ghost sm" type="button" id="po_reopen">إعادة فتح</button>` : ""}
      <button class="btn ghost" type="button" id="po_x">إغلاق</button></div>
    ${poOpen(p) ? `<p class="small muted" style="margin:0">عند وصول الفاتورة سجّلها في الفواتير واختر هذا الطلب في خانة «طلب الشراء»، فيُغلق الطلب وتظهر المقارنة هنا.</p>` : ""}</div>`;
  $("#modal").classList.add("open"); $("#po_x").onclick = closeModal; draw();
  const save = (patch, msg) => recWrite("purchaseOrders", id, {...strip(p), ...patch}, null, msg);
  if ($("#po_addl")) $("#po_addl").onclick = () => { const g = G.find(z => !L.some(l => l.ing === z.id)) || G[0]; L.push({ing:g.id, q:1, p:Math.round(ktPrice(g) * 1000) / 1000}); draw(); };
  if ($("#po_save")) $("#po_save").onclick = async () => { const lines = L.filter(l => l.ing && n(l.q) > 0); if (!lines.length){ toast("الطلب بلا أصناف؛ ألغِه بدلاً من ذلك"); return; }
    const est = poEst(lines), keepOk = p.approvedBy && est <= n(p.est) + 0.005;   // an approved request that grows needs approval again
    if (await save({lines, est, approvedBy: keepOk ? p.approvedBy : "", approvedAt: keepOk ? p.approvedAt || "" : ""}, "تم حفظ الطلب")) closeModal(); };
  if ($("#po_ok")) $("#po_ok").onclick = async () => { if (await save({approvedBy:S.uid || "owner", approvedAt:new Date().toISOString()}, "تم اعتماد الطلب")) closeModal(); };
  if ($("#po_cancel")) armDelete($("#po_cancel"), async () => { if (await save({status:"cancelled"}, "أُلغي الطلب")) closeModal(); });
  if ($("#po_reopen")) $("#po_reopen").onclick = async () => { if (await save({status:"pending", approvedBy:"", approvedAt:""}, "أُعيد فتح الطلب")) closeModal(); };
  if ($("#po_wa")) $("#po_wa").onclick = async () => { const txt = poText(p);
    if (phone) window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(txt), "_blank");
    else { try { await navigator.clipboard.writeText(txt); toast("نُسخت رسالة الطلب؛ الصقها للمورد"); } catch(e){ toast("لم يُنسخ النص"); } }
    if (p.status === "pending") await save({status:"ordered", orderedAt:new Date().toISOString()}, ""); closeModal(); };
}

/* an invoice linked to a purchase order closes it; unlinking (or deleting the invoice) reopens it */
async function poLinkInvoice(iid, poId, prevPo){
  if (prevPo && prevPo !== poId){ const o = (S.raw.purchaseOrders || []).find(x => x.id === prevPo);
    if (o && o.invId === iid) await recWrite("purchaseOrders", o.id, {...strip(o), status: o.orderedAt ? "ordered" : "pending", invId:"", receivedAt:""}, null, ""); }
  if (poId){ const o = (S.raw.purchaseOrders || []).find(x => x.id === poId);
    if (o && (o.invId !== iid || o.status !== "received")) await recWrite("purchaseOrders", o.id, {...strip(o), status:"received", invId:iid, receivedAt:new Date().toISOString()}, null, ""); }
}
/* the open requests an invoice can close, those of its supplier first */
function poChoices(sup, keepId){
  const k = sup ? supKey(sup) : "";
  return (S.purchaseOrders || []).filter(p => !p.deleted && (poOpen(p) || p.id === keepId)).sort((a, b) => (supKey(b.supplier || "") === k) - (supKey(a.supplier || "") === k) || (b.date || "").localeCompare(a.date || ""));
}
