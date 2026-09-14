(function () {
  function Iconography() {
    return (
      <div className="card">
        <span className="ic-section">Material Icons — filled (used inline w/ chrome)</span>
        <div className="ic-grid">
          <div className="ic-cell"><span className="material-icons">expand_more</span><span className="ic-name">expand_more</span></div>
          <div className="ic-cell"><span className="material-icons">arrow_forward</span><span className="ic-name">arrow_forward</span></div>
          <div className="ic-cell"><span className="material-icons">trending_up</span><span className="ic-name">trending_up</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined" style={{ color: 'var(--brand-primary-500)' }}>neurology</span><span className="ic-name">neurology</span></div>
          <div className="ic-cell"><span className="material-icons" style={{ color: 'var(--brand-primary-500)' }}>leaderboard</span><span className="ic-name">leaderboard</span></div>
          <div className="ic-cell"><span className="material-icons" style={{ color: '#EAB308' }}>emoji_events</span><span className="ic-name">emoji_events</span></div>
          <div className="ic-cell"><span className="material-icons" style={{ color: '#EF4444' }}>schedule</span><span className="ic-name">schedule</span></div>
          <div className="ic-cell"><span className="material-icons">filter_list</span><span className="ic-name">filter_list</span></div>
        </div>
        <span className="ic-section ic-section-gap">Material Symbols Outlined — paired w/ labels</span>
        <div className="ic-grid">
          <div className="ic-cell"><span className="material-symbols-outlined">group</span><span className="ic-name">group</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined">how_to_reg</span><span className="ic-name">how_to_reg</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined">payments</span><span className="ic-name">payments</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined">bar_chart</span><span className="ic-name">bar_chart</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined">assignment</span><span className="ic-name">assignment</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined">home_work</span><span className="ic-name">home_work</span></div>
          <div className="ic-cell"><span className="material-symbols-outlined">settings</span><span className="ic-name">settings</span></div>
        </div>
      </div>
    );
  }
  window.Iconography = Iconography;
})();
