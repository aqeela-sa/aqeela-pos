/* Customer screen for a TV (board.html). A small page of its own, built for older TV browsers:
   build with  npx esbuild board-src.js --bundle --format=iife --target=chrome58 --minify --outfile=board.js
   It shows order numbers preparing / ready for pickup (5 minutes after the kitchen marks them ready), with a chime.
   Numbers only: no names, no phones. All orders, with the platform name for driver orders. Arabic and English together. */
import { initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, initializeFirestore, collection, query, where, onSnapshot, getDocs, doc, getDoc } from "./vendor/firebase.js";
import { firebaseConfig } from "./firebase-config.js";

window.__ok = true;
var DEVICE_EMAIL = "cashier@aqeela-pos.app", KDS_BY = "المطبخ", READY_MIN = 5, MAXP = 24, MAXR = 12;
var TY = { hunger: "هنقرستيشن", lokit: "لوكيت", delivery: "توصيل" };
var app = initializeApp(firebaseConfig), auth = getAuth(app);
var db = initializeFirestore(app, { experimentalForceLongPolling: true });
var $ = function (s) { return document.querySelector(s); };
var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
var pad = function (n) { return (n < 10 ? "0" : "") + n; };
/* a TV's own clock and time zone are often wrong (one showed 20:32 at 04:32 Riyadh time): the time is taken from the web server's
   clock and shown in Riyadh time (UTC+3, no daylight saving), so the business day and the 5 ready minutes are right whatever the TV says */
var OFF = 0, TZ = 3 * 3600e3;
var now = function () { return Date.now() + OFF; };
function syncClock() {
  try { var t0 = Date.now(); fetch("board.html?clock=" + t0, { method: "HEAD", cache: "no-store" }).then(function (r) {
    var d = Date.parse(r.headers.get("Date") || ""); if (d) { OFF = d + (Date.now() - t0) / 2 - Date.now(); if (auth.currentUser) { watchDay(); draw(); } } }).catch(function () {}); } catch (e) {}
}
var hm = function (t) { var d = new Date(t + TZ); return pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes()); };
var S = { config: null, today: [], day: "", unsub: [], first: null, started: false, online: navigator.onLine };
var ymd = function (d) { return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); };
var bizDay = function () { return ymd(new Date(now() + TZ - ((S.config && S.config.cutoff != null ? S.config.cutoff : 4) * 3600e3))); };

/* sound: a clear three-note chime, loud on a TV speaker */
var AC = null;
function chime() {
  try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume();
    if (!AC.__out) { var c = AC.createDynamicsCompressor(); c.threshold.value = -24; c.ratio.value = 8; var g = AC.createGain(); g.gain.value = 1.6; c.connect(g); g.connect(AC.destination); AC.__out = c; }
    [[1047, 0], [1319, .32], [1568, .64]].forEach(function (x) { var o = AC.createOscillator(), g = AC.createGain(), at = AC.currentTime + x[1], d = .55;
      o.type = "triangle"; o.frequency.value = x[0]; g.gain.setValueAtTime(.0001, at); g.gain.exponentialRampToValueAtTime(.9, at + .015); g.gain.setValueAtTime(.9, at + d * .6); g.gain.exponentialRampToValueAtTime(.0001, at + d);
      o.connect(g); g.connect(AC.__out); o.start(at); o.stop(at + d + .02); });
  } catch (e) {}
}
/* full screen (no address bar): asked on «ابدأ», and again with OK/Enter on the remote if the browser left it */
function fullOn() { try { var el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullscreen;
  if (f && !(document.fullscreenElement || document.webkitFullscreenElement)) { var r = f.call(el); if (r && r.catch) r.catch(function () {}); } } catch (e) {} }
document.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23) && S.started && !$("#lf") && document.activeElement !== $("#bx")) fullOn(); });
var wake = null;
function wakeOn() { try { if (navigator.wakeLock && !wake) navigator.wakeLock.request("screen").then(function (w) { wake = w; w.addEventListener("release", function () { wake = null; }); }).catch(function () {}); } catch (e) {} }
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { wakeOn(); draw(); } });

/* ---------- sign-in (once per TV) ---------- */
function drawLogin(msg) {
  $("#app").innerHTML = '<form class="bl" id="lf"><img src="icons/logo.png" alt=""><h1>شاشة الزبائن</h1><p>تسجيل دخول الجهاز (مرة واحدة)</p>' + (msg ? '<div class="err">' + esc(msg) + "</div>" : "") +
    '<label>البريد الإلكتروني<input id="em" type="email" dir="ltr" autocomplete="username" value="' + esc(DEVICE_EMAIL) + '" required></label>' +
    '<label>كلمة المرور<input id="pw" type="password" dir="ltr" autocomplete="current-password" required></label><button class="btn" id="lb">دخول</button></form>';
  $("#lf").onsubmit = function (e) { e.preventDefault(); var b = $("#lb"); b.disabled = true; b.textContent = "جارٍ الدخول…";
    signInWithEmailAndPassword(auth, $("#em").value.trim().toLowerCase(), $("#pw").value).catch(function (er) { var c = er.code || "";
      drawLogin(c.indexOf("invalid") >= 0 || c.indexOf("wrong") >= 0 || c.indexOf("not-found") >= 0 ? "البريد أو كلمة المرور غير صحيحة." : c.indexOf("network") >= 0 ? "لا يوجد اتصال بالإنترنت." : "تعذّر الدخول: " + c); }); };
}

/* ---------- the board ---------- */
function drawShell() {
  var st = (S.config && S.config.store) || {};
  $("#app").innerHTML = '<div class="brd"><header class="brd-h"><img src="icons/logo.png" alt=""><div class="brd-t"><b>' + esc(st.name || "شاورما العقيلة") + '</b><span>حالة الطلبات · Order status</span></div><div class="sp"></div><span class="brd-net" id="net"></span><span class="brd-clk" id="clk"></span></header>' +
    '<main class="brd-m"><section class="brd-c bp"><h2><span>قيد التحضير</span><small>Preparing</small></h2><div class="brd-g" id="gp"></div></section>' +
    '<section class="brd-c br"><h2><span>جاهز للاستلام</span><small>Ready for pickup</small></h2><div class="brd-g" id="gr"></div></section></main>' +
    '<footer class="brd-f"><span>عند ظهور رقمك في «جاهز للاستلام» تفضّل بالاستلام من النافذة</span><span>When your number shows under “Ready”, please collect it at the window</span><button id="bx" aria-label="خروج">⏻</button></footer></div>' +
    (S.started ? "" : '<div class="go" id="go"><div><img src="icons/logo.png" alt=""><h2>شاشة الزبائن</h2><p>اضغط «ابدأ» لتشغيل نغمة «جاهز» وإبقاء الشاشة مضيئة.</p><button class="btn" id="gob">ابدأ</button></div></div>');
  if ($("#gob")) { $("#gob").onclick = function () { S.started = true; fullOn(); chime(); wakeOn(); $("#go").parentNode.removeChild($("#go")); }; setTimeout(function () { try { $("#gob").focus(); } catch (e) {} }, 50); }
  $("#bx").onclick = function () { if (confirm("الخروج من شاشة الزبائن وتسجيل خروج هذا الجهاز؟")) signOut(auth); };
  draw();
}
function draw() {
  var P = $("#gp"), R = $("#gr"); if (!P || !R) return; var t = now();
  if ($("#clk")) $("#clk").textContent = hm(t);
  if ($("#net")) $("#net").innerHTML = S.online ? "" : '<span class="off">بدون إنترنت · Offline</span>';
  if (S.day !== bizDay()) { P.innerHTML = R.innerHTML = '<div class="brd-e">…</div>'; return; }
  var live = S.today.filter(function (o) { return o.status !== "void"; });
  var start = function (o) { return o.kAdd && o.kAdd.at && o.deliveredAt && o.deliveredAt < o.kAdd.at ? o.kAdd.at : o.ts; };
  var prep = live.filter(function (o) { return o.prep === "open"; }).sort(function (a, b) { return start(a) - start(b); });
  var ready = live.filter(function (o) { return o.prep === "done" && o.deliveredBy === KDS_BY && o.deliveredAt && t - o.deliveredAt < READY_MIN * 60e3; }).sort(function (a, b) { return b.deliveredAt - a.deliveredAt; });
  var first = !S.first; if (first) S.first = {};
  var fresh = false; ready.forEach(function (o) { var k = o.id + ":" + o.deliveredAt; if (!(k in S.first)) { S.first[k] = first ? 0 : t; if (!first) fresh = true; } });
  if (fresh) chime();
  var tag = function (o) { return (TY[o.type] ? "<small>" + TY[o.type] + "</small>" : "") + (o.test ? "<em>تجريبي</em>" : ""); };
  var no = function (o) { return o.no == null ? "" : o.no; };
  P.innerHTML = prep.length ? prep.slice(0, MAXP).map(function (o) { return '<div class="bt"><b>' + no(o) + "</b>" + tag(o) + "</div>"; }).join("") + (prep.length > MAXP ? '<div class="bt more">+' + (prep.length - MAXP) + "</div>" : "") : '<div class="brd-e">—</div>';
  R.innerHTML = ready.length ? ready.slice(0, MAXR).map(function (o) { var nw = t - (S.first[o.id + ":" + o.deliveredAt] || 0) < 15e3;
    return '<div class="bt' + (nw ? " new" : "") + '"><b>' + no(o) + "</b>" + tag(o) + "</div>"; }).join("") : '<div class="brd-e">—</div>';
}

/* ---------- data ---------- */
var daySub = null;
function watchDay() {
  var d = bizDay(); if (S.subDay === d && daySub) return; if (daySub) daySub(); S.subDay = d;
  daySub = onSnapshot(query(collection(db, "orders"), where("day", "==", d)), function (s) {
    S.today = s.docs.map(function (x) { return x.data(); }); S.day = d; draw();
  }, function (e) { console.error(e); });
}
/* safety net every 15 s: the open orders straight from the server, and any order that left that list */
setInterval(function () {
  if (!auth.currentUser || !S.online || S.day !== bizDay()) return;
  getDocs(query(collection(db, "orders"), where("day", "==", S.day), where("prep", "==", "open"))).then(function (q) {
    var ch = false, srv = {};
    q.docs.forEach(function (x) { var o = x.data(); srv[x.id] = 1; var i = S.today.findIndex(function (t) { return t.id === o.id; });
      if (i < 0) { S.today.push(o); ch = true; } else if (S.today[i].prep !== "open") { S.today[i] = o; ch = true; } });
    var gone = S.today.filter(function (o) { return o.prep === "open" && !srv[o.id]; }).slice(0, 10);
    return Promise.all(gone.map(function (o) { return getDoc(doc(db, "orders", o.id)).then(function (x) { if (x.exists()) { var i = S.today.findIndex(function (t) { return t.id === o.id; }); if (i >= 0) { S.today[i] = x.data(); ch = true; } } }); }))
      .then(function () { if (ch) draw(); });
  }).catch(function (e) { console.warn("poll", e && e.code); });
}, 15e3);
setInterval(function () { if (auth.currentUser) { watchDay(); draw(); } }, 10e3);
syncClock(); setInterval(syncClock, 30 * 60e3);
addEventListener("online", function () { S.online = true; draw(); });
addEventListener("offline", function () { S.online = false; draw(); });

onAuthStateChanged(auth, function (u) {
  S.unsub.forEach(function (f) { f(); }); S.unsub = []; if (daySub) { daySub(); daySub = null; S.subDay = ""; }
  S.config = null; S.first = null; S.today = []; S.day = "";
  if (!u) return drawLogin();
  $("#app").innerHTML = '<div class="bl"><img src="icons/logo.png" alt=""><p>جارٍ التحميل…</p></div>';
  S.unsub.push(onSnapshot(doc(db, "config", "main"), function (s) { var had = !!S.config; S.config = s.exists() ? s.data() : {}; if (!had) { drawShell(); } watchDay(); draw(); },
    function (e) { drawLogin("تعذّر قراءة الإعدادات: " + (e.code || e.message)); }));
});
