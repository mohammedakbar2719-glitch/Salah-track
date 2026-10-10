/**
 * SalahTrack — Dedicated Qada Prayer Tracking Engine
 * Allows users to track banked missed prayers and log fulfillment over time.
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class QadaService {
    constructor() {
      this.ledger = ST.storage.getQadaLedger();
    }

    getLedger() {
      this.ledger = ST.storage.getQadaLedger();
      return this.ledger;
    }

    getTotalOwed() {
      const l = this.getLedger();
      return (l.owed.fajr || 0) +
             (l.owed.dhuhr || 0) +
             (l.owed.asr || 0) +
             (l.owed.maghrib || 0) +
             (l.owed.isha || 0);
    }

    setOwed(prayerKey, count) {
      if (!ST.PRAYER_KEYS.includes(prayerKey)) return false;
      const l = this.getLedger();
      l.owed[prayerKey] = Math.max(0, parseInt(count, 10) || 0);
      ST.storage.saveQadaLedger(l);
      if (ST.state) ST.state.emit('qada:updated', l);
      return true;
    }

    adjustOwed(prayerKey, delta) {
      if (!ST.PRAYER_KEYS.includes(prayerKey)) return false;
      const l = this.getLedger();
      const current = l.owed[prayerKey] || 0;
      l.owed[prayerKey] = Math.max(0, current + delta);
      ST.storage.saveQadaLedger(l);
      if (ST.state) ST.state.emit('qada:updated', l);
      return true;
    }

    /**
     * Marks 1 Qada prayer fulfilled
     */
    fulfillQada(prayerKey) {
      if (!ST.PRAYER_KEYS.includes(prayerKey)) return false;
      const l = this.getLedger();

      const currentOwed = l.owed[prayerKey] || 0;
      if (currentOwed > 0) {
        l.owed[prayerKey] = currentOwed - 1;
      }
      l.totalFulfilled = (l.totalFulfilled || 0) + 1;

      const logEntry = {
        id: `qada_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        prayerId: prayerKey,
        dateKey: ST.DateUtils.getTodayKey(),
        timestamp: new Date().toISOString()
      };

      l.history.unshift(logEntry);
      // Keep last 100 historical log entries
      if (l.history.length > 100) l.history.pop();

      ST.storage.saveQadaLedger(l);

      if (ST.state) {
        // Record undo action
        ST.state.lastAction = {
          type: 'qada_fulfill',
          prayerKey,
          logId: logEntry.id,
          previousOwed: currentOwed
        };
        ST.state.emit('qada:updated', l);
      }

      return logEntry;
    }

    /**
     * Reverts last fulfilled Qada
     */
    undoFulfill(lastAction) {
      if (!lastAction || lastAction.type !== 'qada_fulfill') return false;
      const l = this.getLedger();
      const pKey = lastAction.prayerKey;

      l.owed[pKey] = lastAction.previousOwed;
      l.totalFulfilled = Math.max(0, (l.totalFulfilled || 1) - 1);
      l.history = l.history.filter(h => h.id !== lastAction.logId);

      ST.storage.saveQadaLedger(l);
      if (ST.state) ST.state.emit('qada:updated', l);
      return true;
    }
  }

  ST.qadaService = new QadaService();
})(window.SalahTrack);
