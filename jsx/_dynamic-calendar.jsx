(function () {
  const { useCallback, useMemo, useRef, useState } = React;

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
  // Inlined from src/lib/iconClass.ts
  // ---------------------------------------------------------------------------
  const SYMBOLS_ONLY_GLYPHS = new Set(['neurology', 'auto_mode', 'lock_open_right', 'shield_lock']);
  function iconClass(name) {
    return SYMBOLS_ONLY_GLYPHS.has(name) ? 'material-symbols-outlined' : 'material-icons';
  }

  // ---------------------------------------------------------------------------
  // Inlined from dynamic-calendar-hook.ts — DOM-side behavior.
  //
  // NO raw side-effects. All side-effects expressed via callback refs.
  // Pattern: store cleanup functions on the element itself so the null branch
  // of the callback-ref can tear them down deterministically.
  // ---------------------------------------------------------------------------

  function makeDcRefs(setReactState, onNowChange) {
    let currentState = 'compact';
    let rootEl = null;
    let islandEl = null;

    function setStateFromHook(next) {
      currentState = next;
      setReactState(next);
    }

    function attach() {
      if (!rootEl || !islandEl) return;

      // 1. Now ticker (30s)
      const ticker = setInterval(() => onNowChange(new Date()), 30000);

      // 2. Outside-click → compact
      const onMouseDown = (e) => {
        if (currentState === 'compact') return;
        if (rootEl && !rootEl.contains(e.target)) {
          setStateFromHook('compact');
        }
      };
      window.addEventListener('mousedown', onMouseDown);

      // 3. Escape → compact + refocus island
      const onKeyDown = (e) => {
        if (currentState === 'compact') return;
        if (e.key === 'Escape') {
          e.preventDefault();
          setStateFromHook('compact');
          islandEl?.focus();
        }
      };
      window.addEventListener('keydown', onKeyDown);

      const cleanup = () => {
        clearInterval(ticker);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('keydown', onKeyDown);
      };

      if (rootEl) rootEl.__dcCleanup = cleanup;
    }

    function detach() {
      rootEl?.__dcCleanup?.();
      if (rootEl) rootEl.__dcCleanup = undefined;
    }

    const rootCallbackRef = (el) => {
      if (el) {
        rootEl = el;
        if (islandEl) attach();
      } else {
        detach();
        rootEl = null;
      }
    };

    const islandCallbackRef = (el) => {
      if (el) {
        islandEl = el;
        if (rootEl) attach();
      } else {
        islandEl = null;
      }
    };

    return { rootCallbackRef, islandCallbackRef, setStateFromHook };
  }

  // ---------- Calendar helpers ----------
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DOW_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const mondayIdx = (date) => (date.getDay() + 6) % 7;

  function buildMonthGrid(year, month) {
    const first = new Date(year, month, 1);
    const lead = mondayIdx(first);
    const days = daysInMonth(year, month);
    const prevDays = daysInMonth(year, month - 1);
    const cells = [];
    for (let i = lead - 1; i >= 0; i--) {
      cells.push({ d: prevDays - i, dim: true, m: month - 1, y: month === 0 ? year - 1 : year });
    }
    for (let d = 1; d <= days; d++) cells.push({ d, dim: false, m: month, y: year });
    while (cells.length % 7 !== 0) {
      cells.push({ d: cells.length - (lead + days) + 1, dim: true, m: month + 1, y: month === 11 ? year + 1 : year });
    }
    while (cells.length < 35) {
      cells.push({ d: cells.length - (lead + days) + 1, dim: true, m: month + 1, y: month === 11 ? year + 1 : year });
    }
    return cells;
  }

  const sameDay = (a, b) =>
    a != null && b != null &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const fmtTime = (d) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const fmtRange = (s, e) => `${fmtTime(s)} – ${fmtTime(e)}`;

  function fmtCountdown(ms) {
    if (ms <= 0) return 'now';
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h >= 24) return `${Math.floor(h / 24)}d`;
    if (h >= 1) return `${h}h ${m}m`;
    return `${m}m`;
  }
  const fmtCountdownDisplay = (ms) => {
    if (ms == null) return '—';
    if (ms <= 0) return 'now';
    return `in ${fmtCountdown(ms)}`;
  };
  function fmtDuration(ms) {
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  }

  // ---------- Sample events ----------
  // FAILURE GUARD: seed a fixed demo "now" instead of `new Date()` so
  // screenshots are deterministic (no dependency on wall-clock time / locale).
  const DEMO_NOW = new Date(2026, 5, 15, 9, 24, 0);

  function buildSampleEvents(base) {
    const y = base.getFullYear(), m = base.getMonth(), d = base.getDate();
    const at = (off, h, min, dur) => {
      const s = new Date(y, m, d + off, h, min);
      return { start: s, end: new Date(s.getTime() + dur * 60000) };
    };
    return [
      { id: 'e1', ...at(0, base.getHours(), base.getMinutes() + 6, 30), title: 'Standup', kind: 'event' },
      { id: 'e2', ...at(0, 12, 40, 90), title: 'Brainstorming with Jace', kind: 'event' },
      { id: 'e3', ...at(0, 0, 0, 24 * 60), title: "Jace's Birthday", kind: 'bday' },
      { id: 'e4', ...at(0, 15, 30, 45), title: 'Design review · v0.42', kind: 'event' },
      { id: 'e5', ...at(1, 9, 0, 60), title: 'Coffee w/ Maya', kind: 'event' },
      { id: 'e6', ...at(3, 14, 0, 30), title: 'Sprint planning', kind: 'event' },
      { id: 'e7', ...at(7, 11, 0, 60), title: '1:1 with Kai', kind: 'event' },
    ];
  }

  function DynamicCalendar({
    events: eventsProp,
    initialDate,
    trigger = 'hoverThenClick',
    onOpenCalendar,
    state: stateProp,
    onStateChange,
  } = {}) {
    const today = useMemo(() => initialDate ?? DEMO_NOW, [initialDate]);
    const events = useMemo(() => eventsProp ?? buildSampleEvents(today), [eventsProp, today]);

    const [internalState, setInternalState] = useState('compact');
    const islandState = stateProp ?? internalState;

    // Updated every 30s by the ticker in the callback-ref hook
    const [now, setNow] = useState(() => today);

    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selected, setSelected] = useState(today);

    // Build callback-refs + hook-owned setState once.
    const { rootCallbackRef, islandCallbackRef, setStateFromHook } = useMemo(
      () =>
        makeDcRefs(
          (next) => {
            setInternalState(next);
            onStateChange?.(next);
          },
          setNow,
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const setIslandState = (next) => {
      setStateFromHook(next);
      if (stateProp !== undefined) onStateChange?.(next);
    };

    const hoverTimer = useRef(null);

    const onIslandClick = () => {
      if (islandState === 'expanded') return;
      setIslandState('expanded');
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setSelected(today);
    };
    const onIslandKeyDown = (e) => {
      if (islandState !== 'expanded' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onIslandClick();
      }
    };
    const onMouseEnter = () => {
      if (trigger !== 'hoverThenClick' || islandState !== 'compact') return;
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setIslandState('preview'), 40);
    };
    const onMouseLeave = () => {
      if (hoverTimer.current !== null) clearTimeout(hoverTimer.current);
      if (islandState === 'preview') setIslandState('compact');
    };

    const prevMonth = () => {
      setViewMonth((m) => (m === 0 ? 11 : m - 1));
      setViewYear((y) => (viewMonth === 0 ? y - 1 : y));
    };
    const nextMonth = () => {
      setViewMonth((m) => (m === 11 ? 0 : m + 1));
      setViewYear((y) => (viewMonth === 11 ? y + 1 : y));
    };

    // Derived
    const nextEvent = useMemo(
      () =>
        events
          .filter((e) => e.end > now && e.kind === 'event')
          .sort((a, b) => a.start.getTime() - b.start.getTime())[0] ?? null,
      [events, now],
    );
    const eventsToday = useMemo(
      () =>
        events
          .filter((e) => sameDay(e.start, selected ?? today))
          .sort((a, b) => a.start.getTime() - b.start.getTime()),
      [events, selected, today],
    );
    const eventDateKeys = useMemo(() => {
      const s = new Set();
      events.forEach((e) => s.add(`${e.start.getFullYear()}-${e.start.getMonth()}-${e.start.getDate()}`));
      return s;
    }, [events]);
    const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
    const countdownMs = nextEvent ? nextEvent.start.getTime() - now.getTime() : null;

    // Cell keyboard nav
    const cellRefs = useRef([]);
    const gridProximityRef = useProximityGroup();
    const onCellKeyDown = (e, idx) => {
      if (islandState !== 'expanded') return;
      let next = -1;
      if (e.key === 'ArrowRight') next = idx + 1;
      else if (e.key === 'ArrowLeft') next = idx - 1;
      else if (e.key === 'ArrowDown') next = idx + 7;
      else if (e.key === 'ArrowUp') next = idx - 7;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const c = cells[idx];
        setSelected(new Date(c.y, c.m, c.d));
        return;
      }
      if (next >= 0 && next < cells.length) {
        e.preventDefault();
        cellRefs.current[next]?.focus();
      }
    };

    return (
      <div className="dc-shell" onMouseDown={(e) => e.stopPropagation()}>
        {/* Fake macOS menu bar — decorative */}
        <div className="dc-menubar" aria-hidden="true">
          <span className="dc-apple"></span>
          <span style={{ fontWeight: 800 }}>Calendar</span>
          <span>File</span><span>Edit</span><span>View</span><span>Window</span><span>Help</span>
          <span className="dc-right">
            <span className={`dc-menubar-icon ${iconClass('wifi')}`}>wifi</span>
            <span className={`dc-menubar-icon ${iconClass('battery_4_bar')}`}>battery_4_bar</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </span>
        </div>

        <div className="dc-island-wrap" ref={rootCallbackRef}>
          <div
            ref={islandCallbackRef}
            className={`dc-island ${islandState}`}
            tabIndex={0}
            role={islandState === 'expanded' ? 'dialog' : undefined}
            aria-expanded={islandState !== 'compact'}
            aria-label={
              islandState === 'compact'
                ? `Calendar. Next event ${countdownMs != null ? fmtCountdownDisplay(countdownMs) : 'soon'}. Press Enter to expand.`
                : 'Calendar'
            }
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={onIslandClick}
            onKeyDown={onIslandKeyDown}
          >
            {/* ---------- Compact + Preview (shared chip) ---------- */}
            <div
              className={`dc-layer dc-chip-layer ${
                islandState === 'expanded' ? 'behind' : 'active'
              } is-${islandState}`}
            >
              <div className="dc-chip">
                <div className="dc-chip-top">
                  <div className="dc-compact-left">
                    <span className="dc-cal-icon">
                      <span className={`dc-icon ${iconClass('event')}`}>event</span>
                    </span>
                    <span className="dc-pulse" aria-hidden="true" />
                  </div>
                  <span className="dc-countdown" aria-live="polite">
                    {fmtCountdownDisplay(countdownMs)}
                  </span>
                </div>
                <div className="dc-preview-event">
                  <div className="dc-event-stripe" />
                  <div className="dc-event-title">
                    {nextEvent ? nextEvent.title : 'No upcoming events'}
                  </div>
                  {nextEvent && (
                    <div className="dc-event-when">
                      <span className={`dc-icon ${iconClass('schedule')}`}>schedule</span>
                      <span className="dc-event-when-text">
                        {fmtDuration(nextEvent.end.getTime() - nextEvent.start.getTime())}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ---------- Expanded (click) ---------- */}
            <div className={`dc-layer dc-expanded-layer ${islandState === 'expanded' ? 'active' : 'behind'}`}>
              <div className="dc-expanded-grid">

                {/* LEFT — today / selected summary + events */}
                <div className="dc-left">
                  <button
                    type="button"
                    className="dc-open-cal-btn"
                    onClick={(e) => { e.stopPropagation(); onOpenCalendar?.(selected); }}
                    aria-label={onOpenCalendar ? 'Open Calendar app' : 'Selected date'}
                  >
                    <div className="dc-today-row">
                      <span className="dc-today-dow">
                        {selected.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                    </div>
                    <h2 className="dc-today-num">{selected.getDate()}</h2>
                  </button>

                  <div className="dc-event-list-wrap">
                    <div className="dc-event-list">
                      {eventsToday.map((ev, i) => (
                        <div
                          key={ev.id}
                          className={`dc-event-row kind-${ev.kind}${
                            sameDay(ev.start, today) && ev.kind === 'event' && nextEvent && ev.id === nextEvent.id
                              ? ' is-focus' : ''
                          }`}
                          style={{ '--dc-delay': `${120 + i * 70}ms` }}
                        >
                          {ev.kind === 'bday' ? (
                            <span className="dc-glyph">
                              <span className={`dc-icon ${iconClass('cake')}`}>cake</span>
                            </span>
                          ) : (
                            <span className="dc-dot" />
                          )}
                          <div className="dc-event-row-text">
                            <div className="dc-event-row-title">{ev.title}</div>
                            {ev.kind === 'event' && (
                              <div className="dc-event-row-time">{fmtRange(ev.start, ev.end)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {eventsToday.length === 0 && (
                        <div
                          className="dc-more"
                          style={{ '--dc-delay': '120ms' }}
                        >
                          Nothing scheduled
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT — month grid */}
                <div className="dc-right">
                  <div className="dc-month-head">
                    <span className="dc-month-name">
                      {MONTHS[viewMonth]}
                      <span className="dc-year">{viewYear}</span>
                    </span>
                    <div className="dc-month-nav">
                      <button
                        type="button"
                        className="dc-nav-btn"
                        onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                        aria-label="Previous month"
                      >
                        <span className={`dc-icon ${iconClass('chevron_left')}`}>chevron_left</span>
                      </button>
                      <button
                        type="button"
                        className="dc-nav-btn"
                        onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                        aria-label="Next month"
                      >
                        <span className={`dc-icon ${iconClass('chevron_right')}`}>chevron_right</span>
                      </button>
                    </div>
                  </div>

                  <table
                    className="dc-grid"
                    role="grid"
                    aria-label={`${MONTHS[viewMonth]} ${viewYear}`}
                    ref={gridProximityRef}
                  >
                    <thead>
                      <tr>
                        {DOW_SHORT.map((d, i) => (
                          <th key={DOW_LABELS[i]} scope="col" className="dc-dow">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => (
                        <tr key={`row-${viewYear}-${viewMonth}-${rowIdx}`}>
                          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((c) => {
                            const cellDate = new Date(c.y, c.m, c.d);
                            const isToday = sameDay(cellDate, today);
                            const isSelected = sameDay(cellDate, selected);
                            const cellKey = `${c.y}-${c.m}-${c.d}`;
                            const hasEvent = eventDateKeys.has(cellKey);
                            const idx = rowIdx * 7 + cells.slice(rowIdx * 7, rowIdx * 7 + 7).indexOf(c);
                            return (
                              <td key={cellKey} className="dc-cell-td">
                                <button
                                  type="button"
                                  ref={(el) => { cellRefs.current[idx] = el; }}
                                  className={[
                                    'dc-cell',
                                    c.dim && 'dim',
                                    isToday && 'today',
                                    isSelected && 'selected',
                                    hasEvent && !isToday && 'has-event',
                                  ].filter(Boolean).join(' ')}
                                  aria-pressed={isSelected}
                                  aria-label={cellDate.toDateString()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(cellDate);
                                    if (c.m !== viewMonth) {
                                      setViewMonth(c.m);
                                      setViewYear(c.y);
                                    }
                                  }}
                                  onKeyDown={(e) => onCellKeyDown(e, idx)}
                                  style={{ '--dc-delay': `${120 + idx * 12}ms` }}
                                  data-proximity
                                >
                                  {c.d}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Close button */}
              <button
                type="button"
                className="dc-close"
                aria-label="Close calendar"
                onClick={(e) => { e.stopPropagation(); setIslandState('compact'); }}
              >
                <span className={`dc-icon ${iconClass('close')}`}>close</span>
              </button>
            </div>
          </div>
        </div>

        <div className="dc-hint">
          <span className="dc-hint-pill">
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 6, height: 6, borderRadius: '50%',
                background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.18)',
              }}
            />
            {' '}Hover the island for a preview · Click to expand · <kbd>Esc</kbd> to close
          </span>
        </div>
      </div>
    );
  }

  window.DynamicCalendar = DynamicCalendar;
})();
