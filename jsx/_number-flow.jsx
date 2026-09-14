/* _number-flow.jsx — browser-JSX port of
 * apps/web/src/components/design-system/number-flow/NumberFlowDemo.tsx.
 * NEW port (ax-jeru-push Step 6): Finished, never previously in the mirror.
 *
 * The canonical .tsx wraps the @number-flow/react npm package. Per the
 * ax-jeru-push Step 6 gate, that package is never loaded via unpkg here —
 * instead DsNumberFlow below reproduces its count-up visual with a plain
 * requestAnimationFrame tween over Intl.NumberFormat-formatted text, gated
 * by prefers-reduced-motion.
 */
(function () {
  const { useState, useRef, useCallback, useEffect } = React;

  /* ================= proximity-hover engine (inlined, same as _fab.jsx).
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
      if (state.prev[i] > 0) { el.style.removeProperty('--prox'); state.prev[i] = 0; }
    });
  }
  function proxMeasure(state) {
    const els = Array.from(state.container.querySelectorAll(state.selector));
    const prevByEl = new Map(state.children.map((el, i) => [el, state.prev[i] || 0]));
    state.children = els;
    state.rects = els.map((el) => el.getBoundingClientRect());
    state.prev = els.map((el) => prevByEl.get(el) || 0);
    state.dirty = false;
    if (!state.rects.length) { state.box = null; return; }
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    state.rects.forEach((r) => {
      left = Math.min(left, r.left); top = Math.min(top, r.top);
      right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
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
  function proxFrame() { proxRaf = null; proximityGroups.forEach(proxProcess); }
  function proxSchedule() { if (proxRaf !== null || !proxAttached) return; proxRaf = requestAnimationFrame(proxFrame); }
  function proxOnMove(e) { proxPointerX = e.clientX; proxPointerY = e.clientY; proxSchedule(); }
  function proxOnLeave() { proximityGroups.forEach(proxZero); }
  function proxInvalidateAll() { proximityGroups.forEach((s) => { s.dirty = true; }); proxSchedule(); }
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
    const state = { container, radius: opts.radius || PROX_RADIUS, selector: opts.selector || PROX_SELECTOR, children: [], rects: [], prev: [], box: null, dirty: true };
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => { state.dirty = true; proxSchedule(); });
      ro.observe(container);
    }
    proximityGroups.set(container, state);
    if (proxModalityOk()) { proxAttach(); proxSchedule(); }
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

  /* ================= number-flow reproduction (plain JS tween). =================
   * requestAnimationFrame lerp of the underlying numeric value, formatted each
   * frame via Intl.NumberFormat so digits/currency symbols/separators track the
   * live number, snapping to the exact target on the final frame. */

  const NF_DURATION = 640;

  function nfEaseOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function DsNumberFlow({ value, format, prefix, suffix, className = '' }) {
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);
    const rafRef = useRef(null);

    useEffect(() => {
      const from = prevRef.current;
      const to = value;
      if (from === to) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        prevRef.current = to;
        setDisplay(to);
        return;
      }
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / NF_DURATION);
        const eased = nfEaseOut(t);
        setDisplay(from + (to - from) * eased);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(frame);
        } else {
          prevRef.current = to;
        }
      }
      rafRef.current = requestAnimationFrame(frame);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [value]);

    const formatted = new Intl.NumberFormat(undefined, format).format(display);
    return (
      <span className={`nf-value ${className}`.trim()}>
        {prefix}{formatted}{suffix}
      </span>
    );
  }

  // ---------------------------------------------------------------------------
  // Demo data
  // ---------------------------------------------------------------------------

  const INITIAL_STATE = { balance: 84213.4, saved: 12480, growth: 0.184 };

  const CURRENCY_FORMAT = { style: 'currency', currency: 'USD', trailingZeroDisplay: 'stripIfInteger' };
  const COMPACT_FORMAT = { notation: 'compact', maximumFractionDigits: 1 };
  const PERCENT_FORMAT = { style: 'percent', maximumFractionDigits: 1 };

  function randomState() {
    return {
      balance: Math.round((Math.random() * 90000 + 8000) * 100) / 100,
      saved: Math.round(Math.random() * 20000),
      growth: Math.round(Math.random() * 400) / 1000,
    };
  }

  function NumberFlowDemo() {
    const [state, setState] = useState(INITIAL_STATE);
    const cardRef = useProximityGroup();

    const handleShuffle = useCallback(() => {
      setState(randomState());
    }, []);

    return (
      <div className="nf-frame">
        <div className="shell nf-shell">
          <div className="nf-card" data-screen-label="Number flow" ref={cardRef}>
            <div className="nf-eyebrow">
              <span className="material-symbols-outlined">bolt</span>
              Number Flow
            </div>

            <div className="nf-hero">
              <DsNumberFlow value={state.balance} format={CURRENCY_FORMAT} className="nf-hero-value" />
              <div className="nf-hero-label">Total balance</div>
            </div>

            <div className="nf-stats">
              <div className="nf-stat">
                <DsNumberFlow value={state.saved} format={COMPACT_FORMAT} prefix="$" className="nf-stat-value" />
                <div className="nf-stat-label">Saved this year</div>
              </div>
              <div className="nf-stat">
                <DsNumberFlow value={state.growth} format={PERCENT_FORMAT} className="nf-stat-value" />
                <div className="nf-stat-label">Growth</div>
              </div>
            </div>

            <button type="button" className="nf-shuffle" data-proximity onClick={handleShuffle}>
              <span className="material-symbols-outlined">shuffle</span>
              Shuffle
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.NumberFlowDemo = NumberFlowDemo;
})();
