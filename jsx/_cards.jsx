(function () {
  const { useCallback, useRef } = React;

  // ---------------------------------------------------------------------------
  // squircle.ts (inlined, TS stripped) — Apple/Figma-style corner-smoothed
  // rounded-rect path generator. Ported from the corner-smoothing skill
  // reference. Two branches: circular corner (smoothing <= 0.001, one cubic
  // bezier per corner) and superellipse corner (smoothing > 0.001, sampled at
  // 22 line segments per corner). Reversal + ring composition are generic.
  // ---------------------------------------------------------------------------

  const STEPS_PER_CORNER = 22;
  const KAPPA = 0.5522847498307936;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function round(v) {
    return +v.toFixed(3);
  }

  function rectShape(w, h) {
    return {
      start: [0, 0],
      segments: [
        { type: 'L', to: [w, 0] },
        { type: 'L', to: [w, h] },
        { type: 'L', to: [0, h] },
      ],
    };
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

    return {
      start: deduped[0] ?? [r, 0],
      segments: deduped.slice(1).map((to) => ({ type: 'L', to })),
    };
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
    const fmt = ([x, y]) => `${round(x + ox)} ${round(y + oy)}`;
    let d = `M${fmt(shape.start)}`;
    for (const seg of shape.segments) {
      d += seg.type === 'L' ? `L${fmt(seg.to)}` : `C${fmt(seg.c1)} ${fmt(seg.c2)} ${fmt(seg.to)}`;
    }
    return `${d}Z`;
  }

  function squirclePath(width, height, radius, smoothing = 0.6) {
    return shapeToPath(buildShape(width, height, radius, smoothing));
  }

  function concentricRadius(outer, inset, min = 0) {
    return Math.max(outer - inset, min);
  }

  function squircleRingPath(width, height, radius, inset, smoothing = 0.6, origin = [0, 0]) {
    const outer = shapeToPath(buildShape(width, height, radius, smoothing), origin);
    const innerW = Math.max(0, width - inset * 2);
    const innerH = Math.max(0, height - inset * 2);
    const innerR = concentricRadius(radius, inset);
    const inner = shapeToPath(reverseShape(buildShape(innerW, innerH, innerR, smoothing)), [
      origin[0] + inset,
      origin[1] + inset,
    ]);
    return inner ? `${outer} ${inner}` : outer;
  }

  // ---------------------------------------------------------------------------
  // use-squircle.ts (inlined, TS stripped) — callback-ref wrapper around a
  // module-singleton squircle engine: one shared ResizeObserver drives
  // clip-path + ring custom properties on every registered element. Cleanup is
  // stashed in a ref object (stateRef.current.cleanup) and invoked manually at
  // the start of every callback-ref call — this is NOT a callback-ref that
  // returns a cleanup closure (the React-19-only auto-invoked pattern), so it
  // already works correctly under harness React 18.3.1.
  // ---------------------------------------------------------------------------

  const DEFAULT_SMOOTHING = 0.6;
  const BORDER_WIDTH = 1;
  const RING_INSET = 0.5;

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
    return Number.isNaN(parsed) ? DEFAULT_SMOOTHING : parsed;
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
        `path("${squircleRingPath(
          width - RING_INSET * 2,
          height - RING_INSET * 2,
          Math.max(radius - RING_INSET, 0),
          BORDER_WIDTH,
          smoothing,
          [RING_INSET, RING_INSET]
        )}")`
      );
      const hairlineOffset = BORDER_WIDTH + RING_INSET;
      const hairlineInnerW = width - hairlineOffset * 2;
      const hairlineInnerH = height - hairlineOffset * 2;
      const hairlineRadius = Math.max(radius - hairlineOffset, 0);
      el.style.setProperty(
        '--squircle-hairline-path',
        `path("${squircleRingPath(hairlineInnerW, hairlineInnerH, hairlineRadius, BORDER_WIDTH, smoothing, [
          hairlineOffset,
          hairlineOffset,
        ])}")`
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
          if (box) {
            applySquircle(el, box.inlineSize, box.blockSize);
          } else {
            measureAndApply(el);
          }
        }
      });
    }
    return squircleObserver;
  }

  function registerSquircle(el) {
    if (!supportsSquircle()) {
      return () => {};
    }

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
      if (el != null) {
        stateRef.current.cleanup = registerSquircle(el);
      }
    }, []);
  }

  // ---------------------------------------------------------------------------
  // Cards — squircle card family (accent + concentric outer/inner pair)
  // ---------------------------------------------------------------------------

  function Cards() {
    const cardAccentRef = useSquircle();
    const concentricOuterRef = useSquircle();
    const concentricInnerRef = useSquircle();

    return (
      <div className="card cards-outer" style={{ padding: 0 }}>
        <div className="cards-frame">
          <div className="cards-grid">
            <div className="card-accent" ref={cardAccentRef} style={{ '--corner-radius': '24px' }}>
              <div className="card-name" style={{ position: 'relative', zIndex: 1 }}>Accent Card</div>
              <div className="card-desc card-desc-w" style={{ position: 'relative', zIndex: 1 }}>Emerald fill · sheen overlay · 24px radius · emerald-glow shadow.</div>
              <span className="card-tag card-tag-w" style={{ position: 'relative', zIndex: 1 }}>.card-accent · hero / goal / simulator</span>
            </div>
            <div className="concentric-demo">
              <div
                className="concentric-demo-outer"
                ref={concentricOuterRef}
                style={{ '--corner-radius': '36px' }}
              >
                <div className="card-inner concentric-demo-inner" ref={concentricInnerRef}>
                  <div className="card-name">Inner card</div>
                  <div className="card-desc">concentric squircle pair · inner = outer − inset (36 − 8 = 28), smoothing 0.6</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.Cards = Cards;
})();
