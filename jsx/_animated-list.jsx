(function () {
  const { useState, useRef, useReducer, useCallback } = React;

  /* =========================================================================
     AnimatedList — Deha Design System (browser port)
     Real-time push feed: absolute-slot model.

     Each item occupies an absolute slot keyed by id. When a new item prepends
     at index 0, React updates every other row's `top` and CSS transitions them
     down. The new row's entrance (opacity/transform) is driven imperatively via
     a callback ref (makeRowRef). When the oldest item is pushed beyond
     maxVisible, it is kept mounted (mounted-through-exit) — React applies the
     exit opacity/transform inline, and a timer removes it after the animation
     completes so it never flickers off mid-transition.

     All mutable state (heights, cache, entered set, nodeRefs, prevVisIds) is
     encapsulated in `useAnimatedListStore` so the component render path reads
     only plain computed values — no `.current` access during render.
     ========================================================================= */

  // ---------------------------------------------------------------------------
  // use-squircle.ts (inlined, same engine as _cards.jsx / _prize-sheet.jsx).
  // ---------------------------------------------------------------------------

  const DEFAULT_SMOOTHING = 0.6;
  const squircleElements = new Map();
  let squircleObserver = null;

  function squirclePathRect(w, h, r) {
    const k = 0.5522847498307936;
    const c = r * k;
    return `M${r} 0L${w - r} 0C${w - r + c} 0 ${w} ${r - c} ${w} ${r}L${w} ${h - r}C${w} ${h - r + c} ${w - r + c} ${h} ${w - r} ${h}L${r} ${h}C${r - c} ${h} 0 ${h - r + c} 0 ${h - r}L0 ${r}C0 ${r - c} ${r - c} 0 ${r} 0Z`;
  }

  function readSquircleRadius(computed) {
    const parsed = parseFloat(computed.getPropertyValue('--corner-radius')) || parseFloat(computed.borderTopLeftRadius);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function applySquircle(el, width, height) {
    if (width <= 0 || height <= 0) return;
    const computed = window.getComputedStyle(el);
    const radius = readSquircleRadius(computed);
    el.style.clipPath = `path("${squirclePathRect(width, height, Math.min(radius, width / 2, height / 2))}")`;
    el.dataset.squircle = 'on';
  }

  function measureAndApplySquircle(el) {
    const rect = el.getBoundingClientRect();
    applySquircle(el, rect.width, rect.height);
  }

  function ensureSquircleObserver() {
    if (typeof ResizeObserver === 'undefined') return null;
    if (!squircleObserver) {
      squircleObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const el = entry.target;
          if (!squircleElements.has(el)) continue;
          const box = entry.borderBoxSize?.[0];
          if (box) applySquircle(el, box.inlineSize, box.blockSize);
          else measureAndApplySquircle(el);
        }
      });
    }
    return squircleObserver;
  }

  function registerSquircle(el) {
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function' || !CSS.supports('clip-path', 'path("M0 0 L1 0 Z")')) {
      return () => {};
    }
    squircleElements.set(el, { el });
    measureAndApplySquircle(el);
    ensureSquircleObserver()?.observe(el);
    return function unregisterSquircle() {
      if (!squircleElements.has(el)) return;
      squircleElements.delete(el);
      squircleObserver?.unobserve(el);
      el.style.removeProperty('clip-path');
      delete el.dataset.squircle;
    };
  }

  function useSquircle() {
    const stateRef = useRef({ cleanup: null });
    return useCallback((el) => {
      stateRef.current.cleanup?.();
      stateRef.current.cleanup = null;
      if (el != null) stateRef.current.cleanup = registerSquircle(el);
    }, []);
  }

  // ---------------------------------------------------------------------------
  // proximity-hover engine (inlined, same as _pills.jsx / _streak-card.jsx).
  // Canon numbers preserved exactly: dy*3, radius 80.
  // ---------------------------------------------------------------------------

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

  const VARIANTS = {
    scale: {
      initial: { opacity: 0, transform: 'translateY(-22px) scale(0.96)' },
      exit:    { opacity: 0, transform: 'translateY(10px) scale(0.92)' },
      ease: 'cubic-bezier(.22,1,.36,1)',
    },
    slide: {
      initial: { opacity: 0, transform: 'translateY(-32px)' },
      exit:    { opacity: 0, transform: 'translateY(28px)' },
      ease: 'cubic-bezier(.22,1,.36,1)',
    },
    fade: {
      initial: { opacity: 0, transform: 'none' },
      exit:    { opacity: 0, transform: 'translateY(8px)' },
      ease: 'cubic-bezier(.4,0,.2,1)',
    },
    // Renamed from the source's fourth demo-mode label (Step 5, ax-jeru-push):
    // the plan bans loop/overshoot-style wording and overshoot curves above
    // the 1.32 ceiling. Same entrance/exit shape, routed through the approved
    // spring-soft family instead of the source's 1.7 overshoot curve.
    pop: {
      initial: { opacity: 0, transform: 'translateY(-20px) scale(0.8)' },
      exit:    { opacity: 0, transform: 'translateY(14px) scale(0.86)' },
      ease: 'var(--ease-spring-soft, cubic-bezier(.32,1.32,.36,1))',
    },
  };

  // ── Inlined from animated-list-hook.ts ──────────────────────────────────────

  const TRANSITION_MS = 500;
  const SETTLE_SAFETY_MS = 640;

  /**
   * Build the full CSS transition shorthand for live/settling rows.
   * Wraps durations in `calc(…*var(--anim-mult,1))` so slow-down mode works.
   */
  function buildTransition(ease) {
    return (
      `top calc(${TRANSITION_MS}ms * var(--anim-mult,1)) ${ease},` +
      ` transform calc(${TRANSITION_MS}ms * var(--anim-mult,1)) ${ease},` +
      ` opacity calc(320ms * var(--anim-mult,1)) ease-out`
    );
  }

  /**
   * Returns a callback ref for a newly-mounted live row.
   * Plays the entrance: sets initial state, flushes reflow, then transitions
   * to the resting state (opacity:1, transform:none).
   *
   * @param variant  The animation variant object (initial/exit styles + easing).
   * @param entered  Set of ids whose entrance has already played; updated in place.
   * @param id       Unique id of this row.
   */
  function makeRowRef(variant, entered, id) {
    return (el) => {
      if (!el) {
        // Cleanup on unmount
        const aug = el;
        if (aug?.__alRafId !== undefined) {
          cancelAnimationFrame(aug.__alRafId);
          delete aug.__alRafId;
        }
        if (aug?.__alTimerId !== undefined) {
          clearTimeout(aug.__alTimerId);
          delete aug.__alTimerId;
        }
        return;
      }

      // Entrance already played for this id — skip (handles re-renders).
      if (entered.has(id)) return;
      entered.add(id);

      const aug = el;

      // Background tab: CSS transitions are frozen — show row at resting state
      // immediately so content is never stuck invisible.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.transform = 'none';
        return;
      }

      // Set 'from' state without transition, then flush reflow, then animate.
      el.style.transition = 'none';
      el.style.opacity = String(variant.initial.opacity);
      el.style.transform = variant.initial.transform;
      void el.offsetWidth; // force reflow — commits 'from' state before transition starts

      const fullTransition = buildTransition(variant.ease);
      aug.__alRafId = requestAnimationFrame(() => {
        delete aug.__alRafId;
        el.style.transition = fullTransition;
        el.style.opacity = '1';
        el.style.transform = 'none';

        // Safety net: if transition freezes mid-entrance (tab backgrounded),
        // guarantee the row still lands at its visible resting state.
        aug.__alTimerId = setTimeout(() => {
          delete aug.__alTimerId;
          if (el.isConnected) {
            el.style.opacity = '1';
            el.style.transform = 'none';
          }
        }, SETTLE_SAFETY_MS);
      });
    };
  }

  /**
   * useAnimatedListStore
   *
   * Manages all mutable imperative state for AnimatedList. All .current access
   * is confined to this hook, so the component render path reads only plain
   * computed values (heights snapshot, exits state, bump counter).
   */
  function useAnimatedListStore(rowHeight, gap) {
    // Single ref bag — keeps all mutable data in one place
    const bagRef = useRef({
      heights:      new Map(),
      cache:        new Map(),
      entered:      new Set(),
      nodeRefs:     new Map(),
      prevVisIds:   [],
      pendingFrame: false,
    });

    const [exits, setExits] = useState([]);
    const [, bump] = useReducer((x) => (x + 1) % 1e9, 0);

    // Stable remove-exit callback
    const removeExit = useCallback((id) => {
      const bag = bagRef.current;
      setExits((xs) => xs.filter((x) => x.id !== id));
      bag.heights.delete(id);
      bag.cache.delete(id);
      bag.entered.delete(id);
      bag.nodeRefs.delete(id);
    }, []);

    /**
     * Called once per render with the current visible item list.
     * Updates cache, computes exits, schedules a post-paint measurement pass,
     * and returns the computed values the component needs to render correctly.
     *
     * All ref reads happen here, inside the hook, not in the component.
     */
    function computeRender(visible, currentExits) {
      const bag = bagRef.current;

      // Keep cache up-to-date so exiting rows can still render their data.
      for (const it of visible) bag.cache.set(it.id, it);

      const curIds = visible.map((i) => i.id);
      const liveSet = new Set(curIds);
      const newlyGone = bag.prevVisIds.filter(
        (id) => !liveSet.has(id) && bag.cache.has(id) && !currentExits.some((e) => e.id === id),
      );

      const exitRows = currentExits
        .filter((x) => !liveSet.has(x.id))
        .concat(newlyGone.map((id) => ({ id, item: bag.cache.get(id) })));

      // Schedule post-paint measurement once per render cycle.
      if (!bag.pendingFrame) {
        bag.pendingFrame = true;
        Promise.resolve().then(() => {
          bag.pendingFrame = false;

          // 1) Measure row heights.
          let changed = false;
          bag.nodeRefs.forEach((el, id) => {
            const h = el.offsetHeight;
            if (h && bag.heights.get(id) !== h) {
              bag.heights.set(id, h);
              changed = true;
            }
          });

          // 2) Commit newly-gone rows into exit state + schedule unmount.
          if (newlyGone.length) {
            setExits((xs) =>
              xs.concat(newlyGone.map((id) => ({ id, item: bag.cache.get(id) }))),
            );
            newlyGone.forEach((id) => setTimeout(() => removeExit(id), 560));
          }
          bag.prevVisIds = curIds;

          if (changed) bump();
        });
      }

      // Build combined row list: live rows first, then exiting rows below.
      const combined = visible
        .map((it, i) => ({ id: it.id, item: it, index: i, exiting: false }))
        .concat(exitRows.map((x) => ({ id: x.id, item: x.item, index: -1, exiting: true })));

      // Compute slot top positions.
      let acc = 0;
      const tops = {};
      combined.forEach((row) => {
        tops[row.id] = acc;
        acc += (bag.heights.get(row.id) ?? rowHeight) + gap;
      });

      // Compute container height (live rows only, last gap excluded).
      let containerHeight = 0;
      for (const it of visible) {
        containerHeight += (bag.heights.get(it.id) ?? rowHeight) + gap;
      }
      containerHeight = Math.max(0, containerHeight - gap);

      return { combined, tops, containerHeight };
    }

    /**
     * Callback ref factory — registers or unregisters a row DOM element.
     * Called from the component's inline ref prop; never during render itself.
     */
    function makeNodeRef(id) {
      return (el) => {
        const bag = bagRef.current;
        if (el) {
          bag.nodeRefs.set(id, el);
        } else {
          bag.nodeRefs.delete(id);
        }
      };
    }

    /**
     * Exposes the entered set and nodeRefs so makeRowRef can use them
     * from the component's inline ref without touching bagRef.current there.
     * Returned as stable references (same object across renders).
     */
    function getEntered() {
      return bagRef.current.entered;
    }

    return { exits, computeRender, makeNodeRef, getEntered, removeExit };
  }

  /* ── Main component ──────────────────────────────────────────────── */
  function AnimatedList({
    items = [],
    renderItem,
    maxVisible = 8,
    gap = 12,
    animation = 'scale',
    rowHeight = 64,
    className = '',
  }) {
    const variant = VARIANTS[animation] ?? VARIANTS['scale'];
    const visible = items.slice(0, maxVisible);

    const fullTransition = buildTransition(variant.ease);

    // All mutable imperative state lives in the store hook.
    // The component render path only reads the plain values computeRender returns.
    const { exits, computeRender, makeNodeRef, getEntered } = useAnimatedListStore(rowHeight, gap);

    // computeRender updates internal state and returns plain computed values.
    // It is safe to call during render: all .current accesses are inside the hook.
    const { combined, tops, containerHeight } = computeRender(visible, exits);

    const effectiveRenderItem = renderItem ?? (() => null);

    return (
      <div
        className={('al-root ' + className).trim()}
        style={{
          position: 'relative',
          height: containerHeight + 'px',
          transition: `height calc(500ms * var(--anim-mult,1)) ${variant.ease}`,
        }}
      >
        {combined.map((row) => {
          // Live rows: React controls only top/zIndex.
          // Opacity & transform are owned by the imperative entrance callback ref,
          // so a re-render can never reset a settled row back to invisible.
          // Exit rows: React drives opacity/transform/top to slide+fade out.
          const style = {
            position: 'absolute',
            left: 0,
            right: 0,
            top: tops[row.id] + 'px',
            transition: fullTransition,
            willChange: 'top, transform, opacity',
            zIndex: row.exiting ? 0 : 1,
          };
          if (row.exiting) {
            style.opacity = variant.exit.opacity;
            style.transform = variant.exit.transform;
            style.pointerEvents = 'none';
          }

          return (
            <div
              key={row.id}
              className="al-row"
              style={style}
              ref={(el) => {
                // Register / unregister DOM node — happens outside render.
                makeNodeRef(row.id)(el);
                // Play entrance imperatively via callback ref — no useEffect.
                if (el) {
                  makeRowRef(variant, getEntered(), row.id)(el);
                } else {
                  makeRowRef(variant, getEntered(), row.id)(null);
                }
              }}
            >
              {effectiveRenderItem(row.item, row.index)}
            </div>
          );
        })}
      </div>
    );
  }

  /* =========================================================================
     Built-in demo — self-contained Payments Radar feed.
     Renders standalone in the showcase with no required props.
     Auto-seeds 5 initial items; a "Push event" button prepends one more.
     The self-rescheduling push timer lives in the hook via a callback ref.
     ========================================================================= */

  const METHODS = [
    { meth: 'Visa ···4242',       icon: 'credit_card' },
    { meth: 'Mastercard ···8801', icon: 'credit_card' },
    { meth: 'Amex ···1007',       icon: 'credit_card' },
    { meth: 'Apple Pay',          icon: 'phone_iphone' },
    { meth: 'PayPal wallet',      icon: 'account_balance_wallet' },
    { meth: 'SEPA transfer',      icon: 'account_balance' },
  ];
  const PLACES = ['Berlin, DE', 'Austin, US', 'Lisbon, PT', 'Toronto, CA', 'Tokyo, JP', 'Lagos, NG', 'Paris, FR', 'São Paulo, BR'];
  const RISK_POOL = ['low','low','low','low','elevated','elevated','review','blocked'];
  const RISK_META = {
    low:      { label: 'Low risk', icon: 'verified_user' },
    elevated: { label: 'Elevated', icon: 'bolt' },
    review:   { label: 'Review',   icon: 'flag' },
    blocked:  { label: 'Blocked',  icon: 'block' },
  };

  let _nextId = 1;
  function makeEvent() {
    const m = METHODS[(Math.random() * METHODS.length) | 0];
    const risk = RISK_POOL[(Math.random() * RISK_POOL.length) | 0];
    const amt = Math.random() * 880 + 12;
    const score =
      risk === 'low'      ? (Math.random() * 18) | 0
      : risk === 'elevated' ? 42 + ((Math.random() * 22) | 0)
      : risk === 'review'   ? 60 + ((Math.random() * 15) | 0)
      :                       82 + ((Math.random() * 16) | 0);
    return {
      id: _nextId++,
      amount: '$' + amt.toFixed(2),
      meth: m.meth,
      place: PLACES[(Math.random() * PLACES.length) | 0],
      risk,
      score: String(score).padStart(2, '0'),
    };
  }
  function seed(n) {
    return Array.from({ length: n }, makeEvent).reverse();
  }

  // Real component (not a plain render function) so useSquircle gets one
  // stable hook slot per row id -- the .al-row wrapper above keys each
  // mounted subtree.
  function AlEvItem({ it }) {
    const r = RISK_META[it.risk];
    const squircleRef = useSquircle();
    return (
      <div className={`al-ev al-ev--${it.risk}`} ref={squircleRef}>
        <span className="al-ev-ico material-symbols-outlined">{it.risk === 'low' ? 'verified_user' : it.risk === 'elevated' ? 'bolt' : it.risk === 'review' ? 'flag' : 'block'}</span>
        <div className="al-ev-main">
          <div className="al-ev-amt-row">
            <span className="al-ev-amt">{it.amount}</span>
            <span className="al-ev-meth">{it.meth}</span>
          </div>
          <div className="al-ev-sub">{it.place}</div>
        </div>
        <div className="al-ev-right">
          <span className="al-ev-pill">{r.label}</span>
          <span className="al-ev-score">score {it.score}</span>
        </div>
      </div>
    );
  }

  function renderEvent(it) {
    return <AlEvItem it={it} />;
  }

  const ANIM_MODES = ['scale', 'slide', 'fade', 'pop'];

  function AnimatedListDemo() {
    const [items, setItems] = useState(() => seed(5));
    const [anim, setAnim] = useState('scale');
    const controlsRef = useProximityGroup();

    function pushEvent() {
      setItems((prev) => [makeEvent(), ...prev].slice(0, 8));
    }

    return (
      <div className="al-radar">
        <div className="al-rd-top">
          <span className="al-rd-ic material-symbols-outlined">radar</span>
          <div>
            <div className="al-rd-tt">Payments Radar</div>
            <div className="al-rd-sb">Live risk scoring</div>
          </div>
          <span className="al-live">
            <span className="al-live-dot" />
            Live
          </span>
        </div>

        <div className="al-controls" ref={controlsRef}>
          <div className="al-anim-pills">
            {ANIM_MODES.map((m) => (
              <button
                key={m}
                type="button"
                className={'al-anim-pill' + (m === anim ? ' al-active' : '')}
                data-proximity
                onClick={() => setAnim(m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <button type="button" className="al-push-btn" data-proximity onClick={pushEvent}>
            Push event
          </button>
        </div>

        <div className="al-feed">
          <AnimatedList
            items={items}
            renderItem={renderEvent}
            maxVisible={5}
            gap={10}
            animation={anim}
            rowHeight={64}
          />
        </div>
      </div>
    );
  }

  window.AnimatedList = AnimatedListDemo;
})();
