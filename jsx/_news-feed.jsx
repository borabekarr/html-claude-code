/* _news-feed.jsx — browser-JSX port of
 * apps/web/src/components/design-system/news-feed/NewsFeed.tsx
 * (+ inlined news-feed-hook.ts, use-proximity-group.ts).
 * New port (ax-jeru-push Step 7).
 */
(function () {
  const { useCallback, useRef } = React;

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

  /* ================= news-feed-hook.ts (inlined) — card interaction state machine. ================= */

  const FEEDS = {
    bull: [
      { title: 'Hong Kong Expands Cryptocurrency Market with New Exchange Approvals.', sub: 'The market is bullish today', date: 'December 5, 2024' },
      { title: 'Bitcoin ETF Inflows Hit a Record High as Institutions Pile In.',        sub: 'The market is bullish today', date: 'December 22, 2024' },
      { title: 'Ethereum Staking Yields Climb as the Network Upgrade Goes Live.',       sub: 'The market is bullish today', date: 'January 4, 2025' },
    ],
    bear: [
      { title: 'Solana Price Faces Potential Dip Below $200 After Federal Reserve Cut.', sub: 'The market is bearish today', date: 'December 19, 2024' },
      { title: 'Crypto Market Sheds $90B as a Risk-Off Sentiment Spreads.',              sub: 'The market is bearish today', date: 'January 2, 2025' },
      { title: 'XRP Slides Amid Renewed Regulatory Uncertainty in the US.',             sub: 'The market is bearish today', date: 'January 9, 2025' },
    ],
  };

  function mountCard(el) {
    const tone = el.getAttribute('data-tone');
    if (!tone || !(tone in FEEDS)) return;

    const feed = FEEDS[tone];
    let idx = 0;
    let busy = false;

    const titleEl = el.querySelector('.nf-title');
    const dateEl = el.querySelector('.nf-date');
    const subEl = el.querySelector('.nf-sub');
    const barEl = el.querySelector('.nf-bar');
    const arrowNext = el.querySelector('.nf-arrow-next');
    const arrowPrev = el.querySelector('.nf-arrow-prev');
    const shellEl = el.closest('.nf-shell');

    if (!titleEl || !dateEl || !barEl || !arrowNext) return;

    const timers = [];
    function later(fn, ms) {
      const t = setTimeout(fn, ms);
      timers.push(t);
      return t;
    }

    const title = titleEl;
    const date = dateEl;
    const sub = subEl;
    const bar = barEl;

    function buildBar() {
      bar.innerHTML =
        feed.map((_, i) => `<div class="nf-seg" style="--i:${i}"></div>`).join('') +
        '<div class="nf-ind"></div>' +
        '<div class="nf-ind nf-ind-ghost" aria-hidden="true"></div>';
      bar.style.setProperty('--nf-idx', String(idx));
      bar.style.setProperty('--nf-ghost-idx', String(idx));
    }

    function paintBar(prevIdx) {
      const lastIdx = feed.length - 1;
      const isWrap = prevIdx === lastIdx && idx === 0;
      const isReverseWrap = prevIdx === 0 && idx === lastIdx;

      if (isWrap) {
        const primary = bar.querySelector('.nf-ind:not(.nf-ind-ghost)');
        const ghost = bar.querySelector('.nf-ind-ghost');
        if (!primary || !ghost) { bar.style.setProperty('--nf-idx', String(idx)); return; }
        primary.classList.add('nf-ind--exit-right');
        ghost.classList.add('nf-ind--no-transition');
        bar.style.setProperty('--nf-ghost-idx', '0');
        void ghost.offsetWidth;
        ghost.classList.remove('nf-ind--no-transition');
        ghost.classList.add('nf-ind--enter-left');
        const dur = 300 * (parseFloat(getComputedStyle(bar).getPropertyValue('--anim-mult') || '1') || 1);
        later(() => {
          primary.classList.remove('nf-ind--exit-right');
          ghost.classList.remove('nf-ind--enter-left');
          bar.style.setProperty('--nf-idx', '0');
          bar.style.setProperty('--nf-ghost-idx', '0');
        }, dur + 20);
      } else if (isReverseWrap) {
        const primary = bar.querySelector('.nf-ind:not(.nf-ind-ghost)');
        const ghost = bar.querySelector('.nf-ind-ghost');
        if (!primary || !ghost) { bar.style.setProperty('--nf-idx', String(idx)); return; }
        primary.classList.add('nf-ind--exit-left');
        ghost.classList.add('nf-ind--no-transition');
        bar.style.setProperty('--nf-ghost-idx', String(lastIdx));
        void ghost.offsetWidth;
        ghost.classList.remove('nf-ind--no-transition');
        ghost.classList.add('nf-ind--enter-right');
        const dur = 300 * (parseFloat(getComputedStyle(bar).getPropertyValue('--anim-mult') || '1') || 1);
        later(() => {
          primary.classList.remove('nf-ind--exit-left');
          ghost.classList.remove('nf-ind--enter-right');
          bar.style.setProperty('--nf-idx', String(lastIdx));
          bar.style.setProperty('--nf-ghost-idx', String(lastIdx));
        }, dur + 20);
      } else {
        bar.style.setProperty('--nf-idx', String(idx));
      }
    }

    function render() {
      const n = feed[idx];
      title.textContent = n.title;
      date.textContent = n.date;
      if (sub) sub.textContent = n.sub;
    }

    function doSwap(navDir) {
      if (busy) return;
      busy = true;
      const prevIdx = idx;
      idx = (idx + navDir + feed.length) % feed.length;
      paintBar(prevIdx);
      const swapDir = navDir * 38;
      const swapEls = [title, date];
      swapEls.forEach((n) => {
        n.style.setProperty('--swap-dir', `${swapDir}px`);
        n.classList.remove('nf-swap-in');
        n.classList.add('nf-swap-out');
      });
      later(() => {
        render();
        swapEls.forEach((n) => {
          n.classList.remove('nf-swap-out');
          void n.offsetWidth;
          n.classList.add('nf-swap-in');
        });
        later(() => { busy = false; }, 260);
      }, 180);
    }

    function next() { doSwap(1); }
    function prev() { doSwap(-1); }

    function load() {
      el.classList.remove('is-loading', 'is-empty');
      idx = 0;
      render();
      buildBar();
      el.classList.remove('anim-in');
      void el.offsetWidth;
      el.classList.add('anim-in');
      later(() => { el.classList.remove('anim-in'); }, 1900);
    }

    function skeleton() {
      el.classList.remove('is-empty');
      el.classList.add('is-loading');
      later(() => { load(); }, 1700);
    }

    function empty() {
      el.classList.remove('is-loading');
      el.classList.add('is-empty');
    }

    function onNextClick(e) { e.stopPropagation(); next(); }
    function onPrevClick(e) { e.stopPropagation(); prev(); }
    function onCardClick() {
      const shell = shellEl ?? el;
      shell.classList.remove('tap');
      void shell.offsetWidth;
      shell.classList.add('tap');
    }

    arrowNext.addEventListener('click', onNextClick);
    if (arrowPrev) arrowPrev.addEventListener('click', onPrevClick);
    el.addEventListener('click', onCardClick);

    const api = { load, skeleton, empty };
    el.__nfApi = api;
    el.__nfTimers = timers;

    load();

    return function cleanup() {
      arrowNext.removeEventListener('click', onNextClick);
      if (arrowPrev) arrowPrev.removeEventListener('click', onPrevClick);
      el.removeEventListener('click', onCardClick);
      timers.forEach(clearTimeout);
      timers.length = 0;
      delete el.__nfApi;
      delete el.__nfTimers;
    };
  }

  function getCardApi(el) {
    return el.__nfApi;
  }

  /* ================= components ================= */

  function NfCard({ tone, kicker, defaultTitle, defaultDate, emptyLabel, icon, 'data-comment-anchor': anchor }) {
    const cleanupRef = useRef(undefined);
    const headProximityRef = useProximityGroup();

    const cardRef = useCallback((el) => {
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
      if (!el) return;
      cleanupRef.current = mountCard(el);
    }, []);

    return React.createElement('div', { className: 'shell nf-shell' },
      React.createElement('article', {
        ref: cardRef,
        className: `nf-card nf--${tone}`,
        'data-tone': tone,
        'data-screen-label': `News card (${tone === 'bull' ? 'bullish' : 'bearish'})`,
        'data-comment-anchor': anchor,
      },
        React.createElement('div', { className: 'nf-glow' }),
        React.createElement('div', { className: 'nf-grid' }),
        React.createElement('div', { className: 'nf-real', style: { display: 'contents' } },
          React.createElement('header', { className: 'nf-head', ref: headProximityRef },
            React.createElement('span', { className: 'nf-head-ic' }, React.createElement('span', { className: 'material-icons' }, icon)),
            React.createElement('div', { className: 'nf-head-txt' }, React.createElement('div', { className: 'nf-kicker' }, kicker)),
            React.createElement('button', { type: 'button', className: 'nf-arrow nf-arrow-prev', 'aria-label': 'Previous story', 'data-proximity': true },
              React.createElement('svg', { viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M19 12H5' }),
                React.createElement('path', { d: 'M12 19l-7-7 7-7' })
              )
            ),
            React.createElement('button', { type: 'button', className: 'nf-arrow nf-arrow-next', 'aria-label': 'Next story', 'data-proximity': true },
              React.createElement('svg', { viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', strokeWidth: '2.2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                React.createElement('path', { d: 'M5 12h14' }),
                React.createElement('path', { d: 'M12 5l7 7-7 7' })
              )
            )
          ),
          React.createElement('div', { className: 'nf-title-wrap' }, React.createElement('h2', { className: 'nf-title' }, defaultTitle)),
          React.createElement('div', { className: 'nf-date' }, defaultDate),
          React.createElement('div', { className: 'nf-bar' })
        ),
        React.createElement('div', { className: 'nf-skeleton' },
          React.createElement('div', { className: 'sk', style: { width: '46%', height: '14px' } }),
          React.createElement('div', { className: 'sk', style: { width: '62%', height: '11px', marginTop: '9px' } }),
          React.createElement('div', { className: 'sk', style: { width: '90%', height: '24px', marginTop: '42px' } }),
          React.createElement('div', { className: 'sk', style: { width: '82%', height: '24px', marginTop: '12px' } }),
          React.createElement('div', { className: 'sk', style: { width: '55%', height: '24px', marginTop: '12px' } }),
          React.createElement('div', { className: 'sk', style: { width: '40%', height: '13px', marginTop: 'auto' } })
        ),
        React.createElement('div', { className: 'nf-empty' },
          React.createElement('span', { className: 'material-icons' }, 'inbox'),
          React.createElement('div', { className: 'nf-empty-t' }, 'No stories yet'),
          React.createElement('div', { className: 'nf-empty-s' }, emptyLabel)
        )
      )
    );
  }

  function NfControls({ rowRef }) {
    const controlsProximityRef = useProximityGroup();

    function callAll(method) {
      if (!rowRef.current) return;
      rowRef.current.querySelectorAll('.nf-card').forEach((el) => {
        const api = getCardApi(el);
        if (api) api[method]();
      });
    }

    return React.createElement('div', { className: 'nf-controls', ref: controlsProximityRef },
      React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => { callAll('load'); }, 'data-proximity': true },
        React.createElement('span', { className: 'material-icons' }, 'replay'), 'Replay load'
      ),
      React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => { callAll('skeleton'); }, 'data-proximity': true },
        React.createElement('span', { className: 'material-icons' }, 'hourglass_empty'), 'Loading state'
      ),
      React.createElement('button', { type: 'button', className: 'nf-btn', onClick: () => { callAll('empty'); }, 'data-proximity': true },
        React.createElement('span', { className: 'material-icons' }, 'inbox'), 'Empty state'
      )
    );
  }

  function NewsFeed() {
    const rowRef = useRef(null);

    return React.createElement('div', { className: 'card nf-page' },
      React.createElement('div', { className: 'frame', 'data-comment-anchor': 'decae93298-div' },
        React.createElement('div', { className: 'nf-row', id: 'row', ref: rowRef },
          React.createElement(NfCard, {
            tone: 'bull', kicker: "Today's News",
            defaultTitle: 'Hong Kong Expands Cryptocurrency Market with New Exchange Approvals.',
            defaultDate: 'December 5, 2024',
            emptyLabel: 'Bullish headlines will appear here.',
            icon: 'trending_up', 'data-comment-anchor': 'nf-bull',
          }),
          React.createElement(NfCard, {
            tone: 'bear', kicker: "Today's News",
            defaultTitle: 'Solana Price Faces Potential Dip Below $200 After Federal Reserve Cut.',
            defaultDate: 'December 19, 2024',
            emptyLabel: 'Bearish headlines will appear here.',
            icon: 'trending_down', 'data-comment-anchor': 'nf-bear',
          })
        ),
        React.createElement(NfControls, { rowRef })
      )
    );
  }

  window.NewsFeed = NewsFeed;
})();
