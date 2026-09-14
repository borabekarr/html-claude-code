/* _pills.jsx — browser-JSX port of
 * apps/web/src/components/design-system/pills/Pills.tsx (+ inlined variants.ts).
 * Refreshed 2026-09-01 from today's canonical .tsx (ax-jeru-push Step 4).
 */
(() => {
  const { useCallback, useRef } = React;

  /* ================= proximity-hover engine (inlined, same as _buttons.jsx).
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

  /* ================= variants.ts (inlined) ================= */

  const PRIORITY_PILLS = [
    { color: '#EF4444', label: 'Yüksek' },
    { color: '#EAB308', label: 'Orta' },
    { color: 'var(--brand-primary-500)', label: 'Düşük' },
  ];

  const STAT_BADGES = [
    { tone: 'success', icon: 'trending_up', label: '+12%' },
    { tone: 'danger', icon: 'trending_down', label: '-34%' },
    { tone: 'gci', prefix: '$', label: '45K GCI' },
    { tone: 'time', icon: 'schedule', label: '12:00' },
    { tone: 'tag', icon: 'home_work', label: 'Değerleme' },
    { tone: 'tag', icon: 'sell', label: 'Satış' },
    { tone: 'tag', icon: 'volunteer_activism', label: 'Nurture' },
  ];

  const COLUMN_TAGS = [
    { tone: 'todo', icon: 'inbox', label: 'Todo', count: 4 },
    { tone: 'progress', icon: 'bolt', label: 'In Progress', count: 3 },
    { tone: 'review', icon: 'visibility', label: 'Review', count: 2 },
    { tone: 'done', icon: 'task_alt', label: 'Done', count: 3 },
  ];

  const EVENT_BADGES = [
    { color: '#EC4899', icon: 'self_improvement', label: 'Personal' },
    { color: '#3B82F6', icon: 'event', label: 'Meeting' },
    { color: '#F97316', icon: 'call', label: 'Call' },
    { color: 'var(--brand-primary-500)', icon: 'task_alt', label: 'Done' },
    { color: '#EF4444', icon: 'warning', label: 'Urgent' },
    { color: '#111111', icon: 'lock', label: 'Private', tone: 'black' },
    { color: '#EAB308', icon: 'star', label: 'Featured' },
  ];

  const ICON_BADGES = [
    { color: 'var(--brand-primary-500)', icon: 'bolt' },
    { color: '#EF4444', icon: 'favorite' },
    { color: '#F97316', icon: 'schedule' },
    { color: '#3B82F6', icon: 'insights' },
    { color: '#EAB308', icon: 'lock' },
    { color: '#111111', icon: 'dark_mode', tone: 'black' },
  ];

  /* ================= Pills.tsx (inlined) ================= */

  function PriorityPill({ color, label }) {
    return (
      <span className="pill-priority" data-proximity>
        <span className="dot" style={{ background: color }}></span> {label}
      </span>
    );
  }

  function StatBadge({ tone, icon, prefix, label }) {
    return (
      <span className={`badge ${tone}`}>
        {prefix ? <span>{prefix}</span> : icon ? <span className="material-icons">{icon}</span> : null}
        {' '}
        {label}
      </span>
    );
  }

  function ColumnTagBadge({ tone, icon, label, count }) {
    return (
      <span className={`badge col-tag ${tone}`}>
        <span className="material-icons">{icon}</span> {label} <span className="count">{count}</span>
      </span>
    );
  }

  function EventBadge({ color, icon, label, tone }) {
    return (
      <span className="badge-event" data-tone={tone} style={{ backgroundColor: color }}>
        <span className="material-icons">{icon}</span> {label}
      </span>
    );
  }

  function IconBadge({ color, icon, tone }) {
    return (
      <div className="icon-badge icon-badge--lg" data-tone={tone} style={{ '--icon-c': color }}>
        <span className="material-icons">{icon}</span>
      </div>
    );
  }

  function Pills() {
    const filterRowRef = useProximityGroup();

    return (
      <div className="card">
        <span className="pills-label">Priority filter</span>
        <div className="pills-row" ref={filterRowRef}>
          {PRIORITY_PILLS.map((spec) => (
            <PriorityPill key={spec.label} {...spec} />
          ))}
          <span className="pill-tab dark" data-proximity>Tümü</span>
        </div>

        <span className="pills-label" style={{ marginTop: 16 }}>Stat badges</span>
        <div className="pills-row">
          {STAT_BADGES.map((spec) => (
            <StatBadge key={spec.label} {...spec} />
          ))}
          <span className="badge success">Success</span>
        </div>
        <span className="pills-label" style={{ marginTop: 16 }}>Task board column tags</span>
        <div className="pills-row">
          {COLUMN_TAGS.map((spec) => (
            <ColumnTagBadge key={spec.tone} {...spec} />
          ))}
        </div>

        <span className="pills-label" style={{ marginTop: 16 }}>Event badges</span>
        <div className="pills-row">
          {EVENT_BADGES.map((spec) => (
            <EventBadge key={spec.label} {...spec} />
          ))}
        </div>

        <span className="pills-label" style={{ marginTop: 16 }}>Icon badges</span>
        <div className="pills-row">
          {ICON_BADGES.map((spec) => (
            <IconBadge key={spec.icon} {...spec} />
          ))}
        </div>
      </div>
    );
  }

  window.Pills = Pills;
})();
