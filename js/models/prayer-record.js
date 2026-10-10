/**
 * SalahTrack — Daily Prayer Record Schema, Validation, Migrations & Qada Model
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  ST.CURRENT_SCHEMA_VERSION = 2;
  ST.DEFAULT_USER_ID = 'local-user';

  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

  /**
   * Factory for creating a pristine daily prayer record
   * Scoped to specific userId, local calendar date, and prayer keys
   */
  ST.createEmptyRecord = function(dateStr, userId = ST.DEFAULT_USER_ID) {
    if (!DATE_REGEX.test(dateStr)) {
      throw new Error(`Invalid local date key format: ${dateStr}. Expected YYYY-MM-DD.`);
    }

    const record = {
      schemaVersion: ST.CURRENT_SCHEMA_VERSION,
      userId: userId || ST.DEFAULT_USER_ID,
      date: dateStr,
      prayers: {},
      note: '',
      isExempt: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    for (const key of ST.PRAYER_KEYS) {
      record.prayers[key] = {
        prayerId: key,
        completed: false,
        status: ST.STATUS_TYPES.NONE, // Unrecorded prayers are neutral 'none'
        completedAt: null,
        updatedAt: record.createdAt
      };
    }

    return record;
  };

  /**
   * Factory for creating an empty Qada Ledger
   */
  ST.createEmptyQadaLedger = function(userId = ST.DEFAULT_USER_ID) {
    return {
      schemaVersion: ST.CURRENT_SCHEMA_VERSION,
      userId: userId || ST.DEFAULT_USER_ID,
      owed: {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0
      },
      totalFulfilled: 0,
      history: [],
      updatedAt: new Date().toISOString()
    };
  };

  /**
   * Rigorous Schema Validator
   */
  ST.validateRecord = function(record) {
    if (!record || typeof record !== 'object') return false;
    if (typeof record.date !== 'string' || !DATE_REGEX.test(record.date)) return false;
    if (!record.prayers || typeof record.prayers !== 'object') return false;

    // Validate all 5 prayers exist
    for (const key of ST.PRAYER_KEYS) {
      const p = record.prayers[key];
      if (!p || typeof p !== 'object') return false;
      if (typeof p.completed !== 'boolean') return false;
      if (typeof p.status !== 'string') return false;
    }

    return true;
  };

  /**
   * Migration Engine: Upgrades legacy records (v1) to current schema (v2)
   */
  ST.migrateRecord = function(rawRecord, userId = ST.DEFAULT_USER_ID) {
    if (!rawRecord || typeof rawRecord !== 'object') return null;

    const date = rawRecord.date;
    if (!date || !DATE_REGEX.test(date)) return null;

    const migrated = ST.createEmptyRecord(date, rawRecord.userId || userId);

    migrated.note = typeof rawRecord.note === 'string' ? rawRecord.note : '';
    migrated.isExempt = !!rawRecord.isExempt;
    migrated.createdAt = rawRecord.createdAt || rawRecord.updatedAt || new Date().toISOString();
    migrated.updatedAt = rawRecord.updatedAt || new Date().toISOString();

    if (rawRecord.prayers && typeof rawRecord.prayers === 'object') {
      for (const key of ST.PRAYER_KEYS) {
        const p = rawRecord.prayers[key];
        if (p) {
          const isCompleted = !!p.completed;
          let status = p.status || ST.STATUS_TYPES.NONE;

          // Map legacy status strings to canonical v2 statuses
          if (status === 'completed' || status === 'on_time') {
            status = ST.STATUS_TYPES.PRAYED;
          } else if (status === 'late') {
            status = ST.STATUS_TYPES.PRAYED_LATE;
          }

          migrated.prayers[key] = {
            prayerId: key,
            completed: isCompleted,
            status: status,
            completedAt: p.completedAt || (isCompleted ? migrated.updatedAt : null),
            updatedAt: p.updatedAt || migrated.updatedAt
          };
        }
      }
    }

    migrated.schemaVersion = ST.CURRENT_SCHEMA_VERSION;
    return migrated;
  };

})(window.SalahTrack);
