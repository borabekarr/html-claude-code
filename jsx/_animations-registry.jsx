/* _animations-registry.jsx — browser-JSX port of
 * apps/web/src/components/design-system/animations-registry/AnimationsRegistry.tsx
 * (+ inlined guides.ts data).
 * New port (ax-jeru-push Step 7). The canonical page embeds the live
 * AnimatedList/NumberFlow/PrizeSheet/Shimmer demo components inside each
 * card's stage; per the plan's "port the visible registry page, not the
 * underlying token build tooling" instruction, each stage here is a small
 * simplified-but-faithful reproduction (transform/opacity only, using the
 * exact duration/easing tokens that guide row documents for that slug) —
 * not a re-embed of those four full component ports.
 */
(function () {
  /* ================= registry subset (inlined, static — animation-category
   * Finished slugs, mirroring component-registry.ts's filter for this page). ================= */

  const CARDS = [
    { slug: 'animated-list', name: 'Animated List' },
    { slug: 'number-flow', name: 'Number Flow' },
    { slug: 'prize-sheet', name: 'Prize sheet' },
    { slug: 'shimmer', name: 'Shimmer' },
  ];

  /* ================= guides.ts (inlined, verbatim). ================= */

  const FAMILY_RULES = [
    {
      family: 'Popover',
      tokens: '--popover-dur / --popover-exit-dur / --popover-ease',
      source: 'Dropdown.css + MessageDropdown.css (settled curve wins)',
      usage: 'Use .motion-popover for any anchored open/close (menus, comboboxes).',
      band: '200ms open / 150ms close (exit one tier faster).',
    },
    {
      family: 'Tooltip',
      tokens: '--tooltip-dur / --tooltip-exit-dur / --tooltip-ease / --tooltip-transform-ease',
      source: 'WorkflowNodes .wf-tool::after (cleanest monotonic curve)',
      usage: 'Use .motion-tooltip for hover/focus-triggered labels.',
      band: '200ms open / 150ms close (exit one tier faster; recipe defaulted 140ms at component scale).',
    },
    {
      family: 'Sliding panel / drawer',
      tokens: '--panel-settle-dur / --panel-settle-ease',
      source: 'SmoothDrawer.css settle transition (open/close, not live drag)',
      usage: 'Governs the settle only; [data-panel-state] keyframes stay the live-drag primitive.',
      band: 'Fast tier + --ease-out — deviates from a fixed band because live-drag gesture settle is Apple-physics-justified, not a static open/close.',
    },
    {
      family: 'Overlay morph',
      tokens: '--overlay-morph-dur / --overlay-morph-exit-dur / --overlay-morph-ease',
      source: 'MorphSurface.css --ms2-ease/--ms2-morph-dur',
      usage: 'Use .motion-overlay-morph for width/height/border-radius surface morphs.',
      band: '300ms open / 240ms close (exit one tier faster) — MorphSurface itself keeps its local 360ms (--duration-sweep) as a documented dynamic-island-style exception.',
    },
    {
      family: 'Accordion',
      tokens: '--accordion-dur / --accordion-exit-dur / --accordion-ease',
      source: 'DisclosureGroup.css --dg-dur/--dg-ease (easing aliased to house, overshoot dropped)',
      usage: 'Use .motion-accordion for expand/collapse; grid-template-rows stays the documented layout-property exception.',
      band: '380ms open / 260ms close (exit one tier faster), preserved from the recipe rather than compressed to a house band.',
    },
    {
      family: 'Toast',
      tokens: '--toast-dur / --toast-exit-dur / --toast-ease',
      source: 'Toast.css ts-enter keyframe',
      usage: 'Use .motion-toast / .motion-toast.is-exiting (animation-direction: reverse mirrors enter, no second keyframe).',
      band: 'Base tier open (160ms) / 120ms close (exit one tier faster, --duration-fast) — house bands, not a popover/overlay band.',
    },
    {
      family: 'Stagger',
      tokens: '--stagger-item-dur / --stagger-item-ease + --stagger-entrance',
      source: 'AnimatedList.css entry transition + existing --stagger-entrance increment',
      usage: 'Use .motion-stagger-item with --stagger-index set per row for DOM-order reveal.',
      band: '240ms per-item + 100ms DOM-order increment.',
    },
  ];

  const GUIDES = {
    'animated-list': {
      when: 'Live/real-time feeds where rows arrive continuously and older rows must age out (activity streams, notifications).',
      tokens: 'Per-row entrance/removal timer at 560ms, wrapped in var(--anim-mult).',
      doLine: 'Do cap maxVisible so the slot model stays a fixed, absolute-positioned stack.',
      dontLine: "Don't reuse it for a static, finite list — the absolute-slot model exists only to absorb continuous churn.",
    },
    'number-flow': {
      when: 'Any numeral that changes value in place — currency, counters, percentages — where a hard cut reads as broken.',
      tokens: '--duration-slow (220ms) / --duration-base (160ms) transform+box-shadow, eased with --ease-out and --ease-spring.',
      doLine: 'Do use DsNumberFlow for the house tabular-nums treatment instead of raw @number-flow/react.',
      dontLine: "Don't drive it from Math.random() in production copy — reserve nondeterministic values for demo/shuffle contexts only.",
    },
    'prize-sheet': {
      when: 'A rewarding, high-stakes claim moment (bonus unlock, milestone) that deserves a dedicated confetti moment — not routine confirmations.',
      tokens: '--duration-560/--duration-expand spring-loose entrance, --duration-sweep fade, all via --ease-spring-loose/--ease-spring-medium/--ease-fade.',
      doLine: 'Do keep it mobile bottom-sheet / desktop dialog responsive — the two surfaces share one claim flow.',
      dontLine: "Don't stack more than one prize sheet trigger on a screen; the claim flow assumes a single focal reward.",
    },
    shimmer: {
      when: 'Content still loading behind a card or list row, as a placeholder that communicates "more is coming" without a blocking spinner.',
      tokens: '--shim-dur (1500ms default) continuous loop, wave via --ease-linear, pulse via --ease-in-out.',
      doLine: 'Do swap it out the moment real content resolves — it is a loading state, not decoration.',
      dontLine: "Don't run it indefinitely with no data fetch behind it; a shimmer with nothing to reveal reads as a stuck UI.",
    },
  };

  /* ================= simplified per-slug demo stages (transform/opacity only,
   * durations/easing lifted straight from the guide row above). ================= */

  function AnimatedListStage() {
    return React.createElement('div', { className: 'areg-demo areg-demo-list' },
      [0, 1, 2].map((i) => React.createElement('div', { key: i, className: 'areg-demo-row', style: { '--areg-i': i } }, `Row ${i + 1}`))
    );
  }
  function NumberFlowStage() {
    return React.createElement('div', { className: 'areg-demo areg-demo-number' }, '1,204');
  }
  function PrizeSheetStage() {
    return React.createElement('div', { className: 'areg-demo areg-demo-prize' },
      React.createElement('div', { className: 'areg-demo-prize-card' }, 'Reward unlocked')
    );
  }
  function ShimmerStage() {
    return React.createElement('div', { className: 'areg-demo areg-demo-shimmer' });
  }

  const DEMOS = {
    'animated-list': AnimatedListStage,
    'number-flow': NumberFlowStage,
    'prize-sheet': PrizeSheetStage,
    shimmer: ShimmerStage,
  };

  function AnimationsRegistry() {
    return React.createElement('div', { className: 'card areg-outer', style: { padding: 0 } },
      React.createElement('div', { className: 'areg-grid' },
        CARDS.map((entry) => {
          const Demo = DEMOS[entry.slug];
          const guide = GUIDES[entry.slug];
          return React.createElement('div', { className: 'areg-card', key: entry.slug },
            React.createElement('div', { className: 'areg-title' }, entry.name),
            React.createElement('div', { className: 'areg-stage' },
              React.createElement('div', { className: 'areg-stage-inner' }, Demo ? React.createElement(Demo, null) : null)
            ),
            guide && React.createElement('div', { className: 'areg-guide' },
              React.createElement('p', { className: 'areg-guide-line' }, React.createElement('span', { className: 'areg-guide-label' }, 'When: '), guide.when),
              React.createElement('p', { className: 'areg-guide-line' }, React.createElement('span', { className: 'areg-guide-label' }, 'Tokens: '), guide.tokens),
              React.createElement('p', { className: 'areg-guide-line' }, React.createElement('span', { className: 'areg-guide-label' }, 'Do: '), guide.doLine),
              React.createElement('p', { className: 'areg-guide-line' }, React.createElement('span', { className: 'areg-guide-label' }, "Don't: "), guide.dontLine)
            )
          );
        })
      ),
      React.createElement('div', { className: 'areg-family-rules' },
        React.createElement('div', { className: 'areg-family-title' }, 'Motion family rules'),
        React.createElement('p', { className: 'areg-family-intro' },
          'One global duration/easing rule per recurring interaction family, applied across the existing recipe components rather than owning a demo card of its own. Source of truth: the "Motion family rules" block in motion-tokens.css.'
        ),
        React.createElement('table', { className: 'areg-family-table' },
          React.createElement('thead', null,
            React.createElement('tr', null,
              React.createElement('th', null, 'Family'),
              React.createElement('th', null, 'Tokens'),
              React.createElement('th', null, 'Source'),
              React.createElement('th', null, 'Usage'),
              React.createElement('th', null, 'Band')
            )
          ),
          React.createElement('tbody', null,
            FAMILY_RULES.map((rule) => React.createElement('tr', { key: rule.family },
              React.createElement('td', null, rule.family),
              React.createElement('td', null, rule.tokens),
              React.createElement('td', null, rule.source),
              React.createElement('td', null, rule.usage),
              React.createElement('td', null, rule.band)
            ))
          )
        )
      )
    );
  }

  window.AnimationsRegistry = AnimationsRegistry;
})();
