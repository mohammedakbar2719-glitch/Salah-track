/**
 * SalahTrack — Qada Tracker UI Component
 * Dedicated interface for banked missed prayers and fulfillment tracking.
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class QadaViewRenderer {
    constructor(containerEl) {
      this.container = containerEl;
    }

    render() {
      if (!this.container) return;
      const ledger = ST.qadaService.getLedger();
      const totalOwed = ST.qadaService.getTotalOwed();

      this.container.innerHTML = `
        <!-- Qada Header Summary -->
        <div class="stats-kpi-grid" style="margin-bottom:var(--space-lg);">
          <div class="kpi-card" style="border-color:var(--color-accent-gold-border);">
            <span class="kpi-label">Total Qada Owed</span>
            <span class="kpi-value" style="color:var(--color-accent-gold);">${totalOwed}</span>
            <span class="kpi-subtext">Prayers to make up</span>
          </div>

          <div class="kpi-card" style="border-color:var(--color-primary-border);">
            <span class="kpi-label">Qada Fulfilled</span>
            <span class="kpi-value" style="color:var(--color-success);">${ledger.totalFulfilled || 0}</span>
            <span class="kpi-subtext">Completed over time</span>
          </div>
        </div>

        <!-- 5 Qada Prayer Rows -->
        <div class="prayer-list-wrapper">
          <div class="section-label-row">
            <span class="section-title">Log Fulfilled Qada Prayers</span>
            <span style="font-size:var(--text-xs); color:var(--color-text-muted);">Tap when made up</span>
          </div>

          <div class="prayer-cards-grid">
            ${ST.PRAYER_KEYS.map(pKey => {
              const pConfig = ST.PRAYERS[pKey];
              const owedCount = ledger.owed[pKey] || 0;

              return `
                <div class="prayer-card" id="qada-row-${pKey}">
                  <div class="prayer-card-left">
                    <div class="prayer-icon-pill">
                      ${ST.DOM.getIcon(pConfig.icon)}
                    </div>
                    <div class="prayer-card-info">
                      <div class="prayer-names-row">
                        <span class="prayer-name-en">${pConfig.nameEn}</span>
                        <span class="prayer-name-ar">${pConfig.nameAr}</span>
                      </div>
                      <div class="prayer-meta-row">
                        <span style="font-size:var(--text-xs); color:var(--color-text-secondary);">
                          Remaining: <strong>${owedCount}</strong>
                        </span>
                        <!-- Increment / Decrement adjustments -->
                        <div style="display:inline-flex; align-items:center; gap:4px; margin-left:8px;">
                          <button class="btn-icon" data-qada-dec="${pKey}" title="Decrease owed by 1" style="width:24px; height:24px; font-size:12px; padding:0;">-</button>
                          <button class="btn-icon" data-qada-inc="${pKey}" title="Increase owed by 1" style="width:24px; height:24px; font-size:12px; padding:0;">+</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button class="btn btn-primary" data-qada-fulfill="${pKey}" style="font-size:var(--text-xs); padding:8px 14px;">
                    ${ST.DOM.getIcon('check')} Prayed 1 Qada
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recent Qada Fulfillment History -->
        <div class="chart-card" style="margin-top:var(--space-xl);">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Recent Qada Fulfillment Log</h3>
              <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-top:2px;">Your journey of making up missed prayers</p>
            </div>
            <span class="chart-badge">${ledger.history.length} logged</span>
          </div>

          ${ledger.history.length === 0 ? `
            <p style="font-size:var(--text-sm); color:var(--color-text-muted); text-align:center; padding:var(--space-md) 0;">
              No Qada prayers logged yet. When you complete a missed prayer, tap "Prayed 1 Qada" above.
            </p>
          ` : `
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${ledger.history.slice(0, 10).map(h => {
                const pConfig = ST.PRAYERS[h.prayerId];
                const dateStr = ST.DateUtils.formatShortDate(new Date(h.timestamp));
                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background-color:var(--color-bg-subtle); border-radius:var(--radius-md); font-size:var(--text-sm);">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="color:var(--color-success);">${ST.DOM.getIcon('check')}</span>
                      <span><strong>${pConfig ? pConfig.nameEn : h.prayerId}</strong> fulfilled</span>
                    </div>
                    <span style="font-size:var(--text-xs); color:var(--color-text-muted);">${dateStr}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Spiritual Hadith Reminder -->
        <div class="callout-box" style="margin-top:var(--space-lg);">
          <div class="callout-icon">${ST.DOM.getIcon('star')}</div>
          <div class="callout-content">
            <em>"Whoever forgets a prayer or sleeps through it, its expiation is to pray it when he remembers it."</em> — Prophet Muhammad (ﷺ), Sahih Muslim.
          </div>
        </div>
      `;

      // Event Listeners
      this.container.querySelectorAll('[data-qada-inc]').forEach(btn => {
        btn.onclick = () => {
          const pKey = btn.getAttribute('data-qada-inc');
          ST.qadaService.adjustOwed(pKey, 1);
          this.render();
        };
      });

      this.container.querySelectorAll('[data-qada-dec]').forEach(btn => {
        btn.onclick = () => {
          const pKey = btn.getAttribute('data-qada-dec');
          ST.qadaService.adjustOwed(pKey, -1);
          this.render();
        };
      });

      this.container.querySelectorAll('[data-qada-fulfill]').forEach(btn => {
        btn.onclick = () => {
          const pKey = btn.getAttribute('data-qada-fulfill');
          const pConfig = ST.PRAYERS[pKey];
          ST.qadaService.fulfillQada(pKey);
          this.render();

          ST.DOM.showToast(`Alhamdulillah! 1 Qada ${pConfig.nameEn} fulfilled`, 'Undo', () => {
            ST.state.undoLastAction();
            this.render();
          });
        };
      });
    }
  }

  ST.QadaViewRenderer = QadaViewRenderer;
})(window.SalahTrack);
