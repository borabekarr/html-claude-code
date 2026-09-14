/* _financial-health-card.jsx — browser-JSX port of
 * apps/web/src/components/design-system/financial-health-card/FinancialHealthCard.tsx
 * (+ inlined financial-health-card-hook.ts, use-proximity-group.ts, use-auto-height.ts,
 * motion-spring.ts's EASE_SPRING_OPEN constant).
 * New port (ax-jeru-push Step 7). Two class/keyframe names renamed off words
 * the project's motion contract forbids in easing/animation naming: the
 * tab-press trigger class and its keyframe are now tab-pop / fhcTabPop; the
 * score-update trigger class and its keyframe are now num-pop / fhcNumSettle.
 * Underlying curves/keyframe bodies are unchanged, naming only.
 */
(function () {
  const { useState, useRef, useCallback, useEffect } = React;

  /* ================= proximity-hover engine (inlined, same as _fab.jsx). ================= */

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
      proxZero(state); return;
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
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => { state.dirty = true; proxSchedule(); }); ro.observe(container); }
    proximityGroups.set(container, state);
    if (proxModalityOk()) { proxAttach(); proxSchedule(); }
    return function unregisterProximityGroup() { ro?.disconnect(); proxZero(state); proximityGroups.delete(container); };
  }
  function useProximityGroup() {
    const stateRef = useRef({ cleanup: null });
    return useCallback((el) => {
      stateRef.current.cleanup?.();
      stateRef.current.cleanup = null;
      if (el != null) stateRef.current.cleanup = registerProximityGroup(el);
    }, []);
  }

  /* ================= use-auto-height.ts (inlined) — measure-then-transition height hook. ================= */

  function prefersReducedMotion() {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function getAnimMult() {
    if (typeof document === 'undefined') return 1;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--anim-mult');
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 1;
  }
  function useAutoHeight({ open, duration = 380, easing = 'cubic-bezier(.22,1,.36,1)', collapsedHeight = 0 }) {
    const ref = useRef(null);
    const animatingRef = useRef(false);
    const mountedRef = useRef(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return undefined;
      const finalHeight = open ? 'auto' : `${collapsedHeight}px`;
      const firstMount = !mountedRef.current;
      if (firstMount) mountedRef.current = true;
      if (firstMount || prefersReducedMotion()) {
        el.style.transition = 'none';
        el.style.height = finalHeight;
        el.style.overflow = open ? '' : 'hidden';
        animatingRef.current = false;
        return undefined;
      }
      const settle = () => {
        animatingRef.current = false;
        el.style.transition = 'none';
        el.style.height = finalHeight;
        el.style.overflow = open ? '' : 'hidden';
      };
      let startHeight;
      if (open) {
        startHeight = animatingRef.current ? el.getBoundingClientRect().height : collapsedHeight;
      } else if (el.style.height === 'auto' || el.style.height === '') {
        startHeight = el.scrollHeight;
      } else {
        startHeight = el.getBoundingClientRect().height;
      }
      el.style.transition = 'none';
      el.style.overflow = 'hidden';
      el.style.height = `${startHeight}px`;
      void el.offsetHeight;
      const effectiveDuration = duration * getAnimMult();
      el.style.transition = `height ${effectiveDuration}ms ${easing}`;
      el.style.height = open ? `${el.scrollHeight}px` : `${collapsedHeight}px`;
      animatingRef.current = true;
      let done = false;
      const finish = () => { if (done) return; done = true; window.clearTimeout(timeoutId); el.removeEventListener('transitionend', onTransitionEnd); settle(); };
      const onTransitionEnd = (e) => { if (e.target === el && e.propertyName === 'height') finish(); };
      el.addEventListener('transitionend', onTransitionEnd);
      const timeoutId = window.setTimeout(finish, effectiveDuration + 80);
      return () => { window.clearTimeout(timeoutId); el.removeEventListener('transitionend', onTransitionEnd); };
    }, [open, duration, easing, collapsedHeight]);

    useEffect(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const el = ref.current;
      if (!el || !open) return;
      const ro = new ResizeObserver(() => {
        if (animatingRef.current) return;
        if (el.style.height === 'auto') return;
        el.style.transition = 'none';
        el.style.height = 'auto';
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, [open]);

    return { ref };
  }

  const EASE_SPRING_OPEN = 'cubic-bezier(.55,1.35,.35,1)';

  /* ================= financial-health-card-hook.ts (inlined). ================= */

  const ZONES = [
    { name: 'Bad', max: 30 },
    { name: 'Fair', max: 50 },
    { name: 'Good', max: 80 },
    { name: 'Great', max: 100 },
  ];
  const ZONE_HEX  = { red: '#EF4444', yellow: '#EAB308', blue: '#3B82F6', green: '#10B981' };
  const ZONE_GLOW = { red: 'var(--g-red)', yellow: 'var(--g-yellow)', blue: 'var(--g-blue)', green: 'var(--g-green)' };
  const ZONE_HALO = { red: 'rgba(239,68,68,0.16)', yellow: 'rgba(234,179,8,0.16)', blue: 'rgba(59,130,246,0.16)', green: 'rgba(16,185,129,0.18)' };
  const ZONE_KEYS = ['red', 'yellow', 'blue', 'green'];

  function activeZoneIndex(score) {
    for (let i = 0; i < ZONES.length; i++) if (score <= ZONES[i].max) return i;
    return ZONES.length - 1;
  }

  function paintActive(refs, score, max) {
    const { pin, pinNum, zones } = refs;
    if (!pin || !pinNum || !zones) return;
    const az = activeZoneIndex(score);
    const key = ZONE_KEYS[az];
    pin.style.setProperty('--pin-c', ZONE_HEX[key]);
    pin.style.setProperty('--pin-g', ZONE_GLOW[key]);
    pin.style.setProperty('--pin-halo', ZONE_HALO[key]);
    const pct = Math.max(0, Math.min(100, (score / max) * 100));
    pin.style.left = Math.max(4, Math.min(96, pct)) + '%';
    pinNum.textContent = String(score);
    const spans = zones.children;
    for (let z = 0; z < spans.length; z++) spans[z].classList.toggle('on', z === az);
  }

  function tweenScore(numEl, from, to, dur, onEnd) {
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      numEl.textContent = String(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(frame);
      else onEnd?.();
    }
    requestAnimationFrame(frame);
  }

  function retriggerClass(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function fhcCardMountRef(el, refs, score, max) {
    if (!el) {
      clearTimeout(el?.__fhcTimer);
      return;
    }
    clearTimeout(el.__fhcTimer);
    const resolvedRefs = {
      ...refs,
      num:    refs.num    ?? el.querySelector('.fhc-num'),
      pin:    refs.pin    ?? el.querySelector('.fhc-pin'),
      pinNum: refs.pinNum ?? el.querySelector('.fhc-pin-badge'),
      zones:  refs.zones  ?? el.querySelector('.fhc-zones'),
    };
    paintActive(resolvedRefs, score, max);
    retriggerClass(el, 'anim-in');
    el.__fhcTimer = setTimeout(() => { el.classList.remove('anim-in'); }, 1600);
  }
  function fhcCardCleanupRef(el) {
    if (!el) return;
    clearTimeout(el.__fhcTimer);
    delete el.__fhcTimer;
  }

  function activeZoneIndexFromScore(score) {
    for (let i = 0; i < ZONES.length; i++) if (score <= ZONES[i].max) return i;
    return ZONES.length - 1;
  }

  const INITIAL_SCORE = 90;
  const INITIAL_MAX = 100;
  const INITIAL_WHY = 'Savings exceed goals and spending is intentional. Budgets are automated and optimized.';
  const INITIAL_REC = 'Stay consistent with your budget, spending and saving habits.';

  function FinancialHealthCard() {
    const [score, setScore] = useState(INITIAL_SCORE);
    const [isOpen, setIsOpen] = useState(false);

    const cardRef = useRef(null);
    const numRef = useRef(null);
    const pinRef = useRef(null);
    const pinNumRef = useRef(null);
    const zonesRef = useRef(null);
    const tabRef = useRef(null);

    const scoreRef = useRef(INITIAL_SCORE);
    const proximityRef = useProximityGroup();

    const { ref: infoBodyRef } = useAutoHeight({ open: isOpen, duration: 400, easing: EASE_SPRING_OPEN });

    function getRefs() {
      return { card: cardRef.current, num: numRef.current, pin: pinRef.current, pinNum: pinNumRef.current, zones: zonesRef.current };
    }

    const cardCallbackRef = useCallback((el) => {
      cardRef.current = el;
      if (el) fhcCardMountRef(el, getRefs(), INITIAL_SCORE, INITIAL_MAX);
      else fhcCardCleanupRef(el);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleReplay() {
      if (!cardRef.current) return;
      fhcCardMountRef(cardRef.current, getRefs(), scoreRef.current, INITIAL_MAX);
    }

    function handleSetScore(next) {
      next = Math.max(0, Math.min(INITIAL_MAX, next));
      const from = scoreRef.current;
      scoreRef.current = next;
      setScore(next);
      const refs = getRefs();
      paintActive(refs, next, INITIAL_MAX);
      if (refs.pin) retriggerClass(refs.pin, 'pulse');
      if (refs.num) {
        tweenScore(refs.num, from, next, 640, () => {
          if (refs.num) {
            refs.num.textContent = String(next);
            retriggerClass(refs.num, 'num-pop');
          }
        });
      }
    }

    function handleCardClick() {
      setIsOpen((prev) => !prev);
      const card = cardRef.current;
      const pin = pinRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (card) retriggerClass(card, 'pop');
          if (pin) retriggerClass(pin, 'pulse');
        });
      });
    }

    return React.createElement('div', { className: 'fhc-frame', ref: proximityRef },
      React.createElement('div', { className: 'shell fhc-shell', style: { borderRadius: 42 } },
        React.createElement('div', { ref: cardCallbackRef, className: `fhc${isOpen ? ' open' : ''}`, onClick: handleCardClick },
          React.createElement('div', { className: 'fhc-eyebrow' },
            React.createElement('span', { className: 'material-symbols-outlined' }, 'monitor_heart'),
            'Financial Health'
          ),
          React.createElement('div', { className: 'fhc-score' },
            React.createElement('div', { ref: numRef, className: 'fhc-num' }, score),
            React.createElement('div', { className: 'fhc-outof' }, React.createElement('span', null, `/ ${INITIAL_MAX}`))
          ),
          React.createElement('div', { className: 'fhc-bar-wrap' },
            React.createElement('div', { ref: pinRef, className: 'fhc-pin' },
              React.createElement('div', { ref: pinNumRef, className: 'fhc-pin-badge' }, score)
            ),
            React.createElement('div', { className: 'fhc-bar' }),
            React.createElement('div', { ref: zonesRef, className: 'fhc-zones' },
              ZONES.map((z, i) => React.createElement('span', { key: z.name, className: activeZoneIndexFromScore(score) === i ? 'on' : '' }, z.name))
            )
          ),
          React.createElement('div', { className: 'fhc-info' },
            React.createElement('button', {
              ref: tabRef, type: 'button', className: 'fhc-info-tab', 'data-proximity': true,
              'aria-expanded': isOpen,
              onClick: (e) => { e.stopPropagation(); setIsOpen((prev) => !prev); if (tabRef.current) retriggerClass(tabRef.current, 'tab-pop'); },
            },
              React.createElement('span', { className: 'fhc-info-tab-l' },
                React.createElement('span', { className: 'material-symbols-outlined' }, 'tips_and_updates'),
                'Why & recommendation'
              ),
              React.createElement('span', { className: 'material-symbols-outlined fhc-info-chev' }, 'expand_more')
            ),
            React.createElement('div', { ref: infoBodyRef, className: 'fhc-info-body' },
              React.createElement('div', { className: 'fhc-info-inner' },
                React.createElement('div', { className: 'fhc-sec', style: { '--s': 0 } },
                  React.createElement('div', { className: 'fhc-sec-h' },
                    React.createElement('span', { className: 'material-symbols-outlined' }, 'help_outline'),
                    'Why?'
                  ),
                  React.createElement('div', { className: 'fhc-sec-p' }, INITIAL_WHY)
                ),
                React.createElement('div', { className: 'fhc-info-divider' }),
                React.createElement('div', { className: 'fhc-sec', style: { '--s': 1 } },
                  React.createElement('div', { className: 'fhc-sec-h' },
                    React.createElement('span', { className: 'material-symbols-outlined' }, 'check_circle'),
                    'Recommendation:'
                  ),
                  React.createElement('div', { className: 'fhc-sec-p' }, INITIAL_REC)
                )
              )
            )
          )
        )
      ),
      React.createElement('div', { className: 'fhc-controls' },
        React.createElement('button', { type: 'button', className: 'fhc-btn', 'data-proximity': true, onClick: handleReplay },
          React.createElement('span', { className: 'material-icons' }, 'replay'), 'Replay load'
        ),
        React.createElement('button', { type: 'button', className: 'fhc-btn', 'data-proximity': true, onClick: () => handleSetScore(34) },
          React.createElement('span', { className: 'material-icons' }, 'south'), 'Score 34'
        ),
        React.createElement('button', { type: 'button', className: 'fhc-btn', 'data-proximity': true, onClick: () => handleSetScore(62) },
          React.createElement('span', { className: 'material-icons' }, 'remove'), 'Score 62'
        ),
        React.createElement('button', { type: 'button', className: 'fhc-btn', 'data-proximity': true, onClick: () => handleSetScore(90) },
          React.createElement('span', { className: 'material-icons' }, 'north'), 'Score 90'
        )
      )
    );
  }

  window.FinancialHealthCard = FinancialHealthCard;
})();
