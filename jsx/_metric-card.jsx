/* _metric-card.jsx — browser-JSX port of
 * apps/web/src/components/design-system/metric-card/MetricCard.tsx
 * (+ inlined metric-card-hook.ts, use-proximity-group.ts, use-squircle.ts).
 * New port (ax-jeru-push Step 7).
 */
(function () {
  const { useState, useRef, useCallback } = React;

  /* ================= proximity-hover engine (inlined, same as _fab.jsx/_buttons.jsx).
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

  /* ================= squircle engine (inlined, same as _cards.jsx). ================= */

  const STEPS_PER_CORNER = 22;
  const KAPPA = 0.5522847498307936;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
  function round(v) {
    return +v.toFixed(3);
  }
  function rectShape(w, h) {
    return { start: [0, 0], segments: [{ type: 'L', to: [w, 0] }, { type: 'L', to: [w, h] }, { type: 'L', to: [0, h] }] };
  }
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
      pts.push([round(x), round(y)]);
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
  function circularCornerArc(cx, cy, r, a0, a1) {
    const c = r * KAPPA;
    const entry = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const exit = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    return {
      type: 'C',
      c1: [entry[0] + c * -Math.sin(a0), entry[1] + c * Math.cos(a0)],
      c2: [exit[0] - c * -Math.sin(a1), exit[1] - c * Math.cos(a1)],
      to: exit,
    };
  }
  function buildShapePerCorner(w, h, radii, smoothing) {
    const max = Math.min(w, h) / 2;
    const tl = clamp(radii.tl, 0, max);
    const tr = clamp(radii.tr, 0, max);
    const br = clamp(radii.br, 0, max);
    const bl = clamp(radii.bl, 0, max);
    const s = clamp(smoothing, 0, 1);
    const circular = s <= 0.001;
    const exponent = 2 + s * 3.35;
    const corners = [
      [w - tr, tr, tr, -Math.PI / 2, 0],
      [w - br, h - br, br, 0, Math.PI / 2],
      [bl, h - bl, bl, Math.PI / 2, Math.PI],
      [tl, tl, tl, Math.PI, Math.PI * 1.5],
    ];
    const edgeEnds = [[w - tr, 0], [w, h - br], [bl, h], [0, tl]];
    const segments = [];
    corners.forEach(([cx, cy, r, a0, a1], i) => {
      segments.push({ type: 'L', to: edgeEnds[i] });
      if (r <= 0) return;
      if (circular) {
        segments.push(circularCornerArc(cx, cy, r, a0, a1));
      } else {
        for (const to of superellipseCornerPoints(cx, cy, r, exponent, a0, a1).slice(1)) {
          segments.push({ type: 'L', to });
        }
      }
    });
    return { start: [tl, 0], segments };
  }
  function buildShape(width, height, radius, smoothing) {
    const w = Math.max(0, width);
    const h = Math.max(0, height);
    if (!w || !h) return { start: [0, 0], segments: [] };
    if (typeof radius !== 'number') return buildShapePerCorner(w, h, radius, smoothing);
    const r = clamp(radius, 0, Math.min(w, h) / 2);
    if (!r) return rectShape(w, h);
    const s = clamp(smoothing, 0, 1);
    if (s <= 0.001) return circularCornerShape(w, h, r);
    return superellipseShape(w, h, r, s);
  }
  function shapeToPath(shape, origin = [0, 0]) {
    if (shape.segments.length === 0) return '';
    const [ox, oy] = origin;
    const fmt = ([x, y]) => `${round(x + ox)} ${round(y + oy)}`;
    let d = `M${fmt(shape.start)}`;
    for (const seg of shape.segments) {
      d += seg.type === 'L' ? `L${fmt(seg.to)}` : `C${fmt(seg.c1)} ${fmt(seg.c2)} ${fmt(seg.to)}`;
    }
    return `${d}Z`;
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
      const parts = custom.split(/\s+/);
      if (parts.length >= 4) {
        const [tl, tr, br, bl] = parts.map((v) => parseFloat(v) || 0);
        return { tl, tr, br, bl };
      }
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
    if (typeof radius === 'number') {
      el.style.setProperty(
        '--squircle-border-path',
        `path("${squircleRingPath(width - SQ_RING_INSET * 2, height - SQ_RING_INSET * 2, Math.max(radius - SQ_RING_INSET, 0), SQ_BORDER_WIDTH, smoothing, [SQ_RING_INSET, SQ_RING_INSET])}")`
      );
      const hairlineOffset = SQ_BORDER_WIDTH + SQ_RING_INSET;
      const hairlineInnerW = width - hairlineOffset * 2;
      const hairlineInnerH = height - hairlineOffset * 2;
      const hairlineRadius = Math.max(radius - hairlineOffset, 0);
      el.style.setProperty(
        '--squircle-hairline-path',
        `path("${squircleRingPath(hairlineInnerW, hairlineInnerH, hairlineRadius, SQ_BORDER_WIDTH, smoothing, [hairlineOffset, hairlineOffset])}")`
      );
    }
    el.dataset.squircle = 'on';
  }
  function measureAndApply(el) {
    const rect = el.getBoundingClientRect();
    applySquircle(el, rect.width, rect.height);
  }
  function ensureObserver() {
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
    ensureObserver()?.observe(el);
    return function unregisterSquircle() {
      if (!squircleElements.has(el)) return;
      squircleElements.delete(el);
      squircleObserver?.unobserve(el);
      el.style.removeProperty('clip-path');
      el.style.removeProperty('--squircle-border-path');
      el.style.removeProperty('--squircle-hairline-path');
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

  /* ================= metric-card-hook.ts (inlined) — Escape-key listener for the
   * expand overlay, plus the same stash-cleanup-on-element pattern as
   * _fab.jsx/_prize-sheet.jsx (React 18 harness calls callback refs with `null`
   * on unmount instead of invoking a returned cleanup closure). ================= */

  function expOverlayRef(el, toggle) {
    if (!el) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') toggle(false);
    }
    document.addEventListener('keydown', onKeyDown);
    el.__expCleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }
  function cleanupExpOverlay(el) {
    if (!el) return;
    el.__expCleanup?.();
    delete el.__expCleanup;
  }

  /* ================= data — verbatim from MetricCard.tsx METRICS object ================= */

  const METRICS = {
    leads: {
      icon: 'group', label: 'New Leads',
      num: '142', goal: '/ 160 goal',
      dir: 'up', delta: '+12%', period: 'vs last month',
      insight: 'You gained <b>+15 leads</b> this month. At this pace you\'ll hit your monthly target <b>4 days early</b>.',
      color: 'var(--brand-primary-500)', gradId: 'expG1',
      axes: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      solidLine: 'M0,91 C20,90 40,78 60,75 C80,72 100,68 120,66 C140,64 160,57 180,50 C200,43 220,38 240,33',
      solidArea: 'M0,91 C20,90 40,78 60,75 C80,72 100,68 120,66 C140,64 160,57 180,50 C200,43 220,38 240,33 L240,120 L0,120 Z',
      dashLine: 'M240,33 C260,28 280,24 300,20',
      dashArea: 'M240,33 C260,28 280,24 300,20 L300,120 L240,120 Z',
      dotX: 240, dotY: 33,
    },
    value: {
      icon: 'payments', label: 'Predicted Value',
      num: '$1.2M', goal: '/ $1.4M target',
      dir: 'down', delta: '-8.1%', period: 'vs last month',
      insight: 'Portfolio value dropped by <b>$108K</b>. 3 listings need re-evaluation to recover momentum.',
      color: '#EF4444', gradId: 'expG2',
      axes: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      solidLine: 'M0,30 C20,32 40,37 60,40 C80,43 100,48 120,54 C140,60 160,63 180,66 C200,69 220,80 240,86',
      solidArea: 'M0,30 C20,32 40,37 60,40 C80,43 100,48 120,54 C140,60 160,63 180,66 C200,69 220,80 240,86 L240,120 L0,120 Z',
      dashLine: 'M240,86 C260,88 280,89 300,90',
      dashArea: 'M240,86 C260,88 280,89 300,90 L300,120 L240,120 Z',
      dotX: 240, dotY: 86,
    },
  };

  function ExpandedCard({ metricKey, onClose }) {
    const m = METRICS[metricKey];
    const arrowIcon = m.dir === 'up' ? 'trending_up' : 'trending_down';
    const topRef = useProximityGroup();

    return (
      React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'exp-top', ref: topRef },
          React.createElement('div', { className: 'exp-crumb' },
            'Dashboard ',
            React.createElement('span', { style: { color: '#D4D4D4', margin: '0 1px' } }, '/'),
            ' ',
            React.createElement('span', { className: 'material-symbols-outlined' }, m.icon),
            React.createElement('strong', null, m.label)
          ),
          React.createElement('button', { type: 'button', className: 'exp-close', 'data-proximity': true, onClick: onClose, 'aria-label': 'Close' },
            React.createElement('span', { className: 'material-icons' }, 'close')
          )
        ),
        React.createElement('div', { className: 'exp-body' },
          React.createElement('div', { className: 'exp-goal' }, m.goal),
          React.createElement('div', { className: 'exp-num' }, m.num),
          React.createElement('div', { className: 'exp-badge-row' },
            React.createElement('span', { className: `exp-badge ${m.dir}` },
              React.createElement('span', { className: 'material-icons' }, arrowIcon),
              m.delta
            ),
            React.createElement('span', { className: 'exp-period' }, m.period)
          ),
          React.createElement('div', { className: 'exp-insight', dangerouslySetInnerHTML: { __html: m.insight } })
        ),
        React.createElement('div', { className: 'exp-chart-wrap' },
          React.createElement('div', { className: 'exp-chart-svg-wrap' },
            React.createElement('svg', { viewBox: '0 0 300 120', preserveAspectRatio: 'none' },
              React.createElement('defs', null,
                React.createElement('linearGradient', { id: m.gradId, x1: '0', x2: '0', y1: '0', y2: '1' },
                  React.createElement('stop', { offset: '0%', stopColor: m.color, stopOpacity: '0.32' }),
                  React.createElement('stop', { offset: '100%', stopColor: m.color, stopOpacity: '0.03' })
                ),
                React.createElement('linearGradient', { id: `${m.gradId}D`, x1: '0', x2: '0', y1: '0', y2: '1' },
                  React.createElement('stop', { offset: '0%', stopColor: m.color, stopOpacity: '0.12' }),
                  React.createElement('stop', { offset: '100%', stopColor: m.color, stopOpacity: '0.01' })
                )
              ),
              React.createElement('path', { d: m.solidArea, fill: `url(#${m.gradId})` }),
              React.createElement('path', { d: m.dashArea, fill: `url(#${m.gradId}D)` }),
              React.createElement('path', { d: m.solidLine, fill: 'none', stroke: m.color, strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' }),
              React.createElement('path', { d: m.dashLine, fill: 'none', stroke: m.color, strokeWidth: '2', strokeDasharray: '5,4', strokeLinecap: 'round', strokeOpacity: '0.6' })
            ),
            React.createElement('div', {
              className: 'exp-chart-dot',
              style: { left: `${(m.dotX / 300) * 100}%`, top: `${(m.dotY / 120) * 100}%`, '--dot-color': m.color },
            })
          ),
          React.createElement('div', { className: 'exp-axis' },
            m.axes.map((a) => React.createElement('span', { key: a }, a))
          )
        )
      )
    );
  }

  function MetricCard() {
    const [open, setOpen] = useState(false);
    const [activeKey, setActiveKey] = useState(null);
    const gridRef = useProximityGroup();
    const expOuterRef = useSquircle();
    const expCardRef = useSquircle();

    function toggle(value) {
      setOpen(value);
      // activeKey is cleared on the overlay's exit transitionend (onTransitionEnd
      // below) so the card stays filled through the close animation.
    }

    function openExpanded(key) {
      setActiveKey(key);
      setOpen(true);
    }

    function handleOverlayClick(e) {
      if (e.target === e.currentTarget) toggle(false);
    }

    // Same stash-cleanup-on-element pattern as _fab.jsx/_prize-sheet.jsx (React
    // 18 harness calls callback refs with `null` on unmount instead of invoking
    // a returned cleanup closure — React-19-only behavior).
    const overlayElRef = useRef(null);
    const overlayCb = useCallback((el) => {
      if (el) {
        overlayElRef.current = el;
        expOverlayRef(el, toggle);
      } else {
        cleanupExpOverlay(overlayElRef.current);
        overlayElRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement('div', { className: 'card', style: { padding: 0, background: '#FAFAFA' } },
      React.createElement('div', { className: 'frame mc-frame' },
        React.createElement('div', { className: 'grid', ref: gridRef },
          React.createElement('div', { className: 'shell zoom', 'data-proximity': true },
            React.createElement('button', {
              type: 'button', className: 'metric',
              'aria-label': 'New Leads: 142, up 12% vs last month',
              onClick: () => openExpanded('leads'),
            },
              React.createElement('div', { className: 'm-left' },
                React.createElement('div', { className: 'm-label' },
                  React.createElement('span', { className: 'material-symbols-outlined' }, 'group'),
                  'New Leads'
                ),
                React.createElement('div', { className: 'm-num' }, '142'),
                React.createElement('div', { className: 'm-row' },
                  React.createElement('span', { className: 'm-delta up' },
                    React.createElement('span', { className: 'material-icons' }, 'trending_up'),
                    '+12%'
                  ),
                  React.createElement('span', { className: 'm-sub' }, 'vs last month')
                )
              ),
              React.createElement('div', { className: 'm-spark' },
                React.createElement('svg', { viewBox: '0 0 100 40', preserveAspectRatio: 'none' },
                  React.createElement('defs', null,
                    React.createElement('linearGradient', { id: 'mc1', x1: '0', x2: '0', y1: '0', y2: '1' },
                      React.createElement('stop', { offset: '0%', stopColor: 'var(--brand-primary-500)', stopOpacity: '0.45' }),
                      React.createElement('stop', { offset: '100%', stopColor: 'var(--brand-primary-500)', stopOpacity: '0' })
                    )
                  ),
                  React.createElement('path', { d: 'M0,30 C18,32 30,22 48,18 C66,14 82,8 100,6 L100,40 L0,40 Z', fill: 'url(#mc1)' }),
                  React.createElement('path', { d: 'M0,30 C18,32 30,22 48,18 C66,14 82,8 100,6', fill: 'none', stroke: 'var(--brand-primary-500)', strokeWidth: '2.2', strokeLinecap: 'round' })
                )
              )
            )
          ),
          React.createElement('div', { className: 'shell zoom', 'data-proximity': true },
            React.createElement('button', {
              type: 'button', className: 'metric',
              'aria-label': 'Predicted Value: $1.2M, down 8.1%',
              onClick: () => openExpanded('value'),
            },
              React.createElement('div', { className: 'm-left' },
                React.createElement('div', { className: 'm-label' },
                  React.createElement('span', { className: 'material-symbols-outlined' }, 'payments'),
                  'Predicted Value'
                ),
                React.createElement('div', { className: 'm-num' },
                  React.createElement('span', { style: { marginRight: '3px' } }, '$'), '1.2M'
                ),
                React.createElement('div', { className: 'm-row' },
                  React.createElement('span', { className: 'm-delta down' },
                    React.createElement('span', { className: 'material-icons' }, 'trending_down'),
                    '-8.1%'
                  )
                )
              ),
              React.createElement('div', { className: 'm-spark' },
                React.createElement('svg', { viewBox: '0 0 100 40', preserveAspectRatio: 'none' },
                  React.createElement('defs', null,
                    React.createElement('linearGradient', { id: 'mc3', x1: '0', x2: '0', y1: '0', y2: '1' },
                      React.createElement('stop', { offset: '0%', stopColor: '#EF4444', stopOpacity: '0.45' }),
                      React.createElement('stop', { offset: '100%', stopColor: '#EF4444', stopOpacity: '0' })
                    )
                  ),
                  React.createElement('path', { d: 'M0,8 C18,10 32,16 48,22 C64,26 78,30 100,32 L100,40 L0,40 Z', fill: 'url(#mc3)' }),
                  React.createElement('path', { d: 'M0,8 C18,10 32,16 48,22 C64,26 78,30 100,32', fill: 'none', stroke: '#EF4444', strokeWidth: '2.2', strokeLinecap: 'round' })
                )
              )
            )
          )
        )
      ),
      React.createElement('div', {
        className: `exp-overlay${open ? ' open' : ''}`,
        onClick: handleOverlayClick,
        onTransitionEnd: (e) => { if (!open && e.propertyName === 'opacity') setActiveKey(null); },
        ref: overlayCb,
      },
        React.createElement('div', { className: 'exp-outer', ref: expOuterRef },
          React.createElement('div', { className: 'exp-card', ref: expCardRef },
            activeKey && React.createElement(ExpandedCard, { metricKey: activeKey, onClose: () => toggle(false) })
          )
        )
      )
    );
  }

  window.MetricCard = MetricCard;
})();
