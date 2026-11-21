(function () {
  "use strict";
  var DATA = window.TIPS_DATA || { categories: [], tips: [] };
  var CATS = DATA.categories, TIPS = DATA.tips;
  var catById = {};
  CATS.forEach(function (c) { catById[c.id] = c; });

  var GLOWS = ["#ff2f92", "#ff7a3d", "#2ee6d6", "#8b5cff", "#ffc94a"];

  var RULES = [
    { t: "Bank it or lose it", b: "Cash in your pocket vanishes when you're Wasted or Busted. Hit an ATM after every job." },
    { t: "Save before you gamble", b: "No saving mid-mission and no replays. Use a fresh manual slot at every chapter." },
    { t: "Empty Jason's stash early", b: "Grab the floorboard cash before the mission \"Tourist Trap\" — the house is gone after it." },
    { t: "Cops remember your look", b: "Keep a spare outfit in the trunk, holster your gun and swap cars to shake the heat." },
    { t: "Don't grind Chapter 1", b: "The real money opens up from Chapter 3. Early on, just learn the ropes and play the story." }
  ];

  var RANKS = [
    [0, "Fresh Off the Bus"], [8, "Street Rookie"], [20, "Corner Hustler"], [38, "Wheelman"],
    [56, "Smooth Operator"], [75, "Heist Crew"], [92, "Kingpin"], [100, "Legend of Leonida"]
  ];

  /* ---------- storage ---------- */
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function store(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  var saved = load("saved", {}), learned = load("learned", {});

  /* ---------- helpers ---------- */
  var view = document.getElementById("view");
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 1600);
  }
  function buzz() { try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {} }
  function pct(list) { if (!list.length) return 0; return Math.round(list.filter(function (t) { return learned[t.id]; }).length * 100 / list.length); }
  function rankFor(p) { var r = RANKS[0]; RANKS.forEach(function (x) { if (p >= x[0]) r = x; }); return r; }
  function nextRank(p) { for (var i = 0; i < RANKS.length; i++) if (RANKS[i][0] > p) return RANKS[i]; return null; }
  function dayIndex() { var d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); }

  var ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bookmark: '<svg class="fillable" viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>'
  };

  /* ---------- tip card ---------- */
  function highlight(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    return safe.replace(re, "<mark>$1</mark>");
  }
  function tipCard(t, opts) {
    opts = opts || {};
    var q = opts.q || "";
    var src = t.sources.map(function (s) { return '<a href="' + esc(s.url) + '">' + esc(s.name) + " ↗</a>"; }).join("");
    return '<article class="tip' + (learned[t.id] ? " done" : "") + (opts.open ? " open" : "") + '" data-id="' + t.id + '">' +
      '<button class="tip-head" data-act="toggle">' +
        '<span class="tip-id">' + t.id + "</span>" +
        '<span class="t-main"><span class="t-title">' + highlight(t.title, q) + "</span>" +
          '<span class="t-meta"><span class="badge ' + t.conf + '">' + t.conf + "</span>" +
          (t.conflict ? '<span class="badge conflict">Sources differ</span>' : "") +
          (opts.showCat ? '<span class="badge cat">' + catById[t.cat].icon + " " + esc(catById[t.cat].name) + "</span>" : "") +
          (learned[t.id] ? '<span class="badge Confirmed">✓ Learned</span>' : "") +
        "</span></span>" + ICON.chev +
      "</button>" +
      '<div class="tip-body"><div>' +
        (t.conflict ? '<div class="conflict-note">⚠ Guides disagree on this one — double-check it in-game.</div>' : "") +
        "<p>" + highlight(t.body, q) + "</p>" +
        (src ? '<div class="sources">Sources: ' + src + "</div>" : "") +
        '<div class="actions">' +
          '<button class="act' + (learned[t.id] ? " on" : "") + '" data-act="learn">' + ICON.check + (learned[t.id] ? "Learned" : "Mark learned") + "</button>" +
          '<button class="act save' + (saved[t.id] ? " on" : "") + '" data-act="save">' + ICON.bookmark + (saved[t.id] ? "Saved" : "Save") + "</button>" +
        "</div>" +
      "</div></div></article>";
  }

  function bindTips(root, rerender) {
    root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var card = btn.closest(".tip"); if (!card) return;
      var id = card.getAttribute("data-id");
      var act = btn.getAttribute("data-act");
      if (act === "toggle") { card.classList.toggle("open"); return; }
      buzz();
      if (act === "learn") {
        var before = rankFor(pct(TIPS))[1];
        if (learned[id]) delete learned[id]; else learned[id] = 1;
        store("learned", learned);
        var after = rankFor(pct(TIPS))[1];
        if (learned[id] && after !== before) toast("🏆 Rank up: " + after);
        else toast(learned[id] ? "Nice — marked as learned" : "Unmarked");
      } else if (act === "save") {
        if (saved[id]) delete saved[id]; else saved[id] = 1;
        store("saved", saved);
        toast(saved[id] ? "Saved to your list" : "Removed from saved");
      }
      var t = TIPS.filter(function (x) { return x.id === id; })[0];
      if (rerender) { rerender(); return; }
      var tmp = document.createElement("div");
      tmp.innerHTML = tipCard(t, { open: true, showCat: card.querySelector(".badge.cat") != null });
      card.replaceWith(tmp.firstChild);
    });
  }

  /* ---------- pages ---------- */
  var stack = []; // navigation history within the app
  var current = { tab: "home" };

  function ring(p) {
    var r = 28, c = 2 * Math.PI * r, off = c * (1 - p / 100);
    return '<div class="ring"><svg width="66" height="66" viewBox="0 0 66 66">' +
      '<defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" stop-color="#ff2f92"/><stop offset=".6" stop-color="#ff7a3d"/><stop offset="1" stop-color="#ffc94a"/></linearGradient></defs>' +
      '<circle cx="33" cy="33" r="' + r + '" stroke="#ffffff14" stroke-width="7" fill="none"/>' +
      '<circle cx="33" cy="33" r="' + r + '" stroke="url(#rg)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '"/>' +
      '</svg><span class="pct">' + p + "%</span></div>";
  }

  var PALM = '<svg viewBox="0 0 120 200"><path d="M58 200c4-50 6-95 2-140l6 1c3 45 2 90-2 139z"/>' +
    '<path d="M62 58C48 40 22 34 2 44c18-2 36 4 52 18zM62 58c8-20 30-34 54-32-20 6-36 18-46 36zM62 58c-6-22-26-40-50-44 18 10 32 26 40 48zM62 58c16-10 40-10 56 4-18-4-36 0-50 8zM62 58c-20-2-44 10-54 30 14-14 32-22 52-24zM62 58c2-22 16-44 36-52-12 14-22 32-26 54z"/></svg>';

  function renderHome() {
    var p = pct(TIPS), rk = rankFor(p), nx = nextRank(p);
    var learnedCount = TIPS.filter(function (t) { return learned[t.id]; }).length;
    var tip = TIPS[dayIndex() % TIPS.length];
    var html = '<div class="page">' +
      '<section class="hero"><div class="stars"></div><div class="sun"></div>' +
        '<svg class="palms l" viewBox="0 0 120 200">' + PALM.replace(/<\/?svg[^>]*>/g, "") + "</svg>" +
        '<svg class="palms r" viewBox="0 0 120 200">' + PALM.replace(/<\/?svg[^>]*>/g, "") + "</svg>" +
        '<div class="sea"></div>' +
        '<div class="title"><div class="kicker">Rookie guide · Leonida</div><h1>Welcome<br>to the <span>sunshine</span><br>state.</h1></div>' +
      "</section>" +
      '<div class="rank">' + ring(p) + "<div>" +
        '<div class="label">Your rank</div><div class="name">' + esc(rk[1]) + "</div>" +
        '<div class="next">' + learnedCount + " of " + TIPS.length + " tips learned" + (nx ? " · next: " + esc(nx[1]) : " · max rank!") + "</div>" +
      "</div></div>" +
      '<div class="cta-wrap">' + continueCard() + "</div>" +
      '<div class="sec"><h2>5 golden rules</h2><small>swipe →</small></div>' +
      '<div class="rules">' + RULES.map(function (r, i) {
        return '<div class="rule"><span class="n">' + (i + 1) + "</span><h3>" + esc(r.t) + "</h3><p>" + esc(r.b) + "</p></div>";
      }).join("") + "</div>" +
      '<div class="sec"><h2>Tip of the day</h2><small>' + new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }) + "</small></div>" +
      '<div class="totd"><div class="tag">' + catById[tip.cat].icon + " " + esc(catById[tip.cat].name) + "</div>" +
        "<h3>" + esc(tip.title) + "</h3><p>" + esc(tip.body) + "</p>" +
        '<div class="row"><span class="badge ' + tip.conf + '">' + tip.conf + '</span><button class="btn-ghost" data-open-cat="' + tip.cat + '" data-focus="' + tip.id + '">Open category →</button></div></div>' +
      '<div class="sec"><h2>Explore by topic</h2><small>' + CATS.length + " topics · " + TIPS.length + " tips</small></div>" +
      '<div class="grid">' + CATS.map(function (c, i) {
        var list = TIPS.filter(function (t) { return t.cat === c.id; });
        var cp = pct(list);
        return '<button class="cat" data-open-cat="' + c.id + '"><span class="glow" style="background:' + GLOWS[i % GLOWS.length] + '"></span>' +
          '<span class="ico">' + c.icon + '</span><span class="nm">' + esc(c.name) + '</span><span class="ct">' + list.length + " tips" + (cp ? " · " + cp + "%" : "") + "</span>" +
          '<span class="bar"><i style="width:' + cp + '%"></i></span></button>';
      }).join("") + "</div>" +
      '<p class="footnote">Unofficial fan guide · not affiliated with Rockstar Games or Take-Two.</p>' +
      "</div>";
    view.innerHTML = html;
    bindStoryLinks();
    $all("[data-open-cat]", view).forEach(function (b) {
      b.addEventListener("click", function () { go({ tab: "home", cat: b.getAttribute("data-open-cat"), focus: b.getAttribute("data-focus") }); });
    });
  }

  function renderCategory(catId, focus, filter) {
    var c = catById[catId];
    filter = filter || "All";
    var all = TIPS.filter(function (t) { return t.cat === catId; });
    var list = all.filter(function (t) {
      if (filter === "All") return true;
      if (filter === "To learn") return !learned[t.id];
      return t.conf === filter;
    });
    var p = pct(all);
    view.innerHTML = '<div class="page">' +
      '<div class="topbar"><button class="iconbtn" id="back">' + ICON.back + "</button><h1>" + esc(c.name) + "</h1></div>" +
      '<div class="catbanner"><span class="ico">' + c.icon + '</span><p><b>' + all.length + " tips</b> · " + p + "% learned<br>Tap a tip to expand, then mark it learned to rank up.</p></div>" +
      '<div class="filters">' + ["All", "To learn", "Confirmed", "Reported", "Unverified"].map(function (f) {
        return '<button class="chip' + (f === filter ? " on" : "") + '" data-f="' + f + '">' + f + "</button>";
      }).join("") + "</div>" +
      '<div class="tips">' + (list.length ? list.map(function (t) { return tipCard(t, { open: t.id === focus }); }).join("") :
        '<div class="empty"><div class="big">🌴</div><b>Nothing here</b>All tips in this filter are done.</div>') + "</div>" +
      "</div>";
    $("#back").addEventListener("click", back);
    $all(".chip", view).forEach(function (b) {
      b.addEventListener("click", function () { current.filter = b.getAttribute("data-f"); renderCategory(catId, null, current.filter); });
    });
    bindTips($(".tips", view), filter === "To learn" ? function () { renderCategory(catId, null, filter); } : null);
    if (focus) { var el = $('[data-id="' + focus + '"]', view); if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 60); }
    else window.scrollTo(0, 0);
  }

  var lastQuery = "";
  function renderSearch() {
    view.innerHTML = '<div class="page">' +
      '<div class="topbar"><h1>Search tips</h1></div>' +
      '<div class="searchbox">' + ICON.search + '<input id="q" type="search" placeholder="Try “cash”, “cops”, “Lucia”…" autocomplete="off" value="' + esc(lastQuery) + '"></div>' +
      '<div class="tips" id="results"></div></div>';
    var input = $("#q"), res = $("#results");
    function run() {
      var q = input.value.trim(); lastQuery = q;
      if (q.length < 2) {
        res.innerHTML = '<div class="empty"><div class="big">🔎</div><b>Find any tip fast</b>Search across all ' + TIPS.length + " tips by keyword.</div>";
        return;
      }
      var ql = q.toLowerCase();
      var hits = TIPS.filter(function (t) { return (t.title + " " + t.body + " " + catById[t.cat].name).toLowerCase().indexOf(ql) >= 0; });
      res.innerHTML = hits.length ? hits.map(function (t) { return tipCard(t, { q: q, showCat: true }); }).join("") :
        '<div class="empty"><div class="big">🤷</div><b>No matches</b>Try a different word.</div>';
    }
    input.addEventListener("input", run);
    bindTips(res, null);
    run();
  }

  function renderSaved() {
    var list = TIPS.filter(function (t) { return saved[t.id]; });
    view.innerHTML = '<div class="page">' +
      '<div class="topbar"><h1>Saved tips</h1></div>' +
      '<div class="tips">' + (list.length ? list.map(function (t) { return tipCard(t, { showCat: true }); }).join("") :
        '<div class="empty"><div class="big">🔖</div><b>No saved tips yet</b>Tap “Save” on any tip to keep it handy here.</div>') +
      "</div></div>";
    bindTips($(".tips", view), renderSaved);
  }

  function renderAbout() {
    view.innerHTML = '<div class="page">' +
      '<div class="topbar"><h1>About</h1></div><div class="about">' +
      '<div class="panel"><h3>What is this?</h3><p>A beginner\'s companion for Grand Theft Auto VI story mode on PS5 and Xbox Series X|S. ' + TIPS.length + " tips in " + CATS.length + " topics, collected from gaming magazines, guide sites, creators and the player community during launch week (Nov 2026), rewritten in plain language.</p></div>" +
      '<div class="panel"><h3>How sure are we?</h3><ul>' +
        '<li><span class="badge Confirmed">Confirmed</span> — developer statement or several solid sources agree.</li>' +
        '<li><span class="badge Reported">Reported</span> — one credible guide, or several smaller ones agree.</li>' +
        '<li><span class="badge Unverified">Unverified</span> — single source, pre-release info or conflicting reports.</li>' +
        '<li><span class="badge conflict">Sources differ</span> — guides disagree; check it in-game.</li>' +
      "</ul><p style=\"margin-top:8px\">The game is brand new and patches can change prices, caps and unlocks.</p></div>" +
      '<div class="panel"><h3>Disclaimer</h3><p>Unofficial fan-made guide. Not affiliated with, endorsed or sponsored by Rockstar Games or Take-Two Interactive. Game names and trademarks belong to their owners. Tip sources are linked on each tip.</p></div>' +
      '<div class="panel"><h3>Your progress</h3><p>' + Object.keys(learned).length + " learned · " + Object.keys(saved).length + ' saved</p><button class="danger" id="reset">Reset progress</button></div>' +
      '<p class="footnote">Version 1.1 · content as of 21 Nov 2026</p></div></div>';
    $("#reset").addEventListener("click", function () {
      if (!confirm("Reset all learned and saved tips?")) return;
      learned = {}; saved = {}; store("learned", learned); store("saved", saved); toast("Progress reset"); renderAbout();
    });
  }

  /* ---------- story walkthrough ---------- */
  var WALK = (window.WALK_DATA || { chapters: [] }).chapters;
  var ALL_MISSIONS = [];
  WALK.forEach(function (c, ci) { c.missions.forEach(function (m) { m.ci = ci; ALL_MISSIONS.push(m); }); });
  var doneM = load("missions", {});
  var spoilerSafe = load("spoilerSafe", true);

  function chapterPct(c) { if (!c.missions.length) return 0; return Math.round(c.missions.filter(function (m) { return doneM[m.id]; }).length * 100 / c.missions.length); }
  function nextMission() { for (var i = 0; i < ALL_MISSIONS.length; i++) if (!doneM[ALL_MISSIONS[i].id]) return ALL_MISSIONS[i]; return null; }
  function whoClass(w) { w = (w || "").toLowerCase(); return w.indexOf("both") >= 0 || (w.indexOf("jason") >= 0 && w.indexOf("lucia") >= 0) ? "both" : w.indexOf("lucia") >= 0 ? "lucia" : w.indexOf("jason") >= 0 ? "jason" : "both"; }

  function continueCard() {
    if (!ALL_MISSIONS.length) return "";
    var nm = nextMission();
    var total = ALL_MISSIONS.length, done = ALL_MISSIONS.filter(function (m) { return doneM[m.id]; }).length;
    return '<button class="story-cta" data-go-mission="' + (nm ? nm.id : "") + '">' +
      '<span class="lbl">Story walkthrough · ' + done + "/" + total + " missions</span>" +
      '<span class="ttl">' + (nm ? "Next up: " + esc(nm.name) : "Story complete — legend!") + "</span>" +
      '<span class="sub">' + (nm ? esc(WALK[nm.ci].title) : "Every mission ticked off") + ' <b>→</b></span>' +
      '<span class="prog"><i style="width:' + Math.round(done * 100 / total) + '%"></i></span></button>';
  }

  function renderStory() {
    var nm = nextMission();
    view.innerHTML = '<div class="page">' +
      '<div class="topbar"><h1>Story walkthrough</h1></div>' +
      '<div class="catbanner"><span class="ico">🎬</span><p><b>' + ALL_MISSIONS.length + " missions · " + WALK.length + " chapters</b><br>Step-by-step objectives, tips and missables. Tick missions off as you play.</p></div>" +
      '<div class="spoiler-row"><span>🛡️ Spoiler shield <small>hide steps until tapped</small></span><button class="switch' + (spoilerSafe ? " on" : "") + '" id="spoil" aria-label="Spoiler shield"><i></i></button></div>' +
      (nm ? continueCard() : "") +
      '<div class="chapters">' + WALK.map(function (c, ci) {
        var p = chapterPct(c);
        return '<button class="chapter" data-ch="' + ci + '">' +
          '<span class="ch-no">' + (ci === 0 && /prologue/i.test(c.title) ? "P" : (/prologue/i.test(WALK[0].title) ? ci : ci + 1)) + "</span>" +
          '<span class="ch-main"><span class="ch-t">' + esc(c.title) + '</span><span class="ch-s">' + c.missions.length + (c.missions.length === 1 ? " mission" : " missions") + (p ? " · " + p + "% done" : "") + "</span>" +
          '<span class="bar"><i style="width:' + p + '%"></i></span></span>' +
          (p === 100 ? '<span class="ch-done">✓</span>' : '<svg class="chev r" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>') +
          "</button>";
      }).join("") + "</div>" +
      '<p class="footnote">Mission names and order come from launch-week guides and may change with patches.</p></div>';
    $("#spoil").addEventListener("click", function () {
      spoilerSafe = !spoilerSafe; store("spoilerSafe", spoilerSafe); buzz();
      this.classList.toggle("on", spoilerSafe); toast(spoilerSafe ? "Spoiler shield on" : "Spoiler shield off");
    });
    bindStoryLinks();
  }

  function bindStoryLinks() {
    $all("[data-ch]", view).forEach(function (b) {
      b.addEventListener("click", function () { go({ tab: "story", chapter: +b.getAttribute("data-ch") }); });
    });
    $all("[data-go-mission]", view).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-go-mission");
        var m = ALL_MISSIONS.filter(function (x) { return x.id === id; })[0];
        go({ tab: "story", chapter: m ? m.ci : 0, focus: id });
      });
    });
  }

  function missionCard(m, open) {
    var done = !!doneM[m.id];
    var src = m.sources.map(function (s) { return '<a href="' + esc(s.url) + '">' + esc(s.name) + " ↗</a>"; }).join("");
    var w = whoClass(m.who);
    return '<article class="mission' + (done ? " done" : "") + (open ? " open" : "") + '" data-id="' + m.id + '">' +
      '<span class="node ' + w + '">' + (done ? "✓" : m.no) + "</span>" +
      '<div class="m-card">' +
        '<button class="tip-head" data-act="toggle"><span class="t-main"><span class="t-title">' + esc(m.name) + "</span>" +
          '<span class="t-meta">' + (m.who ? '<span class="who ' + w + '">' + esc(m.who) + "</span>" : "") +
          '<span class="badge ' + m.conf + '">' + m.conf + "</span>" +
          (m.missable.length ? '<span class="badge conflict">Missable</span>' : "") + "</span></span>" + ICON.chev + "</button>" +
        '<div class="tip-body"><div>' +
          (m.missable.length ? m.missable.map(function (x) { return '<div class="conflict-note">⛔ ' + esc(x) + "</div>"; }).join("") : "") +
          (m.steps.length ? '<div class="steps-wrap' + (spoilerSafe ? " veiled" : "") + '"><ol class="steps">' + m.steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>" +
            (spoilerSafe ? '<button class="veil" data-act="unveil">👁 Tap to reveal steps</button>' : "") + "</div>" : '<p class="nosteps">No step-by-step guide for this mission yet. Follow the yellow marker, and save before you start it.</p>') +
          m.tips.map(function (t) { return '<div class="protip"><b>Pro tip</b>' + esc(t) + "</div>"; }).join("") +
          (m.unlocks.length ? '<div class="unlocks"><span>Unlocks</span>' + m.unlocks.map(function (u) { return '<i>🔓 ' + esc(u) + "</i>"; }).join("") + "</div>" : "") +
          (src ? '<div class="sources">Sources: ' + src + "</div>" : "") +
          '<div class="actions"><button class="act' + (done ? " on" : "") + '" data-act="complete">' + ICON.check + (done ? "Completed" : "Mark complete") + "</button></div>" +
        "</div></div></div></article>";
  }

  function renderChapter(ci, focus) {
    var c = WALK[ci]; if (!c) { current.chapter = null; renderStory(); return; }
    var p = chapterPct(c);
    view.innerHTML = '<div class="page">' +
      '<div class="topbar"><button class="iconbtn" id="back">' + ICON.back + "</button><h1>" + esc(c.title) + "</h1></div>" +
      '<div class="catbanner"><span class="ico">🎬</span><p><b>' + c.missions.length + " missions</b> · " + p + "% done" + (c.intro ? "<br>" + esc(c.intro) : "") + "</p></div>" +
      '<div class="timeline">' + c.missions.map(function (m) { return missionCard(m, m.id === focus); }).join("") + "</div>" +
      '<div class="chap-nav">' +
        (ci > 0 ? '<button class="act" data-ch-nav="' + (ci - 1) + '">← ' + esc(WALK[ci - 1].title) + "</button>" : "<span></span>") +
        (ci < WALK.length - 1 ? '<button class="act" data-ch-nav="' + (ci + 1) + '">' + esc(WALK[ci + 1].title) + " →</button>" : "") +
      "</div></div>";
    $("#back").addEventListener("click", back);
    $all("[data-ch-nav]", view).forEach(function (b) {
      b.addEventListener("click", function () { current = { tab: "story", chapter: +b.getAttribute("data-ch-nav") }; render(); });
    });
    $(".timeline", view).addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]"); if (!btn) return;
      var card = btn.closest(".mission"), id = card.getAttribute("data-id"), act = btn.getAttribute("data-act");
      if (act === "toggle") { card.classList.toggle("open"); return; }
      if (act === "unveil") { btn.parentNode.classList.remove("veiled"); btn.remove(); return; }
      if (act === "complete") {
        buzz();
        if (doneM[id]) delete doneM[id]; else doneM[id] = 1;
        store("missions", doneM);
        var m = ALL_MISSIONS.filter(function (x) { return x.id === id; })[0];
        var tmp = document.createElement("div"); tmp.innerHTML = missionCard(m, !doneM[id]);
        card.replaceWith(tmp.firstChild);
        if (doneM[id]) {
          toast(chapterPct(c) === 100 ? "🏁 Chapter complete!" : "Mission complete ✓");
          var el = $('[data-id="' + id + '"]', view).nextElementSibling;
          if (el && !el.classList.contains("done")) { el.classList.add("open"); setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); }
        }
        $(".catbanner p", view).innerHTML = "<b>" + c.missions.length + " missions</b> · " + chapterPct(c) + "% done" + (c.intro ? "<br>" + esc(c.intro) : "");
      }
    });
    if (focus) { var el = $('[data-id="' + focus + '"]', view); if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); }
  }

  /* ---------- navigation ---------- */
  function render() {
    $all("#tabbar button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-tab") === current.tab); });
    if (current.cat) renderCategory(current.cat, current.focus, current.filter);
    else if (current.chapter != null) renderChapter(current.chapter, current.focus);
    else if (current.tab === "story") renderStory();
    else if (current.tab === "search") renderSearch();
    else if (current.tab === "saved") renderSaved();
    else if (current.tab === "about") renderAbout();
    else renderHome();
    if (!current.focus) window.scrollTo(0, 0);
  }
  function go(state) { stack.push(current); current = state; render(); }
  function back() {
    if (!stack.length) return false;
    current = stack.pop(); current.focus = null; render(); return true;
  }
  // Called by the Android shell on the system back button; returns true if handled.
  window.appBack = function () {
    if (current.tab !== "home" || current.cat || current.chapter != null) { return back() || (go({ tab: "home" }), true); }
    return false;
  };

  $all("#tabbar button").forEach(function (b) {
    b.addEventListener("click", function () {
      var tab = b.getAttribute("data-tab");
      if (tab === current.tab && !current.cat && current.chapter == null) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
      buzz();
      stack = tab === "home" ? [] : [{ tab: "home" }];
      current = { tab: tab }; render();
    });
  });

  render();
  setTimeout(function () { document.getElementById("splash").classList.add("gone"); }, 1300);
})();
