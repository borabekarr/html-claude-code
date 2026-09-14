/* _animated-header-scroll.jsx — browser-JSX port of
 * apps/web/src/components/design-system/animated-header-scroll/AnimatedHeaderScroll.tsx.
 * New port (ax-jeru-push Step 7). Already de-scaffolded in the canonical
 * source (.device is a fixed-size 384x712 phone frame, not a page wrapper).
 * The scroll handler is attached via a React onScroll prop (not an
 * addEventListener + cleanup pair), so there is no callback-ref cleanup
 * closure to rewrite here; the idle-timer + rAF flag are cleared on unmount
 * via a stash-cleanup-on-element ref on the outer .device node (precedent
 * _prize-sheet.jsx:128-141) rather than a raw useEffect return, since this
 * harness's React 18.3.1 calls callback refs with null on unmount instead of
 * invoking a returned cleanup closure (React-19-only behavior).
 */
(function () {
  const { useCallback, useRef } = React;

  const COLLAPSE_DIST = 92;
  const MAX_BLUR = 22;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const smooth = (t) => t * t * (3 - 2 * t);

  const FEED = [
    { ic: 'trending_up', c: '#10B981', name: 'Northwind Traders', meta: 'Moved to Negotiation', amt: '$84.0k', time: '2h', pill: ['Hot', '#FFF7ED', '#F97316', 'local_fire_department'] },
    { in: 'AC', c: '#6366F1', name: 'Acme Corp · Renewal', meta: 'Proposal sent to Dana W.', amt: '$42.0k', time: '4h' },
    { ic: 'check_circle', c: '#10B981', name: 'Globex Inc', meta: 'Deal won — onboarding queued', amt: '$120k', time: 'Today', pill: ['Won', '#ECFDF5', '#059669', 'verified'] },
    { in: 'LR', c: '#0EA5E9', name: 'Lumen Retail', meta: 'Discovery call booked', amt: '$28.5k', time: 'Yest.' },
    { ic: 'schedule', c: '#EAB308', name: 'Vertex Systems', meta: 'Awaiting signature · 3d', amt: '$67.0k', time: '1d', pill: ['Stalled', '#FEFCE8', '#A16207', 'hourglass_top'] },
    { in: 'PD', c: '#EC4899', name: 'Pinnacle Design', meta: 'New lead assigned to you', amt: '$15.0k', time: '1d' },
    { in: 'OS', c: '#8B5CF6', name: 'Orbit Software', meta: 'Demo completed · follow up', amt: '$96.0k', time: '2d' },
    { in: 'BH', c: '#14B8A6', name: 'Beacon Health', meta: 'Contract under review', amt: '$210k', time: '3d' },
    { in: 'QF', c: '#F97316', name: 'Quanta Foods', meta: 'Re-engaged after 30 days', amt: '$33.0k', time: '4d' },
  ];

  function Actions() {
    return React.createElement('div', { className: 'actions' },
      React.createElement('button', { type: 'button', className: 'icon-btn', 'aria-label': 'Search' }, React.createElement('span', { className: 'material-icons' }, 'search')),
      React.createElement('button', { type: 'button', className: 'icon-btn accent', 'aria-label': 'Add deal' }, React.createElement('span', { className: 'material-icons' }, 'add'))
    );
  }

  function AnimatedHeaderScroll() {
    const deviceRef = useRef(null);
    const scrollerRef = useRef(null);
    const pinnedRef = useRef(null);
    const pinnedBarRef = useRef(null);
    const hintRef = useRef(null);
    const ticking = useRef(false);
    const idleTimer = useRef(null);

    const update = useCallback(() => {
      ticking.current = false;
      const device = deviceRef.current;
      const scroller = scrollerRef.current;
      const pinned = pinnedRef.current;
      const pinnedBar = pinnedBarRef.current;
      const hint = hintRef.current;
      if (!device || !scroller || !pinned || !pinnedBar || !hint) return;

      const p = clamp(scroller.scrollTop / COLLAPSE_DIST, 0, 1);
      const pbar = smooth(p);
      const ptitle = smooth(clamp((p - 0.42) / 0.58, 0, 1));
      const plarge = 1 - smooth(clamp(p / 0.62, 0, 1));

      device.style.setProperty('--p', p.toFixed(4));
      device.style.setProperty('--pbar', pbar.toFixed(4));
      device.style.setProperty('--ptitle', ptitle.toFixed(4));
      device.style.setProperty('--plarge', plarge.toFixed(4));

      const maxBlur = Number.parseFloat(device.style.getPropertyValue('--blur')) || MAX_BLUR;
      const blur = `blur(${(pbar * maxBlur).toFixed(1)}px) saturate(160%)`;
      pinned.style.backdropFilter = blur;
      pinned.style.setProperty('-webkit-backdrop-filter', blur);
      const isDark = device.classList.contains('dark') || document.documentElement.classList.contains('dark');
      const rgb = isDark ? '15,23,42' : '255,255,255';
      pinned.style.background = `rgba(${rgb},${(pbar * 0.78).toFixed(3)})`;

      if (p > 0.06) hint.classList.add('hide');
      else hint.classList.remove('hide');

      pinnedBar.classList.toggle('revealed', ptitle > 0.5);
    }, []);

    const onScroll = useCallback(() => {
      deviceRef.current?.classList.add('is-scrolling');
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        deviceRef.current?.classList.remove('is-scrolling');
      }, 160);

      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    }, [update]);

    // Same stash-cleanup-on-element pattern as _fab.jsx/_metric-card.jsx: init
    // the --blur var and run the first collapse-math pass once the device
    // frame mounts, tear down the idle timer once it unmounts (React 18
    // harness calls callback refs with `null` on unmount rather than
    // invoking a returned cleanup closure).
    const deviceCb = useCallback((el) => {
      if (el) {
        deviceRef.current = el;
        el.style.setProperty('--blur', `${MAX_BLUR}px`);
        update();
        el.__ahsCleanup = () => {
          if (idleTimer.current) clearTimeout(idleTimer.current);
        };
      } else {
        deviceRef.current?.__ahsCleanup?.();
        deviceRef.current = null;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return React.createElement('div', { className: 'device', ref: deviceCb },
      React.createElement('div', { className: 'screen' },
        React.createElement('div', { className: 'pinned', ref: pinnedRef },
          React.createElement('div', { className: 'rule' }),
          React.createElement('div', { className: 'pinned-bar', ref: pinnedBarRef },
            React.createElement('div', { className: 'pinned-title' },
              React.createElement('div', { className: 't' }, 'Pipeline'),
              React.createElement('div', { className: 's' }, '8 deals · $2.4M open')
            ),
            React.createElement(Actions, null)
          )
        ),
        React.createElement('div', { className: 'statusbar' },
          React.createElement('span', null, '9:41'),
          React.createElement('div', { className: 'dots' },
            React.createElement('span', { className: 'ico' }, 'signal_cellular_alt'),
            React.createElement('span', { className: 'ico' }, 'wifi'),
            React.createElement('span', { className: 'ico' }, 'battery_full')
          )
        ),
        React.createElement('div', { className: 'scroller', ref: scrollerRef, onScroll: onScroll },
          React.createElement('div', { className: 'content' },
            React.createElement('div', { className: 'large-head' },
              React.createElement('div', { className: 'large-head-title' },
                React.createElement('div', { className: 'eyebrow' }, 'Sales'),
                React.createElement('h1', null, 'Pipeline'),
                React.createElement('div', { className: 'sub' }, '8 deals · $2.4M open')
              ),
              React.createElement(Actions, null)
            ),
            React.createElement('div', { className: 'feed' },
              React.createElement('div', { className: 'hero' },
                React.createElement('div', { className: 'k' }, 'Pipeline this month'),
                React.createElement('div', { className: 'v' }, '$2.41M'),
                React.createElement('div', { className: 'row2' },
                  React.createElement('span', { className: 'delta' }, React.createElement('span', { className: 'material-icons' }, 'arrow_upward'), '12.5%'),
                  React.createElement('span', { style: { opacity: 0.88 } }, 'vs. $2.14M last month')
                )
              ),
              FEED.map((it) => React.createElement('div', { className: 'row', key: it.name },
                React.createElement('div', { className: 'av', style: { background: it.c } },
                  it.ic ? React.createElement('span', { className: 'material-icons' }, it.ic) : it.in
                ),
                React.createElement('div', { className: 'mid' },
                  React.createElement('div', { className: 'name' }, it.name),
                  React.createElement('div', { className: 'meta' }, it.meta)
                ),
                React.createElement('div', { className: 'end' },
                  React.createElement('div', { className: 'amt' }, it.amt),
                  it.pill
                    ? React.createElement('div', { style: { marginTop: 5 } },
                        React.createElement('span', { className: 'pill', style: { background: it.pill[1], color: it.pill[2] } },
                          React.createElement('span', { className: 'material-icons' }, it.pill[3]), it.pill[0]
                        )
                      )
                    : React.createElement('div', { className: 'time' }, it.time)
                )
              ))
            )
          )
        ),
        React.createElement('div', { className: 'scroll-hint', ref: hintRef }, React.createElement('span', { className: 'material-icons' }, 'expand_more'), 'Scroll to collapse'),
        React.createElement('div', { className: 'home-ind' })
      )
    );
  }

  window.AnimatedHeaderScroll = AnimatedHeaderScroll;
})();
