(function () {
  function TypeDisplay() {
    return (
      <div className="card">
        <div className="td-meta">Display Family — Montserrat</div>
        <div className="td-word td-specimen">Deha</div>
        <div className="td-ladder">
          <div className="td-lw" style={{ fontWeight: 400 }}>Smartest CRM<small>Regular 400</small></div>
          <div className="td-lw" style={{ fontWeight: 500 }}>Smartest CRM<small>Medium 500</small></div>
          <div className="td-lw" style={{ fontWeight: 600 }}>Smartest CRM<small>Semibold 600</small></div>
          <div className="td-lw" style={{ fontWeight: 700 }}>Smartest CRM<small>Bold 700</small></div>
          <div className="td-lw" style={{ fontWeight: 800 }}>Smartest CRM<small>Extrabold 800</small></div>
        </div>
      </div>
    );
  }
  window.TypeDisplay = TypeDisplay;
})();
