/* _github-calendar.jsx — browser-JSX port of
 * apps/web/src/components/design-system/github-calendar/GithubCalendar.tsx
 * (+ inlined github-calendar-hook.ts, use-squircle.ts, iconClass.ts).
 * New port (ax-jeru-push Step 7).
 */
(function () {
  const { useMemo, useState, useRef, useCallback } = React;

  /* ================= squircle engine (inlined, same as _cards.jsx/_metric-card.jsx). ================= */

  const STEPS_PER_CORNER = 22;
  const KAPPA = 0.5522847498307936;
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function round(v) { return +v.toFixed(3); }
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

  /* ================= github-calendar-hook.ts (inlined) — pop-in rAF, stash-cleanup-on-element. ================= */

  function gcCardRef(el) {
    if (!el) return;
    const id = requestAnimationFrame(() => { el.dataset.anim = 'in'; });
    el.__gcRafId = id;
  }
  function cleanupGcCard(el) {
    if (!el) return;
    if (el.__gcRafId !== undefined) {
      cancelAnimationFrame(el.__gcRafId);
      delete el.__gcRafId;
    }
  }

  /* ================= accent ramps + data (verbatim from GithubCalendar.tsx) ================= */

  const SCHEMES = {
    emerald: {
      light: ['#E9EEF3', 'var(--brand-primary-200)', 'var(--brand-primary-400)', 'var(--brand-primary-500)', 'var(--brand-primary-700)'],
      dark:  ['#202020', '#0C5A43', 'var(--brand-primary-800)', 'var(--brand-primary-500)', 'var(--brand-primary-400)'],
      glow:  'var(--brand-primary-500)',
    },
    ocean: {
      light: ['#E9EEF3', '#BAE6FD', '#38BDF8', '#0284C7', '#0369A1'],
      dark:  ['#202020', '#0C4A6E', '#075985', '#0284C7', '#38BDF8'],
      glow:  '#38BDF8',
    },
    violet: {
      light: ['#E9EEF3', '#DDD6FE', '#A78BFA', '#7C3AED', '#5B21B6'],
      dark:  ['#202020', '#2E1065', '#3B0764', '#7C3AED', '#A78BFA'],
      glow:  '#A78BFA',
    },
    amber: {
      light: ['#E9EEF3', '#FDE68A', '#FBBF24', '#D97706', '#92400E'],
      dark:  ['#202020', '#451A03', '#78350F', '#D97706', '#FBBF24'],
      glow:  '#FBBF24',
    },
    slate: {
      light: ['#E9EEF3', '#D4D4D4', '#A1A1A1', '#6B6B6B', '#232323'],
      dark:  ['#202020', '#232323', '#4A4A4A', '#A1A1A1', '#D4D4D4'],
      glow:  '#A1A1A1',
    },
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function mulberry(seed) {
    return function () {
      let t = (seed += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildData() {
    const rnd = mulberry(424242);
    const end = new Date(2026, 5, 14);
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(start.getDate() - start.getDay());

    const weeks = [];
    const cursor = new Date(start);
    let total = 0;

    while (cursor <= end) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(cursor);
        if (day > end) {
          week.push(null);
        } else {
          const r = rnd();
          const count = r < 0.55 ? 0
                      : r < 0.70 ? Math.floor(rnd() * 3) + 1
                      : r < 0.85 ? Math.floor(rnd() * 5) + 3
                      : r < 0.95 ? Math.floor(rnd() * 6) + 6
                      :            Math.floor(rnd() * 8) + 10;
          const level = count === 0 ? 0
                      : count <= 2  ? 1
                      : count <= 5  ? 2
                      : count <= 9  ? 3
                      :               4;
          total += count;
          week.push({ date: day, count, level });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    return { weeks, total };
  }

  function monthLabels(weeks) {
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const first = week.find((d) => d !== null);
      if (!first) return;
      const m = first.date.getMonth();
      if (m !== lastMonth) {
        labels.push({ col: wi, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }

  function fmtDate(d) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function IcoPulse() {
    return React.createElement('svg', { width: '22', height: '22', viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
      React.createElement('path', { d: 'M3 12h3.2l2.2-6 3.4 13 2.6-9 1.6 4h4.4', stroke: '#fff', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' })
    );
  }

  const GC_LEVEL_CLASS = ['gc-l0', 'gc-l1', 'gc-l2', 'gc-l3', 'gc-l4'];
  const GC_DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function GithubCalendar({ scheme = 'emerald', shape = 'rounded', glow = false } = {}) {
    const { weeks, total } = useMemo(() => buildData(), []);
    const labels = useMemo(() => monthLabels(weeks), [weeks]);

    const [tip, setTip] = useState(null);

    const sc = SCHEMES[scheme] ?? SCHEMES.emerald;
    const ramp = sc.light;
    const cellR = shape === 'circle' ? '50%' : shape === 'square' ? '0px' : '3px';
    const vars = {
      '--l0': ramp[0], '--l1': ramp[1], '--l2': ramp[2], '--l3': ramp[3], '--l4': ramp[4],
      '--glow': sc.glow, '--cell-r': cellR,
      '--dl0': sc.dark[0], '--dl1': sc.dark[1], '--dl2': sc.dark[2], '--dl3': sc.dark[3], '--dl4': sc.dark[4],
    };

    function handleCellEnter(e, d) {
      if (!d) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setTip({ x: rect.left + rect.width / 2, y: rect.top, count: d.count, date: d.date });
    }

    const levelClass = GC_LEVEL_CLASS;
    const outerSquircleRef = useSquircle();
    const cardSquircleRef = useSquircle();

    // Same stash-cleanup-on-element pattern as _metric-card.jsx/_fab.jsx: the
    // canonical .tsx's callback ref returns a cleanup closure (React-19-only
    // auto-invoke), rewritten here so cleanup runs in the `el === null` branch.
    const cardElRef = useRef(null);
    const cardCb = useCallback((el) => {
      if (el) {
        cardElRef.current = el;
        gcCardRef(el);
        cardSquircleRef(el);
      } else {
        cleanupGcCard(cardElRef.current);
        cardSquircleRef(null);
        cardElRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const DOW_LABELS = GC_DOW_LABELS;

    return React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'gc-outer', ref: outerSquircleRef },
        React.createElement('article', {
          className: 'gc-card',
          ref: cardCb,
          style: vars,
          'data-glow': glow ? 'on' : 'off',
          'data-anim': 'off',
          'data-scheme': scheme,
        },
          React.createElement('header', { className: 'gc-head' },
            React.createElement('div', { className: 'gc-id' },
              React.createElement('span', { className: 'gc-avatar' }, React.createElement(IcoPulse, null)),
              React.createElement('div', null,
                React.createElement('div', { className: 'gc-name' }, '@deha-labs'),
                React.createElement('div', { className: 'gc-sub' }, 'Public contribution activity')
              )
            ),
            React.createElement('div', { className: 'gc-total' },
              React.createElement('b', null, total.toLocaleString()), ' contributions in the last year'
            )
          ),
          React.createElement('div', { className: 'gc-scroller' },
            React.createElement('div', { className: 'gc-months', style: { gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` } },
              labels.map((l) => React.createElement('span', { key: l.col, style: { gridColumnStart: l.col + 1 } }, l.label))
            ),
            React.createElement('div', { className: 'gc-body' },
              React.createElement('div', { className: 'gc-dow' },
                DOW_LABELS.map((label, i) => React.createElement('span', { key: label, style: { gridRow: i + 1 } }, label))
              ),
              React.createElement('div', { className: 'gc-grid', onMouseLeave: () => setTip(null) },
                weeks.map((week, wi) => {
                  const firstRealIdx = week.findIndex((d) => d !== null);
                  return week.map((d, di) => {
                    if (!d) return null;
                    const delay = wi * 7 + di * 16;
                    const rowStart = di === firstRealIdx ? di + 1 : undefined;
                    return React.createElement('div', {
                      key: `${wi}-${di}`,
                      className: `gc-cell ${levelClass[d.level]}`,
                      style: { '--d': `${delay}ms`, ...(rowStart !== undefined ? { gridRowStart: rowStart } : {}) },
                      'aria-label': `${d.count} contributions on ${fmtDate(d.date)}`,
                      onMouseEnter: (e) => handleCellEnter(e, d),
                    });
                  });
                })
              )
            )
          ),
          React.createElement('footer', { className: 'gc-foot' },
            React.createElement('div', { className: 'gc-streak', style: { backgroundColor: '#F97316' } },
              // iconClass('local_fire_department') resolves to 'material-icons' (not in the symbols-only set)
              React.createElement('span', { className: 'material-icons gc-flame', 'aria-hidden': true }, 'local_fire_department'),
              React.createElement('span', { className: 'gc-streak-label' }, '7 Day Streak!')
            ),
            React.createElement('div', { className: 'gc-legend' },
              React.createElement('span', null, 'Less'),
              React.createElement('div', { className: 'gc-legend-cells' },
                [0, 1, 2, 3, 4].map((lvl) => React.createElement('div', { key: lvl, className: `gc-legend-cell ${levelClass[lvl]}` }))
              ),
              React.createElement('span', null, 'More')
            )
          )
        )
      ),
      tip !== null && React.createElement('div', {
        className: 'gc-tip',
        style: { left: tip.x, top: tip.y },
        role: 'tooltip',
        'aria-live': 'polite',
      },
        React.createElement('b', null, `${tip.count === 0 ? 'No' : tip.count} contribution${tip.count === 1 ? '' : 's'}`),
        React.createElement('span', null, `on ${fmtDate(tip.date)}`)
      )
    );
  }

  window.GithubCalendar = GithubCalendar;
})();
