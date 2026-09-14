(function () {
  function SpacingShadows() {
    return (
      <div className="card sh-card">
        <div className="sh-grid3">
          <div className="sh-box sh-inner">
            <div className="sh-name">shadow-inner ★ default</div>
            <div className="sh-meta">Cards, pills, badges<br />inset top 1px white · inset bottom –2px · inset ring 1px</div>
          </div>
          <div className="sh-box sh-recessed">
            <div className="sh-name">shadow-recessed</div>
            <div className="sh-meta">Pressed surfaces<br />inset 2/4</div>
          </div>
          <div className="sh-box sh-emerald-glow sh-emerald-glow-full">
            <div className="sh-name">shadow-emerald-glow</div>
            <div className="sh-meta">Hero accent cards · 10/40 –10 · var(--brand-glow)</div>
          </div>
        </div>
      </div>
    );
  }
  window.SpacingShadows = SpacingShadows;
})();
