/* _ai-message-box.jsx — browser-JSX port of
 * apps/web/src/components/design-system/ai-message-box/AiMessageBox.tsx
 * (+ inlined ai-message-box-hook.ts, use-squircle.ts, use-proximity-group.ts).
 * Refreshed 2026-09-01 from today's canonical .tsx (ax-jeru-push Step 6).
 */
(function () {
  const { useRef, useCallback } = React;

  // ---------------------------------------------------------------------------
  // squircle.ts + use-squircle.ts (inlined, TS stripped) — same engine as
  // _cards.jsx / _fab.jsx. Canon numbers preserved exactly.
  // ---------------------------------------------------------------------------

  const STEPS_PER_CORNER = 22;
  const KAPPA = 0.5522847498307936;

  function sqClamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function sqRound(v) { return +v.toFixed(3); }

  function circularCornerShape(w, h, r) {
    const c = r * KAPPA;
    return {
      start: [r, 0],
      segments: [
        { type: 'L', to: [w - r, 0] },
        { type: 'C', c1: [w - r + c, 0], c2: [w, r - c], to: [w, r] },
        { type: 'L', to: [w, h - r] },
        { type: 'C', c1: [w, h - r + c], c2: [w - r + c, h], to: [w - r, h] },
        { type: 'L', to: [r, h] },
        { type: 'C', c1: [r - c, h], c2: [0, h - r + c], to: [0, h - r] },
        { type: 'L', to: [0, r] },
        { type: 'C', c1: [0, r - c], c2: [r - c, 0], to: [r, 0] },
      ],
    };
  }

  function superellipseCornerPoints(cx, cy, r, exponent, a0, a1) {
    const pts = [];
    for (let i = 0; i <= STEPS_PER_CORNER; i += 1) {
      const a = a0 + (a1 - a0) * (i / STEPS_PER_CORNER);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const x = cx + r * Math.sign(cos) * Math.abs(cos) ** (2 / exponent);
      const y = cy + r * Math.sign(sin) * Math.abs(sin) ** (2 / exponent);
      pts.push([sqRound(x), sqRound(y)]);
    }
    return pts;
  }

  function superellipseShape(w, h, r, smoothing) {
    const exponent = 2 + smoothing * 3.35;
    const raw = [];
    raw.push([r, 0], [w - r, 0]);
    raw.push(...superellipseCornerPoints(w - r, r, r, exponent, -Math.PI / 2, 0));
    raw.push([w, h - r]);
    raw.push(...superellipseCornerPoints(w - r, h - r, r, exponent, 0, Math.PI / 2));
    raw.push([r, h]);
    raw.push(...superellipseCornerPoints(r, h - r, r, exponent, Math.PI / 2, Math.PI));
    raw.push([0, r]);
    raw.push(...superellipseCornerPoints(r, r, r, exponent, Math.PI, Math.PI * 1.5));
    const deduped = raw.filter((point, index, all) => {
      if (index === 0) return true;
      const prev = all[index - 1];
      return point[0] !== prev[0] || point[1] !== prev[1];
    });
    return { start: deduped[0] ?? [r, 0], segments: deduped.slice(1).map((to) => ({ type: 'L', to })) };
  }

  function rectShape(w, h) {
    return { start: [0, 0], segments: [{ type: 'L', to: [w, 0] }, { type: 'L', to: [w, h] }, { type: 'L', to: [0, h] }] };
  }

  function buildShape(width, height, radius, smoothing) {
    const w = Math.max(0, width);
    const h = Math.max(0, height);
    if (!w || !h) return { start: [0, 0], segments: [] };
    const r = sqClamp(radius, 0, Math.min(w, h) / 2);
    if (!r) return rectShape(w, h);
    const s = sqClamp(smoothing, 0, 1);
    if (s <= 0.001) return circularCornerShape(w, h, r);
    return superellipseShape(w, h, r, s);
  }

  function reverseShape(shape) {
    const { start, segments } = shape;
    if (segments.length === 0) return shape;
    const anchors = [start, ...segments.map((seg) => seg.to)];
    const n = segments.length;
    const reversed = [];
    for (let i = n - 1; i >= 0; i -= 1) {
      const seg = segments[i];
      const to = anchors[i];
      reversed.push(seg.type === 'L' ? { type: 'L', to } : { type: 'C', c1: seg.c2, c2: seg.c1, to });
    }
    return { start: anchors[n], segments: reversed };
  }

  function shapeToPath(shape, origin = [0, 0]) {
    if (shape.segments.length === 0) return '';
    const [ox, oy] = origin;
    const fmt = ([x, y]) => `${sqRound(x + ox)} ${sqRound(y + oy)}`;
    let d = `M${fmt(shape.start)}`;
    for (const seg of shape.segments) {
      d += seg.type === 'L' ? `L${fmt(seg.to)}` : `C${fmt(seg.c1)} ${fmt(seg.c2)} ${fmt(seg.to)}`;
    }
    return `${d}Z`;
  }

  function squirclePath(width, height, radius, smoothing = 0.6) {
    return shapeToPath(buildShape(width, height, radius, smoothing));
  }

  function squircleRingPath(width, height, radius, inset, smoothing = 0.6, origin = [0, 0]) {
    const outer = shapeToPath(buildShape(width, height, radius, smoothing), origin);
    const innerW = Math.max(0, width - inset * 2);
    const innerH = Math.max(0, height - inset * 2);
    const innerR = Math.max(radius - inset, 0);
    const inner = shapeToPath(reverseShape(buildShape(innerW, innerH, innerR, smoothing)), [origin[0] + inset, origin[1] + inset]);
    return inner ? `${outer} ${inner}` : outer;
  }

  const SQ_DEFAULT_SMOOTHING = 0.6;
  const SQ_BORDER_WIDTH = 1;
  const SQ_RING_INSET = 0.5;
  const squircleElements = new Map();
  let squircleObserver = null;
  let squircleCapabilityChecked = false;
  let squircleCapable = false;

  function supportsSquircle() {
    if (squircleCapabilityChecked) return squircleCapable;
    squircleCapabilityChecked = true;
    squircleCapable =
      typeof ResizeObserver !== 'undefined' &&
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('clip-path', 'path("M0 0 L1 0 Z")');
    return squircleCapable;
  }

  function readRadius(computed) {
    const custom = computed.getPropertyValue('--corner-radius').trim();
    if (custom) {
      const parsed = parseFloat(custom);
      if (!Number.isNaN(parsed)) return parsed;
    }
    const fallback = parseFloat(computed.borderTopLeftRadius);
    return Number.isNaN(fallback) ? 0 : fallback;
  }

  function readSmoothing(computed) {
    const custom = computed.getPropertyValue('--corner-smoothing').trim();
    const parsed = custom ? parseFloat(custom) : NaN;
    return Number.isNaN(parsed) ? SQ_DEFAULT_SMOOTHING : parsed;
  }

  function applySquircle(el, width, height) {
    if (width <= 0 || height <= 0) return;
    const computed = window.getComputedStyle(el);
    const radius = readRadius(computed);
    const smoothing = readSmoothing(computed);
    el.style.clipPath = `path("${squirclePath(width, height, radius, smoothing)}")`;
    el.style.setProperty(
      '--squircle-border-path',
      `path("${squircleRingPath(width - SQ_RING_INSET * 2, height - SQ_RING_INSET * 2, Math.max(radius - SQ_RING_INSET, 0), SQ_BORDER_WIDTH, smoothing, [SQ_RING_INSET, SQ_RING_INSET])}")`
    );
    el.dataset.squircle = 'on';
  }

  function measureAndApply(el) {
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
          else measureAndApply(el);
        }
      });
    }
    return squircleObserver;
  }

  function registerSquircle(el) {
    if (!supportsSquircle()) return () => {};
    squircleElements.set(el, { el });
    measureAndApply(el);
    ensureSquircleObserver()?.observe(el);
    return function unregisterSquircle() {
      if (!squircleElements.has(el)) return;
      squircleElements.delete(el);
      squircleObserver?.unobserve(el);
      el.style.removeProperty('clip-path');
      el.style.removeProperty('--squircle-border-path');
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
  // proximity-engine.ts + use-proximity-group.ts (inlined, TS stripped) —
  // same engine as _fab.jsx/_buttons.jsx. Canon numbers preserved (dy*3, radius 80).
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

  // ── Inlined from ai-message-box-hook.ts ─────────────────────────────────────

  function mbStartGenerating(el) {
    if (!el) return;
    const mb = el;
    if (mb.classList.contains('generating')) return; // guard: not clickable while generating
    clearTimeout(mb.revertT);
    clearTimeout(mb.clearT);
    clearTimeout(mb.doneT);
    clearTimeout(mb.doneOutT);
    mb.classList.remove('exiting', 'done', 'done-out');
    mb.classList.add('generating');
    mb.revertT = setTimeout(() => {
      mb.classList.remove('generating');
      mb.classList.add('exiting', 'done');
      mb.clearT = setTimeout(() => {
        mb.classList.remove('exiting');
        mb.doneT = setTimeout(() => {
          mb.classList.remove('done');
          mb.classList.add('done-out');
          mb.doneOutT = setTimeout(() => {
            mb.classList.remove('done-out');
          }, 720);
        }, 1300);
      }, 660);
    }, 5000);
  }

  function mbCleanup(el) {
    if (!el) return;
    const mb = el;
    clearTimeout(mb.revertT);
    clearTimeout(mb.clearT);
    clearTimeout(mb.doneT);
    clearTimeout(mb.doneOutT);
  }

  // ── Component ─────────────────────────────────────────────────────────────

  function AiMessageBox() {
    const mbRef = useRef(null);
    const squircleRef = useSquircle();
    const shellRef = useSquircle();
    const toolbarRef = useProximityGroup();

    // Callback ref: keeps mbRef in sync; cleanup on unmount
    const mbCallbackRef = useCallback((el) => {
      if (!el) {
        mbCleanup(mbRef.current);
      }
      mbRef.current = el;
      squircleRef(el);
    }, [squircleRef]);

    function handleAiBtnClick() {
      mbStartGenerating(mbRef.current);
    }

    return (
      <div className="card">
        <div className="mb-shell" ref={shellRef}>
        <div className="mb" ref={mbCallbackRef}>
          <div className="mb-stack">
            <div
              className="mb-input"
              id="mbInput"
              contentEditable="true"
              suppressContentEditableWarning
            >
              What messaging resonates most with Gen Z users
            </div>
            <div className="mb-skel">
              <div className="skel-bar w1"></div>
              <div className="skel-bar w2"></div>
              <div className="skel-bar w3"></div>
            </div>
          </div>
          <div className="mb-toolbar" ref={toolbarRef}>
            <div className="mb-tools-left">
              <button type="button" className="mb-btn" data-proximity>
                <span className="material-icons">file_upload</span>
                Upload Instructions
              </button>
            </div>
            <div className="mb-tools-right">
              <div className="mb-ai-slot">
                <button
                  type="button"
                  className="mb-ai-btn"
                  id="mbAiBtn"
                  data-proximity
                  onClick={handleAiBtnClick}
                >
                  <span className="material-symbols-outlined mb-gradient-icon">neurology</span>
                  <span className="mb-gradient-text">Extend with AI</span>
                </button>
                <span className="mb-gen-label">
                  <span className="material-symbols-outlined mb-gradient-icon">neurology</span>
                  <span className="mb-gradient-text">Generating…</span>
                </span>
                <span className="mb-done-badge" aria-hidden="true">
                  <svg
                    className="mb-done-check"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="#fff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Done
                </span>
              </div>
              <button type="button" className="mb-send" data-proximity>
                <span className="material-icons">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>
        </div>
        <div className="hint">
          Click <kbd>Extend with AI</kbd> to see the generating state
        </div>
      </div>
    );
  }

  window.AiMessageBox = AiMessageBox;
})();
