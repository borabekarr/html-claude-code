(function () {
  const { useCallback, useEffect, useRef } = React;

  // ---------------------------------------------------------------------------
  // Inlined from prize-sheet-hook.ts — confetti engine + open/close/claim
  // lifecycle for the PrizeSheet component.
  // ---------------------------------------------------------------------------

  const COLORS = ['#10B981', '#22D3EE', '#A3E635', '#34D399', '#67E8F9', '#FFFFFF'];
  const DPR = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);

  // ── Confetti engine ────────────────────────────────────────────────────────

  function makeConfetti(canvas) {
    const ctx = canvas.getContext('2d');
    let parts = [];
    let raf = null;

    function size() {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * DPR;
      canvas.height = r.height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        const fade = p.life > p.ttl - 26 ? Math.max(0, (p.ttl - p.life) / 26) : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'strip') ctx.fillRect(-p.w / 2, -p.h / 4, p.w, p.h / 2);
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        if (p.life >= p.ttl || p.y > canvas.height / DPR + 30) parts.splice(i, 1);
      }
      if (parts.length) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    function burst(count, power) {
      size();
      const r = canvas.getBoundingClientRect();
      const ox = r.width / 2;
      const oy = r.height * 0.30;
      for (let i = 0; i < count; i++) {
        const ang = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI * 1.25;
        const sp = (2.6 + Math.random() * 4.2) * power;
        parts.push({
          x: ox + (Math.random() - 0.5) * 40,
          y: oy + (Math.random() - 0.5) * 20,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - Math.random() * 2,
          g: 0.12 + Math.random() * 0.06,
          w: 5 + Math.random() * 6,
          h: 2 + Math.random() * 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          life: 0,
          ttl: 90 + Math.random() * 50,
          shape: Math.random() > 0.5 ? 'rect' : 'strip',
        });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }

    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      parts = [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return { burst, size, stop };
  }

  // ── Scope setup — callback ref ─────────────────────────────────────────────
  // Called once per panel element (sheet or modal) via callback ref.
  // Returns a cleanup function stored on the element.

  function setupPanelScope(panel, opts) {
    const { getFrame, openClass, isMobile, setIsOpen, setClaimed } = opts;
    const canvas = panel.querySelector('.confetti');
    const cf = makeConfetti(canvas);
    const claimBtn = panel.querySelector('[data-claim]');
    let openTimer = null;
    let dismissTimer = null;

    function open() {
      const frame = getFrame();
      if (!frame) return;
      // reset
      panel.classList.remove('claimed');
      panel.style.transform = '';
      frame.classList.add(openClass);
      setIsOpen(true);
      if (openTimer) clearTimeout(openTimer);
      openTimer = setTimeout(() => cf.burst(26, 1), 260);
      setTimeout(() => cf.burst(20, 0.85), 480);
    }

    function dismiss() {
      const frame = getFrame();
      if (!frame) return;
      frame.classList.remove(openClass);
      setIsOpen(false);
      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => setClaimed(false), 560);
    }

    function claim() {
      claimBtn.classList.add('pressed');
      cf.burst(70, 1.5);
      setTimeout(() => cf.burst(40, 1.2), 180);
      setTimeout(() => {
        claimBtn.classList.remove('pressed');
        setClaimed(true);
        cf.burst(30, 1);
      }, 220);
      setTimeout(dismiss, 2600);
    }

    // Hover burst
    function onPanelEnter() {
      if (panel.classList.contains('is-open') && !panel.classList.contains('claimed')) {
        cf.burst(6, 0.7);
      }
    }

    claimBtn.addEventListener('click', claim);
    panel.addEventListener('mouseenter', onPanelEnter);

    // expose open/dismiss for external wiring (fab, overlay, x button, escape)
    panel.__psOpen = open;
    panel.__psDismiss = dismiss;

    // drag-to-dismiss (mobile bottom sheet only)
    let dragCleanup = null;
    if (isMobile) {
      let dragging = false;
      let startY = 0;
      let curY = 0;
      const grip = panel.querySelector('[data-grip]');
      const H = () => panel.getBoundingClientRect().height;

      function onDown(e) {
        const frame = getFrame();
        if (!frame?.classList.contains(openClass)) return;
        dragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        curY = 0;
        frame.classList.add('dragging');
      }
      function onMove(e) {
        if (!dragging) return;
        const y = e.touches ? e.touches[0].clientY : e.clientY;
        curY = Math.max(0, y - startY);
        panel.style.transform = `translateY(${curY}px)`;
        if (e.cancelable) e.preventDefault();
      }
      function onUp() {
        if (!dragging) return;
        dragging = false;
        const frame = getFrame();
        frame?.classList.remove('dragging');
        if (curY > H() * 0.32) dismiss();
        else panel.style.transform = '';
      }

      grip.addEventListener('mousedown', onDown);
      panel.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);

      dragCleanup = () => {
        grip.removeEventListener('mousedown', onDown);
        panel.removeEventListener('touchstart', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchend', onUp);
      };
    }

    // canvas resize
    const onResize = () => cf.size();
    window.addEventListener('resize', onResize);

    return function cleanup() {
      if (openTimer) clearTimeout(openTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
      cf.stop();
      claimBtn.removeEventListener('click', claim);
      panel.removeEventListener('mouseenter', onPanelEnter);
      window.removeEventListener('resize', onResize);
      dragCleanup?.();
    };
  }

  // ---------------------------------------------------------------------------
  // PrizeSheet — Mobile bottom sheet + desktop centered dialog
  //
  // DOM mirrors the source exactly:
  //   Mobile:  .ps-device > .ps-screen > (.ps-app, .ps-fab, .ps-overlay, .sheet.panel)
  //   Desktop: .ps-desktop > (.ps-dbar, .ps-dscreen > (.ps-dapp, .ps-fab, .ps-doverlay, .ps-modal-shell > .modal.panel))
  //
  // NO raw useEffect — all imperative logic lives in setupPanelScope above,
  // wired via callback refs.
  // ---------------------------------------------------------------------------

  // ── Shared prize content ────────────────────────────────────────────────────

  function PrizeContent() {
    return (
      <>
        <div className="prize">
          <div className="amount"><span className="cur">$</span>100</div>
          <div className="wontag">YOU WON</div>
          <div className="prize-title">Claim your prize!</div>
          <div className="prize-desc">Your first reward is here: $100 just for joining. Claim your prize and dive into crypto!</div>
        </div>
        <button type="button" className="claim-btn" data-claim data-proximity>
          <span className="material-symbols-outlined">redeem</span>Claim prize
        </button>
        <div className="success">
          <div className="check"><span className="material-icons">check</span></div>
          <div className="success-title">Prize claimed</div>
          <div className="success-desc">$100 has landed in your wallet. Welcome aboard.</div>
          <div className="wallet">
            <div className="wallet-l">
              <div className="wallet-ic"><span className="material-symbols-outlined">account_balance_wallet</span></div>
              <div style={{ textAlign: 'left' }}>
                <div className="wallet-lbl">Wallet balance</div>
                <div className="wallet-bal">$100.00<span className="gain">+$100</span></div>
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: '22px' }}>trending_up</span>
          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // use-squircle.ts (inlined, same engine as _cards.jsx) — module-singleton
  // ResizeObserver-driven clip-path squircle. The callback ref itself never
  // returns a cleanup closure; cleanup is stashed on a ref and invoked
  // manually at the top of every call — already correct under React 18.3.1.
  // ---------------------------------------------------------------------------

  const DEFAULT_SMOOTHING = 0.6;
  const squircleElements = new Map();
  let squircleObserver = null;

  function squirclePathRect(w, h, r) {
    const k = 0.5522847498307936;
    const c = r * k;
    return `M${r} 0L${w - r} 0C${w - r + c} 0 ${w} ${r - c} ${w} ${r}L${w} ${h - r}C${w} ${h - r + c} ${w - r + c} ${h} ${w - r} ${h}L${r} ${h}C${r - c} ${h} 0 ${h - r + c} 0 ${h - r}L0 ${r}C0 ${r - c} ${r - c} 0 ${r} 0Z`;
  }

  function readRadius(computed) {
    const parsed = parseFloat(computed.getPropertyValue('--corner-radius')) || parseFloat(computed.borderTopLeftRadius);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function readSmoothing(computed) {
    const parsed = parseFloat(computed.getPropertyValue('--corner-smoothing'));
    return Number.isNaN(parsed) ? DEFAULT_SMOOTHING : parsed;
  }

  function applySquircle(el, width, height) {
    if (width <= 0 || height <= 0) return;
    const computed = window.getComputedStyle(el);
    const radius = readRadius(computed);
    el.style.clipPath = `path("${squirclePathRect(width, height, Math.min(radius, width / 2, height / 2))}")`;
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
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function' || !CSS.supports('clip-path', 'path("M0 0 L1 0 Z")')) {
      return () => {};
    }
    squircleElements.set(el, { el });
    measureAndApply(el);
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
  // use-proximity-group.ts (inlined, same engine as _pills.jsx / _streak-card.jsx).
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

  // ── Mobile scope ─────────────────────────────────────────────────────────────
  // Callback ref stores the node + composes the squircle ref synchronously on
  // attach (no cleanup return there). The imperative wiring (confetti + drag +
  // open/close) lives in a plain useEffect, whose returned cleanup works
  // correctly under React 18.3.1 without any el===null stash trick.

  function MobileScope() {
    const deviceRef = useRef(null);
    const sheetRef = useRef(null);
    const fabRef = useRef(null);
    const overlayRef = useRef(null);
    const squircleSheetRef = useSquircle();
    const proximityRef = useProximityGroup();

    const handleSheetRef = useCallback((el) => {
      sheetRef.current = el;
      squircleSheetRef(el);
    }, [squircleSheetRef]);

    useEffect(() => {
      const el = sheetRef.current;
      if (!el) return;

      const cleanup = setupPanelScope(el, {
        getFrame: () => deviceRef.current,
        openClass: 'sheet-open',
        isMobile: true,
        setIsOpen: (open) => {
          if (open) el.classList.add('is-open');
          else el.classList.remove('is-open');
        },
        setClaimed: (claimed) => {
          if (claimed) el.classList.add('claimed');
          else el.classList.remove('claimed');
        },
      });

      const fabEl = fabRef.current;
      const overlayEl = overlayRef.current;
      const openFn = el.__psOpen;
      const dismissFn = el.__psDismiss;
      if (fabEl && openFn) fabEl.addEventListener('click', openFn);
      if (overlayEl && dismissFn) overlayEl.addEventListener('click', dismissFn);

      return () => {
        if (fabEl && openFn) fabEl.removeEventListener('click', openFn);
        if (overlayEl && dismissFn) overlayEl.removeEventListener('click', dismissFn);
        cleanup();
      };
    }, []);

    return (
      <div className="demo" ref={proximityRef}>
        <div className="demo-cap">
          <span className="material-symbols-outlined">smartphone</span>Mobile · bottom sheet
        </div>
        <div className="ps-device" ref={deviceRef}>
          <div className="ps-notch"></div>
          <div className="ps-screen">
            <div className="ps-app">
              <div className="ps-app-title"></div>
              <div className="ps-app-sub"></div>
              <div className="ps-app-tile"></div>
              <div className="ps-app-row"><div></div><div></div></div>
              <div className="ps-app-tile" style={{ height: '64px' }}></div>
            </div>
            <button type="button" className="ps-fab" ref={fabRef} data-proximity>
              <span className="material-symbols-outlined">redeem</span>Claim
            </button>
            <div className="ps-overlay" ref={overlayRef}></div>
            <div className="sheet panel" ref={handleSheetRef}>
              <div className="grip" data-grip></div>
              <canvas className="confetti" aria-hidden="true"></canvas>
              <PrizeContent />
            </div>
            <div className="ps-home-ind"></div>
          </div>
        </div>
        <div className="demo-hint">tap &quot;Claim&quot; · drag the grip or tap the dim to dismiss</div>
      </div>
    );
  }

  // ── Desktop scope ─────────────────────────────────────────────────────────────

  function DesktopScope() {
    const desktopRef = useRef(null);
    const modalRef = useRef(null);
    const fabRef = useRef(null);
    const overlayRef = useRef(null);
    const squircleModalRef = useSquircle();
    const squircleShellRef = useSquircle();
    const proximityRef = useProximityGroup();

    const handleModalRef = useCallback((el) => {
      modalRef.current = el;
      squircleModalRef(el);
    }, [squircleModalRef]);

    useEffect(() => {
      const el = modalRef.current;
      if (!el) return;

      const cleanup = setupPanelScope(el, {
        getFrame: () => desktopRef.current,
        openClass: 'modal-open',
        isMobile: false,
        setIsOpen: (open) => {
          if (open) el.classList.add('is-open');
          else el.classList.remove('is-open');
        },
        setClaimed: (claimed) => {
          if (claimed) el.classList.add('claimed');
          else el.classList.remove('claimed');
        },
      });

      const fabEl = fabRef.current;
      const overlayEl = overlayRef.current;
      const openFn = el.__psOpen;
      const dismissFn = el.__psDismiss;

      if (fabEl && openFn) fabEl.addEventListener('click', openFn);
      if (overlayEl && dismissFn) overlayEl.addEventListener('click', dismissFn);

      // x-button is inside modal, wire via delegation
      const xBtn = el.querySelector('[data-x]');
      if (xBtn && dismissFn) xBtn.addEventListener('click', dismissFn);

      // Escape key
      function onEscape(e) {
        if (e.key === 'Escape') dismissFn?.();
      }
      document.addEventListener('keydown', onEscape);

      return () => {
        if (fabEl && openFn) fabEl.removeEventListener('click', openFn);
        if (overlayEl && dismissFn) overlayEl.removeEventListener('click', dismissFn);
        if (xBtn && dismissFn) xBtn.removeEventListener('click', dismissFn);
        document.removeEventListener('keydown', onEscape);
        cleanup();
      };
    }, []);

    return (
      <div className="demo" ref={proximityRef}>
        <div className="demo-cap">
          <span className="material-symbols-outlined">desktop_windows</span>Desktop · centered dialog
        </div>
        <div className="ps-desktop" ref={desktopRef}>
          <div className="ps-dbar">
            <span className="tl r"></span>
            <span className="tl y"></span>
            <span className="tl g"></span>
            <div className="ps-durl">
              <span className="material-symbols-outlined">lock</span>app.deha.io/rewards
            </div>
          </div>
          <div className="ps-dscreen">
            <div className="ps-dapp">
              <div className="ps-dapp-rail"></div>
              <div className="ps-dapp-main">
                <div className="ps-dapp-h"></div>
                <div className="ps-dapp-grid"><div></div><div></div><div></div></div>
                <div className="ps-dapp-wide"></div>
              </div>
            </div>
            <button type="button" className="ps-fab ps-fab-grid" ref={fabRef} data-proximity>
              <span className="material-symbols-outlined">redeem</span>Claim prize
            </button>
            <div className="ps-doverlay" ref={overlayRef}></div>
            <div className="ps-modal-shell" ref={squircleShellRef}>
              <div className="modal panel" ref={handleModalRef}>
                <button type="button" className="panel-x" data-x aria-label="Close">
                  <span className="material-icons">close</span>
                </button>
                <canvas className="confetti" aria-hidden="true"></canvas>
                <PrizeContent />
              </div>
            </div>
          </div>
        </div>
        <div className="demo-hint">click &quot;Claim reward&quot; · tap the dim or press Esc to dismiss</div>
      </div>
    );
  }

  // ── Root export ──────────────────────────────────────────────────────────────
  // Both presentations always render and stack vertically inside the card frame,
  // matching the prototype layout exactly. CSS handles responsive sizing.

  function PrizeSheet() {
    return (
      <div className="card" style={{ padding: 0, background: '#FAFAFA' }}>
        <div className="frame">
          <MobileScope />
          <DesktopScope />
        </div>
      </div>
    );
  }

  window.PrizeSheet = PrizeSheet;
})();
