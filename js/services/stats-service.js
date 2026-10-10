/**
 * SalahTrack — Statistics & Calculation Engine
 * 100% computed from real records, transparent denominators, no synthetic data.
 * Version: 2.1.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const StatsService = {
    /**
     * Determines whether a day has been explicitly tracked/recorded by the user
     * Distinguishes an unrecorded day from a day with five recorded incomplete prayers.
     */
    isExplicitlyRecorded(record, recordsMap, dateKey) {
      if (!recordsMap || !recordsMap[dateKey]) return false;
      const rec = recordsMap[dateKey];
      if (rec.isExempt) return true;
      if (typeof rec.note === 'string' && rec.note.trim().length > 0) return true;
      if (!rec.prayers) return false;

      // Check if any prayer is completed or has a non-default status
      for (const pKey of ST.PRAYER_KEYS) {
        const p = rec.prayers[pKey];
        if (p && (p.completed || (p.status && p.status !== ST.STATUS_TYPES.NONE))) {
          return true;
        }
      }

      // If record was modified and saved (updated timestamp differs from creation)
      if (rec.createdAt && rec.updatedAt && rec.createdAt !== rec.updatedAt) {
        return true;
      }

      return false;
    },

    /**
     * Computes daily completion metrics for a single local date record
     * Daily completion = completed obligatory prayers / 5
     */
    computeDayCompletion(record) {
      if (!record || !record.prayers) {
        return {
          completedCount: 0,
          totalObligatory: 5,
          percentage: 0,
          isExempt: false,
          isFuture: false,
          unrecordedCount: 5,
          denominatorText: '5 obligatory prayers'
        };
      }

      const isFuture = ST.DateUtils.isFuture(record.date);

      if (record.isExempt) {
        return {
          completedCount: 0,
          totalObligatory: 0,
          percentage: 100,
          isExempt: true,
          isFuture,
          unrecordedCount: 0,
          denominatorText: 'Exempt day (0 required)'
        };
      }

      let completedCount = 0;
      let unrecordedCount = 0;

      for (const key of ST.PRAYER_KEYS) {
        const p = record.prayers[key];
        if (p && p.completed) {
          completedCount++;
        } else {
          unrecordedCount++;
        }
      }

      const percentage = Math.round((completedCount / 5) * 100);

      return {
        completedCount,
        totalObligatory: 5,
        percentage,
        isExempt: false,
        isFuture,
        unrecordedCount,
        denominatorText: '5 obligatory prayers'
      };
    },

    /**
     * Professional Multi-Window Analytics Engine
     * Supports 'last7', 'last30', 'month', and 'custom' date ranges.
     * Strictly avoids inventing missing history, excludes future dates from denominators,
     * and distinguishes unrecorded days from days with recorded incomplete prayers.
     */
    computeRangeMetrics({ filter = 'last7', customStart = null, customEnd = null, targetDate = new Date() } = {}) {
      const records = ST.storage.getAllRecords();
      let startD, endD;

      if (filter === 'last7') {
        endD = ST.DateUtils.parseDateKey(ST.DateUtils.formatDateKey(targetDate));
        startD = ST.DateUtils.addDays(endD, -6);
      } else if (filter === 'last30') {
        endD = ST.DateUtils.parseDateKey(ST.DateUtils.formatDateKey(targetDate));
        startD = ST.DateUtils.addDays(endD, -29);
      } else if (filter === 'month') {
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        startD = new Date(y, m, 1, 12, 0, 0);
        endD = new Date(y, m + 1, 0, 12, 0, 0);
      } else if (filter === 'custom') {
        startD = customStart ? ST.DateUtils.parseDateKey(customStart) : ST.DateUtils.addDays(targetDate, -6);
        endD = customEnd ? ST.DateUtils.parseDateKey(customEnd) : ST.DateUtils.parseDateKey(ST.DateUtils.formatDateKey(targetDate));
        if (startD > endD) {
          // Swap if in inverted chronological order
          const temp = startD;
          startD = endD;
          endD = temp;
        }
      } else {
        endD = ST.DateUtils.parseDateKey(ST.DateUtils.formatDateKey(targetDate));
        startD = ST.DateUtils.addDays(endD, -6);
      }

      const days = [];
      let curr = new Date(startD.getTime());
      while (curr <= endD) {
        const dateKey = ST.DateUtils.formatDateKey(curr);
        const isFuture = ST.DateUtils.isFuture(dateKey);
        const isToday = ST.DateUtils.isToday(dateKey);
        const rec = records[dateKey];
        const dayStats = this.computeDayCompletion(rec);
        const isRecorded = this.isExplicitlyRecorded(rec, records, dateKey);

        const isFullyCompleted = (!isFuture && (dayStats.isExempt || dayStats.completedCount === 5));
        const isPartiallyCompleted = (!isFuture && !dayStats.isExempt && dayStats.completedCount > 0 && dayStats.completedCount < 5);
        const isRecordedIncomplete = (!isFuture && !dayStats.isExempt && isRecorded && dayStats.completedCount === 0);
        const isUnrecorded = (!isFuture && !dayStats.isExempt && !isRecorded);

        const prayersStatus = {};
        for (const pKey of ST.PRAYER_KEYS) {
          prayersStatus[pKey] = !!(rec && rec.prayers && rec.prayers[pKey] && rec.prayers[pKey].completed);
        }

        days.push({
          date: new Date(curr.getTime()),
          dateKey,
          dayName: curr.toLocaleDateString('en-US', { weekday: 'short' }),
          dayLetter: curr.toLocaleDateString('en-US', { weekday: 'narrow' }),
          dayNumber: curr.getDate(),
          isToday,
          isFuture,
          isExempt: dayStats.isExempt,
          isRecorded,
          isUnrecorded,
          isFullyCompleted,
          isPartiallyCompleted,
          isRecordedIncomplete,
          completedCount: isFuture ? 0 : dayStats.completedCount,
          unrecordedCount: isFuture ? 0 : dayStats.unrecordedCount,
          percentage: isFuture ? 0 : dayStats.percentage,
          prayers: prayersStatus,
          hasRecord: !!rec
        });

        curr = ST.DateUtils.addDays(curr, 1);
      }

      // Calculations and aggregations
      const totalDaysInRange = days.length;
      const elapsedDays = days.filter(d => !d.isFuture).length;
      const futureDays = days.filter(d => d.isFuture).length;
      const exemptDays = days.filter(d => !d.isFuture && d.isExempt).length;
      const recordedDays = days.filter(d => !d.isFuture && d.isRecorded).length;
      const unrecordedDays = days.filter(d => !d.isFuture && d.isUnrecorded).length;
      const fullyCompletedDays = days.filter(d => !d.isFuture && d.isFullyCompleted).length;
      const partiallyCompletedDays = days.filter(d => !d.isFuture && d.isPartiallyCompleted).length;
      const recordedIncompleteDays = days.filter(d => !d.isFuture && d.isRecordedIncomplete).length;

      let totalCompletedPrayers = 0;
      const prayerCompletedCounts = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };

      // Compute streak for each prayer up to today
      const elapsedDaysList = days.filter(d => !d.isFuture);

      for (const d of elapsedDaysList) {
        if (!d.isExempt) {
          totalCompletedPrayers += d.completedCount;
          for (const pKey of ST.PRAYER_KEYS) {
            if (d.prayers[pKey]) {
              prayerCompletedCounts[pKey]++;
            }
          }
        }
      }

      // Eligible prayers: non-exempt elapsed days * 5
      const eligibleDays = elapsedDays - exemptDays;
      const totalEligiblePrayers = eligibleDays * 5;
      const completionPercentage = totalEligiblePrayers > 0
        ? Math.round((totalCompletedPrayers / totalEligiblePrayers) * 100)
        : 0;

      // Tracked-only consistency rate (avoiding penalizing untracked past)
      const recordedNonExemptDays = recordedDays - exemptDays;
      const trackedEligiblePrayers = recordedNonExemptDays * 5;
      const trackedConsistencyRate = trackedEligiblePrayers > 0
        ? Math.round((totalCompletedPrayers / trackedEligiblePrayers) * 100)
        : 0;

      // Prayer consistency metrics
      const prayerConsistency = {};
      let highestRate = -1;
      let mostConsistentPrayer = null;

      for (const pKey of ST.PRAYER_KEYS) {
        const cCount = prayerCompletedCounts[pKey];
        const rate = eligibleDays > 0 ? Math.round((cCount / eligibleDays) * 100) : 0;

        // Calculate consecutive active streak backwards from today
        let streak = 0;
        for (let i = elapsedDaysList.length - 1; i >= 0; i--) {
          const item = elapsedDaysList[i];
          if (item.isExempt || item.prayers[pKey]) {
            streak++;
          } else {
            break;
          }
        }

        prayerConsistency[pKey] = {
          prayerId: pKey,
          nameEn: ST.PRAYERS[pKey].nameEn,
          nameAr: ST.PRAYERS[pKey].nameAr,
          period: ST.PRAYERS[pKey].period,
          completedCount: cCount,
          eligibleDays,
          percentage: rate,
          streak
        };

        if (rate > highestRate && eligibleDays > 0) {
          highestRate = rate;
          mostConsistentPrayer = {
            id: pKey,
            name: ST.PRAYERS[pKey].nameEn,
            percentage: rate
          };
        }
      }

      const hasAnyData = totalCompletedPrayers > 0 || recordedDays > 0;

      // Transparent mathematical formula statement
      const formulaExplanation = totalEligiblePrayers > 0
        ? `Formula: (${totalCompletedPrayers} completed prayers ÷ ${totalEligiblePrayers} eligible prayers) × 100 = ${completionPercentage}%. Denominator is based on ${eligibleDays} non-exempt elapsed days (${exemptDays} exempt day${exemptDays === 1 ? '' : 's'} and ${futureDays} future day${futureDays === 1 ? '' : 's'} excluded).`
        : `Denominator is 0 prayers (${exemptDays} exempt and ${futureDays} future days). No eligible obligatory prayers in this range.`;

      return {
        filter,
        startDateKey: ST.DateUtils.formatDateKey(startD),
        endDateKey: ST.DateUtils.formatDateKey(endD),
        startDateDisplay: ST.DateUtils.formatShortDate(startD),
        endDateDisplay: ST.DateUtils.formatShortDate(endD),
        days,
        totalDaysInRange,
        elapsedDays,
        futureDays,
        exemptDays,
        recordedDays,
        unrecordedDays,
        fullyCompletedDays,
        partiallyCompletedDays,
        recordedIncompleteDays,
        totalCompletedPrayers,
        totalEligiblePrayers,
        completionPercentage,
        trackedConsistencyRate,
        prayerConsistency,
        mostConsistentPrayer,
        formulaExplanation,
        hasAnyData
      };
    },

    /**
     * Computes 7-day rolling weekly metrics ending on specified date (defaults to today)
     * Strictly avoids treating future days as missed. Kept backwards compatible.
     */
    computeWeeklyBreakdown(targetDate = new Date()) {
      const range = this.computeRangeMetrics({ filter: 'last7', targetDate });
      return {
        days: range.days,
        totalCompleted: range.totalCompletedPrayers,
        totalEligible: range.totalEligiblePrayers,
        consistencyRate: range.completionPercentage,
        denominatorExplanation: range.formulaExplanation
      };
    },

    /**
     * Computes lifetime and aggregate metrics across all saved records
     * Deduplicates every record and explains the mathematical denominator.
     */
    computeLifetimeMetrics() {
      const records = ST.storage.getAllRecords();
      const dateKeys = Object.keys(records).sort();

      if (dateKeys.length === 0) {
        return {
          totalDaysRecorded: 0,
          lifetimeCompletedPrayers: 0,
          totalEligiblePrayers: 0,
          overallConsistencyRate: 0,
          currentWeeklyRate: 0,
          prayerBreakdown: {
            fajr: { completed: 0, total: 0, rate: 0 },
            dhuhr: { completed: 0, total: 0, rate: 0 },
            asr: { completed: 0, total: 0, rate: 0 },
            maghrib: { completed: 0, total: 0, rate: 0 },
            isha: { completed: 0, total: 0, rate: 0 }
          },
          mostConsistentPrayer: null,
          denominatorExplanation: 'No saved prayer records yet. Denominator: 0.'
        };
      }

      const firstKey = dateKeys[0];
      const todayKey = ST.DateUtils.getTodayKey();
      const range = this.computeRangeMetrics({
        filter: 'custom',
        customStart: firstKey,
        customEnd: todayKey
      });

      return {
        totalDaysRecorded: range.recordedDays,
        exemptDays: range.exemptDays,
        lifetimeCompletedPrayers: range.totalCompletedPrayers,
        totalEligiblePrayers: range.totalEligiblePrayers,
        overallConsistencyRate: range.completionPercentage,
        currentWeeklyRate: this.computeWeeklyBreakdown().consistencyRate,
        prayerBreakdown: range.prayerConsistency,
        mostConsistentPrayer: range.mostConsistentPrayer,
        denominatorExplanation: range.formulaExplanation
      };
    }
  };

  ST.StatsService = StatsService;
})(window.SalahTrack);
