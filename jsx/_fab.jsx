/* _fab.jsx — browser-JSX port of
 * apps/web/src/components/design-system/fab/Fab.tsx (+ inlined fab-hook.ts).
 * Refreshed 2026-09-01 from today's canonical .tsx (ax-jeru-push Step 4).
 */
(() => {
  const { useState, useRef, useCallback } = React;

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

  /* ================= fab-hook.ts (inlined) — Escape-key listener. ================= */

  function fabScreenRef(el, toggle) {
    if (!el) return;

    function onKeyDown(e) {
      if (e.key === 'Escape') toggle(false);
    }

    document.addEventListener('keydown', onKeyDown);

    el.__fabCleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }

  function cleanupFabScreen(el) {
    if (!el) return;
    el.__fabCleanup?.();
    delete el.__fabCleanup;
  }

  function Fab() {
    const [open, setOpen] = useState(false);
    const fabGroupRef = useProximityGroup();

    function toggle(value) {
      setOpen(value);
    }

    function onFabClick() {
      if (!open) toggle(true);
    }

    function onPickItem(e) {
      e.stopPropagation();
      toggle(false);
    }

    // React 18 (this harness) calls callback refs with `null` on unmount instead
    // of invoking a returned cleanup function (React-19-only). Cleanup is
    // stashed on the element and run in the null branch, with a plain ref
    // tracking the previously mounted element. Precedent: _buttons.jsx:121-131.
    const screenElRef = useRef(null);
    const screenCb = useCallback((el) => {
      if (el) {
        screenElRef.current = el;
        fabScreenRef(el, toggle);
        fabGroupRef(el);
      } else {
        cleanupFabScreen(screenElRef.current);
        screenElRef.current = null;
        fabGroupRef(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="card" style={{ padding: 0, background: '#FAFAFA' }}>
        <div className="frame">
          <div>
            <div className="shell">
              <div
                className={`fab-screen${open ? ' open' : ''}`}
                ref={screenCb}
              >

                {/* Backdrop content */}
                <div className="sc-content">
                  <div className="sc-top">
                    <div>
                      <div className="sc-greet">Good afternoon</div>
                      <div className="sc-name">Riley Chen</div>
                    </div>
                    <div className="sc-avatar">RC</div>
                  </div>
                  <div className="sc-hero">
                    <div className="sc-hero-label">Pipeline value</div>
                    <div className="sc-hero-row">
                      <div className="sc-hero-num">$1.24M</div>
                      <span className="sc-hero-pill">
                        <span className="material-icons">trending_up</span>12%
                      </span>
                    </div>
                  </div>
                  <div className="sc-sec">Recent activity</div>
                  <div className="sc-list">
                    <div className="sc-item">
                      <div className="sc-ic">AM</div>
                      <div>
                        <div className="sc-it-name">Acme Manufacturing</div>
                        <div className="sc-it-meta">Proposal sent · 2h ago</div>
                      </div>
                      <div className="sc-it-amt">$84K</div>
                    </div>
                    <div className="sc-item">
                      <div className="sc-ic">NW</div>
                      <div>
                        <div className="sc-it-name">Northwind Co.</div>
                        <div className="sc-it-meta">Call logged · 5h ago</div>
                      </div>
                      <div className="sc-it-amt">$32K</div>
                    </div>
                    <div className="sc-item">
                      <div className="sc-ic">VL</div>
                      <div>
                        <div className="sc-it-name">Vertex Labs</div>
                        <div className="sc-it-meta">New lead · Yesterday</div>
                      </div>
                      <div className="sc-it-amt">$19K</div>
                    </div>
                  </div>
                </div>

                {/* Blur veil (click to close) — decorative scrim, Escape handles dismissal (fabScreenRef) */}
                <div className="fab-veil" onClick={() => toggle(false)} />

                {/* Morphing FAB */}
                <div className="fab" onClick={onFabClick}>
                  <button
                    type="button"
                    className="fab-plus"
                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}
                    tabIndex={open ? -1 : 0}
                    aria-expanded={open}
                    aria-label="Quick create"
                    onKeyDown={(e) => {
                      if (!open && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onFabClick();
                      }
                    }}
                  >
                    <span className="material-icons">add</span>
                  </button>

                  <div className="fab-menu">

                    {/* Header row: title + close aligned together, no dead space */}
                    <div className="fab-menu-hd">
                      <div className="fab-head">
                        <div className="fab-head-title">
                          <span className="material-symbols-outlined fab-head-icon">add_circle</span>
                          Quick create
                        </div>
                        <div className="fab-head-sub">Add something to your workspace</div>
                      </div>
                      <button
                        type="button"
                        className="fab-close"
                        data-proximity
                        onClick={(e) => { e.stopPropagation(); toggle(false); }}
                        aria-label="Close"
                      >
                        <span className="material-icons">close</span>
                      </button>
                    </div>

                    <div className="fab-menu-sep" />

                    {/* New lead — emerald */}
                    <div
                      className="fab-item" data-proximity
                      role="menuitem"
                      tabIndex={0}
                      style={{ '--ic-bg': '#10B981' }}
                      onClick={(e) => onPickItem(e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPickItem(e);
                        }
                      }}
                    >
                      <div className="fab-item-ic">
                        <span className="material-symbols-outlined">person_add</span>
                      </div>
                      <div className="fab-item-tx">
                        <div className="fab-item-title">New lead</div>
                        <div className="fab-item-sub">Capture a contact and start a pipeline.</div>
                      </div>
                      <span className="material-symbols-outlined chev">chevron_right</span>
                    </div>

                    {/* Log activity — blue */}
                    <div
                      className="fab-item" data-proximity
                      role="menuitem"
                      tabIndex={0}
                      style={{ '--ic-bg': '#3B82F6' }}
                      onClick={(e) => onPickItem(e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPickItem(e);
                        }
                      }}
                    >
                      <div className="fab-item-ic">
                        <span className="material-symbols-outlined">bolt</span>
                      </div>
                      <div className="fab-item-tx">
                        <div className="fab-item-title">Log activity</div>
                        <div className="fab-item-sub">Record a call, email, or meeting note.</div>
                      </div>
                      <span className="material-symbols-outlined chev">chevron_right</span>
                    </div>

                    {/* Create task — violet */}
                    <div
                      className="fab-item" data-proximity
                      role="menuitem"
                      tabIndex={0}
                      style={{ '--ic-bg': '#8B5CF6' }}
                      onClick={(e) => onPickItem(e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPickItem(e);
                        }
                      }}
                    >
                      <div className="fab-item-ic">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div className="fab-item-tx">
                        <div className="fab-item-title">Create task</div>
                        <div className="fab-item-sub">Add a follow-up with an owner and due date.</div>
                      </div>
                      <span className="material-symbols-outlined chev">chevron_right</span>
                    </div>

                    {/* New deal — orange */}
                    <div
                      className="fab-item" data-proximity
                      role="menuitem"
                      tabIndex={0}
                      style={{ '--ic-bg': '#F97316' }}
                      onClick={(e) => onPickItem(e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onPickItem(e);
                        }
                      }}
                    >
                      <div className="fab-item-ic">
                        <span className="material-symbols-outlined">handshake</span>
                      </div>
                      <div className="fab-item-tx">
                        <div className="fab-item-title">New deal</div>
                        <div className="fab-item-sub">Open an opportunity in your pipeline.</div>
                      </div>
                      <span className="material-symbols-outlined chev">chevron_right</span>
                    </div>

                  </div>{/* /.fab-menu */}
                </div>{/* /.fab */}

              </div>{/* /.fab-screen */}
            </div>{/* /.shell */}
            <div className="hint">Tap the <b>+</b> button · Esc to close</div>
          </div>
        </div>
      </div>
    );
  }

  window.Fab = Fab;
})();
