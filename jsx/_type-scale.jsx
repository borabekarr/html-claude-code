(function () {
  function TypeScale() {
    return (
      <div className="card">
        <div className="ts-rows">
          <div className="ts-r">
            <div className="ts-px">36 / 800</div>
            <div className="ts-sample" style={{ fontSize: 36, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>142</div>
            <div className="ts-role">Display 1 — Metric Numeral</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">30 / 800</div>
            <div className="ts-sample" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>$1.2M</div>
            <div className="ts-role">Display 2 — Hero Numeral</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">28 / 800</div>
            <div className="ts-sample" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</div>
            <div className="ts-role">H1 — Page Title</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">20 / 800</div>
            <div className="ts-sample" style={{ fontSize: 20, fontWeight: 800 }}>Welcome to Deha CRM!</div>
            <div className="ts-role">H3 — Hero Card</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">16 / 800</div>
            <div className="ts-sample" style={{ fontSize: 16, fontWeight: 800 }}>Leaderboard</div>
            <div className="ts-role">H4 — Card Title</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">14 / 500</div>
            <div className="ts-sample" style={{ fontSize: 14, fontWeight: 500, color: '#6B6B6B' }}>Your dashboard is already analyzing leads.</div>
            <div className="ts-role">Body</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">12 / 700</div>
            <div className="ts-sample" style={{ fontSize: 12, fontWeight: 700 }}>Daily</div>
            <div className="ts-role">Chip Label</div>
          </div>
          <div className="ts-r">
            <div className="ts-px">10 / 700</div>
            <div className="ts-sample" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#A1A1A1' }}>Personal Goal Tracker</div>
            <div className="ts-role">Micro Label</div>
          </div>
        </div>
      </div>
    );
  }
  window.TypeScale = TypeScale;
})();
