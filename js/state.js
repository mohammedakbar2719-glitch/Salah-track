/**
 * SalahTrack — Reactive State Store & Undo Controller
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class StateStore {
    constructor() {
      this.currentDate = new Date();
      this.currentDateKey = ST.DateUtils.formatDateKey(this.currentDate);
      this.currentRecord = ST.storage.getRecord(this.currentDateKey);
      this.activeTab = 'dashboard';
      this.settings = ST.storage.getSettings();
      this.lastAction = null; // Undo state stack item
      this._subscribers = {};

      this._initMidnightWatcher();
    }

    _initMidnightWatcher() {
      ST.DateUtils.watchMidnight((newTodayKey) => {
        console.info(`SalahTrack: Midnight rollover detected -> ${newTodayKey}`);
        if (ST.DateUtils.isToday(this.currentDateKey)) {
          this.setDate(new Date());
          ST.DOM.showToast('New Islamic Day has begun. Assalamu Alaikum!', null, null);
        }
      });
    }

    on(event, callback) {
      if (!this._subscribers[event]) {
        this._subscribers[event] = [];
      }
      this._subscribers[event].push(callback);
    }

    emit(event, data) {
      if (this._subscribers[event]) {
        for (const cb of this._subscribers[event]) {
          try {
            cb(data);
          } catch (err) {
            console.error(`SalahTrack: Error in subscriber for ${event}`, err);
          }
        }
      }
    }

    /**
     * Sets active date safely with deep-cloned record
     * Ensures historical edits NEVER cross-contaminate today's record
     */
    setDate(newDate) {
      const parsedDate = typeof newDate === 'string' ? ST.DateUtils.parseDateKey(newDate) : new Date(newDate.getTime());
      this.currentDate = parsedDate;
      this.currentDateKey = ST.DateUtils.formatDateKey(parsedDate);
      this.currentRecord = ST.storage.getRecord(this.currentDateKey);

      this.emit('date:changed', {
        date: this.currentDate,
        dateKey: this.currentDateKey,
        record: this.currentRecord
      });
      this.emit('record:updated', this.currentRecord);
    }

    setTab(tabName) {
      if (['dashboard', 'calendar', 'stats', 'qada', 'settings'].includes(tabName)) {
        this.activeTab = tabName;
        this.emit('tab:changed', tabName);
      }
    }

    /**
     * Toggles a prayer's fulfilled state
     */
    togglePrayer(prayerKey) {
      if (!this.currentRecord.prayers[prayerKey]) return;

      const prayer = this.currentRecord.prayers[prayerKey];
      const previousState = {
        completed: prayer.completed,
        status: prayer.status,
        completedAt: prayer.completedAt
      };

      const newCompleted = !prayer.completed;
      prayer.completed = newCompleted;
      prayer.status = newCompleted ? ST.STATUS_TYPES.PRAYED : ST.STATUS_TYPES.NONE;
      prayer.completedAt = newCompleted ? new Date().toISOString() : null;

      // Save action for Undo
      this.lastAction = {
        type: 'prayer_toggle',
        dateKey: this.currentDateKey,
        prayerKey,
        previousState,
        newCompleted
      };

      ST.storage.saveRecord(this.currentRecord);
      this.emit('record:updated', this.currentRecord);
      this.emit('prayer:toggled', {
        prayerKey,
        completed: newCompleted,
        lastAction: this.lastAction
      });
    }

    /**
     * Updates prayer with specific detailed status (e.g. Prayed Late, In Jama'ah)
     */
    setPrayerStatus(prayerKey, status) {
      if (!this.currentRecord.prayers[prayerKey]) return;

      const prayer = this.currentRecord.prayers[prayerKey];
      const previousState = {
        completed: prayer.completed,
        status: prayer.status,
        completedAt: prayer.completedAt
      };

      prayer.status = status;
      prayer.completed = ST.isPrayerFulfilled(status);
      if (prayer.completed && !prayer.completedAt) {
        prayer.completedAt = new Date().toISOString();
      }

      this.lastAction = {
        type: 'prayer_status',
        dateKey: this.currentDateKey,
        prayerKey,
        previousState
      };

      ST.storage.saveRecord(this.currentRecord);
      this.emit('record:updated', this.currentRecord);
      this.emit('prayer:toggled', {
        prayerKey,
        completed: prayer.completed,
        lastAction: this.lastAction
      });
    }

    saveNote(noteText) {
      this.currentRecord.note = noteText;
      ST.storage.saveRecord(this.currentRecord);
      this.emit('record:updated', this.currentRecord);
    }

    toggleExempt() {
      this.currentRecord.isExempt = !this.currentRecord.isExempt;
      ST.storage.saveRecord(this.currentRecord);
      this.emit('record:updated', this.currentRecord);
    }

    /**
     * Master Undo Action Controller
     * Handles both daily prayer actions and Qada fulfillments
     */
    undoLastAction() {
      if (!this.lastAction) return false;

      if (this.lastAction.type === 'qada_fulfill') {
        const success = ST.qadaService.undoFulfill(this.lastAction);
        this.lastAction = null;
        return success;
      }

      const { dateKey, prayerKey, previousState } = this.lastAction;
      const rec = ST.storage.getRecord(dateKey);
      if (rec && rec.prayers && rec.prayers[prayerKey]) {
        rec.prayers[prayerKey] = Object.assign({}, previousState);
        ST.storage.saveRecord(rec);

        if (dateKey === this.currentDateKey) {
          this.currentRecord = rec;
        }

        this.lastAction = null;
        this.emit('record:updated', this.currentRecord);
        this.emit('action:undone', { dateKey, prayerKey });
        return true;
      }
      return false;
    }

    updateSettings(newSettings) {
      this.settings = Object.assign({}, this.settings, newSettings);
      ST.storage.saveSettings(this.settings);
      this.applyTheme(this.settings.theme);
      this.emit('settings:updated', this.settings);
    }

    applyTheme(theme) {
      const root = document.documentElement;
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', theme);
      }
    }
  }

  ST.state = new StateStore();
})(window.SalahTrack);
