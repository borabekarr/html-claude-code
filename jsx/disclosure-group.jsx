/* =========================================================================
   Disclosure Group — Deha Design System
   A composable, expandable section (accordion-style). Tap the Trigger to
   reveal the Items; height is *measured* once and animated with a spring-ish
   ease, the chevron rotates 180°, and the content can optionally sharpen out
   of a blur as it opens. Items are pressable rows with a subtle scale-on-press.

   Web counterpart of the requested RN / Reanimated component:
     - Reanimated height interpolation → measured height + CSS transition on .dg-clip
     - chevron rotation                → rotate(180deg) on [data-open]
     - expo-blur expanding content     → animated filter: blur() on .dg-items
     - Pressable scale feedback        → :active scale on .dg-item
     - scrollable maxHeight            → overflow-y on .dg-items, capped maxHeight
     - context between sub-components   → DisclosureCtx
     - accordion (one-open) mode        → AccordionCtx coordinator

   Composable API (mirrors the RN spec):
     <DisclosureGroup defaultOpen id>
       <DisclosureGroup.Trigger icon title subtitle showChevron chevronColor />
       <DisclosureGroup.Items maxHeight scrollable useBlur>
         <DisclosureGroup.Item icon onPress disabled>…</DisclosureGroup.Item>
       </DisclosureGroup.Items>
     </DisclosureGroup>
   Wrap several groups in <Accordion> to make them mutually exclusive.
   ========================================================================= */

const { useState, useEffect, useContext, useMemo, useCallback, createContext, useId } = React;

/* ----------------------------- contexts ----------------------------- */
const DisclosureCtx = createContext(null);   // per-group: { open, toggle, dur, ease }
const AccordionCtx  = createContext(null);   // optional coordinator: { openId, setOpen }

/* ----------------------------- Accordion (optional) ----------------------------- */
function Accordion({ defaultOpenId = null, children }) {
  const [openId, setOpenId] = useState(defaultOpenId);
  const value = useMemo(() => ({
    openId,
    setOpen: (id, next) => setOpenId((cur) => (next ? id : cur === id ? null : cur)),
  }), [openId]);
  return <AccordionCtx.Provider value={value}>{children}</AccordionCtx.Provider>;
}

/* ----------------------------- DisclosureGroup ----------------------------- */
function DisclosureGroup({ id, defaultOpen = false, duration = 380, easing, children }) {
  const autoId = useId();
  const gid = id || autoId;
  const ease = easing || 'cubic-bezier(.22,1,.36,1)';

  // If inside an <Accordion>, the coordinator owns open-state; otherwise local.
  const acc = useContext(AccordionCtx);
  const [localOpen, setLocalOpen] = useState(defaultOpen);

  // Seed the accordion with this group's defaultOpen the first time.
  useEffect(() => {
    if (acc && defaultOpen) acc.setOpen(gid, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = acc ? acc.openId === gid : localOpen;
  const toggle = useCallback(() => {
    if (acc) acc.setOpen(gid, !(acc.openId === gid));
    else setLocalOpen((v) => !v);
  }, [acc, gid]);

  const ctx = useMemo(() => ({ open, toggle, dur: duration, ease }), [open, toggle, duration, ease]);

  return (
    <DisclosureCtx.Provider value={ctx}>
      <div className="dg" data-open={open}
           style={{ '--dg-dur': duration + 'ms', '--dg-ease': ease }}>
        {children}
      </div>
    </DisclosureCtx.Provider>
  );
}

/* ----------------------------- Trigger ----------------------------- */
function Trigger({ icon, title, subtitle, showChevron = true, chevronColor }) {
  const { open, toggle } = useContext(DisclosureCtx);
  return (
    <button className="dg-trigger" onClick={toggle}
            aria-expanded={open} type="button">
      {icon && <span className="dg-tile msym" aria-hidden="true">{icon}</span>}
      <span className="dg-head-text">
        <span className="dg-title">{title}</span>
        {subtitle && <span className="dg-sub">{subtitle}</span>}
      </span>
      {showChevron && (
        <span className="dg-chevron msym" aria-hidden="true"
              style={chevronColor ? { color: chevronColor } : undefined}>
          expand_more
        </span>
      )}
    </button>
  );
}

/* ----------------------------- Items ----------------------------- */
function Items({ children, maxHeight = 400, scrollable = true, useBlur = false, blurAmount = 8, style }) {
  const { open } = useContext(DisclosureCtx);
  return (
    <div className="dg-clip" aria-hidden={!open}>
      <div className="dg-items">
        <div
          className="dg-scroll"
          role="region"
          style={{
            maxHeight: scrollable ? maxHeight : 'none',
            overflowY: scrollable ? 'auto' : 'hidden',
            '--dg-blur': useBlur && !open ? blurAmount + 'px' : '0px',
            ...style,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Item ----------------------------- */
function Item({ icon, children, value, dotColor, onPress, disabled = false, style }) {
  return (
    <button className="dg-item" type="button" disabled={disabled} style={style}
            onClick={disabled ? undefined : onPress}>
      {dotColor && <span className="dg-dot" style={{ background: dotColor }} aria-hidden="true" />}
      {icon && <span className="ic msym" aria-hidden="true">{icon}</span>}
      <span className="dg-item-label">{children}</span>
      {value != null && (
        <span className="dg-item-val">
          {value}
          <span className="msym" aria-hidden="true">chevron_right</span>
        </span>
      )}
    </button>
  );
}

/* attach sub-components (composable namespace API) */
DisclosureGroup.Trigger = Trigger;
DisclosureGroup.Items = Items;
DisclosureGroup.Item = Item;

/* ====================================================================
   DEMO — a settings panel with three disclosure groups.
   Tweaks drive: animation speed, easing, content blur, chevron, accordion
   (one-open) behaviour, and dark mode.
   ==================================================================== */
function SettingsPanel({ t }) {
  const groupProps = { duration: 600, easing: 'cubic-bezier(.22,1,.36,1)' };
  const itemsProps = { useBlur: t.blur, maxHeight: 230 };

  const groups = (
    <>
      <DisclosureGroup id="account" defaultOpen {...groupProps}>
        <DisclosureGroup.Trigger icon="account_circle" title="Account"
          subtitle="Profile, login & security" showChevron={t.chevron} />
        <DisclosureGroup.Items {...itemsProps}>
          <DisclosureGroup.Item icon="badge" value="Dana Holloway" onPress={() => {}}>Profile</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="mail" value="dana@deha.co" onPress={() => {}}>Email</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="lock" value="••••••••" onPress={() => {}}>Password</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="verified_user" value="On" onPress={() => {}}>Two-factor auth</DisclosureGroup.Item>
        </DisclosureGroup.Items>
      </DisclosureGroup>

      <DisclosureGroup id="notify" {...groupProps}>
        <DisclosureGroup.Trigger icon="notifications" title="Notifications"
          subtitle="3 channels enabled" showChevron={t.chevron} />
        <DisclosureGroup.Items {...itemsProps}>
          <DisclosureGroup.Item icon="smartphone" value="On" onPress={() => {}}>Push</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="forum" value="Mentions" onPress={() => {}}>Email digest</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="alternate_email" value="All" onPress={() => {}}>Mentions</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="do_not_disturb_on" value="22:00" onPress={() => {}}>Quiet hours</DisclosureGroup.Item>
        </DisclosureGroup.Items>
      </DisclosureGroup>

      <DisclosureGroup id="appearance" {...groupProps}>
        <DisclosureGroup.Trigger icon="palette" title="Appearance"
          subtitle="Theme & display" showChevron={t.chevron} />
        <DisclosureGroup.Items {...itemsProps}>
          <DisclosureGroup.Item icon="dark_mode" value={t.dark ? 'Dark' : 'Light'} onPress={() => {}}>Theme</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="format_size" value="Medium" onPress={() => {}}>Text size</DisclosureGroup.Item>
          <DisclosureGroup.Item dotColor="var(--brand-primary)" value="Emerald" onPress={() => {}}>Accent color</DisclosureGroup.Item>
          <DisclosureGroup.Item icon="grid_view" value="Comfortable" disabled>Density</DisclosureGroup.Item>
        </DisclosureGroup.Items>
      </DisclosureGroup>
    </>
  );

  return (
    <div className={'dg-list' + (t.accordion ? ' is-accordion' : '')}>
      {t.accordion ? <Accordion defaultOpenId="account">{groups}</Accordion> : groups}
    </div>
  );
}

/* ----------------------------- App + Tweaks ----------------------------- */
function App() {
  const TW = /*EDITMODE-BEGIN*/{
    "accordion": true,
    "blur": true,
    "chevron": true,
    "dark": false
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TW);

  useEffect(() => {
    const th = t.dark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', th);
    document.body.setAttribute('data-theme', th);
  }, [t.dark]);

  // remount the panel when accordion mode flips so state seeds cleanly
  return (
    <>
      <SettingsPanel key={t.accordion ? 'acc' : 'multi'} t={t} />

      <TweaksPanel>
        <TweakSection label="Behavior" />
        <TweakToggle label="Accordion (one open)" value={t.accordion}
          onChange={(v) => setTweak('accordion', v)} />
        <TweakToggle label="Show chevron" value={t.chevron}
          onChange={(v) => setTweak('chevron', v)} />
        <TweakSection label="Animation" />
        <TweakToggle label="Blur on reveal" value={t.blur}
          onChange={(v) => setTweak('blur', v)} />
        <TweakSection label="Theme" />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak('dark', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
