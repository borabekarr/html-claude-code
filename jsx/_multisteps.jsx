(function () {
  const { useState, useRef, useCallback } = React;

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

  // ---------------------------------------------------------------------------
  // Inlined from multisteps-hook.ts — imperative DOM logic for the morphing
  // capsule indicator, ripple, and celebrate.
  // ---------------------------------------------------------------------------

  const H    = 38;
  const PAD  = H / 2;
  const S_IN = 24;
  const GAP  = 22;
  const S_OUT= 28;
  const REST = 13;

  function geometry(c, n) {
    const active    = c + 1;
    const capW      = 2 * PAD + c * S_IN;
    const remaining = n - active;
    const total     = remaining > 0
      ? capW + GAP + (remaining - 1) * S_OUT + REST / 2
      : capW;
    return { active, capW, remaining, total };
  }

  function mountStage(el, n, onDotClick, capsuleEl) {
    if (!el || !capsuleEl) return;
    if (el.__msDots) return;

    const dots = [];

    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'ms-dot intro';
      d.dataset.i = String(i);
      d.setAttribute('data-proximity', '');
      d.style.animationDelay = `${i * 90}ms`;
      const idx = i;
      d.addEventListener('click', () => onDotClick(idx));
      el.appendChild(d);
      dots.push(d);
    }

    el.__msDots = dots;
    el.__msPrev  = 0;

    el.__msLayout = function layout(c, animatePop) {
      const g = geometry(c, n);
      el.style.width         = `${g.total}px`;
      capsuleEl.style.width  = `${g.capW}px`;

      for (let i = 0; i < n; i++) {
        const d = dots[i];
        let x;
        if (i <= c) {
          d.classList.add('is-active');
          x = PAD + i * S_IN;
        } else {
          d.classList.remove('is-active');
          const r = i - g.active;
          x = g.capW + GAP + r * S_OUT;
        }
        d.style.left = `${x}px`;
      }

      const prev = el.__msPrev ?? 0;
      if (animatePop && c > prev) {
        const frontier = dots[c];
        frontier.classList.remove('pop');
        void frontier.offsetWidth;
        frontier.classList.add('pop');
      }
      el.__msPrev = c;
    };

    el.__msCleanup = () => {
      dots.forEach((d) => { try { el.removeChild(d); } catch { /* noop */ } });
      delete el.__msDots;
      delete el.__msLayout;
      delete el.__msPrev;
      delete el.__msCleanup;
    };
  }

  function cleanupStage(el) {
    if (!el) return;
    el.__msCleanup?.();
  }

  function mountSurface(el) {
    if (!el) return;

    function addMounted() {
      el.classList.add('mounted');
    }

    requestAnimationFrame(() => requestAnimationFrame(addMounted));
    setTimeout(addMounted, 80);

    el.__msIntroTimer = setTimeout(() => {
      el.querySelectorAll('.ms-dot.intro').forEach((d) => d.classList.remove('intro'));
    }, 1400);
  }

  function cleanupSurface(el) {
    if (!el) return;
    if (el.__msIntroTimer != null) {
      clearTimeout(el.__msIntroTimer);
      delete el.__msIntroTimer;
    }
    el.classList.remove('mounted');
  }

  function ripple(btn, ev) {
    const r = document.createElement('span');
    r.className = 'ms-ripple';
    const rect  = btn.getBoundingClientRect();
    const size  = Math.max(rect.width, rect.height) * 1.15;
    const px    = ev.clientX ? ev.clientX - rect.left : rect.width  / 2;
    const py    = ev.clientY ? ev.clientY - rect.top  : rect.height / 2;
    r.style.width  = `${size}px`;
    r.style.height = `${size}px`;
    r.style.left   = `${px}px`;
    r.style.top    = `${py}px`;
    btn.appendChild(r);
    setTimeout(() => { if (r.parentNode) r.parentNode.removeChild(r); }, 640);
  }

  function celebrate(btn, capsuleEl) {
    btn.classList.remove('celebrate');
    void btn.offsetWidth;
    btn.classList.add('celebrate');

    capsuleEl.style.boxShadow =
      '0 0 0 6px rgba(16,185,129,0.18), ' +
      'var(--shadow-emerald-glow-sm), ' +
      'inset 0 1px 0 rgba(255,255,255,0.55), ' +
      'inset 0 -2px 0 rgba(0,0,0,0.20), ' +
      'inset 0 0 0 1px rgba(255,255,255,0.15)';
    setTimeout(() => { capsuleEl.style.boxShadow = ''; }, 560);
  }

  // ---------------------------------------------------------------------------
  // Step data
  // ---------------------------------------------------------------------------

  const STEPS = [
    {
      icon: 'lightbulb',
      title: 'Welcome aboard',
      desc: "Let's get your workspace set up in three quick steps.",
    },
    {
      icon: 'tune',
      title: 'Personalize it',
      desc: 'Pick the defaults that match how your team likes to work.',
    },
    {
      icon: 'rocket_launch',
      title: "You're all set",
      desc: 'Review everything, then finish to start using Deha.',
    },
  ];

  const N = STEPS.length;

  function StepPane({ step }) {
    return (
      <div className="ms-pane swap-in">
        <div className="ms-icon">
          <span className="material-symbols-outlined">{step.icon}</span>
        </div>
        <div className="ms-title">{step.title}</div>
        <div className="ms-desc">{step.desc}</div>
      </div>
    );
  }

  function Multisteps() {
    const [cur, setCur] = useState(0);
    const [paneKey, setPaneKey] = useState(0);
    const [, setDir] = useState(1);

    const capsuleRef   = useRef(null);
    const nextBtnRef   = useRef(null);
    const dotsGroupRef    = useProximityGroup();
    const actionsGroupRef = useProximityGroup();

    // React 18 (this harness) calls callback refs with `null` on unmount instead
    // of invoking a returned cleanup function (React-19-only). Cleanup here is
    // driven by the el/null branches directly, mirroring the source hook.
    const surfaceRefCb = useCallback((el) => {
      if (el) mountSurface(el);
      else cleanupSurface(el);
    }, []);

    function go(next) {
      const clamped = Math.max(0, Math.min(N - 1, next));
      if (clamped === cur) return;

      const newDir = clamped > cur ? 1 : -1;
      const stage = capsuleRef.current?.parentElement;
      if (stage?.__msLayout) {
        stage.__msPrev = cur;
        stage.__msLayout(clamped, true);
      }

      setDir(newDir);
      setCur(clamped);
      setPaneKey((k) => k + 1);
    }

    function handleDotClick(idx) {
      go(idx);
    }

    const stageRefCb = useCallback(
      (el) => {
        if (el) {
          mountStage(el, N, handleDotClick, capsuleRef.current);
          el.__msLayout?.(0, false);
        } else {
          cleanupStage(el);
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    function handleNext() {
      if (cur < N - 1) {
        go(cur + 1);
      } else {
        if (nextBtnRef.current && capsuleRef.current) {
          celebrate(nextBtnRef.current, capsuleRef.current);
        }
      }
    }

    function handleBack() {
      go(cur - 1);
    }

    function handleNextPointerDown(e) {
      ripple(e.currentTarget, e.nativeEvent);
    }

    function handleBackPointerDown(e) {
      ripple(e.currentTarget, e.nativeEvent);
    }

    const isFirst  = cur === 0;
    const isFinish = cur === N - 1;

    return (
      <div className="card">
        <span className="label" style={{ alignSelf: 'flex-start' }}>
          Multistep · Onboarding
        </span>
        <div className="shell zoom" style={{ width: '100%', boxSizing: 'border-box', marginTop: 10 }}>
          <div className="ms-surface" ref={surfaceRefCb}>
            <div className="ms-eyebrow">Steps</div>

            <div className="ms-indicator" ref={dotsGroupRef}>
              <div className="ms-stage" ref={stageRefCb}>
                <div className="ms-capsule" ref={capsuleRef} />
              </div>
            </div>

            <div className="ms-content">
              <StepPane key={paneKey} step={STEPS[cur]} />
            </div>

            <div className="ms-actions" ref={actionsGroupRef}>
              <div className="ms-btn-slot ms-btn-slot--back">
                <button
                  type="button"
                  className={`ms-btn ms-btn--back${isFirst ? '' : ' show'}`}
                  data-proximity
                  onClick={handleBack}
                  onPointerDown={handleBackPointerDown}
                  aria-label="Go back"
                >
                  Back
                </button>
              </div>
              <div className="ms-btn-slot ms-btn-slot--primary">
                <button
                  type="button"
                  ref={nextBtnRef}
                  className={`ms-btn ms-btn--primary${isFinish ? ' is-finish' : ''}`}
                  data-proximity
                  onClick={handleNext}
                  onPointerDown={handleNextPointerDown}
                  aria-label={isFinish ? 'Finish setup' : 'Continue to next step'}
                >
                  <span className="ms-check">
                    <span className="material-symbols-outlined">check</span>
                  </span>
                  <span className="ms-next-label">{isFinish ? 'Finish' : 'Continue'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.Multisteps = Multisteps;
})();
