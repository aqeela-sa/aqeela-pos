/* ================= الموارد البشرية — the employee's complete file, the document vault, and the letters =================
   ملف الموظف: one window with tabs — overview, documents, attendance (a month calendar), leaves, performance, pay, letters.
   المستندات: every document of every employee — its number, issue and expiry dates, and its pictures (a PDF becomes pictures),
     kept in acc_hrFiles (owner, or an account granted «الموارد البشرية»), never in the shared attachments.
   الخطابات: A4 letters on the business's letterhead, numbered and kept in a register (acc_hrEvents, kind «letter»),
     in Arabic, and in English for the certificates employees take to banks and embassies.
   Data: acc_staff/{id}.docx = {type:{no, issue, exp, note, files}}, .photo (a small picture), .roleEn
         acc_hrFiles/{id}    = {staffId, doc, name, data (a compressed picture), page, pages, at, by, deleted}
         acc_settings/main.hrLetter = the business's details for the letterhead */

/* ---------- document types ---------- */
const HD = [
  {k:"iqama",    name:"الإقامة / الهوية",     no:"iqamaNo",    exp:"iqamaExp",    req:1, ic:"M4 6h16v12H4z|M8 10.5a1.5 1.5 0 1 0 0 .01|M12 10h5|M12 13h4|M6.5 15c.4-1.2 1.2-1.8 2.5-1.8s2.1.6 2.5 1.8"},
  {k:"passport", name:"جواز السفر",           no:"passportNo", exp:"passportExp", req:1, ic:"M6 3h12v18H6z|M12 11.5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0|M9 17h6"},
  {k:"health",   name:"الشهادة الصحية",        no:"healthNo",   exp:"healthExp",   req:1, ic:"M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z|M12 9v5|M9.5 11.5h5"},
  {k:"ins",      name:"التأمين الطبي",         no:"insNo",      exp:"insExp",      req:1, ic:"M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z|M9 12l2 2 4-4"},
  {k:"contract", name:"عقد العمل",             exp:"contractEnd", req:1,          ic:"M7 3h7l4 4v14H7z|M14 3v4h4|M9.5 12h6|M9.5 15h6|M9.5 18h3"},
  {k:"license",  name:"رخصة القيادة",          ic:"M3 7h18v10H3z|M7 12h.01|M10 10h7|M10 14h5"},
  {k:"edu",      name:"المؤهلات والشهادات",    noExp:1, ic:"M2 9l10-5 10 5-10 5z|M6 11v5c3 2 9 2 12 0v-5"},
  {k:"bank",     name:"شهادة الآيبان",          noExp:1, ic:"M3 10h18|M5 10v7|M9.5 10v7|M14.5 10v7|M19 10v7|M3 20h18|M12 3l9 5H3z"},
  {k:"other",    name:"مستندات أخرى",           noExp:1, ic:"M3 6h6l2 2h10v11H3z"}];
const hdIcon = (d, sz) => `<svg width="${sz || 20}" height="${sz || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d.ic.split("|").map(p => `<path d="${p}"/>`).join("")}</svg>`;
const hdGet = (s, d) => { const x = (s.docx && s.docx[d.k]) || {};
  return {no: d.no ? s[d.no] || "" : x.no || "", exp: d.exp ? s[d.exp] || "" : x.exp || "", issue: x.issue || "", note: x.note || "", files: n(x.files)}; };
function hdState(s, d){
  const g = hdGet(s, d);
  if (d.noExp || !g.exp){ if (g.files || g.no) return {lv:"ok", label: g.files ? "مرفق" : "مسجّل", days:null};
    return {lv:"none", label: d.req ? "غير مسجّل" : "—", days:null}; }
  return hrDocState({_e:g.exp}, {exp:"_e"});
}
/* the alerts (overview, employee files) also see the documents beyond the five on the employee form */
const hdBaseAlerts = hrAlerts;
hrAlerts = function(){
  const out = hdBaseAlerts();
  S.staff.filter(s => s.active !== false).forEach(s => HD.filter(d => !d.exp && !d.noExp).forEach(d => { const st = hdState(s, d);
    if (st.lv === "bad" || st.lv === "warn" || st.lv === "soon") out.push({s, d:{name:d.name}, st}); }));
  return out.sort((a, b) => a.st.days - b.st.days);
};

/* ---------- small helpers ---------- */
const HR_NAT_EN = {"سعودي":"Saudi","سوداني":"Sudanese","مصري":"Egyptian","يمني":"Yemeni","سوري":"Syrian","أردني":"Jordanian","هندي":"Indian","باكستاني":"Pakistani","بنغلاديشي":"Bangladeshi","نيبالي":"Nepalese","فلبيني":"Filipino","إندونيسي":"Indonesian","سريلانكي":"Sri Lankan","إثيوبي":"Ethiopian","فلسطيني":"Palestinian","لبناني":"Lebanese","مغربي":"Moroccan","تونسي":"Tunisian","جزائري":"Algerian","تركي":"Turkish","كيني":"Kenyan","أوغندي":"Ugandan","إريتري":"Eritrean","تشادي":"Chadian","نيجيري":"Nigerian",
  "السعودية":"Saudi","السودان":"Sudanese","مصر":"Egyptian","اليمن":"Yemeni","سوريا":"Syrian","الأردن":"Jordanian","الهند":"Indian","باكستان":"Pakistani","بنغلاديش":"Bangladeshi","نيبال":"Nepalese","الفلبين":"Filipino","إندونيسيا":"Indonesian","سريلانكا":"Sri Lankan","إثيوبيا":"Ethiopian","فلسطين":"Palestinian","لبنان":"Lebanese","المغرب":"Moroccan","تونس":"Tunisian","الجزائر":"Algerian","تركيا":"Turkish","كينيا":"Kenyan","أوغندا":"Ugandan","إريتريا":"Eritrean","تشاد":"Chadian","نيجيريا":"Nigerian"};
const hijri = (d, en) => { try { return new Intl.DateTimeFormat(en ? "en-u-ca-islamic-umalqura-nu-latn" : "ar-SA-u-ca-islamic-umalqura-nu-latn", {day:"numeric", month:"long", year:"numeric"}).format(pd(d)); } catch(e){ return ""; } };
const enDate = d => { if (!d) return ""; const x = pd(d); return x.toLocaleDateString("en-GB", {day:"2-digit", month:"long", year:"numeric"}); };
const hpFem = s => s.gender === "أنثى";
const G = (s, m, f) => hpFem(s) ? f : m;

/* ================= files: pictures (a PDF becomes one picture per page) ================= */
const HF = new Map();   // staffId → {at, list}
async function hfLoad(sid, force){
  const c = HF.get(sid); if (c && !force && Date.now() - c.at < 120000) return c.list;
  let list = [];
  try { const q = await S.db.collection("hrFiles").where("staffId", "==", sid).get(); list = q.docs.map(d => ({id:d.id, ...d.data()})).filter(f => !f.deleted); } catch(e){}
  /* pictures attached the old way (الموظفين ← صور الوثائق) still show, under «مستندات أخرى» */
  try { (await loadAttachments("staff/" + sid)).forEach(a => list.push({...a, doc:"other", legacy:true})); } catch(e){}
  list.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")) || n(a.page) - n(b.page));
  HF.set(sid, {at:Date.now(), list}); return list;
}
/* a canvas made smaller until its picture is under ~230 KB, the size one database record holds comfortably */
function hfSqueeze(src, w, h){
  let side = Math.max(w, h) > 1700 ? 1700 : Math.max(w, h), q = 0.8, data = "";
  for (let i = 0; i < 7; i++){
    const k = side / Math.max(w, h), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height);
    data = c.toDataURL("image/jpeg", q); if (data.length < 230000) return {data, w:c.width, h:c.height};
    side = Math.round(side * 0.82); q = Math.max(0.5, q - 0.06);
  }
  return {data, w:0, h:0};
}
let PDFJS = null;
async function hfPdfPages(file, onPage){
  if (!PDFJS){ PDFJS = await import(new URL("vendor/pdf.min.mjs", document.baseURI).href); PDFJS.GlobalWorkerOptions.workerSrc = new URL("vendor/pdf.worker.min.mjs", document.baseURI).href; }
  const doc = await PDFJS.getDocument({data: new Uint8Array(await file.arrayBuffer())}).promise, out = [], N = Math.min(doc.numPages, 12);
  for (let i = 1; i <= N; i++){
    const pg = await doc.getPage(i), v0 = pg.getViewport({scale:1}), k = Math.min(2.2, 1700 / Math.max(v0.width, v0.height)), vp = pg.getViewport({scale:k});
    const c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    await pg.render({canvasContext:x, viewport:vp}).promise;
    out.push(hfSqueeze(c, c.width, c.height)); onPage && onPage(i, N);
  }
  return {pages:out, total:doc.numPages};
}
async function hfImage(file){
  const url = URL.createObjectURL(file);
  try { const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    return hfSqueeze(img, img.naturalWidth, img.naturalHeight); } finally { URL.revokeObjectURL(url); }
}
/* stores the chosen files of one document; returns how many pictures were kept */
async function hfUpload(s, k, files, onStep){
  let kept = 0, skipped = 0;
  for (const f of files){
    const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name || "");
    let pages = [];
    try {
      if (isPdf){ const r = await hfPdfPages(f, (i, N) => onStep && onStep(`تحويل صفحة ${i} من ${N}…`)); pages = r.pages; if (r.total > 12) skipped += r.total - 12; }
      else { onStep && onStep("تجهيز الصورة…"); pages = [await hfImage(f)]; }
    } catch(e){ console.error(e); toast(isPdf ? "تعذّر قراءة ملف PDF: " + (f.name || "") : "تعذّر قراءة الصورة: " + (f.name || "")); continue; }
    const at = new Date().toISOString();
    for (let i = 0; i < pages.length; i++){ onStep && onStep(`حفظ ${kept + 1}…`);
      const ok = await write(() => S.db.collection("hrFiles").doc().set({staffId:s.id, name:s.name, doc:k, file:f.name || "", src: isPdf ? "pdf" : "image", page:i + 1, pages:pages.length, data:pages[i].data, w:pages[i].w, h:pages[i].h, at, by:S.uid || ""}));
      if (ok) kept++; }
  }
  if (skipped) toast(`حُفظت أول 12 صفحة فقط من ملف PDF (${skipped} صفحة لم تُحفظ)`);
  return kept;
}
async function hfCount(s, k, delta){
  const docx = {...(s.docx || {})}; docx[k] = {...(docx[k] || {}), files: Math.max(0, n(docx[k] && docx[k].files) + delta)};
  return recWrite("staff", s.id, {...strip(s), docx}, "edit", "");
}

/* a picture viewer with its pages: arrows, download, open full size */
function hfView(list, i0){
  let i = i0 || 0, lb = $("#hf_lb");
  if (!lb){ lb = document.createElement("div"); lb.id = "hf_lb"; lb.className = "hf-lb"; document.body.appendChild(lb); }
  const draw = () => { const f = list[i], src = f.data || attSrc(f);
    lb.innerHTML = `<div class="hf-bar"><b>${esc((HD.find(d => d.k === f.doc) || {}).name || "مستند")}${list.length > 1 ? ` · <span class="num">${i + 1} / ${list.length}</span>` : ""}</b>
      <span><a class="btn ghost sm" href="${esc(src)}" download="${esc((f.name || "مستند") + "-" + (i + 1))}.jpg">تنزيل</a><button class="btn sm" type="button" id="hf_x">إغلاق</button></span></div>
      <div class="hf-stage">${list.length > 1 ? `<button class="hf-nav nx" type="button" aria-label="التالي">‹</button>` : ""}<img src="${esc(src)}" alt="">${list.length > 1 ? `<button class="hf-nav pv" type="button" aria-label="السابق">›</button>` : ""}</div>`;
    lb.querySelector("#hf_x").onclick = () => lb.classList.remove("open");
    const nx = lb.querySelector(".nx"), pv = lb.querySelector(".pv");
    if (nx) nx.onclick = () => { i = (i + 1) % list.length; draw(); }; if (pv) pv.onclick = () => { i = (i - 1 + list.length) % list.length; draw(); }; };
  lb.onclick = e => { if (e.target === lb || e.target.classList.contains("hf-stage")) lb.classList.remove("open"); };
  document.onkeydown = e => { if (!lb.classList.contains("open")) return; if (e.key === "Escape") lb.classList.remove("open"); };
  draw(); lb.classList.add("open");
}

/* ================= the employee file ================= */
const HP_TABS = [["ov","نظرة عامة"],["docs","المستندات"],["att","الحضور"],["leave","الإجازات"],["perf","الأداء والانضباط"],["pay","الرواتب والسلف"],["letters","الخطابات"]];
/* forms opened from the file come back to it when they close */
const hpClose0 = closeModal;
closeModal = function(){ const back = S.hpBack; S.hpBack = null; hpClose0(); if (back && S.staff.some(s => s.id === back)) setTimeout(() => openHrProfile(back, S.hpTab), 0); };
const hpVia = (sid, fn) => { S.hpBack = sid; fn(); };

openHrProfile = async function(id, tab){
  const s = S.staff.find(v => v.id === id); if (!s) return;
  S.hpTab = tab || (S.hpId === id && S.hpTab) || "ov"; S.hpId = id;
  const sv = hrService(s), lb = hxLeaveBal(s), b = advBalance(s.id), ym = today().slice(0, 7), mo = hxMonth(s.id, ym);
  const rv = hxEv("review", null, s.id).sort((a, b) => b.ym.localeCompare(a.ym)), avg = rv.length ? hxReviewAvg(rv[0]) : 0;
  const docBad = HD.filter(d => ["bad","warn"].includes(hdState(s, d).lv)).length, docMiss = HD.filter(d => d.req && hdState(s, d).lv === "none").length;
  const stat = (l, v, sub, cls) => `<div class="hp-st ${cls || ""}"><small>${l}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ""}</div>`;
  $("#sheet").innerHTML = `<div class="hp">
    <div class="hp-head">
      <label class="hp-ph" title="${S.canWrite ? "تغيير الصورة" : ""}">${hrAvatar(s, "xl")}${S.canWrite ? `<span class="hp-cam" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><input type="file" accept="image/*" id="hp_photo" hidden>` : ""}</label>
      <div class="hp-id"><h3>${esc(s.name)}</h3>
        <div class="hp-sub">${esc(s.role || "بدون وظيفة")}${s.nameEn ? ` · <span dir="ltr">${esc(s.nameEn)}</span>` : ""}</div>
        <div class="hp-chips"><span class="chip ${s.active === false ? "info" : "ok"}">${s.active === false ? "متوقف" + (s.leaveReason ? " · " + esc(s.leaveReason) : "") : "على رأس العمل"}</span><span class="chip">${esc(s.kind || "أساسي")}</span>${sv ? `<span class="chip">${esc(sv.label)}</span>` : ""}${s.nationality ? `<span class="chip">${esc(s.nationality)}</span>` : ""}</div></div>
      <div class="hp-acts">${S.canWrite ? `<button class="btn ghost sm" type="button" id="hp_edit">تعديل البيانات</button>` : ""}<button class="btn ghost sm" type="button" id="hp_pdf">تقرير PDF</button><button class="btn sm" type="button" id="hp_x">إغلاق</button></div>
    </div>
    <div class="hp-stats">
      ${stat("الراتب الشهري", `<span class="num">${fmt(n(s.salary))}</span>`, "ريال")}
      ${stat("رصيد الإجازات", `<span class="num">${lb.bal.toFixed(1)}</span>`, "يوم")}
      ${stat("حضور " + MONTHS[+ym.slice(5) - 1], `<span class="num">${mo.present}</span>`, `${mo.absent} غياب · ${mo.late} تأخير`, mo.absent ? "warn" : "")}
      ${stat("آخر تقييم", rv.length ? `<span class="num">${avg.toFixed(1)}</span> <small class="hp-star">★</small>` : "—", rv.length ? ymLabel(rv[0].ym) : "لم يُقيَّم")}
      ${stat("المستندات", docBad ? `<span class="num">${docBad}</span>` : docMiss ? `<span class="num">${docMiss}</span>` : "✓", docBad ? "منتهية أو قريبة" : docMiss ? "ناقصة" : "مكتملة", docBad ? "bad" : docMiss ? "warn" : "ok")}
      ${stat("سلف قائمة", b > 0.004 ? `<span class="num">${fmt(b)}</span>` : "—", b > 0.004 ? "ريال" : "لا توجد", b > 0.004 ? "warn" : "")}
    </div>
    <div class="seg hp-tabs" role="tablist">${HP_TABS.map(([k, l]) => `<button type="button" role="tab" data-hpt="${k}" class="${S.hpTab === k ? "on" : ""}" aria-selected="${S.hpTab === k}">${l}</button>`).join("")}</div>
    <div class="hp-body" id="hp_body"></div></div>`;
  $("#sheet").classList.add("pd-wide"); $("#modal").classList.add("open");
  $("#hp_x").onclick = () => { S.hpBack = null; closeModal(); };
  if ($("#hp_edit")) $("#hp_edit").onclick = () => hpVia(id, () => openStaff(id));
  $("#hp_pdf").onclick = () => { const keep = S.rp, advs = S.advances.filter(a => (a.staffId || a.name) === s.id); const a0 = [s.start, ...hrPayHistory(id).map(h => h.ym + "-01"), ...advs.map(x => x.date)].filter(Boolean).sort()[0] || today();
    S.rp = {type:"employee", a: a0 > today() ? today() : a0, b:today(), emp:id}; exportPdf().finally(() => { S.rp = keep; }); };
  if ($("#hp_photo")) $("#hp_photo").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { const url = URL.createObjectURL(f), img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const side = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas"); c.width = c.height = 180;
      c.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 3, side, side, 0, 0, 180, 180); URL.revokeObjectURL(url);
      if (await recWrite("staff", s.id, {...strip(s), photo:c.toDataURL("image/jpeg", 0.82)}, "edit", "حُفظت الصورة")) setTimeout(() => openHrProfile(id), 150);
    } catch(x){ toast("تعذّر قراءة الصورة"); } };
  $("#sheet").querySelectorAll("[data-hpt]").forEach(b => b.onclick = () => { S.hpTab = b.dataset.hpt; $("#sheet").querySelectorAll("[data-hpt]").forEach(x => { x.classList.toggle("on", x === b); x.setAttribute("aria-selected", x === b); }); hpBody(s); });
  hpBody(s);
};

function hpBody(s){
  const el = $("#hp_body"); if (!el) return;
  const t = S.hpTab, F = {ov:hpOv, docs:hpDocs, att:hpAtt, leave:hpLeave, perf:hpPerf, pay:hpPay, letters:hpLetters}[t] || hpOv;
  el.innerHTML = F(s); hpBind(el, s);
  if (t === "docs") hpDocsLoad(s);
}
const hpRow = (l, v) => `<div><dt>${l}</dt><dd>${v == null || v === "" ? "—" : v}</dd></div>`;
const hpD = v => v ? `<span class="num">${dmy(v)}</span>` : "";

function hpOv(s){
  const age = hrAge(s), sv = hrService(s), eos = hrEOS(s), lb = hxLeaveBal(s);
  const brk = [["الأساسي", s.basic], ["بدل السكن", s.housing], ["بدل النقل", s.transport], ["بدلات أخرى", s.otherAllow]].filter(([, v]) => n(v) > 0);
  const pe = s.start ? addDays(s.start, 89) : "", prob = pe && pe >= today() ? `تنتهي فترة التجربة ${dmy(pe)}` : "";
  return `<div class="hp-g">
    <div class="hp-col">
      <section class="hp-card"><h4>البيانات الشخصية</h4><dl class="hr-dl">${hpRow("الاسم بالإنجليزية", s.nameEn ? `<span dir="ltr">${esc(s.nameEn)}</span>` : "")}${hpRow("الجنسية", esc(s.nationality || ""))}${hpRow("تاريخ الميلاد", hpD(s.birthDate) + (age != null ? ` <span class="muted small">(${age} سنة)</span>` : ""))}${hpRow("الجنس", esc(s.gender || ""))}${hpRow("الجوال", s.phone ? `<a class="num" href="tel:${esc(s.phone)}">${esc(s.phone)}</a>` : "")}${hpRow("السكن", esc(s.address || ""))}</dl></section>
      <section class="hp-card"><h4>للطوارئ</h4><dl class="hr-dl">${hpRow("الشخص", esc(s.emergName || ""))}${hpRow("الجوال", s.emergPhone ? `<a class="num" href="tel:${esc(s.emergPhone)}">${esc(s.emergPhone)}</a>` : "")}</dl></section>
      <section class="hp-card"><h4>الوظيفة والعقد</h4><dl class="hr-dl">${hpRow("الوظيفة الفعلية", esc(s.role || ""))}${hpRow("المسمى بالإنجليزية", s.roleEn ? `<span dir="ltr">${esc(s.roleEn)}</span>` : "")}${hpRow("المهنة في الإقامة", esc(s.iqamaProf || ""))}${hpRow("نوع العمل", esc(s.kind || ""))}${hpRow("تاريخ التعيين", hpD(s.start) + (prob ? ` <span class="chip warn">${esc(prob)}</span>` : ""))}${hpRow("مدة الخدمة", sv ? esc(sv.label) : "")}${hpRow("نهاية العقد", hpD(s.contractEnd))}${s.leave ? hpRow("ترك العمل", hpD(s.leave) + (s.leaveReason ? " · " + esc(s.leaveReason) : "")) : ""}</dl></section>
    </div>
    <div class="hp-col">
      <section class="hp-card"><h4>الراتب والبنك</h4><dl class="hr-dl">${hpRow("الإجمالي الشهري", `<b class="num">${fmt(n(s.salary))}</b>`)}${brk.map(([l, v]) => hpRow(l, `<span class="num">${fmt(n(v))}</span>`)).join("")}${hpRow("طريقة الصرف", esc(s.payDefault || ""))}${hpRow("البنك", esc(s.bankName || ""))}${hpRow("الآيبان", s.iban ? `<span class="num" dir="ltr">${esc(s.iban)}</span>` : "")}</dl></section>
      <section class="hp-card"><div class="hp-h"><h4>المستندات</h4><button class="btn ghost sm" type="button" data-hpgo="docs">فتح</button></div>
        <div class="hp-dl">${HD.filter(d => d.req || hdState(s, d).lv !== "none").map(d => { const st = hdState(s, d), g = hdGet(s, d);
          return `<button type="button" class="hp-dli" data-hpdoc="${d.k}"><span class="hp-dic ${st.lv}">${hdIcon(d, 17)}</span><span class="hp-dn">${d.name}</span>${g.files ? `<span class="hp-fc" title="مرفقات">📎 ${g.files}</span>` : ""}${hrChip(st)}</button>`; }).join("")}</div></section>
      <section class="hp-card"><h4>الإجازات</h4><div class="hp-kv3"><div><small>المستحق حتى اليوم</small><b class="num">${lb.acc.toFixed(1)}</b></div><div><small>المستخدم</small><b class="num">${lb.used.toFixed(1)}</b></div><div><small>الرصيد</small><b class="num ${lb.bal < 0 ? "neg" : ""}">${lb.bal.toFixed(1)}</b></div></div>
        ${lb.adj ? `<p class="small muted" style="margin:6px 0 0">يشمل تعديل رصيد <span class="num">${lb.adj > 0 ? "+" : ""}${lb.adj}</span> يوم</p>` : ""}</section>
      ${eos ? `<section class="hp-card"><h4>مكافأة نهاية الخدمة (تقديرية حتى اليوم)</h4><div class="hp-kv3 two"><div><small>إنهاء من صاحب العمل أو انتهاء العقد</small><b class="num">${fmt(eos.full)}</b></div><div><small>عند الاستقالة</small><b class="num">${fmt(eos.resign)}</b><span class="small muted">${esc(eos.resignNote)}</span></div></div></section>` : ""}
    </div></div>
    ${s.notes ? `<section class="hp-card" style="margin-top:14px"><h4>ملاحظات</h4><p style="margin:0">${esc(s.notes)}</p></section>` : ""}`;
}

/* ---------- documents ---------- */
function hpDocs(s){
  return `<div class="hp-vault">${HD.map(d => { const st = hdState(s, d), g = hdGet(s, d);
    return `<article class="hv ${st.lv}" data-hv="${d.k}">
      <header><span class="hp-dic ${st.lv}">${hdIcon(d, 20)}</span><div><b>${d.name}</b>${d.req ? `<small>أساسي</small>` : `<small>اختياري</small>`}</div>${hrChip(st)}</header>
      <dl>${d.k !== "other" && d.k !== "edu" ? `<div><dt>الرقم</dt><dd class="num" dir="ltr">${esc(g.no || "—")}</dd></div>` : ""}${!d.noExp ? `<div><dt>الإصدار</dt><dd class="num">${g.issue ? dmy(g.issue) : "—"}</dd></div><div><dt>الانتهاء</dt><dd class="num">${g.exp ? dmy(g.exp) : "—"}</dd></div>` : ""}${g.note ? `<div class="w"><dt>ملاحظة</dt><dd>${esc(g.note)}</dd></div>` : ""}</dl>
      <div class="hv-files" data-hvf="${d.k}"><span class="small muted">جارٍ التحميل…</span></div>
      ${S.canWrite ? `<footer><button class="btn ghost sm" type="button" data-hvedit="${d.k}">${g.no || g.exp || g.issue ? "تعديل البيانات" : "إضافة البيانات"}</button>
        <label class="btn sm hv-up">إرفاق صورة أو PDF<input type="file" accept="image/*,application/pdf" multiple hidden data-hvup="${d.k}"></label></footer>` : ""}
    </article>`; }).join("")}</div>
    <p class="foot" style="margin:12px 0 0">ملف PDF يُحفظ صوراً، صفحة لكل صورة (حتى 12 صفحة). تظهر تنبيهات الانتهاء قبل 60 يوماً في «نظرة عامة» وفي ملفات الموظفين. المستندات لا يراها إلا المالك ومن لديه صلاحية «الموارد البشرية».</p>`;
}
async function hpDocsLoad(s){
  const list = await hfLoad(s.id), body = $("#hp_body"); if (!body || S.hpTab !== "docs" || S.hpId !== s.id) return;
  HD.forEach(d => { const box = body.querySelector(`[data-hvf="${d.k}"]`); if (!box) return;
    const L = list.filter(f => f.doc === d.k);
    box.innerHTML = L.length ? L.map((f, i) => `<button type="button" class="hv-th" data-hvo="${d.k}" data-i="${i}" title="${esc(f.file || f.name || "")}">${f.type === "pdf" && f.legacy ? `<span class="att-pdf">PDF</span>` : `<img src="${esc(f.data || attSrc(f))}" alt="" loading="lazy">`}${f.pages > 1 ? `<i class="num">${f.page}/${f.pages}</i>` : ""}${S.canEdit ? `<span class="hv-del" role="button" tabindex="0" data-hvdel="${esc(f.id)}" data-leg="${f.legacy ? 1 : ""}" aria-label="حذف">✕</span>` : ""}</button>`).join("")
      : `<span class="hv-none">لا توجد مرفقات</span>`;
    box.querySelectorAll("[data-hvo]").forEach(b => b.onclick = e => { if (e.target.closest("[data-hvdel]")) return; const LL = L.filter(f => f.data || (f.type !== "pdf")); hfView(LL, Math.max(0, LL.indexOf(L[+b.dataset.i]))); });
    box.querySelectorAll("[data-hvdel]").forEach(x => armDelete(x, async () => { const id = x.dataset.hvdel, leg = !!x.dataset.leg;
      const ok = await write(() => S.db.doc((leg ? "attachments/" : "hrFiles/") + id).update({deleted:true, deletedAt:new Date().toISOString(), deletedBy:S.uid || ""}), "حُذف المرفق");
      if (ok){ if (!leg) await hfCount(S.staff.find(v => v.id === s.id) || s, d.k, -1); HF.delete(s.id); const s2 = S.staff.find(v => v.id === s.id) || s; hpBody(s2); } }));
  });
}
function hpDocEdit(s, k){
  const d = HD.find(x => x.k === k), g = hdGet(s, d);
  $("#sheet").innerHTML = `<form class="entry" id="fhv"><h3 style="margin:0;display:flex;align-items:center;gap:8px">${hdIcon(d, 22)} ${d.name} · ${esc(s.name)}</h3>
    <div class="fields">
      ${k !== "other" && k !== "edu" ? `<div class="f"><label for="hv_no">الرقم</label><input id="hv_no" dir="ltr" value="${esc(g.no)}"></div>` : ""}
      ${!d.noExp ? `<div class="f"><label for="hv_is">تاريخ الإصدار</label><input id="hv_is" type="date" value="${esc(g.issue)}"></div><div class="f"><label for="hv_ex">تاريخ الانتهاء</label><input id="hv_ex" type="date" value="${esc(g.exp)}"></div>` : ""}
      <div class="f wide"><label for="hv_nt">ملاحظة</label><input id="hv_nt" value="${esc(g.note)}" placeholder="${k === "edu" ? "مثال: دبلوم طبخ، شهادة سلامة غذاء" : ""}"></div></div>
    <div class="actions"><button class="btn" type="submit">حفظ</button><button class="btn ghost" type="button" id="hv_x">إلغاء</button></div></form>`;
  $("#sheet").classList.remove("pd-wide"); $("#modal").classList.add("open");
  $("#hv_x").onclick = () => closeModal();
  $("#fhv").onsubmit = async e => { e.preventDefault();
    const v = i => $("#" + i) ? $("#" + i).value.trim() : "", no = v("hv_no"), is = v("hv_is"), ex = v("hv_ex"), nt = v("hv_nt");
    if (is && ex && ex < is){ toast("تاريخ الانتهاء قبل تاريخ الإصدار"); return; }
    const cur = S.staff.find(x => x.id === s.id) || s, data = {...strip(cur)}, docx = {...(cur.docx || {})};
    docx[k] = {...(docx[k] || {}), issue:is, note:nt, ...(d.no ? {} : {no}), ...(d.exp ? {} : {exp:ex})};
    if (d.no) data[d.no] = no; if (d.exp) data[d.exp] = ex;
    data.docx = docx;
    if (await recWrite("staff", s.id, data, "edit", "حُفظت بيانات المستند")) closeModal(); };
}

/* ---------- attendance: the month as a calendar ---------- */
function hpAtt(s){
  const ym = S.hpYm || today().slice(0, 7), a = ym + "-01", b = ymEnd(ym), t = today(), m = hxMonth(s.id, ym);
  const lead = (pd(a).getDay() + 1) % 7, cells = [];
  for (let i = 0; i < lead; i++) cells.push(`<div class="hc e"></div>`);
  for (let d = a; d <= b; d = addDays(d, 1)){ const x = d <= t ? hxState(d, s.id) : {st:""}, sh = hxShift(hxRotaCode(d, s.id));
    cells.push(`<div class="hc ${d > t ? "fut" : ""} ${x.st ? "s-" + (HX_ST[x.st] || "") : ""} ${d === t ? "today" : ""}" title="${esc(x.st || "")}${x.a && x.a.in ? " · " + esc(x.a.in) + (x.a.out ? "–" + esc(x.a.out) : "") : ""}${x.note ? " · " + esc(x.note) : ""}">
      <span class="num">${+d.slice(8)}</span>${x.st ? `<small>${esc(x.st)}</small>` : sh && d > t ? `<small class="muted">${esc(sh.l)}</small>` : ""}${x.a && x.a.late ? `<i class="num">+${x.a.late}د</i>` : ""}</div>`); }
  return `<div class="hp-h"><div class="hp-mnav"><button class="btn ghost sm" type="button" id="hpm_p" aria-label="الشهر السابق">→</button><b>${ymLabel(ym)}</b><button class="btn ghost sm" type="button" id="hpm_n" aria-label="الشهر التالي" ${ym >= t.slice(0, 7) ? "disabled" : ""}>←</button></div>
      <div class="hp-legend"><span class="s-ok">حاضر</span><span class="s-warn">متأخر</span><span class="s-bad">غائب</span><span class="s-info">إجازة</span><span class="s-mute">راحة</span></div></div>
    <div class="hp-kv3 four" style="margin-bottom:12px"><div><small>أيام الحضور</small><b class="num">${m.present}</b></div><div><small>التأخير</small><b class="num">${m.late}</b><span class="small muted">${m.lateMin ? m.lateMin + " دقيقة" : ""}</span></div><div><small>الغياب</small><b class="num ${m.absent ? "neg" : ""}">${m.absent}</b></div><div><small>الإجازات</small><b class="num">${m.leave}</b>${m.unpaid ? `<span class="small muted">${m.unpaid} بدون راتب</span>` : ""}</div></div>
    <div class="hcal">${["سبت","أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة"].map(d => `<div class="hd">${d}</div>`).join("")}${cells.join("")}</div>
    <p class="foot" style="margin:10px 0 0">يُسجَّل الحضور من «الموارد البشرية ← الحضور والورديات». الأيام بلا لون لم يُسجَّل فيها شيء.</p>`;
}

/* ---------- leaves ---------- */
function hpLeave(s){
  const lb = hxLeaveBal(s), L = S.leaves.filter(l => l.staffId === s.id).sort((a, b) => b.from.localeCompare(a.from));
  return `<div class="hp-kv3 four" style="margin-bottom:12px"><div><small>المستحق حتى اليوم</small><b class="num">${lb.acc.toFixed(1)}</b><span class="small muted">${s.start && hrService(s) && hrService(s).years >= 5 ? "30 يوم سنوياً" : "21 يوم سنوياً"}</span></div><div><small>المستخدم (سنوية)</small><b class="num">${lb.used.toFixed(1)}</b></div><div><small>الرصيد</small><b class="num ${lb.bal < 0 ? "neg" : ""}">${lb.bal.toFixed(1)}</b></div><div><small>مرضية هذا العام</small><b class="num">${lb.sick}</b></div></div>
    ${S.canWrite ? `<div class="actions" style="margin:0 0 10px"><button class="btn sm" type="button" data-hpnew="leave">طلب إجازة</button></div>` : ""}
    ${L.length ? `<div class="tw"><table><thead><tr><th>النوع</th><th>من</th><th>إلى</th><th class="n">الأيام</th><th>الحالة</th><th>ملاحظات</th></tr></thead><tbody>${L.map(l => `<tr class="click" data-hplv="${esc(l.id)}"><td>${esc(l.type)}</td><td class="num">${l.type === "تعديل رصيد" ? "—" : dmy(l.from)}</td><td class="num">${l.type === "تعديل رصيد" ? "—" : dmy(l.to)}</td><td class="n num">${n(l.days) > 0 && l.type === "تعديل رصيد" ? "+" : ""}${l.days}</td><td><span class="chip ${l.status === "معتمدة" ? "ok" : l.status === "مرفوضة" ? "bad" : "warn"}">${esc(l.status)}</span></td><td class="small">${esc(l.notes || "")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="hx-empty">لا توجد إجازات مسجّلة.</div>`}`;
}

/* ---------- performance and discipline ---------- */
function hpPerf(s){
  const rv = hxEv("review", null, s.id).sort((a, b) => b.ym.localeCompare(a.ym)), rw = hxEv("reward", null, s.id).sort((a, b) => b.date.localeCompare(a.date)), pn = hxEv("penalty", null, s.id).sort((a, b) => b.date.localeCompare(a.date));
  const avgAll = rv.length ? sumBy(rv.slice(0, 6), hxReviewAvg) / Math.min(6, rv.length) : 0;
  const crit = HX_CRIT.map(([k, l]) => { const v = rv.slice(0, 6).map(r => n(r.scores && r.scores[k])).filter(x => x > 0); return [l, v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0]; });
  return `${S.canWrite ? `<div class="actions" style="margin:0 0 12px"><button class="btn sm" type="button" data-hpnew="review">تقييم</button><button class="btn ghost sm" type="button" data-hpnew="reward">مكافأة</button><button class="btn ghost sm" type="button" data-hpnew="penalty">مخالفة</button></div>` : ""}
    <div class="hp-g"><div class="hp-col">
      <section class="hp-card"><h4>متوسط التقييم${rv.length > 1 ? ` (آخر ${Math.min(6, rv.length)} أشهر)` : ""}</h4>${rv.length ? `<div class="hp-big">${hxStars(avgAll)} <b class="num">${avgAll.toFixed(1)}</b></div>
        <div class="hp-crit">${crit.map(([l, v]) => `<div><span>${l}</span><div class="hx-pbar"><i class="${v >= 4 ? "ok" : v >= 3 ? "warn" : "bad"}" style="width:${v / 5 * 100}%"></i></div><b class="num">${v ? v.toFixed(1) : "—"}</b></div>`).join("")}</div>` : `<div class="hx-empty">لم يُقيَّم بعد.</div>`}</section>
      <section class="hp-card"><h4>التقييمات الشهرية</h4>${rv.length ? `<div class="hx-list">${rv.map(r => `<div class="hx-li click" data-hpev="${esc(r.id)}"><div><b>${ymLabel(r.ym)}</b>${r.notes ? `<small>${esc(r.notes)}</small>` : ""}</div>${hxStars(hxReviewAvg(r))}<span class="num">${hxReviewAvg(r).toFixed(1)}</span></div>`).join("")}</div>` : `<div class="hx-empty">—</div>`}</section>
    </div><div class="hp-col">
      <section class="hp-card"><h4>المكافآت <span class="muted small num">${fmt(sumBy(rw, e => n(e.amount)))}</span></h4>${rw.length ? `<div class="hx-list">${rw.map(e => `<div class="hx-li click" data-hpev="${esc(e.id)}"><div><b>${esc(e.reason || "")}</b><small class="num">${dmy(e.date)}${e.notes ? " · " + esc(e.notes) : ""}</small></div><b class="num pos">+${fmt(n(e.amount))}</b></div>`).join("")}</div>` : `<div class="hx-empty">لا توجد مكافآت.</div>`}</section>
      <section class="hp-card"><h4>المخالفات <span class="muted small num">${pn.length}</span></h4>${pn.length ? `<div class="hx-list">${pn.map(e => `<div class="hx-li click" data-hpev="${esc(e.id)}"><div><b>${esc(e.violation || "")}</b><small><span class="num">${dmy(e.date)}</span> · ${esc(e.action || "")} · المرة ${hxRepeat(e)}</small></div>${n(e.amount) ? `<b class="num neg">−${fmt(n(e.amount))}</b>` : ""}</div>`).join("")}</div>` : `<div class="hx-ok">✓ لا توجد مخالفات</div>`}</section>
    </div></div>`;
}

/* ---------- pay and advances ---------- */
function hpPay(s){
  const hist = hrPayHistory(s.id).reverse(), advs = S.advances.filter(a => (a.staffId || a.name) === s.id).sort((x, y) => x.date < y.date ? 1 : -1), b = advBalance(s.id);
  return `<section class="hp-card"><h4>سجل الرواتب</h4>${hist.length ? `<div class="tw"><table><thead><tr><th>الشهر</th><th class="n">الأساسي</th><th class="n">الغياب</th><th class="n">إضافي</th><th class="n">خصومات</th><th class="n">سلفة</th><th class="n">الصافي</th><th class="n">المصروف</th></tr></thead><tbody>
      ${hist.map(h => `<tr><td>${ymLabel(h.ym)}${h.appr ? "" : ' <span class="chip bad">مسودة</span>'}</td><td class="n">${money(h.c.base)}</td><td class="n">${MD(h.c.absentAmt)}</td><td class="n">${MD(n(h.l.extra))}</td><td class="n">${MD(n(h.l.deduct))}</td><td class="n">${MD(n(h.l.advance))}</td><td class="n"><b>${money(h.c.net)}</b></td><td class="n">${MD(h.c.paid)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="hx-empty">لا توجد مسيرات رواتب لهذا الموظف بعد.</div>`}</section>
    <section class="hp-card" style="margin-top:14px"><div class="hp-h"><h4>السلف ${b > 0.004 ? `<span class="chip warn">المتبقي <span class="num">${fmt(b)}</span></span>` : ""}</h4></div>${advs.length ? `<div class="tw"><table><thead><tr><th>التاريخ</th><th class="n">المبلغ</th><th>صُرفت من</th><th>ملاحظات</th></tr></thead><tbody>${advs.map(a => `<tr><td class="num">${dmy(a.date)}</td><td class="n">${money(n(a.amount))}</td><td>${esc(a.pay || "")}</td><td>${esc(a.notes || "")}</td></tr>`).join("")}</tbody></table></div>` : `<div class="hx-empty">لا توجد سلف.</div>`}</section>`;
}

/* ---------- letters of one employee ---------- */
function hpLetters(s){
  const L = hxEv("letter", null, s.id).sort((a, b) => String(b.at || b.date).localeCompare(String(a.at || a.date)));
  return `<div class="hl-grid">${HL.map(l => `<button type="button" class="hx-letter" data-hlnew="${l.k}"><b>${l.t}</b><small>${l.d}</small><span>${l.en ? "عربي · English" : "عربي"}</span></button>`).join("")}</div>
    <h4 style="margin:18px 0 8px">الخطابات الصادرة</h4>${hlTable(L, true)}`;
}

function hpBind(el, s){
  el.querySelectorAll("[data-hpgo]").forEach(b => b.onclick = () => { S.hpTab = b.dataset.hpgo; openHrProfile(s.id, S.hpTab); });
  el.querySelectorAll("[data-hpdoc]").forEach(b => b.onclick = () => { S.hpTab = "docs"; openHrProfile(s.id, "docs"); });
  el.querySelectorAll("[data-hpnew]").forEach(b => b.onclick = () => hpVia(s.id, () => hxEdit(b.dataset.hpnew, null, s.id)));
  el.querySelectorAll("[data-hpev]").forEach(r => r.onclick = () => { const x = S.hrEvents.find(v => v.id === r.dataset.hpev); if (x) hpVia(s.id, () => hxEdit(x.kind, x)); });
  el.querySelectorAll("[data-hplv]").forEach(r => r.onclick = () => { const x = S.leaves.find(v => v.id === r.dataset.hplv); if (x) hpVia(s.id, () => hxEdit("leave", x)); });
  el.querySelectorAll("[data-hvedit]").forEach(b => b.onclick = () => hpVia(s.id, () => hpDocEdit(S.staff.find(v => v.id === s.id) || s, b.dataset.hvedit)));
  el.querySelectorAll("[data-hvup]").forEach(inp => inp.onchange = async e => { const files = [...e.target.files]; e.target.value = ""; if (!files.length) return;
    const lab = inp.closest("label"), old = lab.firstChild.nodeValue; lab.classList.add("busy");
    const kept = await hfUpload(s, inp.dataset.hvup, files, t => { lab.firstChild.nodeValue = t; });
    lab.firstChild.nodeValue = old; lab.classList.remove("busy");
    if (kept){ await hfCount(S.staff.find(v => v.id === s.id) || s, inp.dataset.hvup, kept); toast(kept === 1 ? "أُرفقت صورة المستند" : `أُرفقت ${kept} صور`); HF.delete(s.id); }
    const s2 = S.staff.find(v => v.id === s.id) || s; if (S.hpTab === "docs" && $("#hp_body")) hpBody(s2); });
  el.querySelectorAll("[data-hlnew]").forEach(b => b.onclick = () => hpVia(s.id, () => hlOpen(b.dataset.hlnew, s.id)));
  el.querySelectorAll("[data-hlre]").forEach(b => b.onclick = () => { const x = S.hrEvents.find(v => v.id === b.dataset.hlre); if (x) hpVia(s.id, () => hlOpen(x.type, x.staffId, {reissue:x})); });
  if ($("#hpm_p")){ $("#hpm_p").onclick = () => { const [y, m] = (S.hpYm || today().slice(0, 7)).split("-").map(Number); S.hpYm = ymOf(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1); hpBody(s); };
    $("#hpm_n").onclick = () => { const [y, m] = (S.hpYm || today().slice(0, 7)).split("-").map(Number); const nx = ymOf(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1); if (nx <= today().slice(0, 7)){ S.hpYm = nx; hpBody(s); } }; }
}

/* ================= HR tabs: documents (all employees) and letters (register) ================= */
function hxDocsView(){
  const act = hxActive(); if (!act.length) return `<div class="card empty">لا يوجد موظفون.</div>`;
  const req = HD.filter(d => d.req), f = S.hxDocF || "all";
  let bad = 0, warn = 0, miss = 0, okc = 0;
  const rows = act.map(s => { const st = req.map(d => hdState(s, d)); st.forEach(x => { if (x.lv === "bad") bad++; else if (x.lv === "warn" || x.lv === "soon") warn++; else if (x.lv === "none") miss++; else okc++; }); return {s, st}; });
  const show = rows.filter(r => f === "all" || (f === "issue" ? r.st.some(x => ["bad","warn","soon","none"].includes(x.lv)) : true));
  const pct = Math.round(okc / Math.max(1, act.length * req.length) * 100);
  const cell = (s, d, x) => { const g = hdGet(s, d); return `<td class="hd-c ${x.lv}" data-hdo="${esc(s.id)}" title="${esc(d.name + " · " + x.label)}"><span class="hd-dot"></span><span class="num">${g.exp ? dmy(g.exp) : x.lv === "ok" ? "✓" : "—"}</span>${g.files ? `<small>📎${g.files}</small>` : ""}</td>`; };
  return `<div class="grid g4">
      <div class="kpi ${pct >= 90 ? "green" : ""}"><span class="l">اكتمال المستندات الأساسية</span><span class="v num">${pct}%</span><span class="small muted">${okc} من ${act.length * req.length}</span></div>
      <div class="kpi ${bad ? "orange" : ""}"><span class="l">منتهية</span><span class="v num ${bad ? "neg" : ""}">${bad}</span><span class="small muted">تحتاج تجديداً الآن</span></div>
      <div class="kpi"><span class="l">تنتهي خلال 60 يوماً</span><span class="v num">${warn}</span><span class="small muted">ابدأ إجراءات التجديد</span></div>
      <div class="kpi"><span class="l">غير مسجّلة</span><span class="v num">${miss}</span><span class="small muted">أكمل الملفات</span></div></div>
    <div class="card"><div class="hx-h"><h3>مستندات الموظفين</h3><div class="seg">${[["all","الكل"],["issue","تحتاج إجراء"]].map(([k, l]) => `<button type="button" data-hdf="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
      <div class="tw"><table class="hd-t"><thead><tr><th>الموظف</th>${req.map(d => `<th>${d.name}</th>`).join("")}</tr></thead><tbody>
        ${show.map(({s, st}) => `<tr><td><button type="button" class="hx-tn2 hd-who" data-hdo="${esc(s.id)}">${hrAvatar(s, "sm")}<div><b>${esc(s.name)}</b><small>${esc(s.role || "")}</small></div></button></td>${req.map((d, i) => cell(s, d, st[i])).join("")}</tr>`).join("") || `<tr><td colspan="${req.length + 1}" class="hx-ok">✓ لا توجد مستندات تحتاج إجراء</td></tr>`}</tbody></table></div>
      <p class="foot" style="margin:10px 0 0">اضغط أي خانة لفتح مستندات الموظف وإرفاق صورها. 📎 = عدد الصور المرفقة.</p></div>`;
}
function hxLettersView(){
  const L = hxEv("letter").sort((a, b) => String(b.at || b.date).localeCompare(String(a.at || a.date))), co = hlCo(), miss = !co.cr || !co.phone;
  return `${miss && S.canEdit ? `<div class="note warn" style="margin:0">أكمل بيانات المنشأة (السجل التجاري، الرقم الضريبي، العنوان، الهاتف، اسم المفوّض بالتوقيع) لتظهر في ترويسة الخطابات وتذييلها. <button class="btn sm" type="button" id="hl_co2" style="margin-inline-start:8px">بيانات المنشأة</button></div>` : ""}
    <div class="card"><div class="hx-h"><h3>إصدار خطاب</h3>${S.canEdit ? `<button class="btn ghost sm" type="button" id="hl_co">بيانات المنشأة في الخطابات</button>` : ""}</div>
      <div class="hl-grid">${HL.map(l => `<button type="button" class="hx-letter" data-hlnew="${l.k}"><b>${l.t}</b><small>${l.d}</small><span>${l.en ? "عربي · English" : "عربي"}</span></button>`).join("")}</div></div>
    <div class="card"><div class="hx-h"><h3>سجل الخطابات الصادرة</h3><span class="hx-n">${L.length}</span></div>${hlTable(L)}</div>`;
}
const hlTable = (L, one) => L.length ? `<div class="tw"><table><thead><tr><th>الرقم</th><th>التاريخ</th><th>الخطاب</th>${one ? "" : "<th>الموظف</th>"}<th>موجّه إلى</th><th>اللغة</th><th></th></tr></thead><tbody>
  ${L.map(x => `<tr><td class="num" dir="ltr" style="text-align:right">${esc(x.ref || "")}</td><td class="num">${dmy(x.date)}</td><td>${esc(x.title || "")}</td>${one ? "" : `<td>${esc(x.name || "")}</td>`}<td class="small">${esc(x.to || "—")}</td><td>${x.lang === "en" ? "English" : "عربي"}</td><td><button class="btn ghost sm" type="button" data-hlre="${esc(x.id)}">إعادة تنزيل</button></td></tr>`).join("")}</tbody></table></div>`
  : `<div class="hx-empty">لم يصدر أي خطاب بعد.</div>`;

/* the tabs and their render/bind */
const hxRender0 = hxRender;
hxRender = function(el){
  if (S.hrTab === "docs"){ el.innerHTML = `<div class="hx-wrap">${hxDocsView()}</div>`; hxBind(el); hxBind2(el); return; }
  if (S.hrTab === "letters"){ el.innerHTML = `<div class="hx-wrap">${hxLettersView()}</div>`; hxBind(el); hxBind2(el); return; }
  hxRender0(el); hxBind2(el);
};
function hxBind2(el){
  el.querySelectorAll("[data-hdo]").forEach(b => b.onclick = () => openHrProfile(b.dataset.hdo, "docs"));
  el.querySelectorAll("[data-hdf]").forEach(b => b.onclick = () => { S.hxDocF = b.dataset.hdf; renderPayroll(); });
  el.querySelectorAll("[data-hlnew]").forEach(b => b.onclick = () => hlOpen(b.dataset.hlnew, null));
  el.querySelectorAll("[data-hlre]").forEach(b => b.onclick = () => { const x = S.hrEvents.find(v => v.id === b.dataset.hlre); if (x) hlOpen(x.type, x.staffId, {reissue:x}); });
  ["hl_co", "hl_co2"].forEach(i => { if ($("#" + i)) $("#" + i).onclick = hlCoEdit; });
}

/* ================= letters ================= */
const HL = [
  {k:"salary",     t:"تعريف بالراتب",        te:"Salary Certificate",     d:"الوظيفة وتاريخ الالتحاق وتفاصيل الراتب، للبنوك والجهات", en:1, to:1},
  {k:"intro",      t:"خطاب تعريف",            te:"Employment Certificate", d:"يثبت أنه يعمل لدى المنشأة، دون ذكر الراتب", en:1, to:1},
  {k:"experience", t:"شهادة خبرة",            te:"Experience Certificate", d:"الوظيفة ومدة العمل وحسن السيرة", en:1, to:1},
  {k:"noc",        t:"خطاب عدم ممانعة",       te:"No Objection Certificate", d:"للسفر أو استخراج رخصة أو أي غرض تحدده", en:1, to:1, purpose:1},
  {k:"joining",    t:"إشعار مباشرة عمل",      d:"تاريخ بدء العمل أو العودة من إجازة، بتوقيع الموظف"},
  {k:"warning",    t:"خطاب إنذار",            d:"من مخالفة مسجّلة، مع إقرار استلام الموظف", ev:1},
  {k:"clearance",  t:"إخلاء طرف",             d:"تسليم العهد وسداد السلف عند نهاية الخدمة"},
  {k:"settle",     t:"مخالصة نهائية",          d:"مكافأة نهاية الخدمة والإجازات والسلف، بتوقيع الموظف"}];
const hlCo = () => ({...{nameAr:brandAr(), nameEn:"", cr:"", vat:"", address:"", addressEn:"", phone:"", email:"", signName:"", signTitle:"المدير العام", signNameEn:"", signTitleEn:"General Manager"}, ...Object.fromEntries(Object.entries((S.settings && S.settings.hrLetter) || {}).filter(([, v]) => String(v || "").trim()))});
const hlLogo = () => { const m = rpHead("", today(), today()).match(/class="rp-aq" alt="" src="([^"]+)"/); return m ? m[1] : ""; };
function hlCoEdit(){
  const c = hlCo(), F = (k, l, at, cls) => `<div class="f ${cls || ""}"><label for="hc_${k}">${l}</label><input id="hc_${k}" value="${esc(c[k] || "")}" ${at || ""}></div>`;
  $("#sheet").innerHTML = `<form class="entry" id="fhc"><h3 style="margin:0">بيانات المنشأة في الخطابات</h3><p class="small muted" style="margin:0">تظهر في ترويسة كل خطاب وتذييله، وفي التوقيع.</p>
    <div class="fields">${F("nameAr", "اسم المنشأة الرسمي", "required")}${F("nameEn", "الاسم بالإنجليزية", 'dir="ltr"')}${F("cr", "رقم السجل التجاري", 'dir="ltr" inputmode="numeric"')}${F("vat", "الرقم الضريبي", 'dir="ltr" inputmode="numeric"')}
      ${F("address", "العنوان", "", "wide")}${F("addressEn", "العنوان بالإنجليزية", 'dir="ltr"', "wide")}${F("phone", "الهاتف", 'dir="ltr" inputmode="tel"')}${F("email", "البريد الإلكتروني", 'dir="ltr" type="email"')}
      ${F("signName", "اسم المفوّض بالتوقيع")}${F("signTitle", "صفته")}${F("signNameEn", "الاسم بالإنجليزية", 'dir="ltr"')}${F("signTitleEn", "الصفة بالإنجليزية", 'dir="ltr"')}</div>
    <div class="actions"><button class="btn" type="submit">حفظ</button><button class="btn ghost" type="button" id="hc_x">إغلاق</button></div></form>`;
  $("#sheet").classList.remove("pd-wide"); $("#modal").classList.add("open"); $("#hc_x").onclick = () => closeModal();
  $("#fhc").onsubmit = async e => { e.preventDefault(); const o = {}; Object.keys(c).forEach(k => { const i = $("#hc_" + k); if (i) o[k] = i.value.trim(); });
    if (await write(() => setSettingsDoc({...S.settings, hrLetter:o, ...stamp()}), "حُفظت بيانات المنشأة")) closeModal(); };
}
const hlFirmEn = () => { const c = hlCo(); if (c.nameEn) return c.nameEn; const b = brandEn() || ""; return b ? b.replace(/(^|[\s-])([a-z])/g, (m, a, x) => a + x.toUpperCase()) : c.nameAr; };
const hlNextRef = () => { const y = today().slice(0, 4), k = hxEv("letter").filter(x => String(x.ref || "").includes("-" + y + "-")).length + 1; return `HR-${y}-${String(k).padStart(4, "0")}`; };

/* the letter's words */
function hlContent(o){
  const s = o.s, c = hlCo(), en = o.lang === "en", fem = hpFem(s), firm = esc(en ? hlFirmEn() : c.nameAr), sv = hrService(s, o.k === "experience" && s.leave ? s.leave : undefined);
  const role = en ? (s.roleEn || "") : (s.role || s.iqamaProf || "موظف"), nat = en ? (s.natEn || HR_NAT_EN[String(s.nationality || "").trim()] || "") : (s.nationality || "");
  const P = t => `<p>${t}</p>`, D = d => `<span class="num">${en ? enDate(d) : dmy(d)}</span>`, N = v => `<span class="num">${fmt(v)}</span>`;
  const info = rows => `<table class="lt-info"><tbody>${rows.filter(r => r[1]).map(([l, v]) => `<tr><th>${l}</th><td>${v}</td></tr>`).join("")}</tbody></table>`;
  const idRows = en ? [["Name", `<span dir="ltr">${esc(s.nameEn || s.name)}</span>`], ["Nationality", esc(nat)], ["Iqama / ID No.", s.iqamaNo ? `<span class="num">${esc(s.iqamaNo)}</span>` : ""], ["Passport No.", s.passportNo ? `<span class="num">${esc(s.passportNo)}</span>` : ""], ["Job Title", esc(role)], ["Joining Date", s.start ? D(s.start) : ""]]
    : [["الاسم", esc(s.name)], ["الجنسية", esc(nat)], ["رقم الإقامة / الهوية", s.iqamaNo ? `<span class="num">${esc(s.iqamaNo)}</span>` : ""], ["رقم جواز السفر", s.passportNo ? `<span class="num">${esc(s.passportNo)}</span>` : ""], ["المسمى الوظيفي", esc(role)], ["تاريخ الالتحاق", s.start ? D(s.start) : ""]];
  const brk = [[en ? "Basic Salary" : "الأجر الأساسي", n(s.basic) || (n(s.housing) || n(s.transport) || n(s.otherAllow) ? 0 : n(s.salary))], [en ? "Housing Allowance" : "بدل السكن", n(s.housing)], [en ? "Transportation Allowance" : "بدل النقل", n(s.transport)], [en ? "Other Allowances" : "بدلات أخرى", n(s.otherAllow)]].filter(([, v]) => v > 0);
  const salT = `<table class="lt-money"><thead><tr><th>${en ? "Item" : "البند"}</th><th>${en ? "Monthly (SAR)" : "شهرياً (ريال سعودي)"}</th></tr></thead><tbody>${brk.map(([l, v]) => `<tr><td>${l}</td><td>${N(v)}</td></tr>`).join("")}<tr class="tot"><td>${en ? "Total Monthly Salary" : "إجمالي الراتب الشهري"}</td><td>${N(n(s.salary))}</td></tr></tbody></table>`;
  const to = esc(o.to || (en ? "To Whom It May Concern" : "إلى من يهمه الأمر"));
  const greet = en ? `<p class="lt-to">${to}</p>` : `<p class="lt-to">${o.to ? "السادة / " + to + "&nbsp;&nbsp;&nbsp;المحترمين" : to}</p><p>السلام عليكم ورحمة الله وبركاته، وبعد:</p>`;
  const close = en ? `<p class="lt-close">Yours faithfully,</p>` : `<p class="lt-close">وتفضلوا بقبول فائق الاحترام والتقدير،،،</p>`;
  const Mr = en ? (fem ? "Ms." : "Mr.") : G(s, "السيد", "السيدة"), active = s.active !== false && (!s.leave || s.leave > today());
  let title = "", body = "", ack = false;
  const t = HL.find(x => x.k === o.k) || {};
  if (o.k === "salary" || o.k === "intro"){ title = en ? t.te : (o.k === "salary" ? "خطاب تعريف بالراتب" : "خطاب تعريف");
    body = greet + (en
      ? P(`This is to certify that ${Mr} <b dir="ltr">${esc(s.nameEn || s.name)}</b>${nat ? `, ${esc(nat)} national` : ""}, whose details are stated below, ${active ? `has been employed by <b>${firm}</b> since ${D(s.start)} and is still in our service as of the date of this letter` : `was employed by <b>${firm}</b> from ${D(s.start)} to ${D(s.leave)}`}.`) + info(idRows)
        + (o.k === "salary" ? P(`${fem ? "Her" : "His"} monthly salary is as follows:`) + salT : "")
        + P(`This certificate has been issued upon ${fem ? "her" : "his"} request${o.to ? `, to be submitted to ${to}` : ""}, without any liability on the company towards third parties.`)
      : P(`تشهد <b>${firm}</b>${c.cr ? ` (سجل تجاري رقم <span class="num">${esc(c.cr)}</span>)` : ""} بأن ${Mr} المذكور${G(s, "", "ة")} بياناته أدناه ${active ? `${G(s, "يعمل", "تعمل")} لدينا منذ تاريخ ${D(s.start)}، ولا ${G(s, "يزال", "تزال")} على رأس العمل حتى تاريخه` : `${G(s, "عمل", "عملت")} لدينا خلال الفترة من ${D(s.start)} إلى ${D(s.leave)}`}:`) + info(idRows)
        + (o.k === "salary" ? P(`${G(s, "ويتقاضى", "وتتقاضى")} راتباً شهرياً تفاصيله كالتالي:`) + salT : "")
        + P(`وقد أُعطي هذا الخطاب بناءً على ${G(s, "طلبه", "طلبها")}${o.to ? " لتقديمه إلى الجهة المذكورة" : ""}، دون أدنى مسؤولية على المنشأة تجاه الغير.`)) + close; }
  else if (o.k === "experience"){ title = en ? t.te : "شهادة خبرة";
    const end = s.leave && !active ? s.leave : today(), svl = hrService(s, end);
    body = (o.to ? greet : en ? `<p class="lt-to">To Whom It May Concern</p>` : `<p class="lt-to">إلى من يهمه الأمر</p>`) + (en
      ? P(`This is to certify that ${Mr} <b dir="ltr">${esc(s.nameEn || s.name)}</b>${nat ? `, ${esc(nat)} national` : ""}, ${active ? `has been working` : `worked`} with <b>${firm}</b> as <b>${esc(role)}</b> from ${D(s.start)} ${active ? "until the date of this certificate" : `to ${D(end)}`}${svl ? ` (${svl.years >= 1 ? svl.years.toFixed(1) + " years" : svl.days + " days"})` : ""}.`) + info(idRows.filter(r => !/Joining/.test(r[0])))
        + P(`During ${fem ? "her" : "his"} employment, ${fem ? "she" : "he"} demonstrated commitment, integrity and good conduct. We wish ${fem ? "her" : "him"} every success in ${fem ? "her" : "his"} future career.`) + P(`This certificate has been issued upon ${fem ? "her" : "his"} request.`)
      : P(`تشهد <b>${firm}</b> بأن ${Mr} <b>${esc(s.name)}</b>${nat ? `، ${esc(nat)} الجنسية` : ""}، ${active ? G(s, "يعمل", "تعمل") : G(s, "عمل", "عملت")} لدينا بوظيفة «<b>${esc(role)}</b>» ${active ? `منذ ${D(s.start)} وحتى تاريخه` : `خلال الفترة من ${D(s.start)} إلى ${D(end)}`}${svl ? ` (${esc(svl.label)})` : ""}.`) + info(idRows.filter(r => !/الالتحاق/.test(r[0])))
        + P(`وقد ${G(s, "كان", "كانت")} خلال فترة ${G(s, "عمله", "عملها")} مثالاً للالتزام وحسن السيرة والسلوك والأمانة، ونتمنى ${G(s, "له", "لها")} دوام التوفيق والنجاح.`) + P(`وقد أُعطيت هذه الشهادة بناءً على ${G(s, "طلبه", "طلبها")} دون أدنى مسؤولية على المنشأة.`)) + close; }
  else if (o.k === "noc"){ title = en ? t.te : "خطاب عدم ممانعة";
    const pur = esc(o.purpose || (en ? "travel" : "السفر")), per = o.from && o.to2 ? (en ? ` during the period from ${D(o.from)} to ${D(o.to2)}` : ` خلال الفترة من ${D(o.from)} إلى ${D(o.to2)}`) : "";
    body = greet + (en
      ? P(`<b>${firm}</b> hereby certifies that ${Mr} <b dir="ltr">${esc(s.nameEn || s.name)}</b>, whose details are stated below, is employed by us as <b>${esc(role)}</b> since ${D(s.start)}.`) + info(idRows)
        + P(`We have <b>no objection</b> to ${fem ? "her" : "his"} ${pur}${per}${per ? `, provided that ${fem ? "she" : "he"} resumes ${fem ? "her" : "his"} duties upon its end` : ""}.`) + P("This letter has been issued upon the employee's request, without any liability on the company towards third parties.")
      : P(`تفيد <b>${firm}</b> بأن ${Mr} المذكور${G(s, "", "ة")} بياناته أدناه ${G(s, "يعمل", "تعمل")} لدينا بوظيفة «<b>${esc(role)}</b>» منذ تاريخ ${D(s.start)}.`) + info(idRows)
        + P(`وأنه <b>لا مانع</b> لدى المنشأة من ${pur}${per}${per ? `، على أن ${G(s, "يعود لمباشرة عمله", "تعود لمباشرة عملها")} فور انتهائها` : ""}.`) + P(`وقد أُعطي هذا الخطاب بناءً على ${G(s, "طلبه", "طلبها")} دون أدنى مسؤولية على المنشأة تجاه الغير.`)) + close; }
  else if (o.k === "joining"){ title = "إشعار مباشرة عمل"; ack = true;
    const d = o.from || s.start || today(), back = o.purpose === "back";
    body = P(`نفيد بأن ${Mr} <b>${esc(s.name)}</b> ${back ? `قد ${G(s, "عاد", "عادت")} من الإجازة و${G(s, "باشر", "باشرت")} ${G(s, "عمله", "عملها")}` : `قد ${G(s, "باشر", "باشرت")} ${G(s, "عمله", "عملها")}`} لدينا بوظيفة «<b>${esc(role)}</b>» اعتباراً من يوم ${dayName(d)} الموافق ${D(d)}.`) + info(idRows.filter(r => !/الالتحاق/.test(r[0])))
      + P(back ? `وبذلك ينتهي احتساب الإجازة في هذا التاريخ، ويُستأنف صرف ${G(s, "راتبه", "راتبها")} منه.` : `ويبدأ احتساب ${G(s, "خدمته", "خدمتها")} و${G(s, "راتبه", "راتبها")} من هذا التاريخ، وتُطبَّق فترة التجربة المنصوص عليها في العقد.`) + close; }
  else if (o.k === "warning"){ title = "خطاب إنذار"; ack = true;
    const e = S.hrEvents.find(x => x.id === o.ev) || {}, k = e.id ? hxRepeat(e) : 1;
    body = `<p class="lt-to">${Mr} / <b>${esc(s.name)}</b>&nbsp;&nbsp;&nbsp;${G(s, "المحترم", "المحترمة")}</p><p>السلام عليكم ورحمة الله وبركاته، وبعد:</p>`
      + P(`نحيط${G(s, "ك", "كِ")} علماً بأنه بتاريخ ${D(e.date || today())} ثبت قيام${G(s, "ك", "كِ")} بالمخالفة التالية: «<b>${esc(e.violation || "")}</b>»${e.notes ? ` (${esc(e.notes)})` : ""}، وهي المرة رقم <span class="num">${k}</span> لهذه المخالفة خلال 180 يوماً.`)
      + info([["المخالفة", esc(e.violation || "")], ["تاريخها", D(e.date || today())], ["الإجراء المتخذ", `<b>${esc(e.action || "إنذار كتابي")}</b>`], ["مبلغ الخصم", n(e.amount) ? `${N(n(e.amount))} ريال، من راتب ${esc(ymLabel(e.ym || today().slice(0, 7)))}` : ""]])
      + P(`ونأمل منك الالتزام التام بأنظمة العمل وتعليماته، علماً بأن تكرار المخالفة يستوجب تدرّج الجزاء وفق لائحة تنظيم العمل المعتمدة.`) + close; }
  else if (o.k === "clearance"){ title = "إخلاء طرف"; ack = true;
    const adv = Math.max(0, advBalance(s.id));
    body = P(`تفيد <b>${firm}</b> بأن ${Mr} <b>${esc(s.name)}</b>، ${G(s, "الذي كان يعمل", "التي كانت تعمل")} لدينا بوظيفة «${esc(role)}» منذ ${D(s.start)}${s.leave ? ` حتى ${D(s.leave)}` : ""}، قد ${G(s, "أنهى", "أنهت")} الإجراءات التالية:`) + info(idRows.slice(0, 3))
      + `<table class="lt-money chk"><thead><tr><th>البند</th><th>الحالة</th></tr></thead><tbody>${[["تسليم العهد والأدوات والزي الرسمي", "☐ تم"], ["تسليم المفاتيح وبطاقات الدخول", "☐ تم"], ["رصيد السلف", adv ? `متبقٍ <span class="num">${fmt(adv)}</span> ريال` : "✓ مسدد بالكامل"], ["استلام المستحقات النهائية", "☐ تم"]].map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</tbody></table>`
      + P(`وبذلك تُخلي المنشأة ${G(s, "طرفه", "طرفها")} من أي التزامات تجاهها، ما لم يظهر خلاف ذلك مستقبلاً.`) + close; }
  else if (o.k === "settle"){ title = "مخالصة نهائية"; ack = true;
    const last = o.from || s.leave || today(), why = o.purpose || "استقالة", X = hxSettle(s, last, why, n(o.other));
    body = P(`بيان المستحقات النهائية لـ${Mr} <b>${esc(s.name)}</b> عن فترة عمل${G(s, "ه", "ها")} لدى <b>${firm}</b>:`)
      + info([["المسمى الوظيفي", esc(role)], ["تاريخ الالتحاق", D(s.start)], ["آخر يوم عمل", D(last)], ["سبب انتهاء العلاقة", esc(why)], ["مدة الخدمة", X.sv ? esc(X.sv.label) : ""], ["آخر أجر شهري", `${N(n(s.salary))} ريال`]])
      + `<table class="lt-money"><thead><tr><th>البند</th><th>التفاصيل</th><th>المبلغ (ريال)</th></tr></thead><tbody>${X.rows.map(r => `<tr><td>${r[0]}</td><td class="sm">${r[2] || ""}</td><td>${r[1] < 0 ? "− " : ""}${N(Math.abs(r[1]))}</td></tr>`).join("")}<tr class="tot"><td>صافي المستحق</td><td></td><td>${N(X.total)}</td></tr></tbody></table>`
      + P(`أقرّ أنا الموقّع${G(s, "", "ة")} أدناه باستلامي مبلغ <b>${N(X.total)}</b> ريال سعودي، يمثل كامل مستحقاتي النظامية لدى ${firm}، وأنه لم يعد لي أي حقوق أو مطالبات تجاهها من أي نوع.`); }
  return {title, body, ack, en};
}

/* the page: letterhead, number and dates, title, body, signature and stamp, footer */
function hlPage(o){
  const c = hlCo(), x = hlContent(o), en = x.en, logo = hlLogo(), d = o.date || today();
  const firmAr = esc(c.nameAr), firmEn = esc(hlFirmEn());
  const reg = [c.cr ? `${en ? "C.R." : "س.ت"} <span class="num">${esc(c.cr)}</span>` : "", c.vat ? `${en ? "VAT" : "الرقم الضريبي"} <span class="num">${esc(c.vat)}</span>` : ""].filter(Boolean);
  const foot = [en ? (c.addressEn || c.address) : c.address, c.phone ? `<span class="num" dir="ltr">${esc(c.phone)}</span>` : "", c.email ? `<span dir="ltr">${esc(c.email)}</span>` : ""].filter(Boolean);
  const signer = en ? [c.signNameEn || c.signName, c.signTitleEn] : [c.signName, c.signTitle];
  return `<div class="lt-page ${en ? "en" : ""}" dir="${en ? "ltr" : "rtl"}" lang="${en ? "en" : "ar"}">
    <div class="lt-band"></div>
    ${logo ? `<img class="lt-wm" src="${logo}" alt="">` : ""}
    <div class="lt-head">
      <div class="lt-brand">${logo ? `<img src="${logo}" alt="">` : ""}<div><b>${en ? firmEn || firmAr : firmAr}</b>${en ? (firmEn ? `<small dir="rtl">${firmAr}</small>` : "") : firmEn ? `<small dir="ltr">${firmEn}</small>` : ""}</div></div>
      <div class="lt-reg">${reg.map(r => `<div>${r}</div>`).join("")}</div>
    </div>
    <div class="lt-meta"><div>${en ? "Ref." : "الرقم"}: <b class="num" dir="ltr">${esc(o.ref || "")}</b></div><div><div>${en ? "Date" : "التاريخ"}: <b class="num">${en ? enDate(d) : dmy(d)}</b>${en ? "" : " م"}</div><span class="lt-hj">${en ? "Corresponding to " : "الموافق "}${hijri(d, en)}</span></div></div>
    <div class="lt-title">${esc(x.title)}</div>
    <div class="lt-body">${x.body}</div>
    <div class="lt-sign">
      <div class="lt-signer"><small>${en ? "For and on behalf of" : "عن"} ${en ? firmEn || firmAr : firmAr}</small>${signer[0] ? `<b>${esc(signer[0])}</b>` : ""}${signer[1] ? `<span>${esc(signer[1])}</span>` : ""}<div class="lt-line">${en ? "Signature" : "التوقيع"}</div></div>
      ${x.ack ? `<div class="lt-signer"><small>إقرار ${G(o.s, "الموظف", "الموظفة")} بالاستلام</small><b>${esc(o.s.name)}</b><span>التاريخ: ____ / ____ / ________</span><div class="lt-line">التوقيع</div></div>` : ""}
      <div class="lt-stamp"><span>${en ? "Company Stamp" : "ختم المنشأة"}</span></div>
    </div>
    <div class="lt-foot">${foot.length ? foot.map(f => `<span>${f}</span>`).join('<i>•</i>') : `<span>${en ? firmEn || firmAr : firmAr}</span>`}</div>
    <div class="lt-band b"></div></div>`;
}
/* smaller words while the body is taller than its room */
/* the largest words that still fit (a short letter is not left as a small block on an empty page), then what room is left
   goes above the body, so the letter sits in the middle of the paper rather than at its top */
function hlFit(page){
  const body = page.querySelector(".lt-body"); let f = 18;
  body.style.paddingTop = ""; body.style.fontSize = f + "px";
  while (body.scrollHeight > body.clientHeight + 1 && f > 11){ f -= 0.5; body.style.fontSize = f + "px"; }
  const inner = [...body.children].reduce((h, el) => h + el.getBoundingClientRect().height + parseFloat(getComputedStyle(el).marginBottom || 0), 0);
  const room = body.clientHeight - inner - 40;
  if (room > 40) body.style.paddingTop = (20 + Math.min(110, room * 0.35)) + "px";
}

/* the dialog: pick, fill, see the page, download */
function hlOpen(kind, sid, opt){
  opt = opt || {};
  const re = opt.reissue, list = S.staff.filter(s => s.active !== false || s.id === sid || (re && re.staffId === s.id) || ["experience","clearance","settle"].includes(kind));
  if (!list.length){ toast("أضف الموظفين أولاً"); return; }
  const st = {k:kind, sid: sid || (re && re.staffId) || list[0].id, lang: (re && re.lang) || "ar", to: (re && re.to) || "", purpose: (re && re.purpose) || "", from: (re && re.from) || "", to2: (re && re.to2) || "", other: (re && re.other) || "", ev: (re && re.ev) || opt.ev || "", date: re ? re.date : today(), ref: re ? re.ref : hlNextRef()};
  if (kind === "settle" && !re){ st.from = S.hxExitDate || ""; st.purpose = S.hxExitWhy || ""; st.other = S.hxExitOther || ""; }
  const L = () => HL.find(x => x.k === st.k);
  const evs = () => hxEv("penalty", null, st.sid).sort((a, b) => b.date.localeCompare(a.date));
  $("#sheet").innerHTML = `<div class="hl">
    <div class="hl-form"><h3 style="margin:0">${re ? "إعادة تنزيل خطاب" : "إصدار خطاب"}</h3>
      <div class="f"><label for="hl_k">الخطاب</label><select id="hl_k" ${re ? "disabled" : ""}>${HL.map(l => `<option value="${l.k}" ${l.k === st.k ? "selected" : ""}>${l.t}</option>`).join("")}</select></div>
      <div class="f"><label for="hl_s">الموظف</label><select id="hl_s" ${re ? "disabled" : ""}>${list.map(s => `<option value="${esc(s.id)}" ${s.id === st.sid ? "selected" : ""}>${esc(s.name)}${s.active === false ? " (غير نشط)" : ""}</option>`).join("")}</select></div>
      <div id="hl_extra"></div>
      <div class="note" id="hl_warn" hidden></div>
      <div class="actions"><button class="btn" type="button" id="hl_go">تنزيل PDF</button><button class="btn ghost" type="button" id="hl_x">إغلاق</button></div>
      ${S.canEdit ? `<button class="btn ghost sm" type="button" id="hl_co3" style="justify-self:start">بيانات المنشأة في الخطابات</button>` : ""}
    </div>
    <div class="hl-prev"><div class="hl-scale" id="hl_pv"></div></div></div>`;
  $("#sheet").classList.add("pd-wide"); $("#modal").classList.add("open");
  $("#hl_x").onclick = () => closeModal();
  if ($("#hl_co3")) $("#hl_co3").onclick = () => { S.hpBack = null; hlCoEdit(); };
  const extra = () => { const l = L(), s = S.staff.find(x => x.id === st.sid) || {}, E = [];
    if (l.en) E.push(`<div class="f"><label>اللغة</label><div class="seg">${[["ar","عربي"],["en","English"]].map(([k, t]) => `<button type="button" data-lang="${k}" class="${st.lang === k ? "on" : ""}">${t}</button>`).join("")}</div></div>`);
    if (l.en && st.lang === "en" && (!s.nameEn || !s.roleEn || !(s.natEn || HR_NAT_EN[String(s.nationality || "").trim()]))) E.push(`<div class="f"><label for="hl_ne">الاسم بالإنجليزية</label><input id="hl_ne" dir="ltr" value="${esc(st.nameEn || s.nameEn || "")}"></div><div class="f"><label for="hl_re">المسمى بالإنجليزية</label><input id="hl_re" dir="ltr" value="${esc(st.roleEn || s.roleEn || "")}" placeholder="e.g. Chef, Cashier"></div><div class="f"><label for="hl_na">الجنسية بالإنجليزية</label><input id="hl_na" dir="ltr" value="${esc(st.natEn || s.natEn || HR_NAT_EN[String(s.nationality || "").trim()] || "")}" placeholder="e.g. Egyptian"></div>`);
    if (l.en && st.lang === "en" && !hlCo().nameEn) E.push(`<div class="note">اسم المنشأة بالإنجليزية غير مسجّل، فسيظهر «${esc(hlFirmEn())}». ${S.canEdit ? "أضفه من «بيانات المنشأة في الخطابات»." : ""}</div>`);
    if (l.to) E.push(`<div class="f"><label for="hl_to">موجّه إلى</label><input id="hl_to" value="${esc(st.to)}" placeholder="${st.lang === "en" ? "To Whom It May Concern" : "إلى من يهمه الأمر"}" list="hl_tos"><datalist id="hl_tos">${(st.lang === "en" ? ["Embassy of","Al Rajhi Bank","Saudi National Bank"] : ["مصرف الراجحي","البنك الأهلي السعودي","بنك الرياض","سفارة","الجوازات"]).map(t => `<option value="${t}">`).join("")}</datalist></div>`);
    if (st.k === "noc") E.push(`<div class="f"><label for="hl_pu">الغرض</label><input id="hl_pu" value="${esc(st.purpose)}" list="hl_pus" placeholder="${st.lang === "en" ? "travelling abroad on vacation" : "السفر لقضاء إجازته"}"><datalist id="hl_pus">${(st.lang === "en" ? ["travelling abroad on vacation","obtaining a driving licence","opening a bank account","sponsoring a family visit"] : [G(s, "سفره لقضاء إجازته", "سفرها لقضاء إجازتها"), G(s, "استخراجه رخصة قيادة", "استخراجها رخصة قيادة"), G(s, "فتحه حساباً بنكياً", "فتحها حساباً بنكياً"), G(s, "استقدامه عائلته بزيارة", "استقدامها عائلتها بزيارة")]).map(t => `<option value="${t}">`).join("")}</datalist></div>
      <div class="f hl-2"><label for="hl_f">من (اختياري)</label><input id="hl_f" type="date" value="${esc(st.from)}"></div><div class="f hl-2"><label for="hl_t2">إلى</label><input id="hl_t2" type="date" value="${esc(st.to2)}"></div>`);
    if (st.k === "joining") E.push(`<div class="f"><label for="hl_jt">المناسبة</label><select id="hl_jt"><option value="">التحاق جديد</option><option value="back" ${st.purpose === "back" ? "selected" : ""}>عودة من إجازة</option></select></div><div class="f"><label for="hl_f">تاريخ المباشرة</label><input id="hl_f" type="date" value="${esc(st.from || s.start || today())}"></div>`);
    if (st.k === "warning"){ const L2 = evs(); if (!st.ev || !L2.some(e => e.id === st.ev)) st.ev = L2[0] ? L2[0].id : "";
      E.push(L2.length ? `<div class="f"><label for="hl_ev">المخالفة</label><select id="hl_ev">${L2.map(e => `<option value="${esc(e.id)}" ${e.id === st.ev ? "selected" : ""}>${dmy(e.date)} · ${esc(e.violation)}</option>`).join("")}</select></div>` : `<div class="note warn">لا توجد مخالفة مسجّلة لهذا الموظف. سجّلها أولاً من «الأداء والانضباط».</div>`); }
    if (st.k === "settle") E.push(`<div class="f"><label for="hl_f">آخر يوم عمل</label><input id="hl_f" type="date" value="${esc(st.from || s.leave || today())}"></div><div class="f"><label for="hl_pu">سبب انتهاء العلاقة</label><select id="hl_pu">${["استقالة","إنهاء من صاحب العمل","انتهاء العقد"].map(k => `<option ${(st.purpose || (s.leaveReason === "استقالة" ? "استقالة" : "إنهاء من صاحب العمل")) === k ? "selected" : ""}>${k}</option>`).join("")}</select></div><div class="f"><label for="hl_o">خصومات أخرى</label><input id="hl_o" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(st.other)}"></div>`);
    $("#hl_extra").innerHTML = E.join("");
    $("#hl_extra").querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { st.lang = b.dataset.lang; st.to = ""; st.purpose = ""; extra(); });
    $("#hl_extra").querySelectorAll("input,select").forEach(i => i.oninput = i.onchange = () => { read(); draw(); });
    read(); draw(); };
  const read = () => { const v = i => $("#" + i) ? $("#" + i).value.trim() : undefined;
    if (v("hl_to") !== undefined) st.to = v("hl_to"); if (v("hl_pu") !== undefined) st.purpose = v("hl_pu"); if (v("hl_jt") !== undefined) st.purpose = v("hl_jt");
    if (v("hl_f") !== undefined) st.from = v("hl_f"); if (v("hl_t2") !== undefined) st.to2 = v("hl_t2"); if (v("hl_o") !== undefined) st.other = v("hl_o"); if (v("hl_ev") !== undefined) st.ev = v("hl_ev");
    st.nameEn = v("hl_ne"); st.roleEn = v("hl_re"); st.natEn = v("hl_na"); };
  const subj = () => { const s = S.staff.find(x => x.id === st.sid) || {}; return {...s, ...(st.nameEn ? {nameEn:st.nameEn} : {}), ...(st.roleEn ? {roleEn:st.roleEn} : {}), ...(st.natEn ? {natEn:st.natEn} : {})}; };
  const problem = () => { const s = subj(), l = L();
    if (st.k === "warning" && !st.ev) return "لا توجد مخالفة لهذا الموظف";
    if (!s.start && ["salary","intro","experience","noc","clearance","settle"].includes(st.k)) return "أدخل تاريخ التعيين في ملف الموظف";
    if (l.en && st.lang === "en" && !s.nameEn) return "اكتب الاسم بالإنجليزية";
    if (l.en && st.lang === "en" && !s.roleEn) return "اكتب المسمى بالإنجليزية";
    if (st.k === "salary" && !(n(s.salary) > 0)) return "لا يوجد راتب في ملف الموظف";
    return ""; };
  const draw = () => { const box = $("#hl_pv"); if (!box) return;
    box.innerHTML = hlPage({...st, s:subj()}); hlFit(box.firstElementChild);
    const wrap = box.parentElement, k = Math.min(1, (wrap.clientWidth - 2) / 794); box.style.transform = `scale(${k})`; wrap.style.height = Math.ceil(1123 * k) + "px";
    const p = problem(), w = $("#hl_warn"); w.hidden = !p; w.className = "note warn"; w.textContent = p ? "قبل التنزيل: " + p : ""; };
  $("#hl_k").onchange = () => { st.k = $("#hl_k").value; if (!L().en) st.lang = "ar"; st.to = ""; st.purpose = ""; st.from = ""; st.to2 = ""; extra(); };
  $("#hl_s").onchange = () => { st.sid = $("#hl_s").value; st.ev = ""; extra(); };
  $("#hl_go").onclick = async () => { read(); const p = problem(); if (p){ toast(p); return; }
    const b = $("#hl_go"); b.disabled = true; b.textContent = "جارٍ التجهيز…";
    try {
      const s = subj(), real = S.staff.find(x => x.id === st.sid);
      /* the English name and title typed here are kept in the employee's file */
      if (real && ((st.nameEn && st.nameEn !== real.nameEn) || (st.roleEn && st.roleEn !== real.roleEn) || (st.natEn && st.natEn !== real.natEn))) await recWrite("staff", real.id, {...strip(real), ...(st.nameEn ? {nameEn:st.nameEn} : {}), ...(st.roleEn ? {roleEn:st.roleEn} : {}), ...(st.natEn ? {natEn:st.natEn} : {})}, "edit", "");
      if (!re){ st.ref = hlNextRef(); st.date = today(); }
      const ok = await hlPdf({...st, s}, `${(HL.find(x => x.k === st.k) || {}).t} - ${s.name} - ${st.ref}`);
      if (ok && !re){ const x = hlContent({...st, s});
        await recWrite("hrEvents", null, {kind:"letter", type:st.k, title:x.title, ref:st.ref, lang:st.lang, staffId:s.id, name:s.name, date:st.date, ym:st.date.slice(0, 7), at:new Date().toISOString(), to:st.to || "", purpose:st.purpose || "", from:st.from || "", to2:st.to2 || "", other:st.other || "", ev:st.ev || ""}, null, "");
        toast("حُفظ الخطاب برقم " + st.ref); closeModal(); }
    } finally { if ($("#hl_go")){ b.disabled = false; b.textContent = "تنزيل PDF"; } } };
  extra();
  addEventListener("resize", draw, {once:true});
}

/* A4 PDF of the page: drawn at 2.5× and placed edge to edge */
async function hlPdf(o, name){
  let dl = null; try { dl = await window.claude.use("downloads"); } catch(e){}
  if (!dl){ toast("التنزيل غير متاح في هذا العرض"); return false; }
  let box = null;
  try {
    const h2c = await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "html2canvas");
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "jspdf");
    try { await Promise.all(["400","500","600","700"].map(w => document.fonts.load(`${w} 16px PlexAr`, "العقيلة 0123 ABC"))); await document.fonts.ready; } catch(e){}
    box = document.createElement("div"); box.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;z-index:-1;pointer-events:none";
    box.innerHTML = hlPage(o); document.body.appendChild(box);
    const page = box.firstElementChild; hlFit(page); splitWords(page);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = await h2c(page, {scale:2.5, backgroundColor:"#ffffff", useCORS:true, logging:false, width:794, height:1123, windowWidth:900, windowHeight:1200});
    const { jsPDF } = window.jspdf, pdf = new jsPDF({unit:"mm", format:"a4", orientation:"portrait"});
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, 210, 297, undefined, "FAST");
    pdf.setProperties({title: name});
    box.remove(); box = null;
    await dl.save({filename: (name + ".pdf").replace(/[\\/:*?"<>|]/g, "-"), data: pdf.output("blob")});
    return true;
  } catch(e){ if (!(e && e.code === "declined")){ console.error(e); toast("تعذّر إنشاء ملف PDF، حاول مرة أخرى"); } return false; }
  finally { if (box) box.remove(); }
}

/* the old letter buttons (نهاية الخدمة ← المخالصة) open the new dialog */
hxLetter = function(kind, sid, ev){ hlOpen(kind, sid, {ev}); };

if (typeof SZ_NAMES !== "undefined") Object.assign(SZ_NAMES, {hrFiles:"مستندات الموظفين"});
if (typeof BK_NAMES !== "undefined") Object.assign(BK_NAMES, {hrFiles:"مستندات الموظفين"});

/* ---------- styles ---------- */
(function(){ const st = document.createElement("style"); st.id = "hp-css"; st.textContent = `
.hr-av.xl{width:84px;height:84px;font-size:27px}
.hp{display:grid;gap:14px;min-width:0}
.hp-head{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.hp-ph{position:relative;cursor:pointer;flex:none}.hp-cam{position:absolute;inset-inline-end:-2px;bottom:-2px;width:28px;height:28px;border-radius:50%;background:var(--card);border:1px solid var(--line);display:grid;place-items:center;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.hp-id{flex:1;min-width:200px;display:grid;gap:4px}.hp-id h3{margin:0;font-size:22px}.hp-sub{color:var(--muted);font-size:14px}
.hp-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.hp-acts{display:flex;gap:8px;flex-wrap:wrap}
.hp-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}
.hp-st{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:grid;gap:1px;background:var(--card);min-width:0}
.hp-st small{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hp-st b{font-size:19px;font-weight:700}.hp-st span{font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hp-st.ok{border-color:color-mix(in srgb,#16A34A 35%,var(--line))}.hp-st.ok b{color:#15803D}.hp-st.warn b{color:#B45309}.hp-st.bad{border-color:color-mix(in srgb,#DC2626 40%,var(--line))}.hp-st.bad b{color:#B91C1C}
.hp-star{color:#F59E0B;font-size:15px}
.hp-tabs{max-width:100%;overflow-x:auto;scrollbar-width:none;justify-self:start}
.hp-body{min-height:240px;min-width:0}
.hp-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}.hp-col{display:grid;gap:14px;min-width:0}
.hp-card{border:1px solid var(--line);border-radius:14px;padding:14px 16px;background:var(--card);min-width:0}.hp-card h4{margin:0 0 10px;font-size:14.5px}
.hp-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}.hp-h h4{margin:0}
.hp-card .hr-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;margin:0}.hp-card .hr-dl dt{font-size:11.5px;color:var(--muted)}.hp-card .hr-dl dd{margin:2px 0 0;font-size:14px;overflow-wrap:anywhere}
.hp-dl{display:grid;gap:4px}
.hp-dli{display:flex;align-items:center;gap:10px;padding:7px 6px;border:0;background:none;font:inherit;color:var(--ink);text-align:start;border-radius:9px;cursor:pointer}.hp-dli:hover{background:var(--head)}
.hp-dn{flex:1;font-size:13.5px}.hp-fc{font-size:11.5px;color:var(--muted)}
.hp-dic{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;flex:none;background:var(--head);color:var(--muted)}
.hp-dic.ok{background:color-mix(in srgb,#16A34A 12%,var(--card));color:#15803D}.hp-dic.warn,.hp-dic.soon{background:color-mix(in srgb,#D97706 14%,var(--card));color:#B45309}.hp-dic.bad{background:color-mix(in srgb,#DC2626 12%,var(--card));color:#B91C1C}
.hp-kv3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.hp-kv3.two{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-kv3.four{grid-template-columns:repeat(4,minmax(0,1fr))}
.hp-kv3>div{display:grid;gap:1px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--card)}.hp-kv3 small{font-size:11.5px;color:var(--muted)}.hp-kv3 b{font-size:18px}
.hp-big{display:flex;align-items:center;gap:10px;margin-bottom:10px}.hp-big .hx-stars{font-size:22px}.hp-big b{font-size:22px}
.hp-crit{display:grid;gap:7px}.hp-crit>div{display:grid;grid-template-columns:1fr 100px 34px;gap:10px;align-items:center;font-size:13px}.hp-crit .hx-pbar{width:100%}
.hp-mnav{display:flex;align-items:center;gap:10px}.hp-mnav b{min-width:120px;text-align:center}
.hp-legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px}.hp-legend span{display:inline-flex;align-items:center;gap:5px}.hp-legend span::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--c)}
.s-ok{--c:#16A34A}.s-warn{--c:#D97706}.s-bad{--c:#DC2626}.s-info{--c:#2563EB}.s-mute{--c:#9CA3AF}
.hcal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.hcal .hd{font-size:11.5px;color:var(--muted);text-align:center;padding-bottom:2px}
.hc{min-height:62px;border:1px solid var(--line);border-radius:10px;padding:6px 7px;display:grid;align-content:start;gap:2px;position:relative;background:var(--card)}
.hc.e{border:0;background:none}.hc.fut{opacity:.55}.hc.today{outline:2px solid var(--red);outline-offset:-1px}
.hc>span{font-size:13px;font-weight:600}.hc small{font-size:11px;font-weight:600}.hc i{position:absolute;inset-inline-end:6px;top:6px;font-style:normal;font-size:10.5px;color:#B45309}
.hc[class*=" s-"]{background:color-mix(in srgb,var(--c) 11%,var(--card));border-color:color-mix(in srgb,var(--c) 35%,var(--line))}.hc[class*=" s-"] small{color:color-mix(in srgb,var(--c) 75%,#000)}
.hp-vault{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}
.hv{border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:10px;background:var(--card);align-content:start;min-width:0}
.hv.bad{border-color:color-mix(in srgb,#DC2626 45%,var(--line))}.hv.warn,.hv.soon{border-color:color-mix(in srgb,#D97706 45%,var(--line))}
.hv header{display:flex;align-items:center;gap:10px}.hv header>div{flex:1;display:grid}.hv header b{font-size:14.5px}.hv header small{font-size:11px;color:var(--muted)}
.hv dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 10px;margin:0}.hv dl .w{grid-column:1/-1}.hv dt{font-size:11px;color:var(--muted)}.hv dd{margin:1px 0 0;font-size:13px}
.hv-files{display:flex;gap:8px;flex-wrap:wrap;min-height:20px}
.hv-th{position:relative;width:74px;height:74px;border-radius:10px;border:1px solid var(--line);overflow:hidden;padding:0;background:var(--head);cursor:pointer}
.hv-th img{width:100%;height:100%;object-fit:cover;display:block}.hv-th i{position:absolute;bottom:3px;inset-inline-start:3px;background:rgba(0,0,0,.6);color:#fff;font-style:normal;font-size:10px;border-radius:5px;padding:0 4px}
.hv-del{position:absolute;top:3px;inset-inline-end:3px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:11px;display:grid;place-items:center}
.hv-none{font-size:12.5px;color:var(--muted)}
.hv footer{display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line2);padding-top:10px}
.hv-up{cursor:pointer}.hv-up.busy{opacity:.7;pointer-events:none}
.hf-lb{position:fixed;inset:0;background:rgba(10,10,12,.88);z-index:70;display:none;grid-template-rows:auto 1fr}.hf-lb.open{display:grid}
.hf-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;color:#fff}.hf-bar span{display:flex;gap:8px}.hf-bar .btn.ghost{color:#fff;border-color:rgba(255,255,255,.35)}
.hf-stage{display:flex;align-items:center;justify-content:center;gap:10px;padding:6px 10px 16px;min-height:0;overflow:auto}
.hf-stage img{max-width:min(100%,1100px);max-height:calc(100vh - 90px);object-fit:contain;border-radius:8px;background:#fff}
.hf-nav{width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:26px;cursor:pointer;flex:none}
.hd-t th,.hd-t td{white-space:nowrap}.hd-who{border:0;background:none;font:inherit;color:var(--ink);cursor:pointer;padding:0;text-align:start}
.hd-c{cursor:pointer}.hd-c .hd-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--line);margin-inline-end:6px;vertical-align:middle}
.hd-c small{margin-inline-start:6px;color:var(--muted);font-size:11px}.hd-c:hover{background:var(--head)}
.hd-c.ok .hd-dot{background:#16A34A}.hd-c.soon .hd-dot,.hd-c.warn .hd-dot{background:#D97706}.hd-c.bad .hd-dot{background:#DC2626}.hd-c.bad .num{color:#B91C1C;font-weight:700}.hd-c.none .num{color:var(--muted)}
.hl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.hl{display:grid;grid-template-columns:300px minmax(0,1fr);gap:18px;align-items:start}
.hl-form{display:grid;gap:10px;align-content:start;position:sticky;top:0}.hl-form .f{min-width:0}.hl-form .seg{width:fit-content}
.hl-form #hl_extra{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hl-form #hl_extra>.f:not(.hl-2),.hl-form #hl_extra>.note{grid-column:1/-1}
.hl-prev{background:color-mix(in srgb,var(--ink) 6%,var(--card));border-radius:14px;padding:14px;min-width:0;overflow:hidden}
.hl-prev>div{transform-origin:top right;width:794px;box-shadow:0 4px 18px rgba(0,0,0,.18)}
@media (max-width:1000px){.hp-stats{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media (max-width:860px){.hl{grid-template-columns:minmax(0,1fr)}.hl-form{position:static}}
@media (max-width:700px){.hp-g{grid-template-columns:minmax(0,1fr)}.hp-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-kv3.four{grid-template-columns:repeat(2,minmax(0,1fr))}.hp-card .hr-dl{grid-template-columns:minmax(0,1fr)}
  .hc{min-height:48px;padding:4px}.hc small{font-size:9.5px}.hcal{gap:3px}.hp-acts{width:100%}}
/* ---- the letter (fixed light colours: it is paper) ---- */
.lt-page{width:794px;height:1123px;background:#fff;color:#1c1c1e;font-family:"PlexAr","TajawalE","Tajawal",Tahoma,sans-serif;position:relative;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box}
.lt-page *{box-sizing:border-box;letter-spacing:0!important}
.lt-band{height:9px;background:linear-gradient(90deg,#7A0C1A,#C8102E 55%,#7A0C1A);flex:none}.lt-band.b{height:6px}
.lt-wm{position:absolute;width:420px;height:420px;object-fit:contain;left:50%;top:52%;transform:translate(-50%,-50%);opacity:.035;pointer-events:none}
.lt-head{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:26px 58px 18px;border-bottom:1.5px solid #E9DDDF;flex:none}
.lt-brand{display:flex;align-items:center;gap:14px}.lt-brand img{width:66px;height:66px;object-fit:contain}
.lt-brand div{display:grid;gap:3px}.lt-brand b{font-size:21px;font-weight:700;color:#7A0C1A}.lt-brand small{font-size:12px;color:#6B6B70;text-transform:uppercase}
.lt-reg{display:grid;gap:4px;font-size:11.5px;color:#55555A;text-align:end}
.lt-meta{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 58px 0;font-size:12.5px;color:#55555A;flex:none}.lt-meta b{color:#1c1c1e;font-weight:600}
.lt-meta>div:last-child{text-align:end;display:grid;gap:2px}.lt-hj{font-size:11.5px;color:#7A7A80}
.lt-title{margin:26px 0 0;text-align:center;font-size:25px;font-weight:700;color:#7A0C1A;flex:none}
.lt-title::after{content:"";display:block;width:64px;height:3px;border-radius:3px;background:#C8102E;margin:10px auto 0}
.lt-body{flex:1;min-height:0;overflow:hidden;padding:20px 66px 6px;font-size:15.5px;line-height:2;text-align:start}
.lt-body p{margin:0 0 .65em}.lt-body .lt-to{font-weight:700;margin-bottom:.4em}.lt-body .lt-close{margin-top:.9em;font-weight:600}
.lt-info{width:100%;border-collapse:collapse;margin:.3em 0 .9em;font-size:.9em;line-height:1.5}
.lt-page .lt-info th{width:36%;text-align:start!important;font-weight:600!important;font-size:1em!important;color:#55555A!important;background:#FAF6F6!important;padding:7px 12px!important;border:1px solid #EDE3E4!important;white-space:normal!important;height:auto!important}.lt-page .lt-info td{padding:7px 12px!important;border:1px solid #EDE3E4!important;font-weight:600;white-space:normal!important;color:#1c1c1e!important;font-size:1em!important;height:auto!important}
.lt-money{width:100%;border-collapse:collapse;margin:.3em 0 .9em;font-size:.9em;line-height:1.5}
.lt-page .lt-money th{background:#7A0C1A!important;color:#fff!important;font-weight:600!important;font-size:1em!important;padding:7px 12px!important;text-align:start!important;white-space:normal!important;border:0!important;height:auto!important}.lt-page .lt-money th:last-child,.lt-page .lt-money td:last-child{text-align:end!important;width:30%}
.lt-page .lt-money td{padding:7px 12px!important;border:0!important;border-bottom:1px solid #EDE3E4!important;white-space:normal!important;color:#1c1c1e!important;font-size:1em!important;height:auto!important}.lt-money td.sm{font-size:.85em;color:#6B6B70}.lt-page .lt-money tr.tot td{font-weight:700!important;background:#FAF6F6!important;border-top:2px solid #7A0C1A!important;border-bottom:0!important}
.lt-money.chk td:last-child{width:34%}
.lt-sign{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:6px 66px 22px;flex:none}
.lt-signer{display:grid;gap:3px;min-width:200px;font-size:13.5px}.lt-signer small{font-size:11.5px;color:#6B6B70}.lt-signer b{font-size:15px}.lt-signer span{color:#55555A;font-size:12.5px}
.lt-line{margin-top:30px;border-top:1px solid #9A9AA0;padding-top:4px;font-size:11px;color:#7A7A80;width:190px}
.lt-stamp{width:116px;height:116px;border-radius:50%;border:1.5px dashed #C9B7BA;display:grid;place-items:center;font-size:11px;color:#B3A1A4;flex:none}
.lt-foot{display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 58px 14px;border-top:1px solid #EFE7E8;font-size:11px;color:#6B6B70;flex:none}.lt-foot i{font-style:normal;color:#C8102E}
.lt-page.en .lt-body{text-align:left}.lt-page.en .lt-brand small{text-transform:none;letter-spacing:0}
`; document.head.appendChild(st); })();
