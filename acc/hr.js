/* ================= الموارد البشرية — HR =================
   The «الموظفين» page grows into a full HR section. What was there stays exactly as it was (employee files, payroll, advances);
   new tabs add: an overview, attendance and the weekly rota, leaves with the balance the Saudi Labor Law gives, discipline and
   rewards and the monthly performance review, and the exit (final settlement) with ready letters.
   Data (owner, or an account granted «الموارد البشرية»):
     acc_attendance/{date_staffId} = {date, staffId, name, status, in, out, late, notes}
     acc_rota/{weekStart}          = {week, plan:{staffId:[7 shift codes, Saturday first]}}
     acc_leaves/{id}               = {staffId, name, type, from, to, days, status, notes, decidedBy, decidedAt}
     acc_hrEvents/{id}             = {kind:"penalty"|"reward"|"review", staffId, name, date, ym, ...}
   The payroll draft takes from them: absent days (attendance + unpaid leave), rewards as «إضافي», penalties as «خصومات». */

Object.assign(S, {attendance:[], rota:new Map(), leaves:[], hrEvents:[]});
Object.assign(S.raw, {attendance:[], rota:[], leaves:[], hrEvents:[]});
Object.assign(KEY, {attendance:"attendance", rota:"rota", leaves:"leaves", hrEvents:"hrEvents"});
Object.assign(COLL_LABEL, {attendance:"حضور", rota:"جدول ورديات", leaves:"إجازة", hrEvents:"إجراء موارد بشرية"});
["attendance", "rota", "leaves", "hrEvents"].forEach(c => { STAFF_COLL_PAGE[c] = ["payroll"]; MEMBER_COLL_PAGE[c] = ["payroll"]; if (!STAFF_HIDDEN.includes(c)) STAFF_HIDDEN.push(c); });

const HX_TABS = [["overview","نظرة عامة"],["staff","ملفات الموظفين"],["docs","المستندات"],["att","الحضور والورديات"],["leave","الإجازات"],["perf","الأداء والانضباط"],["payroll","مسير الرواتب"],["adv","السلف"],["letters","الخطابات"],["exit","نهاية الخدمة"]];
const HX_NEW = ["overview","docs","att","leave","perf","letters","exit"];
const HX_ST = {"حاضر":"ok", "متأخر":"warn", "غائب":"bad", "إجازة":"info", "راحة":"mute"};
const HX_LEAVES = [["سنوية","تُخصم من الرصيد السنوي"],["مرضية","بتقرير طبي (م 117)"],["اضطرارية","مدفوعة · حتى 5 أيام للزواج والوفاة (م 113)"],["بدون راتب","تُخصم من الراتب"],["أخرى",""],["تعديل رصيد","إضافة أو خصم أيام من الرصيد (رصيد سابق)"]];
const HX_VIOL = ["التأخر عن موعد الدوام","الغياب بدون إذن","مغادرة العمل قبل نهاية الوردية","عدم الالتزام بالزي والنظافة الشخصية","مخالفة اشتراطات النظافة وسلامة الغذاء","سوء التعامل مع العملاء","استخدام الجوال أثناء العمل","إهمال المعدات أو الهدر","أخرى"];
const HX_ACT = ["تنبيه شفهي","إنذار كتابي","خصم من الراتب","حرمان من مكافأة"];
const HX_REW = ["موظف الشهر","أداء مميز","عمل إضافي","اقتراح أو مبادرة","أخرى"];
const HX_CRIT = [["commit","الالتزام بالمواعيد"],["quality","جودة العمل"],["speed","السرعة والإنتاجية"],["clean","النظافة وسلامة الغذاء"],["team","روح الفريق"],["service","التعامل مع العملاء"]];
const HX_SHIFTS_DEF = [{k:"ص", l:"صباحي", from:"10:00", to:"18:00"}, {k:"م", l:"مسائي", from:"16:00", to:"24:00"}, {k:"ك", l:"دوام كامل", from:"12:00", to:"24:00"}, {k:"ر", l:"راحة", from:"", to:""}];
const hxShifts = () => Array.isArray(S.settings.hrShifts) && S.settings.hrShifts.length ? S.settings.hrShifts : HX_SHIFTS_DEF;
const hxShift = k => hxShifts().find(s => s.k === k) || null;
const hxActive = () => S.staff.filter(s => s.active !== false);
const hxAtt = (d, sid) => S.attendance.find(a => a.date === d && a.staffId === sid) || null;
const hxLeaveOn = (d, sid) => S.leaves.find(l => l.staffId === sid && l.status === "معتمدة" && l.type !== "تعديل رصيد" && l.from <= d && l.to >= d) || null;
/* the week starts on Saturday */
const hxWeek = d => { const x = pd(d), back = (x.getDay() + 1) % 7; return addDays(d, -back); };
const hxRotaCode = (d, sid) => { const r = S.rota.get(hxWeek(d)); if (!r || !r.plan || !r.plan[sid]) return ""; return r.plan[sid][(pd(d).getDay() + 1) % 7] || ""; };
/* a day's state for one employee: leave first, then the attendance record, then the rota's rest day */
function hxState(d, sid){
  const lv = hxLeaveOn(d, sid); if (lv) return {st:"إجازة", note:lv.type};
  const a = hxAtt(d, sid); if (a && a.status) return {st:a.status, a};
  if (hxRotaCode(d, sid) === "ر") return {st:"راحة"};
  return {st:""};
}
const hxChip = st => st ? `<span class="hx-st ${HX_ST[st] || ""}">${esc(st)}</span>` : `<span class="hx-st none">لم يُسجّل</span>`;
const hxDays = (a, b) => Math.max(0, hrDays(a, b));
const hxAv = s => hrAvatar(s);

/* ---------- leave balance, Saudi Labor Law art. 109: 21 days a year, 30 after five years of service ---------- */
function hxAccrued(s, asOf){
  if (!s.start) return 0; const end = asOf || today(); if (end < s.start) return 0;
  const five = iso(new Date(pd(s.start).getFullYear() + 5, pd(s.start).getMonth(), pd(s.start).getDate()));
  const d1 = hxDays(s.start, end < five ? end : five), d2 = end > five ? hxDays(five, end) : 0;
  return r2(d1 * 21 / 365 + d2 * 30 / 365);
}
function hxLeaveBal(s, asOf){
  const L = S.leaves.filter(l => l.staffId === s.id && l.status === "معتمدة");
  const used = sumBy(L.filter(l => l.type === "سنوية"), l => n(l.days)), adj = sumBy(L.filter(l => l.type === "تعديل رصيد"), l => n(l.days));
  const acc = hxAccrued(s, asOf), y0 = today().slice(0, 4) + "-01-01";
  const sick = sumBy(L.filter(l => l.type === "مرضية" && l.from >= y0), l => n(l.days));
  return {acc, used, adj, bal: r2(acc + adj - used), sick};
}
/* month figures for one employee (for the attendance summary and the payroll draft) */
function hxMonth(sid, ym){
  const a = ym + "-01", b = ymEnd(ym), t = today(), last = b < t ? b : t, o = {present:0, late:0, absent:0, leave:0, unpaid:0, lateMin:0};
  for (let d = a; d <= last; d = addDays(d, 1)){ const x = hxState(d, sid);
    if (x.st === "حاضر") o.present++; else if (x.st === "متأخر"){ o.late++; o.present++; o.lateMin += n(x.a && x.a.late); }
    else if (x.st === "غائب") o.absent++; else if (x.st === "إجازة"){ o.leave++; if (x.note === "بدون راتب") o.unpaid++; } }
  /* unpaid leave days later in the month (approved ahead) */
  for (let d = addDays(last, 1); d <= b; d = addDays(d, 1)){ const l = hxLeaveOn(d, sid); if (l && l.type === "بدون راتب") o.unpaid++; }
  return o;
}
const hxEv = (kind, ym, sid) => S.hrEvents.filter(e => e.kind === kind && (!ym || e.ym === ym) && (!sid || e.staffId === sid));
const hxReviewAvg = r => { const v = HX_CRIT.map(([k]) => n(r.scores && r.scores[k])).filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
const hxStars = v => `<span class="hx-stars" title="${v.toFixed(1)} من 5">${[1,2,3,4,5].map(i => `<i class="${v >= i - .25 ? "on" : v >= i - .75 ? "half" : ""}">★</i>`).join("")}</span>`;

/* ---------- the payroll draft takes absences, rewards and penalties ---------- */
const hxBaseLines = newPayrollLines;
newPayrollLines = function(ym){
  return hxBaseLines(ym).map(l => {
    const m = hxMonth(l.staffId, ym), rw = hxEv("reward", ym, l.staffId), pn = hxEv("penalty", ym, l.staffId).filter(e => n(e.amount) > 0);
    const out = {...l};
    if (m.absent + m.unpaid) out.absent = m.absent + m.unpaid;
    if (rw.length){ out.extra = r2(sumBy(rw, e => n(e.amount))); out.extraNote = rw.map(e => e.reason).filter(Boolean).join("، "); }
    if (pn.length){ out.deduct = r2(sumBy(pn, e => n(e.amount))); out.deductNote = pn.map(e => e.violation).filter(Boolean).join("، "); }
    return out;
  });
};

/* ================= the page ================= */
function hxRender(el){
  const t = S.hrTab, V = {overview:hxOverview, att:hxAttView, leave:hxLeaveView, perf:hxPerfView, exit:hxExitView}[t];
  el.innerHTML = `<div class="hx-wrap">${V ? V() : ""}</div>`;
  hxBind(el);
}

/* ---------- overview ---------- */
function hxOverview(){
  const act = hxActive(), d = today(), ym = d.slice(0, 7);
  if (!S.staff.length) return `<div class="card empty">لا يوجد موظفون بعد. ابدأ بـ «موظف جديد».</div>`;
  const st = act.map(s => ({s, x:hxState(d, s.id), sh:hxShift(hxRotaCode(d, s.id))}));
  const exp = st.filter(o => o.x.st !== "راحة" && o.x.st !== "إجازة").length, pres = st.filter(o => o.x.st === "حاضر" || o.x.st === "متأخر").length;
  const onLeave = st.filter(o => o.x.st === "إجازة").length, cost = sumBy(act, s => n(s.salary));
  const M = act.map(s => hxMonth(s.id, ym)), mP = sumBy(M, m => m.present), mA = sumBy(M, m => m.absent), mL = sumBy(M, m => m.late);
  const rate = mP + mA ? (mP - mL) / (mP + mA) : null;
  const rv = hxEv("review").filter(e => e.ym === ym), avgR = rv.length ? sumBy(rv, hxReviewAvg) / rv.length : 0;
  const alerts = [];
  hrAlerts().forEach(a => alerts.push({lv:a.st.lv === "bad" ? "bad" : "warn", t:`${a.d.name} · ${a.s.name}`, s:a.st.label, go:"staff"}));
  act.forEach(s => { if (!s.start) return; const pe = addDays(s.start, 89), left = hxDays(d, pe); if (left >= 0 && left <= 14) alerts.push({lv:"warn", t:`نهاية فترة التجربة · ${s.name}`, s:`بعد ${left} يوم (${dmy(pe)})`, go:"perf"}); });
  S.leaves.filter(l => l.status === "مطلوبة").forEach(l => alerts.push({lv:"info", t:`طلب إجازة ${l.type} · ${l.name}`, s:`${dmy(l.from)} ← ${dmy(l.to)} (${l.days} يوم)`, go:"leave"}));
  S.leaves.filter(l => l.status === "معتمدة" && l.type !== "تعديل رصيد" && l.to >= d && l.to <= addDays(d, 3)).forEach(l => alerts.push({lv:"info", t:`عودة من الإجازة · ${l.name}`, s:dmy(addDays(l.to, 1)), go:"leave"}));
  const noRev = act.filter(s => !rv.some(e => e.staffId === s.id));
  if (+d.slice(8) >= 25 && noRev.length) alerts.push({lv:"info", t:`تقييم ${MONTHS[+ym.slice(5) - 1]} لم يكتمل`, s:`${noRev.length} موظف بلا تقييم`, go:"perf"});
  const FILL = [["phone","الجوال"],["nationality","الجنسية"],["start","تاريخ التعيين"],["iqamaNo","رقم الإقامة"],["iqamaExp","انتهاء الإقامة"],["passportExp","انتهاء الجواز"],["insExp","التأمين الطبي"],["healthExp","الشهادة الصحية"],["contractEnd","نهاية العقد"],["emergPhone","جوال الطوارئ"]];
  const comp = act.map(s => { const miss = FILL.filter(([k]) => !s[k]).map(([, l]) => l); return {s, p:(FILL.length - miss.length) / FILL.length, miss}; }).sort((a, b) => a.p - b.p);
  const kpi = (l, v, sub, cls) => `<div class="kpi ${cls || ""}"><span class="l">${l}</span><span class="v num">${v}</span><span class="small muted">${sub}</span></div>`;
  const byRole = {}; act.forEach(s => { const k = s.role || "بدون وظيفة"; byRole[k] = (byRole[k] || 0) + 1; });
  return `<div class="grid g4">
      ${kpi("على رأس العمل", act.length, `${S.staff.length - act.length ? (S.staff.length - act.length) + " غير نشط · " : ""}${Object.keys(byRole).length} وظيفة`)}
      ${kpi("تكلفة الرواتب الشهرية", fmt(cost), `متوسط ${fmt(act.length ? cost / act.length : 0)} للموظف`)}
      ${kpi("حضور اليوم", `${pres} / ${exp}`, onLeave ? `${onLeave} في إجازة` : "حسب سجل الحضور")}
      ${kpi("الالتزام بالحضور · " + MONTHS[+ym.slice(5) - 1], rate == null ? "—" : Math.round(rate * 100) + "%", rate == null ? "سجّل الحضور ليظهر" : `${mA} غياب · ${mL} تأخير`, rate != null && rate < .9 ? "orange" : "")}
    </div>
    <div class="hx-g2">
      <div class="card"><div class="hx-h"><h3>اليوم · ${dayName(d)} <span class="num">${dmy(d)}</span></h3><button class="btn ghost sm" type="button" data-hxgo="att">سجل الحضور</button></div>
        <div class="hx-today">${st.map(({s, x, sh}) => `<div class="hx-trow">${hxAv(s)}<div class="hx-tn"><b>${esc(s.name)}</b><small>${esc(s.role || "")}${sh ? ` · ${esc(sh.l)}${sh.from ? ` <span class="num">${sh.from}–${sh.to}</span>` : ""}` : ""}</small></div>${hxChip(x.st)}${x.a && x.a.in ? `<span class="num small muted">${esc(x.a.in)}</span>` : ""}</div>`).join("")}</div></div>
      <div class="card"><div class="hx-h"><h3>يحتاج انتباهك</h3><span class="hx-n">${alerts.length}</span></div>
        ${alerts.length ? `<div class="hx-alerts">${alerts.slice(0, 10).map(a => `<button type="button" class="hx-al ${a.lv}" data-hxgo="${a.go}"><b>${esc(a.t)}</b><small>${esc(a.s)}</small></button>`).join("")}</div>` : `<div class="hx-ok">✓ لا شيء يحتاج إجراءً الآن</div>`}</div>
    </div>
    <div class="hx-g2">
      <div class="card"><div class="hx-h"><h3>اكتمال ملفات الموظفين</h3><span class="small muted">الوثائق والبيانات الأساسية</span></div>
        <div class="hx-comp">${comp.map(({s, p, miss}) => `<div class="hx-crow" data-hxfile="${esc(s.id)}" role="button" tabindex="0">${hxAv(s)}<div class="hx-tn"><b>${esc(s.name)}</b><small>${miss.length ? "ينقص: " + esc(miss.slice(0, 3).join("، ")) + (miss.length > 3 ? ` و${miss.length - 3} أخرى` : "") : "الملف مكتمل"}</small></div><div class="hx-pbar"><i style="width:${Math.round(p * 100)}%" class="${p >= .9 ? "ok" : p >= .6 ? "warn" : "bad"}"></i></div><span class="num small">${Math.round(p * 100)}%</span></div>`).join("")}</div></div>
      <div class="card"><div class="hx-h"><h3>الأداء · ${MONTHS[+ym.slice(5) - 1]}</h3><button class="btn ghost sm" type="button" data-hxgo="perf">التقييمات</button></div>
        ${rv.length ? `<div class="hx-lead">${[...rv].sort((a, b) => hxReviewAvg(b) - hxReviewAvg(a)).slice(0, 5).map((r, i) => `<div class="hx-lrow"><span class="hx-rank ${i ? "" : "top"}">${i ? i + 1 : "★"}</span><b>${esc(r.name)}</b>${hxStars(hxReviewAvg(r))}<span class="num">${hxReviewAvg(r).toFixed(1)}</span></div>`).join("")}</div>
          <p class="small muted" style="margin:8px 0 0">متوسط الفريق <b class="num">${avgR.toFixed(1)}</b> من 5 · ${rv.length} تقييم</p>`
          : `<div class="hx-empty">لم يُقيَّم أحد هذا الشهر بعد.<br><button class="btn sm" type="button" data-hxnew="review" style="margin-top:10px">تقييم موظف</button></div>`}
        <div class="hx-mini"><div><small>مكافآت الشهر</small><b class="num">${fmt(sumBy(hxEv("reward", ym), e => n(e.amount)))}</b></div><div><small>خصومات الشهر</small><b class="num">${fmt(sumBy(hxEv("penalty", ym), e => n(e.amount)))}</b></div><div><small>مخالفات الشهر</small><b class="num">${hxEv("penalty", ym).length}</b></div></div></div>
    </div>`;
}

/* ---------- attendance and rota ---------- */
function hxAttView(){
  const d = S.hxDay || today(), act = hxActive(), wk = S.hxWeek || hxWeek(today()), ym = d.slice(0, 7);
  const opts = (v, L) => L.map(o => `<option value="${o}" ${v === o ? "selected" : ""}>${o || "—"}</option>`).join("");
  const rows = act.map(s => { const x = hxState(d, s.id), a = hxAtt(d, s.id) || {}, sh = hxShift(hxRotaCode(d, s.id)), lv = hxLeaveOn(d, s.id);
    return `<tr data-hxa="${esc(s.id)}"><td><div class="hx-tn2">${hxAv(s)}<div><b>${esc(s.name)}</b><small>${esc(s.role || "")}</small></div></div></td>
      <td>${sh ? `${esc(sh.l)}${sh.from ? ` <span class="num small muted">${sh.from}–${sh.to}</span>` : ""}` : `<span class="muted">—</span>`}</td>
      <td>${lv ? hxChip("إجازة") + ` <small class="muted">${esc(lv.type)}</small>` : `<select class="hx-sel" data-k="status" ${S.canWrite ? "" : "disabled"}>${opts(a.status || "", ["", "حاضر", "متأخر", "غائب", "راحة"])}</select>`}</td>
      <td><input class="hx-in num" type="time" data-k="in" value="${esc(a.in || "")}" ${lv || !S.canWrite ? "disabled" : ""}></td>
      <td><input class="hx-in num" type="time" data-k="out" value="${esc(a.out || "")}" ${lv || !S.canWrite ? "disabled" : ""}></td>
      <td class="n">${n(a.late) ? `<span class="hx-st warn">${n(a.late)} د</span>` : `<span class="muted">—</span>`}</td>
      <td><input class="hx-in" data-k="notes" value="${esc(a.notes || "")}" placeholder="ملاحظة" ${lv || !S.canWrite ? "disabled" : ""}></td></tr>`; }).join("");
  const days = [...Array(7)].map((_, i) => addDays(wk, i)), plan = (S.rota.get(wk) || {}).plan || {};
  const shOpt = v => `<option value="">—</option>` + hxShifts().map(s => `<option value="${esc(s.k)}" ${v === s.k ? "selected" : ""}>${esc(s.l)}</option>`).join("");
  const sum = act.map(s => ({s, m:hxMonth(s.id, ym)}));
  return `<div class="card"><div class="hx-h"><h3>الحضور اليومي</h3>
      <div class="actions"><button class="btn ghost sm" type="button" id="hx_dprev" aria-label="اليوم السابق">→</button><input type="date" id="hx_day" value="${d}" max="${today()}"><button class="btn ghost sm" type="button" id="hx_dnext" aria-label="اليوم التالي" ${d >= today() ? "disabled" : ""}>←</button>
      ${S.canWrite ? `<button class="btn ghost sm" type="button" id="hx_allp">الكل حاضر</button><button class="btn ghost sm" type="button" id="hx_pos" title="أوقات فتح وإغلاق ورديات كاشير AQ لمن اسمه مطابق">من ورديات الكاشير</button>` : ""}</div></div>
      <div class="tw"><table class="hx-att"><thead><tr><th>الموظف</th><th>الوردية</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th><th class="n">التأخير</th><th>ملاحظات</th></tr></thead><tbody>${rows || `<tr><td colspan="7" class="empty">لا يوجد موظفون على رأس العمل</td></tr>`}</tbody></table></div>
      <p class="foot" style="margin:8px 0 0">يُحفظ كل تغيير فوراً. التأخير يُحسب من بداية الوردية في الجدول. الغياب يُنقل تلقائياً إلى مسودة مسير الرواتب للشهر.</p></div>
    <div class="card"><div class="hx-h"><h3>جدول الورديات الأسبوعي</h3>
      <div class="actions"><button class="btn ghost sm" type="button" id="hx_wprev">→ الأسبوع السابق</button><span class="num small">${dmy(wk)} – ${dmy(addDays(wk, 6))}</span><button class="btn ghost sm" type="button" id="hx_wnext">الأسبوع التالي ←</button>${S.canEdit ? `<button class="btn ghost sm" type="button" id="hx_shdef">أوقات الورديات</button>` : ""}</div></div>
      <div class="tw"><table class="hx-rota"><thead><tr><th>الموظف</th>${days.map(x => `<th class="n ${x === today() ? "hx-now" : ""}">${dayName(x)}<br><span class="num small muted">${dmy(x).slice(0, 5)}</span></th>`).join("")}<th class="n">ساعات</th></tr></thead>
      <tbody>${act.map(s => { const p = plan[s.id] || [], hrs = sumBy(p, k => { const h = hxShift(k); if (!h || !h.from) return 0; const [a1, a2] = h.from.split(":").map(Number), [b1, b2] = h.to.split(":").map(Number); return ((b1 * 60 + b2) - (a1 * 60 + a2) + 1440) % 1440 / 60; });
        return `<tr data-hxr="${esc(s.id)}"><td><b>${esc(s.name)}</b></td>${days.map((x, i) => `<td class="n"><select class="hx-sh sh-${esc(p[i] || "")}" data-i="${i}" ${S.canWrite ? "" : "disabled"}>${shOpt(p[i] || "")}</select></td>`).join("")}<td class="n num">${hrs ? fmt0(hrs) : "—"}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="actions" style="margin-top:10px">${S.canWrite ? `<button class="btn" type="button" id="hx_rsave">حفظ الجدول</button><button class="btn ghost sm" type="button" id="hx_rcopy">نسخ الأسبوع السابق</button>` : ""}<span class="small muted">${hxShifts().filter(x => x.from).map(x => `${esc(x.l)} <span class="num">${x.from}–${x.to}</span>`).join(" · ")}</span></div></div>
    <div class="card"><div class="hx-h"><h3>ملخص ${MONTHS[+ym.slice(5) - 1]}</h3><span class="small muted">حتى اليوم</span></div>
      <div class="tw"><table><thead><tr><th>الموظف</th><th class="n">حضور</th><th class="n">تأخير</th><th class="n">دقائق التأخير</th><th class="n">غياب</th><th class="n">إجازة</th><th class="n">بدون راتب</th><th class="n">الالتزام</th></tr></thead>
      <tbody>${sum.map(({s, m}) => { const r = m.present + m.absent ? (m.present - m.late) / (m.present + m.absent) : null; return `<tr><td>${esc(s.name)}</td><td class="n num">${m.present}</td><td class="n num">${m.late || "—"}</td><td class="n num">${m.lateMin || "—"}</td><td class="n num ${m.absent ? "neg" : ""}">${m.absent || "—"}</td><td class="n num">${m.leave || "—"}</td><td class="n num">${m.unpaid || "—"}</td><td class="n">${r == null ? "—" : `<span class="hx-st ${r >= .95 ? "ok" : r >= .85 ? "warn" : "bad"}">${Math.round(r * 100)}%</span>`}</td></tr>`; }).join("")}</tbody></table></div></div>`;
}

/* ---------- leaves ---------- */
function hxLeaveView(){
  const act = hxActive(), f = S.hxLvF || "open";
  const L = [...S.leaves].filter(l => f === "all" || (f === "open" ? l.status === "مطلوبة" || (l.status === "معتمدة" && l.to >= today()) : l.status === f)).sort((a, b) => (b.from || "").localeCompare(a.from || ""));
  return `<div class="card"><div class="hx-h"><h3>أرصدة الإجازات</h3><div class="actions"><span class="small muted">21 يوماً في السنة، و30 بعد خمس سنوات (نظام العمل م 109)</span>${S.canWrite ? `<button class="btn sm" type="button" data-hxnew="leave">طلب إجازة</button>` : ""}</div></div>
      <div class="tw"><table><thead><tr><th>الموظف</th><th>مدة الخدمة</th><th class="n">المستحق حتى اليوم</th><th class="n">تعديلات</th><th class="n">المستخدم</th><th class="n">الرصيد</th><th class="n">مرضية هذا العام</th><th></th></tr></thead>
      <tbody>${act.map(s => { const b = hxLeaveBal(s), sv = hrService(s); return `<tr><td>${esc(s.name)}</td><td class="small">${sv ? esc(sv.label) : `<span class="muted">بلا تاريخ تعيين</span>`}</td><td class="n num">${b.acc.toFixed(1)}</td><td class="n num">${b.adj ? (b.adj > 0 ? "+" : "") + b.adj : "—"}</td><td class="n num">${b.used || "—"}</td>
        <td class="n"><b class="num ${b.bal < 0 ? "neg" : ""}">${b.bal.toFixed(1)}</b> <small class="muted">يوم</small></td><td class="n num">${b.sick ? `${b.sick} / 30` : "—"}</td><td>${S.canWrite ? `<button class="btn ghost sm" type="button" data-hxnew="leave" data-sid="${esc(s.id)}">إجازة</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div></div>
    <div class="card"><div class="hx-h"><h3>طلبات وسجل الإجازات</h3><div class="seg">${[["open","الحالية والمطلوبة"],["مطلوبة","بانتظار القرار"],["معتمدة","المعتمدة"],["مرفوضة","المرفوضة"],["all","الكل"]].map(([k, l]) => `<button type="button" data-hxlf="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
      <div class="tw"><table><thead><tr><th>الموظف</th><th>النوع</th><th>من</th><th>إلى</th><th class="n">الأيام</th><th>الحالة</th><th>ملاحظات</th><th></th></tr></thead>
      <tbody>${L.length ? L.map(l => `<tr class="click" data-hxlv="${esc(l.id)}"><td>${esc(l.name)}</td><td>${esc(l.type)}</td><td class="num">${l.type === "تعديل رصيد" ? "—" : dmy(l.from)}</td><td class="num">${l.type === "تعديل رصيد" ? "—" : dmy(l.to)}</td><td class="n num">${l.days}</td>
        <td><span class="hx-st ${l.status === "معتمدة" ? "ok" : l.status === "مرفوضة" ? "bad" : "warn"}">${esc(l.status)}</span></td><td class="small">${esc(l.notes || "")}</td>
        <td>${S.canEdit && l.status === "مطلوبة" ? `<div class="actions" style="flex-wrap:nowrap"><button class="btn sm" type="button" data-hxok="${esc(l.id)}">اعتماد</button><button class="btn ghost sm" type="button" data-hxno="${esc(l.id)}">رفض</button></div>` : ""}</td></tr>`).join("")
        : `<tr><td colspan="8" class="empty">لا توجد إجازات هنا</td></tr>`}</tbody></table></div></div>`;
}

/* ---------- performance and discipline ---------- */
function hxPerfView(){
  const ym = ymOf(S.y, S.m), act = hxActive();
  const pen = hxEv("penalty", ym).sort((a, b) => b.date.localeCompare(a.date)), rew = hxEv("reward", ym).sort((a, b) => b.date.localeCompare(a.date)), rv = hxEv("review", ym);
  return `<div class="hx-g2">
    <div class="card"><div class="hx-h"><h3>تقييم الأداء · ${ymLabel(ym)}</h3>${S.canWrite ? `<button class="btn sm" type="button" data-hxnew="review">تقييم موظف</button>` : ""}</div>
      <div class="hx-lead">${act.map(s => { const r = rv.find(e => e.staffId === s.id); return `<div class="hx-lrow ${r ? "click" : ""}" ${r ? `data-hxev="${esc(r.id)}"` : ""}>${hxAv(s)}<b>${esc(s.name)}</b>${r ? hxStars(hxReviewAvg(r)) + `<span class="num">${hxReviewAvg(r).toFixed(1)}</span>` : S.canWrite ? `<button class="btn ghost sm" type="button" data-hxnew="review" data-sid="${esc(s.id)}">قيّم</button>` : `<span class="muted small">لم يُقيَّم</span>`}</div>`; }).join("")}</div>
      <p class="foot" style="margin:10px 0 0">ستة معايير من 1 إلى 5: ${HX_CRIT.map(c => c[1]).join("، ")}. يظهر الأعلى تقييماً في نظرة عامة.</p></div>
    <div class="card"><div class="hx-h"><h3>المكافآت · ${MONTHS[S.m - 1]}</h3>${S.canWrite ? `<button class="btn sm" type="button" data-hxnew="reward">مكافأة</button>` : ""}</div>
      ${rew.length ? `<div class="hx-list">${rew.map(e => `<div class="hx-li click" data-hxev="${esc(e.id)}"><div><b>${esc(e.name)}</b><small>${esc(e.reason || "")} · <span class="num">${dmy(e.date)}</span></small></div><b class="num pos">+${fmt(n(e.amount))}</b></div>`).join("")}</div>` : `<div class="hx-empty">لا مكافآت هذا الشهر</div>`}
      <p class="foot" style="margin:10px 0 0">تُضاف تلقائياً في خانة «إضافي» عند إنشاء مسير الشهر.</p></div></div>
    <div class="card"><div class="hx-h"><h3>المخالفات والإجراءات · ${MONTHS[S.m - 1]}</h3>${S.canWrite ? `<button class="btn sm" type="button" data-hxnew="penalty">تسجيل مخالفة</button>` : ""}</div>
      <div class="tw"><table><thead><tr><th>التاريخ</th><th>الموظف</th><th>المخالفة</th><th>المرة</th><th>الإجراء</th><th class="n">الخصم</th><th>ملاحظات</th><th></th></tr></thead>
      <tbody>${pen.length ? pen.map(e => `<tr class="click" data-hxev="${esc(e.id)}"><td class="num">${dmy(e.date)}</td><td>${esc(e.name)}</td><td>${esc(e.violation)}</td><td class="n num">${hxRepeat(e)}</td><td><span class="hx-st ${e.action === "خصم من الراتب" ? "bad" : "warn"}">${esc(e.action)}</span></td><td class="n num">${n(e.amount) ? fmt(n(e.amount)) : "—"}</td><td class="small">${esc(e.notes || "")}</td>
        <td><button class="btn ghost sm" type="button" data-hxletter="warning" data-sid="${esc(e.staffId)}" data-ev="${esc(e.id)}">خطاب إنذار</button></td></tr>`).join("") : `<tr><td colspan="8" class="empty">لا مخالفات مسجّلة هذا الشهر</td></tr>`}</tbody></table></div>
      <p class="foot" style="margin:8px 0 0">«المرة» = عدد مرات المخالفة نفسها للموظف خلال 180 يوماً، ليتدرّج الإجراء كما في لائحة تنظيم العمل. الخصم يُنقل تلقائياً إلى «خصومات» في مسير الشهر.</p></div>`;
}
const hxRepeat = e => hxEv("penalty").filter(x => x.staffId === e.staffId && x.violation === e.violation && x.date <= e.date && x.date >= addDays(e.date, -180)).length;

/* ---------- exit and letters ---------- */
function hxExitView(){
  const sid = S.hxExitSid || (S.staff[0] && S.staff[0].id), s = S.staff.find(x => x.id === sid);
  if (!s) return `<div class="card empty">لا يوجد موظفون.</div>`;
  const last = S.hxExitDate || s.leave || today(), why = S.hxExitWhy || (s.leaveReason === "استقالة" ? "استقالة" : "إنهاء من صاحب العمل");
  const X = hxSettle(s, last, why, n(S.hxExitOther));
  return `<div class="hx-g2">
    <div class="card"><div class="hx-h"><h3>التسوية النهائية (المخالصة)</h3></div>
      <div class="fields">
        <div class="f"><label for="hx_es">الموظف</label><select id="hx_es">${S.staff.map(x => `<option value="${esc(x.id)}" ${x.id === sid ? "selected" : ""}>${esc(x.name)}${x.active === false ? " (غير نشط)" : ""}</option>`).join("")}</select></div>
        <div class="f"><label for="hx_ed">آخر يوم عمل</label><input id="hx_ed" type="date" value="${last}"></div>
        <div class="f"><label for="hx_ew">سبب انتهاء العلاقة</label><select id="hx_ew">${["استقالة","إنهاء من صاحب العمل","انتهاء العقد"].map(k => `<option ${why === k ? "selected" : ""}>${k}</option>`).join("")}</select></div>
        <div class="f"><label for="hx_eo">خصومات أخرى (اختياري)</label><input id="hx_eo" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(S.hxExitOther || "")}"></div></div>
      <div class="hx-settle">${X.rows.map(([l, v, sub]) => `<div class="hx-srow ${v < 0 ? "neg" : ""}"><span>${l}${sub ? `<small>${sub}</small>` : ""}</span><b class="num">${v < 0 ? "−" : ""}${fmt(Math.abs(v))}</b></div>`).join("")}
        <div class="hx-srow tot"><span>صافي المستحق للموظف</span><b class="num ${X.total < 0 ? "neg" : ""}">${fmt(X.total)}</b></div></div>
      <div class="actions" style="margin-top:12px"><button class="btn" type="button" data-hxletter="settle" data-sid="${esc(s.id)}">تنزيل المخالصة PDF</button></div>
      <p class="foot" style="margin:8px 0 0">مكافأة نهاية الخدمة حسب المادتين 84 و85 من نظام العمل على آخر أجر شهري. بدل الإجازات = الرصيد × الأجر اليومي (الأجر ÷ 30). راتب الأيام الأخيرة إن لم يُصرف في مسير.</p></div>
    <div class="card"><div class="hx-h"><h3>الخطابات الجاهزة</h3></div>
      <div class="hx-letters">${[["salary","خطاب تعريف بالراتب","لمن يهمه الأمر: الوظيفة والراتب وتاريخ التعيين"],["experience","شهادة خبرة","مدة العمل والوظيفة، تُعطى عند نهاية الخدمة"],["clearance","إخلاء طرف","تأكيد تسليم العهد وسداد السلف والمستحقات"],["warning","خطاب إنذار","من آخر مخالفة مسجّلة للموظف"]].map(([k, t, d]) => `<button type="button" class="hx-letter" data-hxletter="${k}" data-sid="${esc(s.id)}"><b>${t}</b><small>${d}</small><span>PDF ↓</span></button>`).join("")}</div>
      <p class="foot" style="margin:10px 0 0">كل الخطابات باسم المنشأة وشعارها، وجاهزة للتوقيع والختم.</p></div></div>`;
}
function hxSettle(s, last, why, other){
  const w = n(s.salary), day = w / 30, sv = hrService({...s, leave:last}, last), eos = hrEOS({...s, leave:last}, last);
  const award = eos ? (why === "استقالة" ? eos.resign : eos.full) : 0, bal = hxLeaveBal(s, last), lb = Math.max(0, bal.bal);
  const ym = last.slice(0, 7), p = prDoc(ym), inPay = p && (p.lines || []).some(l => l.staffId === s.id), dd = inPay ? 0 : +last.slice(8);
  const adv = Math.max(0, advBalance(s.id));
  const rows = [["مكافأة نهاية الخدمة", r2(award), eos ? `${sv ? sv.label : ""} · ${why === "استقالة" ? esc(eos.resignNote) : "كاملة"}` : "بلا تاريخ تعيين"],
    ["بدل رصيد الإجازات", r2(lb * day), `${lb.toFixed(1)} يوم × ${fmt(day)}`],
    ["راتب أيام الشهر الأخير", r2(dd * day), inPay ? "مُدرج في مسير الشهر" : `${dd} يوم × ${fmt(day)}`],
    ["رصيد السلف", -r2(adv), ""]];
  if (other) rows.push(["خصومات أخرى", -r2(other), ""]);
  return {rows, total: r2(sumBy(rows, r => r[1])), award, lb, day, dd, adv, sv, eos};
}

/* ---------- bindings ---------- */
function hxBind(el){
  el.querySelectorAll("[data-hxgo]").forEach(b => b.onclick = () => hxTab(b.dataset.hxgo));
  el.querySelectorAll("[data-hxfile]").forEach(b => b.onclick = () => typeof openHrProfile === "function" ? openHrProfile(b.dataset.hxfile) : openStaff(b.dataset.hxfile));
  el.querySelectorAll("[data-hxnew]").forEach(b => b.onclick = () => hxEdit(b.dataset.hxnew, null, b.dataset.sid));
  el.querySelectorAll("[data-hxev]").forEach(r => r.onclick = e => { if (e.target.closest("button")) return; const x = S.hrEvents.find(v => v.id === r.dataset.hxev); if (x) hxEdit(x.kind, x); });
  el.querySelectorAll("[data-hxlv]").forEach(r => r.onclick = e => { if (e.target.closest("button")) return; const x = S.leaves.find(v => v.id === r.dataset.hxlv); if (x) hxEdit("leave", x); });
  el.querySelectorAll("[data-hxlf]").forEach(b => b.onclick = () => { S.hxLvF = b.dataset.hxlf; renderPayroll(); });
  el.querySelectorAll("[data-hxok],[data-hxno]").forEach(b => b.onclick = async () => { const id = b.dataset.hxok || b.dataset.hxno, x = S.leaves.find(v => v.id === id); if (!x) return;
    await recWrite("leaves", id, {...strip(x), status: b.dataset.hxok ? "معتمدة" : "مرفوضة", decidedBy:S.uid || "", decidedAt:new Date().toISOString()}, "edit", b.dataset.hxok ? "اعتُمدت الإجازة" : "رُفضت الإجازة"); });
  el.querySelectorAll("[data-hxletter]").forEach(b => b.onclick = () => hxLetter(b.dataset.hxletter, b.dataset.sid, b.dataset.ev));
  /* attendance */
  const day = $("#hx_day"); if (day){ day.onchange = () => { S.hxDay = day.value || today(); renderPayroll(); };
    $("#hx_dprev").onclick = () => { S.hxDay = addDays(S.hxDay || today(), -1); renderPayroll(); };
    $("#hx_dnext").onclick = () => { const d = addDays(S.hxDay || today(), 1); if (d <= today()){ S.hxDay = d; renderPayroll(); } }; }
  el.querySelectorAll("tr[data-hxa]").forEach(tr => tr.querySelectorAll("[data-k]").forEach(inp => inp.onchange = () => hxSaveAtt(tr.dataset.hxa, inp.dataset.k, inp.value)));
  if ($("#hx_allp")) $("#hx_allp").onclick = async () => { const d = S.hxDay || today(); let k = 0;
    for (const s of hxActive()){ if (hxLeaveOn(d, s.id) || hxRotaCode(d, s.id) === "ر" || (hxAtt(d, s.id) || {}).status) continue; if (await hxSaveAtt(s.id, "status", "حاضر", true)) k++; }
    toast(k ? `سُجّل ${k} حاضر` : "لا يوجد موظف بلا حالة"); };
  if ($("#hx_pos")) $("#hx_pos").onclick = hxFromPos;
  /* rota */
  if ($("#hx_wprev")){ $("#hx_wprev").onclick = () => { S.hxWeek = addDays(S.hxWeek || hxWeek(today()), -7); renderPayroll(); }; $("#hx_wnext").onclick = () => { S.hxWeek = addDays(S.hxWeek || hxWeek(today()), 7); renderPayroll(); }; }
  el.querySelectorAll(".hx-sh").forEach(se => se.onchange = () => { se.className = "hx-sh sh-" + se.value; });
  if ($("#hx_rsave")) $("#hx_rsave").onclick = async () => { const wk = S.hxWeek || hxWeek(today()), plan = {};
    el.querySelectorAll("tr[data-hxr]").forEach(tr => { plan[tr.dataset.hxr] = [...tr.querySelectorAll(".hx-sh")].map(se => se.value); });
    await recWrite("rota", wk, {week:wk, plan}, null, "تم حفظ جدول الأسبوع"); };
  if ($("#hx_rcopy")) $("#hx_rcopy").onclick = () => { const wk = S.hxWeek || hxWeek(today()), pr = S.rota.get(addDays(wk, -7)); if (!pr || !pr.plan){ toast("لا يوجد جدول للأسبوع السابق"); return; }
    el.querySelectorAll("tr[data-hxr]").forEach(tr => { const p = pr.plan[tr.dataset.hxr] || []; tr.querySelectorAll(".hx-sh").forEach((se, i) => { se.value = p[i] || ""; se.className = "hx-sh sh-" + se.value; }); }); toast("نُسخ الأسبوع السابق، راجعه ثم احفظ"); };
  if ($("#hx_shdef")) $("#hx_shdef").onclick = hxShiftDefs;
  /* exit */
  const es = $("#hx_es"); if (es){ es.onchange = () => { S.hxExitSid = es.value; S.hxExitDate = ""; renderPayroll(); };
    $("#hx_ed").onchange = () => { S.hxExitDate = $("#hx_ed").value; renderPayroll(); }; $("#hx_ew").onchange = () => { S.hxExitWhy = $("#hx_ew").value; renderPayroll(); };
    $("#hx_eo").onchange = () => { S.hxExitOther = $("#hx_eo").value; renderPayroll(); }; }
}
function hxTab(k){ S.hrTab = k; document.querySelectorAll("[data-hrt]").forEach(x => { x.classList.toggle("on", x.dataset.hrt === k); x.setAttribute("aria-selected", x.dataset.hrt === k); });
  const pp = $("#pr_period"); if (pp) pp.hidden = !["payroll", "perf"].includes(k); renderPayroll(); }

/* one attendance field; the late minutes come from the rota's start */
async function hxSaveAtt(sid, k, v, quiet){
  const s = S.staff.find(x => x.id === sid); if (!s) return false;
  const d = S.hxDay || today(), id = d + "_" + sid, ex = hxAtt(d, sid);
  const data = {...(ex ? strip(ex) : {}), date:d, staffId:sid, name:s.name, [k]:v};
  if (k === "in" && v && !data.status) data.status = "حاضر";
  const sh = hxShift(hxRotaCode(d, sid));
  if (data.in && sh && sh.from){ const [a, b] = data.in.split(":").map(Number), [c, e] = sh.from.split(":").map(Number), late = (a * 60 + b) - (c * 60 + e);
    data.late = late > 5 && late < 600 ? late : 0; if (data.late && data.status === "حاضر") data.status = "متأخر"; if (!data.late && data.status === "متأخر" && k === "in") data.status = "حاضر"; }
  if (data.status === "غائب" || data.status === "راحة"){ data.in = ""; data.out = ""; data.late = 0; }
  return recWrite("attendance", id, data, null, quiet ? "" : "");
}
/* the cashier's shifts carry who opened them and when: a staff member whose name matches gets those times */
async function hxFromPos(){
  const d = S.hxDay || today(), sh = ((S.pos && S.pos.shifts) || []).filter(z => z.day === d && !z.test);
  if (!sh.length){ toast("لا توجد ورديات كاشير مسجّلة لهذا اليوم"); return; }
  const hm = t => { const x = new Date(t); return String(x.getHours()).padStart(2, "0") + ":" + String(x.getMinutes()).padStart(2, "0"); };
  let k = 0;
  for (const z of sh){ const nm = normName((z.openedBy && z.openedBy.name) || ""); if (!nm) continue;
    const s = hxActive().find(x => normName(x.name) === nm || normName(x.name).startsWith(nm + " ") || nm.startsWith(normName(x.name) + " ")); if (!s) continue;
    await hxSaveAtt(s.id, "in", hm(z.openedAt), true); if (z.closedAt) await hxSaveAtt(s.id, "out", hm(z.closedAt), true); k++; }
  toast(k ? `سُجّلت أوقات ${k} موظف من ورديات الكاشير` : "لم يُطابق اسم الكاشير اسم أي موظف");
}
function hxShiftDefs(){
  const L = hxShifts().map(x => ({...x}));
  $("#sheet").innerHTML = `<div class="entry"><h3 style="margin:0">أوقات الورديات</h3><p class="small muted" style="margin:0">تظهر في جدول الأسبوع ويُحسب منها التأخير والساعات. «راحة» بلا وقت.</p>
    <div class="tw"><table><thead><tr><th>الرمز</th><th>الاسم</th><th>من</th><th>إلى</th></tr></thead><tbody>${L.map((x, i) => `<tr><td class="num">${esc(x.k)}</td><td><input class="hx-in" data-sd="${i}" data-f="l" value="${esc(x.l)}"></td><td><input class="hx-in" type="time" data-sd="${i}" data-f="from" value="${esc(x.from)}" ${x.k === "ر" ? "disabled" : ""}></td><td><input class="hx-in" type="time" data-sd="${i}" data-f="to" value="${esc(x.to)}" ${x.k === "ر" ? "disabled" : ""}></td></tr>`).join("")}</tbody></table></div>
    <div class="actions"><button class="btn" type="button" id="hs_save">حفظ</button><button class="btn ghost" type="button" data-close>إغلاق</button></div></div>`;
  $("#modal").classList.add("open"); $("#sheet").querySelector("[data-close]").onclick = closeModal;
  $("#hs_save").onclick = async () => { $("#sheet").querySelectorAll("[data-sd]").forEach(inp => { L[+inp.dataset.sd][inp.dataset.f] = inp.value.trim(); });
    if (await write(() => setSettingsDoc({...S.settings, hrShifts:L, ...stamp()}), "تم الحفظ")) closeModal(); };
}

/* ---------- forms: leave, penalty, reward, review ---------- */
function hxEdit(kind, x, presetSid){
  const list = hxActive().concat(x && !hxActive().some(s => s.id === x.staffId) ? S.staff.filter(s => s.id === x.staffId) : []);
  if (!list.length){ toast("أضف الموظفين أولاً"); return; }
  const sid = x ? x.staffId : presetSid || list[0].id, coll = kind === "leave" ? "leaves" : "hrEvents";
  const sel = `<div class="f"><label for="hx_s">الموظف</label><select id="hx_s">${list.map(s => `<option value="${esc(s.id)}" ${s.id === sid ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></div>`;
  const v = (k, d) => esc(x && x[k] != null ? x[k] : d == null ? "" : d), opt = (L, cur) => L.map(o => `<option ${o === cur ? "selected" : ""}>${o}</option>`).join("");
  let title = "", body = "";
  if (kind === "leave"){ title = x ? "تعديل إجازة" : "طلب إجازة";
    body = `${sel}<div class="f"><label for="hx_t">النوع</label><select id="hx_t">${HX_LEAVES.map(([k, d]) => `<option value="${k}" ${(x ? x.type : "سنوية") === k ? "selected" : ""}>${k}</option>`).join("")}</select><span class="by" id="hx_th"></span></div>
      <div class="f hx-dates"><label for="hx_f">من</label><input id="hx_f" type="date" value="${v("from", today())}"></div><div class="f hx-dates"><label for="hx_to">إلى</label><input id="hx_to" type="date" value="${v("to", today())}"></div>
      <div class="f"><label for="hx_d">الأيام</label><input id="hx_d" type="number" step="0.5" inputmode="decimal" value="${v("days", 1)}"></div>
      ${S.canEdit ? `<div class="f"><label for="hx_st">الحالة</label><select id="hx_st">${opt(["مطلوبة","معتمدة","مرفوضة"], x ? x.status : "معتمدة")}</select></div>` : ""}
      <div class="f wide"><label for="hx_n">ملاحظات</label><input id="hx_n" value="${v("notes")}"></div><div class="note wide" id="hx_bal"></div>`; }
  else if (kind === "penalty"){ title = x ? "تعديل مخالفة" : "تسجيل مخالفة";
    body = `${sel}<div class="f"><label for="hx_dt">التاريخ</label><input id="hx_dt" type="date" value="${v("date", today())}"></div>
      <div class="f wide"><label for="hx_vi">المخالفة</label><select id="hx_vi">${opt(HX_VIOL, x ? x.violation : HX_VIOL[0])}</select></div>
      <div class="f"><label for="hx_ac">الإجراء</label><select id="hx_ac">${opt(HX_ACT, x ? x.action : HX_ACT[0])}</select></div>
      <div class="f"><label for="hx_am">مبلغ الخصم</label><input id="hx_am" type="number" step="0.01" min="0" inputmode="decimal" value="${v("amount")}"><span class="by" id="hx_amh"></span></div>
      <div class="f wide"><label for="hx_n">التفاصيل</label><input id="hx_n" value="${v("notes")}"></div><div class="note wide" id="hx_rep"></div>`; }
  else if (kind === "reward"){ title = x ? "تعديل مكافأة" : "مكافأة";
    body = `${sel}<div class="f"><label for="hx_dt">التاريخ</label><input id="hx_dt" type="date" value="${v("date", today())}"></div>
      <div class="f"><label for="hx_re">السبب</label><select id="hx_re">${opt(HX_REW, x ? x.reason : HX_REW[0])}</select></div>
      <div class="f"><label for="hx_am">المبلغ</label><input id="hx_am" type="number" step="0.01" min="0" inputmode="decimal" required value="${v("amount")}"></div>
      <div class="f wide"><label for="hx_n">ملاحظات</label><input id="hx_n" value="${v("notes")}"></div>`; }
  else { title = x ? "تعديل تقييم" : "تقييم أداء · " + ymLabel(ymOf(S.y, S.m));
    const sc = (x && x.scores) || {};
    body = `${sel}<div class="hx-crit wide">${HX_CRIT.map(([k, l]) => `<div class="hx-cr"><span>${l}</span><div class="hx-rate" data-c="${k}">${[1,2,3,4,5].map(i => `<button type="button" data-v="${i}" class="${n(sc[k]) >= i ? "on" : ""}" aria-label="${i}">★</button>`).join("")}</div></div>`).join("")}</div>
      <div class="f wide"><label for="hx_n">نقاط القوة وما يحتاج تطويراً</label><textarea id="hx_n" rows="3">${v("notes")}</textarea></div>`; }
  $("#sheet").innerHTML = `<form class="entry" id="fhx"><h3 style="margin:0">${title}</h3><div class="fields">${body}</div>
    <div class="actions"><button class="btn" type="submit" ${S.canWrite ? "" : "disabled"}>حفظ</button><button class="btn ghost" type="button" id="hx_x">إغلاق</button>${x && S.canWrite ? `<button class="btn danger sm" type="button" id="hx_del">حذف (أرشفة)</button>` : ""}</div></form>`;
  $("#modal").classList.add("open"); $("#hx_x").onclick = closeModal;
  if ($("#hx_del")) armDelete($("#hx_del"), async () => { if (await archive(coll, x.id)) closeModal(); });
  const S2 = () => S.staff.find(s => s.id === $("#hx_s").value);
  if (kind === "leave"){ const calc = () => { const f = $("#hx_f").value, t = $("#hx_to").value, ty = $("#hx_t").value; $("#hx_th").textContent = (HX_LEAVES.find(o => o[0] === ty) || [])[1] || "";
      const adj = ty === "تعديل رصيد"; $("#hx_f").closest(".f").hidden = adj; $("#hx_to").closest(".f").hidden = adj;
      if (!adj && f && t && t >= f) $("#hx_d").value = hxDays(f, t) + 1;
      const b = hxLeaveBal(S2()); $("#hx_bal").innerHTML = `رصيد ${esc(S2().name)} السنوي: <b class="num">${b.bal.toFixed(1)}</b> يوم${ty === "سنوية" && n($("#hx_d").value) > b.bal ? ` · <b class="neg">الطلب أكبر من الرصيد</b>` : ""}`; };
    ["hx_f","hx_to","hx_t","hx_s"].forEach(i => $("#" + i).onchange = calc); $("#hx_d").oninput = calc; calc(); }
  if (kind === "penalty"){ const rep = () => { const k = hxEv("penalty").filter(e => e.staffId === $("#hx_s").value && e.violation === $("#hx_vi").value && e.date >= addDays($("#hx_dt").value, -180) && (!x || e.id !== x.id)).length + 1;
      $("#hx_rep").innerHTML = `هذه المرة رقم <b class="num">${k}</b> لهذه المخالفة خلال 180 يوماً${k === 1 ? " · الإجراء المعتاد: تنبيه أو إنذار كتابي" : k === 2 ? " · يتدرّج إلى إنذار كتابي أو خصم" : " · يتدرّج إلى خصم، وقد يصل إلى الفصل وفق لائحة تنظيم العمل"}`;
      $("#hx_amh").textContent = `أجر يوم واحد: ${fmt(n((S2() || {}).salary) / 30)}`; };
    ["hx_s","hx_vi","hx_dt"].forEach(i => $("#" + i).onchange = rep); rep(); }
  if (kind === "review") $("#sheet").querySelectorAll(".hx-rate").forEach(g => g.querySelectorAll("button").forEach(b => b.onclick = () => { g.dataset.val = b.dataset.v; g.querySelectorAll("button").forEach(z => z.classList.toggle("on", +z.dataset.v <= +b.dataset.v)); }));
  $("#fhx").onsubmit = async e => { e.preventDefault(); const s = S2(), notes = $("#hx_n").value.trim(); let data;
    if (kind === "leave"){ const ty = $("#hx_t").value, adj = ty === "تعديل رصيد", f = $("#hx_f").value, t = $("#hx_to").value;
      if (!adj && (!f || !t || t < f)){ toast("تحقق من تاريخي الإجازة"); return; }
      data = {staffId:s.id, name:s.name, type:ty, from: adj ? today() : f, to: adj ? today() : t, days: r2(n($("#hx_d").value)), status: $("#hx_st") ? $("#hx_st").value : "مطلوبة", notes};
      if (data.status !== (x && x.status)){ data.decidedBy = data.status === "مطلوبة" ? "" : S.uid || ""; data.decidedAt = data.status === "مطلوبة" ? "" : new Date().toISOString(); } }
    else if (kind === "review"){ const scores = {}; $("#sheet").querySelectorAll(".hx-rate").forEach(g => { const on = g.querySelectorAll("button.on").length; if (on) scores[g.dataset.c] = on; });
      if (!Object.keys(scores).length){ toast("اختر تقييماً لمعيار واحد على الأقل"); return; }
      const ym = x ? x.ym : ymOf(S.y, S.m), dup = hxEv("review", ym, s.id).find(r => !x || r.id !== x.id); if (dup){ toast("لهذا الموظف تقييم في هذا الشهر؛ افتحه لتعديله"); return; }
      data = {kind, staffId:s.id, name:s.name, ym, date: x ? x.date : today(), scores, notes}; }
    else { const dt = $("#hx_dt").value; data = {kind, staffId:s.id, name:s.name, date:dt, ym:dt.slice(0, 7), amount: r2(n($("#hx_am").value)), notes};
      if (kind === "penalty"){ data.violation = $("#hx_vi").value; data.action = $("#hx_ac").value; } else data.reason = $("#hx_re").value;
      if (kind === "reward" && !(data.amount > 0)){ toast("اكتب مبلغ المكافأة"); return; } }
    if (await recWrite(coll, x ? x.id : null, data, null, "تم الحفظ")) closeModal(); };
}

/* ---------- letters (PDF through the report engine) ---------- */
function hxLetter(kind, sid, ev){
  if (kind === "warning" && !ev){ const last = hxEv("penalty", null, sid).sort((a, b) => b.date.localeCompare(a.date))[0]; if (!last){ toast("لا توجد مخالفة مسجّلة لهذا الموظف"); return; } ev = last.id; }
  const keep = S.rp; S.rp = {type:"hrdoc", a:today(), b:today(), emp:[kind, sid, ev || "", S.hxExitDate || "", S.hxExitWhy || "", S.hxExitOther || ""].join("|")};
  exportPdf().finally(() => { S.rp = keep; });
}
REPORTS.hrdoc = function(a, b, emp){
  const [kind, sid, ev, d0, why0, oth] = String(emp || "").split("|"), s = S.staff.find(x => x.id === sid) || {}, sv = hrService(s), firm = esc(brandAr());
  const head = t => `<div class="rp-head"><div class="rp-meta" style="text-align:right"><div class="rp-title">${t}</div><div>التاريخ: <span class="num">${dmy(today())}</span></div></div></div>`;
  const sign = `<div style="display:flex;justify-content:space-between;margin-top:48px;font-size:13px"><div>الموظف: ${esc(s.name || "")}<br><br>التوقيع: ............................</div><div>عن ${firm}<br><br>التوقيع والختم: ............................</div></div>`;
  const P = t => `<p style="font-size:14px;line-height:2.1;margin:0 0 12px">${t}</p>`;
  const who = `${esc(s.name || "")}${s.nationality ? `، ${esc(s.nationality)} الجنسية` : ""}${s.iqamaNo ? `، رقم الإقامة/الهوية <span class="num">${esc(s.iqamaNo)}</span>` : ""}`;
  let title = "", html = "";
  if (kind === "salary"){ title = "خطاب تعريف بالراتب";
    html = P("إلى من يهمه الأمر،") + P(`تشهد ${firm} بأن السيد/ ${who}، يعمل لدينا بوظيفة «${esc(s.role || s.iqamaProf || "موظف")}» منذ <span class="num">${dmy(s.start || "")}</span>${s.active === false ? " حتى " + `<span class="num">${dmy(s.leave || "")}</span>` : " ولا يزال على رأس العمل"}.`) +
      rpTable(["البند","المبلغ الشهري (ر.س)"], [["الأجر الأساسي", fmt(n(s.basic) || n(s.salary))], ...(n(s.housing) ? [["بدل السكن", fmt(n(s.housing))]] : []), ...(n(s.transport) ? [["بدل النقل", fmt(n(s.transport))]] : []), ...(n(s.otherAllow) ? [["بدلات أخرى", fmt(n(s.otherAllow))]] : [])], ["إجمالي الراتب الشهري", `<b>${fmt(n(s.salary))}</b>`], ["60%","40%"]) +
      P("وقد أُعطي هذا الخطاب بناءً على طلبه دون أدنى مسؤولية على المنشأة."); }
  else if (kind === "experience"){ title = "شهادة خبرة";
    html = P("إلى من يهمه الأمر،") + P(`تشهد ${firm} بأن السيد/ ${who}، عمل لدينا بوظيفة «${esc(s.role || s.iqamaProf || "موظف")}» خلال الفترة من <span class="num">${dmy(s.start || "")}</span> إلى <span class="num">${dmy(s.leave || today())}</span>${sv ? ` (${esc(sv.label)})` : ""}.`) +
      P("وقد كان خلال فترة عمله مثالاً للالتزام وحسن الأداء، ونتمنى له التوفيق في مسيرته.") + P("أُعطيت هذه الشهادة بناءً على طلبه."); }
  else if (kind === "clearance"){ title = "إخلاء طرف";
    const adv = Math.max(0, advBalance(s.id));
    html = P(`تفيد ${firm} بأن السيد/ ${who}، قد أنهى علاقته العملية لدينا${s.leave ? ` بتاريخ <span class="num">${dmy(s.leave)}</span>` : ""}، وأنه:`) +
      rpTable(["البند","الحالة"], [["تسليم العهد والأدوات والزي", "تم ☐"], ["رصيد السلف", adv ? `متبقٍ ${fmt(adv)} ر.س` : "مسدد ✓"], ["تسليم المفاتيح وبطاقات الدخول", "تم ☐"], ["استلام المستحقات النهائية", "تم ☐"]], null, ["60%","40%"]) +
      P("وبذلك تُخلي المنشأة طرفه من أي التزامات تجاهها، ما لم يظهر خلاف ذلك."); }
  else if (kind === "warning"){ const e = S.hrEvents.find(x => x.id === ev) || {}, k = e.id ? hxRepeat(e) : 1; title = "خطاب إنذار";
    html = P(`السيد/ ${who}،`) + P(`نحيطكم علماً بأنه بتاريخ <span class="num">${dmy(e.date || "")}</span> بدر منكم ما يلي: «${esc(e.violation || "")}»${e.notes ? ` (${esc(e.notes)})` : ""}، وهي المرة رقم <span class="num">${k}</span> خلال 180 يوماً.`) +
      P(`وعليه تقرر: <b>${esc(e.action || "إنذار كتابي")}</b>${n(e.amount) ? ` بخصم مبلغ <b class="num">${fmt(n(e.amount))}</b> ر.س من راتب شهر ${esc(ymLabel(e.ym || today().slice(0, 7)))}` : ""}.`) +
      P("نأمل الالتزام بأنظمة العمل وتعليماته، علماً بأن تكرار المخالفة يستوجب تدرّج الجزاء وفق لائحة تنظيم العمل."); }
  else if (kind === "settle"){ title = "مخالصة نهائية";
    const last = d0 || s.leave || today(), why = why0 || "استقالة", X = hxSettle(s, last, why, n(oth));
    html = P(`بيان المستحقات النهائية للسيد/ ${who}، الوظيفة «${esc(s.role || "")}»، تاريخ التعيين <span class="num">${dmy(s.start || "")}</span>، آخر يوم عمل <span class="num">${dmy(last)}</span>، سبب انتهاء العلاقة: ${esc(why)}${X.sv ? `، مدة الخدمة ${esc(X.sv.label)}` : ""}.`) +
      rpTable(["البند","التفاصيل","المبلغ (ر.س)"], X.rows.map(r => [r[0], r[2] || "", (r[1] < 0 ? "− " : "") + fmt(Math.abs(r[1]))]), ["صافي المستحق", "", `<b>${fmt(X.total)}</b>`], ["38%","40%","22%"]) +
      P(`أقرّ أنا الموقّع أدناه باستلامي مبلغ <b class="num">${fmt(X.total)}</b> ر.س يمثل كامل مستحقاتي لدى ${firm}، وأنه لم يعد لي أي حقوق أو مطالبات تجاهها.`); }
  return {title: `${title} · ${s.name || ""}`, orient:"portrait", html: `<div class="rp-brand-only">${rpHead(title, today(), today(), "").replace(/<div>الفترة:[\s\S]*?<\/div>/, "")}</div>` + `<div style="margin-top:18px">${html}</div>` + sign + rpFoot()};
};

if (typeof SZ_NAMES !== "undefined") Object.assign(SZ_NAMES, {attendance:"الحضور", rota:"جداول الورديات", leaves:"الإجازات", hrEvents:"المخالفات والمكافآت والتقييمات"});
(function(){ const st = document.createElement("style"); st.id = "hx-css"; st.textContent = `
.hx-wrap{display:grid;gap:16px}.hx-wrap>*{min-width:0}
.hr-tabs .seg{max-width:100%;overflow-x:auto;scrollbar-width:none}
.hx-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}.hx-g2>*{min-width:0}
@media (max-width:900px){.hx-g2{grid-template-columns:minmax(0,1fr)}}
.hx-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}.hx-h h3{margin:0!important}
.hx-n{min-width:24px;height:24px;border-radius:99px;background:var(--accent-soft,#FBE7E8);color:var(--red-ink);font-weight:700;font-size:12px;display:grid;place-items:center;padding:0 7px}
.hx-st{display:inline-block;padding:2px 9px;border-radius:99px;font-size:12px;font-weight:700;white-space:nowrap;background:var(--line2);color:var(--muted)}
.hx-st.ok{background:color-mix(in srgb,#16A34A 13%,var(--card));color:#15803D}.hx-st.warn{background:color-mix(in srgb,#D97706 15%,var(--card));color:#B45309}
.hx-st.bad{background:color-mix(in srgb,#DC2626 12%,var(--card));color:#B91C1C}.hx-st.info{background:color-mix(in srgb,#2563EB 12%,var(--card));color:#1D4ED8}
.hx-st.none{background:transparent;border:1px dashed var(--line);font-weight:500}
.hx-today,.hx-comp,.hx-lead,.hx-list{display:grid;gap:2px}
.hx-trow,.hx-crow,.hx-lrow,.hx-li{display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid var(--line2)}
.hx-trow:last-child,.hx-crow:last-child,.hx-lrow:last-child,.hx-li:last-child{border-bottom:0}
.hx-crow,.hx-lrow.click,.hx-li.click{cursor:pointer;border-radius:8px}.hx-crow:hover,.hx-lrow.click:hover,.hx-li.click:hover{background:var(--head)}
.hx-tn{flex:1;min-width:0;display:grid}.hx-tn b{font-size:14px;font-weight:600}.hx-tn small{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hx-tn2{display:flex;align-items:center;gap:9px}.hx-tn2 div{display:grid}.hx-tn2 small{font-size:11.5px;color:var(--muted)}
.hx-trow .hr-av,.hx-crow .hr-av,.hx-lrow .hr-av,.hx-tn2 .hr-av{width:32px;height:32px;font-size:12px;flex:none}
.hx-pbar{width:90px;height:6px;border-radius:99px;background:var(--line2);overflow:hidden;flex:none}.hx-pbar i{display:block;height:100%;border-radius:99px}
.hx-pbar i.ok{background:#16A34A}.hx-pbar i.warn{background:#D97706}.hx-pbar i.bad{background:#DC2626}
.hx-alerts{display:grid;gap:8px}
.hx-al{display:grid;gap:2px;text-align:start;font:inherit;color:var(--ink);background:var(--head);border:1px solid var(--line);border-inline-start:3px solid #D97706;border-radius:10px;padding:9px 12px;cursor:pointer}
.hx-al.bad{border-inline-start-color:#DC2626}.hx-al.info{border-inline-start-color:#2563EB}.hx-al b{font-size:13.5px;font-weight:600}.hx-al small{font-size:12px;color:var(--muted)}
.hx-al:hover{border-color:color-mix(in srgb,var(--ink) 18%,var(--line))}
.hx-ok,.hx-empty{color:var(--muted);text-align:center;padding:20px 6px;font-size:13.5px}
.hx-lrow b{flex:1;font-weight:600}.hx-rank{width:24px;height:24px;border-radius:50%;background:var(--line2);display:grid;place-items:center;font-size:12px;font-weight:700;flex:none}.hx-rank.top{background:#F59E0B;color:#fff}
.hx-stars{color:var(--line);font-size:15px;letter-spacing:1px;white-space:nowrap}.hx-stars i{font-style:normal}.hx-stars i.on{color:#F59E0B}.hx-stars i.half{color:#FCD34D}
.hx-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;border-top:1px solid var(--line);margin-top:12px;padding-top:12px}.hx-mini div{display:grid}.hx-mini small{font-size:11.5px;color:var(--muted)}.hx-mini b{font-size:16px}
.hx-li div{flex:1;display:grid}.hx-li small{font-size:12px;color:var(--muted)}
.hx-in,.hx-sel,.hx-sh{height:34px;border:1px solid var(--line);border-radius:8px;background:var(--field,#fff);padding:0 8px;font:inherit;font-size:13.5px;color:var(--ink);min-width:0}
.hx-att .hx-in[data-k="notes"]{width:100%;min-width:120px}.hx-att .hx-in[type=time]{width:104px}.hx-att .hx-sel{width:104px}
.hx-sh{width:100%;min-width:78px;text-align:center;font-weight:600}
.hx-sh.sh-ص{background:color-mix(in srgb,#F59E0B 14%,var(--card))}.hx-sh.sh-م{background:color-mix(in srgb,#6366F1 13%,var(--card))}.hx-sh.sh-ك{background:color-mix(in srgb,#16A34A 13%,var(--card))}.hx-sh.sh-ر{background:var(--line2);color:var(--muted)}
th.hx-now{color:var(--red)!important}
.hx-settle{display:grid;gap:0;margin-top:14px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.hx-srow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--line2)}.hx-srow span{display:grid}.hx-srow small{font-size:11.5px;color:var(--muted)}
.hx-srow.neg b{color:var(--bad)}.hx-srow.tot{background:var(--head);border-bottom:0;font-weight:700}.hx-srow.tot b{font-size:18px}
.hx-letters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hx-letter{display:grid;gap:4px;text-align:start;font:inherit;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;cursor:pointer}
.hx-letter:hover{border-color:var(--red);background:var(--accent-soft,#FBE7E8)}.hx-letter b{font-size:14.5px}.hx-letter small{font-size:12px;color:var(--muted);line-height:1.6}.hx-letter span{font-size:12px;font-weight:700;color:var(--red-ink)}
.hx-crit{display:grid;gap:8px}.hx-cr{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--line);border-radius:10px}
.hx-rate{display:flex;gap:2px;direction:ltr}.hx-rate button{border:0;background:none;font-size:22px;color:var(--line);cursor:pointer;padding:0 2px;line-height:1}.hx-rate button.on{color:#F59E0B}
@media (max-width:640px){.hx-letters{grid-template-columns:1fr}.hx-pbar{width:56px}}
`; document.head.appendChild(st); })();
