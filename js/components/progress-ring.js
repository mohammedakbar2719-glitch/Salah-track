/**
 * SalahTrack — Progress Ring Component
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class ProgressRingRenderer {
    constructor(ringEl, headlineEl, descEl) {
      this.ringEl = ringEl;
      this.headlineEl = headlineEl;
      this.descEl = descEl;
      this.circumference = 2 * Math.PI * 36; // r = 36
    }

    render(record) {
      const stats = ST.StatsService.computeDayCompletion(record);

      if (this.ringEl) {
        const meter = this.ringEl.querySelector('.progress-ring-meter');
        const percentageText = this.ringEl.querySelector('.progress-percentage');

        if (meter) {
          meter.style.strokeDasharray = `${this.circumference}`;
          const offset = this.circumference - (stats.percentage / 100) * this.circumference;
          meter.style.strokeDashoffset = `${offset}`;
        }

        if (percentageText) {
          percentageText.textContent = stats.isExempt ? '—' : `${stats.percentage}%`;
        }
      }

      if (this.headlineEl) {
        if (stats.isExempt) {
          this.headlineEl.textContent = 'Religiously Exempt Day';
        } else if (stats.completedCount === 5) {
          this.headlineEl.textContent = 'All 5 Prayers Fulfilled';
        } else {
          this.headlineEl.textContent = `${stats.completedCount} of 5 Prayers Fulfilled`;
        }
      }

      if (this.descEl) {
        if (stats.isExempt) {
          this.descEl.textContent = 'Rest and peace. This day is preserved neutrally without breaking streaks.';
        } else if (stats.completedCount === 5) {
          this.descEl.textContent = 'Alhamdulillah. A day filled with gratitude and remembrance.';
        } else if (stats.completedCount === 0) {
          this.descEl.textContent = 'Every prayer is a new beginning. Tap any prayer below to log.';
        } else {
          const remaining = 5 - stats.completedCount;
          this.descEl.textContent = `${remaining} prayer${remaining > 1 ? 's' : ''} remaining. Take a peaceful moment for your next prayer.`;
        }
      }
    }
  }

  ST.ProgressRingRenderer = ProgressRingRenderer;
})(window.SalahTrack);
