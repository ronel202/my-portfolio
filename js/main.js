/* ==========================================================
   Ronel Pilo Fernandez — Portfolio (vanilla JS)
   ========================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var EMAIL = 'mronel472@gmail.com';

  $('#year').textContent = new Date().getFullYear();

  /* ==========================================================
     LANGUAGE — gate shown on EVERY visit (nothing is remembered)
     ========================================================== */
  var DICT = window.I18N || {};
  var lang = 'en';
  function t(key) { return (DICT[lang] && DICT[lang][key]) || (DICT.en && DICT.en[key]) || key; }

  function applyLang(l) {
    if (!DICT[l]) l = 'en';
    lang = l;
    document.documentElement.lang = l === 'tl' ? 'fil' : l;
    document.title = t('_title');
    $$('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.dataset.i18nHtml); });
    $$('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPh); });
    $('#langCode').textContent = l.toUpperCase();
    $$('.field.is-bad input, .field.is-bad textarea').forEach(function (i) { check(i); });
    if (typeof renderPalette === 'function' && !$('#palette').hidden) renderPalette($('#paletteInput').value);
    if (typeof refreshSectionLabel === 'function') refreshSectionLabel();
  }

  var gate = $('#langGate');
  function openGate() {
    gate.classList.remove('is-out');
    document.body.classList.add('is-gated');
    var guess = (navigator.language || 'en').toLowerCase().indexOf('fil') === 0 || (navigator.language || '').toLowerCase().indexOf('tl') === 0 ? 'tl' : 'en';
    var first = $('[data-lang="' + guess + '"]', gate);
    setTimeout(function () { if (first) first.focus(); }, 60);
  }
  function closeGate(l) {
    applyLang(l);
    gate.classList.add('is-out');
    document.body.classList.remove('is-gated');
    // translated text changes line wraps → refresh cached layout numbers
    requestAnimationFrame(function () { measure(); cacheOffsets(); updateSection(); });
  }
  $$('.gate__opt', gate).forEach(function (b) {
    b.addEventListener('click', function () { closeGate(b.dataset.lang); });
  });
  $('#langBtn').addEventListener('click', openGate);
  openGate();

  /* ---------- Toast ---------- */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------- Scroll reveal + counters + skill bars ---------- */
  $$('.reveal').forEach(function (el, i) { el.style.setProperty('--d', (i % 4) * 0.08 + 's'); });

  function countUp(el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = null, dur = 1400;
    if (reduce) { el.textContent = target + suffix; return; }
    (function step(t) {
      if (!t0) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      $$('[data-count]', en.target).forEach(countUp);
      if (en.target.hasAttribute('data-count')) countUp(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------- Cursor glow ---------- */
  var glow = $('#cursorGlow');
  var mouse = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  window.addEventListener('pointermove', function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.nx = (e.clientX / innerWidth) * 2 - 1;   // -1..1
    mouse.ny = (e.clientY / innerHeight) * 2 - 1;
    if (!coarse) glow.style.transform = 'translate3d(' + (e.clientX - 260) + 'px,' + (e.clientY - 260) + 'px,0)';
  }, { passive: true });

  /* ==========================================================
     HERO — chibi reacts to mouse (tilt/parallax/idle float)
     and to scroll (scrubs the "coming" clip, scales, drifts)
     ========================================================== */
  var hero = $('#hero'), card = $('#stageCard'), stage = $('#heroStage');
  var waitVid = $('#waitVid'), comeVid = $('#comeVid'), copy = $('#heroCopy');
  var cur = { rx: 0, ry: 0, px: 0, py: 0, mx: 50, my: 0 };
  var scrubT = 0, scrubCur = 0, heroP = 0, ticking = false;
  var heroSpan = 1, cardRect = { left: 0, top: 0, width: 1, height: 1 }, heroVisible = true, lastScrubSet = -1;

  if (reduce) { try { waitVid.pause(); } catch (e) {} }

  // measure once (and on resize) instead of every frame — avoids layout thrash
  function measure() {
    heroSpan = Math.max(1, hero.offsetHeight - innerHeight);
  }
  function heroProgress() { return clamp(window.scrollY / heroSpan, 0, 1); }

  // stop decoding video + the frame loop once the hero is off-screen
  new IntersectionObserver(function (en) {
    heroVisible = en[0].isIntersecting;
    if (reduce) return;
    if (heroVisible) { if (heroP <= 0.04) { var p = waitVid.play(); if (p && p.catch) p.catch(function () {}); } }
    else waitVid.pause();
    if (heroVisible) startLoop();
  }).observe(hero);

  var looping = false;
  function startLoop() { if (!looping) { looping = true; requestAnimationFrame(heroFrame); } }

  function heroFrame(time) {
    if (!heroVisible) { looping = false; return; }             // loop restarts via the observer
    var idleX = reduce ? 0 : Math.sin(time / 1700) * 0.28;   // subtle idle sway
    var idleY = reduce ? 0 : Math.cos(time / 2100) * 0.28;

    // mouse tracking (eased)
    var tx = (mouse.nx + idleX) * 9, ty = (mouse.ny + idleY) * 9;
    cur.rx += (tx - cur.rx) * 0.08;
    cur.ry += (ty - cur.ry) * 0.08;
    cur.px += ((mouse.nx + idleX) * -10 - cur.px) * 0.06;
    cur.py += ((mouse.ny + idleY) * -10 - cur.py) * 0.06;


    card.style.setProperty('--px', cur.px.toFixed(2));
    card.style.setProperty('--py', cur.py.toFixed(2));

    // scroll scrub of the "coming" clip
    if (comeVid.duration && isFinite(comeVid.duration)) {
      scrubCur += (scrubT - scrubCur) * 0.12;
      var want = scrubCur * (comeVid.duration - 0.05);
      // seek only when needed: every seek forces a decode, so skip tiny / overlapping ones
      if (!comeVid.seeking && Math.abs(want - lastScrubSet) > 0.06 && heroP > 0.04) {
        lastScrubSet = want;
        try { comeVid.currentTime = want; } catch (e) {}
      }
    }
    requestAnimationFrame(heroFrame);
  }

  function onScroll() {
    heroP = heroProgress();
    var scrubbing = heroP > 0.04 && heroP < 0.999;
    card.classList.toggle('is-scrubbing', heroP > 0.04);
    // 0.04..0.92 of scroll maps across the whole clip
    scrubT = clamp((heroP - 0.04) / 0.88, 0, 1);

    card.style.setProperty('--zoom', (1.04 + heroP * 0.1).toFixed(3));
    var fade = clamp(1 - heroP * 1.6, 0, 1);
    copy.style.opacity = fade;
    copy.style.transform = 'translate3d(0,' + (-heroP * 60).toFixed(1) + 'px,0)';
    copy.style.pointerEvents = fade < .2 ? 'none' : '';
    if (!reduce) {
      if (scrubbing) { if (!waitVid.paused) waitVid.pause(); }
      else if (waitVid.paused) { var p = waitVid.play(); if (p && p.catch) p.catch(function () {}); }
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); updateSection(); }); }
  }, { passive: true });
  comeVid.addEventListener('loadedmetadata', function () { try { comeVid.pause(); } catch (e) {} });
  measure();
  window.addEventListener('load', measure);
  window.addEventListener('resize', function () { measure(); cacheOffsets(); onScroll(); });
  startLoop();
  onScroll();

  /* ---------- Tilt cards ---------- */
  if (!coarse && !reduce) {
    $$('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ==========================================================
     NAVIGATION — floating dock (magnetic) + section tracking
     ========================================================== */
  var dock = $('#dock'), items = $$('.dock__item');
  if (!coarse && !reduce) {
    var dockX = 0, dockQueued = false, centers = [];
    function cacheCenters() { centers = items.map(function (it) { var r = it.getBoundingClientRect(); return r.left + r.width / 2; }); }
    dock.addEventListener('pointerenter', cacheCenters);
    dock.addEventListener('pointermove', function (e) {
      dockX = e.clientX;
      if (dockQueued) return;
      dockQueued = true;
      requestAnimationFrame(function () {
        dockQueued = false;
        items.forEach(function (it, i) {
          var s = 1 + Math.max(0, 1 - Math.abs(dockX - centers[i]) / 110) * 0.55;
          it.style.setProperty('--s', s.toFixed(3));
        });
      });
    });
    dock.addEventListener('pointerleave', function () { items.forEach(function (it) { it.style.removeProperty('--s'); }); });
  }

  var sections = $$('main > section');
  var railFill = $('#railFill'), railLabel = $('#railLabel'), activeId = '', activeIdx = 0;
  var tops = [], maxScroll = 1;
  // cached so scrolling never reads layout (offsetTop/scrollHeight) on every event
  function cacheOffsets() {
    tops = sections.map(function (s) { return s.offsetTop; });
    maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  }
  function refreshSectionLabel() {
    var key = ['nav.home', 'nav.about', 'nav.works', 'nav.skills', 'nav.resume', 'nav.contact'][activeIdx];
    railLabel.textContent = '0' + (activeIdx + 1) + ' / ' + t(key);
  }
  function updateSection() {
    var y = window.scrollY + innerHeight * 0.4, id = sections[0].id, idx = 0;
    for (var i = 0; i < tops.length; i++) if (tops[i] <= y) { id = sections[i].id; idx = i; }
    railFill.style.transform = 'scaleY(' + clamp(window.scrollY / maxScroll, 0, 1).toFixed(3) + ')';
    if (id === activeId) return;
    activeId = id; activeIdx = idx;
    items.forEach(function (it) { it.classList.toggle('is-active', it.dataset.section === id); });
    refreshSectionLabel();
  }
  cacheOffsets();
  updateSection();
  window.addEventListener('load', function () { cacheOffsets(); updateSection(); });

  /* ==========================================================
     COMMAND PALETTE (Ctrl/⌘ + K  or  "/")
     ========================================================== */
  var pal = $('#palette'), palInput = $('#paletteInput'), palList = $('#paletteList');
  function buildCommands() {
    var G1 = t('pal.g1'), G2 = t('pal.g2'), G3 = t('pal.g3');
    return [
      { g: G1, ic: '⌂', t: t('nav.home'),    k: 'hero home chibi',           a: function () { goTo('hero'); } },
      { g: G1, ic: '◐', t: t('nav.about'),   k: 'about ako seminar',         a: function () { goTo('about'); } },
      { g: G1, ic: '◧', t: t('pal.works'),   k: 'projects works gawa',       a: function () { goTo('projects'); } },
      { g: G1, ic: '✦', t: t('nav.skills'),  k: 'skills kakayahan stack',    a: function () { goTo('skills'); } },
      { g: G1, ic: '▤', t: t('nav.resume'),  k: 'resume cv view',            a: function () { goTo('resume'); } },
      { g: G1, ic: '✉', t: t('nav.contact'), k: 'contact makipag-usap form', a: function () { goTo('contact'); } },
      { g: G2, ic: '↓', t: t('pal.cv'),      k: 'cv resume download pdf', h: 'PDF', a: function () {
          var l = document.createElement('a'); l.href = 'assets/Curriculum_Vitae.pdf'; l.download = ''; l.click(); toast(t('toast.cv')); } },
      { g: G2, ic: '@', t: t('pal.mail'),    k: 'email mail send',      h: EMAIL, a: function () { location.href = 'mailto:' + EMAIL; } },
      { g: G2, ic: '⧉', t: t('pal.copy'),    k: 'copy email clipboard', h: 'Copy', a: function () { copyText(EMAIL); } },
      { g: G2, ic: '↗', t: 'GitHub',          k: 'github code repo',     a: function () { window.open('https://github.com/', '_blank', 'noopener'); } },
      { g: G2, ic: '↗', t: 'LinkedIn',        k: 'linkedin network',     a: function () { window.open('https://linkedin.com/', '_blank', 'noopener'); } },
      { g: G3, ic: 'A', t: t('pal.lang'),    k: 'language wika english filipino tagalog translate', h: lang.toUpperCase(), a: openGate }
    ];
  }
  var commands = buildCommands();
  var shown = [], sel = 0, lastFocus = null;

  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (id === 'hero') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else window.scrollTo({ top: el.offsetTop - 10, behavior: reduce ? 'auto' : 'smooth' });
  }
  function copyText(txt) {
    var done = function () { toast(t('toast.copied') + txt); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
    else done();
  }

  function renderPalette(q) {
    q = (q || '').trim().toLowerCase();
    commands = buildCommands();
    shown = commands.filter(function (c) { return !q || (c.t + ' ' + c.k).toLowerCase().indexOf(q) > -1; });
    sel = 0;
    palList.innerHTML = '';
    if (!shown.length) { palList.innerHTML = '<li class="palette__empty">' + t('pal.none') + ' “' + q.replace(/[<>&]/g, '') + '”</li>'; return; }
    var lastG = '';
    shown.forEach(function (c, i) {
      if (c.g !== lastG) { var g = document.createElement('li'); g.className = 'palette__group'; g.textContent = c.g; palList.appendChild(g); lastG = c.g; }
      var li = document.createElement('li');
      li.className = 'palette__opt'; li.setAttribute('role', 'option'); li.dataset.i = i;
      li.innerHTML = '<span class="ic"></span><span class="tt"></span><small></small>';
      li.children[0].textContent = c.ic; li.children[1].textContent = c.t; li.children[2].textContent = c.h || '';
      li.addEventListener('pointermove', function () { select(i, false); });
      li.addEventListener('click', function () { run(i); });
      palList.appendChild(li);
    });
    select(0, false);
  }
  function select(i, scroll) {
    sel = (i + shown.length) % shown.length;
    $$('.palette__opt', palList).forEach(function (el) {
      var on = +el.dataset.i === sel; el.classList.toggle('is-sel', on);
      if (on && scroll) el.scrollIntoView({ block: 'nearest' });
    });
  }
  function run(i) { var c = shown[i]; closePalette(); if (c) setTimeout(c.a, 120); }
  function openPalette() {
    lastFocus = document.activeElement;
    pal.hidden = false; palInput.value = ''; renderPalette('');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { palInput.focus(); }, 30);
  }
  function closePalette() {
    pal.hidden = true; document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  $('#openPalette').addEventListener('click', openPalette);
  pal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closePalette(); });
  palInput.addEventListener('input', function () { renderPalette(palInput.value); });
  document.addEventListener('keydown', function (e) {
    if (!gate.classList.contains('is-out')) {            // language gate owns the keyboard while open
      if (e.key === 'Escape') closeGate(lang);
      return;
    }
    var typing = /input|textarea/i.test((e.target.tagName || ''));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); return; }
    if (e.key === '/' && !typing && pal.hidden) { e.preventDefault(); openPalette(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') closePalette();
    else if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1, true); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown.length) run(sel); }
    else if (e.key === 'Tab') { e.preventDefault(); palInput.focus(); }
  });

  // dock links: smooth scroll through the same helper
  items.forEach(function (it) {
    it.addEventListener('click', function (e) { e.preventDefault(); goTo(it.dataset.section); });
  });
  $$('a[href^="#"]').forEach(function (a) {
    if (a.classList.contains('dock__item')) return;
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      if (document.getElementById(id)) { e.preventDefault(); goTo(id); }
    });
  });

  /* ==========================================================
     CONTACT FORM — frontend validation → mailto
     ========================================================== */
  var form = $('#contactForm');
  var rules = {
    name:    function (v) { return v.trim().length >= 2 ? '' : t('v.name'); },
    email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : t('v.email'); },
    message: function (v) { return v.trim().length >= 10 ? '' : t('v.msg'); }
  };
  function check(input) {
    var msg = rules[input.name](input.value), f = input.closest('.field');
    f.classList.toggle('is-bad', !!msg);
    $('.err', f).textContent = msg;
    return !msg;
  }
  $$('input, textarea', form).forEach(function (inp) {
    inp.addEventListener('blur', function () { check(inp); });
    inp.addEventListener('input', function () { if (inp.closest('.field').classList.contains('is-bad')) check(inp); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fields = $$('input, textarea', form);
    var ok = fields.map(check).every(Boolean);
    if (!ok) { var bad = $('.is-bad input, .is-bad textarea', form); if (bad) bad.focus(); return; }
    var d = {}; fields.forEach(function (f) { d[f.name] = f.value.trim(); });
    var subject = 'Portfolio inquiry from ' + d.name;
    var body = d.message + '\n\n— ' + d.name + ' (' + d.email + ')';
    location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    toast(t('toast.mail'));
    form.reset();
  });
})();
