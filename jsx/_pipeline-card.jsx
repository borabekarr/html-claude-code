(function () {
  const { useState, useRef, useCallback } = React;

  /**
   * PipelineCard — browser-JSX port of the current PipelineCard.tsx + its
   * pipeline-card-hook.ts. Regenerated fresh from the .tsx (NOT the retired
   * June prototype) since the source has evolved since that earlier port.
   *
   * NO raw useEffect in this file. Timers are wired via callback refs on DOM
   * elements (pattern: pipeline-card-hook.ts). State manages popover open/close
   * and inline-discuss panels. The inverted popover detail overlay is React state.
   */

  // ---------------------------------------------------------------------------
  // Inlined from pipeline-card-hook.ts — DOM-side behavior.
  // NO raw useEffect anywhere. All side-effects are expressed via callback
  // refs or event handlers.
  // ---------------------------------------------------------------------------

  /** Eases t in [0..1] with a cubic ease-out curve. */
  function ease(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /** Start a count-up tween. Returns a cleanup function. */
  function startCountUp(el, from, to, duration, format) {
    let raf = null;
    let timer = null;
    const t0 = performance.now();

    function step(now) {
      const p = ease(Math.min(1, (now - t0) / duration));
      el.textContent = format(from + (to - from) * p);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      }
    }
    raf = requestAnimationFrame(step);
    timer = setTimeout(() => {
      if (raf !== null) cancelAnimationFrame(raf);
      el.textContent = format(to);
    }, duration + 70);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (timer !== null) clearTimeout(timer);
    };
  }

  // Ripple — fires from onClick handler, no hook needed
  function spawnRipple(e, el) {
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement('span');
    s.className = 'pc-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = e.clientX - r.left - size / 2 + 'px';
    s.style.top = e.clientY - r.top - size / 2 + 'px';
    el.appendChild(s);
    setTimeout(() => s.remove(), 500);
  }

  // Shell press ripple — full-card tactile ripple on click
  function spawnShellRipple(e, shell) {
    const r = shell.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'pc-shell-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = e.clientX - r.left - size / 2 + 'px';
    s.style.top = e.clientY - r.top - size / 2 + 'px';
    shell.appendChild(s);
    setTimeout(() => s.remove(), 560);
  }

  // Apply button flow
  function runApply(btn, onDone) {
    if (btn.classList.contains('is-loading') || btn.classList.contains('is-done')) return;
    btn.classList.add('is-loading');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      btn.classList.add('is-done');
    }, 850);
    setTimeout(onDone, 1480);
  }

  // Card removal animation — wired via callback ref on shell element
  function animateRemove(shell, onRemoved) {
    shell.style.overflow = 'hidden';
    shell.style.maxHeight = shell.offsetHeight + 'px';
    shell.classList.add('is-removing');
    requestAnimationFrame(() => {
      shell.style.maxHeight = '0px';
      shell.style.marginBottom = '-22px';
    });
    setTimeout(onRemoved, 420);
  }

  // AI chat — mount into the pcx-chat element
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  const THINK_STEPS = ['Reading the signal data', 'Comparing with similar past cases', 'Estimating impact & confidence'];

  // Scripted follow-up replies (cycling, so each new message feels varied)
  const SCRIPTED_REPLIES = [
    'Going on the signals above, acting now gives the strongest outcome. I can draft the next step or pull more detail whenever you want.',
    'The data points to this being the highest-leverage action right now. Want me to break down the specific risk factors?',
    'Based on the pattern match across similar cases, the confidence here is solid. I can show you the comparable situations if that helps.',
    'That is a good question. The timing is the key factor — the window is narrowest today, which is why this surfaced at the top.',
  ];
  let _replyIdx = 0;
  function nextReply() {
    const r = SCRIPTED_REPLIES[_replyIdx % SCRIPTED_REPLIES.length];
    _replyIdx++;
    return r;
  }

  // Typing animation — streams text into targetEl one character at a time
  function typeText(targetEl, text, onDone) {
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'pcx-typing-cursor';
    targetEl.appendChild(cursor);

    const interval = setInterval(() => {
      if (i < text.length) {
        cursor.insertAdjacentText('beforebegin', text[i]);
        i++;
      } else {
        clearInterval(interval);
        cursor.remove();
        if (onDone) onDone();
      }
    }, 18);
  }

  // Append a new chat bubble with entrance animation
  function appendBubble(log, role, html) {
    const wrap = document.createElement('div');
    wrap.className = `pcx-msg ${role} entering`;
    wrap.innerHTML = html;
    log.appendChild(wrap);
    setTimeout(() => wrap.classList.remove('entering'), 400);
    return wrap;
  }

  // Thinking steps then typed answer — shared by both the inline popover and
  // the RightPanel discuss chat
  function runThinkThenType(log, text, recoText, scrollFn) {
    const aiWrap = document.createElement('div');
    aiWrap.className = 'pcx-msg ai entering';
    aiWrap.innerHTML = `<span class="pcx-ai-av">AI</span><div class="pcx-ai-body"><div class="pcx-think" data-think>${THINK_STEPS.map((s, i) => `<div class="pcx-think-step" data-step="${i}"><span class="pcx-think-ic"><span class="pcx-spin sm"></span></span>${esc(s)}</div>`).join('')}</div><div class="pcx-answer" data-answer></div></div>`;
    log.appendChild(aiWrap);
    setTimeout(() => aiWrap.classList.remove('entering'), 400);
    scrollFn();

    const stepEls = aiWrap.querySelectorAll('[data-step]');

    function markDone(el) {
      el.classList.add('done');
      const ic = el.querySelector('.pcx-think-ic');
      if (ic) ic.innerHTML = '<span class="material-symbols-outlined">check</span>';
    }

    let idx = 0;
    function tick() {
      if (idx < stepEls.length) {
        if (idx > 0) markDone(stepEls[idx - 1]);
        stepEls[idx].classList.add('active');
        idx++;
        setTimeout(tick, 660);
      } else {
        markDone(stepEls[stepEls.length - 1]);
        const ansEl = aiWrap.querySelector('[data-answer]');
        const bubble = document.createElement('div');
        bubble.className = 'pcx-bubble ai-plain';
        ansEl.appendChild(bubble);
        ansEl.classList.add('show');
        scrollFn();

        typeText(bubble, text, () => {
          if (recoText) {
            const reco = document.createElement('div');
            reco.className = 'pcx-answer-reco';
            reco.innerHTML = `<span class="material-symbols-outlined">tips_and_updates</span><span>${esc(recoText)}</span>`;
            bubble.appendChild(reco);
          }
          scrollFn();
        });
      }
    }
    setTimeout(tick, 360);
  }

  // Stub: triggered when the mini-chat panel hands off a first message.
  function onTriggerGlobalChat(_message) {
    // no-op placeholder — future: open the global AI chat overlay with this message
  }

  // fix #5 — wireDiscussInput:
  //   RightPanel discuss accepts ONE first message only.
  //   On send: collapse the panel (onClosePanel) + fire the global chat stub.
  //   No chat history is appended; no follow-up conversation runs in this panel.
  //
  //   For the AskBlock / mountAiChat path (no onClosePanel), the full scripted
  //   AI chat flow still runs — handled by mountAiChat which wires its own follow-up.
  function wireDiscussInput(fi, fs, log, scrollFn, onClosePanel) {
    let sent = false;

    function pulseSend() {
      fs.classList.remove('act');
      void fs.offsetWidth;
      fs.classList.add('act');
    }

    function send() {
      const text = fi.value.trim();
      if (!text || sent) return;
      sent = true;
      fi.value = '';

      if (onClosePanel) {
        pulseSend();
        onTriggerGlobalChat(text);
        setTimeout(() => onClosePanel(), 160);
        return;
      }

      if (log.style.display === 'none') {
        log.style.display = 'flex';
        log.style.flexDirection = 'column';
        log.style.gap = '10px';
      }
      appendBubble(log, 'user', `<div class="pcx-bubble">${esc(text)}</div>`);
      scrollFn();

      setTimeout(() => {
        runThinkThenType(log, nextReply(), undefined, scrollFn);
        setTimeout(() => { sent = false; }, 2200);
      }, 340);
    }

    fs.addEventListener('click', (ev) => { ev.stopPropagation(); pulseSend(); send(); });
    fi.addEventListener('click', (ev) => ev.stopPropagation());
    fi.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault(); pulseSend(); send();
      }
    });
  }

  function mountAiChat(chatEl, data) {
    if (chatEl.classList.contains('open')) return;
    chatEl.classList.add('open');

    const q = 'Why did the AI surface this ' + data.typeShort + '?';
    chatEl.innerHTML = `
    <div class="pcx-chat-log" data-log>
      <div class="pcx-msg user entering"><div class="pcx-bubble">${esc(q)}</div></div>
    </div>
    <div class="pcx-msgbox" data-msgbox><input placeholder="Ask a follow-up…" data-followup aria-label="Ask a follow-up"><button class="pcx-msgbox-send" data-followup-send aria-label="Send"><span class="material-symbols-outlined">arrow_upward</span></button></div>`;

    const initUser = chatEl.querySelector('.pcx-msg.user.entering');
    if (initUser) setTimeout(() => initUser.classList.remove('entering'), 400);

    const log = chatEl.querySelector('[data-log]');
    function scrollLog() { log.scrollTop = log.scrollHeight; }

    runThinkThenType(log, data.finding, data.reco, scrollLog);

    const fi = chatEl.querySelector('[data-followup]');
    const fs = chatEl.querySelector('[data-followup-send]');
    if (fi && fs) wireDiscussInput(fi, fs, log, scrollLog);

    const msgbox = chatEl.querySelector('[data-msgbox]');
    if (msgbox && fi) {
      msgbox.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (ev.target.closest('[data-followup-send]')) return;
        fi.focus();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  const PRI = {
    high: { label: 'HIGH PRIORITY' },
    med:  { label: 'MEDIUM PRIORITY' },
    low:  { label: 'LOW PRIORITY' },
  };

  const TYPES = {
    marketing:  { badge: 'Campaign Decision', icon: 'campaign',         cls: 't-marketing',  short: 'campaign',     applyIcon: 'pause_circle',    tone: 'orange' },
    pricing:    { badge: 'Price Update',      icon: 'sell',             cls: 't-pricing',    short: 'price update', applyIcon: 'send',            tone: 'violet' },
    lead:       { badge: 'Qualified Lead',    icon: 'how_to_reg',       cls: 't-lead',       short: 'lead list',    applyIcon: 'call',            tone: 'sky'    },
    automation: { badge: 'Automation',        icon: 'settings_suggest', cls: 't-automation', short: 'automation',   applyIcon: 'build',           tone: 'slate'  },
  };

  const INITIAL_CARDS = [
    {
      id: 'auto1', type: 'automation', priority: 'high', isError: true, category: 'Automation · Error', catTone: 'red',
      impact: 88, impactWhy: 'The queued fix — retry the step and switch the sender domain — cleared 9 of the last 10 delivery failures like this one.',
      title: '"Proposal Follow-up" automation is failing',
      desc: 'Mail delivery failed on the last 3 triggers — 12 customers have dropped out of the sequence since Tuesday.',
      potential: 19200, atRisk: true, potentialLabel: 'revenue at risk', applyLabel: 'Apply fix',
      chips: [{ icon: 'bolt', label: 'Automation', count: '1', tone: 'red' }, { icon: 'group', label: 'Affected', count: '12', tone: 'slate' }],
      discussSugg: ['What exactly broke?', 'Is the fix safe?'],
      finding: 'Surfaced because a live revenue automation has been silently erroring for 36 hours. Three consecutive triggers failed at the same step, and the affected contacts are mid-funnel — every hour without delivery widens the drop-off.',
      reco: 'Suggested fix is already queued: retry the failed send and switch the sender domain. One approval applies it.',
      confidence: 5,
      evidence: { title: 'What broke', kind: 'rows', rows: [
        { ic: 'error',    k: 'Failing step',    v: 'Send email · "Day 3 nudge"' },
        { ic: 'replay',   k: 'Failed triggers', v: '3 of last 3', trend: 'down', td: '100%' },
        { ic: 'schedule', k: 'Failing since',   v: '36 hours ago' },
      ]},
      entities: { title: 'Affected contacts', list: [
        { init: 'EY', name: 'Emre Yıldız',  sub: 'Stuck at "Day 3 nudge" · 2 days' },
        { init: 'SA', name: 'Selin Acar',   sub: 'Stuck at "Day 3 nudge" · 2 days' },
        { init: 'KT', name: 'Kaan Toprak',  sub: 'Stuck at "Day 3 nudge" · 1 day'  },
      ], more: 9 },
      outcomes: {
        act:  { v: '₺19,200', sub: 'pipeline kept moving — 12 contacts re-enter the sequence' },
        dont: { v: '12 → 0',  sub: 'contacts go cold and new triggers keep failing too' },
      },
      history: 'The last delivery failure in Q1 lost 7 contacts before anyone caught it — the same retry-and-swap fix recovered the sequence within an hour.',
      workflowLink: 'Proposal Follow-up',
    },
    {
      id: 'mkt1', type: 'marketing', priority: 'high',
      impact: 79, impactWhy: 'In comparable campaigns, pausing at this ROAS preserved about 79% of the remaining budget for redeployment.',
      title: 'Beşiktaş campaign budget runs out in 2 days',
      desc: 'CTR fell from 1.2% to 0.4% over 7 days and ROAS is down to 1.2× — spend is burning with almost no return.',
      potential: 24000, atRisk: true, potentialLabel: 'budget at risk', applyLabel: 'Approve pause',
      chips: [{ icon: 'campaign', label: 'Campaign', count: '1', tone: 'orange' }, { icon: 'donut_large', label: 'Segments', count: '2', tone: 'slate' }],
      discussSugg: ['Why pause now?', 'Is there an alternative?'],
      finding: 'Surfaced because daily spend is accelerating while conversions have flattened for 5 days straight. The budget empties in roughly 48 hours, so today is the last window to redirect it before it is gone.',
      reco: 'Pause the budget and redirect the remaining ₺24,000 to the high-intent Kadıköy segment.',
      confidence: 4,
      evidence: { title: 'Campaign metrics — 7-day trend', kind: 'rows', rows: [
        { ic: 'visibility',              k: 'Impressions',    v: '48.2k',      trend: 'up',   td: '18%' },
        { ic: 'ads_click',               k: 'Click-through rate', v: '0.4%',   trend: 'down', td: '67%' },
        { ic: 'shopping_cart_checkout',  k: 'Conversions',   v: '3 this week', trend: 'down', td: '72%' },
      ]},
      entities: { title: 'Affected campaigns', list: [
        { init: 'BŞ', name: 'Beşiktaş Spring Launch', sub: '₺24,000 remaining · ends in 2 days', val: '1.2× ROAS' },
        { init: 'KD', name: 'Kadıköy Retargeting',     sub: 'suggested redirect target', tag: 'TARGET' },
      ]},
      outcomes: {
        act:  { v: '₺24,000', sub: 'remaining budget protected and moved to a converting segment' },
        dont: { v: '₺0',      sub: 'budget fully spent at 1.2× ROAS over the next 48 hours' },
      },
      history: 'A similar pause in March recovered 60% of a stalling campaign\'s budget and lifted blended ROAS to 2.4×.',
    },
    {
      id: 'lead1', type: 'lead', priority: 'med',
      impact: 74, impactWhy: 'Across the three leads, the average historical conversion for this behaviour pattern — repeat views plus a WhatsApp open — is about 74%.',
      title: '3 new qualified leads — call today',
      desc: 'Mehmet Y. viewed the Beşiktaş apartment twice yesterday and opened WhatsApp. The buying window is narrowing.',
      potential: 52000, atRisk: false, potentialLabel: 'potential GCI', applyLabel: 'Start calls',
      chips: [{ icon: 'group', label: 'Leads', count: '3', tone: 'sky' }, { icon: 'local_fire_department', label: 'Hottest', tone: 'red' }],
      discussSugg: ['Who do I call first?', 'Draft an opener'],
      finding: 'Surfaced because three leads crossed the qualified threshold in the last 24 hours, and the strongest just showed buying intent twice. Call-back conversion drops by roughly half after 24 hours, so today is the window.',
      reco: 'Call Mehmet first while intent is hot, then work down the list by score.',
      confidence: 4,
      evidence: { title: 'Preferred contact channel', kind: 'rows', rows: [
        { ic: 'forum', k: 'From historical replies', v: 'WhatsApp — 3× faster than email' },
      ]},
      entities: { title: 'Leads — hottest first', list: [
        { init: 'MY', name: 'Mehmet Yılmaz', score: '92 · HOT',  scoreCls: '',     hot: true, call: true, sub: 'Viewed Beşiktaş apt ×2 · opened WhatsApp · 14h ago', strat: 'Lead with the price advantage — mention you noticed his interest and that a similar unit just sold.' },
        { init: 'Zİ', name: 'Zeynep İnce',   score: '81 · WARM', scoreCls: 'warm', call: true, sub: 'Requested the floor plan · 1 day ago' },
        { init: 'OK', name: 'Onur Kaya',     score: '68 · WARM', scoreCls: 'warm', call: true, sub: 'Used the mortgage calculator · 2 days ago' },
      ]},
      outcomes: {
        act:  { v: '3 calls',       sub: 'queued now while intent is high — tasks created automatically' },
        dont: { v: 'Window closes', sub: 'call-back conversion roughly halves after 24 hours' },
      },
      history: 'Leads called within the day this quarter closed at 2.3× the rate of next-day callbacks.',
    },
    {
      id: 'price1', type: 'pricing', priority: 'low',
      impact: 66, impactWhy: 'Listings re-priced to within 3% of the market closed about 66% faster across this portfolio over the past two quarters.',
      title: '3% discount suggestion for Kadıköy portfolio',
      desc: '2 units have sat unsold for 45 days and competing listings are 3% lower — a small cut should accelerate a close.',
      potential: 38000, atRisk: false, potentialLabel: 'portfolio value', applyLabel: 'Apply & notify',
      chips: [{ icon: 'group', label: 'Customers', count: '8', tone: 'sky' }, { icon: 'sell', label: 'Discount', count: '3%', tone: 'emerald' }],
      discussSugg: ['Why 3%, not 5%?', 'Show the comparables'],
      finding: 'Surfaced because two listings have aged past 45 days while comparable units nearby reduced their asking prices last week. A 3% adjustment closes the gap and gives 8 watching customers a reason to act now.',
      reco: 'Apply the 3% cut and auto-send the notification draft below to the 8 watching customers.',
      confidence: 3,
      evidence: { title: 'Price comparison', kind: 'price', current: '₺1.42M', market: '₺1.38M', suggested: '₺1.38M',
        draft: 'Good news — the Kadıköy unit you saved is now ₺1.38M, a 3% reduction. Would you like to schedule a viewing this week before it moves?' },
      entities: { title: 'Customers to notify', list: [
        { init: 'AD', name: 'Ayşe Demir',   sub: 'Saved this listing · last contact 6 days ago' },
        { init: 'BÇ', name: 'Burak Çelik',  sub: 'Viewed twice · last contact 11 days ago' },
        { init: 'EK', name: 'Elif Korkmaz', sub: 'Inquired in March · last contact 24 days ago' },
      ], more: 5 },
      outcomes: {
        act:  { v: '~9 days',  sub: 'estimated time-to-close · 8 customers notified instantly' },
        dont: { v: '45+ days', sub: 'listings keep aging while nearby prices stay lower' },
      },
      history: 'The last 3% adjustment in this portfolio closed a 50-day-old unit within a week.',
    },
  ];

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function fmt(n) {
    return '₺' + Math.round(n).toLocaleString('en-US');
  }

  function fmtK(n) {
    if (n == null) return '—';
    const a = Math.abs(n);
    if (a >= 1000) {
      const k = n / 1000;
      return '₺' + (a >= 10000 ? Math.round(k) : Math.round(k * 10) / 10) + 'K';
    }
    return '₺' + Math.round(n);
  }

  function applyToast(d) {
    return ({
      marketing:  'Campaign paused · budget redirected',
      pricing:    'Price updated · 8 customers notified',
      lead:       'Calls queued · 3 tasks created',
      automation: 'Fix applied · sequence resumed',
    })[d.type] || 'Applied';
  }

  // ---------------------------------------------------------------------------
  // Sub-components (pure markup, no side effects)
  // ---------------------------------------------------------------------------

  function Tag({ icon, label, count, tone }) {
    const hasCount = count != null && count !== '';
    return (
      <span className={`pc-tag t-${tone}${hasCount ? '' : ' no-count'}`}>
        <span className="material-symbols-outlined">{icon}</span>
        {label}
        {hasCount && <span className="ct-count">{count}</span>}
      </span>
    );
  }

  function CatTag({ d }) {
    const T = TYPES[d.type];
    const tone = d.catTone || T.tone;
    return (
      <span className={`pc-tag pc-cat-tag no-count t-${tone}`}>
        <span className="material-symbols-outlined">{T.icon}</span>
        {d.category || T.badge}
      </span>
    );
  }

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
  // Card left panel
  // ---------------------------------------------------------------------------

  function LeftPanel({ d, priority, whyOpen, onToggleWhy }) {
    const T = TYPES[d.type];
    const leftProxRef = useProximityGroup();

    // Callback ref: runs count-up tween on the impact number element
    const impactRef = useCallback((el) => {
      if (!el) return;
      const cleanup = startCountUp(el, 0, d.impact, 700, (v) => String(Math.round(v)));
      el.__pcCleanup = cleanup;
    }, [d.impact]);

    // Callback ref: runs count-up tween on the potential number element
    const potRef = useCallback((el) => {
      if (!el) return;
      const cleanup = startCountUp(el, 0, d.potential ?? 0, 760, fmtK);
      el.__pcCleanup = cleanup;
    }, [d.potential]);

    return (
      <div ref={leftProxRef} style={{ display: 'contents' }}>
      <button
        type="button"
        className={`pc-left pri-${priority}${d.isError ? ' is-error' : ''}${whyOpen ? ' why-open' : ''}`}
        aria-expanded={whyOpen}
        aria-label={`${d.title} — toggle why panel`}
        onClick={(e) => { e.stopPropagation(); onToggleWhy(); }}
        data-proximity
      >
        <div className="pc-pri"><span className="pc-pri-dot"></span>{PRI[priority].label}</div>
        <div className="pc-ghost"><span className="material-symbols-outlined">{T.icon}</span></div>
        <div className="pc-mid">
          <div className="pc-stats">
            <div className="pc-stat-cell impact">
              <div className="pc-impact-row">
                <span className="pc-impact-n" ref={impactRef}>0</span>
                <span className="pc-impact-pct">%</span>
              </div>
              <div className={`pc-stat-l toggle${whyOpen ? ' open' : ''}`}>
                Impact score<span className="material-symbols-outlined">expand_more</span>
              </div>
              <div className="pc-bar">
                <div className="pc-bar-fill" style={{ width: d.impact + '%' }}></div>
              </div>
            </div>
            {d.potential != null ? (
              <div className="pc-stat-cell">
                <div className={`pc-stat-n${d.atRisk ? ' at-risk' : ''}`} ref={potRef}>{fmtK(0)}</div>
                <div className="pc-stat-l">{d.potentialLabel || 'potential'}</div>
              </div>
            ) : (
              <div className="pc-stat-cell">
                <div className="pc-stat-n na">—</div>
                <div className="pc-stat-l">{d.potentialLabel || 'potential'}</div>
              </div>
            )}
          </div>
          <div className={`pc-why${whyOpen ? ' open' : ''}`}>
            <div className="pc-why-in">
              <span className="material-symbols-outlined">neurology</span>
              {d.impactWhy}
            </div>
          </div>
        </div>
      </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Card right panel
  // ---------------------------------------------------------------------------

  function RightPanel({
    d, discussOpen, snoozeOpen,
    onOpenDetail, onToggleDiscuss, onToggleSnooze, onSnoozeItem,
    onApply, onCloseDiscuss,
  }) {
    const T = TYPES[d.type];
    const applyRef = useRef(null);
    const inputRef = useRef(null);
    const discussLogRef = useRef(null);
    const sendBtnRef = useRef(null);
    const headToolsRef = useProximityGroup();
    const discussInProxRef = useProximityGroup();
    const actionsRef = useProximityGroup();

    // Callback ref: wire discuss input to the first-message-only flow
    const discussInRef = useCallback((el) => {
      discussInProxRef(el);
      if (!el) return;
      const fi = el.querySelector('[data-discuss-in]');
      const fs = el.querySelector('[data-discuss-send]');
      const log = el.querySelector('[data-discuss-log]');
      if (!fi || !fs || !log) return;
      const scrollLog = () => { log.scrollTop = log.scrollHeight; };
      wireDiscussInput(fi, fs, log, scrollLog, onCloseDiscuss);
    }, [onCloseDiscuss, discussInProxRef]);

    return (
      <div
        className="pc-right"
        onClick={(e) => {
          if (e.target.closest('button, input, a, .pc-pop, .pc-discuss')) return;
          onOpenDetail();
        }}
      >
        {/* Header row */}
        <div className="pc-r-head">
          <CatTag d={d} />
          <div className="pc-head-tools" ref={headToolsRef}>
            <div className="pc-snooze-wrap">
              <button
                type="button"
                className={`pc-snooze${snoozeOpen ? ' open' : ''}`}
                aria-haspopup="menu"
                aria-label="Snooze options"
                onClick={(e) => { e.stopPropagation(); onToggleSnooze(); }}
              >
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
              <div className={`pc-pop${snoozeOpen ? ' open' : ''}`} role="menu">
                <button type="button" className="pc-pop-item" role="menuitem" onClick={(e) => { e.stopPropagation(); onSnoozeItem('tomorrow'); }}>
                  <span className="material-symbols-outlined">bedtime</span>Snooze to tomorrow
                </button>
                <button type="button" className="pc-pop-item" role="menuitem" onClick={(e) => { e.stopPropagation(); onSnoozeItem('low'); }}>
                  <span className="material-symbols-outlined">south</span>Lower priority
                </button>
              </div>
            </div>
            <button type="button" className="pc-expand" aria-label="Open details" aria-haspopup="dialog" onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}>
              <span className="material-symbols-outlined">open_in_full</span>
            </button>
          </div>
        </div>

        {/* Body text */}
        <div className="pc-body-txt">
          <div className="pc-title">{d.title}</div>
          <div className="pc-desc">{d.desc}</div>
          <div className="pc-chips">{(d.chips || []).map((c) => <Tag key={c.label} {...c} />)}</div>
        </div>

        {/* Inline discuss */}
        <div className={`pc-discuss${discussOpen ? ' open' : ''}`}>
          <div className="pc-discuss-in" ref={discussInRef}>
            <div className="pc-discuss-ctx">
              <span className="pc-ai-orb"><span className="material-symbols-outlined">neurology</span></span>
              <span>I&apos;ve loaded everything about this {T.short} — ask before you decide.</span>
            </div>
            <div className="pc-discuss-sugg">
              {(d.discussSugg || []).map((s) => (
                <button
                  type="button"
                  key={s}
                  className="pc-sugg"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (inputRef.current) {
                      inputRef.current.value = s;
                      inputRef.current.focus();
                      sendBtnRef.current?.click();
                    }
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* fix #5: chat log hidden by default; wireDiscussInput never appends history here */}
            <div
              className="pcx-chat-log"
              data-discuss-log
              ref={discussLogRef}
              style={{ display: 'none' }}
            ></div>
            <div
              className="pc-discuss-input"
              onClick={(e) => {
                // fix #4: clicking anywhere on the pill (outside send btn) focuses input
                e.stopPropagation();
                if (e.target.closest('[data-discuss-send]')) return;
                inputRef.current?.focus();
              }}
            >
              <input
                ref={inputRef}
                data-discuss-in
                placeholder="Ask about this card…"
                aria-label="Ask about this card"
              />
              <button
                type="button"
                ref={sendBtnRef}
                data-discuss-send
                className="pc-discuss-send"
                aria-label="Send"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined">arrow_upward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pc-foot">
          <div className="pc-actions" ref={actionsRef}>
            <button
              type="button"
              className={`pc-discuss-btn${discussOpen ? ' open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleDiscuss();
                if (!discussOpen) setTimeout(() => inputRef.current?.focus(), 140);
              }}
            >
              <span className="material-symbols-outlined">forum</span>Discuss
            </button>
            <button
              type="button"
              ref={applyRef}
              className="pc-apply"
              onClick={(e) => { e.stopPropagation(); if (applyRef.current) onApply(e, applyRef.current); }}
            >
              <span className="pc-apply-label">
                <span className="material-symbols-outlined">check_circle</span>
                Apply
              </span>
              <span className="pc-spin"></span>
              <span className="pc-check"><span className="material-symbols-outlined">check</span></span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Detail overlay sub-blocks
  // ---------------------------------------------------------------------------

  function EvidenceBlock({ evidence }) {
    let inner = null;
    if (evidence.kind === 'rows' && evidence.rows) {
      inner = (
        <div className="pcx-ev-rows">
          {evidence.rows.map((r) => (
            <div key={r.k} className="pcx-ev-row">
              <span className="pcx-ev-ic"><span className="material-symbols-outlined">{r.ic}</span></span>
              <div className="pcx-ev-txt">
                <div className="pcx-ev-k">{r.k}</div>
                <div className="pcx-ev-v">{r.v}</div>
              </div>
              {r.trend && (
                <span className={`pcx-trend ${r.trend}`}>
                  <span className="material-symbols-outlined">
                    {r.trend === 'up' ? 'trending_up' : r.trend === 'down' ? 'trending_down' : 'trending_flat'}
                  </span>
                  {r.td || ''}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    } else if (evidence.kind === 'price') {
      inner = (
        <div className="pcx-price">
          <div className="pcx-price-cell"><div className="pcx-price-l">Current</div><div className="pcx-price-v">{evidence.current}</div></div>
          <div className="pcx-price-cell"><div className="pcx-price-l">Market avg</div><div className="pcx-price-v">{evidence.market}</div></div>
          <div className="pcx-price-cell sug"><div className="pcx-price-l">Suggested</div><div className="pcx-price-v">{evidence.suggested}</div></div>
        </div>
      );
    }

    return (
      <div className="pcx-block">
        <p className="pcx-sec-title">
          <span className="pcx-sec-icon icon-badge icon-badge--sm" style={{ '--icon-c': '#0EA5E9' }}>
            <span className="material-symbols-outlined">analytics</span>
          </span>
          {evidence.title}
        </p>
        {inner}
        {evidence.draft && (
          <div className="pcx-draft" style={{ marginTop: '10px' }}>
            <div className="pcx-draft-head"><span className="material-symbols-outlined">edit_note</span>AI-drafted notification</div>
            <div className="pcx-draft-body">{evidence.draft}</div>
            <div className="pcx-draft-foot"><span className="material-symbols-outlined">lock</span>Sent only after you approve</div>
          </div>
        )}
      </div>
    );
  }

  function EntitiesBlock({ entities, onToast }) {
    return (
      <div className="pcx-block">
        <p className="pcx-sec-title">
          <span className="pcx-sec-icon icon-badge icon-badge--sm" style={{ '--icon-c': '#8B5CF6' }}>
            <span className="material-symbols-outlined">group</span>
          </span>
          {entities.title}
        </p>
        <div className="pcx-ent">
          {entities.list.map((p) => (
            <div key={p.name} className="pcx-ent-row">
              <span className={`pcx-ent-av${p.hot ? ' hot' : ''}`}>{p.init}</span>
              <div className="pcx-ent-main">
                <div className="pcx-ent-name">
                  {p.name}
                  {p.score && <span className={`pcx-ent-score ${p.scoreCls || ''}`}>{p.score}</span>}
                  {p.tag && <span className="pcx-ent-score cool">{p.tag}</span>}
                </div>
                <div className="pcx-ent-sub">{p.sub}</div>
                {p.strat && (
                  <div className="pcx-strat">
                    <span className="material-symbols-outlined">campaign</span>
                    <span>{p.strat}</span>
                  </div>
                )}
              </div>
              {p.val && <span className="pcx-ent-val">{p.val}</span>}
              {p.call && (
                <button
                  type="button"
                  className="pcx-ent-call"
                  aria-label={`Message ${p.name}`}
                  onClick={(e) => { e.stopPropagation(); onToast('Messaging ' + p.name + '…'); }}
                >
                  <span className="material-symbols-outlined">chat</span>
                </button>
              )}
            </div>
          ))}
        </div>
        {entities.more && (
          <button
            type="button"
            className="pcx-ghost-link"
            style={{ marginTop: '8px' }}
            onClick={(e) => { e.stopPropagation(); onToast('Showing all affected'); }}
          >
            <span className="material-symbols-outlined">expand_more</span>
            +{entities.more} more
          </button>
        )}
      </div>
    );
  }

  function OutcomesBlock({ outcomes }) {
    return (
      <div className="pcx-block">
        <p className="pcx-sec-title">
          <span className="pcx-sec-icon icon-badge icon-badge--sm" style={{ '--icon-c': '#10B981' }}>
            <span className="material-symbols-outlined">trending_up</span>
          </span>
          Expected outcome
        </p>
        <div className="pcx-outcomes">
          <div className="pcx-out dont">
            <div className="pcx-out-in">
              <div className="pcx-out-ic"><span className="material-symbols-outlined">close</span></div>
              <div className="pcx-out-head">If you don&apos;t</div>
              <div className="pcx-out-v">{outcomes.dont.v}</div>
              <div className="pcx-out-sub">{outcomes.dont.sub}</div>
            </div>
          </div>
          <div className="pcx-out act">
            <div className="pcx-out-in">
              <div className="pcx-out-ic"><span className="material-symbols-outlined">check</span></div>
              <div className="pcx-out-head">If you apply</div>
              <div className="pcx-out-v">{outcomes.act.v}</div>
              <div className="pcx-out-sub">{outcomes.act.sub}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function AskBlock({ d }) {
    const T = TYPES[d.type];
    const askPromptRef = useRef(null);
    const chatRef = useRef(null);
    const [asked, setAsked] = useState(false);

    function handleAskOpen(e) {
      e.stopPropagation();
      if (chatRef.current) {
        mountAiChat(chatRef.current, {
          typeShort: T.short,
          finding: d.finding,
          reco: d.reco,
          confidence: d.confidence,
        });
        setAsked(true);
      }
    }

    return (
      <div className="pcx-block pcx-ask">
        <div className={`pcx-ask-prompt${asked ? ' asked' : ''}`} ref={askPromptRef}>
          <div className="pcx-ask-q">
            <div className="pcx-ask-label">
            <span className="pcx-sec-icon icon-badge icon-badge--sm" style={{ '--icon-c': '#EF4444' }}>
              <span className="material-symbols-outlined">neurology</span>
            </span>
            AI insight
          </div>
            <div className="pcx-ask-question">Why did the AI surface this {T.short}?</div>
          </div>
          <button type="button" className="pcx-ask-btn" onClick={handleAskOpen}>
            <span className="material-symbols-outlined">neurology</span>
            Ask AI<span className="material-symbols-outlined">keyboard_arrow_down</span>
          </button>
        </div>
        <div className="pcx-chat" ref={chatRef}></div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Detail overlay (inverted popover)
  // ---------------------------------------------------------------------------

  function DetailOverlay({ d, open, onClose, onClosed, onApply, onToast, onRemoveCard }) {
    const [impactOpen, setImpactOpen] = useState(false);
    const xApplyRef = useRef(null);

    const headCls = d ? (d.priority === 'med' ? 'pri-med' : d.priority === 'low' ? 'pri-low' : '') : '';
    const T = d ? TYPES[d.type] : TYPES['marketing'];

    function handleSecAction(sec) {
      const m = {
        wf:     'Opening automation editor…',
        snooze: 'Snoozed to tomorrow',
        assign: 'Assign to teammate…',
        about:  'About this card type',
      };
      onToast(m[sec] || 'Done');
      if (sec === 'snooze' && d) { onClose(); setTimeout(() => onRemoveCard(d.id), 280); }
    }

    return (
      <div
        className={`pcx-overlay${open ? ' open' : ''}`}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTransitionEnd={(e) => { if (!open && e.propertyName === 'opacity') onClosed(); }}
      >
        <div className="pcx-outer">
          <div className="pcx-card" onClick={(e) => e.stopPropagation()}>
            {d && <>
              {/* Sticky inverted header */}
              <div className={`pcx-head ${headCls}`}>
                <div className="pcx-head-top">
                  <div className="pcx-head-meta">
                    <span className="pc-pri pcx-pri">
                      <span className="pc-pri-dot"></span>{PRI[d.priority].label}
                    </span>
                    <CatTag d={d} />
                  </div>
                  <button type="button" className="pcx-close" aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                    <span className="material-icons">close</span>
                  </button>
                </div>
                <div className="pcx-head-title">{d.title}</div>
                <div className="pcx-head-desc">{d.desc}</div>
                <div className="pcx-head-statsrow">
                  <div className="pcx-head-stats">
                    <div
                      className={`pcx-hstat pcx-imp${impactOpen ? ' open' : ''}`}
                      aria-expanded={impactOpen}
                      onClick={(e) => { e.stopPropagation(); setImpactOpen((v) => !v); }}
                    >
                      <div className="pcx-hstat-n">{d.impact}<span className="pcx-hstat-pct">%</span></div>
                      <div className="pcx-hstat-l">Impact score<span className="material-symbols-outlined pcx-impact-chev">expand_more</span></div>
                    </div>
                    <div className="pcx-hstat-div"></div>
                    <div className="pcx-hstat">
                      <div className="pcx-hstat-n">{d.potential == null ? '—' : fmt(d.potential)}</div>
                      <div className="pcx-hstat-l">{d.potentialLabel || 'potential'}</div>
                    </div>
                  </div>
                  <div className="pcx-head-actions">
                    <button
                      type="button"
                      className="pc-discuss-btn"
                      onClick={(e) => { e.stopPropagation(); onToast('Context chat loaded for this ' + T.short); }}
                    >
                      <span className="material-symbols-outlined">forum</span>Discuss
                    </button>
                    <button
                      type="button"
                      ref={xApplyRef}
                      className="pc-apply"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (xApplyRef.current) {
                          onApply(e, xApplyRef.current, () => {
                            onClose();
                            setTimeout(() => onRemoveCard(d.id), 280);
                          });
                        }
                      }}
                    >
                      <span className="pc-apply-label">
                        <span className="material-symbols-outlined">check_circle</span>
                        Apply
                      </span>
                      <span className="pc-spin"></span>
                      <span className="pc-check"><span className="material-symbols-outlined">check</span></span>
                    </button>
                  </div>
                </div>
                {d.impactWhy && (
                  <div className={`pcx-head-why${impactOpen ? ' open' : ''}`}>
                    <div className="pcx-head-why-in">
                      <span className="material-symbols-outlined">neurology</span>
                      {d.impactWhy}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable body */}
              <div className="pcx-body">
                <AskBlock d={d} />
                {d.evidence && <EvidenceBlock evidence={d.evidence} />}
                {d.outcomes && <OutcomesBlock outcomes={d.outcomes} />}
                {d.entities && <EntitiesBlock entities={d.entities} onToast={onToast} />}
                {d.history && (
                  <div className="pcx-block">
                    <p className="pcx-sec-title">
                      <span className="pcx-sec-icon icon-badge icon-badge--sm" style={{ '--icon-c': '#F97316' }}>
                        <span className="material-symbols-outlined">history</span>
                      </span>
                      Related history
                    </p>
                    <div className="pcx-hist">
                      <span className="material-symbols-outlined">history</span>
                      <p className="pcx-hist-p">{d.history}</p>
                    </div>
                  </div>
                )}
                {/* Secondary footer actions */}
                <div className="pcx-secondary">
                  {d.workflowLink && (
                    <button type="button" className="pcx-ghost-link" onClick={(e) => { e.stopPropagation(); handleSecAction('wf'); }}>
                      <span className="material-symbols-outlined">open_in_new</span>
                      Open &ldquo;{d.workflowLink}&rdquo; editor
                    </button>
                  )}
                  <button type="button" className="pcx-ghost-link" onClick={(e) => { e.stopPropagation(); handleSecAction('snooze'); }}>
                    <span className="material-symbols-outlined">bedtime</span>Snooze (tomorrow)
                  </button>
                  <button type="button" className="pcx-ghost-link" onClick={(e) => { e.stopPropagation(); handleSecAction('assign'); }}>
                    <span className="material-symbols-outlined">person_add</span>Assign to someone
                  </button>
                  <button type="button" className="pcx-ghost-link" onClick={(e) => { e.stopPropagation(); handleSecAction('about'); }}>
                    <span className="material-symbols-outlined">help</span>About this card type
                  </button>
                </div>
              </div>
            </>}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  function Toast({ msg, visible }) {
    return (
      <div className={`pc-toast${visible ? ' show' : ''}`}>
        <span className="material-symbols-outlined">check_circle</span>
        <span>{msg}</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  function EmptyState() {
    const bars = [
      { day: 'mon', h: 5 }, { day: 'tue', h: 3 }, { day: 'wed', h: 7 },
      { day: 'thu', h: 4 }, { day: 'fri', h: 6 }, { day: 'sat', h: 2 }, { day: 'sun', h: 4 },
    ];
    return (
      <div className="shell">
        <div style={{
          background: 'var(--r-bg,#fff)', borderRadius: '24px', padding: '34px 26px', textAlign: 'center',
          fontFamily: "'Montserrat'", boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '16px', margin: '0 auto 14px',
            display: 'grid', placeItems: 'center', color: '#fff',
            background: 'linear-gradient(150deg,#34D399,#10B981)',
            boxShadow: '0 8px 22px rgba(16,185,129,0.34),inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>task_alt</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>No actions for today</div>
          <div style={{ fontSize: '12.5px', fontWeight: 500, color: '#64748B', marginTop: '5px', lineHeight: 1.5 }}>
            Your pipeline looks healthy. The briefing refills overnight.
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '5px', height: '38px', marginTop: '18px' }}>
            {bars.map((bar, i) => (
              <div key={bar.day} style={{
                width: '13px', borderRadius: '4px 4px 2px 2px',
                height: bar.h * 5 + 6 + 'px',
                background: i === 6 ? '#10B981' : '#CBD5E1',
              }}></div>
            ))}
          </div>
          <div style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8', marginTop: '8px' }}>
            Cards handled this week
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // BriefingCard — single card in the stack
  // ---------------------------------------------------------------------------

  function BriefingCard({ d, onOpenDetail, onRemove, onDemote, onToast }) {
    const [priority, setPriority] = useState(d.priority);
    const [whyOpen, setWhyOpen] = useState(false);
    const [discussOpen, setDiscussOpen] = useState(false);
    const [snoozeOpen, setSnoozeOpen] = useState(false);
    const shellRef = useRef(null);

    function handleSnoozeItem(action) {
      setSnoozeOpen(false);
      if (action === 'low') {
        const order = ['high', 'med', 'low'];
        const i = order.indexOf(priority);
        if (i >= 0 && i < order.length - 1) {
          const next = order[i + 1];
          setPriority(next);
          onToast('Priority lowered to ' + PRI[next].label.replace(' PRIORITY', ''));
        }
        onDemote(d.id);
      } else {
        onToast('Snoozed to tomorrow');
        if (shellRef.current) {
          animateRemove(shellRef.current, () => onRemove(d.id));
        }
      }
    }

    function handleApply(e, btn) {
      spawnRipple(e, btn);
      runApply(btn, () => {
        onToast(applyToast(d));
        if (shellRef.current) {
          animateRemove(shellRef.current, () => onRemove(d.id));
        }
      });
    }

    // Close snooze on outside click + spawn shell ripple for tactile press
    function handleRootClick(e) {
      if (snoozeOpen) setSnoozeOpen(false);
      if (shellRef.current) spawnShellRipple(e, shellRef.current);
    }

    return (
      <div className="shell" data-id={d.id} ref={shellRef} onClick={handleRootClick}>
        <div className="pc">
          <LeftPanel
            d={d}
            priority={priority}
            whyOpen={whyOpen}
            onToggleWhy={() => setWhyOpen((v) => !v)}
          />
          <RightPanel
            d={d}
            discussOpen={discussOpen}
            snoozeOpen={snoozeOpen}
            onOpenDetail={() => onOpenDetail(d)}
            onToggleDiscuss={() => setDiscussOpen((v) => !v)}
            onToggleSnooze={() => setSnoozeOpen((v) => !v)}
            onSnoozeItem={handleSnoozeItem}
            onApply={handleApply}
            onSendDiscuss={(msg) => { onToast('Sent to AI assistant'); void msg; }}
            onShowToast={onToast}
            onCloseDiscuss={() => setDiscussOpen(false)}
          />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Root component
  // ---------------------------------------------------------------------------

  function PipelineCard() {
    const [cards, setCards] = useState(INITIAL_CARDS);
    const [detailCard, setDetailCard] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [toast, setToast] = useState({ msg: 'Done', visible: false });
    const toastTimerRef = useRef(null);

    function showToast(msg) {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ msg, visible: true });
      toastTimerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800);
    }

    function removeCard(id) {
      setCards((prev) => prev.filter((c) => c.id !== id));
    }

    function handleApplyInDetail(e, btn, done) {
      spawnRipple(e, btn);
      const activeCard = detailCard;
      if (!activeCard) return;
      runApply(btn, () => {
        showToast(applyToast(activeCard));
        done();
      });
    }

    function openDetail(card) {
      setDetailCard(card);
      setDetailOpen(true);
    }

    function closeDetail() {
      setDetailOpen(false);
      // detailCard cleared by onClosed (onTransitionEnd) to preserve card data through exit animation
    }

    // Close snooze pops + detail on global click/escape
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (detailOpen) closeDetail();
      }
    }

    return (
      <div className="card" style={{ padding: 0 }} onKeyDown={handleKeyDown} tabIndex={-1}>
        <div className="frame">
          <div className="stack">
            {cards.length === 0 ? (
              <EmptyState />
            ) : (
              cards.map((d) => (
                <BriefingCard
                  key={d.id}
                  d={d}
                  onOpenDetail={openDetail}
                  onRemove={removeCard}
                  onDemote={() => {/* priority is local to BriefingCard */}}
                  onToast={showToast}
                />
              ))
            )}
          </div>
        </div>

        {/* Inverted detail popover — persistently mounted so enter transition has a "from" frame */}
        <DetailOverlay
          d={detailCard}
          open={detailOpen}
          onClose={closeDetail}
          onClosed={() => setDetailCard(null)}
          onApply={handleApplyInDetail}
          onToast={showToast}
          onRemoveCard={(id) => { closeDetail(); removeCard(id); }}
        />

        {/* Toast */}
        <Toast msg={toast.msg} visible={toast.visible} />
      </div>
    );
  }

  window.PipelineCard = PipelineCard;
})();
