(function () {
  function ColorsPrimary() {
    return (
      <div className="card">
        <div className="cp-label-row">
          <div className="cp-lr-title"><span className="cp-lr-dot"></span>Primary Colors</div>
          <div className="cp-lr-meta">#10B981 · brand.primary.500</div>
        </div>
        <div className="cp-swatches">
          <div className="cp-sw lite" style={{ background: '#ECFDF5' }}>50<br />ECFDF5</div>
          <div className="cp-sw lite" style={{ background: '#D1FAE5' }}>100<br />D1FAE5</div>
          <div className="cp-sw lite" style={{ background: '#A7F3D0' }}>200<br />A7F3D0</div>
          <div className="cp-sw lite" style={{ background: '#6EE7B7' }}>300<br />6EE7B7</div>
          <div className="cp-sw" style={{ background: '#34D399' }}>400<br />34D399</div>
          <div className="cp-sw" style={{ background: '#10B981', outline: '2px solid #111111', outlineOffset: '-2px' }}>500<br />10B981</div>
          <div className="cp-sw" style={{ background: '#059669' }}>600<br />059669</div>
          <div className="cp-sw" style={{ background: '#047857' }}>700<br />047857</div>
          <div className="cp-sw" style={{ background: '#065F46' }}>800<br />065F46</div>
          <div className="cp-sw" style={{ background: '#064E3B' }}>900<br />064E3B</div>
        </div>

        {/* Extra palettes: literal oklch() values here mirror the sunflower/bloodymary/petalglow/sexyblue/richgold tokens landing in colors_and_type.css */}
        <div className="cp-label-row cp-extra-row">
          <div className="cp-lr-title cp-lr-title-sm">Sunflower Sunrise</div>
        </div>
        <div className="cp-swatches">
          <div className="cp-sw lite" style={{ background: 'oklch(95.6% 0.126 98.7)' }}>1<br />95.6/.126/98.7</div>
          <div className="cp-sw lite" style={{ background: 'oklch(91.8% 0.174 96.9)' }}>2<br />91.8/.174/96.9</div>
          <div className="cp-sw lite" style={{ background: 'oklch(87.8% 0.222 93.9)' }}>3<br />87.8/.222/93.9</div>
          <div className="cp-sw lite" style={{ background: 'oklch(82.6% 0.258 87.8)' }}>4<br />82.6/.258/87.8</div>
          <div className="cp-sw lite" style={{ background: 'oklch(78.1% 0.264 79.7)' }}>5<br />78.1/.264/79.7</div>
          <div className="cp-sw lite" style={{ background: 'oklch(75.2% 0.258 75.3)' }}>6<br />75.2/.258/75.3</div>
        </div>

        <div className="cp-label-row cp-extra-row">
          <div className="cp-lr-title cp-lr-title-sm">Bloody Mary</div>
        </div>
        <div className="cp-swatches">
          <div className="cp-sw" style={{ background: 'oklch(41.7% 0.178 18.8)' }}>1<br />41.7/.178/18.8</div>
          <div className="cp-sw" style={{ background: 'oklch(47.6% 0.198 22.3)' }}>2<br />47.6/.198/22.3</div>
          <div className="cp-sw" style={{ background: 'oklch(53.2% 0.207 24.9)' }}>3<br />53.2/.207/24.9</div>
          <div className="cp-sw" style={{ background: 'oklch(58.8% 0.211 26.8)' }}>4<br />58.8/.211/26.8</div>
          <div className="cp-sw" style={{ background: 'oklch(64.2% 0.210 28.3)' }}>5<br />64.2/.210/28.3</div>
          <div className="cp-sw" style={{ background: 'oklch(69.5% 0.205 29.5)' }}>6<br />69.5/.205/29.5</div>
        </div>

        <div className="cp-label-row cp-extra-row">
          <div className="cp-lr-title cp-lr-title-sm">Petal Glow</div>
        </div>
        <div className="cp-swatches">
          <div className="cp-sw lite" style={{ background: 'oklch(87.0% 0.072 6.9)' }}>1<br />87.0/.072/6.9</div>
          <div className="cp-sw lite" style={{ background: 'oklch(81.2% 0.111 5.7)' }}>2<br />81.2/.111/5.7</div>
          <div className="cp-sw lite" style={{ background: 'oklch(75.5% 0.154 6.3)' }}>3<br />75.5/.154/6.3</div>
          <div className="cp-sw lite" style={{ background: 'oklch(70.4% 0.196 8.0)' }}>4<br />70.4/.196/8.0</div>
          <div className="cp-sw" style={{ background: 'oklch(66.7% 0.227 11.0)' }}>5<br />66.7/.227/11.0</div>
          <div className="cp-sw" style={{ background: 'oklch(64.3% 0.248 14.1)' }}>6<br />64.3/.248/14.1</div>
        </div>

        <div className="cp-label-row cp-extra-row">
          <div className="cp-lr-title cp-lr-title-sm">Sexy Blue</div>
        </div>
        <div className="cp-swatches">
          <div className="cp-sw" style={{ background: 'oklch(58.7% 0.254 256.9)' }}>1<br />58.7/.254/256.9</div>
          <div className="cp-sw" style={{ background: 'oklch(64.6% 0.213 250.4)' }}>2<br />64.6/.213/250.4</div>
          <div className="cp-sw lite" style={{ background: 'oklch(70.5% 0.173 243.9)' }}>3<br />70.5/.173/243.9</div>
          <div className="cp-sw lite" style={{ background: 'oklch(76.5% 0.132 237.4)' }}>4<br />76.5/.132/237.4</div>
          <div className="cp-sw lite" style={{ background: 'oklch(82.4% 0.091 231.0)' }}>5<br />82.4/.091/231.0</div>
          <div className="cp-sw lite" style={{ background: 'oklch(88.3% 0.051 224.5)' }}>6<br />88.3/.051/224.5</div>
        </div>

        <div className="cp-label-row cp-extra-row">
          <div className="cp-lr-title cp-lr-title-sm">Rich Gold</div>
        </div>
        <div className="cp-swatches">
          <div className="cp-sw lite" style={{ background: 'oklch(77.2% 0.185 91.5)' }}>1<br />77.2/.185/91.5</div>
          <div className="cp-sw lite" style={{ background: 'oklch(80.5% 0.175 93.4)' }}>2<br />80.5/.175/93.4</div>
          <div className="cp-sw lite" style={{ background: 'oklch(83.9% 0.168 95.3)' }}>3<br />83.9/.168/95.3</div>
          <div className="cp-sw lite" style={{ background: 'oklch(87.2% 0.152 97.2)' }}>4<br />87.2/.152/97.2</div>
          <div className="cp-sw lite" style={{ background: 'oklch(90.6% 0.130 99.1)' }}>5<br />90.6/.130/99.1</div>
          <div className="cp-sw lite" style={{ background: 'oklch(93.9% 0.108 101.0)' }}>6<br />93.9/.108/101.0</div>
        </div>

        <div className="cp-usage">
          <div className="cp-usage-title">Where brand color goes</div>
          <div className="cp-usage-row">
            <code>--brand-primary-500</code>
            <span>primary actions (.btn-primary fill)</span>
          </div>
          <div className="cp-usage-row">
            <code>--bg-accent</code>
            <span>accent card backgrounds</span>
          </div>
          <div className="cp-usage-row">
            <code>--brand-glow</code>
            <span>soft glow / highlight halos</span>
          </div>
          <div className="cp-usage-row">
            <code>--semantic-success</code>
            <span>success state — stays emerald regardless of active theme</span>
          </div>
          <p className="cp-usage-note">
            The 5 alternate palettes above (Sunflower, Bloody Mary, Petal Glow,
            Sexy Blue, Rich Gold) remap these tokens via{' '}
            <code>:root[data-primary]</code>; the header theme switcher cycles
            through them.
          </p>
        </div>
      </div>
    );
  }
  window.ColorsPrimary = ColorsPrimary;
})();
