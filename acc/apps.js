/* ---------- التطبيقات: منصات التوصيل، عقودها، منيوها، مستحقاتها، وتقرير أصنافها ----------
   Runs inside the accounting page (same globals as the main script). Owner only.
   Data: acc_platforms/{id} = {name, posKey, aliases[], contracts[], history[]}
   Orders come live from the cashier (S.pos); transfers are the «تحويلات التطبيقات» records matched by app name. */

const PF_SEED = [
  {id:"hunger", name:"هنقرستيشن", posKey:"hunger", order:1, aliases:["هنقرستيشن","هنقر","هنجرستيشن","hungerstation","hunger"],
   contracts:[{id:"c-2026-11-18", from:"2026-11-18", to:"", ref:"OQ-0011248428", commissionPct:10, paymentPct:2.5,
     tiers:[[0,7],[40,8],[50,9],[60,11],[80,13]], perOrder:0, hplus:4, cycleDays:7,
     notes:"رسوم الخدمة 10% والدفع الإلكتروني 2.5% من إجمالي الطلب. التوصيل حسب السلة شاملة الضريبة: 30–39.99 = 7، 40–49.99 = 8، 50–59.99 = 9، 60–79.99 = 11، 80+ = 13 (أقل من 30 غير مذكور، يُفترض 7). طلبات HPlus +4. التسجيل والطابعة مجاناً. للمنصة تعديل الرسوم بإشعار 14 يوماً. دورة التحويل غير مذكورة في العقد (7 أيام تقديرياً)."}]},
  {id:"lokit", name:"لوكيت", posKey:"lokit", order:2, aliases:["لوكيت","lokit","لوكت"],
   contracts:[{id:"c-default", from:"2026-11-01", to:"", ref:"", commissionPct:30, paymentPct:0, tiers:[], perOrder:0, hplus:0, cycleDays:15,
     notes:"نسبة تقديرية (30%) حتى يُرفق عقد لوكيت."}]}
];
const PF_CYCLES = [[1,"يومي"],[7,"أسبوعي"],[14,"كل أسبوعين"],[15,"كل 15 يوماً"],[30,"شهري"],[-1,"نصف شهري بتاريخين ثابتين"]];
/* expected transfer date of one day's sales. Half-monthly (cycleDays −1): days 1–15 are paid on payDay1 of the same month,
   days 16 to month end on payDay2 of the next month (a payDay1 below 16 also falls in the next month) */
function pfDue(c, day){
  c = c || {};
  if (n(c.cycleDays) === -1 && n(c.payDay1) && n(c.payDay2)){
    const [y, m, d] = day.split("-").map(Number), last = (Y, M) => new Date(Y, M, 0).getDate();
    const at = (Y, M, D) => { if (M > 12){ M -= 12; Y++; } return `${Y}-${String(M).padStart(2, "0")}-${String(Math.min(D, last(Y, M))).padStart(2, "0")}`; };
    return d <= 15 ? at(y, n(c.payDay1) >= 16 ? m : m + 1, n(c.payDay1)) : at(y, m + 1, n(c.payDay2));
  }
  return addDays(day, n(c.cycleDays) > 0 ? n(c.cycleDays) : 7);
}
const pfCycleText = c => n(c.cycleDays) === -1 ? `مبيعات 1–15 تُحوَّل يوم <span class="num">${n(c.payDay1)}</span>${n(c.payDay1) >= 16 ? " من نفس الشهر" : " من الشهر التالي"}، ومبيعات 16–آخر الشهر يوم <span class="num">${n(c.payDay2)}</span> من الشهر التالي`
  : (PF_CYCLES.find(x => x[0] === n(c.cycleDays)) || [0, `كل ${n(c.cycleDays) || 7} أيام`])[1];
const pfKey = s => String(s || "").trim().toLowerCase().replace(/\s+/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const pfByName = name => { const k = pfKey(name); return (S.platforms || []).find(p => pfKey(p.name) === k || (p.aliases || []).some(a => pfKey(a) === k)) || null; };

/* the contract in force on a day (the latest one that started on or before it) */
function pfContract(pf, day){
  return (pf.contracts || []).filter(c => (!c.from || c.from <= day) && (!c.to || c.to >= day)).sort((a, b) => (a.from || "") < (b.from || "") ? 1 : -1)[0] || null;
}
function pfDelivery(c, t){ let f = 0; [...(c.tiers || [])].sort((a, b) => n(a[0]) - n(b[0])).forEach(([min, fee]) => { if (t >= n(min)) f = n(fee); }); return f; }
/* what the platform keeps from one order of value t, by the contract */
function pfFee(c, t){
  if (!c) return {comm:0, pay:0, del:0, extra:0, total:0};
  const comm = t * n(c.commissionPct) / 100, pay = t * n(c.paymentPct) / 100, del = pfDelivery(c, t), extra = n(c.perOrder);
  return {comm, pay, del, extra, total: comm + pay + del + extra};
}
const PF_SUM = Object.freeze({summary:true});
const pfDayOf = (o, sday) => (o.shiftId && sday.get(o.shiftId)) || o.day;
/* paid cashier orders of one platform, each with its business day and its fees */
function pfOrders(pf, testMode = !!S.testView){
  const P = S.pos; if (!P || !P.ready || !pf.posKey) return [];
  const sday = new Map((P.shifts || []).map(x => [x.id, x.day]));
  const rows = (P.orders || []).filter(o => !!o.test === testMode && o.status === "paid" && (o.method === pf.posKey || (o.type === pf.posKey && !o.method)))
    .map(o => { const day = pfDayOf(o, sday), t = n(o.total), c = pfContract(pf, day); return {o, day, t, c, f: pfFee(c, t)}; });
  /* the days before the live window: each order total kept in the day's summary, with the fees worked out the same way */
  if (!testMode) for (const [day, x] of (P.sums || [])) for (const e of (x.ag || [])) if (e.k === pf.posKey || e.k === "t:" + pf.posKey){ const t = n(e.t), c = pfContract(pf, day); rows.push({o:PF_SUM, day, t, c, f: pfFee(c, t)}); }
  return pf.id === PF_SALES_APP && !testMode ? rows.concat(pfFromSales(pf, rows, sday)) : rows;
}
/* days whose Lokit orders were not rung up on the cashier (taken in Foodics and entered on the sales page): the sales page's
   «تطبيقات التوصيل» for that day, less any HungerStation orders the cashier recorded that day, is Lokit's; one row per day */
const PF_SALES_APP = "lokit";
function pfFromSales(pf, rows, sday){
  const have = new Set(rows.map(r => r.day)), st = S.settings.startDate || "", other = new Map();
  for (const o of (S.pos.orders || [])) if (!o.test && o.status === "paid" && o.method && o.method !== pf.posKey && (S.platforms || []).some(p => p.posKey === o.method)){ const d = pfDayOf(o, sday); other.set(d, (other.get(d) || 0) + n(o.total)); }
  for (const [d, x] of (S.pos.sums || [])) for (const e of (x.ag || [])) if (e.k !== pf.posKey && !String(e.k).startsWith("t:") && (S.platforms || []).some(p => p.posKey === e.k)) other.set(d, (other.get(d) || 0) + n(e.t));
  const out = [];
  for (const s of (S.sales ? S.sales.values() : [])){
    const day = s.date || s.id; if (!day || (st && day < st) || have.has(day)) continue;
    const t = r2(n(s.delivery) - (other.get(day) || 0)); if (t <= 0.004) continue;
    const c = pfContract(pf, day), comm = t * n(c && c.commissionPct) / 100, pay = t * n(c && c.paymentPct) / 100;
    out.push({o:null, src:"sales", day, t, c, approx: !!(c && ((c.tiers || []).length || n(c.perOrder))), f:{comm, pay, del:0, extra:0, total: comm + pay}});
  }
  return out;
}
/* transfers count from the day the cashier started recording this platform's orders; earlier ones settle sales the cashier never saw */
const pfStart = pf => { const d = pfOrders(pf).map(r => r.day).sort()[0]; return pf.trackFrom || d || null; };
const pfTransfers = pf => { if (S.testView) return []; const st = pfStart(pf); return (S.apps || []).filter(x => pfByName(x.app) === pf && st && (x.to || x.date) >= st).sort((a, b) => a.date < b.date ? -1 : 1); };

/* day by day: what the platform owes, what came in (oldest days settled first), and what is late */
function pfLedger(pf){
  const by = new Map();
  for (const r of pfOrders(pf)){
    const x = by.get(r.day) || {date:r.day, n:0, sales:0, comm:0, pay:0, del:0, extra:0, fees:0, net:0, c:r.c};
    if (r.o) x.n++; else { x.src = "sales"; x.approx = r.approx; } x.sales += r.t; x.comm += r.f.comm; x.pay += r.f.pay; x.del += r.f.del; x.extra += r.f.extra; x.fees += r.f.total; x.net += r.t - r.f.total;
    by.set(r.day, x);
  }
  const days = [...by.values()].sort((a, b) => a.date < b.date ? -1 : 1);
  const tr = pfTransfers(pf); let pool = tr.reduce((a, x) => a + n(x.amount), 0);
  const t = today();
  days.forEach(x => {
    ["sales","comm","pay","del","extra","fees","net"].forEach(k => x[k] = r2(x[k]));
    x.recv = r2(Math.min(x.net, Math.max(0, pool))); pool = r2(pool - x.recv);
    x.due = pfDue(x.c, x.date);
    x.left = r2(x.net - x.recv);
    x.st = x.left <= 0.009 ? "paid" : x.recv > 0 ? "part" : t > addDays(x.due, 2) ? "late" : "wait";
  });
  const net = r2(days.reduce((a, x) => a + x.net, 0)), got = r2(tr.reduce((a, x) => a + n(x.amount), 0));
  return {days, tr, net, got, bal: r2(net - got), late: r2(days.filter(x => x.st === "late" || (x.st === "part" && t > addDays(x.due, 2))).reduce((a, x) => a + x.left, 0)), extra: r2(Math.max(0, pool))};
}

/* Firestore keeps no arrays inside arrays: delivery tiers are stored as {min, fee} and used as [min, fee] */
const tiersIn = T => (T || []).map(x => Array.isArray(x) ? [n(x[0]), n(x[1])] : [n(x.min), n(x.fee)]);
const tiersOut = T => (T || []).map(x => Array.isArray(x) ? {min:n(x[0]), fee:n(x[1])} : {min:n(x.min), fee:n(x.fee)});
const contractsOut = cs => (cs || []).map(c => ({...c, tiers: tiersOut(c.tiers)}));

/* the platforms' cut per shift day, by contract: «pos» from cashier orders only, «all» also counts the days taken from the
   sales page (as on the Apps page). null until the cashier feed and the platforms are loaded; cached per data change */
let pfDC = {key:null, pos:null, all:null};
function pfFeeMaps(){
  if (!S.pos || !S.pos.ready || !S.platforms) return null;
  const key = `${S.pos.at}|${S.pfVer || 0}|${S.ver || 0}`;
  if (pfDC.key !== key){ const pos = new Map(), all = new Map();
    for (const p of S.platforms) for (const r of pfOrders(p, false)){ all.set(r.day, (all.get(r.day) || 0) + r.f.total); if (r.o) pos.set(r.day, (pos.get(r.day) || 0) + r.f.total); }
    pfDC = {key, pos, all}; }
  return pfDC;
}
function pfDayComm(d){ const M = pfFeeMaps(); return M ? r2(M.pos.get(d) || 0) : null; }
function pfDayCommAll(d){ const M = pfFeeMaps(); return M && M.all.has(d) ? r2(M.all.get(d)) : null; }
/* the delivery-sales rate for a day typed on the sales page (Lokit's contract in force), for previews */
function pfSalesRate(d){ const pf = (S.platforms || []).find(p => p.id === PF_SALES_APP); const c = pf && pfContract(pf, d || today()); return c ? (n(c.commissionPct) + n(c.paymentPct)) / 100 : null; }
/* receivable from all platforms, the same figures as the Apps page; null when not loaded (the caller falls back) */
function pfReceivable(){
  if (!S.platforms || !S.pos || !S.pos.ready) return null;
  let due = 0, paid = 0, gross = 0, next = null, last = null, late = 0;
  for (const p of S.platforms){ const L = pfLedger(p);
    due += L.net; paid += L.got; late += L.late; gross += L.days.reduce((a, x) => a + x.sales, 0);
    for (const x of L.days) if (x.left > 0.009 && (!next || x.due < next)) next = x.due;
    for (const t of L.tr) if (!last || t.date > last.date) last = {date:t.date, amt:n(t.amount)}; }
  return {due:r2(due), paid:r2(paid), gross:r2(gross), left:r2(due - paid), late:r2(late), last, next, cycle:0, byContract:true};
}

/* ---------- data ---------- */
let pfUnsub = null;
function startPlatforms(){
  if (pfUnsub || !(S.isOwner || (typeof staffSees === "function" && staffSees("platforms")))) return;
  pfUnsub = S.db.collection("platforms").onSnapshot(async q => {
    const raw = q.docs.map(d => ({id:d.id, ...d.data()}));
    /* the two platforms the business already uses are created once; one that failed or is missing is added again */
    const missing = PF_SEED.filter(p => !raw.some(x => x.id === p.id));
    if (missing.length && !S.pfSeeded){ S.pfSeeded = true;
      for (const p of missing){ const {id, ...r} = p; try { await S.db.doc("platforms/" + id).set({...r, contracts: contractsOut(r.contracts), createdAt:new Date().toISOString(), by:S.uid || "", history:[]}); } catch(e){ toast("تعذّر إنشاء " + p.name + ": " + (e && (e.code || e.message) || e)); } }
      if (missing.length === PF_SEED.length && !raw.length) return; }
    const all = raw.filter(p => !p.deleted).map(p => ({...p, contracts:(p.contracts || []).map(c => ({...c, tiers: tiersIn(c.tiers)}))}));
    S.pfVer = (S.pfVer || 0) + 1;
    S.platforms = all.sort((a, b) => (a.order ?? 9) - (b.order ?? 9) || (a.name < b.name ? -1 : 1));
    if (!S.pfSel || !S.platforms.find(p => p.id === S.pfSel)) S.pfSel = (S.platforms[0] || {}).id;
    if (S.view === "platforms") renderPlatforms(); else if (["dashboard","sales","reports","accounting","cfo"].includes(S.view)) renderLists();
  }, () => {});
}
async function pfSave(pf, patch, msg){
  const old = (S.platforms || []).find(p => p.id === pf.id) || {};
  const {id, history, ...prev} = old;
  const body = {...prev, ...patch, updatedAt:new Date().toISOString(), by:S.uid || "", history:[{action: old.id ? "edit" : "create", at:new Date().toISOString(), by:S.uid || "", before: old.id ? {contracts: contractsOut(prev.contracts), name: prev.name} : null}, ...(history || [])].slice(0, 15)};
  body.contracts = contractsOut(body.contracts);
  try { await S.db.doc("platforms/" + pf.id).set(body); if (msg) toast(msg); return true; } catch(e){ toast("تعذّر الحفظ: " + (e && (e.code || e.message) || e)); return false; }
}

/* ---------- page ---------- */
function viewPlatforms(){
  return `<div class="bar"><h2>التطبيقات</h2><div class="actions" style="margin:0">${testToggle()}<button type="button" class="btn ghost sm" id="pf_paste">لصق من Claude</button><button type="button" class="btn sm" id="pf_add">+ إضافة تطبيق</button></div></div>
    ${testBanner()}<div id="pf_cards"></div><div id="list"></div>`;
}
function bindPlatforms(){
  startPlatforms();
  $("#pf_add").onclick = () => pfAddDialog();
  $("#pf_paste").onclick = () => pfPasteDialog();
}
const PF_TABS = [["daily","اليومي والمستحقات"],["contract","العقد"],["menu","المنيو"],["report","تقرير الأصناف الشهري"]];
function renderPlatforms(){
  const cards = $("#pf_cards"), el = $("#list"); if (!cards || !el) return;
  if (!S.platforms){ cards.innerHTML = `<div class="empty card">جارٍ التحميل…</div>`; el.innerHTML = ""; return; }
  if (!S.pos || !S.pos.ready){ el.innerHTML = `<div class="empty card">جارٍ قراءة طلبات الكاشير…</div>`; }
  const R = curR();
  cards.innerHTML = `${posSumNote()}<div class="pf-cards">${S.platforms.map(p => {
    const L = pfLedger(p), m = L.days.filter(x => inR(x.date, R)), sales = m.reduce((a, x) => a + x.sales, 0), fees = m.reduce((a, x) => a + x.fees, 0), c = pfContract(p, today());
    return `<button type="button" class="pf-card ${p.id === S.pfSel ? "on" : ""}" data-pf="${esc(p.id)}">
      <b>${esc(p.name)}</b><span class="small muted">${c ? pfSummary(c) : "لا يوجد عقد"}</span>
      <span class="pf-v num">${fmt(sales)}</span><span class="small muted">مبيعات ${rgShort()} · الرسوم <span class="num">${sales ? pct(fees / sales) : "—"}</span></span>
      <span class="small ${L.late > 0.009 ? "neg" : ""}">المستحق <b class="num">${fmt(Math.max(0, L.bal))}</b>${L.late > 0.009 ? ` · متأخر <b class="num">${fmt(L.late)}</b>` : ""}</span></button>`; }).join("")}</div>`;
  cards.querySelectorAll("[data-pf]").forEach(b => b.onclick = () => { S.pfSel = b.dataset.pf; renderPlatforms(); });
  const pf = S.platforms.find(p => p.id === S.pfSel); if (!pf || !S.pos || !S.pos.ready) return;
  const tab = S.pfTab || "daily";
  el.innerHTML = `<div class="actions" style="margin:6px 0 12px;justify-content:space-between;align-items:center"><div class="seg" role="tablist">${PF_TABS.map(([k, l]) => `<button type="button" data-pft="${k}" class="${k === tab ? "on" : ""}">${l}</button>`).join("")}</div>
    ${tab === "daily" || tab === "report" ? rgPicker() : ""}</div><div id="pf_body"></div>`;
  el.querySelectorAll("[data-pft]").forEach(b => b.onclick = () => { S.pfTab = b.dataset.pft; renderPlatforms(); });
  rgBind();
  ({daily:pfDaily, contract:pfContractTab, menu:pfMenu, report:pfReport})[tab](pf, $("#pf_body"));
}
const pfRange = (a, b) => a === b ? `<span class="num">${a}</span>` : `من <span class="num">${a}</span> إلى <span class="num">${b}</span>`;
const pfSummary = c => [n(c.commissionPct) ? `عمولة ${n(c.commissionPct)}%` : "", n(c.paymentPct) ? `دفع ${n(c.paymentPct)}%` : "", (c.tiers || []).length ? `توصيل ${pfRange(Math.min(...c.tiers.map(t => n(t[1]))), Math.max(...c.tiers.map(t => n(t[1]))))}` : "", n(c.perOrder) ? `${fmt(n(c.perOrder))} للطلب` : ""].filter(Boolean).join(" + ") || "بدون رسوم";
const PF_ST = {paid:['ok', "حُوِّل"], part:['warn', "جزئي"], wait:['info', "لم يحن"], late:['bad', "متأخر"]};

/* ---- daily & receivables ---- */
function pfDaily(pf, el){
  const L = pfLedger(pf), R = curR(), days = L.days.filter(x => inR(x.date, R)).reverse();
  const sum = k => r2(days.reduce((a, x) => a + n(x[k]), 0)), tr = L.tr.filter(x => inR(x.date, R));
  const last = L.tr[L.tr.length - 1];
  el.innerHTML = `<div class="grid g4" style="margin-bottom:14px">
      <div class="kpi"><span class="l">مبيعات ${esc(pf.name)} · ${rgShort()}</span><span class="v num">${fmt(sum("sales"))}</span><span class="small muted">${sum("n")} طلب من الكاشير${days.some(x => x.src) ? " + أيام من صفحة المبيعات" : ""}</span></div>
      <div class="kpi orange"><span class="l">العمولة والرسوم</span><span class="v num">${fmt(sum("fees"))}</span><span class="small muted">النسبة الفعلية <span class="num">${sum("sales") ? pct(sum("fees") / sum("sales")) : "—"}</span></span></div>
      <div class="kpi green"><span class="l">الصافي المستحق لك</span><span class="v num">${fmt(sum("net"))}</span><span class="small muted">عن ${rgShort()}</span></div>
      <div class="kpi ${L.late > 0.009 ? "orange" : "dark"}"><span class="l">الرصيد المستحق ${pfStart(pf) ? `منذ <span class="num">${dmy(pfStart(pf))}</span>` : ""}</span><span class="v num">${fmt(Math.max(0, L.bal))}</span><span class="small muted">${L.late > 0.009 ? `منه متأخر <span class="num">${fmt(L.late)}</span> · ` : ""}آخر تحويل ${last ? `<span class="num">${dmy(last.date)}</span> (${fmt(n(last.amount))})` : "—"}</span></div></div>
    ${L.late > 0.009 ? `<div class="note warn" style="margin-bottom:12px"><b>تنبيه:</b> مبالغ مرّ موعد تحويلها المتوقع ولم تصل: <b class="num">${fmt(L.late)}</b>. راجع كشف البنك أو تواصل مع ${esc(pf.name)}.</div>` : ""}
    ${L.extra > 0.009 ? `<div class="note" style="margin-bottom:12px">وصل من ${esc(pf.name)} أكثر من المستحق المحسوب بـ <b class="num">${fmt(L.extra)}</b> — قد تكون رسوم العقد أعلى من الفعلية، أو تحويل لم يُسجَّل باسم التطبيق الصحيح.</div>` : ""}
    <div class="tw stick"><table><thead><tr><th>يوم الوردية</th><th class="n">الطلبات</th><th class="n">المبيعات</th><th class="n">العمولة</th><th class="n">الدفع الإلكتروني</th><th class="n">التوصيل</th><th class="n">رسوم أخرى</th><th class="n">الصافي المستحق</th><th>موعد التحويل المتوقع</th><th class="n">وصل منه</th><th>الحالة</th></tr></thead><tbody>
    ${days.length ? days.map(x => `<tr><td class="num key">${dmy(x.date)} <span class="small muted">${dayName(x.date)}</span></td><td class="n">${x.src ? `<span class="small muted" title="من صفحة المبيعات (فودكس) — لم تُسجَّل في الكاشير">من المبيعات</span>` : `<span class="num">${x.n}</span>`}</td><td class="n">${money(x.sales)}${x.approx ? ` <span class="small muted">تقريبي</span>` : ""}</td><td class="n">${money(x.comm)}</td><td class="n">${money(x.pay)}</td><td class="n">${money(x.del)}</td><td class="n">${money(x.extra)}</td>
      <td class="n"><b>${money(x.net)}</b></td><td class="num">${dmy(x.due)}</td><td class="n">${money(x.recv)}</td><td><span class="chip ${PF_ST[x.st][0]}">${PF_ST[x.st][1]}</span></td></tr>`).join("")
      : `<tr><td colspan="11" class="empty">لا توجد طلبات ${esc(pf.name)} في ${rgShort()}</td></tr>`}
    <tr class="tot"><td>الإجمالي</td><td class="n num">${sum("n")}</td><td class="n">${money(sum("sales"))}</td><td class="n">${money(sum("comm"))}</td><td class="n">${money(sum("pay"))}</td><td class="n">${money(sum("del"))}</td><td class="n">${money(sum("extra"))}</td><td class="n">${money(sum("net"))}</td><td></td><td class="n">${money(sum("recv"))}</td><td></td></tr></tbody></table></div>
    <div class="bar" style="margin:18px 0 8px;border:0;padding:0"><h3 style="margin:0">التحويلات الواصلة من ${esc(pf.name)}</h3><button type="button" class="btn sm" id="pf_tr">تسجيل تحويل</button></div>
    <div class="tw"><table><thead><tr><th>تاريخ الوصول</th><th class="n">المبلغ</th><th>عن الفترة</th><th>ملاحظات</th></tr></thead><tbody>
    ${tr.length ? tr.map(x => `<tr class="click" data-app="${esc(x.id)}"><td class="num">${dmy(x.date)}${who(x.by)}</td><td class="n"><b>${money(n(x.amount))}</b></td><td class="num">${x.from ? dmy(x.from) : ""}${x.to ? " ← " + dmy(x.to) : ""}</td><td>${esc(x.notes || "")}</td></tr>`).join("") : `<tr><td colspan="4" class="empty">لا توجد تحويلات في ${rgShort()}</td></tr>`}</tbody></table></div>
    <p class="foot" style="margin-top:10px">الصافي = المبيعات − الرسوم حسب العقد الساري يوم الطلب، محسوباً طلباً طلباً من الكاشير. ${pf.id === PF_SALES_APP ? "الأيام التي لم تُسجَّل طلباتها في الكاشير تؤخذ من صفحة المبيعات (خانة تطبيقات التوصيل) وتظهر «من المبيعات»." : ""} التحويلات الواصلة تُخصم من أقدم الأيام أولاً. «متأخر» = مرّ موعد التحويل المتوقع بيومين ولم يصل. اكتب اسم التطبيق في التحويل كما هو (${esc(pf.name)}) ليُحتسب له.</p>`;
  $("#pf_tr").onclick = () => S.testView ? toast("في عرض التجربة لا تُسجَّل تحويلات؛ أغلق عرض التجربة أولاً") : openApp(null, {app: pf.name});
  el.querySelectorAll("[data-app]").forEach(tr => tr.onclick = () => openApp(tr.dataset.app));
}

/* ---- contract ---- */
function pfContractTab(pf, el){
  const cs = [...(pf.contracts || [])].sort((a, b) => (a.from || "") < (b.from || "") ? 1 : -1), cur = pfContract(pf, today());
  const row = (l, v) => v === "" || v == null ? "" : `<tr><td class="muted">${l}</td><td>${v}</td></tr>`;
  el.innerHTML = `<div class="actions" style="margin:0 0 12px"><button type="button" class="btn sm" id="pf_cnew">+ عقد جديد</button><span class="small muted">ترسل العقد لـ Claude فيعطيك نصّه جاهزاً تلصقه بزر «لصق من Claude»، أو أدخله يدوياً.</span></div>
    ${cs.length ? cs.map(c => `<div class="card" style="margin-bottom:12px"><div class="bar" style="margin:0 0 8px;border:0;padding:0"><h3 style="margin:0">عقد ${c.from ? "من " + dmy(c.from) : ""}${c.to ? " إلى " + dmy(c.to) : ""} ${c === cur ? '<span class="chip ok">الساري</span>' : c.from > today() ? '<span class="chip info">لم يبدأ</span>' : '<span class="chip">منتهٍ</span>'}</h3><button type="button" class="btn ghost sm" data-cedit="${esc(c.id)}">تعديل</button></div>
      <div class="tw"><table><tbody>
        ${row("رقم العقد", esc(c.ref || ""))}
        ${row("عمولة المنصة", n(c.commissionPct) ? `<b class="num">${n(c.commissionPct)}%</b> من إجمالي الطلب` : "")}
        ${row("رسوم الدفع الإلكتروني", n(c.paymentPct) ? `<b class="num">${n(c.paymentPct)}%</b> من إجمالي الطلب` : "")}
        ${row("التوصيل على المطعم", (c.tiers || []).length ? [...c.tiers].sort((a, b) => n(a[0]) - n(b[0])).map(([m, f], i, A) => `${i + 1 < A.length ? (i === 0 && !n(m) ? `أقل من <span class="num">${n(A[i + 1][0])}</span>` : `من <span class="num">${m}</span> إلى <span class="num">${r2(n(A[i + 1][0]) - 0.01)}</span>`) : `<span class="num">${m}</span> فأكثر`} ← <b class="num">${f}</b> ريال`).join("<br>") : "")}
        ${row("رسوم ثابتة لكل طلب", n(c.perOrder) ? `<b class="num">${fmt(n(c.perOrder))}</b>` : "")}
        ${row("إضافة HPlus", n(c.hplus) ? `<b class="num">${n(c.hplus)}</b> ريال لطلبات عملاء HPlus (لا تظهر في الكاشير، تُطابق من الفاتورة)` : "")}
        ${row("دورة التحويل", pfCycleText(c))}
        ${row("حساب الاستلام", c.bank && (c.bank.owner || c.bank.bank || c.bank.iban) ? esc([c.bank.owner, c.bank.bank, c.bank.iban].filter(Boolean).join(" · ")) : "")}
        ${row("ملاحظات", c.notes ? `<span style="white-space:pre-wrap">${esc(c.notes)}</span>` : "")}
      </tbody></table></div><div class="att-row" id="pf_att_${esc(c.id)}"></div></div>`).join("") : `<div class="empty card">لا يوجد عقد بعد.</div>`}
    ${(pf.history || []).length ? `<details><summary class="small" style="cursor:pointer">سجل التعديلات (${pf.history.length})</summary><div class="small muted">${pf.history.map(h => `${when(h.at)} · ${h.action === "create" ? "إضافة" : "تعديل"} · ${esc(nm(h.by))}`).join("<br>")}</div></details>` : ""}`;
  $("#pf_cnew").onclick = () => pfContractDialog(pf, null);
  el.querySelectorAll("[data-cedit]").forEach(b => b.onclick = () => pfContractDialog(pf, (pf.contracts || []).find(c => c.id === b.dataset.cedit)));
  cs.forEach(async c => { const box = $("#pf_att_" + c.id); if (!box) return; const L = await loadAttachments(`platforms/${pf.id}/${c.id}`); if (L.length){ box.innerHTML = attThumbs(L); bindThumbs(box); } });
}
function pfContractDialog(pf, c){
  const x = c || {from: today(), tiers: [], cycleDays: 7};
  $("#sheet").innerHTML = `<form class="entry" id="pf_cf"><h3 style="margin:0">${c ? "تعديل عقد" : "عقد جديد"} · ${esc(pf.name)}</h3>
    <div class="fields">
      <div class="f"><label for="pc_from">يسري من</label><input id="pc_from" type="date" required value="${esc(x.from || "")}"></div>
      <div class="f"><label for="pc_to">ينتهي في <span class="muted">(اختياري)</span></label><input id="pc_to" type="date" value="${esc(x.to || "")}"></div>
      <div class="f"><label for="pc_ref">رقم العقد</label><input id="pc_ref" type="text" value="${esc(x.ref || "")}"></div>
      <div class="f"><label for="pc_comm">عمولة المنصة %</label><input id="pc_comm" type="number" step="0.01" min="0" max="100" inputmode="decimal" value="${has(x.commissionPct) ? x.commissionPct : ""}"></div>
      <div class="f"><label for="pc_pay">رسوم الدفع الإلكتروني %</label><input id="pc_pay" type="number" step="0.01" min="0" max="100" inputmode="decimal" value="${has(x.paymentPct) ? x.paymentPct : ""}"></div>
      <div class="f"><label for="pc_po">رسوم ثابتة لكل طلب</label><input id="pc_po" type="number" step="0.01" min="0" inputmode="decimal" value="${has(x.perOrder) && n(x.perOrder) ? x.perOrder : ""}"></div>
      <div class="f wide"><label for="pc_tiers">التوصيل على المطعم حسب قيمة الطلب <span class="muted">(سطر لكل شريحة: من قيمة : الرسوم — مثال 40:8)</span></label><textarea id="pc_tiers" rows="4" dir="ltr" style="text-align:right">${esc((x.tiers || []).map(([m, f]) => `${m}:${f}`).join("\n"))}</textarea></div>
      <div class="f"><label for="pc_hp">إضافة HPlus أو ما يشبهها</label><input id="pc_hp" type="number" step="0.01" min="0" inputmode="decimal" value="${has(x.hplus) && n(x.hplus) ? x.hplus : ""}"></div>
      <div class="f"><label for="pc_cy">دورة التحويل</label><select id="pc_cy">${PF_CYCLES.map(([d, l]) => `<option value="${d}" ${n(x.cycleDays) === d ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="f pc-semi"><label for="pc_p1">يوم تحويل مبيعات 1–15</label><input id="pc_p1" type="number" min="1" max="31" inputmode="numeric" value="${n(x.payDay1) || ""}"></div>
      <div class="f pc-semi"><label for="pc_p2">يوم تحويل مبيعات 16–آخر الشهر <span class="muted">(من الشهر التالي)</span></label><input id="pc_p2" type="number" min="1" max="31" inputmode="numeric" value="${n(x.payDay2) || ""}"></div>
      <div class="f"><label for="pc_bo">صاحب حساب الاستلام</label><input id="pc_bo" type="text" value="${esc((x.bank || {}).owner || "")}"></div>
      <div class="f"><label for="pc_bb">البنك</label><input id="pc_bb" type="text" value="${esc((x.bank || {}).bank || "")}"></div>
      <div class="f wide"><label for="pc_bi">الآيبان</label><input id="pc_bi" type="text" dir="ltr" value="${esc((x.bank || {}).iban || "")}"></div>
      <div class="f wide"><label for="pc_nt">ملاحظات وبنود مهمة</label><textarea id="pc_nt" rows="3">${esc(x.notes || "")}</textarea></div>
      ${attachField("pc_att", "ملف العقد (PDF أو صورة)")}
    </div>
    <div class="actions"><button class="btn" type="submit">حفظ العقد</button><button class="btn ghost" type="button" id="pc_x">إلغاء</button>${c ? '<button class="btn danger sm" type="button" id="pc_del">حذف العقد</button>' : ""}</div></form>`;
  $("#modal").classList.add("open"); $("#pc_x").onclick = closeModal;
  const semi = () => document.querySelectorAll(".pc-semi").forEach(e => e.hidden = $("#pc_cy").value !== "-1"); $("#pc_cy").onchange = semi; semi();
  const cid = c ? c.id : "c-" + Date.now().toString(36), att = attachController("pc_att", `platforms/${pf.id}/${cid}`); att.load(c ? `platforms/${pf.id}/${cid}` : null);
  if (c) armDelete($("#pc_del"), async () => { if (await pfSave(pf, {contracts:(pf.contracts || []).filter(z => z.id !== c.id)}, "تم حذف العقد")) closeModal(); });
  $("#pf_cf").onsubmit = async e => { e.preventDefault();
    const tiers = $("#pc_tiers").value.split(/\n|،|,/).map(s => s.trim()).filter(Boolean).map(s => s.split(/[:=\s]+/).map(Number)).filter(a => a.length >= 2 && !isNaN(a[0]) && !isNaN(a[1])).map(a => [a[0], a[1]]);
    const v = id => $(id).value === "" ? 0 : n($(id).value);
    const nc = {id:cid, from:$("#pc_from").value, to:$("#pc_to").value, ref:$("#pc_ref").value.trim(), commissionPct:v("#pc_comm"), paymentPct:v("#pc_pay"), perOrder:v("#pc_po"), tiers, hplus:v("#pc_hp"), cycleDays:n($("#pc_cy").value) || 7, payDay1:v("#pc_p1"), payDay2:v("#pc_p2"),
      bank:{owner:$("#pc_bo").value.trim(), bank:$("#pc_bb").value.trim(), iban:$("#pc_bi").value.trim()}, notes:$("#pc_nt").value.trim()};
    if (nc.cycleDays === -1 && !(nc.payDay1 >= 1 && nc.payDay1 <= 31 && nc.payDay2 >= 1 && nc.payDay2 <= 31)){ toast("اكتب يومي التحويل (من 1 إلى 31)"); return; }
    if (nc.to && nc.to < nc.from){ toast("تاريخ الانتهاء قبل تاريخ البدء"); return; }
    try { await att.flush(`platforms/${pf.id}/${cid}`); } catch(err){ toast(err && err.code === "pdf_unsupported" ? "ملف PDF غير مدعوم هنا؛ أرفق صورة للعقد" : "تعذّر حفظ المرفق"); }
    if (await pfSave(pf, {contracts:[...(pf.contracts || []).filter(z => z.id !== cid), nc]}, "تم حفظ العقد")) closeModal();
  };
}
function pfAddDialog(){
  $("#sheet").innerHTML = `<form class="entry" id="pf_af"><h3 style="margin:0">إضافة تطبيق توصيل</h3>
    <div class="fields"><div class="f wide"><label for="pa_n">اسم التطبيق</label><input id="pa_n" type="text" required placeholder="مثال: جاهز"></div>
    <div class="f wide"><label for="pa_k">طلباته في الكاشير</label><select id="pa_k"><option value="">لا تُسجَّل في الكاشير بعد</option><option value="lokit">نوع «لوكيت»</option><option value="hunger">نوع «هنقرستيشن»</option></select><span class="by">التطبيق الجديد يحتاج زراً خاصاً في الكاشير لتُحسب طلباته تلقائياً؛ اطلبه من Claude عند الحاجة.</span></div></div>
    <div class="actions"><button class="btn" type="submit">إضافة</button><button class="btn ghost" type="button" id="pa_x">إلغاء</button></div></form>`;
  $("#modal").classList.add("open"); $("#pa_x").onclick = closeModal;
  $("#pf_af").onsubmit = async e => { e.preventDefault(); const name = $("#pa_n").value.trim(); if (!name) return;
    if (pfByName(name)){ toast("هذا التطبيق موجود"); return; }
    const id = "p-" + Date.now().toString(36);
    if (await pfSave({id}, {name, posKey:$("#pa_k").value || "", aliases:[name], contracts:[], order:9}, "تمت إضافة التطبيق")){ S.pfSel = id; S.pfTab = "contract"; closeModal(); } };
}

/* ---- «لصق من Claude»: a contract (or later a settlement) prepared by Claude from a PDF or photo ---- */
function pfPasteDialog(){
  $("#sheet").innerHTML = `<div class="entry"><h3 style="margin:0">لصق من Claude</h3>
    <p class="small muted" style="margin:0">أرسل لـ Claude عقد شركة التوصيل أو فاتورتها (PDF أو صورة أو Excel)، وانسخ النص الذي يعطيك إياه والصقه هنا.</p>
    <textarea id="pp_t" rows="8" dir="ltr" placeholder='{"aqeela":"contract", ...}'></textarea><div id="pp_out"></div>
    <div class="actions"><button class="btn" type="button" id="pp_go">قراءة</button><button class="btn ghost" type="button" id="pp_x">إغلاق</button></div></div>`;
  $("#modal").classList.add("open"); $("#pp_x").onclick = closeModal;
  $("#pp_go").onclick = () => {
    let J; try { const t = $("#pp_t").value.trim(), i = t.indexOf("{"), j = t.lastIndexOf("}"); J = JSON.parse(t.slice(i, j + 1)); } catch(e){ $("#pp_out").innerHTML = '<div class="note warn">النص غير مكتمل. انسخه كاملاً من رسالة Claude.</div>'; return; }
    if (J.aqeela === "contract" && J.contract){
      const c = J.contract, pf = pfByName(J.platform);
      $("#pp_out").innerHTML = `<div class="note"><b>عقد ${esc(J.platform || "")}</b>${pf ? "" : ' <span class="neg">(تطبيق غير موجود — سيُضاف)</span>'}<br>
        يسري من <span class="num">${dmy(c.from || "")}</span> · ${pfSummary(c)} · دورة التحويل: ${pfCycleText(c)}${c.ref ? ` · رقم ${esc(c.ref)}` : ""}${c.notes ? `<div class="small muted" style="margin-top:6px;white-space:pre-wrap">${esc(c.notes)}</div>` : ""}</div>
        <div class="actions"><button class="btn" type="button" id="pp_save">حفظ العقد</button></div>`;
      $("#pp_save").onclick = async () => {
        let p = pf; if (!p){ p = {id:"p-" + Date.now().toString(36)}; }
        const cid = c.id || "c-" + (c.from || today()) ;
        const nc = {id:cid, from:c.from || today(), to:c.to || "", ref:c.ref || "", commissionPct:n(c.commissionPct), paymentPct:n(c.paymentPct), perOrder:n(c.perOrder), tiers:(c.tiers || []).map(a => [n(a[0]), n(a[1])]), hplus:n(c.hplus), cycleDays:n(c.cycleDays) || 7, payDay1:n(c.payDay1), payDay2:n(c.payDay2), bank:c.bank || {}, notes:c.notes || ""};
        const patch = pf ? {contracts:[...(pf.contracts || []).filter(z => z.id !== cid && z.from !== nc.from), nc]} : {name:J.platform, posKey:J.posKey || "", aliases:[J.platform], contracts:[nc], order:9};
        if (await pfSave(p, patch, "تم حفظ العقد")){ S.pfSel = p.id; S.pfTab = "contract"; closeModal(); renderPlatforms(); }
      };
    } else if (J.aqeela === "settlement"){
      $("#pp_out").innerHTML = '<div class="note">قراءة فواتير التسوية تُضاف عند وصول أول فاتورة حقيقية من المنصة، لتُبنى على شكلها بدقة. احتفظ بالنص وأرسل الفاتورة لـ Claude.</div>';
    } else $("#pp_out").innerHTML = '<div class="note warn">هذا النص ليس من صيغة برنامج المحاسبة.</div>';
  };
}

/* ---- menu: restaurant price vs platform price, from the cashier's menu ---- */
function pfMenu(pf, el){
  const M = (S.pos.menu || []).filter(m => m.active !== false).sort((a, b) => (a.cat || "") < (b.cat || "") ? -1 : (a.cat || "") > (b.cat || "") ? 1 : n(a.sort) - n(b.sort));
  if (!pf.posKey){ el.innerHTML = `<div class="note">${esc(pf.name)} غير مربوط بالكاشير بعد، فلا يوجد له منيو.</div>`; return; }
  const c = pfContract(pf, today()), pctFee = c ? (n(c.commissionPct) + n(c.paymentPct)) / 100 : 0;
  const rows = M.map(m => { const rp = n(m.price), ap = m[pf.posKey]; const has2 = ap != null && ap !== "";
    const net = has2 ? r2(n(ap) * (1 - pctFee)) : null, cost = n(m.cost);
    return `<tr><td>${esc(m.name)}</td><td class="n">${rp ? money(rp) : "—"}</td><td class="n">${has2 ? `<b>${money(n(ap))}</b>` : '<span class="neg">غير مُسعّر</span>'}</td>
      <td class="n num">${has2 && rp ? (n(ap) >= rp ? "+" : "") + pct((n(ap) - rp) / rp) : ""}</td><td class="n">${net != null ? money(net) : ""}</td><td class="n">${cost ? money(cost) : "—"}</td>
      <td class="n">${net != null && rp ? `<span class="${net - rp >= 0 ? "pos" : "neg"}">${net - rp >= 0 ? "+" : ""}${fmt(net - rp)}</span>` : ""}</td></tr>`; }).join("");
  el.innerHTML = `<div class="tw stick"><table><thead><tr><th>الصنف</th><th class="n">سعر المطعم</th><th class="n">سعر ${esc(pf.name)}</th><th class="n">الزيادة</th><th class="n">يصلك بعد ${pct(pctFee)}</th><th class="n">تكلفة الطعام</th><th class="n">مقارنة بالمطعم</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="foot" style="margin-top:10px">المنيو يُقرأ مباشرة من الكاشير: أي صنف أو سعر تضيفه هناك يظهر هنا. «يصلك» = سعر التطبيق بعد العمولة ورسوم الدفع فقط؛ التوصيل يُخصم مرة على الطلب كله (انظر تقرير الأصناف).</p>`;
}

/* ---- monthly item report: what the platform sold, what it would have brought sold directly, and what it actually paid ---- */
/* the platform's share of an item: what it ordered of the item ÷ all that was sold of it (platform + cashier) */
const pfShare = (a, d) => { const n = a + d; if (!n) return "—"; const p = a / n * 100;
  return `<div class="pf-sh"><span class="pf-pc num">${p < 10 ? p.toFixed(1) : Math.round(p)}%</span><span class="pf-bar"><i style="width:${Math.max(p, 2).toFixed(1)}%"></i></span></div><div class="pf-shs">${fmt0(a)} من ${fmt0(n)}</div>`; };
(function(){ const c = document.createElement("style"); c.textContent = `
.pf-sh{display:flex;align-items:center;gap:8px;justify-content:flex-end}
.pf-pc{font-weight:700;min-width:42px;text-align:left}
.pf-bar{width:64px;height:6px;background:var(--line);border-radius:9px;overflow:hidden;display:inline-block;flex:none}
.pf-bar i{display:block;height:100%;background:var(--red);border-radius:9px;margin-left:auto}
.pf-shs{font-size:11px;color:var(--muted);text-align:left;margin-top:2px}
th.pf-shh{color:var(--red)}`; document.head.appendChild(c); })();
function pfItems(pf, R){
  const P = S.pos, {orders:PO, sday} = posSrc(), menu = new Map((P.menu || []).map(m => [m.id, m]));
  const by = new Map(), get = (l) => { const k = l.ref || l.id || l.name; if (!by.has(k)) by.set(k, {k, name:l.name, qA:0, sA:0, fees:0, del:0, pack:0, food:0, direct:0, qD:0, sD:0}); return by.get(k); };
  const priceOf = id => { const m = menu.get(id); return m ? n(m.price) : null; };
  let miss = 0;
  for (const o of PO){
    if (!posTestOk(o) || o.status !== "paid") continue;
    const day = pfDayOf(o, sday); if (!inR(day, R)) continue;
    const lines = o.lines || [], sub = lines.reduce((a, l) => a + n(l.total), 0) || 1, t = n(o.total);
    const isA = o.method === pf.posKey;
    const c = isA ? pfContract(pf, day) : null, f = isA ? pfFee(c, t) : null, pack = n(o.cogs && o.cogs.pack);
    for (const l of lines){
      const x = get(l), share = n(l.total) / sub, val = t * share, q = n(l.qty);
      if (isA){
        x.qA += q; x.sA += val; x.fees += f.comm * share + f.pay * share; x.del += (f.del + f.extra) * share; x.pack += pack * share;
        x.food += (n(l.cost) + (l.mods || []).reduce((a, m) => a + n(m.cost), 0)) * q;
        const rp = priceOf(l.id), mp = (l.mods || []).reduce((a, m) => a + (priceOf(m.id) ?? 0), 0);
        if (rp == null) miss++; x.direct += ((rp ?? n(l.price)) + mp) * q;
      } else if (!["lokit","hunger"].includes(o.method)){ x.qD += q; x.sD += val; }
    }
  }
  const L = [...by.values()].filter(x => x.qA).map(x => { const got = x.sA - x.fees - x.del; return {...x, got, diff: got - x.direct, profit: got - x.food - x.pack}; });
  return {L, miss};
}
function pfReport(pf, el){
  if (!pf.posKey){ el.innerHTML = `<div class="note">${esc(pf.name)} غير مربوط بالكاشير بعد.</div>`; return; }
  const R = curR(), p3 = new Date(S.y, S.m - 4, 1), a0 = iso(p3) < R[0] ? iso(p3) : R[0];
  /* the period and the three months before it: older orders than the live window are read once, then the report is drawn */
  if (!S.testView && posOldMissing(a0, R[1])){ el.innerHTML = '<div class="empty card">جارٍ قراءة طلبات الفترة من الكاشير…</div>';
    if (!S.pfOldBusy){ S.pfOldBusy = true; posOldLoad(a0, R[1]).then(() => { S.pfOldBusy = false; if (el.isConnected) pfReport(pf, el); }, e => { S.pfOldBusy = false; el.innerHTML = `<div class="note warn">تعذّرت القراءة (${esc(e && (e.code || e.message) || e)}).</div>`; }); } return; }
  const {L, miss} = pfItems(pf, R), sort = S.pfSort || "diff";
  L.sort((a, b) => sort === "qty" ? b.qA - a.qA : sort === "profit" ? b.profit - a.profit : b.diff - a.diff);
  const T = k => r2(L.reduce((a, x) => a + n(x[k]), 0));
  const prev = [1, 2, 3].map(k => { const d = new Date(S.y, S.m - 1 - k, 1), r = monthRange(d.getFullYear(), d.getMonth() + 1), X = pfItems(pf, r).L; return {m:d.getMonth(), y:d.getFullYear(), sA:X.reduce((a, x) => a + x.sA, 0), got:X.reduce((a, x) => a + x.got, 0), direct:X.reduce((a, x) => a + x.direct, 0)}; }).filter(x => x.sA);
  const sg = v => `<span class="${v >= 0 ? "pos" : "neg"}">${v >= 0 ? "+" : ""}${fmt(v)}</span>`;
  el.innerHTML = `<div class="grid g4" style="margin-bottom:14px">
      <div class="kpi"><span class="l">مبيعات ${esc(pf.name)}</span><span class="v num">${fmt(T("sA"))}</span><span class="small muted">${fmt0(T("qA"))} صنف</span></div>
      <div class="kpi"><span class="l">لو بيعت مباشرة</span><span class="v num">${fmt(T("direct"))}</span><span class="small muted">بأسعار المطعم</span></div>
      <div class="kpi orange"><span class="l">العمولة والرسوم والتوصيل</span><span class="v num">${fmt(r2(T("fees") + T("del")))}</span><span class="small muted">النسبة الفعلية <span class="num">${T("sA") ? pct((T("fees") + T("del")) / T("sA")) : "—"}</span></span></div>
      <div class="kpi ${T("diff") >= 0 ? "green" : "orange"}"><span class="l">يصلك مقابل البيع المباشر</span><span class="v num">${T("diff") >= 0 ? "+" : ""}${fmt(T("diff"))}</span><span class="small muted">يصلك <span class="num">${fmt(T("got"))}</span></span></div></div>
    <div class="actions" style="margin:0 0 10px;justify-content:space-between"><div class="seg">${[["diff","الأربح مقابل المباشر"],["profit","صافي الربح"],["qty","الأكثر مبيعاً"]].map(([k, l]) => `<button type="button" data-pfs="${k}" class="${k === sort ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="actions" style="margin:0"><button type="button" class="btn ghost sm" id="pf_xl">Excel</button><button type="button" class="btn ghost sm" id="pf_pdf">PDF / طباعة</button></div></div>
    ${L.length ? `<div class="tw stick"><table id="pf_rt"><thead><tr><th>الصنف</th><th class="n">الكمية عبر التطبيق</th><th class="n pf-shh">حصة التطبيق من الصنف</th><th class="n">مبيعات التطبيق</th><th class="n">لو بيعت مباشرة</th><th class="n">العمولة والرسوم</th><th class="n">التوصيل</th><th class="n">يصلك</th><th class="n">الفرق</th><th class="n">صافي الربح</th></tr></thead><tbody>
      ${L.map(x => `<tr><td>${esc(x.name)}</td><td class="n num">${fmt0(x.qA)}</td><td class="n pf-shc">${pfShare(x.qA, x.qD)}</td><td class="n">${money(x.sA)}</td><td class="n">${money(x.direct)}</td><td class="n">${money(x.fees)}</td><td class="n">${money(x.del)}</td><td class="n"><b>${money(x.got)}</b></td><td class="n">${sg(x.diff)}</td><td class="n">${sg(x.profit)}</td></tr>`).join("")}
      <tr class="tot"><td>الإجمالي</td><td class="n num">${fmt0(T("qA"))}</td><td class="n pf-shc">${pfShare(T("qA"), T("qD"))}</td><td class="n">${money(T("sA"))}</td><td class="n">${money(T("direct"))}</td><td class="n">${money(T("fees"))}</td><td class="n">${money(T("del"))}</td><td class="n">${money(T("got"))}</td><td class="n">${sg(T("diff"))}</td><td class="n">${sg(T("profit"))}</td></tr></tbody></table></div>`
      : `<div class="empty card">لا توجد أصناف مباعة عبر ${esc(pf.name)} في ${rgShort()}.</div>`}
    ${prev.length ? `<h3 style="margin:18px 0 8px">مقارنة بالأشهر السابقة</h3><div class="tw"><table><thead><tr><th>الشهر</th><th class="n">مبيعات التطبيق</th><th class="n">يصلك</th><th class="n">لو بيعت مباشرة</th><th class="n">الفرق</th></tr></thead><tbody>
      <tr><td><b>${rgShort()}</b></td><td class="n">${money(T("sA"))}</td><td class="n">${money(T("got"))}</td><td class="n">${money(T("direct"))}</td><td class="n">${sg(T("diff"))}</td></tr>
      ${prev.map(p => `<tr><td>${MONTHS[p.m]} ${p.y}</td><td class="n">${money(p.sA)}</td><td class="n">${money(p.got)}</td><td class="n">${money(p.direct)}</td><td class="n">${sg(p.got - p.direct)}</td></tr>`).join("")}</tbody></table></div>` : ""}
    <p class="foot" style="margin-top:10px">«حصة التطبيق من الصنف» = ما طُلب من الصنف عبر التطبيق ÷ كل ما بِيع منه (التطبيق + الكاشير) في نفس الفترة. «لو بيعت مباشرة» = كمية التطبيق نفسها بسعر المطعم في الكاشير. «يصلك» = مبيعات التطبيق − العمولة ورسوم الدفع − التوصيل (يُوزَّع على أصناف الطلب حسب قيمتها). «الفرق» موجب = التطبيق أربح من البيع المباشر. «صافي الربح» = يصلك − تكلفة الطعام − التغليف.${miss ? ` ${miss} صنف بلا سعر مطعم، حُسب بسعره في التطبيق.` : ""}</p>`;
  el.querySelectorAll("[data-pfs]").forEach(b => b.onclick = () => { S.pfSort = b.dataset.pfs; renderPlatforms(); });
  const rowsX = () => L.map(x => ({"الصنف":x.name, "الكمية عبر التطبيق":x.qA, "حصة التطبيق من الصنف %":(x.qA + x.qD) ? Math.round(x.qA / (x.qA + x.qD) * 1000) / 10 : 0, "من إجمالي الكمية":x.qA + x.qD, "مبيعات التطبيق":r2(x.sA), "لو بيعت مباشرة":r2(x.direct), "العمولة والرسوم":r2(x.fees), "التوصيل":r2(x.del), "يصلك":r2(x.got), "الفرق":r2(x.diff), "صافي الربح":r2(x.profit)}));
  $("#pf_xl").onclick = async () => { try { const X = await loadXLSX(), wb = X.utils.book_new(), ws = X.utils.json_to_sheet(rowsX()); ws["!cols"] = Object.keys(rowsX()[0] || {a:1}).map(() => ({wch:16})); X.utils.book_append_sheet(wb, ws, "الأصناف");
      const out = X.write(wb, {bookType:"xlsx", type:"array"}), dl = await window.claude.use("downloads"); await dl.save({filename:`${pf.name}-أصناف-${S.y}-${String(S.m).padStart(2, "0")}.xlsx`, data:new Blob([out], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})}); } catch(e){ toast("تعذّر التصدير"); } };
  $("#pf_pdf").onclick = () => { const t = $("#pf_rt"); if (!t) return; const w = window.open("", "_blank"); if (!w){ toast("اسمح بالنوافذ المنبثقة للطباعة"); return; }
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(pf.name)} · ${rgShort()}</title><style>body{font-family:system-ui,sans-serif;padding:16px;color:#111}h1{font-size:18px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #ccc;padding:4px 6px;text-align:right}th{background:#f3f3f3}.n{text-align:left}.pos{color:#1b5e20}.neg{color:#b3261e}tr.tot td{font-weight:700;background:#fafafa}@page{size:A4 landscape;margin:10mm}</style></head><body><h1>تقرير أصناف ${esc(pf.name)} · ${rgShort()}</h1><p>مبيعات التطبيق ${fmt(T("sA"))} · لو بيعت مباشرة ${fmt(T("direct"))} · يصلك ${fmt(T("got"))} · الفرق ${fmt(T("diff"))}</p>${t.outerHTML}<script>setTimeout(function(){print()},400)<\/script></body></html>`); w.document.close(); };
}

VIEWS.platforms = {v:viewPlatforms, bind:bindPlatforms, list:renderPlatforms};
