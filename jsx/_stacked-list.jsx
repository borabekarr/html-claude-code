/* _stacked-list.jsx — browser-JSX port of
 * apps/web/src/components/design-system/stacked-list/StackedList.tsx
 * (+ inlined stacked-list-hook.ts, use-proximity-group.ts).
 * NEW port (ax-jeru-push Step 6): Finished, never previously in the mirror.
 */
(function () {
  const { useMemo, useState, useRef, useCallback } = React;

  /* ================= proximity-hover engine (inlined, same as _fab.jsx).
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

  /* ================= inlined from stacked-list-hook.ts ================= */

  function dirSearchRef(el) {
    if (!el) return;
    el.focus();
    el.__slCleanup = () => { /* noop */ };
  }

  function cleanupDirSearch(el) {
    if (!el) return;
    el.__slCleanup?.();
    delete el.__slCleanup;
  }

  /* ----------------------------- data ----------------------------- */
  const ROLES = {
    pm:       { label: 'Project Manager', icon: 'work',     tone: 'pm' },
    designer: { label: 'Designer',        icon: 'palette',  tone: 'designer' },
    data:     { label: 'Data Specialist', icon: 'database', tone: 'data' },
    creator:  { label: 'Creator',         icon: 'stylus',   tone: 'creator' },
  };

  const MEMBERS = [
    { id: '01', name: 'Oliver Smith',  initials: 'OS', online: true,  status: 'Online',  role: 'pm',       color: 'var(--brand-primary-600)' },
    { id: '02', name: 'Sophie Chen',   initials: 'SC', online: false, status: '17m ago', role: 'designer', color: '#4A4A4A' },
    { id: '03', name: 'Noah Wilson',   initials: 'NW', online: false, status: '29m ago', role: 'data',     color: '#F59E0B' },
    { id: '04', name: 'Emma Davis',    initials: 'ED', online: false, status: '48m ago', role: 'creator',  color: '#F97316' },
    { id: '05', name: 'Leo Garcia',    initials: 'LG', online: true,  status: 'Online',  role: 'designer', color: 'var(--brand-primary-700)' },
    { id: '06', name: 'Mia Thompson',  initials: 'MT', online: true,  status: 'Online',  role: 'pm',       color: '#6B6B6B' },
    { id: '07', name: 'Ethan Wright',  initials: 'EW', online: false, status: '5h ago',  role: 'data',     color: '#232323' },
  ];

  /* ----------------------------- sub-components ----------------------------- */
  function RoleBadge({ role }) {
    const r = ROLES[role];
    return (
      <span className="sl-badge" data-tone={r.tone}>
        <span className="material-symbols-outlined">{r.icon}</span>
        <span className="sl-badge-lbl">{r.label}</span>
      </span>
    );
  }

  function MemberItem({ m }) {
    return (
      <div className="sl-item" data-proximity>
        <div className="sl-ava-wrap">
          <div className="sl-ava" style={{ backgroundColor: m.color }}>{m.initials}</div>
          {m.online && <span className="sl-online" />}
        </div>
        <div className="sl-meta">
          <div className="sl-name">{m.name}</div>
          <div className={'sl-status ' + (m.online ? 'is-online' : 'is-off')}>
            {m.online && <span className="dot" />}
            <span>{m.status}</span>
          </div>
        </div>
        <RoleBadge role={m.role} />
      </div>
    );
  }

  function EmptyState({ label }) {
    return (
      <div className="sl-empty">
        <span className="material-symbols-outlined">person_search</span>
        No teammates match &ldquo;{label}&rdquo;.
      </div>
    );
  }

  /* ----------------------------- main component ----------------------------- */
  function matches(m, q) {
    const lq = q.trim().toLowerCase();
    if (!lq) return true;
    return m.name.toLowerCase().includes(lq) || ROLES[m.role].label.toLowerCase().includes(lq);
  }

  function StackedList({ startOpen = false, mono = false }) {
    const [expanded, setExpanded] = useState(startOpen);
    const [dirQuery, setDirQuery] = useState('');
    const dirTimer = useRef(null);
    // Stash-cleanup-on-element: last mounted search-input el, cleaned up in the
    // el === null branch (precedent _prize-sheet.jsx:128-141; harness React
    // 18.3.1 does not auto-invoke a callback ref's returned cleanup closure).
    const dirSearchElRef = useRef(null);

    function handleDirSearch(e) {
      const value = e.target.value;
      if (dirTimer.current !== null) clearTimeout(dirTimer.current);
      dirTimer.current = setTimeout(() => {
        setDirQuery(value);
        dirTimer.current = null;
      }, 120);
    }

    const dirList = useMemo(
      () => MEMBERS.filter((m) => matches(m, dirQuery)),
      [dirQuery]
    );

    const stack = MEMBERS.slice(0, 3);
    const remaining = MEMBERS.length - stack.length;

    const dirListProximityRef = useProximityGroup();

    return (
      <div className={'sl-panel' + (mono ? ' is-mono' : '')}>

        {/* ---------- floating directory dock ---------- */}
        <div
          className={'sl-bar' + (expanded ? ' is-expanded' : '')}
          onClick={() => { if (!expanded) setExpanded(true); }}
        >
          <div className="sl-bar-head">
            <button
              type="button"
              className="sl-bar-left"
              tabIndex={expanded ? -1 : 0}
              aria-disabled={expanded}
              aria-label="Open member directory"
            >
              <div className="sl-bar-icon">
                <span className="material-symbols-outlined">groups</span>
              </div>
              <div className="sl-bar-titles">
                <h4>Member Directory</h4>
                <p>{MEMBERS.length} Members Registered</p>
              </div>
            </button>
            <div className="sl-bar-right">
              <div className="sl-stack">
                {stack.map((m) => (
                  <div key={'s-' + m.id} className="sl-mini" style={{ backgroundColor: m.color }}>
                    {m.initials}
                  </div>
                ))}
                {remaining > 0 && <div className="sl-more">+{remaining}</div>}
              </div>
              <button
                type="button"
                className="sl-close"
                aria-label="Close directory"
                tabIndex={expanded ? 0 : -1}
                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div className="sl-bar-body">
            <div className="sl-bar-search">
              <div className="sl-search sl-search--sm">
                <span className="material-symbols-outlined">search</span>
                <input
                  aria-label="Search members"
                  placeholder="Search members…"
                  defaultValue=""
                  onChange={handleDirSearch}
                  ref={(el) => {
                    if (el) {
                      dirSearchElRef.current = el;
                      dirSearchRef(el);
                    } else {
                      cleanupDirSearch(dirSearchElRef.current);
                      dirSearchElRef.current = null;
                    }
                  }}
                />
              </div>
            </div>
            <div className="sl-bar-list" ref={dirListProximityRef}>
              {expanded && (dirList.length > 0
                ? dirList.map((m) => (
                    <MemberItem key={'d-' + m.id} m={m} />
                  ))
                : <EmptyState label={dirQuery} />)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.StackedList = StackedList;
})();
