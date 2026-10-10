/**
 * SalahTrack — Professional Analytics View Component
 * Multi-window date filtering, transparent math, responsive SVG charts, accessible table, and five-prayer consistency.
 * Version: 2.1.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class StatsViewRenderer {
    constructor(containerEl) {
      this.container = containerEl;
      this.filter = 'last7'; // 'last7' | 'last30' | 'month' | 'custom'
      this.customStart = null;
      this.customEnd = null;
      this.viewMode = 'chart'; // 'chart' | 'table'
    }

    render() {
      if (!this.container) return;

      const analytics = ST.StatsService.computeRangeMetrics({
        filter: this.filter,
        customStart: this.customStart,
        customEnd: this.customEnd,
        targetDate: new Date()
      });

      const isDemo = ST.storage.isDemoDataLoaded();

      this.container.innerHTML = `
        ${isDemo ? `
          <div class="callout-box" style="margin-top:0; margin-bottom:var(--space-md); border-color:var(--color-accent-gold-border); background-color:var(--color-accent-gold-soft);">
            <div class="callout-icon">${ST.DOM.getIcon('info')}</div>
            <div class="callout-content" style="flex:1;">
              <strong>Demo Dataset Active:</strong> You are viewing sample records to preview charts and insights.
              <button id="clear-demo-btn" style="text-decoration:underline; font-weight:600; margin-left:6px; color:var(--color-danger); cursor:pointer; background:none; border:none;">Clear Demo Data</button>
            </div>
          </div>
        ` : ''}

        <!-- Header & Date Filter Bar -->
        <div class="stats-header-bar">
          <div>
            <h2 style="font-family:var(--font-serif); font-size:var(--text-xl); font-weight:700; color:var(--color-text-primary);">
              Prayer Insights & Analytics
            </h2>
            <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-top:2px;">
              Date Window: <strong>${analytics.startDateDisplay} – ${analytics.endDateDisplay}</strong> (${analytics.totalDaysInRange} days)
            </p>
          </div>

          <!-- Date Filter Segmented Control -->
          <div class="stats-filter-pills" role="tablist" aria-label="Select Date Range Filter">
            <button class="stats-filter-btn ${this.filter === 'last7' ? 'active' : ''}" data-filter="last7">Last 7 Days</button>
            <button class="stats-filter-btn ${this.filter === 'last30' ? 'active' : ''}" data-filter="last30">Last 30 Days</button>
            <button class="stats-filter-btn ${this.filter === 'month' ? 'active' : ''}" data-filter="month">This Month</button>
            <button class="stats-filter-btn ${this.filter === 'custom' ? 'active' : ''}" data-filter="custom">Custom Range</button>
          </div>
        </div>

        <!-- Custom Date Range Picker (shown when filter === 'custom') -->
        ${this.filter === 'custom' ? `
          <div class="stats-custom-range-card">
            <span><strong>Select Dates:</strong></span>
            <label style="display:flex; align-items:center; gap:6px;">
              <span>From:</span>
              <input type="date" id="input-custom-start" class="select-input" value="${analytics.startDateKey}">
            </label>
            <label style="display:flex; align-items:center; gap:6px;">
              <span>To:</span>
              <input type="date" id="input-custom-end" class="select-input" value="${analytics.endDateKey}">
            </label>
            <button class="btn btn-primary" id="btn-apply-custom-range" style="padding:6px 14px; font-size:var(--text-xs);">
              Apply Range
            </button>
          </div>
        ` : ''}

        <!-- KPI Grid -->
        <div class="stats-kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Completed Prayers</span>
            <span class="kpi-value">${analytics.totalCompletedPrayers}</span>
            <span class="kpi-subtext">of ${analytics.totalEligiblePrayers} eligible prayers</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Completion Rate</span>
            <span class="kpi-value">${analytics.completionPercentage}%</span>
            <span class="kpi-subtext">${analytics.totalCompletedPrayers} / ${analytics.totalEligiblePrayers} in window</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Fully Completed Days</span>
            <span class="kpi-value">${analytics.fullyCompletedDays}</span>
            <span class="kpi-subtext">${analytics.partiallyCompletedDays} partial (1–4 prayers)</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Fully Recorded Days</span>
            <span class="kpi-value">${analytics.recordedDays}</span>
            <span class="kpi-subtext">${analytics.unrecordedDays} unrecorded day${analytics.unrecordedDays === 1 ? '' : 's'}</span>
          </div>
        </div>

        <!-- Day-by-Day Trend Section -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Day-by-Day Completion Trend</h3>
              <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-top:2px;">
                Prayers fulfilled per day (0 to 5) across selected timeframe
              </p>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <span class="chart-badge">${analytics.completionPercentage}% consistency</span>
              <!-- Toggle View Mode: Chart vs Table -->
              <div class="stats-view-toggle">
                <button class="stats-view-btn ${this.viewMode === 'chart' ? 'active' : ''}" data-view="chart">Chart</button>
                <button class="stats-view-btn ${this.viewMode === 'table' ? 'active' : ''}" data-view="table">Table</button>
              </div>
            </div>
          </div>

          ${this.viewMode === 'chart' ? this._renderSvgChart(analytics) : this._renderAccessibleTable(analytics)}

          <div style="margin-top:14px; font-size:var(--text-xs); color:var(--color-text-muted); line-height:1.5;">
            <strong>Denominator & Methodology:</strong> ${analytics.formulaExplanation}
          </div>
        </div>

        <!-- Individual Prayer Consistency Grid -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Consistency by Prayer</h3>
              <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-top:2px;">
                Completion frequency and active streak for each obligatory prayer period
              </p>
            </div>
            ${analytics.mostConsistentPrayer ? `
              <span class="chart-badge" style="background-color:var(--color-primary-subtle); color:var(--color-primary); border-color:var(--color-primary-border);">
                Best: ${analytics.mostConsistentPrayer.name} (${analytics.mostConsistentPrayer.percentage}%)
              </span>
            ` : ''}
          </div>

          <div class="prayer-consistency-grid">
            ${ST.PRAYER_KEYS.map(pKey => {
              const stat = analytics.prayerConsistency[pKey] || { completedCount: 0, eligibleDays: 0, percentage: 0, streak: 0 };
              const pConfig = ST.PRAYERS[pKey];
              return `
                <div class="prayer-consistency-card">
                  <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div>
                      <span style="font-weight:700; font-size:var(--text-sm);">${pConfig.nameEn}</span>
                      <span style="font-family:var(--font-arabic); font-size:13px; color:var(--color-text-muted); margin-left:4px;">${pConfig.nameAr}</span>
                    </div>
                    <span style="font-size:var(--text-sm); font-weight:700; color:var(--color-primary);">
                      ${stat.percentage}%
                    </span>
                  </div>

                  <div style="font-size:11px; color:var(--color-text-muted);">
                    ${stat.completedCount} of ${stat.eligibleDays} days
                    ${stat.streak > 1 ? `• <span style="color:var(--color-success); font-weight:600;">🔥 ${stat.streak}d streak</span>` : ''}
                  </div>

                  <div class="stat-progress-bar" style="margin-top:4px;">
                    <div class="stat-progress-fill" style="width: ${stat.percentage}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Empty State Prompt (if no records) -->
        ${!analytics.hasAnyData ? `
          <div class="callout-box" style="text-align:center; flex-direction:column; align-items:center; padding:var(--space-xl); border:1px dashed var(--color-border);">
            <div style="font-size:32px; margin-bottom:8px;">🌙</div>
            <h4 style="font-size:var(--text-md); font-weight:600; color:var(--color-text-primary);">No Prayer Records in this Window</h4>
            <p style="font-size:var(--text-xs); color:var(--color-text-secondary); max-width:440px; margin:4px 0 16px;">
              You have not recorded prayers for these dates yet. Mark your daily prayers in the Today tracker to view trends and streaks.
            </p>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-primary" id="stats-goto-today-btn" style="font-size:var(--text-xs);">
                Go to Today Tracker
              </button>
              <button class="btn btn-secondary" id="stats-load-demo-btn" style="font-size:var(--text-xs);">
                Load Sample Records
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Calculation Integrity & Transparent Math Callout -->
        <div class="callout-box">
          <div class="callout-icon">${ST.DOM.getIcon('info')}</div>
          <div class="callout-content">
            <strong>Calculation Integrity & No-Shame Policy:</strong>
            <br>
            • <strong>Unrecorded Days:</strong> Untracked days are recognized neutrally as unrecorded and are never converted into fake missed records.
            <br>
            • <strong>Future Dates:</strong> Dates after today are strictly excluded from denominators and cannot lower your consistency score.
            <br>
            • <strong>Authenticity:</strong> All analytics reflect stored client records directly, preserving your spiritual journey transparently without synthetic extrapolation.
          </div>
        </div>
      `;

      this._attachEventListeners();
    }

    /**
     * Renders responsive SVG Bar Chart with interactive tooltips and readable axes
     */
    _renderSvgChart(analytics) {
      const days = analytics.days;
      const numDays = days.length;
      if (numDays === 0) return '<p style="text-align:center; padding:20px; font-size:12px;">No data</p>';

      const width = 640;
      const height = 210;
      const padLeft = 36;
      const padRight = 16;
      const padTop = 18;
      const padBottom = 34;

      const plotWidth = width - padLeft - padRight;
      const plotHeight = height - padTop - padBottom;
      const colWidth = plotWidth / numDays;
      const barWidth = Math.max(6, Math.min(26, colWidth * 0.72));

      // Dotted horizontal grid lines (0 to 5)
      const gridLines = [0, 1, 2, 3, 4, 5].map(v => {
        const y = padTop + plotHeight - (v / 5) * plotHeight;
        return `
          <g>
            <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--color-border)" stroke-dasharray="2 3" stroke-width="1" opacity="0.6"/>
            <text x="${padLeft - 8}" y="${y + 4}" font-size="10" fill="var(--color-text-muted)" text-anchor="end" font-family="inherit">${v}</text>
          </g>
        `;
      }).join('');

      // Bars & X-axis labels
      const labelInterval = numDays > 14 ? (numDays > 25 ? 5 : 2) : 1;

      const bars = days.map((d, idx) => {
        const cx = padLeft + (idx + 0.5) * colWidth;
        const x = cx - barWidth / 2;
        const count = d.isFuture ? 0 : d.completedCount;
        const barH = d.isExempt ? plotHeight : (count / 5) * plotHeight;
        const y = padTop + plotHeight - barH;

        let fillColor = 'var(--color-primary)';
        let stroke = 'none';
        let strokeDash = '';
        let opacity = '1';

        if (d.isFuture) {
          fillColor = 'var(--color-border)';
          opacity = '0.35';
        } else if (d.isExempt) {
          fillColor = 'var(--color-info)';
          opacity = '0.7';
        } else if (d.isUnrecorded) {
          fillColor = 'transparent';
          stroke = 'var(--color-border)';
          strokeDash = '2 2';
        } else if (count === 5) {
          fillColor = 'var(--color-success)';
        } else if (count === 0) {
          fillColor = 'var(--color-bg-muted)';
        }

        const showLabel = (idx % labelInterval === 0) || (idx === numDays - 1);
        const labelText = numDays > 14 ? `${d.dayNumber}` : d.dayName;

        const prayerList = Object.entries(d.prayers)
          .filter(([_, comp]) => comp)
          .map(([k]) => ST.PRAYERS[k].nameEn)
          .join(', ') || (d.isExempt ? 'Religiously Exempt' : (d.isUnrecorded ? 'Not Recorded' : 'None'));

        return `
          <g class="chart-col-group" data-idx="${idx}">
            <rect
              class="chart-bar-rect"
              x="${x}"
              y="${y}"
              width="${barWidth}"
              height="${Math.max(4, barH)}"
              rx="3"
              fill="${fillColor}"
              stroke="${stroke}"
              stroke-width="1"
              stroke-dasharray="${strokeDash}"
              opacity="${opacity}"
              data-tip-date="${d.dateKey}"
              data-tip-count="${d.completedCount}"
              data-tip-prayers="${prayerList}"
              data-tip-exempt="${d.isExempt}"
              data-tip-unrecorded="${d.isUnrecorded}"
              data-tip-future="${d.isFuture}"
            />
            ${showLabel ? `
              <text x="${cx}" y="${height - 12}" font-size="10" fill="${d.isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)'}" font-weight="${d.isToday ? '700' : '500'}" text-anchor="middle" font-family="inherit">
                ${labelText}
              </text>
            ` : ''}
          </g>
        `;
      }).join('');

      return `
        <div class="stats-chart-wrapper" style="position:relative;">
          <svg viewBox="0 0 ${width} ${height}" class="stats-svg-chart" aria-label="Day-by-day prayer completion chart">
            ${gridLines}
            ${bars}
          </svg>
          <div class="chart-tooltip-box" id="stats-chart-tooltip" style="display:none;"></div>
        </div>
      `;
    }

    /**
     * Renders accessible table alternative for screen readers and text verification
     */
    _renderAccessibleTable(analytics) {
      const days = analytics.days;
      return `
        <div class="stats-table-wrapper">
          <table class="stats-table" aria-label="Detailed prayer status table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Day</th>
                <th scope="col">Fajr</th>
                <th scope="col">Dhuhr</th>
                <th scope="col">Asr</th>
                <th scope="col">Maghrib</th>
                <th scope="col">Isha</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              ${days.map(d => {
                let statusLabel = 'Unrecorded';
                if (d.isFuture) statusLabel = 'Future';
                else if (d.isExempt) statusLabel = 'Exempt';
                else if (d.completedCount === 5) statusLabel = 'Complete (5/5)';
                else if (d.completedCount > 0) statusLabel = `Partial (${d.completedCount}/5)`;
                else if (d.isRecordedIncomplete) statusLabel = '0/5 Recorded';

                const cellIcon = (val) => d.isFuture ? '—' : (d.isExempt ? '✦' : (val ? '✔' : '·'));

                return `
                  <tr style="${d.isToday ? 'background-color:var(--color-primary-subtle);' : ''}">
                    <td><strong>${d.dateKey}</strong> ${d.isToday ? '<span class="today-chip">Today</span>' : ''}</td>
                    <td>${d.dayName}</td>
                    <td>${cellIcon(d.prayers.fajr)}</td>
                    <td>${cellIcon(d.prayers.dhuhr)}</td>
                    <td>${cellIcon(d.prayers.asr)}</td>
                    <td>${cellIcon(d.prayers.maghrib)}</td>
                    <td>${cellIcon(d.prayers.isha)}</td>
                    <td><strong>${d.isFuture ? '—' : (d.isExempt ? 'Ex' : `${d.completedCount}/5`)}</strong></td>
                    <td>${statusLabel}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    _attachEventListeners() {
      // 1. Date Filter Pills
      this.container.querySelectorAll('.stats-filter-btn').forEach(btn => {
        btn.onclick = () => {
          const filter = btn.getAttribute('data-filter');
          this.filter = filter;
          this.render();
        };
      });

      // 2. Custom Range Apply
      const applyCustomBtn = this.container.querySelector('#btn-apply-custom-range');
      if (applyCustomBtn) {
        applyCustomBtn.onclick = () => {
          const startInput = this.container.querySelector('#input-custom-start');
          const endInput = this.container.querySelector('#input-custom-end');
          if (startInput && endInput) {
            this.customStart = startInput.value;
            this.customEnd = endInput.value;
            this.render();
          }
        };
      }

      // 3. View Mode Toggle (Chart vs Table)
      this.container.querySelectorAll('.stats-view-btn').forEach(btn => {
        btn.onclick = () => {
          this.viewMode = btn.getAttribute('data-view');
          this.render();
        };
      });

      // 4. Interactive SVG Tooltips
      const tooltipEl = this.container.querySelector('#stats-chart-tooltip');
      const chartWrapper = this.container.querySelector('.stats-chart-wrapper');

      if (tooltipEl && chartWrapper) {
        this.container.querySelectorAll('.chart-bar-rect').forEach(rect => {
          rect.addEventListener('mouseenter', (e) => this._showTooltip(e, rect, tooltipEl, chartWrapper));
          rect.addEventListener('mousemove', (e) => this._positionTooltip(e, tooltipEl, chartWrapper));
          rect.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
          rect.addEventListener('touchstart', (e) => {
            this._showTooltip(e, rect, tooltipEl, chartWrapper);
            this._positionTooltip(e.touches[0], tooltipEl, chartWrapper);
          }, { passive: true });
        });
      }

      // 5. Action Buttons (Today / Demo)
      const gotoTodayBtn = this.container.querySelector('#stats-goto-today-btn');
      if (gotoTodayBtn) {
        gotoTodayBtn.onclick = () => {
          ST.state.setDate(new Date());
          ST.state.setTab('dashboard');
        };
      }

      const loadDemoBtn = this.container.querySelector('#stats-load-demo-btn');
      if (loadDemoBtn) {
        loadDemoBtn.onclick = () => {
          ST.storage.loadDemoDataset();
          ST.DOM.showToast('Demo dataset loaded', null, null);
          this.render();
        };
      }

      const clearDemoBtn = this.container.querySelector('#clear-demo-btn');
      if (clearDemoBtn) {
        clearDemoBtn.onclick = () => {
          ST.DOM.showConfirmModal({
            title: 'Clear Demo Dataset?',
            message: 'Reset demo records to track your authentic prayers?',
            confirmText: 'Clear Demo Data',
            danger: true,
            onConfirm: () => {
              ST.storage.clearAllData();
              ST.DOM.showToast('Demo data cleared', null, null);
              this.render();
            }
          });
        };
      }
    }

    _showTooltip(e, rect, tooltipEl, wrapper) {
      const dateStr = rect.getAttribute('data-tip-date');
      const count = rect.getAttribute('data-tip-count');
      const prayers = rect.getAttribute('data-tip-prayers');
      const isExempt = rect.getAttribute('data-tip-exempt') === 'true';
      const isUnrecorded = rect.getAttribute('data-tip-unrecorded') === 'true';
      const isFuture = rect.getAttribute('data-tip-future') === 'true';

      let statusMsg = `${count} of 5 Completed`;
      if (isFuture) statusMsg = 'Future Date';
      else if (isExempt) statusMsg = 'Religiously Exempt Day';
      else if (isUnrecorded) statusMsg = 'Unrecorded Day';

      tooltipEl.innerHTML = `
        <div style="font-weight:700; margin-bottom:2px;">${dateStr}</div>
        <div style="color:var(--color-primary); font-weight:600;">${statusMsg}</div>
        <div style="color:var(--color-text-muted); font-size:11px; margin-top:2px;">${prayers}</div>
      `;
      tooltipEl.style.display = 'block';
    }

    _positionTooltip(e, tooltipEl, wrapper) {
      const rect = wrapper.getBoundingClientRect();
      const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
      const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;

      tooltipEl.style.left = `${Math.min(wrapper.clientWidth - 160, Math.max(10, x - 70))}px`;
      tooltipEl.style.top = `${Math.max(10, y - 65)}px`;
    }
  }

  ST.StatsViewRenderer = StatsViewRenderer;
})(window.SalahTrack);
