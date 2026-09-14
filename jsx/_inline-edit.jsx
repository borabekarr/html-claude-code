/* _inline-edit.jsx — browser-JSX port of
 * apps/web/src/components/design-system/inline-edit/InlineEdit.tsx
 * (+ inlined inline-edit-hook.ts, use-proximity-group.ts).
 * NEW port (ax-jeru-push Step 6): Finished, never previously in the mirror.
 *
 * Gates: the <input> carries aria-label (fieldLabel) for label association;
 * every <button> below carries type="button".
 */
(function () {
  const { useState, useRef, useCallback } = React;

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

  /* ================= inlined from inline-edit-hook.ts ================= */

  function ieRootRef(el) {
    if (!el) return;
    if (!el.__ieCleanup) {
      el.__ieCleanup = () => {};
    }
  }

  function cleanupIeRoot(el) {
    if (!el) return;
    el.__ieCleanup?.();
    delete el.__ieCleanup;
    el.__ieConfirmCleanup?.();
    delete el.__ieConfirmCleanup;
    el.__ieOutsideCleanup?.();
    delete el.__ieOutsideCleanup;
  }

  function registerSavedTimer(el, onExpire, ms) {
    el?.__ieCleanup?.();
    const id = setTimeout(onExpire, ms);
    if (el) {
      el.__ieCleanup = () => clearTimeout(id);
    }
    return id;
  }

  function registerConfirmTimer(el, onCommit, ms) {
    el?.__ieConfirmCleanup?.();
    const id = setTimeout(onCommit, ms);
    const cleanup = () => clearTimeout(id);
    if (el) {
      el.__ieConfirmCleanup = cleanup;
    }
    return cleanup;
  }

  function registerOutsideListener(el, onOutside) {
    if (!el) return;
    el.__ieOutsideCleanup?.();
    const handler = (e) => {
      if (!el.contains(e.target)) {
        onOutside();
      }
    };
    document.addEventListener('pointerdown', handler);
    el.__ieOutsideCleanup = () => {
      document.removeEventListener('pointerdown', handler);
      delete el.__ieOutsideCleanup;
    };
  }

  function cleanupOutsideListener(el) {
    if (!el) return;
    el.__ieOutsideCleanup?.();
  }

  function ieInputRef(el, editing) {
    if (!el) return;
    if (!editing) {
      delete el.__ieFocused;
      return;
    }
    if (el.__ieFocused) return;
    el.__ieFocused = true;
    Promise.resolve().then(() => {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }

  /* ================= Component ================= */

  function InlineEdit({
    fieldLabel = 'Kullanıcı adı',
    prefix = true,
    value = 'deha_bora',
    onCommit,
  }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saved, setSaved] = useState(false);
    const [confirming, setConfirming] = useState(false);

    const rootElRef = useRef(null);
    const inputDomRef = useRef(null);
    const [hasToggled, setHasToggled] = useState(false);

    const fieldGroupRef = useProximityGroup();

    function cancelEdit() {
      setDraft(value);
      setEditing(false);
      cleanupOutsideListener(rootElRef.current);
    }

    function startEdit() {
      if (editing) return;
      setHasToggled(true);
      setSaved(false);
      setDraft(value);
      setEditing(true);
      registerOutsideListener(rootElRef.current, cancelEdit);
    }

    function commit() {
      const liveVal = inputDomRef.current?.value ?? draft;
      const next = liveVal.trim() || value;
      setDraft(next);
      if (next === value) {
        setEditing(false);
        setConfirming(false);
        cleanupOutsideListener(rootElRef.current);
        return;
      }
      onCommit?.(next);
      setEditing(false);
      setConfirming(false);
      setSaved(true);
      cleanupOutsideListener(rootElRef.current);
      registerSavedTimer(rootElRef.current, () => setSaved(false), 3000);
    }

    function scheduleCommit() {
      setConfirming(true);
      registerConfirmTimer(rootElRef.current, commit, 200);
    }

    function onKeyDown(e) {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
    }

    // Stable (useCallback []) root callback ref: an inline ref would re-run
    // cleanupIeRoot on every setState, killing in-flight saved/confirm timers.
    const handleRootRef = useCallback((el) => {
      if (el) {
        rootElRef.current = el;
        ieRootRef(el);
      } else {
        cleanupIeRoot(rootElRef.current);
        rootElRef.current = null;
      }
      fieldGroupRef(el);
    }, [fieldGroupRef]);

    return (
      <div className="ie-wrap">
        {fieldLabel && <span className="ie-label">{fieldLabel}</span>}

        <div
          ref={handleRootRef}
          className="ie-field"
          data-editing={String(editing)}
          data-saved={String(saved)}
          tabIndex={editing ? undefined : 0}
          role={editing ? undefined : 'button'}
          aria-label={editing ? undefined : fieldLabel}
          onMouseDown={() => { if (!editing) startEdit(); }}
          onKeyDown={(e) => {
            if (editing) return;
            if (e.key === 'Enter') { startEdit(); }
            else if (e.key === ' ') { e.preventDefault(); startEdit(); }
          }}
        >
          {prefix && <span className="ie-prefix">@</span>}

          <input
            ref={(el) => { inputDomRef.current = el; ieInputRef(el, editing); }}
            className="ie-input"
            value={editing ? draft : value}
            readOnly={!editing}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            aria-label={fieldLabel}
          />

          <span className="ie-saved-morph" aria-live="polite" aria-hidden={!saved}>
            <span className="ie-ic material-symbols-outlined">check_circle</span>
            Kaydedildi
          </span>

          <button
            type="button"
            className="ie-cancel"
            data-proximity
            data-visible={String(editing)}
            aria-label="Vazgec"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              cancelEdit();
            }}
          >
            <span className="ie-ic material-symbols-outlined">close</span>
          </button>

          <button
            type="button"
            className={`ie-act${confirming ? ' is-confirming' : ''}`}
            data-proximity
            data-mode={editing ? 'save' : 'edit'}
            data-saved={String(saved)}
            data-ie-ready={hasToggled ? 'true' : undefined}
            aria-label={editing ? 'Kaydet' : 'Duzenle'}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (editing) { scheduleCommit(); } else { startEdit(); }
            }}
          >
            <span
              className="ie-ic ie-ic--edit material-symbols-outlined"
              aria-hidden={editing}
            >
              edit
            </span>
            <span
              className="ie-ic ie-ic--save material-symbols-outlined"
              aria-hidden={!editing}
            >
              check
            </span>
          </button>
        </div>

        <div className="ie-foot">
          <p className="ie-cap">Tap the pencil to edit your handle.</p>
        </div>
      </div>
    );
  }

  window.InlineEdit = InlineEdit;
})();
