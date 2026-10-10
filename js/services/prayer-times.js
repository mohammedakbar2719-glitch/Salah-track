/**
 * SalahTrack — Prayer Times Service & Location Manager
 * Manages user coordinates, next prayer countdown, and calculation configurations.
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const STORAGE_KEY = 'salahtrack_prayertimes_cfg_v1';

  const DEFAULT_CONFIG = Object.freeze({
    cityName: 'Makkah, Saudi Arabia',
    latitude: 21.4225,
    longitude: 39.8262,
    methodId: 'MAKKAH',
    asrMethod: 'STANDARD',
    highLatitudeRule: 'middle_of_night',
    adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    isAutoLocation: false,
    updatedAt: new Date().toISOString()
  });

  class PrayerTimesService {
    constructor() {
      this.config = this._loadConfig();
    }

    _loadConfig() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Object.assign({}, DEFAULT_CONFIG, parsed);
        }
      } catch (e) {
        console.warn('SalahTrack: Failed to load prayer times configuration', e);
      }
      return Object.assign({}, DEFAULT_CONFIG);
    }

    saveConfig(newConfig) {
      this.config = Object.assign({}, this.config, newConfig, {
        updatedAt: new Date().toISOString()
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        if (ST.state) ST.state.emit('prayerTimes:updated', this.config);
        return true;
      } catch (e) {
        return false;
      }
    }

    getConfig() {
      return this.config;
    }

    /**
     * Retrieves active system timezone and UTC offset information
     */
    getTimezoneInfo() {
      const tzName = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'Local';
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
      const mins = String(Math.abs(offsetMin) % 60).padStart(2, '0');
      const offsetStr = `UTC${sign}${hours}:${mins}`;
      return { timeZone: tzName, offset: offsetStr, offsetHours: offsetMin / 60.0 };
    }

    /**
     * Manually sets latitude and longitude without requiring GPS permissions
     */
    setManualCoordinates(lat, lng, cityName = 'Custom Coordinates') {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        throw new Error('Latitude must be a valid number between -90 and 90 degrees.');
      }
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        throw new Error('Longitude must be a valid number between -180 and 180 degrees.');
      }
      return this.saveConfig({
        latitude,
        longitude,
        cityName: cityName || `Coordinates: ${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
        isAutoLocation: false
      });
    }

    /**
     * Explicit Geolocation Request (Only triggered with user click)
     */
    async requestCurrentLocation() {
      if (!('geolocation' in navigator)) {
        throw new Error('Geolocation is not supported by your browser.');
      }

      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Attempt reverse geocoding approximation or city label
            let cityName = `Coordinates: ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;

            this.saveConfig({
              cityName,
              latitude: lat,
              longitude: lng,
              isAutoLocation: true
            });

            resolve(this.config);
          },
          (error) => {
            let msg = 'Unable to retrieve location.';
            if (error.code === error.PERMISSION_DENIED) {
              msg = 'Location permission was denied. You can select your city manually below.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              msg = 'Location information is unavailable.';
            } else if (error.code === error.TIMEOUT) {
              msg = 'Location request timed out.';
            }
            reject(new Error(msg));
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      });
    }

    /**
     * Calculates prayer times for a specified date
     */
    getTimes(date = new Date()) {
      const coords = {
        latitude: this.config.latitude,
        longitude: this.config.longitude
      };

      const options = {
        methodId: this.config.methodId,
        asrMethod: this.config.asrMethod,
        highLatitudeRule: this.config.highLatitudeRule,
        adjustments: this.config.adjustments
      };

      return ST.prayerTimesCalculator.calculateTimes(date, coords, options);
    }

    /**
     * Determines the next upcoming prayer and countdown relative to now
     */
    getNextPrayer(now = new Date()) {
      const timesToday = this.getTimes(now);
      const nowMs = now.getTime();

      const prayerOrder = [
        { key: 'fajr', slot: timesToday.fajr },
        { key: 'dhuhr', slot: timesToday.dhuhr },
        { key: 'asr', slot: timesToday.asr },
        { key: 'maghrib', slot: timesToday.maghrib },
        { key: 'isha', slot: timesToday.isha }
      ];

      for (const item of prayerOrder) {
        if (item.slot.dateObj.getTime() > nowMs) {
          const diffMs = item.slot.dateObj.getTime() - nowMs;
          const diffMinutes = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMinutes / 60);
          const minutes = diffMinutes % 60;

          let remainingText = '';
          if (hours > 0) remainingText += `${hours} hr `;
          remainingText += `${minutes} min`;

          const pConfig = ST.PRAYERS[item.key];
          return {
            key: item.key,
            nameEn: pConfig.nameEn,
            nameAr: pConfig.nameAr,
            timeFormatted: item.slot.formatted,
            targetDate: item.slot.dateObj,
            timeRemainingText: remainingText,
            isTomorrow: false
          };
        }
      }

      // If past Isha today, the next prayer is tomorrow's Fajr
      const tomorrow = ST.DateUtils.addDays(now, 1);
      const timesTomorrow = this.getTimes(tomorrow);
      const diffMs = timesTomorrow.fajr.dateObj.getTime() - nowMs;
      const diffMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      const fajrConfig = ST.PRAYERS.fajr;
      return {
        key: 'fajr',
        nameEn: fajrConfig.nameEn,
        nameAr: fajrConfig.nameAr,
        timeFormatted: timesTomorrow.fajr.formatted,
        targetDate: timesTomorrow.fajr.dateObj,
        timeRemainingText: `${hours} hr ${minutes} min`,
        isTomorrow: true
      };
    }
  }

  ST.prayerTimesService = new PrayerTimesService();
})(window.SalahTrack);
