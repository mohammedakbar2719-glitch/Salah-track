/**
 * SalahTrack — Bulletproof Local Date & Calendar Utilities
 * Consistent local calendar date strategy, DST-safe noon arithmetic, and midnight rollover
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const DateUtils = {
    /**
     * Converts Date to local YYYY-MM-DD string
     * STRICT: Uses local calendar parts (getFullYear, getMonth, getDate).
     * NEVER uses toISOString() or UTC methods to avoid time-shift bugs.
     */
    formatDateKey(date) {
      if (!date || isNaN(date.getTime())) date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    /**
     * Parses YYYY-MM-DD string into a stable local Date object.
     * Anchored at 12:00:00 PM (noon) to guarantee safety across Daylight Saving Time shifts.
     */
    parseDateKey(dateStr) {
      if (!dateStr || typeof dateStr !== 'string') return new Date();
      const parts = dateStr.trim().split('-');
      if (parts.length !== 3) return new Date();

      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);

      // Safe local noon instantiation
      return new Date(y, m, d, 12, 0, 0, 0);
    },

    /**
     * Today's local date key
     */
    getTodayKey() {
      return DateUtils.formatDateKey(new Date());
    },

    /**
     * Temporal checks comparing local date keys directly (lexicographical ISO strings)
     */
    isFuture(dateKey) {
      return dateKey > DateUtils.getTodayKey();
    },

    isPast(dateKey) {
      return dateKey < DateUtils.getTodayKey();
    },

    isToday(date) {
      const key = typeof date === 'string' ? date : DateUtils.formatDateKey(date);
      return key === DateUtils.getTodayKey();
    },

    isSameDay(d1, d2) {
      const k1 = typeof d1 === 'string' ? d1 : DateUtils.formatDateKey(d1);
      const k2 = typeof d2 === 'string' ? d2 : DateUtils.formatDateKey(d2);
      return k1 === k2;
    },

    /**
     * Adds n days safely across month/year/leap-year boundaries using noon anchoring
     */
    addDays(date, days) {
      const base = typeof date === 'string' ? DateUtils.parseDateKey(date) : new Date(date.getTime());
      base.setDate(base.getDate() + days);
      base.setHours(12, 0, 0, 0);
      return base;
    },

    /**
     * Formats full display string, e.g. "Saturday, 10 October 2026"
     */
    formatDisplayDate(date) {
      const d = typeof date === 'string' ? DateUtils.parseDateKey(date) : date;
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    },

    /**
     * Formats short date, e.g. "Sat, Oct 10"
     */
    formatShortDate(date) {
      const d = typeof date === 'string' ? DateUtils.parseDateKey(date) : date;
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    },

    /**
     * Formats Hijri Islamic Calendar Date (Umm al-Qura standard)
     */
    formatHijri(date) {
      const d = typeof date === 'string' ? DateUtils.parseDateKey(date) : date;
      try {
        const hijriFormatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const parts = hijriFormatter.formatToParts(d);
        let day = '', month = '', year = '';
        for (const p of parts) {
          if (p.type === 'day') day = p.value;
          if (p.type === 'month') month = p.value;
          if (p.type === 'year') year = p.value;
        }
        if (day && month && year) {
          return `${day} ${month} ${year} AH`;
        }
      } catch (e) {
        // Fallback for older engines
      }

      // Mathematical estimation fallback
      const jd = Math.floor((d.getTime() / 86400000) + 2440587.5);
      const l = Math.floor(jd - 1948440 + 10632);
      const n = Math.floor((l - 1) / 10631);
      const l2 = Math.floor(l - 10631 * n + 354);
      const j = (Math.floor((10985 - l2) / 5316)) * (Math.floor((50 * l2) / 17719)) + (Math.floor(l2 / 5670)) * (Math.floor((43 * l2) / 15238));
      const l3 = l2 - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
      const m = Math.floor((24 * l3) / 709);
      const dayNum = l3 - Math.floor((709 * m) / 24);
      const yr = Math.floor(30 * n + j - 30);

      const hijriMonths = [
        'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
        'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
        'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
      ];
      return `${dayNum} ${hijriMonths[Math.max(0, Math.min(11, m - 1))]} ${yr} AH`;
    },

    /**
     * Builds month grid cells for interactive calendar
     */
    getMonthGrid(year, month, firstDayOfWeek = 0) {
      const firstDay = new Date(year, month, 1, 12, 0, 0);
      const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
      const totalDays = lastDay.getDate();

      let startingDay = firstDay.getDay() - firstDayOfWeek;
      if (startingDay < 0) startingDay += 7;

      const cells = [];

      // Leading padding cells
      for (let i = 0; i < startingDay; i++) {
        cells.push({ isEmpty: true });
      }

      // Actual month days
      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(year, month, day, 12, 0, 0);
        const dateKey = DateUtils.formatDateKey(d);
        cells.push({
          isEmpty: false,
          dayNumber: day,
          date: d,
          dateKey,
          isToday: DateUtils.isToday(dateKey),
          isFuture: DateUtils.isFuture(dateKey),
          isPast: DateUtils.isPast(dateKey)
        });
      }

      return cells;
    },

    /**
     * Midnight rollover detector
     * Monitors day change when the browser tab remains open past 23:59:59
     */
    watchMidnight(onDayRollover) {
      let lastKnownToday = DateUtils.getTodayKey();

      const check = () => {
        const currentToday = DateUtils.getTodayKey();
        if (currentToday !== lastKnownToday) {
          lastKnownToday = currentToday;
          if (typeof onDayRollover === 'function') {
            onDayRollover(currentToday);
          }
        }
      };

      // Check on window refocus and periodic 30s interval
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('focus', check);
      return setInterval(check, 30000);
    }
  };

  ST.DateUtils = DateUtils;
})(window.SalahTrack);
