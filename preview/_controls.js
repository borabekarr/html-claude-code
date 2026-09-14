/* =========================================================================
   Deha Design System — shared control behaviour
   Auto-initialises every .seg (sliding pill) and .sw-base (toggle) on the page.
   Idempotent + safe to load alongside component-specific scripts.

   • Segmented: positions the .seg-pill under the active button and slides it
     on click. If the host script owns selection, mark the .seg with
     data-seg-managed and this only repositions the pill (after your handler).
   • Toggle: clicking a .sw-base flips .sw-on / .sw-off.
   ========================================================================= */
(function () {
  function initSeg(seg) {
    if (seg.__segInit) return;
    seg.__segInit = true;

    var pill = seg.querySelector('.seg-pill');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'seg-pill';
      seg.insertBefore(pill, seg.firstChild);
    }
    function move() {
      var a = seg.querySelector('button.active');
      if (a) { pill.style.left = a.offsetLeft + 'px'; pill.style.width = a.offsetWidth + 'px'; }
    }
    // initial placement without animating in
    pill.style.transition = 'none';
    move();
    setTimeout(function () { pill.style.transition = ''; move(); }, 60);
    window.addEventListener('resize', move);

    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !seg.contains(btn)) return;
      if (!seg.hasAttribute('data-seg-managed')) {
        seg.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        move();
      } else {
        // host handler sets .active — reposition after it runs
        setTimeout(move, 0);
      }
    });

    seg.__segMove = move; // expose for host scripts that re-render
  }

  function initSw(sw) {
    if (sw.__swInit) return;
    sw.__swInit = true;
    sw.addEventListener('click', function () {
      var on = sw.classList.toggle('sw-on');
      sw.classList.toggle('sw-off', !on);
    });
  }

  function initAll() {
    document.querySelectorAll('.seg').forEach(initSeg);
    document.querySelectorAll('.sw-base').forEach(initSw);
  }

  if (document.readyState !== 'loading') initAll();
  else document.addEventListener('DOMContentLoaded', initAll);

  // expose for dynamically added controls
  window.DehaControls = { initSeg: initSeg, initSw: initSw, initAll: initAll };
})();
