/* MessageDropdown — Deha Design System
   Reusable notification dropdown with gooey/fluid morph between trigger and panel.

   How the goo works
   -----------------
   The dark trigger circle and the dark panel-bg shape both live inside a
   wrapper with `filter: url(#deha-goo-filter)`. The SVG filter blurs them
   and re-thresholds the alpha channel — when two shapes get close enough
   they visually merge into a single liquid blob. The panel-bg starts as a
   tiny disk hidden inside the trigger (same x/y, 56px circle) and animates
   into a 340×388 rounded rectangle below — during that interpolation the
   filter renders the in-between as a stretching droplet.

   The CRISP foreground (the actual icon, header, list items, footer) lives
   OUTSIDE the filter, layered on top, so type stays sharp.

   Props
   -----
   - messages         Array of { id, sender, preview, time, gradient, unread }
   - gooey            boolean — toggle the SVG goo filter
   - speed            'normal' | 'slow'  — controls --md-dur in CSS
   - position         'top' | 'bottom'   — (extension point; currently 'bottom')
   - open             optional controlled state
   - onOpen / onClose callbacks
   - label            heading text (default 'Messages')
   - viewAllLabel     footer link text
*/

// ---------- Sample data ----------
const SAMPLE_MESSAGES = [
{
  id: 'm1', sender: 'Alice Johnson', time: '2h', unread: true,
  preview: 'Hey! Are we still on for the meeting at 3?',
  gradient: 'linear-gradient(135deg, #A78BFA 0%, #6366F1 100%)'
},
{
  id: 'm2', sender: 'Bob Smith', time: '2h', unread: true,
  preview: "Don't forget to check out the new proposal draft.",
  gradient: 'linear-gradient(135deg, #FBBF24 0%, #F97316 100%)'
},
{
  id: 'm3', sender: 'Charlie Davis', time: 'Yesterday', unread: true,
  preview: 'Can you send me the files from last week\'s sprint?',
  gradient: 'linear-gradient(135deg, #34D399 0%, #06B6D4 100%)'
}];


// ---------- Component ----------
function MessageDropdown({
  messages = SAMPLE_MESSAGES,
  gooey = true,
  speed = 'normal',
  open: openProp,
  onOpen,
  onClose,
  label = 'Messages',
  viewAllLabel = 'View Messages'
}) {
  const isControlled = openProp !== undefined;
  const [innerOpen, setInnerOpen] = React.useState(false);
  const open = isControlled ? openProp : innerOpen;
  const rootRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const itemRefs = React.useRef([]);

  const setOpen = (v) => {
    if (!isControlled) setInnerOpen(v);
    if (v && onOpen) onOpen();
    if (!v && onClose) onClose();
  };
  const toggle = () => setOpen(!open);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  // Esc to close
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Keyboard nav inside the list (when open)
  const onItemKeyDown = (e, idx) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[(idx + 1) % messages.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      itemRefs.current[(idx - 1 + messages.length) % messages.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[messages.length - 1]?.focus();
    }
  };

  const unread = messages.filter((m) => m.unread).length;

  return (
    <div
      ref={rootRef}
      className={`md-root ${open ? 'open' : ''}`}
      data-speed={speed}>
      
      {/* Grey external shell — frames the open panel (theme-editor .te-outer style) */}
      <div className="md-panel-shell" aria-hidden="true" />

      {/* Gooey shape layer — only the dark blobs live here */}
      <div className={`md-goo-wrap ${gooey ? 'gooey' : ''}`} aria-hidden="true">
        <div className="md-trigger-bg" />
        <div className="md-panel-bg" />
      </div>

      {/* Real interactive trigger — above the goo layer */}
      <button
        ref={triggerRef}
        className="md-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? `Close ${label}` : `Open ${label} (${unread} new)`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          } else if (e.key === 'ArrowDown' && open) {
            e.preventDefault();
            itemRefs.current[0]?.focus();
          }
        }}>
        
        <span className="material-symbols-outlined">chat_bubble</span>
        {unread > 0 && !open &&
        <span className="md-trigger-badge" aria-hidden="true">{unread}</span>
        }
      </button>

      {/* Content layer — crisp, on top of panel-bg */}
      <div
        className="md-panel-content"
        role="dialog"
        aria-modal="false"
        aria-label={label}
        aria-hidden={!open}>
        
        <div className="md-header">
          <h3>{label}</h3>
          {unread > 0 &&
          <span className="md-count-tag" aria-label={`${unread} new`}>{unread}</span>
          }
        </div>

        <ul className="md-list" role="list">
          {messages.map((m, i) =>
          <li
            key={m.id}
            ref={(el) => {itemRefs.current[i] = el;}}
            className={`md-item ${m.unread ? 'md-unread' : ''}`}
            tabIndex={open ? 0 : -1}
            onKeyDown={(e) => onItemKeyDown(e, i)}>
            
              <div
              className="md-avatar"
              style={{ background: m.gradient }}
              aria-hidden="true" />
            
              <div className="md-item-text">
                <div className="md-row1">
                  <span className="md-sender">{m.sender}</span>
                  <span className="md-time">{m.time}</span>
                </div>
                <div className="md-preview">{m.preview}</div>
              </div>
            </li>
          )}
        </ul>

        <div className="md-footer">
          <button type="button" tabIndex={open ? 0 : -1}>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
            <span className="md-btn-label">{viewAllLabel}</span>
          </button>
          <button type="button" className="md-mark-read" tabIndex={open ? 0 : -1}>
            <span className="material-symbols-outlined" aria-hidden="true">done_all</span>
            <span className="md-btn-label">Mark all as read</span>
          </button>
        </div>
      </div>
    </div>);

}

// ---------- Demo page ----------
function Demo() {
  return (
    <div className="md-outer">
      <div className="md-panel">
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 18, padding: '0 4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{
              margin: 0, fontSize: 19, fontWeight: 900,
              letterSpacing: '-0.025em', color: '#0F172A'
            }}>Message Dropdown</h1>
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: '#94A3B8',
              letterSpacing: '-0.005em'
            }}>Gooey morph on open · click trigger to demo</span>
          </div>
        </div>

        {/* Single component */}
        <div className="md-card">
          <MessageDropdown gooey={true} speed="normal" />
        </div>
      </div>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<Demo />);