(function () {
  function SpacingScale() {
    return (
      <div className="card">
        <div className="ss-row">
          <div className="ss-ru ss-ru-sm"><div className="ss-bar ss-b1"></div><div className="ss-role">1</div><div className="ss-label">4px</div></div>
          <div className="ss-ru ss-ru-sm"><div className="ss-bar ss-b2"></div><div className="ss-role">2</div><div className="ss-label">8px</div></div>
          <div className="ss-ru ss-ru-sm"><div className="ss-bar ss-b3"></div><div className="ss-role">3</div><div className="ss-label">12px</div></div>
          <div className="ss-ru ss-ru-md"><div className="ss-bar ss-b4"></div><div className="ss-role">4 · page</div><div className="ss-label">16px</div></div>
          <div className="ss-ru ss-ru-md"><div className="ss-bar ss-b5"></div><div className="ss-role">5 · card pad</div><div className="ss-label">20px</div></div>
          <div className="ss-ru ss-ru-md"><div className="ss-bar ss-b6"></div><div className="ss-role">6 · gap</div><div className="ss-label">24px</div></div>
          <div className="ss-ru ss-ru-sm"><div className="ss-bar ss-b8"></div><div className="ss-role">8</div><div className="ss-label">32px</div></div>
          <div className="ss-ru ss-ru-sm"><div className="ss-bar ss-b10"></div><div className="ss-role">10</div><div className="ss-label">40px</div></div>
          <div className="ss-ru ss-ru-sm"><div className="ss-bar ss-b12"></div><div className="ss-role">12</div><div className="ss-label">48px</div></div>
        </div>
      </div>
    );
  }
  window.SpacingScale = SpacingScale;
})();
