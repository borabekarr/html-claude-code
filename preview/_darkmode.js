/* =========================================================================
   Deha preview — dark mode toggle
   Injects a fixed pill button (top-right) that toggles the `dark` class on
   <html> and remembers the choice in localStorage. Self-contained: no
   markup or per-file CSS required beyond linking _darkmode.css.
   ========================================================================= */
(function () {
  var KEY = 'deha-preview-theme';
  var root = document.documentElement;

  /* Apply persisted choice ASAP (class already may be set; keep in sync) */
  try {
    if (localStorage.getItem(KEY) === 'dark') root.classList.add('dark');
  } catch (e) {}

  var SUN =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/></svg>';

  function injectStyle() {
    if (document.getElementById('dm-toggle-style')) return;
    var s = document.createElement('style');
    s.id = 'dm-toggle-style';
    s.textContent =
      '#dm-toggle{position:fixed;top:14px;right:14px;z-index:99999;' +
      'display:inline-flex;align-items:center;gap:7px;' +
      'font-family:"Montserrat",system-ui,sans-serif;font-size:12px;font-weight:800;' +
      'letter-spacing:0.01em;padding:8px 13px;border-radius:9999px;cursor:pointer;' +
      'color:#334155;background:rgba(255,255,255,0.92);border:1px solid #E2E8F0;' +
      '-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);' +
      'box-shadow:0 4px 14px rgba(15,23,42,0.12),inset 0 1px 0 rgba(255,255,255,0.9);' +
      'transition:background 160ms,color 160ms,border-color 160ms,transform 120ms cubic-bezier(.22,1,.36,1);}' +
      '#dm-toggle:hover{transform:translateY(-1px);}' +
      '#dm-toggle:active{transform:scale(0.96);}' +
      '#dm-toggle svg{display:block;}' +
      '#dm-toggle .dm-sun{display:none;}' +
      '#dm-toggle .dm-moon{display:block;}' +
      'html.dark #dm-toggle{color:#E2E8F0;background:rgba(30,41,59,0.92);border-color:#334155;' +
      'box-shadow:0 4px 14px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.08);}' +
      'html.dark #dm-toggle .dm-sun{display:block;}' +
      'html.dark #dm-toggle .dm-moon{display:none;}';
    document.head.appendChild(s);
  }

  function build() {
    injectStyle();
    if (document.getElementById('dm-toggle')) return;
    var btn = document.createElement('button');
    btn.id = 'dm-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.innerHTML =
      '<span class="dm-sun">' + SUN + '</span>' +
      '<span class="dm-moon">' + MOON + '</span>' +
      '<span class="dm-label"></span>';
    var label = btn.querySelector('.dm-label');
    function refresh() {
      label.textContent = root.classList.contains('dark') ? 'Light' : 'Dark';
    }
    refresh();
    btn.addEventListener('click', function () {
      var on = !root.classList.contains('dark');
      root.classList.toggle('dark', on);
      try { localStorage.setItem(KEY, on ? 'dark' : 'light'); } catch (e) {}
      refresh();
    });
    document.body.appendChild(btn);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
