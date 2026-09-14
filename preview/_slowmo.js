/* =========================================================================
   Deha preview — global "Slow-mo" diagnostic toggle
   Injects a fixed pill (top-left) that scales the playback rate of EVERY
   running CSS animation & transition (and any Web-Animations) so you can
   inspect motion frame by frame. Cycles Off → 4× → 10× → 25× slower.

   Mechanism: a rAF loop continuously sets `playbackRate` on every object
   returned by document.getAnimations(), which in modern browsers includes
   CSSAnimation and CSSTransition — so it catches motion that starts AFTER
   you flip the switch (hovers, clicks, re-renders) too. Relative timing,
   delays and staggers are preserved (unlike a blanket duration override).
   Note: motion driven by JS timers (setTimeout/-Interval tweens) is not
   affected — only real CSS/WAAPI animation is retimed.

   Self-contained: link this file, nothing else required. Persists choice
   in localStorage. Lives happily alongside _darkmode.js & System-B toggles.
   ========================================================================= */
(function () {
  if (window.__dehaSlowmo) return;          // guard against double-load
  window.__dehaSlowmo = true;

  var KEY = 'deha-preview-slowmo';
  var STATES = [
    { mult: 1,  label: 'Slow-mo' },
    { mult: 4,  label: '4\u00D7 slower' },
    { mult: 10, label: '10\u00D7 slower' },
    { mult: 25, label: '25\u00D7 slower' }
  ];

  var idx = 0;
  try {
    var saved = parseInt(localStorage.getItem(KEY), 10);
    if (saved > 0 && saved < STATES.length) idx = saved;
  } catch (e) {}

  var raf = null;

  function rate() { return 1 / STATES[idx].mult; }

  function tick() {
    var r = rate();
    if (document.getAnimations) {
      var a = document.getAnimations();
      for (var i = 0; i < a.length; i++) {
        try { if (a[i].playbackRate !== r) a[i].playbackRate = r; } catch (e) {}
      }
    }
    raf = requestAnimationFrame(tick);
  }

  function start() { if (!raf) raf = requestAnimationFrame(tick); }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (document.getAnimations) {                 // restore real-time speed
      var a = document.getAnimations();
      for (var i = 0; i < a.length; i++) {
        try { a[i].playbackRate = 1; } catch (e) {}
      }
    }
  }

  function engine() { if (idx > 0) start(); else stop(); }

  /* ── glyph: a simple clock (circle + two hands) = "timing" ───────────── */
  var CLOCK =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>';

  function injectStyle() {
    if (document.getElementById('sm-toggle-style')) return;
    var s = document.createElement('style');
    s.id = 'sm-toggle-style';
    s.textContent =
      '#sm-toggle{position:fixed;top:14px;left:14px;z-index:99999;' +
      'display:inline-flex;align-items:center;gap:7px;' +
      'font-family:"Montserrat",system-ui,sans-serif;font-size:12px;font-weight:800;' +
      'letter-spacing:0.01em;padding:8px 13px;border-radius:9999px;cursor:pointer;' +
      'color:#334155;background:rgba(255,255,255,0.92);border:1px solid #E2E8F0;' +
      '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
      'box-shadow:0 4px 14px rgba(15,23,42,0.12),inset 0 1px 0 rgba(255,255,255,0.9);' +
      'transition:background 160ms,color 160ms,border-color 160ms,transform 120ms cubic-bezier(.22,1,.36,1);}' +
      '#sm-toggle:hover{transform:translateY(-1px);}' +
      '#sm-toggle:active{transform:scale(0.96);}' +
      '#sm-toggle svg{display:block;}' +
      /* engaged → emerald with the signature 7px grid texture */
      '#sm-toggle.on{color:#FFFFFF;background-color:#10B981;border-color:#0F9A6E;' +
      'background-image:linear-gradient(rgba(255,255,255,0.13) 1px,transparent 1px),' +
      'linear-gradient(90deg,rgba(255,255,255,0.13) 1px,transparent 1px);' +
      'background-size:7px 7px;' +
      'box-shadow:0 4px 14px rgba(16,185,129,0.35),inset 0 1px 0 rgba(255,255,255,0.42),inset 0 -2px 0 rgba(15,23,42,0.14);}' +
      'html.dark #sm-toggle{color:#E2E8F0;background:rgba(30,41,59,0.92);border-color:#334155;' +
      'box-shadow:0 4px 14px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.08);}' +
      'html.dark #sm-toggle.on,[data-theme="dark"] #sm-toggle.on{color:#FFFFFF;background-color:#10B981;border-color:#0F9A6E;}' +
      '[data-theme="dark"] #sm-toggle{color:#E2E8F0;background:rgba(30,41,59,0.92);border-color:#334155;' +
      'box-shadow:0 4px 14px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.08);}';
    document.head.appendChild(s);
  }

  function build() {
    injectStyle();
    if (document.getElementById('sm-toggle')) return;
    var btn = document.createElement('button');
    btn.id = 'sm-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Cycle animation slow-mo for diagnostics');
    btn.innerHTML = CLOCK + '<span class="sm-label"></span>';
    var label = btn.querySelector('.sm-label');

    function refresh() {
      label.textContent = STATES[idx].label;
      btn.classList.toggle('on', idx > 0);
      btn.title = idx > 0
        ? 'Animations slowed ' + STATES[idx].mult + '\u00D7 — click to change'
        : 'Slow-mo off — click to slow animations down';
    }

    refresh();
    engine();

    btn.addEventListener('click', function () {
      idx = (idx + 1) % STATES.length;
      try { localStorage.setItem(KEY, String(idx)); } catch (e) {}
      refresh();
      engine();
    });

    document.body.appendChild(btn);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
