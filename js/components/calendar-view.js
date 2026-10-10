/**
 * SalahTrack — Calendar View Component
 * Multi-month and year navigation, distinct completion states, and direct day editing.
 * Version: 2.1.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class CalendarViewRenderer {
    constructor(containerEl, pastDayContainerEl) {
      this.container = containerEl;
      this.pastDayContainer = pastDayContainerEl;
      this.viewYear = new Date().getFullYear();
      this.viewMonth = new Date().getMonth();
      this.selectedDateKey = ST.DateUtils.formatDateKey(new Date());
    }

    init() {
      if (!this.container) return;
      this.render();
    }

    changeMonth(delta) {
      this.viewMonth += delta;
      if (this.viewMonth < 0) {
        this.viewMonth = 11;
        this.viewYear -= 1;
      } else if (this.viewMonth > 11) {
        this.viewMonth = 0;
        this.viewYear += 1;
      }
      this.render();
    }

    changeYear(delta) {
      this.viewYear += delta;
      this.render();
    }

    goToCurrentMonth() {
      const now = new Date();
      this.viewYear = now.getFullYear();
      this.viewMonth = now.getMonth();
      this.selectedDateKey = ST.DateUtils.formatDateKey(now);
      this.render();
    }

    render() {
      if (!this.container) return;
      const records = ST.storage.getAllRecords();
      const settings = ST.storage.getSettings();
      const firstDayOfWeek = settings.firstDayOfWeek || 0;

      const monthDate = new Date(this.viewYear, this.viewMonth, 1);
      const monthTitle = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Weekday labels in order
      const weekdayNamesSun = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekdayHeaders = [];
      for (let i = 0; i < 7; i++) {
        const idx = (firstDayOfWeek + i) % 7;
        weekdayHeaders.push(weekdayNamesSun[idx]);
      }

      const gridCells = ST.DateUtils.getMonthGrid(this.viewYear, this.viewMonth, firstDayOfWeek);

      this.container.innerHTML = `
        <div class="calendar-card">
          <div class="calendar-month-bar">
            <div>
              <h2 class="calendar-month-title">${monthTitle}</h2>
            </div>
            <div class="calendar-nav-actions">
              <button class="btn-icon" id="cal-prev-year" title="Previous Year (${this.viewYear - 1})" aria-label="Previous Year">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
              </button>
              <button class="btn-icon" id="cal-prev-month" title="Previous Month" aria-label="Previous Month">
                ${ST.DOM.getIcon('chevronLeft')}
              </button>
              <button class="btn btn-secondary" id="cal-today-btn" style="padding:5px 12px; font-size:var(--text-xs);">
                Today
              </button>
              <button class="btn-icon" id="cal-next-month" title="Next Month" aria-label="Next Month">
                ${ST.DOM.getIcon('chevronRight')}
              </button>
              <button class="btn-icon" id="cal-next-year" title="Next Year (${this.viewYear + 1})" aria-label="Next Year">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
              </button>
            </div>
          </div>

          <div class="calendar-grid">
            ${weekdayHeaders.map(day => `<div class="calendar-weekday-header">${day}</div>`).join('')}
            ${gridCells.map((cell) => {
              if (cell.isEmpty) {
                return `<div class="calendar-day-cell empty"></div>`;
              }
              const isToday = ST.DateUtils.isToday(cell.date);
              const isSelected = cell.dateKey === this.selectedDateKey;
              const rec = records[cell.dateKey];
              let dotsHtml = '';
              let statusClass = 'day-unrecorded';

              if (rec) {
                if (rec.isExempt) {
                  statusClass = 'day-exempt';
                  dotsHtml = `<div class="cal-exempt-icon" title="Exempt Day">✦</div>`;
                } else {
                  let completedCount = 0;
                  for (const pKey of ST.PRAYER_KEYS) {
                    if (rec.prayers && rec.prayers[pKey] && rec.prayers[pKey].completed) {
                      completedCount++;
                    }
                  }

                  if (completedCount === 5) {
                    statusClass = 'day-completed';
                  } else if (completedCount > 0) {
                    statusClass = 'day-partial';
                  } else {
                    const isRec = ST.StatsService.isExplicitlyRecorded(rec, records, cell.dateKey);
                    statusClass = isRec ? 'day-partial' : 'day-unrecorded';
                  }

                  dotsHtml = `<div class="calendar-day-dots">
                    ${Array.from({ length: 5 }).map((_, dIdx) => `
                      <span class="cal-dot ${dIdx < completedCount ? 'active' : ''}"></span>
                    `).join('')}
                  </div>`;
                }
              }

              return `
                <button class="calendar-day-cell ${statusClass} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-date-key="${cell.dateKey}" title="${cell.dateKey}: ${statusClass.replace('day-', '')}">
                  <span class="calendar-day-number">${cell.dayNumber}</span>
                  ${dotsHtml}
                </button>
              `;
            }).join('')}
          </div>

          <!-- Color Status Legend -->
          <div class="calendar-legend">
            <div class="cal-legend-item">
              <span class="cal-legend-dot completed"></span>
              <span>Completed (5/5)</span>
            </div>
            <div class="cal-legend-item">
              <span class="cal-legend-dot partial"></span>
              <span>Partial (1-4)</span>
            </div>
            <div class="cal-legend-item">
              <span class="cal-legend-dot unrecorded"></span>
              <span>Unrecorded</span>
            </div>
            <div class="cal-legend-item">
              <span class="cal-legend-dot exempt"></span>
              <span>Exempt</span>
            </div>
          </div>
        </div>
      `;

      // Event listeners
      const prevYearBtn = this.container.querySelector('#cal-prev-year');
      const nextYearBtn = this.container.querySelector('#cal-next-year');
      const prevMonthBtn = this.container.querySelector('#cal-prev-month');
      const nextMonthBtn = this.container.querySelector('#cal-next-month');
      const todayBtn = this.container.querySelector('#cal-today-btn');

      if (prevYearBtn) prevYearBtn.onclick = () => this.changeYear(-1);
      if (nextYearBtn) nextYearBtn.onclick = () => this.changeYear(1);
      if (prevMonthBtn) prevMonthBtn.onclick = () => this.changeMonth(-1);
      if (nextMonthBtn) nextMonthBtn.onclick = () => this.changeMonth(1);
      if (todayBtn) todayBtn.onclick = () => this.goToCurrentMonth();

      this.container.querySelectorAll('.calendar-day-cell[data-date-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.getAttribute('data-date-key');
          this.selectDate(key);
        });
      });

      this.renderSelectedDayEditor();
    }

    selectDate(dateKey) {
      this.selectedDateKey = dateKey;
      const targetDate = ST.DateUtils.parseDateKey(dateKey);
      ST.state.setDate(targetDate);
      this.render();
    }

    renderSelectedDayEditor() {
      if (!this.pastDayContainer) return;
      const rec = ST.storage.getRecord(this.selectedDateKey);
      const parsed = ST.DateUtils.parseDateKey(this.selectedDateKey);
      const isToday = ST.DateUtils.isToday(parsed);

      this.pastDayContainer.innerHTML = `
        <div style="margin-top: var(--space-lg); background-color:var(--color-bg-surface); border:1px solid var(--color-border); border-radius:var(--radius-xl); padding:var(--space-lg); box-shadow:var(--shadow-sm);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md); flex-wrap:wrap; gap:8px;">
            <div>
              <div class="greeting-lead">
                ${ST.DOM.getIcon('calendar')}
                <span>Selected Day Record</span>
              </div>
              <h3 style="font-size:var(--text-lg); font-weight:600;">
                ${ST.DateUtils.formatDisplayDate(parsed)} ${isToday ? '<span class="today-chip">Today</span>' : ''}
              </h3>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button class="btn btn-secondary" id="cal-open-tracker-btn" style="font-size:var(--text-xs); padding:6px 12px;">
                Open in Daily Tracker
              </button>
              <button class="btn btn-secondary" id="cal-toggle-exempt-btn" style="font-size:var(--text-xs); padding:6px 12px;">
                ${rec.isExempt ? 'Remove Exemption' : 'Mark as Exempt (Hayd/Illness)'}
              </button>
            </div>
          </div>
          <div id="calendar-day-prayers-list" class="prayer-cards-grid"></div>
        </div>
      `;

      const listEl = this.pastDayContainer.querySelector('#calendar-day-prayers-list');
      const renderer = new ST.PrayerCardRenderer(listEl);
      renderer.render(rec, ST.state.settings.allowDetailedStatus);

      const openTrackerBtn = this.pastDayContainer.querySelector('#cal-open-tracker-btn');
      if (openTrackerBtn) {
        openTrackerBtn.onclick = () => {
          ST.state.setDate(parsed);
          ST.state.setTab('dashboard');
        };
      }

      const exemptBtn = this.pastDayContainer.querySelector('#cal-toggle-exempt-btn');
      if (exemptBtn) {
        exemptBtn.onclick = () => {
          ST.state.toggleExempt();
          this.render();
        };
      }
    }
  }

  ST.CalendarViewRenderer = CalendarViewRenderer;
})(window.SalahTrack);
