(function () {
  function ColorsSemantic() {
    return (
      <div className="card">
        <div className="grid4">
          <div className="sem success" style={{ background: 'var(--semantic-success-bg)', color: 'color-mix(in oklch, var(--semantic-success), black 30%)' }}>
            <span className="sem-dot" style={{ background: 'var(--semantic-success)' }}></span>
            <div>
              <div className="sem-name">Success</div>
              <div className="sem-hex">--semantic-success</div>
            </div>
            <div className="sem-pill" style={{ background: 'var(--semantic-success)' }}>+12%</div>
            <div className="sem-use">Growth deltas. Low-priority tasks. Confirmed actions.</div>
          </div>
          <div className="sem warning" style={{ background: '#FEFCE8', color: '#854D0E' }}>
            <span className="sem-dot" style={{ background: '#FBBF24' }}></span>
            <div>
              <div className="sem-name">Warning</div>
              <div className="sem-hex">#FBBF24</div>
            </div>
            <div className="sem-pill" style={{ background: '#FBBF24' }}>#1</div>
            <div className="sem-use">Medium-priority tasks. Leaderboard #1 avatar.</div>
          </div>
          <div className="sem danger" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
            <span className="sem-dot" style={{ background: '#EF4444' }}></span>
            <div>
              <div className="sem-name">Danger</div>
              <div className="sem-hex">#EF4444</div>
            </div>
            <div className="sem-pill" style={{ background: '#EF4444' }}>12:00</div>
            <div className="sem-use">High-priority tasks. Urgent timer chips.</div>
          </div>
          <div className="sem hot" style={{ background: '#FFF7ED', color: '#C2410C' }}>
            <span className="sem-dot" style={{ background: '#F97316' }}></span>
            <div>
              <div className="sem-name">Hot</div>
              <div className="sem-hex">#F97316</div>
            </div>
            <div className="sem-pill" style={{ background: '#F97316' }}>Hot Lead</div>
            <div className="sem-use">Trending-up icons. The "Hot Lead" stat.</div>
          </div>
        </div>
      </div>
    );
  }
  window.ColorsSemantic = ColorsSemantic;
})();
