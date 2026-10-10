/**
 * SalahTrack — Main Application Entry Point & Controller
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class SalahTrackApp {
    constructor() {
      this.prayerRenderer = null;
      this.progressRenderer = null;
      this.notesRenderer = null;
      this.calendarRenderer = null;
      this.statsRenderer = null;
      this.qadaRenderer = null;
      this.settingsRenderer = null;
    }

    init() {
      // 1. Apply initial theme
      ST.state.applyTheme(ST.state.settings.theme);

      // 2. Setup DOM component renderers
      this.setupRenderers();

      // 3. Bind UI Events (Navigation, Date buttons)
      this.bindEvents();

      // 4. Subscribe to state changes
      this.subscribeToState();

      // 5. Initial Render
      this.renderCurrentView();
      this.updateHeaderDates();
      this.renderWeeklyStrip();
      this.renderNextPrayerBanner();
      this.updateSyncBadge(ST.storage.getSyncStatus());
      this.updateQadaVisibility();

      // Start periodic next-prayer countdown ticker (every 30s)
      setInterval(() => this.renderNextPrayerBanner(), 30000);

      // 6. Initialize Cloud Firestore & Auth adapter if configured
      if (ST.firestoreAdapter) {
        ST.firestoreAdapter.init().catch(() => {});
      }

      // 7. Register PWA Service Worker if supported
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }

      console.info('SalahTrack Engine v2.0.0: Successfully initialized.');
    }

    setupRenderers() {
      // Dashboard components
      const prayersContainer = document.getElementById('dashboard-prayers-list');
      if (prayersContainer) {
        this.prayerRenderer = new ST.PrayerCardRenderer(prayersContainer);
      }

      const ringEl = document.getElementById('dashboard-progress-ring');
      const headlineEl = document.getElementById('dashboard-progress-headline');
      const descEl = document.getElementById('dashboard-progress-desc');
      if (ringEl) {
        this.progressRenderer = new ST.ProgressRingRenderer(ringEl, headlineEl, descEl);
      }

      const notesContainer = document.getElementById('dashboard-notes-container');
      if (notesContainer) {
        this.notesRenderer = new ST.NotesViewRenderer(notesContainer);
      }

      // Calendar components
      const calContainer = document.getElementById('calendar-container');
      const calPastContainer = document.getElementById('calendar-selected-day-container');
      if (calContainer) {
        this.calendarRenderer = new ST.CalendarViewRenderer(calContainer, calPastContainer);
      }

      // Statistics component
      const statsContainer = document.getElementById('stats-container');
      if (statsContainer) {
        this.statsRenderer = new ST.StatsViewRenderer(statsContainer);
      }

      // Qada Tracker component
      const qadaContainer = document.getElementById('qada-container');
      if (qadaContainer) {
        this.qadaRenderer = new ST.QadaViewRenderer(qadaContainer);
      }

      // Settings component
      const settingsContainer = document.getElementById('settings-container');
      if (settingsContainer) {
        this.settingsRenderer = new ST.SettingsViewRenderer(settingsContainer);
      }
    }

    bindEvents() {
      // Navigation items (Mobile & Desktop)
      const navItems = document.querySelectorAll('[data-nav-target]');
      navItems.forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const target = item.getAttribute('data-nav-target');
          ST.state.setTab(target);
        });
      });

      // Quick links from dashboard
      const linkCalendar = document.getElementById('link-view-calendar');
      if (linkCalendar) {
        linkCalendar.onclick = (e) => {
          e.preventDefault();
          ST.state.setTab('calendar');
        };
      }

      const linkStats = document.getElementById('link-view-stats');
      if (linkStats) {
        linkStats.onclick = (e) => {
          e.preventDefault();
          ST.state.setTab('stats');
        };
      }

      // Date Navigation Buttons (Dashboard)
      const prevDayBtn = document.getElementById('btn-prev-day');
      const nextDayBtn = document.getElementById('btn-next-day');
      const todayQuickBtn = document.getElementById('btn-today-quick');
      const datePickerInput = document.getElementById('date-picker-hidden');
      const dateNavLabel = document.getElementById('date-nav-current-label');

      if (prevDayBtn) {
        prevDayBtn.onclick = () => {
          const prev = ST.DateUtils.addDays(ST.state.currentDate, -1);
          ST.state.setDate(prev);
        };
      }

      if (nextDayBtn) {
        nextDayBtn.onclick = () => {
          const next = ST.DateUtils.addDays(ST.state.currentDate, 1);
          ST.state.setDate(next);
        };
      }

      if (todayQuickBtn) {
        todayQuickBtn.onclick = () => {
          ST.state.setDate(new Date());
        };
      }

      if (dateNavLabel && datePickerInput) {
        dateNavLabel.onclick = () => {
          datePickerInput.value = ST.state.currentDateKey;
          datePickerInput.showPicker ? datePickerInput.showPicker() : datePickerInput.click();
        };

        datePickerInput.onchange = (e) => {
          if (e.target.value) {
            const chosen = ST.DateUtils.parseDateKey(e.target.value);
            ST.state.setDate(chosen);
          }
        };
      }

      // Exempt day toggle button (Dashboard)
      const toggleExemptBtn = document.getElementById('btn-toggle-day-exempt');
      if (toggleExemptBtn) {
        toggleExemptBtn.onclick = () => {
          ST.state.toggleExempt();
        };
      }

      // Theme toggle shortcut in header
      const themeToggleBtn = document.getElementById('header-theme-toggle');
      if (themeToggleBtn) {
        themeToggleBtn.onclick = () => {
          const current = ST.state.settings.theme;
          const next = current === 'dark' ? 'light' : 'dark';
          ST.state.updateSettings({ theme: next });
        };
      }

      // Global keyboard accessibility: Escape closes modals
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.modal-backdrop.open').forEach(m => m.classList.remove('open'));
        }
      });
    }

    subscribeToState() {
      // Record updated -> Refresh active views
      ST.state.on('record:updated', (rec) => {
        if (this.prayerRenderer) this.prayerRenderer.render(rec, ST.state.settings.allowDetailedStatus);
        if (this.progressRenderer) this.progressRenderer.render(rec);
        if (this.notesRenderer) this.notesRenderer.render(rec);
        this.renderWeeklyStrip();
        this.updateExemptButtonState(rec);

        if (ST.state.activeTab === 'calendar' && this.calendarRenderer) {
          this.calendarRenderer.render();
        }
        if (ST.state.activeTab === 'stats' && this.statsRenderer) {
          this.statsRenderer.render();
        }
      });

      // Date changed -> Update headers & views
      ST.state.on('date:changed', ({ date, record }) => {
        this.updateHeaderDates();
        if (this.prayerRenderer) this.prayerRenderer.render(record, ST.state.settings.allowDetailedStatus);
        if (this.progressRenderer) this.progressRenderer.render(record);
        if (this.notesRenderer) this.notesRenderer.render(record);
        this.renderWeeklyStrip();
        this.updateExemptButtonState(record);
      });

      // Tab switched
      ST.state.on('tab:changed', (tab) => {
        this.switchTabUI(tab);
      });

      // Settings updated
      ST.state.on('settings:updated', () => {
        if (this.prayerRenderer) this.prayerRenderer.render(ST.state.currentRecord, ST.state.settings.allowDetailedStatus);
        if (this.calendarRenderer) this.calendarRenderer.render();
        if (this.statsRenderer) this.statsRenderer.render();
        this.updateQadaVisibility();
      });

      // Qada updated
      ST.state.on('qada:updated', () => {
        if (this.qadaRenderer) this.qadaRenderer.render();
      });

      // Prayer times updated
      ST.state.on('prayerTimes:updated', () => {
        if (this.prayerRenderer) this.prayerRenderer.render(ST.state.currentRecord, ST.state.settings.allowDetailedStatus);
        this.renderNextPrayerBanner();
      });

      // Sync status updated
      ST.state.on('sync:status', (status) => {
        this.updateSyncBadge(status);
      });
    }

    updateSyncBadge(status) {
      const badge = document.getElementById('header-sync-badge');
      if (badge) {
        if (status === 'offline_saved') {
          badge.textContent = 'Offline';
          badge.className = 'brand-badge';
          badge.style.display = 'inline-block';
        } else {
          badge.textContent = 'Saved Locally';
          badge.className = 'brand-badge';
          badge.style.display = 'inline-block';
        }
      }
    }

    updateQadaVisibility() {
      const enabled = ST.state.settings.enableQadaTracker !== false;
      document.querySelectorAll('[data-nav-target="qada"]').forEach(el => {
        el.style.display = enabled ? '' : 'none';
      });
    }

    switchTabUI(tab) {
      // Toggle views
      document.querySelectorAll('.view-section').forEach(section => {
        section.classList.toggle('active', section.id === `view-${tab}`);
      });

      // Toggle nav indicators
      document.querySelectorAll('[data-nav-target]').forEach(item => {
        const target = item.getAttribute('data-nav-target');
        item.classList.toggle('active', target === tab);
      });

      // Render tab on demand
      if (tab === 'calendar' && this.calendarRenderer) {
        this.calendarRenderer.render();
      } else if (tab === 'stats' && this.statsRenderer) {
        this.statsRenderer.render();
      } else if (tab === 'qada' && this.qadaRenderer) {
        this.qadaRenderer.render();
      } else if (tab === 'settings' && this.settingsRenderer) {
        this.settingsRenderer.render();
      } else if (tab === 'dashboard') {
        this.renderCurrentView();
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateHeaderDates() {
      const isToday = ST.DateUtils.isToday(ST.state.currentDate);
      const isFuture = ST.DateUtils.isFuture(ST.state.currentDateKey);
      const displayStr = ST.DateUtils.formatDisplayDate(ST.state.currentDate);
      const hijriStr = ST.DateUtils.formatHijri(ST.state.currentDate);

      const navLabel = document.getElementById('date-nav-current-label');
      if (navLabel) {
        let tag = '';
        if (isToday) tag = '<span class="today-chip">Today</span>';
        else if (isFuture) tag = '<span class="today-chip" style="background-color:var(--color-bg-muted); color:var(--color-text-secondary); border-color:var(--color-border);">Future</span>';

        navLabel.innerHTML = `
          <span>${ST.DateUtils.formatShortDate(ST.state.currentDate)}</span>
          ${tag}
        `;
      }

      const todayQuickBtn = document.getElementById('btn-today-quick');
      if (todayQuickBtn) {
        todayQuickBtn.style.display = isToday ? 'none' : 'inline-flex';
      }

      const subDate = document.getElementById('dashboard-full-date-display');
      if (subDate) {
        subDate.textContent = displayStr;
      }

      const hijriBadge = document.getElementById('dashboard-hijri-badge');
      if (hijriBadge) {
        hijriBadge.textContent = hijriStr;
      }
    }

    updateExemptButtonState(record) {
      const btn = document.getElementById('btn-toggle-day-exempt');
      if (btn) {
        btn.textContent = record.isExempt ? 'Remove Exemption' : 'Mark Day as Exempt';
        btn.style.color = record.isExempt ? 'var(--color-info)' : '';
      }
    }

    renderCurrentView() {
      if (this.prayerRenderer) this.prayerRenderer.render(ST.state.currentRecord, ST.state.settings.allowDetailedStatus);
      if (this.progressRenderer) this.progressRenderer.render(ST.state.currentRecord);
      if (this.notesRenderer) this.notesRenderer.render(ST.state.currentRecord);
      this.updateExemptButtonState(ST.state.currentRecord);
      this.renderNextPrayerBanner();
    }

    renderNextPrayerBanner() {
      const container = document.getElementById('next-prayer-banner-container');
      if (!container || !ST.prayerTimesService) return;

      const next = ST.prayerTimesService.getNextPrayer();
      const cfg = ST.prayerTimesService.getConfig();

      container.innerHTML = `
        <div style="background-color:var(--color-bg-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:10px 16px; box-shadow:var(--shadow-xs); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:34px; height:34px; border-radius:var(--radius-md); background-color:var(--color-primary-subtle); color:var(--color-primary); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              ${ST.DOM.getIcon(ST.PRAYERS[next.key] ? ST.PRAYERS[next.key].icon : 'sun')}
            </div>
            <div>
              <div style="font-size:var(--text-xs); color:var(--color-text-muted); font-weight:500;">
                Next Prayer • ${next.isTomorrow ? 'Tomorrow' : 'Today'}
              </div>
              <div style="font-weight:700; font-size:var(--text-base); color:var(--color-text-primary); display:flex; align-items:baseline; gap:6px;">
                <span>${next.nameEn}</span>
                <span style="font-family:var(--font-arabic); font-size:14px; color:var(--color-text-muted);">${next.nameAr}</span>
                <span style="font-size:var(--text-xs); font-weight:600; color:var(--color-accent-gold);">at ${next.timeFormatted}</span>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:var(--text-xs); font-weight:600; padding:4px 10px; border-radius:var(--radius-full); background-color:var(--color-accent-gold-soft); color:var(--color-text-accent); border:1px solid var(--color-accent-gold-border);">
              in ${next.timeRemainingText}
            </span>
            <button data-nav-target="settings" style="font-size:var(--text-xs); color:var(--color-text-muted); text-decoration:underline; cursor:pointer;" title="Configure calculation location">
              ${cfg.cityName ? cfg.cityName.split(',')[0] : 'Location'}
            </button>
          </div>
        </div>
      `;

      // Hook navigation button inside banner
      container.querySelectorAll('[data-nav-target="settings"]').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          ST.state.setTab('settings');
        };
      });
    }

    renderWeeklyStrip() {
      const container = document.getElementById('weekly-strip-container');
      if (!container) return;

      const weekly = ST.StatsService.computeWeeklyBreakdown(ST.state.currentDate);

      container.innerHTML = `
        <div class="weekly-summary-card">
          <div class="weekly-header">
            <span class="weekly-title">Weekly Habit Rhythm</span>
            <a href="#" id="weekly-details-link" class="weekly-link">
              ${weekly.consistencyRate}% consistency
              ${ST.DOM.getIcon('chevronRight')}
            </a>
          </div>
          <div class="weekly-pills-row">
            ${weekly.days.map(d => {
              let score = `${d.completedCount}/5`;
              if (d.isExempt) score = 'Ex';
              else if (d.isFuture) score = '—';

              return `
                <div class="weekly-day-pill ${d.isToday ? 'is-today' : ''}" style="cursor:pointer;" data-weekly-date="${d.dateKey}">
                  <span class="weekly-day-name">${d.dayLetter}</span>
                  <div class="weekly-dot-container">
                    <span class="weekly-dot ${d.completedCount > 0 || d.isExempt ? 'filled' : ''}"></span>
                  </div>
                  <span class="weekly-score-text">${score}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const link = container.querySelector('#weekly-details-link');
      if (link) {
        link.onclick = (e) => {
          e.preventDefault();
          ST.state.setTab('stats');
        };
      }

      container.querySelectorAll('.weekly-day-pill[data-weekly-date]').forEach(pill => {
        pill.onclick = () => {
          const key = pill.getAttribute('data-weekly-date');
          ST.state.setDate(ST.DateUtils.parseDateKey(key));
        };
      });
    }
  }

  // Bootstrap when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    ST.app = new SalahTrackApp();
    ST.app.init();
  });

})(window.SalahTrack);
