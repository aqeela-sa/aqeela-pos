/* ---------- الوصفات والمخزون: مكونات المطبخ، وصفة كل صنف، والمخزون الحي، والفرق بين الاستهلاك النظري والفعلي ----------
   Runs inside the accounting page (same globals as the main script).
   Data:  acc_ingredients/{id} = {name, unit, price, min, aliases[]}          raw materials (chicken, bread, garlic sauce…)
          acc_recipes/{menuId}  = {name, lines:[{ing, q}]}                     what one unit of a cashier item uses
          acc_ingCounts/{id}    = {date, qty:{ingId:n}, notes}                 a count dated D is the stock at the END of day D
          invoices[].items      = [{ing, q, a}]                                what an invoice brought in (quantity, amount)
   Consumption is worked out from the cashier's paid orders × the recipes, by business day. Nothing here posts to the books:
   production cost stays from the invoices; this is the control layer (what should be on the shelf, and what went missing). */

const KT_UNITS = ["كجم","جرام","لتر","مل","حبة","علبة","كرتون","ربطة","كيس","قطعة"];
const ktIng = id => (S.ingredients || []).find(x => x.id === id);
const ktCounts = () => [...(S.ingCounts || [])].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const ktQ = v => { const x = Math.round(n(v) * 1000) / 1000; return x.toLocaleString("en-US", {maximumFractionDigits:3}); };
const ktKey = s => normName(String(s || "")).replace(/[ًٌٍَُِّْـ]/g, "").replace(/[إأآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim().toLowerCase();
/* an ingredient by any of its names (its name or an alias), for what Claude reads off an invoice or a recipe list */
function ktFind(name){ const k = ktKey(name); if (!k) return null;
  return (S.ingredients || []).find(x => ktKey(x.name) === k || (x.aliases || []).some(a => ktKey(a) === k)) || null; }

/* the items an invoice brought in, with the invoice's date */
function ktInItems(a, b){
  const out = [];
  for (const x of (S.invoices || [])) if (!x.deleted && Array.isArray(x.items) && x.date >= a && x.date <= b) for (const it of x.items) if (it && it.ing && n(it.q) > 0) out.push({...it, date:x.date, inv:x});
  return out;
}
/* unit price of an ingredient on day d: its latest invoice line on or before d (amount ÷ quantity), else the price set by hand */
function ktPrice(ing, d){
  const L = ktInItems("0000-00-00", d || today()).filter(it => it.ing === ing.id && n(it.a) > 0).sort((p, q) => p.date < q.date ? -1 : 1);
  const last = L[L.length - 1]; return last ? n(last.a) / n(last.q) : n(ing.price);
}
const ktRecipe = menuId => { const r = (S.recipes || new Map()).get(menuId); return r && !r.deleted && Array.isArray(r.lines) ? r.lines.filter(l => l.ing && n(l.q) > 0) : []; };
const ktRecipeCost = (menuId, d) => sumBy(ktRecipe(menuId), l => { const g = ktIng(l.ing); return g ? n(l.q) * ktPrice(g, d) : 0; });

/* what the cashier's paid orders of business days a..b used, by ingredient; and how much of the sales had a recipe */
function ktCons(a, b){
  const use = new Map(), out = {use, qty:0, qtyR:0, amt:0, amtR:0, noRec:new Map()};
  if (!S.pos || !S.pos.ready || a > b) return out;
  const {orders, sday} = posSrc();
  for (const o of orders){
    if (o.test || o.status !== "paid") continue;
    const d = pfDayOf(o, sday); if (!d || d < a || d > b) continue;
    /* each line and each of its add-ons (an add-on is a cashier item too, with its own recipe) */
    for (const l of (o.lines || [])) for (const u of [l, ...(l.mods || [])]){
      const q = n(l.qty), id = u.id || u.ref, R = ktRecipe(id), v = n(u.price) * q;
      out.qty += q; out.amt += v;
      if (!R.length){ if (u === l || v > 0){ const m = out.noRec.get(id) || {id, name:u.name || "", q:0, v:0}; m.q += q; m.v += v; out.noRec.set(id, m); } continue; }
      out.qtyR += q; out.amtR += v;
      for (const r of R) use.set(r.ing, (use.get(r.ing) || 0) + q * n(r.q));
    }
  }
  return out;
}
const ktIn = (a, b) => { const m = new Map(); for (const it of ktInItems(a, b)) m.set(it.ing, (m.get(it.ing) || 0) + n(it.q)); return m; };
/* the business days whose orders the window does not hold yet: read once, then the page draws again */
function ktNeedOld(a, el, redraw){
  if (!S.pos || !S.pos.ready || S.testView || !posOldMissing(a, today())) return false;
  el.innerHTML = '<div class="empty card">جارٍ قراءة طلبات الفترة من الكاشير…</div>';
  if (!S.ktOldBusy){ S.ktOldBusy = true; posOldLoad(a, today()).then(() => { S.ktOldBusy = false; if (el.isConnected) redraw(); }, e => { S.ktOldBusy = false; el.innerHTML = `<div class="note warn">تعذّرت القراءة (${esc(e && (e.code || e.message) || e)}).</div>`; }); }
  return true;
}
/* stock of each ingredient at the end of day d: its last count on or before d, plus what came in, less what the sales used */
function ktStock(d){
  const C = ktCounts().filter(c => c.date <= d), res = new Map();
  for (const g of (S.ingredients || [])){
    const c = [...C].reverse().find(x => has((x.qty || {})[g.id]));
    if (!c){ res.set(g.id, null); continue; }
    const from = addDays(c.date, 1);
    res.set(g.id, {count:c, base:n(c.qty[g.id]), from, inQ:0, use:0});
  }
  const froms = [...res.values()].filter(Boolean).map(x => x.from).sort();
  if (froms.length){ const a = froms[0], cons = new Map(), ins = new Map();
    /* per distinct start day (counts differ by ingredient), work the sums once */
    for (const f of [...new Set(froms)]){ cons.set(f, ktCons(f, d).use); ins.set(f, ktIn(f, d)); }
    for (const [id, x] of res) if (x){ x.inQ = ins.get(x.from).get(id) || 0; x.use = cons.get(x.from).get(id) || 0; x.qty = x.base + x.inQ - x.use; }
    res.firstFrom = a; }
  return res;
}

/* ================= the page ================= */
function viewKitchen(){
  const t = S.ktTab || "live";
  return `<div class="bar"><h2>الوصفات والمخزون</h2></div>${readonlyNote()}
    <div class="actions" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><div class="seg" role="tablist" aria-label="القسم">
      ${[["live","المخزون الحي"],["po","طلبات الشراء"],["recipes","الوصفات"],["var","الفرق: النظري والفعلي"],["ings","المكونات"]].map(([k, l]) => `<button type="button" data-ktt="${k}" class="${t === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="actions">${S.canWrite ? `<button class="btn" type="button" id="kt_count">تسجيل جرد</button><button class="btn ghost" type="button" id="kt_ing">مكوّن جديد</button>` : ""}${S.canEdit ? `<button class="btn ghost" type="button" id="kt_paste">لصق من Claude</button>` : ""}</div></div>
    <div id="list"></div>`;
}
function bindKitchen(){
  document.querySelectorAll("[data-ktt]").forEach(b => b.onclick = () => { S.ktTab = b.dataset.ktt; render(); });
  if ($("#kt_count")) $("#kt_count").onclick = () => ktOpenCount();
  if ($("#kt_ing")) $("#kt_ing").onclick = () => ktOpenIng();
  if ($("#kt_paste")) $("#kt_paste").onclick = ktPaste;
}
function renderKitchen(){
  const el = $("#list"); if (!el) return;
  const t = S.ktTab || "live";
  if (!S.pos || !S.pos.ready){ el.innerHTML = '<div class="empty card">جارٍ تحميل بيانات الكاشير…</div>'; return; }
  if (t === "ings") return ktIngs(el);
  if (t === "recipes") return ktRecipes(el);
  if (t === "var") return ktVar(el);
  if (t === "po") return ktPO(el);
  return ktLive(el);
}

function ktLive(el){
  const G = S.ingredients || [];
  if (!G.length){ el.innerHTML = `<div class="empty card"><b>ابدأ بإضافة مكونات المطبخ</b><br>الدجاج، الخبز، الثوم، البطاطس، الصوصات… ثم اكتب لكل صنف في الكاشير وصفته، وسجّل أول جرد. من بعدها يحسب البرنامج الرصيد بنفسه من المبيعات والفواتير.<br><span class="small muted">أسرع طريقة: أرسل لـ Claude المكونات والوصفات كما تعرفها، والصق النص الذي يعطيك إياه من زر «لصق من Claude».</span></div>`; return; }
  const d = today(), C = ktCounts(), first = C.find(c => G.some(g => has((c.qty || {})[g.id])));
  if (first && ktNeedOld(addDays(first.date, 1), el, renderKitchen)) return;
  const st = ktStock(d), a14 = addDays(d, -13), use14 = ktCons(a14, d), dRate = id => (use14.use.get(id) || 0) / 14;
  const rows = G.map(g => { const x = st.get(g.id), rate = dRate(g.id), q = x ? x.qty : null, left = q != null && rate > 0 ? q / rate : null, p = ktPrice(g, d);
    const lv = q == null ? null : q <= 0 ? "bad" : (n(g.min) > 0 && q <= n(g.min)) || (left != null && left < 1.5) ? "warn" : "ok";
    return {g, x, q, rate, left, p, val: q != null ? Math.max(0, q) * p : 0, lv}; })
    .sort((p, q) => ({bad:0, warn:1, ok:2, null:3})[p.lv] - ({bad:0, warn:1, ok:2, null:3})[q.lv] || (p.left ?? 1e9) - (q.left ?? 1e9));
  const cov = ktCons(addDays(d, -29), d), covPct = cov.amt > 0 ? cov.amtR / cov.amt : 0, low = rows.filter(r => r.lv === "warn" || r.lv === "bad");
  const LV = {ok:["كافٍ","ok"], warn:["اطلب قريباً","warn"], bad:["نفد أو سالب","bad"]};
  el.innerHTML = `<div class="grid g4" style="margin-bottom:14px">
      <div class="kpi"><span class="l">قيمة المخزون الآن</span><span class="v num">${fmt(sumBy(rows, r => r.val))}</span><span class="small muted">بسعر آخر شراء لكل مكوّن</span></div>
      <div class="kpi ${low.length ? "warn" : ""}"><span class="l">مكونات تحتاج طلب</span><span class="v num">${low.length}</span><span class="small muted">${low.slice(0, 3).map(r => esc(r.g.name)).join("، ") || "لا شيء الآن"}</span></div>
      <div class="kpi"><span class="l">مبيعات لها وصفات (30 يوماً)</span><span class="v num">${pct(covPct)}</span><span class="small muted">كلما اقتربت من 100% كان الرصيد أدق</span></div>
      <div class="kpi"><span class="l">آخر جرد</span><span class="v num">${C.length ? dmy(C[C.length - 1].date) : "—"}</span><span class="small muted">${C.length ? `${C.length} جرد مسجّل` : "سجّل أول جرد ليبدأ الحساب"}</span></div></div>
    ${covPct < 0.95 && cov.noRec.size ? `<div class="note warn" style="margin-bottom:12px">أصناف تُباع بلا وصفة، فلا يُخصم ما تستهلكه: ${[...cov.noRec.values()].sort((p, q) => q.v - p.v).slice(0, 6).map(m => `<b>${esc(m.name)}</b>`).join("، ")}. أكملها من تبويب «الوصفات».</div>` : ""}
    <div class="card tw"><table><thead><tr><th>المكوّن</th><th class="n">الرصيد المتوقع</th><th class="n">آخر جرد</th><th class="n">وارد منذ الجرد</th><th class="n">استهلاك المبيعات منذ الجرد</th><th class="n">متوسط يومي</th><th class="n">يكفي</th><th>الحالة</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="click" data-kting="${esc(r.g.id)}"><td><b>${esc(r.g.name)}</b><small class="muted"> ${esc(r.g.unit || "")}</small></td>
      <td class="n">${r.q == null ? `<span class="muted">لا جرد</span>` : `<b class="num">${ktQ(r.q)}</b>`}</td>
      <td class="n">${r.x ? `<span class="num">${ktQ(r.x.base)}</span><br><small class="muted num">${dmy(r.x.count.date)}</small>` : "—"}</td>
      <td class="n num">${r.x ? ktQ(r.x.inQ) : "—"}</td><td class="n num">${r.x ? ktQ(r.x.use) : "—"}</td>
      <td class="n num">${r.rate ? ktQ(r.rate) : "—"}</td><td class="n">${r.left == null ? "—" : `<span class="num">${r.left >= 1 ? Math.floor(r.left) : "أقل من 1"}</span> يوم`}</td>
      <td>${r.lv ? `<span class="pill ${LV[r.lv][1]}">${LV[r.lv][0]}</span>` : "—"}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">الرصيد المتوقع = آخر جرد + ما دخل بالفواتير (أصناف المخزون في الفاتورة) − ما استهلكته مبيعات الكاشير حسب الوصفات. «اطلب قريباً» عند بلوغ الحد الأدنى أو حين لا يكفي ليوم ونصف.</p>`;
  el.querySelectorAll("[data-kting]").forEach(tr => tr.onclick = () => ktOpenIng(tr.dataset.kting));
}

function ktIngs(el){
  const G = S.ingredients || [], d = today(), m0 = addDays(d, -29), ins = ktIn(m0, d);
  el.innerHTML = G.length ? `<div class="card tw"><table><thead><tr><th>المكوّن</th><th>الوحدة</th><th class="n">سعر الوحدة</th><th>مصدر السعر</th><th class="n">الحد الأدنى</th><th class="n">الوارد (30 يوماً)</th><th>أسماء أخرى</th></tr></thead><tbody>
    ${G.map(g => { const fromInv = ktInItems("0000-00-00", d).some(it => it.ing === g.id && n(it.a) > 0);
      return `<tr class="click" data-kting="${esc(g.id)}"><td><b>${esc(g.name)}</b></td><td>${esc(g.unit || "")}</td><td class="n">${money(ktPrice(g, d))}</td><td class="small muted">${fromInv ? "آخر فاتورة" : "مُدخل يدوياً"}</td>
        <td class="n num">${n(g.min) ? ktQ(g.min) : "—"}</td><td class="n num">${ktQ(ins.get(g.id) || 0)}</td><td class="small muted">${esc((g.aliases || []).join("، "))}</td></tr>`; }).join("")}</tbody></table></div>`
    : `<div class="empty card">لا توجد مكونات بعد. أضفها من «مكوّن جديد» أو «لصق من Claude».</div>`;
  el.querySelectorAll("[data-kting]").forEach(tr => tr.onclick = () => ktOpenIng(tr.dataset.kting));
}

function ktRecipes(el){
  const d = today(), R = [addDays(d, -29), d];
  if (ktNeedOld(R[0], el, renderKitchen)) return;
  const sold = new Map(); { const {orders, sday} = posSrc();
    for (const o of orders){ if (o.test || o.status !== "paid") continue; const dd = pfDayOf(o, sday); if (!dd || dd < R[0] || dd > R[1]) continue;
      for (const l of (o.lines || [])) for (const u of [l, ...(l.mods || [])]){ const id = u.id || u.ref, m = sold.get(id) || {q:0, v:0}; m.q += n(l.qty); m.v += n(u.price) * n(l.qty); sold.set(id, m); } } }
  const menu = (S.pos.menu || []).filter(m => !m.deleted && (m.active !== false || sold.has(m.id)));
  const rows = menu.map(m => { const s = sold.get(m.id) || {q:0, v:0}, rc = ktRecipe(m.id), cost = rc.length ? ktRecipeCost(m.id, d) : null, price = n(m.price);
    return {m, s, rc, cost, price, pc: cost != null && price > 0 ? cost / price : null}; }).sort((p, q) => q.s.v - p.s.v || (p.m.name < q.m.name ? -1 : 1));
  const tot = sumBy(rows, r => r.s.v), done = sumBy(rows.filter(r => r.rc.length), r => r.s.v);
  el.innerHTML = `<div class="note" style="margin-bottom:12px">الأصناف مرتبة حسب مبيعات آخر 30 يوماً. الأصناف التي لها وصفة تغطي <b class="num">${pct(tot ? done / tot : 0)}</b> من المبيعات. ابدأ بأعلاها مبيعاً.</div>
    <div class="card tw"><table><thead><tr><th>الصنف</th><th class="n">مبيعات 30 يوماً</th><th class="n">الكمية</th><th>الوصفة</th><th class="n">تكلفة الوصفة</th><th class="n">سعر البيع</th><th class="n">نسبة التكلفة</th></tr></thead><tbody>
    ${rows.map(r => `<tr class="click" data-ktrec="${esc(r.m.id)}"><td><b>${esc(r.m.name || "")}</b></td><td class="n">${money(r.s.v)}</td><td class="n num">${ktQ(r.s.q)}</td>
      <td>${r.rc.length ? `<span class="small">${r.rc.map(l => { const g = ktIng(l.ing); return g ? `${esc(g.name)} ${ktQ(l.q)}` : ""; }).filter(Boolean).join(" · ")}</span>` : `<span class="pill warn">بلا وصفة</span>`}</td>
      <td class="n">${r.cost == null ? "—" : money(r.cost)}</td><td class="n">${r.price ? money(r.price) : "—"}</td>
      <td class="n">${r.pc == null ? "—" : `<b class="num" style="color:${r.pc > 0.47 ? "var(--bad,#C62828)" : r.pc > 0.4 ? "#B26A00" : "#1B7A57"}">${pct(r.pc)}</b>`}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">لا توجد أصناف في منيو الكاشير</td></tr>`}</tbody></table></div>
    <p class="small muted">تكلفة الوصفة بسعر آخر شراء لكل مكوّن، بدون التغليف المحسوب في مخزون التغليف. نسبة التكلفة من سعر البيع المباشر في الكاشير.</p>`;
  el.querySelectorAll("[data-ktrec]").forEach(tr => tr.onclick = () => ktOpenRecipe(tr.dataset.ktrec));
}

function ktVar(el){
  const G = S.ingredients || [], C = ktCounts().filter(c => G.some(g => has((c.qty || {})[g.id])));
  if (C.length < 2){ el.innerHTML = `<div class="empty card">يحتاج هذا التقرير جردين على الأقل: يحسب ما كان يجب أن يبقى بين الجردين (الجرد الأول + الوارد − استهلاك المبيعات)، ويقارنه بالجرد الثاني.<br>${C.length ? `عندك جرد واحد بتاريخ <b class="num">${dmy(C[0].date)}</b>؛ سجّل الجرد التالي بعد أيام.` : "لم يُسجَّل أي جرد بعد."}</div>`; return; }
  const ids = new Set(C.map(c => c.id)); if (!ids.has(S.ktV1)) S.ktV1 = C[C.length - 1].id;
  const c1 = C.find(c => c.id === S.ktV1), before = C.filter(c => c.date < c1.date); if (!before.length){ S.ktV1 = C[1].id; return ktVar(el); }
  if (!before.some(c => c.id === S.ktV0)) S.ktV0 = before[before.length - 1].id;
  const c0 = before.find(c => c.id === S.ktV0), a = addDays(c0.date, 1), b = c1.date;
  if (ktNeedOld(a, el, renderKitchen)) return;
  const cons = ktCons(a, b), ins = ktIn(a, b), days = daysBetween(a, b);
  const rows = G.filter(g => has((c0.qty || {})[g.id]) && has((c1.qty || {})[g.id])).map(g => {
    const o = n(c0.qty[g.id]), i = ins.get(g.id) || 0, u = cons.use.get(g.id) || 0, ex = o + i - u, ac = n(c1.qty[g.id]), df = ac - ex, p = ktPrice(g, b);
    return {g, o, i, u, ex, ac, df, val: df * p, rel: u > 0 ? df / u : null}; }).sort((p, q) => p.val - q.val);
  const loss = sumBy(rows.filter(r => r.val < 0), r => r.val), gain = sumBy(rows.filter(r => r.val > 0), r => r.val), sales = cons.amt;
  const opt = (L, v) => L.map(c => `<option value="${esc(c.id)}" ${c.id === v ? "selected" : ""}>${dmy(c.date)}</option>`).join("");
  el.innerHTML = `<div class="actions" style="margin-bottom:12px;flex-wrap:wrap"><label class="small">من جرد <select id="kv0">${opt(before, c0.id)}</select></label><label class="small">إلى جرد <select id="kv1">${opt(C.slice(1), c1.id)}</select></label>
      <span class="small muted">الفترة من <span class="num">${dmy(a)}</span> إلى <span class="num">${dmy(b)}</span> (${days} يوم)</span></div>
    <div class="grid g4" style="margin-bottom:14px">
      <div class="kpi ${loss < -0.005 ? "warn" : ""}"><span class="l">قيمة النقص</span><span class="v num">${fmt(-loss)}</span><span class="small muted">مكونات أقل مما يجب</span></div>
      <div class="kpi"><span class="l">قيمة الزيادة</span><span class="v num">${fmt(gain)}</span><span class="small muted">مكونات أكثر مما يجب</span></div>
      <div class="kpi dark"><span class="l">صافي الفرق من المبيعات</span><span class="v num">${sales ? pct(-(loss + gain) / sales) : "—"}</span><span class="small muted">مبيعات الفترة ${fmt(sales)}</span></div>
      <div class="kpi"><span class="l">مبيعات لها وصفات</span><span class="v num">${pct(cons.amt ? cons.amtR / cons.amt : 0)}</span><span class="small muted">الأصناف بلا وصفة تظهر نقصاً زائفاً</span></div></div>
    <div class="card tw"><table><thead><tr><th>المكوّن</th><th class="n">الجرد الأول</th><th class="n">+ الوارد</th><th class="n">− استهلاك المبيعات</th><th class="n">= المفترض</th><th class="n">الجرد الفعلي</th><th class="n">الفرق</th><th class="n">من الاستهلاك</th><th class="n">القيمة</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td><b>${esc(r.g.name)}</b><small class="muted"> ${esc(r.g.unit || "")}</small></td><td class="n num">${ktQ(r.o)}</td><td class="n num">${ktQ(r.i)}</td><td class="n num">${ktQ(r.u)}</td><td class="n num">${ktQ(r.ex)}</td><td class="n num"><b>${ktQ(r.ac)}</b></td>
      <td class="n"><b class="num" style="color:${r.df < -1e-6 ? "var(--bad,#C62828)" : r.df > 1e-6 ? "#1B7A57" : "inherit"}">${r.df > 0 ? "+" : ""}${ktQ(r.df)}</b></td>
      <td class="n num">${r.rel == null ? "—" : pct(r.rel)}</td><td class="n">${money(r.val)}</td></tr>`).join("") || `<tr><td colspan="9" class="empty">لا توجد مكونات جُردت في الجردين</td></tr>`}</tbody></table></div>
    <p class="small muted">النقص يعني: هدر لم يُسجَّل، أو حصص أكبر من الوصفة، أو فاتورة لم تُذكر فيها أصناف المخزون، أو فقد. الزيادة تعني غالباً: وصفة أكبر من الفعلي، أو بيع غير مسجّل في الكاشير لم يستهلك… راجع أي مكوّن فرقه أكثر من 3% من استهلاكه.</p>`;
  $("#kv0").onchange = e => { S.ktV0 = e.target.value; ktVar(el); };
  $("#kv1").onchange = e => { S.ktV1 = e.target.value; S.ktV0 = null; ktVar(el); };
}

/* ================= forms ================= */
function ktOpenIng(id){
  const x = id ? ktIng(id) : null, d = today();
  $("#sheet").innerHTML = `<form class="entry" id="fkg"><h3 style="margin:0">${x ? "تعديل مكوّن" : "مكوّن جديد"}</h3>
    <div class="grid g2"><div class="f"><label for="kg_n">الاسم</label><input id="kg_n" required value="${esc(x ? x.name : "")}" placeholder="مثل: صدور دجاج"></div>
      <div class="f"><label for="kg_u">الوحدة</label><input id="kg_u" list="kg_ul" required value="${esc(x ? x.unit : "كجم")}"><datalist id="kg_ul">${KT_UNITS.map(u => `<option value="${u}">`).join("")}</datalist></div>
      <div class="f"><label for="kg_p">سعر الوحدة (عند عدم وجود فاتورة)</label><input id="kg_p" type="number" step="0.001" min="0" inputmode="decimal" value="${x && has(x.price) ? x.price : ""}"></div>
      <div class="f"><label for="kg_m">الحد الأدنى للطلب</label><input id="kg_m" type="number" step="0.001" min="0" inputmode="decimal" value="${x && n(x.min) ? x.min : ""}"></div>
      <div class="f"><label for="kg_s">المورد المعتاد</label><input id="kg_s" list="kg_sl" value="${esc(x ? x.supplier || "" : "")}"><datalist id="kg_sl">${(S.suppliers || []).map(s => `<option value="${esc(s.name)}">`).join("")}</datalist></div>
      <div class="f wide"><label for="kg_a">أسماء أخرى (يُعرف بها في الفواتير، مفصولة بفاصلة)</label><input id="kg_a" value="${esc(x ? (x.aliases || []).join("، ") : "")}" placeholder="دجاج مبرد، صدور"></div></div>
    ${x ? `<p class="small muted" style="margin:0">سعر الوحدة الآن: <b class="num">${fmt(ktPrice(x, d))}</b> ر.س ${ktInItems("0000-00-00", d).some(it => it.ing === x.id && n(it.a) > 0) ? "(من آخر فاتورة)" : ""}</p>` : ""}
    <div class="actions"><button class="btn" type="submit">حفظ</button><button class="btn ghost" type="button" id="kg_x">إغلاق</button>${x && S.canEdit ? `<button class="btn danger sm" type="button" id="kg_del">حذف</button>` : ""}</div></form>`;
  $("#modal").classList.add("open"); $("#kg_x").onclick = closeModal;
  if ($("#kg_del")) armDelete($("#kg_del"), async () => { if (await archive("ingredients", id)) closeModal(); });
  $("#fkg").onsubmit = async e => { e.preventDefault();
    const name = normName($("#kg_n").value); if (!name) return;
    const dup = (S.ingredients || []).find(g => g.id !== id && ktKey(g.name) === ktKey(name)); if (dup){ toast(`المكوّن «${dup.name}» موجود`); return; }
    const data = {...(x ? strip(x) : {}), name, unit:$("#kg_u").value.trim() || "كجم", price: $("#kg_p").value === "" ? null : n($("#kg_p").value), min: n($("#kg_m").value) || null, supplier: $("#kg_s").value.trim() ? supKey($("#kg_s").value) : "",
      aliases:[...new Set($("#kg_a").value.split(/[،,]/).map(s => normName(s)).filter(Boolean))]};
    if (await recWrite("ingredients", id || null, data, null, "تم حفظ المكوّن")) closeModal(); };
}

function ktOpenRecipe(menuId){
  const m = (S.pos.menu || []).find(z => z.id === menuId) || {id:menuId, name:""}, G = S.ingredients || [];
  if (!G.length){ toast("أضف المكونات أولاً"); return; }
  let L = ktRecipe(menuId).map(l => ({ing:l.ing, q:l.q}));
  if (!L.length) L = [{ing:"", q:""}];
  const draw = () => {
    $("#kr_rows").innerHTML = L.map((l, i) => { const g = ktIng(l.ing);
      return `<div class="sp-row"><select data-kri="${i}" aria-label="المكوّن"><option value="">— المكوّن —</option>${G.map(z => `<option value="${esc(z.id)}" ${z.id === l.ing ? "selected" : ""}>${esc(z.name)} (${esc(z.unit || "")})</option>`).join("")}</select>
        <input data-krq="${i}" type="number" step="0.001" min="0" inputmode="decimal" placeholder="الكمية" value="${l.q === "" ? "" : l.q}" aria-label="الكمية"><span class="small muted" style="min-width:64px">${g ? esc(g.unit || "") : ""}${g && n(l.q) ? ` · ${fmt(n(l.q) * ktPrice(g))}` : ""}</span>
        <button type="button" class="btn danger sm" data-krd="${i}" aria-label="حذف">×</button></div>`; }).join("");
    const cost = sumBy(L, l => { const g = ktIng(l.ing); return g ? n(l.q) * ktPrice(g) : 0; }), price = n(m.price);
    $("#kr_sum").innerHTML = `تكلفة الوصفة <b class="num">${fmt(cost)}</b>${price ? ` من سعر <b class="num">${fmt(price)}</b> · <b class="num">${pct(cost / price)}</b>` : ""}`;
    document.querySelectorAll("[data-kri]").forEach(s => s.onchange = () => { L[+s.dataset.kri].ing = s.value; draw(); });
    document.querySelectorAll("[data-krq]").forEach(s => s.onchange = () => { L[+s.dataset.krq].q = s.value; draw(); });
    document.querySelectorAll("[data-krd]").forEach(b => b.onclick = () => { L.splice(+b.dataset.krd, 1); if (!L.length) L.push({ing:"", q:""}); draw(); });
  };
  $("#sheet").innerHTML = `<form class="entry" id="fkr"><h3 style="margin:0">وصفة: ${esc(m.name || "")}</h3>
    <p class="small muted" style="margin:0">ما تستهلكه حبة واحدة من الصنف. الكمية بوحدة المكوّن: إذا كانت الوحدة كجم فاكتب 0.120 لـ 120 جرام.</p>
    <div id="kr_rows"></div><div class="actions"><button type="button" class="btn ghost sm" id="kr_add">+ مكوّن</button><span id="kr_sum" class="small"></span></div>
    <div class="actions"><button class="btn" type="submit" ${S.canEdit ? "" : "disabled"}>حفظ الوصفة</button><button class="btn ghost" type="button" id="kr_x">إغلاق</button></div></form>`;
  $("#modal").classList.add("open"); $("#kr_x").onclick = closeModal; draw();
  $("#kr_add").onclick = () => { L.push({ing:"", q:""}); draw(); };
  $("#fkr").onsubmit = async e => { e.preventDefault();
    const lines = L.filter(l => l.ing && n(l.q) > 0).map(l => ({ing:l.ing, q:Math.round(n(l.q) * 1000) / 1000}));
    if (new Set(lines.map(l => l.ing)).size !== lines.length){ toast("مكوّن مكرر في الوصفة، اجمع كميته في سطر واحد"); return; }
    if (await recWrite("recipes", menuId, {name:m.name || "", lines}, null, lines.length ? "تم حفظ الوصفة" : "حُذفت مكونات الوصفة")) closeModal(); };
}

function ktOpenCount(id){
  const G = S.ingredients || []; if (!G.length){ toast("أضف المكونات أولاً"); return; }
  const x = id ? (S.ingCounts || []).find(c => c.id === id) : null, d0 = x ? x.date : today();
  $("#sheet").innerHTML = `<form class="entry" id="fkc"><h3 style="margin:0">${x ? "تعديل جرد" : "جرد المكونات"}</h3>
    <div class="grid g2"><div class="f"><label for="kc_d">تاريخ الجرد</label><input id="kc_d" type="date" required max="${today()}" value="${d0}"></div>
      <div class="f"><label for="kc_n">ملاحظات</label><input id="kc_n" value="${esc(x ? x.notes || "" : "")}"></div></div>
    <p class="small muted" style="margin:0">الجرد يمثل الكمية في <b>نهاية</b> اليوم المختار. اترك الخانة فارغة لما لم تجرده. «المتوقع» يحسبه البرنامج من الجرد السابق والفواتير والمبيعات.</p>
    <div class="tw"><table><thead><tr><th>المكوّن</th><th class="n">المتوقع</th><th>المعدود</th></tr></thead><tbody id="kc_rows"></tbody></table></div>
    <div class="actions"><button class="btn" type="submit">حفظ الجرد</button><button class="btn ghost" type="button" id="kc_x">إغلاق</button>${x && S.canEdit ? `<button class="btn danger sm" type="button" id="kc_del">حذف</button>` : ""}</div></form>`;
  $("#modal").classList.add("open"); $("#kc_x").onclick = closeModal;
  const rowsFor = d => { const st = ktStock(addDays(d, -1)), use = ktCons(d, d).use, ins = ktIn(d, d);
    $("#kc_rows").innerHTML = G.map(g => { const s = st.get(g.id), ex = s ? s.qty + (ins.get(g.id) || 0) - (use.get(g.id) || 0) : null, v = x && has((x.qty || {})[g.id]) ? x.qty[g.id] : "";
      return `<tr><td><b>${esc(g.name)}</b><small class="muted"> ${esc(g.unit || "")}</small></td><td class="n num">${ex == null ? "—" : ktQ(ex)}</td><td><input data-kcq="${esc(g.id)}" type="number" step="0.001" min="0" inputmode="decimal" value="${v}" style="max-width:140px"></td></tr>`; }).join(""); };
  rowsFor(d0); $("#kc_d").onchange = () => { const keep = {}; document.querySelectorAll("[data-kcq]").forEach(i => keep[i.dataset.kcq] = i.value); rowsFor($("#kc_d").value || today()); document.querySelectorAll("[data-kcq]").forEach(i => { if (keep[i.dataset.kcq] !== undefined) i.value = keep[i.dataset.kcq]; }); };
  if ($("#kc_del")) armDelete($("#kc_del"), async () => { if (await archive("ingCounts", id)) closeModal(); });
  $("#fkc").onsubmit = async e => { e.preventDefault();
    const qty = {}; document.querySelectorAll("[data-kcq]").forEach(i => { if (i.value !== "") qty[i.dataset.kcq] = Math.round(n(i.value) * 1000) / 1000; });
    if (!Object.keys(qty).length){ toast("أدخل كمية مكوّن واحد على الأقل"); return; }
    const d = $("#kc_d").value, same = (S.ingCounts || []).find(c => c.date === d && c.id !== id);
    if (same){ toast("يوجد جرد بنفس التاريخ؛ افتحه وعدّله"); return; }
    if (await recWrite("ingCounts", id || null, {date:d, qty, notes:$("#kc_n").value.trim()}, null, "تم حفظ الجرد")) closeModal(); };
}

/* «لصق من Claude»: ingredients and recipes Claude prepared from what the owner wrote, created or updated in one go */
function ktPaste(){
  $("#sheet").innerHTML = `<div class="entry"><h3 style="margin:0">لصق المكونات والوصفات من Claude</h3>
    <p class="small muted" style="margin:0">أرسل لـ Claude مكونات كل صنف كما تعرفها، وانسخ النص الذي يعطيك إياه والصقه هنا. تُضاف المكونات الجديدة، وتُحدَّث الوصفات المذكورة فقط.</p>
    <textarea id="kp_t" rows="8" dir="ltr" placeholder='{"aqeela":"recipes", ...}'></textarea><div id="kp_out"></div>
    <div class="actions"><button class="btn" type="button" id="kp_chk">مراجعة</button><button class="btn ghost" type="button" id="kp_x">إغلاق</button></div></div>`;
  $("#modal").classList.add("open"); $("#kp_x").onclick = closeModal; setTimeout(() => $("#kp_t") && $("#kp_t").focus(), 50);
  $("#kp_chk").onclick = () => {
    let J; try { const t = $("#kp_t").value.trim(); J = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch(e){ J = null; }
    if (!J || J.aqeela !== "recipes"){ $("#kp_out").innerHTML = '<div class="note warn">النص غير مكتمل. انسخه كاملاً من رسالة Claude.</div>'; return; }
    const menu = (S.pos.menu || []).filter(m => !m.deleted), mFind = s => { const k = ktKey(s); return menu.find(m => ktKey(m.name) === k) || null; };
    const newIngs = (J.ingredients || []).filter(g => g && g.name && !ktFind(g.name));
    const nameOk = s => !!(ktFind(s) || newIngs.some(g => ktKey(g.name) === ktKey(s) || (g.aliases || []).some(a => ktKey(a) === ktKey(s))));
    const recs = (J.recipes || []).map(r => ({r, m: mFind(r.item), bad:(r.lines || []).filter(l => !nameOk(l.ing)).map(l => l.ing)}));
    const miss = recs.filter(x => !x.m), badL = recs.filter(x => x.m && x.bad.length);
    $("#kp_out").innerHTML = `<div class="note ${miss.length || badL.length ? "warn" : ""}">مكونات جديدة: <b class="num">${newIngs.length}</b> · وصفات: <b class="num">${recs.filter(x => x.m && !x.bad.length).length}</b>
      ${miss.length ? `<br>أصناف غير موجودة في منيو الكاشير (لن تُحفظ): ${miss.map(x => `<b>${esc(x.r.item)}</b>`).join("، ")}` : ""}
      ${badL.length ? `<br>وصفات فيها مكوّن غير معروف (لن تُحفظ): ${badL.map(x => `<b>${esc(x.r.item)}</b> (${x.bad.map(esc).join("، ")})`).join("؛ ")}` : ""}</div>
      ${recs.some(x => x.m && !x.bad.length && ktRecipe(x.m.id).length) ? `<p class="small muted">الوصفات الموجودة لهذه الأصناف ستُستبدل.</p>` : ""}
      <div class="actions"><button class="btn" type="button" id="kp_go" ${newIngs.length || recs.some(x => x.m && !x.bad.length) ? "" : "disabled"}>حفظ</button></div>`;
    $("#kp_go").onclick = async () => { $("#kp_go").disabled = true; let ki = 0, kr = 0;
      for (const g of newIngs){ const ref = S.db.collection("ingredients").doc();
        if (await recWrite("ingredients", ref.id, {name:normName(g.name), unit:g.unit || "كجم", price: has(g.price) ? n(g.price) : null, min: n(g.min) || null, aliases:(g.aliases || []).map(normName).filter(Boolean)}, "create", "")){ ki++;
          S.ingredients = [...(S.ingredients || []), {id:ref.id, name:normName(g.name), aliases:(g.aliases || []).map(normName)}]; } }
      for (const x of recs) if (x.m && !x.bad.length){ const lines = [];
        for (const l of (x.r.lines || [])){ const g = ktFind(l.ing); if (g && n(l.q) > 0){ const e2 = lines.find(z => z.ing === g.id); if (e2) e2.q = Math.round((e2.q + n(l.q)) * 1000) / 1000; else lines.push({ing:g.id, q:Math.round(n(l.q) * 1000) / 1000}); } }
        if (lines.length && await recWrite("recipes", x.m.id, {name:x.m.name || "", lines}, null, "")) kr++; }
      closeModal(); toast(`أُضيف ${ki} مكوّن وحُفظت ${kr} وصفة`); };
  };
}

VIEWS.kitchen = {v:viewKitchen, bind:bindKitchen, list:renderKitchen};
