(function () {
  function SpacingRadii() {
    return (
      <div className="card">
        <div className="sr-row">
          <div className="sr-ri"><div className="sr-box sr-b6"></div><div className="sr-role">xs</div><div className="sr-meta">6px</div></div>
          <div className="sr-ri"><div className="sr-box sr-b8"></div><div className="sr-role">sm · chip</div><div className="sr-meta">8px</div></div>
          <div className="sr-ri"><div className="sr-box sr-b12"></div><div className="sr-role">md</div><div className="sr-meta">12px</div></div>
          <div className="sr-ri"><div className="sr-box sr-b16"></div><div className="sr-role">lg · button</div><div className="sr-meta">16px</div></div>
          <div className="sr-ri"><div className="sr-box sr-b20"></div><div className="sr-role">xl · metric card</div><div className="sr-meta">20px</div></div>
          <div className="sr-ri"><div className="sr-box sr-b24"></div><div className="sr-role">2xl · hero / chart</div><div className="sr-meta">24px</div></div>
          <div className="sr-ri"><div className="sr-box sr-pill"></div><div className="sr-role">pill</div><div className="sr-meta">16px</div></div>
        </div>
      </div>
    );
  }
  window.SpacingRadii = SpacingRadii;
})();
