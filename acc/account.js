/* «حسابي»: the signed-in account's own page — its details (the name on its entries, phone, title), its password,
   the devices it was used on, and a lock after a time without use on this device. Open to every account;
   the owner sees it in full, a team member's name stays the one the owner gave in الإعدادات ← الفريق. */
(function(){
  "use strict";
  const FB = () => window.__accFb && window.__accFb.user;
  const prof = () => (FB() && FB().profile && FB().profile()) || {};
  const at = t => { if (!t) return "—"; const d = new Date(t); if (isNaN(d)) return "—";
    const p = x => String(x).padStart(2, "0"); return `<span class="num">${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}</span>`; };
  const ago = t => { const d = new Date(t); if (!t || isNaN(d)) return ""; const m = Math.round((Date.now() - d) / 60000);
    return m < 2 ? "الآن" : m < 60 ? `قبل ${m} دقيقة` : m < 1440 ? `قبل ${Math.round(m / 60)} ساعة` : `قبل ${Math.round(m / 1440)} يوم`; };
  const roleTxt = () => { if (S.canEdit) return "المالك · كل الصلاحيات";
    const m = typeof teamMe === "function" ? teamMe() : null;
    return m ? ((typeof TEAM_ROLES !== "undefined" && TEAM_ROLES[m.role] && TEAM_ROLES[m.role].l) || "عضو الفريق") : "حساب الإدخال"; };
  const member = () => !S.canEdit && typeof teamMe === "function" && !!teamMe();
  const myName = () => { const m = member() ? teamMe() : null; return (m && m.name) || prof().name || (S.canEdit ? "المالك" : "حساب الإدخال"); };
  window.accMyName = myName;

  /* the lock after a time without use: kept on this device only */
  const IDLE_KEY = "acc-idle", IDLE_OPTS = [[0, "بدون قفل"], [15, "بعد 15 دقيقة"], [30, "بعد 30 دقيقة"], [60, "بعد ساعة"], [240, "بعد 4 ساعات"]];
  const idleMin = () => { try { return +localStorage.getItem(IDLE_KEY) || 0; } catch(e){ return 0; } };
  let last = Date.now();
  ["pointerdown", "keydown", "wheel", "touchstart", "input"].forEach(t => addEventListener(t, () => { last = Date.now(); }, {capture:true, passive:true}));
  const idleCheck = () => { const m = idleMin(); if (!m || !FB() || !S.db) return;
    if (Date.now() - last > m * 60000){ try { localStorage.setItem("acc-idle-out", "1"); } catch(e){} FB().signOut(); } };
  setInterval(idleCheck, 30000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") idleCheck(); });

  /* password strength: length, letters, digits, mixed case or a symbol */
  const strength = p => { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p)) s++; if ((/[a-z]/.test(p) && /[A-Z]/.test(p)) || /[^A-Za-z0-9؀-ۿ]/.test(p)) s++; return s; };
  const S_TXT = ["", "ضعيفة", "مقبولة", "جيدة", "قوية"], S_COL = ["var(--line)", "var(--bad)", "var(--warn)", "#2F7D4F", "var(--good)"];
  const rules = p => [[p.length >= 8, "8 أحرف على الأقل"], [/[A-Za-z؀-ۿ]/.test(p), "حرف واحد على الأقل"], [/\d/.test(p), "رقم واحد على الأقل"]];
  const ERR = c => /INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS|INVALID_CREDENTIAL/.test(c) ? "كلمة المرور الحالية غير صحيحة"
    : /TOO_MANY/.test(c) ? "محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى"
    : /WEAK_PASSWORD|PASSWORD_DOES_NOT_MEET/.test(c) ? "كلمة المرور الجديدة ضعيفة. اجعلها 8 أحرف على الأقل فيها حروف وأرقام"
    : /NETWORK/.test(c) ? "لا يوجد اتصال بالإنترنت" : /USER_DISABLED/.test(c) ? "هذا الحساب موقوف" : "تعذّر التغيير (" + c + ")";

  function viewAccount(){
    const u = FB(), me = (u && u.meta && u.meta()) || {}, p = prof(), em = (u && u.email && u.email()) || "", mem = member();
    const dev = u && u.device ? u.device() : "", devs = Object.entries(p.devices || {}).sort((a, b) => (b[1].last || "").localeCompare(a[1].last || ""));
    const nm = myName(), ini = (nm || "A").trim().charAt(0) || "A";
    return `<div class="bar"><h2>حسابي</h2><div class="actions"><button class="btn ghost" type="button" id="ac_out">تسجيل الخروج</button></div></div>
    <div class="card ac-hero"><div class="ac-av" aria-hidden="true">${esc(ini)}</div>
      <div class="ac-id"><b>${esc(nm)}</b><span class="chip ok">${esc(roleTxt())}</span><div class="small muted" dir="ltr" style="text-align:right">${esc(em)}</div></div>
      <div class="ac-meta"><div><small>آخر تسجيل دخول</small>${at(me.lastSignIn)}</div><div><small>الحساب منذ</small>${at(me.created)}</div><div><small>آخر تغيير لكلمة المرور</small>${p.pwChangedAt ? at(p.pwChangedAt) : `<span class="muted">لم تتغير من هنا</span>`}</div></div></div>
    <div class="ac-grid">
    <form class="card entry" id="ac_pf" autocomplete="off"><h3>البيانات الشخصية</h3>
      <div class="fields">
        <div class="f"><label for="ac_nm">الاسم الظاهر</label><input id="ac_nm" maxlength="40" value="${esc(nm)}" ${mem ? "disabled" : ""} required></div>
        <div class="f"><label for="ac_tt">المسمى</label><input id="ac_tt" maxlength="40" value="${esc(p.title || (S.canEdit ? "المالك والمدير العام" : ""))}"></div>
        <div class="f"><label for="ac_ph">رقم الجوال</label><input id="ac_ph" type="tel" dir="ltr" inputmode="tel" maxlength="20" placeholder="05xxxxxxxx" value="${esc(p.phone || "")}"></div>
        <div class="f"><label for="ac_em">البريد الإلكتروني (اسم الدخول)</label><input id="ac_em" dir="ltr" value="${esc(em)}" readonly></div>
      </div>
      <p class="small muted" style="margin:10px 0 0">${mem ? "اسمك يعدّله المالك من الإعدادات ← الفريق." : "الاسم الظاهر يظهر في القائمة الجانبية وبجانب كل سجل تُدخله، القديم والجديد."} البريد هو اسم الدخول ومرتبط بالصلاحيات، فلا يتغير من هنا.</p>
      <div class="actions"><button class="btn" type="submit" id="ac_ps">حفظ البيانات</button></div></form>

    <form class="card entry" id="ac_pw" autocomplete="on" novalidate><h3>تغيير كلمة المرور</h3>
      <input type="email" autocomplete="username" value="${esc(em)}" hidden aria-hidden="true">
      <div class="fields ac-pwf">
        <div class="f"><label for="ac_c">كلمة المرور الحالية</label><div class="ac-pin"><input id="ac_c" type="password" dir="ltr" autocomplete="current-password" required><button type="button" class="ac-eye" data-eye="ac_c" aria-label="إظهار">إظهار</button></div></div>
        <div class="f"><label for="ac_n">كلمة المرور الجديدة</label><div class="ac-pin"><input id="ac_n" type="password" dir="ltr" autocomplete="new-password" required minlength="8"><button type="button" class="ac-eye" data-eye="ac_n" aria-label="إظهار">إظهار</button></div>
          <div class="ac-meter" aria-hidden="true"><i id="ac_bar"></i></div><div class="small" id="ac_st"></div></div>
        <div class="f"><label for="ac_r">تأكيد كلمة المرور الجديدة</label><div class="ac-pin"><input id="ac_r" type="password" dir="ltr" autocomplete="new-password" required><button type="button" class="ac-eye" data-eye="ac_r" aria-label="إظهار">إظهار</button></div><div class="small" id="ac_mt"></div></div>
      </div>
      <ul class="ac-rules" id="ac_rl">${rules("").map(([, t]) => `<li>${t}</li>`).join("")}</ul>
      <div id="ac_msg"></div>
      <p class="small muted" style="margin:6px 0 0">تتغير لهذا الحساب في كل مكان يُدخَل به، ويخرج من كل الأجهزة الأخرى خلال ساعة على الأكثر. هذا الجهاز يبقى داخلاً.</p>
      <div class="actions" style="align-items:center"><button class="btn" type="submit" id="ac_go">تغيير كلمة المرور</button><button class="btn ghost sm" type="button" id="ac_rs">نسيت الحالية؟ أرسل رابط التعيين لبريدي</button></div></form>
    </div>
    <div class="ac-grid">
    <div class="card"><h3>الأمان على هذا الجهاز</h3>
      <div class="f" style="max-width:320px"><label for="ac_idle">قفل البرنامج عند عدم الاستخدام</label><select id="ac_idle">${IDLE_OPTS.map(([v, l]) => `<option value="${v}" ${v === idleMin() ? "selected" : ""}>${l}</option>`).join("")}</select></div>
      <p class="small muted" style="margin:8px 0 0">بعد المدة المختارة دون لمس أو كتابة يخرج البرنامج من الحساب، ويطلب كلمة المرور من جديد. مناسب لجهاز يستخدمه غيرك. الإعداد لهذا الجهاز فقط.</p></div>
    <div class="card"><h3>الأجهزة التي استُخدم بها الحساب</h3>
      ${devs.length ? `<div class="ac-devs">${devs.map(([id, d]) => `<div class="ac-dev"><div><b>${esc(d.label || "جهاز")}</b>${id === dev ? ` <span class="chip ok">هذا الجهاز</span>` : ""}<div class="small muted">أول استخدام ${at(d.first)}</div></div><div class="small" style="text-align:left">${id === dev ? "الآن" : esc(ago(d.last))}<div class="muted">${at(d.last)}</div></div></div>`).join("")}</div>`
        : `<p class="small muted" style="margin:0">تظهر هنا الأجهزة بعد أول فتح للبرنامج منها.</p>`}
      <p class="small muted" style="margin:10px 0 0">إذا رأيت جهازاً لا تعرفه، غيّر كلمة المرور فوراً: يخرج كل جهاز آخر من الحساب.</p></div>
    </div>`;
  }

  function bindAccount(){
    const u = FB(); if (!u) return;
    $("#ac_out").onclick = () => { if (confirm("تسجيل الخروج من هذا الجهاز؟")) u.signOut(); };
    document.querySelectorAll("[data-eye]").forEach(b => b.onclick = () => { const i = document.getElementById(b.dataset.eye), show = i.type === "password"; i.type = show ? "text" : "password"; b.textContent = show ? "إخفاء" : "إظهار"; });
    $("#ac_idle").onchange = e => { try { localStorage.setItem(IDLE_KEY, e.target.value); } catch(x){} last = Date.now(); toast(+e.target.value ? "سيُقفل البرنامج " + e.target.selectedOptions[0].textContent : "أُلغي القفل التلقائي على هذا الجهاز"); };
    $("#ac_pf").onsubmit = async e => { e.preventDefault(); const b = $("#ac_ps"), nm = $("#ac_nm").value.trim(), ph = $("#ac_ph").value.trim();
      if (!member() && nm.length < 2) return toast("اكتب الاسم الظاهر");
      if (ph && !/^\+?[0-9 ]{7,20}$/.test(ph)) return toast("رقم الجوال غير صحيح");
      b.disabled = true; b.textContent = "جارٍ الحفظ…";
      try { await u.saveProfile({ ...(member() ? {} : { name: nm }), title: $("#ac_tt").value, phone: ph }); toast("حُفظت بياناتك"); if (window.proNavSync) proNavSync(); render(); }
      catch(x){ toast("تعذّر الحفظ: " + ((x && x.code) || "خطأ")); b.disabled = false; b.textContent = "حفظ البيانات"; } };
    const c = $("#ac_c"), n = $("#ac_n"), r = $("#ac_r"), msg = $("#ac_msg");
    const live = () => { const v = n.value, s = v ? strength(v) : 0;
      $("#ac_bar").style.cssText = `width:${s * 25}%;background:${S_COL[s]}`; $("#ac_st").textContent = v ? "القوة: " + S_TXT[s] : ""; $("#ac_st").style.color = S_COL[s];
      $("#ac_rl").innerHTML = rules(v).map(([ok, t]) => `<li class="${ok ? "ok" : ""}">${t}</li>`).join("");
      $("#ac_mt").textContent = r.value ? (r.value === v ? "✓ متطابقة" : "غير متطابقة") : ""; $("#ac_mt").style.color = r.value === v ? "var(--good)" : "var(--bad)"; };
    n.oninput = live; r.oninput = live;
    const say = (t, ok) => { msg.innerHTML = `<div class="note ${ok ? "" : "warn"}" style="margin-top:10px">${t}</div>`; };
    $("#ac_pw").onsubmit = async e => { e.preventDefault(); msg.innerHTML = "";
      const v = n.value;
      if (!rules(v).every(x => x[0])) return say("كلمة المرور الجديدة لا تحقق الشروط: 8 أحرف على الأقل فيها حرف ورقم.");
      if (v !== r.value) return say("تأكيد كلمة المرور لا يطابق الجديدة.");
      if (v === c.value) return say("كلمة المرور الجديدة هي نفسها الحالية. اختر كلمة مختلفة.");
      const b = $("#ac_go"); b.disabled = true; b.textContent = "جارٍ التغيير…";
      const res = await u.changePassword(c.value, v);
      b.disabled = false; b.textContent = "تغيير كلمة المرور";
      if (!res.ok){ say(esc(ERR(res.code || ""))); if (/INVALID/.test(res.code || "")){ c.value = ""; c.focus(); } return; }
      c.value = n.value = r.value = ""; live();
      if (res.relogin){ say("تغيّرت كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.", true); setTimeout(() => u.signOut(), 2500); return; }
      toast("تغيّرت كلمة المرور"); render();
      setTimeout(() => { const m = $("#ac_msg"); if (m) m.innerHTML = `<div class="note" style="margin-top:10px">✓ تغيّرت كلمة المرور. استخدم الجديدة في المرة القادمة على كل الأجهزة.</div>`; }, 50); };
    $("#ac_rs").onclick = async () => { const em = u.email ? u.email() : "";
      if (!confirm("نرسل رابط تعيين كلمة مرور جديدة إلى " + em + "؟")) return;
      const b = $("#ac_rs"); b.disabled = true; const res = await u.sendReset(); b.disabled = false;
      say(res.ok ? "أُرسل الرابط إلى بريدك. افتحه واختر كلمة مرور جديدة، وإن لم تجده فانظر في البريد غير المرغوب." : esc(ERR(res.code || "")), res.ok); };
  }

  VIEWS.account = {v: viewAccount, bind: bindAccount};

  const css = document.createElement("style"); css.id = "ac-css";
  css.textContent = `
.ac-hero{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.ac-av{width:64px;height:64px;border-radius:50%;background:var(--accent-soft,#FBE9E7);color:var(--red-ink,var(--red));display:grid;place-items:center;font-size:26px;font-weight:800;flex:none}
.ac-id{flex:1;min-width:200px;display:grid;gap:5px;justify-items:start}
.ac-id b{font-size:19px}
.ac-meta{display:flex;gap:22px;flex-wrap:wrap}
.ac-meta div{display:grid;gap:2px;font-size:13px}
.ac-meta small{color:var(--muted);font-size:11.5px}
.ac-grid{display:grid;gap:14px;align-items:start;grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:14px}
.ac-grid>.card{min-width:0;margin:0}
.ac-pwf{grid-template-columns:minmax(0,1fr)}
.ac-pin{position:relative}
.ac-pin input{padding-inline-end:70px!important;width:100%}
.ac-eye{position:absolute;inset-inline-end:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;color:var(--muted);font:inherit;font-size:12px;font-weight:700;cursor:pointer;padding:4px 8px;border-radius:7px}
.ac-eye:hover{background:var(--head);color:var(--ink)}
.ac-meter{height:5px;border-radius:9px;background:var(--line);overflow:hidden;margin-top:6px}
.ac-meter i{display:block;height:100%;width:0;transition:width .2s,background .2s}
.ac-rules{list-style:none;padding:0;margin:10px 0 0;display:flex;gap:6px 16px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.ac-rules li::before{content:"○ ";}
.ac-rules li.ok{color:var(--good)}
.ac-rules li.ok::before{content:"✓ ";}
.ac-devs{display:grid;gap:0}
.ac-dev{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.ac-dev:last-child{border-bottom:0}
@media (max-width:860px){.ac-grid{grid-template-columns:minmax(0,1fr)}.ac-meta{gap:14px}}
`;
  document.head.appendChild(css);
})();
