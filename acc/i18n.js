/* AQ ACC in English: the interface is written in Arabic; with English chosen (on this device), every Arabic text the program
   shows is replaced from a dictionary (i18n-en.js) as it appears on the screen, and the page turns left to right.
   What people typed (names, notes, suppliers) is shown as written. The PDF reports and letters keep their own language.
   Loaded before every other script; the choice is kept per device and applied with a reload. */
(function(){
  "use strict";
  let lang = "ar"; try { lang = localStorage.getItem("acc-lang") === "en" ? "en" : "ar"; } catch(e){}
  window.accLang = () => lang;
  window.accSetLang = l => { try { localStorage.setItem("acc-lang", l === "en" ? "en" : "ar"); } catch(e){} location.reload(); };
  const H = document.documentElement;
  H.dataset.uiLang = lang;
  if (lang !== "en") { window.tr = s => s; return; }
  H.lang = "en"; H.dir = "ltr";
  /* the dictionary is read only in English (synchronously, before the page draws) */
  document.write('<script src="i18n-en.js?v=7"><\/script>');

  const AR = /[؀-ۿ]/, LET = /[ء-ي٠-٩ٮ-ۓۺ-ۿ]/;
  let DICT = null, RX = null;
  const cache = new Map();
  function build(){
    DICT = window.ACC_EN || {};
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
  const SKIP = "input,textarea,script,style,[contenteditable=true],.rp-capture,.rp-paper,.lt-page,[data-noi18n],.no-tr";
  const AREA = "[contenteditable=true],.rp-capture,.rp-paper,.lt-page,[data-noi18n],.no-tr";  /* a field's own hint and label are the interface's */
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

  /* left-to-right layout for the modern design (its sidebar and drawer were placed for Arabic) */
  const st = document.createElement("style"); st.textContent = `
html[dir=ltr] body{font-family:"PlexAr","TajawalE",system-ui,-apple-system,"Segoe UI",sans-serif}
html[dir=ltr] #pxnav{right:auto!important;left:0;border-left:0;border-right:1px solid var(--line)}
html[dir=ltr] .px-link.on::before{right:auto;left:-10px;border-radius:0 3px 3px 0}
html[dir=ltr] #pxtop{margin-right:0!important;margin-left:var(--sb)}
html[dir=ltr][data-pro="1"] main{margin-right:0!important;margin-left:var(--sb)}
html[dir=ltr] .px-pop{left:auto;right:0}
html[dir=ltr] .px-brand .px-name{text-align:left}
@media (max-width:1023px){html[dir=ltr] #pxtop,html[dir=ltr][data-pro="1"] main{margin-left:0}html[dir=ltr] #pxnav{transform:translateX(-100%)}html[dir=ltr] .px-open #pxnav,html[dir=ltr] #pxnav.open{transform:none}}
html[dir=ltr] .hl-prev>div{transform-origin:top left}
html[dir=ltr] .num{direction:ltr}
@media (max-width:640px){html[dir=ltr] .bg-t td:nth-child(2)::before{content:"Budget"}html[dir=ltr] .bg-t td:nth-child(3)::before{content:"Actual"}html[dir=ltr] .bg-t td:nth-child(4)::before{content:"Remaining / over"}
html[dir=ltr] .px-t td:nth-child(2)::before{content:"Quantity"}html[dir=ltr] .px-t td:nth-child(3)::before{content:"Average price"}html[dir=ltr] .px-t td:nth-child(4)::before{content:"Low – high"}
html[dir=ltr] .px-t td:nth-child(5)::before{content:"Last price"}html[dir=ltr] .px-t td:nth-child(6)::before{content:"Change"}html[dir=ltr] .px-t td:nth-child(7)::before{content:"Cheapest supplier"}html[dir=ltr] .px-t td:nth-child(8)::before{content:"Total"}}
html[dir=ltr] .dy-share .btn{white-space:normal;line-height:1.2}
html[dir=ltr] .pdx-link svg,html[dir=ltr] .px-pop svg.chev{transform:scaleX(-1)}
`; (document.head || H).appendChild(st);
})();
