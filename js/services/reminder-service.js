/**
 * SalahTrack — Prayer Reminders & Notification Service
 * Independent prayer toggles, pre-prayer offsets, deduplication, and sound fallbacks
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const STORAGE_KEY = 'salahtrack_reminders_cfg_v1';
  const NOTIFIED_CACHE_KEY = 'salahtrack_notified_events_v1';

  const DEFAULT_CONFIG = Object.freeze({
    enabled: true,
    soundEnabled: true,
    preReminderMinutes: 10, // 0 = at exact time, 10 = 10 mins before, etc.
    prayers: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true
    },
    updatedAt: new Date().toISOString()
  });

  class ReminderService {
    constructor() {
      this.config = this._loadConfig();
      this.notifiedEvents = this._loadNotifiedEvents();
      this.checkInterval = null;
      this.audioCtx = null;

      this.init();
    }

    _loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
      } catch (e) {}
      return Object.assign({}, DEFAULT_CONFIG);
    }

    _loadNotifiedEvents() {
      try {
        const raw = sessionStorage.getItem(NOTIFIED_CACHE_KEY);
        if (raw) return new Set(JSON.parse(raw));
      } catch (e) {}
      return new Set();
    }

    _saveNotifiedEvents() {
      try {
        sessionStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(Array.from(this.notifiedEvents)));
      } catch (e) {}
    }

    saveConfig(newConfig) {
      this.config = Object.assign({}, this.config, newConfig, {
        updatedAt: new Date().toISOString()
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        if (ST.state) ST.state.emit('reminders:updated', this.config);
        return true;
      } catch (e) {
        return false;
      }
    }

    getConfig() {
      return this.config;
    }

    getPermissionStatus() {
      if (!('Notification' in window)) return 'unsupported';
      return Notification.permission; // 'default' | 'granted' | 'denied'
    }

    /**
     * Explicit User Action: Request system notification permission
     */
    async requestPermission() {
      if (!('Notification' in window)) {
        throw new Error('Web Notifications are not supported by your browser.');
      }

      const result = await Notification.requestPermission();
      if (ST.state) ST.state.emit('reminders:permissionChanged', result);
      return result;
    }

    init() {
      // Start periodic reminder check every 25 seconds
      if (this.checkInterval) clearInterval(this.checkInterval);
      this.checkInterval = setInterval(() => this.checkUpcomingPrayers(), 25000);
      // Run once immediately
      setTimeout(() => this.checkUpcomingPrayers(), 1500);
    }

    /**
     * Checks if any prayer window has arrived or is within the pre-reminder window
     */
    checkUpcomingPrayers() {
      if (!this.config.enabled) return;

      const now = new Date();
      const todayKey = ST.DateUtils.getTodayKey();
      const times = ST.prayerTimesService.getTimes(now);
      const nowMs = now.getTime();

      for (const pKey of ST.PRAYER_KEYS) {
        if (!this.config.prayers[pKey]) continue; // User disabled this prayer reminder

        const slot = times[pKey];
        if (!slot || !slot.dateObj) continue;

        const prayerMs = slot.dateObj.getTime();
        const pConfig = ST.PRAYERS[pKey];

        // 1. Exact Prayer Time Notification
        const exactEventKey = `${todayKey}_${pKey}_exact`;
        const diffMs = nowMs - prayerMs;
        // Trigger if within a 90 second window after the prayer entered
        if (diffMs >= 0 && diffMs <= 90000 && !this.notifiedEvents.has(exactEventKey)) {
          this.notifiedEvents.add(exactEventKey);
          this._saveNotifiedEvents();
          this.triggerNotification({
            title: `Time for ${pConfig.nameEn} (${pConfig.nameAr})`,
            body: `The time for ${pConfig.nameEn} prayer has entered (${slot.formatted}).`,
            pKey,
            isPre: false
          });
        }

        // 2. Pre-Prayer Reminder (e.g. 10 mins before)
        const preMinutes = this.config.preReminderMinutes || 0;
        if (preMinutes > 0) {
          const preEventKey = `${todayKey}_${pKey}_pre_${preMinutes}`;
          const preMs = prayerMs - (preMinutes * 60000);
          const preDiff = nowMs - preMs;

          if (preDiff >= 0 && preDiff <= 90000 && !this.notifiedEvents.has(preEventKey)) {
            this.notifiedEvents.add(preEventKey);
            this._saveNotifiedEvents();
            this.triggerNotification({
              title: `${pConfig.nameEn} in ${preMinutes} minutes`,
              body: `${pConfig.nameEn} prayer starts at ${slot.formatted}. Prepare for prayer.`,
              pKey,
              isPre: true
            });
          }
        }
      }
    }

    /**
     * Dispatches notification with sound and in-app fallback
     */
    triggerNotification({ title, body, pKey, isPre }) {
      // 1. Play peaceful chime sound if enabled
      if (this.config.soundEnabled) {
        this.playGentleChime();
      }

      // 2. System Notification if permission is granted
      if (this.getPermissionStatus() === 'granted') {
        try {
          const options = {
            body,
            icon: 'manifest.webmanifest',
            tag: `salahtrack_${pKey}_${Date.now()}`,
            silent: !this.config.soundEnabled
          };
          new Notification(title, options);
        } catch (e) {
          console.warn('SalahTrack: Native notification dispatch failed, falling back to toast', e);
        }
      }

      // 3. Guaranteed in-app toast fallback (for open tab or background fallback)
      ST.DOM.showToast(title, 'Open', () => {
        if (ST.state) ST.state.setTab('dashboard');
      }, 7000);
    }

    /**
     * Plays a peaceful, synthesized audio chime using Web Audio API (zero audio file dependencies)
     */
    playGentleChime() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        if (!this.audioCtx) this.audioCtx = new AudioContext();
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        // Harmonious spiritual tone (432 Hz organic reference frequency)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(432, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(576, this.audioCtx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.2);
      } catch (err) {
        // Audio policy restrictions on unmuted gesture
      }
    }
  }

  ST.reminderService = new ReminderService();
})(window.SalahTrack);
