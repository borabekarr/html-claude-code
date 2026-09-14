/* _shimmer.jsx — browser-JSX port of
 * apps/web/src/components/design-system/shimmer/Shimmer.tsx.
 * NEW port (ax-jeru-push Step 6): Finished, never previously in the mirror.
 */
(function () {
  const { createContext, useContext, useEffect, useMemo, useRef, useState } = React;

  // ── presets ──────────────────────────────────────────────────────────────

  const SHIMMER_PRESETS = {
    light: { base: '#E2E8F0', hi: 'rgba(255,255,255,0.85)' },
    dark: { base: '#233047', hi: 'rgba(255,255,255,0.13)' },
  };

  function resolveColors(preset, shimmerColors) {
    if (preset === 'custom' && shimmerColors && shimmerColors.length >= 2) {
      return { base: shimmerColors[0], hi: shimmerColors[1] };
    }
    return SHIMMER_PRESETS[preset === 'dark' ? 'dark' : 'light'];
  }

  // ── group context ─────────────────────────────────────────────────────────

  const ShimmerCtx = createContext(null);

  function ShimmerGroup({ isLoading, preset, duration, direction, variant, shimmerColors, children }) {
    const value = useMemo(
      () => ({ isLoading, preset, duration, direction, variant, shimmerColors }),
      [isLoading, preset, duration, direction, variant, shimmerColors]
    );
    return <ShimmerCtx.Provider value={value}>{children}</ShimmerCtx.Provider>;
  }

  // ── the primitive ────────────────────────────────────────────────────────

  function Shimmer({
    isLoading,
    children,
    width,
    height,
    radius,
    circle = false,
    duration,
    variant,
    direction,
    preset,
    shimmerColors,
    opacity = 1,
    style,
  }) {
    const grp = useContext(ShimmerCtx) || {};
    const loading = isLoading != null ? isLoading : grp.isLoading != null ? grp.isLoading : true;
    const dur = duration != null ? duration : grp.duration != null ? grp.duration : 1500;
    const vr = variant || grp.variant || 'shimmer';
    const dir = direction || grp.direction || 'leftToRight';
    const pr = preset || grp.preset || 'light';
    const colors = shimmerColors || grp.shimmerColors;

    const { base, hi } = resolveColors(pr, colors);

    // prefers-reduced-motion gated: reduced motion drops straight to reveal,
    // no in-flight sweep to finish.
    const outerRef = useRef(null);
    const [finishing, setFinishing] = useState(false);
    useEffect(() => {
      if (loading || children == null) return;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const el = outerRef.current;
      if (reduced || !el) return;
      setFinishing(true);
      const done = () => setFinishing(false);
      el.addEventListener('animationiteration', done);
      el.addEventListener('animationend', done);
      return () => {
        el.removeEventListener('animationiteration', done);
        el.removeEventListener('animationend', done);
      };
    }, [loading, children]);
    const visualLoading = loading || finishing;

    if (!visualLoading && children != null) {
      return (
        <div className="sh-reveal" style={style}>
          {children}
        </div>
      );
    }

    const skStyle = {
      width: width != null ? width : '100%',
      height: height != null ? height : children ? undefined : 16,
      borderRadius: circle ? '9999px' : radius != null ? radius : 8,
      opacity,
      '--sk-base': base,
      '--sk-hi': hi,
      '--shim-dur': dur + 'ms',
      ...style,
    };

    return (
      <span className="shimmer" data-variant={vr} data-dir={dir} style={skStyle} aria-hidden="true" ref={outerRef}>
        <span className="wave" />
        {children != null && <span style={{ visibility: 'hidden', display: 'block' }}>{children}</span>}
      </span>
    );
  }

  // ====================================================================
  // DEMO — a profile card that toggles between skeleton + real content.
  // ====================================================================

  function Stat({ num, lab }) {
    return (
      <div className="pc-stat">
        <span className="pc-num">{num}</span>
        <span className="pc-lab">{lab}</span>
      </div>
    );
  }

  function ProfileCard({ loading, group }) {
    return (
      <ShimmerGroup {...group} isLoading={loading}>
        <div className="pc-head">
          <Shimmer circle width={56} height={56}>
            <div className="pc-avatar">DH</div>
          </Shimmer>
          <div className="pc-id" style={{ flex: 1 }}>
            <Shimmer width={loading ? 140 : undefined} height={15} radius={6}>
              <p className="pc-name">Dana Holloway</p>
            </Shimmer>
            <Shimmer width={loading ? 92 : undefined} height={11} radius={6}>
              <p className="pc-handle">@dana · Product</p>
            </Shimmer>
          </div>
        </div>

        {loading ? (
          <div className="sk-stats">
            {[0, 1, 2].map((i) => (
              <Shimmer key={i} height={62} radius={12} />
            ))}
          </div>
        ) : (
          <div className="pc-stats sh-reveal">
            <Stat num="248" lab="Deals" />
            <Stat num="92%" lab="Win rate" />
            <Stat num="14" lab="Streak" />
          </div>
        )}

        <Shimmer height={46} radius={16}>
          <button type="button" className="pc-btn">View profile</button>
        </Shimmer>
      </ShimmerGroup>
    );
  }

  const DEMO_GROUP = {
    preset: 'light',
    duration: 1500,
    direction: 'leftToRight',
    variant: 'shimmer',
  };

  function ShimmerDemo() {
    const [loading, setLoading] = useState(false);
    const trigger = () => {
      setLoading(true);
      window.setTimeout(() => setLoading(false), 2200);
    };

    const group = DEMO_GROUP;

    return (
      <div style={{ display: 'grid', placeItems: 'center', gap: 16 }}>
        <div className="sh-stage">
          <div className="sh-surface">
            <ProfileCard loading={loading} group={group} />
          </div>
        </div>
        <button type="button" className="sh-trigger" onClick={trigger} disabled={loading}>
          {loading ? 'Loading…' : 'Trigger loading'}
        </button>
      </div>
    );
  }

  window.ShimmerDemo = ShimmerDemo;
})();
