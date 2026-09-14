(function () {
  function ColorsNeutrals() {
    return (
      <div className="card">
        <div className="cn-label-row">
          <div className="cn-lr-title"><span className="cn-lr-dot"></span>Neutrals — Gray</div>
          <div className="cn-lr-meta">fg / bg / borders</div>
        </div>
        <div className="swatches">
          <div className="sw lite" style={{ background: '#FAFAFA', border: '1px solid #ECECEC' }}>50<br />FAFAFA</div>
          <div className="sw lite" style={{ background: '#F5F5F5' }}>100<br />F5F5F5</div>
          <div className="sw lite" style={{ background: '#ECECEC' }}>200<br />ECECEC</div>
          <div className="sw lite" style={{ background: '#D4D4D4' }}>300<br />D4D4D4</div>
          <div className="sw lite" style={{ background: '#A1A1A1' }}>400<br />A1A1A1</div>
          <div className="sw dark" style={{ background: '#6B6B6B' }}>500<br />6B6B6B</div>
          <div className="sw dark" style={{ background: '#4A4A4A' }}>600<br />4A4A4A</div>
          <div className="sw dark" style={{ background: '#232323' }}>700<br />232323</div>
          <div className="sw dark" style={{ background: '#1C1C1C' }}>800<br />1C1C1C</div>
          <div className="sw dark" style={{ background: '#111111' }}>900<br />111111</div>
        </div>

        <div className="cn-usage">
          <div className="cn-usage-title">Where each neutral goes</div>
          <div className="cn-usage-row">
            <code>--bg-app</code>
            <span>page background (flat white light / gray-900 #111111 dark)</span>
          </div>
          <div className="cn-usage-row">
            <code>--bg-card-solid</code>
            <span>card background (white light / gray-800 #1C1C1C dark)</span>
          </div>
          <div className="cn-usage-row">
            <code>--border-hairline</code>
            <span>borders &amp; hairlines (gray-200 light / gray-700 dark)</span>
          </div>
          <div className="cn-usage-row">
            <code>--fg1</code>
            <span>primary text (gray-900 light / gray-100-ish dark)</span>
          </div>
          <div className="cn-usage-row">
            <code>--fg3</code>
            <span>secondary text (gray-500 light / gray-400 dark)</span>
          </div>
          <div className="cn-usage-row">
            <code>--fg4</code>
            <span>muted text (gray-400 light / gray-500 dark)</span>
          </div>
        </div>
      </div>
    );
  }
  window.ColorsNeutrals = ColorsNeutrals;
})();
