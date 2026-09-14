/* _controls.jsx — browser-JSX port of
 * apps/web/src/components/design-system/controls/Controls.tsx
 * (+ inlined controls-hook.ts). Refreshed 2026-09-01 from today's canonical
 * .tsx (ax-jeru-push Step 4).
 */
(() => {
  const { useCallback, useRef } = React;

  /* ================= proximity-hover engine (inlined, same as _buttons.jsx).
   * Canon numbers preserved exactly: dy*3, radius 80. ================= */

  const proximityGroups = new Map();
  let proxPointerX = 0;
  let proxPointerY = 0;
  let proxRaf = null;
  let proxAttached = false;
  const PROX_RADIUS = 80;
  const PROX_SELECTOR = '[data-proximity]';
  const PROX_EPSILON = 0.005;

  function proxModalityOk() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function proxZero(state) {
    state.children.forEach((el, i) => {
      if (state.prev[i] > 0) {
        el.style.removeProperty('--prox');
        state.prev[i] = 0;
      }
    });
  }

  function proxMeasure(state) {
    const els = Array.from(state.container.querySelectorAll(state.selector));
    const prevByEl = new Map(state.children.map((el, i) => [el, state.prev[i] || 0]));
    state.children = els;
    state.rects = els.map((el) => el.getBoundingClientRect());
    state.prev = els.map((el) => prevByEl.get(el) || 0);
    state.dirty = false;
    if (!state.rects.length) {
      state.box = null;
      return;
    }
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    state.rects.forEach((r) => {
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
    state.box = { left: left - state.radius, top: top - state.radius, right: right + state.radius, bottom: bottom + state.radius };
  }

  function proxProcess(state) {
    if (state.dirty) proxMeasure(state);
    const box = state.box;
    if (!box || !state.rects.length) return;
    if (proxPointerX < box.left || proxPointerX > box.right || proxPointerY < box.top || proxPointerY > box.bottom) {
      proxZero(state);
      return;
    }
    state.children.forEach((el, i) => {
      const rect = state.rects[i];
      const dx = Math.max(0, rect.left - proxPointerX, proxPointerX - rect.right);
      const dy = Math.max(0, rect.top - proxPointerY, proxPointerY - rect.bottom);
      const dist = Math.hypot(dx, dy * 3);
      const raw = Math.max(0, 1 - dist / state.radius);
      const t = raw * raw * (3 - 2 * raw);
      if (Math.abs(t - state.prev[i]) > PROX_EPSILON) {
        if (t <= 0) el.style.removeProperty('--prox');
        else el.style.setProperty('--prox', t.toFixed(4));
        state.prev[i] = t;
      }
    });
  }

  function proxFrame() {
    proxRaf = null;
    proximityGroups.forEach(proxProcess);
  }
  function proxSchedule() {
    if (proxRaf !== null || !proxAttached) return;
    proxRaf = requestAnimationFrame(proxFrame);
  }
  function proxOnMove(e) {
    proxPointerX = e.clientX;
    proxPointerY = e.clientY;
    proxSchedule();
  }
  function proxOnLeave() {
    proximityGroups.forEach(proxZero);
  }
  function proxInvalidateAll() {
    proximityGroups.forEach((s) => { s.dirty = true; });
    proxSchedule();
  }
  function proxAttach() {
    if (proxAttached || typeof document === 'undefined') return;
    proxAttached = true;
    document.addEventListener('pointermove', proxOnMove, { passive: true });
    document.addEventListener('scroll', proxInvalidateAll, { passive: true, capture: true });
    window.addEventListener('resize', proxInvalidateAll, { passive: true });
    document.documentElement.addEventListener('pointerleave', proxOnLeave, { passive: true });
  }

  function registerProximityGroup(container, opts) {
    opts = opts || {};
    const state = {
      container,
      radius: opts.radius || PROX_RADIUS,
      selector: opts.selector || PROX_SELECTOR,
      children: [],
      rects: [],
      prev: [],
      box: null,
      dirty: true,
    };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => { state.dirty = true; proxSchedule(); });
      ro.observe(container);
    }
    proximityGroups.set(container, state);
    if (proxModalityOk()) {
      proxAttach();
      proxSchedule();
    }
    return function unregisterProximityGroup() {
      ro?.disconnect();
      proxZero(state);
      proximityGroups.delete(container);
    };
  }

  function useProximityGroup() {
    const stateRef = useRef({ cleanup: null });
    return useCallback((el) => {
      stateRef.current.cleanup?.();
      stateRef.current.cleanup = null;
      if (el != null) stateRef.current.cleanup = registerProximityGroup(el);
    }, []);
  }

  /* ================= controls-hook.ts (inlined) ================= */

  function segRef(el) {
    if (!el) return;

    const pill = el.querySelector('.seg-pill');
    if (!pill) return;

    function reposition(animate) {
      const active = el.querySelector('button.active');
      if (!active) return;
      if (!animate) pill.style.transition = 'none';
      pill.style.left = active.offsetLeft + 'px';
      pill.style.width = active.offsetWidth + 'px';
      if (!animate) {
        void pill.offsetWidth;
        pill.style.transition = '';
      }
    }

    reposition(false);
    const resumeTimer = setTimeout(() => reposition(false), 60);

    function onResize() { reposition(false); }
    window.addEventListener('resize', onResize);

    function onClick(e) {
      const btn = e.target.closest('button');
      if (!btn || !el.contains(btn)) return;
      el.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      reposition(true);
    }
    el.addEventListener('click', onClick);

    el.__segCleanup = () => {
      clearTimeout(resumeTimer);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('click', onClick);
    };
  }

  function cleanupSeg(el) {
    if (!el) return;
    el.__segCleanup?.();
    delete el.__segCleanup;
  }

  function swRef(el) {
    if (!el) return;

    function onClick() {
      el.classList.add('sw-armed');
      const isOn = el.classList.toggle('sw-on');
      el.classList.toggle('sw-off', !isOn);
    }
    el.addEventListener('click', onClick);

    el.__swCleanup = () => {
      el.removeEventListener('click', onClick);
    };
  }

  function cleanupSw(el) {
    if (!el) return;
    el.__swCleanup?.();
    delete el.__swCleanup;
  }

  function sliderRef(el) {
    if (!el) return;

    const fill = el.querySelector('.fill');
    const thumb = el.querySelector('.thumb');
    if (!fill || !thumb) return;

    let pressed = false;

    function setFromClientX(clientX) {
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const pctStr = (pct * 100).toFixed(1) + '%';
      fill.style.width = pctStr;
      thumb.style.left = pctStr;
    }

    function onDown(e) {
      pressed = true;
      el.classList.add('dragging');
      el.setPointerCapture(e.pointerId);
      setFromClientX(e.clientX);
    }
    function onMove(e) {
      if (!pressed) return;
      setFromClientX(e.clientX);
    }
    function onUp(e) {
      if (!pressed) return;
      pressed = false;
      el.classList.remove('dragging');
      try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    el.__sliderCleanup = () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }

  function cleanupSlider(el) {
    if (!el) return;
    el.__sliderCleanup?.();
    delete el.__sliderCleanup;
  }

  /* ================= Controls page ================= */

  function Controls() {
    const toggleRowRef = useProximityGroup();
    const segRowRef = useProximityGroup();
    const sliderRowRef = useProximityGroup();

    // React 18 (this harness) calls callback refs with `null` on unmount instead
    // of invoking a returned cleanup function (React-19-only). Cleanup is
    // therefore stashed on the element itself and run in the null branch, with
    // a plain ref tracking the previously mounted element. Precedent:
    // _buttons.jsx:121-131.
    const segElRef = useRef(null);
    const segCb = useCallback((el) => {
      if (el) {
        segElRef.current = el;
        segRef(el);
      } else {
        cleanupSeg(segElRef.current);
        segElRef.current = null;
      }
    }, []);

    const swElRef = useRef(null);
    const swCb = useCallback((el) => {
      if (el) {
        swElRef.current = el;
        swRef(el);
      } else {
        cleanupSw(swElRef.current);
        swElRef.current = null;
      }
    }, []);

    const sliderElRef = useRef(null);
    const sliderCb = useCallback((el) => {
      if (el) {
        sliderElRef.current = el;
        sliderRef(el);
      } else {
        cleanupSlider(sliderElRef.current);
        sliderElRef.current = null;
      }
    }, []);

    return (
      <div className="card">
        {/* Toggle row */}
        <div className="row" ref={toggleRowRef}>
          <div className="title">
            Toggle
            <div className="meta">switch</div>
          </div>
          <div className="sw-base sw-off" data-proximity ref={swCb} />
        </div>

        {/* Segmented row */}
        <div className="row" ref={segRowRef}>
          <div className="title">
            Segmented
            <div className="meta">radio (1 of n)</div>
          </div>
          <div className="seg" ref={segCb}>
            <span className="seg-pill" />
            <button type="button" className="active" data-proximity>Leads</button>
            <button type="button" data-proximity>Qualified</button>
          </div>
        </div>

        {/* Slider row */}
        <div className="row" ref={sliderRowRef}>
          <div className="title">
            Slider
            <div className="meta">range input</div>
          </div>
          <div className="slider" ref={sliderCb}>
            <div className="fill" />
            <div className="thumb" data-proximity />
          </div>
        </div>
      </div>
    );
  }

  window.Controls = Controls;
})();
