(function () {
  function BackgroundGradient() {
    return (
      <div className="card bg-card-no-pad">
        <div className="bg-holder">
          <div className="bg-stage flat">
            <span className="bg-pill">DEFAULT</span>
            <div className="bg-meta">
              <div className="bg-name">Flat white</div>
              <div className="bg-desc">#FFFFFF · used everywhere by default</div>
            </div>
          </div>
          <div className="bg-stage grid">
            <span className="bg-pill" style={{ background: 'var(--brand-primary-500)' }}>SECTION</span>
            <div className="bg-meta">
              <div className="bg-name">Grid on white</div>
              <div className="bg-desc">24px grid · rgba(17,17,17,0.035)<br />Reserved for highlighted sections</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  window.BackgroundGradient = BackgroundGradient;
})();
