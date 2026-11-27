/* Cashier AQ in English: the screens are written in Arabic; with English chosen (on this device), every Arabic text shown
   is replaced from a dictionary (i18n-en.js) as it appears, and the page turns left to right. What people typed (names, notes)
   and the menu items without a translation are shown as written. The receipt and the kitchen ticket are printed in Arabic.
   Loaded before every other script; the choice is kept per device and applied with a reload. */
(function(){
  "use strict";
  let lang = "ar"; try { lang = localStorage.getItem("aq-lang") === "en" ? "en" : "ar"; } catch(e){}
  window.aqLang = () => lang;
  window.aqSetLang = l => { try { localStorage.setItem("aq-lang", l === "en" ? "en" : "ar"); } catch(e){} location.reload(); };
  const H = document.documentElement;
  H.dataset.uiLang = lang;
  if (lang !== "en") { window.tr = s => s; return; }
  H.lang = "en"; H.dir = "ltr";
  /* the dictionary is read only in English (synchronously, before the page draws) */
  document.write('<script src="i18n-en.js?v=1"><\/script>');

  const AR = /[؀-ۿ]/, LET = /[ء-ي٠-٩ٮ-ۓۺ-ۿ]/;
  let DICT = null, RX = null;
  const cache = new Map();
  function build(){
    DICT = window.AQ_EN || {};
    const keys = Object.keys(DICT).filter(k => k && AR.test(k) && k[0] !== "=" && !k.startsWith("th:")).sort((a, b) => b.length - a.length);
    const escK = k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    RX = keys.length ? new RegExp(keys.map(escK).join("|"), "g") : null;
  }
  const norm = s => s.replace(/\s+/g, " ").trim();
  const UNIT = {"د": "min", "ص": "AM", "م": "PM"};
  /* one text: the whole of it when the dictionary has it, otherwise each known piece inside it (whole words only) */
  function tr(s){
    if (!s || !AR.test(s)) return s;
    if (!DICT) build();
    const c = cache.get(s); if (c !== undefined) return c;
    const core = norm(s); let out;
    const whole = DICT["=" + core] != null ? DICT["=" + core] : DICT[core];   /* «=key»: a word alone (a button or a label), not inside a sentence */
    if (whole != null){ const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0]; out = lead + whole + tail; }
    else if (RX){
      RX.lastIndex = 0;
      out = s.replace(RX, (m, off, all) => {
        const b = all[off - 1], a = all[off + m.length];
        if ((b && LET.test(b) && LET.test(m[0])) || (a && LET.test(a) && LET.test(m[m.length - 1]))) return m;
        if (b === "{" && a === "}") return m;   /* a {placeholder} people type stays as it is */
        /* a single word beside other Arabic words is most likely part of what someone typed (an item, a supplier): left as written */
        if (!/\s/.test(m.trim())){
          const pre = all.slice(0, off).replace(/\s+$/, ""), post = all.slice(off + m.length).replace(/^\s+/, "");
          if ((pre && LET.test(pre[pre.length - 1])) || (post && LET.test(post[0]))) return m;
        }
        const v = DICT[norm(m)]; return v == null ? m : v;
      });
      /* pieces joined back: no space lost between an English word and the next */
      out = out.replace(/([a-z0-9).%])([A-Z][a-z])/g, "$1 $2");
    } else out = s;
    out = out.replace(/(^|[^\d:/])(\d{1,2})\s*(ص|م)(?![؀-ۿ])/g, (m, a, d, x) => a + d + " " + UNIT[x]);   /* hours: «4ص», «12م» */
    out = out.replace(/(\d)\s*د(?![؀-ۿ])/g, "$1 min").replace(/(\d:\d\d)\s*(ص|م)(?![؀-ۿ])/g, (m, d, x) => d + " " + UNIT[x]);
    out = out.replace(/←/g, "→").replace(/«/g, "“").replace(/»/g, "”").replace(/،/g, ",").replace(/؛/g, ";").replace(/؟/g, "?");
    if (cache.size > 20000) cache.clear();
    cache.set(s, out); return out;
  }
  window.tr = tr;

  /* where the words are not the interface's: what people type, the paper reports and letters, and anything marked to stay */
  const SKIP = "input,textarea,script,style,[contenteditable=true],#print,canvas,[data-noi18n],.no-tr";
  const AREA = "[contenteditable=true],#print,[data-noi18n],.no-tr";  /* a field's own hint and label are the interface's */
  const ATTRS = ["placeholder", "title", "aria-label", "alt", "data-tip"];
  /* a lone arrow on a button points the other way when the page runs left to right (previous / next) */
  const FLIP = {"→":"←","←":"→","‹":"›","›":"‹"};
  function doText(n){
    const v = n.nodeValue;
    if (v && FLIP[v.trim()] && n.parentElement && n.parentElement.closest("button,a") && !n.parentElement.closest(AREA) && !n.__flip){ n.__flip = 1; n.nodeValue = v.replace(v.trim(), FLIP[v.trim()]); return; }
    if (v && !AR.test(v) && v.includes("←") && v.trim().length > 1){ const p0 = n.parentElement; if (p0 && !p0.closest(SKIP)) n.nodeValue = v.replace(/←/g, "→"); return; }   /* «from ← to» reads left to right */
    if (!v || !AR.test(v)) return;
    const p = n.parentElement; if (!p || p.closest(SKIP)) return;
    /* a one-letter unit after a number shown just before it: «12 د» minutes, «9 ص / م» */
    const u = UNIT[v.trim()]; if (u){ const prev = n.previousSibling; if (prev && (v.trim() === "د" ? /\d\s*$/ : /\d:\d\d\s*$/).test(prev.textContent || "")){ n.nodeValue = v.replace(v.trim(), u); return; } }
    /* a column heading can read differently from the same word elsewhere («th:key») */
    if (!DICT) build();
    const th = p.closest("th"), k = th && DICT["th:" + norm(v)];
    const t = k != null ? v.replace(v.trim(), k) : tr(v); if (t !== v) n.nodeValue = t;
  }
  function doEl(el){
    if (el.nodeType !== 1 || el.closest(AREA)) return;
    for (const a of ATTRS){ const v = el.getAttribute && el.getAttribute(a); if (v && AR.test(v)){ const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
    /* an option without a value keeps its Arabic text as the value the program reads */
    if (el.tagName === "OPTION" && !el.hasAttribute("value") && AR.test(el.textContent)) el.setAttribute("value", el.textContent);
    if ((el.tagName === "INPUT") && (el.type === "button" || el.type === "submit") && AR.test(el.value)) el.value = tr(el.value);
  }
  function walk(root){
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    if (root.closest && root.closest(AREA)) return;
    doEl(root);
    if (root.closest && root.closest(SKIP)) return;
    root.querySelectorAll("option:not([value])").forEach(doEl);
    root.querySelectorAll("[placeholder],[title],[aria-label],[alt],[data-tip],input[type=button],input[type=submit]").forEach(doEl);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) doText(n);
  }
  const mo = new MutationObserver(list => {
    for (const m of list){
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doEl(m.target);
      else m.addedNodes.forEach(walk);
    }
  });
  const start = () => { walk(document.body); mo.observe(document.body, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:ATTRS}); };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);

  /* messages the browser shows itself */
  const A0 = window.alert.bind(window), C0 = window.confirm.bind(window), P0 = window.prompt.bind(window);
  window.alert = m => A0(tr(String(m)));
  window.confirm = m => C0(tr(String(m)));
  window.prompt = (m, d) => P0(tr(String(m)), d);

  /* left-to-right details the layout can't flip by itself */
  const st = document.createElement("style"); st.textContent = `
html[dir=ltr] .num,html[dir=ltr] .money{direction:ltr}
html[dir=ltr] .cx .tm,html[dir=ltr] .cx-dr .tm{direction:ltr}
html[dir=ltr] .sw::after{right:auto;left:3px}html[dir=ltr] .sw.on::after{right:auto;left:25px}   /* a switch is on to the right */   /* «1:54 PM», not «PM 1:54» */
/* manager console: the menu slides in from the left (where its button is), the detail panel from the right */
@media (max-width:920px){html[dir=ltr] .cx-side{right:auto;left:0;transform:translateX(-105%)}html[dir=ltr] .cx.nav .cx-side{transform:none;box-shadow:10px 0 40px rgba(0,0,0,.18)}}
html[dir=ltr] .cx-dr{left:auto;right:0;box-shadow:-12px 0 40px rgba(0,0,0,.18);animation-name:cxdl}
@keyframes cxdl{from{transform:translateX(30px);opacity:0}}
`; (document.head || H).appendChild(st);
})();
