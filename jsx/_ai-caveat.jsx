/* _ai-caveat.jsx — browser-JSX port of
 * apps/web/src/components/design-system/ai-caveat/AiCaveat.tsx.
 * Refreshed 2026-09-01 from today's canonical .tsx (ax-jeru-push Step 6).
 */
(function () {
  function AiCaveat() {
    return (
      <div className="card">

        {/* Caveat banner */}
        <div className="ai-caveat">
          <span className="material-icons ai-caveat-icon">warning</span>
          <span className="ai-caveat-text">
            AI responses can be inaccurate or misleading.{' '}
            <a
              className="ai-caveat-link"
              href="https://www.deha.io/help/ai-accuracy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn how AI accuracy works
            </a>
          </span>
        </div>

      </div>
    );
  }

  window.AiCaveat = AiCaveat;
})();
