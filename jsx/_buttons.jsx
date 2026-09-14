/* _buttons.jsx — browser-JSX port of
 * apps/web/src/components/design-system/buttons/Buttons.tsx
 * (+ inlined buttons-hook.ts, variants.ts, delete-button/DeleteButton.tsx).
 * Refreshed 2026-09-01 from today's canonical .tsx (ax-jeru-push Step 4).
 */
(() => {
  const { useState, useRef, useCallback, useEffect, useLayoutEffect, useReducer } = React;

  /* ================= proximity-hover engine (inlined from
   * src/lib/hooks/proximity-engine.ts + use-proximity-group.ts).
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

  /* ================= buttons-hook.ts (inlined) ================= */

  function btnRootRef(el) {
    if (!el) return;
    if (!el.__btnCleanup) el.__btnCleanup = () => {};
    if (!el.style.getPropertyValue('--btn-apply-rest-w')) {
      el.style.setProperty('--btn-apply-rest-w', `${el.getBoundingClientRect().width}px`);
    }
  }

  function cleanupBtnRoot(el) {
    if (!el) return;
    el.__btnCleanup?.();
    delete el.__btnCleanup;
  }

  function registerBtnTimer(el, onExpire, ms) {
    el?.__btnCleanup?.();
    const id = setTimeout(onExpire, ms);
    if (el) el.__btnCleanup = () => clearTimeout(id);
    return id;
  }

  function runApplyBtn(btn, setPhase) {
    if (!btn) return;
    if (btn.classList.contains('is-loading') || btn.classList.contains('is-done')) return;
    setPhase('loading');
    registerBtnTimer(btn, () => {
      setPhase('done');
      registerBtnTimer(btn, () => { setPhase('default'); }, 4500);
    }, 3000);
  }

  /* ================= variants.ts (inlined) ================= */

  const BUTTON_VARIANT_CLASS = {
    primary: 'btn-primary',
    inverse: 'btn-inverse',
    glass: 'btn-glass',
    text: 'btn-text',
    green: 'btn-green',
    yellow: 'btn-yellow',
    red: 'btn-red',
    task: 'btn-task',
    cta: 'btn-cta',
    discuss: 'btn-discuss',
    delete: 'btn-delete',
    apply: 'btn-apply',
  };

  /* ================= Button (importable specimen) ================= */

  function Button({ variant, variant2, className, children, ...rest }) {
    const cls = [BUTTON_VARIANT_CLASS[variant], variant2 ? BUTTON_VARIANT_CLASS[variant2] : '', className]
      .filter(Boolean)
      .join(' ');
    return (
      <button type="button" className={cls} data-proximity {...rest}>
        {children}
      </button>
    );
  }

  /* ================= ApplyButton ================= */

  function ApplyButton() {
    const [phase, setPhase] = useState('default');
    const phaseClass = phase === 'loading' ? ' is-loading' : phase === 'done' ? ' is-done' : '';

    return (
      <button
        type="button"
        className={`btn-green btn-apply${phaseClass}`}
        data-proximity
        ref={(el) => {
          btnRootRef(el);
          if (!el) cleanupBtnRoot(el);
        }}
        onClick={(e) => runApplyBtn(e.currentTarget, setPhase)}
      >
        <span className="btn-apply-label">
          <span className="material-symbols-outlined btn-apply-icon">check</span>
          Apply
        </span>
        <span className="btn-apply-spinner" aria-hidden="true">
          <svg className="btn-apply-spin-svg" viewBox="0 0 32 32" fill="none">
            <circle className="btn-apply-spin-track" cx="16" cy="16" r="11" />
            <circle className="btn-apply-spin-arc" cx="16" cy="16" r="11" />
          </svg>
        </span>
        <span className="btn-apply-check" aria-hidden="true">
          <span className="material-symbols-outlined btn-apply-check-ic">check</span>
        </span>
      </button>
    );
  }

  /* ================= delete-button/DeleteButton.tsx (inlined) =================
   * useEffect/useLayoutEffect ported verbatim: these are React-18-and-19-safe
   * (only callback-ref returned-cleanup is the React-19-only pattern that
   * needs the stash-cleanup-on-element rewrite; plain effect cleanup works
   * identically in both). No rewrite needed here.
   */

  function animMult() {
    if (typeof document === 'undefined') return 1;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--anim-mult');
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  const ROLL_MS = 410;
  const PHASE_IN_MS = 260;

  function Sym({ name, size = 20, wght = 600, fill = 0 }) {
    return (
      <span
        className="material-symbols-outlined"
        aria-hidden="true"
        style={{
          fontSize: size,
          lineHeight: 1,
          fontVariationSettings: `'opsz' 24, 'wght' ${wght}, 'FILL' ${fill}, 'GRAD' 0`,
        }}
      >
        {name}
      </span>
    );
  }

  function RollNum({ value }) {
    const prevRef = useRef(value);
    const [st, setSt] = useState({ from: value, to: value, rolling: false });

    useEffect(() => {
      const from = prevRef.current;
      if (from === value) return;
      prevRef.current = value;
      if (prefersReducedMotion()) {
        setSt({ from: value, to: value, rolling: false });
        return;
      }
      setSt({ from, to: value, rolling: true });
      const id = setTimeout(() => setSt({ from: value, to: value, rolling: false }), ROLL_MS * animMult());
      return () => clearTimeout(id);
    }, [value]);

    return (
      <span className="db-roll">
        {st.rolling ? (
          <>
            <span className="db-d up" key={`u${st.to}`}>{st.from}</span>
            <span className="db-d in" key={`i${st.to}`}>{st.to}</span>
          </>
        ) : (
          <span className="db-d cur">{st.to}</span>
        )}
      </span>
    );
  }

  function dbReducer(m, action) {
    switch (action.type) {
      case 'arm':
        return m.state === 'idle' ? { ...m, state: 'confirming', count: action.seconds } : m;
      case 'cancel':
        return m.state === 'confirming' ? { ...m, state: 'idle' } : m;
      case 'tick':
        return { ...m, count: m.count - 1 };
      case 'expire':
        return { ...m, state: 'done' };
      case 'reset':
        return { ...m, state: 'idle' };
      case 'morph-start':
        return { ...m, view: m.state, phase: 'morph' };
      case 'phase-in':
        return { ...m, phase: 'in' };
      case 'phase-rest':
        return { ...m, phase: 'rest' };
      default:
        return m;
    }
  }

  function DeleteButton({ seconds = 5, label = 'Delete' }) {
    const [machine, dispatch] = useReducer(dbReducer, {
      state: 'idle',
      view: 'idle',
      phase: 'rest',
      count: seconds,
    });
    const { state, view, phase, count } = machine;
    const innerRef = useRef(null);
    const [w, setW] = useState(null);
    const timers = useRef([]);
    const rafs = useRef([]);

    function clearTimers() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      rafs.current.forEach(cancelAnimationFrame);
      rafs.current = [];
    }

    useLayoutEffect(() => {
      if (innerRef.current) setW(innerRef.current.offsetWidth);
    }, [view, count, label]);

    useEffect(() => {
      if (state !== 'confirming') return;
      if (count <= 0) {
        dispatch({ type: 'expire' });
        return;
      }
      const id = setTimeout(() => dispatch({ type: 'tick' }), 1000);
      return () => clearTimeout(id);
    }, [state, count]);

    useEffect(() => {
      if (state !== 'done') return;
      const id = setTimeout(() => dispatch({ type: 'reset' }), 2100);
      return () => clearTimeout(id);
    }, [state]);

    useEffect(() => {
      clearTimers();
      if (state === view) {
        dispatch({ type: 'phase-rest' });
        return;
      }
      const m = animMult();
      dispatch({ type: 'morph-start' });
      rafs.current.push(
        requestAnimationFrame(() => {
          rafs.current.push(
            requestAnimationFrame(() => {
              dispatch({ type: 'phase-in' });
              timers.current.push(
                setTimeout(() => {
                  dispatch({ type: 'phase-rest' });
                }, PHASE_IN_MS * m),
              );
            }),
          );
        }),
      );
      return clearTimers;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    function onClick() {
      if (state === 'idle') {
        dispatch({ type: 'arm', seconds });
      } else if (state === 'confirming') {
        dispatch({ type: 'cancel' });
      }
    }

    const aria =
      state === 'idle' ? label : state === 'confirming' ? `Cancel, ${count} seconds remaining` : 'Deleted';

    return (
      <button
        type="button"
        className="db"
        data-proximity
        data-state={view}
        data-phase={phase}
        onClick={onClick}
        aria-label={aria}
        style={{ width: w ? `${w}px` : 'auto' }}
      >
        <span className="db-inner" ref={innerRef}>
          {view === 'idle' && (
            <>
              <span className="db-ic"><Sym name="delete" size={20} wght={700} /></span>
              <span className="db-text">{label}</span>
            </>
          )}
          {view === 'confirming' && (
            <>
              <span className="db-ic"><Sym name="undo" size={20} wght={700} /></span>
              <span className="db-text">Cancel</span>
              <span className="db-count"><RollNum value={count} /></span>
            </>
          )}
          {view === 'done' && (
            <>
              <span className="db-ic"><Sym name="check_circle" size={21} wght={650} fill={1} /></span>
              <span className="db-text">Deleted</span>
            </>
          )}
        </span>
      </button>
    );
  }

  /* ================= Buttons page ================= */

  function Buttons() {
    const row1Ref = useProximityGroup();
    const row2Ref = useProximityGroup();
    const row3Ref = useProximityGroup();
    const row5Ref = useProximityGroup();
    const row6Ref = useProximityGroup();
    const row7Ref = useProximityGroup();

    return (
      <div className="btn-page-root card card--flat">
        <span className="btn-label">Buttons</span>
        <div className="btn-row" ref={row1Ref}>
          <Button variant="primary">View Your Leads <span className="material-icons btn-mi">arrow_forward</span></Button>
          <Button variant="inverse">View Your Leads <span className="material-icons btn-mi">arrow_forward</span></Button>
          <Button variant="glass">Son 30 Gün <span className="material-icons btn-mi">expand_more</span></Button>
          <Button variant="text">Tüm Görevleri Gör <span className="material-icons btn-mi">arrow_forward</span></Button>
        </div>

        <span className="btn-label" style={{ marginTop: 20 }}>Apply &amp; Discuss (pipeline-card variants)</span>
        <div className="btn-row" ref={row2Ref}>
          <ApplyButton />
          <Button variant="green" variant2="apply">
            <span className="material-symbols-outlined btn-apply-icon">neurology</span>
            Ask Jeru
          </Button>
          <Button variant="discuss">
            <span className="material-icons" style={{ fontSize: 16 }}>chat</span>
            Discuss
          </Button>
        </div>

        <span className="btn-label" style={{ marginTop: 20 }}>Colorful pill variants (green / yellow / red)</span>
        <div className="btn-row" ref={row3Ref}>
          <Button variant="green">
            <span className="material-icons" style={{ fontSize: 16 }}>check_circle</span>
            Confirm
          </Button>
          <Button variant="yellow">
            <span className="material-icons" style={{ fontSize: 16 }}>schedule</span>
            Pending
          </Button>
          <Button variant="red">
            <span className="material-icons" style={{ fontSize: 16 }}>cancel</span>
            Reject
          </Button>
        </div>

        <span className="btn-label" style={{ marginTop: 20 }}>Task footer (--fbtn color token)</span>
        <div className="btn-row" ref={row5Ref}>
          <Button variant="task" style={{ '--fbtn': 'var(--brand-primary-500)' }}>
            <span className="material-icons btn-task-icon">task_alt</span>
            Mark Done
          </Button>
          <Button variant="task" style={{ '--fbtn': '#3B82F6' }}>
            <span className="material-icons">edit</span>
            Edit Task
          </Button>
          <Button variant="task" style={{ '--fbtn': '#F59E0B' }}>
            <span className="material-icons">schedule</span>
            Reschedule
          </Button>
          <Button variant="discuss"><span className="material-icons" style={{ fontSize: 16 }}>more_horiz</span>More</Button>
        </div>
        <span className="btn-label" style={{ marginTop: 20 }}>CTA (optimization report)</span>
        <div className="btn-row" ref={row6Ref}>
          <Button variant="cta" style={{ '--accent': 'var(--brand-primary-500)', '--ctaglow': 'var(--brand-glow)' }}>
            <span className="material-symbols-outlined">insights</span>
            Get Optimization
          </Button>
          <Button variant="cta" style={{ '--accent': '#EF4444', '--ctaglow': 'rgba(239,68,68,0.5)' }}>
            <span className="material-symbols-outlined">insights</span>
            Get Optimization
          </Button>
          <Button variant="cta" style={{ '--accent': '#F97316', '--ctaglow': 'rgba(249,115,22,0.5)' }}>
            <span className="material-symbols-outlined">insights</span>
            Get Optimization
          </Button>
          <Button variant="cta" style={{ '--accent': '#3B82F6', '--ctaglow': 'rgba(59,130,246,0.5)' }}>
            <span className="material-symbols-outlined">insights</span>
            Get Optimization
          </Button>
          <Button variant="cta" style={{ '--accent': '#EAB308', '--ctaglow': 'rgba(234,179,8,0.5)' }}>
            <span className="material-symbols-outlined">insights</span>
            Get Optimization
          </Button>
        </div>

        <span className="btn-label" style={{ marginTop: 20 }}>Delete (countdown-to-confirm)</span>
        <div className="btn-row" ref={row7Ref}>
          <DeleteButton />
        </div>
      </div>
    );
  }

  window.Buttons = Buttons;
})();
