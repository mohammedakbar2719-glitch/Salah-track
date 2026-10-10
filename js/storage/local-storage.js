/**
 * SalahTrack — Local Storage & Persistence Engine
 * Atomic writes, schema migrations, Qada ledger storage, and sync tracking
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const STORAGE_KEYS = {
    RECORDS_PREFIX: 'salahtrack_records_',
    QADA_PREFIX: 'salahtrack_qada_',
    SETTINGS: 'salahtrack_settings_v2',
    LEGACY_RECORDS: 'salahtrack_records_v1',
    DEMO_FLAG: 'salahtrack_is_demo_loaded'
  };

  const DEFAULT_SETTINGS = Object.freeze({
    theme: 'system',
    firstDayOfWeek: 0, // 0 = Sunday, 1 = Monday, 6 = Saturday
    allowDetailedStatus: true,
    enableQadaTracker: true,
    calculationMethod: 'MWL',
    city: '',
    updatedAt: new Date().toISOString()
  });

  class LocalStorageAdapter {
    constructor() {
      this._userId = ST.DEFAULT_USER_ID;
      this._recordsCache = null;
      this._qadaCache = null;
      this._settingsCache = null;
      this._syncStatus = navigator.onLine ? 'saved_local' : 'offline_saved';

      this._initNetworkListeners();
      this._runStartupMigrations();
    }

    _initNetworkListeners() {
      window.addEventListener('online', () => {
        this._syncStatus = 'saved_local';
        if (ST.state) ST.state.emit('sync:status', this._syncStatus);
      });
      window.addEventListener('offline', () => {
        this._syncStatus = 'offline_saved';
        if (ST.state) ST.state.emit('sync:status', this._syncStatus);
      });
    }

    getSyncStatus() {
      return this._syncStatus;
    }

    _getUserRecordsKey() {
      return `${STORAGE_KEYS.RECORDS_PREFIX}${this._userId}`;
    }

    _getUserQadaKey() {
      return `${STORAGE_KEYS.QADA_PREFIX}${this._userId}`;
    }

    /**
     * Runs migrations on legacy storage data if present
     */
    _runStartupMigrations() {
      try {
        const recordsKey = this._getUserRecordsKey();
        let records = {};

        // 1. Check current records key
        const existingRaw = localStorage.getItem(recordsKey);
        if (existingRaw) {
          records = JSON.parse(existingRaw);
        } else {
          // Check for legacy v1 records
          const legacyRaw = localStorage.getItem(STORAGE_KEYS.LEGACY_RECORDS);
          if (legacyRaw) {
            console.info('SalahTrack: Migrating legacy v1 records to v2 schema...');
            const legacyData = JSON.parse(legacyRaw);
            for (const [dateStr, legacyRec] of Object.entries(legacyData)) {
              const migrated = ST.migrateRecord(legacyRec, this._userId);
              if (migrated) records[dateStr] = migrated;
            }
            localStorage.setItem(recordsKey, JSON.stringify(records));
          }
        }

        // Validate & upgrade all stored records
        let hasChanges = false;
        for (const [dateStr, rec] of Object.entries(records)) {
          if (!rec.schemaVersion || rec.schemaVersion < ST.CURRENT_SCHEMA_VERSION) {
            const upgraded = ST.migrateRecord(rec, this._userId);
            if (upgraded) {
              records[dateStr] = upgraded;
              hasChanges = true;
            }
          }
        }

        if (hasChanges) {
          localStorage.setItem(recordsKey, JSON.stringify(records));
        }

        this._recordsCache = records;
      } catch (err) {
        console.error('SalahTrack: Error executing startup migrations', err);
        this._recordsCache = {};
      }
    }

    /**
     * Retrieves all prayer records dictionary for the current user
     */
    getAllRecords() {
      if (this._recordsCache) return this._recordsCache;
      try {
        const raw = localStorage.getItem(this._getUserRecordsKey());
        this._recordsCache = raw ? JSON.parse(raw) : {};
      } catch (e) {
        console.error('SalahTrack: Failed to load records from storage', e);
        this._recordsCache = {};
      }
      return this._recordsCache;
    }

    /**
     * Retrieves a cloned record for a specific local date
     * Strictly avoids leaking mutations between different dates
     */
    getRecord(dateKey) {
      const records = this.getAllRecords();
      if (records[dateKey]) {
        // Deep clone to guarantee reference isolation
        return JSON.parse(JSON.stringify(records[dateKey]));
      }
      return ST.createEmptyRecord(dateKey, this._userId);
    }

    /**
     * Immediately saves a specific date record with deep validation
     * Updates ONLY this specific dateKey without touching other records
     */
    saveRecord(record) {
      if (!ST.validateRecord(record)) {
        console.warn('SalahTrack: Invalid record rejected from persistence', record);
        return false;
      }

      const records = this.getAllRecords();
      const dateKey = record.date;

      // Assign current update metadata
      record.updatedAt = new Date().toISOString();
      record.userId = this._userId;
      record.schemaVersion = ST.CURRENT_SCHEMA_VERSION;

      // Conflict safeguard: ensure we do not regress timestamps
      const existing = records[dateKey];
      if (existing && existing.updatedAt && new Date(existing.updatedAt) > new Date(record.updatedAt)) {
        console.warn('SalahTrack: Stale write prevented by timestamp conflict resolution.');
        return false;
      }

      // Deep clone before storing into cache
      records[dateKey] = JSON.parse(JSON.stringify(record));

      try {
        localStorage.setItem(this._getUserRecordsKey(), JSON.stringify(records));
        this._recordsCache = records;

        // Forward to Cloud Firestore if user is authenticated
        if (ST.firestoreAdapter && ST.firestoreAdapter.currentUser) {
          ST.firestoreAdapter.saveRecord(records[dateKey]);
        }

        return true;
      } catch (e) {
        console.error('SalahTrack: Storage quota exceeded or disk write failed', e);
        return false;
      }
    }

    /**
     * Deletes a record for a specific date safely
     */
    deleteRecord(dateKey) {
      const records = this.getAllRecords();
      if (records[dateKey]) {
        delete records[dateKey];
        localStorage.setItem(this._getUserRecordsKey(), JSON.stringify(records));
        this._recordsCache = records;
        return true;
      }
      return false;
    }

    /**
     * Qada Ledger Storage Methods
     */
    getQadaLedger() {
      if (this._qadaCache) return this._qadaCache;
      try {
        const raw = localStorage.getItem(this._getUserQadaKey());
        this._qadaCache = raw ? JSON.parse(raw) : ST.createEmptyQadaLedger(this._userId);
      } catch (e) {
        this._qadaCache = ST.createEmptyQadaLedger(this._userId);
      }
      return this._qadaCache;
    }

    saveQadaLedger(ledger) {
      ledger.updatedAt = new Date().toISOString();
      ledger.userId = this._userId;
      ledger.schemaVersion = ST.CURRENT_SCHEMA_VERSION;
      try {
        localStorage.setItem(this._getUserQadaKey(), JSON.stringify(ledger));
        this._qadaCache = JSON.parse(JSON.stringify(ledger));

        // Forward to Cloud Firestore if user is authenticated
        if (ST.firestoreAdapter && ST.firestoreAdapter.currentUser) {
          ST.firestoreAdapter.saveQadaLedger(ledger);
        }

        return true;
      } catch (e) {
        console.error('SalahTrack: Failed to save Qada ledger', e);
        return false;
      }
    }

    /**
     * Settings persistence
     */
    getSettings() {
      if (this._settingsCache) return this._settingsCache;
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        this._settingsCache = raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
      } catch (e) {
        this._settingsCache = Object.assign({}, DEFAULT_SETTINGS);
      }
      return this._settingsCache;
    }

    saveSettings(settings) {
      try {
        const updated = Object.assign({}, this.getSettings(), settings, {
          updatedAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        this._settingsCache = updated;
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Clears all local records & Qada ledger
     */
    clearAllData() {
      try {
        localStorage.removeItem(this._getUserRecordsKey());
        localStorage.removeItem(this._getUserQadaKey());
        localStorage.removeItem(STORAGE_KEYS.DEMO_FLAG);
        this._recordsCache = {};
        this._qadaCache = ST.createEmptyQadaLedger(this._userId);
        return true;
      } catch (e) {
        return false;
      }
    }

    /**
     * Restores records from imported backup with conflict resolution
     */
    importRecords(newRecordsMap) {
      if (!newRecordsMap || typeof newRecordsMap !== 'object') return false;
      const records = this.getAllRecords();
      let importedCount = 0;

      for (const [key, rawRec] of Object.entries(newRecordsMap)) {
        const validated = ST.migrateRecord(rawRec, this._userId);
        if (validated && ST.validateRecord(validated)) {
          // Conflict check: overwrite only if imported record is newer or not existing
          const local = records[key];
          if (!local || !local.updatedAt || new Date(validated.updatedAt) >= new Date(local.updatedAt)) {
            records[key] = validated;
            importedCount++;
          }
        }
      }

      try {
        localStorage.setItem(this._getUserRecordsKey(), JSON.stringify(records));
        this._recordsCache = records;
        return importedCount;
      } catch (e) {
        return false;
      }
    }

    isDemoDataLoaded() {
      return localStorage.getItem(STORAGE_KEYS.DEMO_FLAG) === 'true';
    }

    /**
     * Loads realistic 14-day dataset with clear demo identification
     */
    loadDemoDataset() {
      const today = new Date();
      const records = {};

      for (let i = 13; i >= 0; i--) {
        const d = ST.DateUtils.addDays(today, -i);
        const dateKey = ST.DateUtils.formatDateKey(d);
        const rec = ST.createEmptyRecord(dateKey, this._userId);

        rec.prayers.fajr = {
          prayerId: 'fajr',
          completed: i % 4 !== 1,
          status: i % 4 !== 1 ? (i % 2 === 0 ? ST.STATUS_TYPES.PRAYED : ST.STATUS_TYPES.JAMAAH) : ST.STATUS_TYPES.NONE,
          completedAt: new Date(d.setHours(5, 30)).toISOString(),
          updatedAt: new Date().toISOString()
        };

        rec.prayers.dhuhr = {
          prayerId: 'dhuhr',
          completed: true,
          status: i % 3 === 0 ? ST.STATUS_TYPES.JAMAAH : ST.STATUS_TYPES.PRAYED,
          completedAt: new Date(d.setHours(13, 0)).toISOString(),
          updatedAt: new Date().toISOString()
        };

        rec.prayers.asr = {
          prayerId: 'asr',
          completed: i !== 5,
          status: i !== 5 ? ST.STATUS_TYPES.PRAYED : ST.STATUS_TYPES.NONE,
          completedAt: new Date(d.setHours(16, 45)).toISOString(),
          updatedAt: new Date().toISOString()
        };

        rec.prayers.maghrib = {
          prayerId: 'maghrib',
          completed: true,
          status: ST.STATUS_TYPES.JAMAAH,
          completedAt: new Date(d.setHours(18, 20)).toISOString(),
          updatedAt: new Date().toISOString()
        };

        rec.prayers.isha = {
          prayerId: 'isha',
          completed: i !== 8,
          status: i !== 8 ? ST.STATUS_TYPES.PRAYED : ST.STATUS_TYPES.NONE,
          completedAt: new Date(d.setHours(20, 15)).toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (i === 0) {
          rec.note = "Read Surah Al-Kahf after Fajr. Felt serene presence in prayer today.";
        } else if (i === 7) {
          rec.note = "Attended Friday Jumu'ah prayer in congregation at the local mosque.";
        }

        records[dateKey] = rec;
      }

      localStorage.setItem(this._getUserRecordsKey(), JSON.stringify(records));
      localStorage.setItem(STORAGE_KEYS.DEMO_FLAG, 'true');
      this._recordsCache = records;
      return Object.keys(records).length;
    }
  }

  ST.storage = new LocalStorageAdapter();
})(window.SalahTrack);
