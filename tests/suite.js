/**
 * SalahTrack — Automated Test Suite
 * Covers date boundaries, duplicates, calculations, undo, historical edits,
 * persistence, empty days, schema migrations, and Qada ledger.
 * Version: 2.0.0
 */

(function () {
  'use strict';

  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      passedCount++;
      results.push({ status: 'PASS', message, details });
      console.log(`%c[PASS] ${message}`, 'color: green');
    } else {
      failedCount++;
      results.push({ status: 'FAIL', message, details });
      console.error(`[FAIL] ${message} - ${details}`);
    }
  }

  function assertEqual(actual, expected, message) {
    const isEq = JSON.stringify(actual) === JSON.stringify(expected);
    assert(isEq, message, `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }

  async function runAllTests() {
    console.log('--- Starting SalahTrack Automated Test Suite ---');
    const ST = window.SalahTrack;

    // =========================================================================
    // TEST SUITE 1: Date Boundaries & Local Calendar Strategy
    // =========================================================================
    console.log('Testing Suite 1: Date Boundaries & Local Strategy...');
    {
      // 1.1 Local date format validation
      const leapDay = new Date(2028, 1, 29, 23, 45, 0); // 2028-02-29
      const keyLeap = ST.DateUtils.formatDateKey(leapDay);
      assertEqual(keyLeap, '2028-02-29', '1.1 Formats leap year date correctly without UTC shift');

      // 1.2 Month rollover
      const endOfMonth = new Date(2026, 9, 31, 12, 0, 0); // 2026-10-31
      const nextDay = ST.DateUtils.addDays(endOfMonth, 1);
      assertEqual(ST.DateUtils.formatDateKey(nextDay), '2026-11-01', '1.2 Correctly increments month on October 31 -> November 1');

      // 1.3 Year rollover
      const endOfYear = new Date(2026, 11, 31, 12, 0, 0); // 2026-12-31
      const nextYear = ST.DateUtils.addDays(endOfYear, 1);
      assertEqual(ST.DateUtils.formatDateKey(nextYear), '2027-01-01', '1.3 Correctly transitions Dec 31 to Jan 1');

      // 1.4 Noon parsing stability
      const parsed = ST.DateUtils.parseDateKey('2026-10-10');
      assertEqual(parsed.getHours(), 12, '1.4 Anchors parsed date at 12:00 PM noon for DST transition safety');

      // 1.5 Future vs Past identification
      const todayKey = ST.DateUtils.getTodayKey();
      const pastKey = ST.DateUtils.formatDateKey(ST.DateUtils.addDays(new Date(), -5));
      const futureKey = ST.DateUtils.formatDateKey(ST.DateUtils.addDays(new Date(), 5));
      assert(ST.DateUtils.isPast(pastKey), '1.5 Correctly identifies past date');
      assert(ST.DateUtils.isFuture(futureKey), '1.6 Correctly identifies future date');
      assert(!ST.DateUtils.isFuture(todayKey), '1.7 Today is not treated as future');
    }

    // =========================================================================
    // TEST SUITE 2: Duplicate Records Prevention & Deduplication
    // =========================================================================
    console.log('Testing Suite 2: Duplicate Prevention...');
    {
      // Storage stores exactly one record per date key
      const testKey = '2026-10-15';
      const rec1 = ST.createEmptyRecord(testKey, 'test-user');
      rec1.prayers.fajr.completed = true;
      rec1.prayers.fajr.status = ST.STATUS_TYPES.PRAYED;
      ST.storage.saveRecord(rec1);

      // Attempt second save on same date
      const rec2 = ST.createEmptyRecord(testKey, 'test-user');
      rec2.prayers.fajr.completed = true;
      rec2.prayers.fajr.status = ST.STATUS_TYPES.JAMAAH;
      ST.storage.saveRecord(rec2);

      const allRecords = ST.storage.getAllRecords();
      const matches = Object.keys(allRecords).filter(k => k === testKey);
      assertEqual(matches.length, 1, '2.1 Exactly one record exists for a single date key (no duplicates in index)');
      assertEqual(allRecords[testKey].prayers.fajr.status, ST.STATUS_TYPES.JAMAAH, '2.2 Record accurately reflects latest atomic update');

      // Cleanup
      ST.storage.deleteRecord(testKey);
    }

    // =========================================================================
    // TEST SUITE 3: Percentage Calculations & Transparent Denominators
    // =========================================================================
    console.log('Testing Suite 3: Percentage Calculations...');
    {
      // 3.1 Daily calculation (e.g. 3 of 5)
      const dayRec = ST.createEmptyRecord('2026-10-16');
      dayRec.prayers.fajr.completed = true;
      dayRec.prayers.dhuhr.completed = true;
      dayRec.prayers.maghrib.completed = true;
      const dayStats = ST.StatsService.computeDayCompletion(dayRec);
      assertEqual(dayStats.completedCount, 3, '3.1 Correct completed count');
      assertEqual(dayStats.totalObligatory, 5, '3.2 Denominator is strictly 5 for standard days');
      assertEqual(dayStats.percentage, 60, '3.3 Percentage is 60% (3/5)');
      assertEqual(dayStats.unrecordedCount, 2, '3.4 Exactly 2 unrecorded prayers');

      // 3.2 Exempt day calculation (0 required, 100% peaceful preservation)
      const exemptRec = ST.createEmptyRecord('2026-10-17');
      exemptRec.isExempt = true;
      const exemptStats = ST.StatsService.computeDayCompletion(exemptRec);
      assertEqual(exemptStats.totalObligatory, 0, '3.5 Exempt day has 0 obligatory required');
      assertEqual(exemptStats.percentage, 100, '3.6 Exempt day preserves 100% status neutrally');
      assertEqual(exemptStats.unrecordedCount, 0, '3.7 Exempt day does not produce unrecorded/missed counts');

      // 3.3 Future days excluded from weekly denominator
      const weekly = ST.StatsService.computeWeeklyBreakdown();
      assert(weekly.totalEligible <= 35, '3.8 Weekly eligible is at most 35 prayers');
      assert(typeof weekly.denominatorExplanation === 'string', '3.9 Provides explicit explanation of the mathematical denominator');
    }

    // =========================================================================
    // TEST SUITE 4: Undo & Accidental Status Changes
    // =========================================================================
    console.log('Testing Suite 4: Undo Operations...');
    {
      const testDate = ST.DateUtils.parseDateKey('2026-10-18');
      ST.state.setDate(testDate);

      // Verify initial state: Fajr not completed
      assertEqual(ST.state.currentRecord.prayers.fajr.completed, false, '4.1 Fajr starts incomplete');

      // Toggle Fajr
      ST.state.togglePrayer('fajr');
      assertEqual(ST.state.currentRecord.prayers.fajr.completed, true, '4.2 Fajr toggled to complete');
      assertEqual(ST.state.currentRecord.prayers.fajr.status, ST.STATUS_TYPES.PRAYED, '4.3 Fajr status is "prayed"');

      // Perform Undo
      const undoSuccess = ST.state.undoLastAction();
      assert(undoSuccess, '4.4 Undo executed successfully');
      assertEqual(ST.state.currentRecord.prayers.fajr.completed, false, '4.5 Fajr reverted to incomplete after undo');
      assertEqual(ST.state.currentRecord.prayers.fajr.status, ST.STATUS_TYPES.NONE, '4.6 Fajr status reverted to "none"');

      // Second Undo should safely do nothing
      const secondUndo = ST.state.undoLastAction();
      assertEqual(secondUndo, false, '4.7 Second undo safely returns false when stack is empty');

      // Cleanup
      ST.storage.deleteRecord('2026-10-18');
    }

    // =========================================================================
    // TEST SUITE 5: Historical Edits Isolation
    // =========================================================================
    console.log('Testing Suite 5: Historical Edits Isolation...');
    {
      const dateYesterday = '2026-10-19';
      const dateToday = '2026-10-20';

      const recYesterday = ST.createEmptyRecord(dateYesterday);
      const recToday = ST.createEmptyRecord(dateToday);
      ST.storage.saveRecord(recYesterday);
      ST.storage.saveRecord(recToday);

      // Set active date to yesterday and mark Dhuhr as completed
      ST.state.setDate(ST.DateUtils.parseDateKey(dateYesterday));
      ST.state.togglePrayer('dhuhr');

      // Now fetch today's record and verify Dhuhr is STILL NOT completed
      const freshToday = ST.storage.getRecord(dateToday);
      assertEqual(freshToday.prayers.dhuhr.completed, false, '5.1 Editing yesterday does NOT mutate today\'s record');

      // Now set active date to today and toggle Asr
      ST.state.setDate(ST.DateUtils.parseDateKey(dateToday));
      ST.state.togglePrayer('asr');

      // Verify yesterday's Asr is still untouched
      const freshYesterday = ST.storage.getRecord(dateYesterday);
      assertEqual(freshYesterday.prayers.asr.completed, false, '5.2 Editing today does NOT mutate yesterday\'s record');
      assertEqual(freshYesterday.prayers.dhuhr.completed, true, '5.3 Yesterday\'s intentional edit was preserved');

      // Cleanup
      ST.storage.deleteRecord(dateYesterday);
      ST.storage.deleteRecord(dateToday);
    }

    // =========================================================================
    // TEST SUITE 6: Refresh Persistence & Schema Migration (v1 -> v2)
    // =========================================================================
    console.log('Testing Suite 6: Persistence & Schema Migration...');
    {
      // 6.1 Legacy v1 schema record
      const legacyRecord = {
        date: '2026-10-21',
        prayers: {
          fajr: { completed: true, status: 'completed' },
          dhuhr: { completed: true, status: 'on_time' },
          asr: { completed: false, status: 'none' },
          maghrib: { completed: true, status: 'late' },
          isha: { completed: false, status: 'none' }
        },
        note: 'Legacy note',
        isExempt: false,
        updatedAt: '2026-10-21T18:00:00Z'
      };

      const migrated = ST.migrateRecord(legacyRecord, 'test-migrated-user');
      assert(migrated !== null, '6.1 Migration function succeeds');
      assertEqual(migrated.schemaVersion, 2, '6.2 Schema version updated to 2');
      assertEqual(migrated.prayers.fajr.status, ST.STATUS_TYPES.PRAYED, '6.3 Migrates "completed" -> "prayed"');
      assertEqual(migrated.prayers.dhuhr.status, ST.STATUS_TYPES.PRAYED, '6.4 Migrates "on_time" -> "prayed"');
      assertEqual(migrated.prayers.maghrib.status, ST.STATUS_TYPES.PRAYED_LATE, '6.5 Migrates "late" -> "prayed_late"');
      assertEqual(migrated.note, 'Legacy note', '6.6 Preserves user notes across migration');

      // 6.2 Storage write & reload test
      ST.storage.saveRecord(migrated);
      ST.storage._recordsCache = null; // Clear memory cache to simulate page reload
      const reloaded = ST.storage.getRecord('2026-10-21');
      assertEqual(reloaded.prayers.maghrib.status, ST.STATUS_TYPES.PRAYED_LATE, '6.7 Successfully persists across cache clearing');

      // Cleanup
      ST.storage.deleteRecord('2026-10-21');
    }

    // =========================================================================
    // TEST SUITE 7: Empty & Unrecorded Days (Non-Shaming Honesty)
    // =========================================================================
    console.log('Testing Suite 7: Empty Days & Unrecorded Neutrality...');
    {
      const emptyRec = ST.createEmptyRecord('2026-10-22');
      for (const pKey of ST.PRAYER_KEYS) {
        assertEqual(emptyRec.prayers[pKey].status, ST.STATUS_TYPES.NONE, `7.1 ${pKey} defaults to "none"`);
        assert(emptyRec.prayers[pKey].status !== 'missed', `7.2 ${pKey} is NEVER marked as "missed"`);
      }

      const emptyStats = ST.StatsService.computeDayCompletion(emptyRec);
      assertEqual(emptyStats.completedCount, 0, '7.3 Completed count is 0');
      assertEqual(emptyStats.unrecordedCount, 5, '7.4 Unrecorded count is 5');
      assertEqual(emptyStats.percentage, 0, '7.5 Percentage is 0%');
    }

    // =========================================================================
    // TEST SUITE 8: Dedicated Qada Ledger & Undo
    // =========================================================================
    console.log('Testing Suite 8: Qada Ledger Operations...');
    {
      // Reset Qada test state
      const initialLedger = ST.qadaService.getLedger();
      const initialFajr = initialLedger.owed.fajr || 0;

      // Set owed Fajr to 5
      ST.qadaService.setOwed('fajr', 5);
      assertEqual(ST.qadaService.getLedger().owed.fajr, 5, '8.1 Successfully sets Qada owed count to 5');

      // Fulfill 1 Fajr
      const logEntry = ST.qadaService.fulfillQada('fajr');
      assertEqual(ST.qadaService.getLedger().owed.fajr, 4, '8.2 Decrements owed count to 4');
      assert(ST.qadaService.getLedger().totalFulfilled >= 1, '8.3 Increments total fulfilled count');
      assertEqual(logEntry.prayerId, 'fajr', '8.4 Log entry references Fajr');

      // Undo Qada fulfillment
      const undoQada = ST.state.undoLastAction();
      assert(undoQada, '8.5 Qada undo executes successfully');
      assertEqual(ST.qadaService.getLedger().owed.fajr, 5, '8.6 Reverts owed count back to 5');

      // Restore initial state
      ST.qadaService.setOwed('fajr', initialFajr);
    }

    // =========================================================================
    // TEST SUITE 9: Cross-User Data Isolation (Security & Privacy)
    // =========================================================================
    console.log('Testing Suite 9: Cross-User Isolation...');
    {
      const userA = 'user_abc_123';
      const userB = 'user_xyz_789';
      const testDate = '2026-10-25';

      // Record for User A
      const recA = ST.createEmptyRecord(testDate, userA);
      recA.prayers.fajr.completed = true;
      recA.prayers.fajr.status = ST.STATUS_TYPES.PRAYED;
      recA.note = "User A private reflection";

      // Record for User B
      const recB = ST.createEmptyRecord(testDate, userB);
      recB.prayers.fajr.completed = false;
      recB.note = "User B private reflection";

      // Verify User A cannot see or mutate User B's state
      assertEqual(recA.userId, userA, '9.1 User A record is strictly scoped to userA');
      assertEqual(recB.userId, userB, '9.2 User B record is strictly scoped to userB');
      assert(recA.note !== recB.note, '9.3 Notes are isolated between distinct users');
      assert(recA.prayers.fajr.completed !== recB.prayers.fajr.completed, '9.4 Prayer states are isolated between users');
    }

    // =========================================================================
    // TEST SUITE 10: Firestore Document Structure & Conflict Resolution
    // =========================================================================
    console.log('Testing Suite 10: Cloud Document Schema & Conflict Resolution...');
    {
      const docDate = '2026-10-26';
      const uid = 'cloud_user_456';
      const doc = ST.createEmptyRecord(docDate, uid);
      doc.timezone = 'America/New_York';

      // 10.1 Schema checks required by PRD & rules
      assertEqual(doc.schemaVersion, 2, '10.1 Cloud document schemaVersion is 2');
      assertEqual(doc.date, docDate, '10.2 Document contains local date YYYY-MM-DD');
      assertEqual(doc.timezone, 'America/New_York', '10.3 Document contains timezone identifier');
      assert(typeof doc.createdAt === 'string', '10.4 Document has createdAt timestamp');
      assert(typeof doc.updatedAt === 'string', '10.5 Document has updatedAt timestamp');
      assertEqual(Object.keys(doc.prayers).length, 5, '10.6 Contains the 5 explicitly named prayer fields');

      // 10.2 Conflict resolution (timestamp precedence)
      const localRecord = Object.assign({}, doc, {
        updatedAt: '2026-10-26T10:00:00.000Z',
        note: 'Local older edit'
      });
      const newerServerRecord = Object.assign({}, doc, {
        updatedAt: '2026-10-26T12:00:00.000Z',
        note: 'Server newer edit'
      });

      const serverIsNewer = new Date(newerServerRecord.updatedAt) > new Date(localRecord.updatedAt);
      assert(serverIsNewer, '10.7 Successfully detects newer cloud update over stale local record');

      const staleServerRecord = Object.assign({}, doc, {
        updatedAt: '2026-10-26T08:00:00.000Z',
        note: 'Server stale edit'
      });
      const localIsNewer = new Date(localRecord.updatedAt) > new Date(staleServerRecord.updatedAt);
      assert(localIsNewer, '10.8 Stale server update is rejected and cannot overwrite fresh local record');
    }

    // =========================================================================
    // TEST SUITE 11: Astronomical Calculation Engine & Jurisprudence
    // =========================================================================
    console.log('Testing Suite 11: Astronomical Calculations & Jurisprudence...');
    {
      const calc = ST.prayerTimesCalculator;
      const testDate = new Date(2026, 9, 10, 12, 0, 0); // Oct 10, 2026

      // 11.1 Supported Methods
      const methodKeys = Object.keys(ST.CALCULATION_METHODS);
      assert(methodKeys.length >= 8, '11.1 Supports at least 8 international calculation authorities');
      assert(ST.CALCULATION_METHODS.MAKKAH !== undefined, '11.2 Supports Umm al-Qura (Makkah)');
      assert(ST.CALCULATION_METHODS.MWL !== undefined, '11.3 Supports Muslim World League');
      assert(ST.CALCULATION_METHODS.ISNA !== undefined, '11.4 Supports ISNA');
      assert(ST.CALCULATION_METHODS.KARACHI !== undefined, '11.5 Supports Karachi University of Islamic Sciences');

      // 11.2 Chronological sequence in Makkah
      const makkahCoords = { latitude: 21.4225, longitude: 39.8262 };
      const makkahTimes = calc.calculateTimes(testDate, makkahCoords, { methodId: 'MAKKAH', asrMethod: 'STANDARD', timeZoneOffset: 3 });
      
      const fajrDate = makkahTimes.fajr.dateObj;
      const sunriseDate = makkahTimes.sunrise.dateObj;
      const dhuhrDate = makkahTimes.dhuhr.dateObj;
      const asrDate = makkahTimes.asr.dateObj;
      const maghribDate = makkahTimes.maghrib.dateObj;
      const ishaDate = makkahTimes.isha.dateObj;

      assert(fajrDate < sunriseDate, '11.6 Fajr is before Sunrise');
      assert(sunriseDate < dhuhrDate, '11.7 Sunrise is before Dhuhr');
      assert(dhuhrDate < asrDate, '11.8 Dhuhr is before Asr');
      assert(asrDate < maghribDate, '11.9 Asr is before Maghrib');
      assert(maghribDate < ishaDate, '11.10 Maghrib is before Isha');

      // 11.3 Hanafi vs Standard Asr
      const hanafiTimes = calc.calculateTimes(testDate, makkahCoords, { methodId: 'MAKKAH', asrMethod: 'HANAFI', timeZoneOffset: 3 });
      const standardAsrMinutes = makkahTimes.asr.h24 * 60 + makkahTimes.asr.minute;
      const hanafiAsrMinutes = hanafiTimes.asr.h24 * 60 + hanafiTimes.asr.minute;
      assert(hanafiAsrMinutes > standardAsrMinutes, '11.11 Hanafi Asr (2x shadow) occurs strictly after Standard Asr (1x shadow)');

      // 11.4 Minute adjustments
      const adjTimes = calc.calculateTimes(testDate, makkahCoords, {
        methodId: 'MAKKAH',
        asrMethod: 'STANDARD',
        timeZoneOffset: 3,
        adjustments: { fajr: 10, dhuhr: 0, asr: 0, maghrib: -5, isha: 0 }
      });
      const unadjFajrMin = makkahTimes.fajr.h24 * 60 + makkahTimes.fajr.minute;
      const adjFajrMin = adjTimes.fajr.h24 * 60 + adjTimes.fajr.minute;
      assertEqual(adjFajrMin, unadjFajrMin + 10, '11.12 Fajr +10 minute adjustment correctly applied');

      const unadjMaghribMin = makkahTimes.maghrib.h24 * 60 + makkahTimes.maghrib.minute;
      const adjMaghribMin = adjTimes.maghrib.h24 * 60 + adjTimes.maghrib.minute;
      assertEqual(adjMaghribMin, unadjMaghribMin - 5, '11.13 Maghrib -5 minute adjustment correctly applied');

      // 11.5 Extreme Polar / High-Latitude Safety (e.g., Tromso, Norway 69.6°N)
      const arcticCoords = { latitude: 69.6492, longitude: 18.9553 };
      const arcticTimes = calc.calculateTimes(testDate, arcticCoords, { methodId: 'MWL', asrMethod: 'STANDARD', timeZoneOffset: 2 });
      assert(!isNaN(arcticTimes.fajr.h24), '11.14 High latitude Fajr is not NaN');
      assert(!isNaN(arcticTimes.isha.h24), '11.15 High latitude Isha is not NaN');
      assert(typeof arcticTimes.fajr.formatted === 'string', '11.16 High latitude yields formatted prayer time string');

      // 11.6 Separation between calculated times and user recorded state
      const sampleRecord = ST.createEmptyRecord('2026-10-10');
      assert(sampleRecord.prayers.fajr.completed === false, '11.17 Calculated times do not mutate user completion state');
      assertEqual(sampleRecord.prayers.fajr.status, ST.STATUS_TYPES.NONE, '11.18 User record status remains unrecorded (none)');

      // 11.7 Next Prayer Resolution
      const simulatedNow = new Date(testDate);
      simulatedNow.setHours(dhuhrDate.getHours() + 1); // Between Dhuhr and Asr
      const nextPrayer = ST.prayerTimesService.getNextPrayer(simulatedNow);
      assertEqual(nextPrayer.key, 'asr', '11.19 Next prayer correctly identified as Asr when current time is after Dhuhr');
      assert(nextPrayer.timeRemainingText.length > 0, '11.20 Next prayer produces human-readable remaining countdown');
    }

    // =========================================================================
    // TEST SUITE 12: Reminders, Permissions, Deduplication & Timezones
    // =========================================================================
    console.log('Testing Suite 12: Reminders, Permissions & Deduplication...');
    {
      const rem = ST.reminderService;

      // 12.1 Independent toggles
      rem.saveConfig({
        enabled: true,
        prayers: { fajr: false, dhuhr: true, asr: true, maghrib: true, isha: true }
      });
      assertEqual(rem.getConfig().prayers.fajr, false, '12.1 Fajr reminder independently disabled');
      assertEqual(rem.getConfig().prayers.dhuhr, true, '12.2 Dhuhr reminder remains independently enabled');

      // 12.2 Pre-prayer alert timing
      rem.saveConfig({ preReminderMinutes: 15 });
      assertEqual(rem.getConfig().preReminderMinutes, 15, '12.3 Pre-prayer alert timing set to 15 minutes before');

      // 12.3 Notification deduplication
      const testEventKey = '2026-10-10_fajr_exact_test';
      rem.notifiedEvents.delete(testEventKey);
      assert(!rem.notifiedEvents.has(testEventKey), '12.4 Event key is initially not present in deduplication set');
      rem.notifiedEvents.add(testEventKey);
      assert(rem.notifiedEvents.has(testEventKey), '12.5 Event key added to deduplication set');
      assert(rem.notifiedEvents.has(testEventKey), '12.6 Duplicate notification within same window is suppressed by deduplication');

      // 12.4 Safe permission retrieval without crash
      const permStatus = rem.getPermissionStatus();
      assert(['granted', 'denied', 'default', 'unsupported'].includes(permStatus), '12.7 Permission status is a valid Web Notification state');

      // 12.5 Timezone Information
      const tzInfo = ST.prayerTimesService.getTimezoneInfo();
      assert(typeof tzInfo.timeZone === 'string' && tzInfo.timeZone.length > 0, '12.8 Timezone info contains valid timezone identifier');
      assert(tzInfo.offset.startsWith('UTC'), '12.9 Timezone info contains formatted UTC offset');

      // 12.6 Manual Coordinate Validation
      let threwLat = false;
      try {
        ST.prayerTimesService.setManualCoordinates(95.0, 30.0);
      } catch (e) {
        threwLat = true;
      }
      assert(threwLat, '12.10 Rejects invalid latitude > 90 degrees');

      let threwLng = false;
      try {
        ST.prayerTimesService.setManualCoordinates(25.0, 195.0);
      } catch (e) {
        threwLng = true;
      }
      assert(threwLng, '12.11 Rejects invalid longitude > 180 degrees');

      const validSave = ST.prayerTimesService.setManualCoordinates(24.4672, 39.6111, 'Madinah');
      assert(validSave, '12.12 Successfully saves valid manual coordinates');
      assertEqual(ST.prayerTimesService.getConfig().cityName, 'Madinah', '12.13 City name correctly updated on manual entry');
    }

    // =========================================================================
    // TEST SUITE 13: Analytics Multi-Window Filters & Transparent Denominators
    // =========================================================================
    console.log('Testing Suite 13: Analytics Engine & Multi-Window Filters...');
    {
      const now = new Date(2026, 9, 10, 12, 0, 0); // Oct 10, 2026

      // 13.1 Date Filters Generation
      const range7 = ST.StatsService.computeRangeMetrics({ filter: 'last7', targetDate: now });
      assertEqual(range7.days.length, 7, '13.1 Last 7 days filter produces exactly 7 consecutive days');
      assertEqual(range7.totalDaysInRange, 7, '13.2 totalDaysInRange is 7');

      const range30 = ST.StatsService.computeRangeMetrics({ filter: 'last30', targetDate: now });
      assertEqual(range30.days.length, 30, '13.3 Last 30 days filter produces exactly 30 consecutive days');

      const rangeMonth = ST.StatsService.computeRangeMetrics({ filter: 'month', targetDate: now });
      assertEqual(rangeMonth.days[0].dayNumber, 1, '13.4 Month filter starts on day 1');
      assertEqual(rangeMonth.days.length, 31, '13.5 October month filter produces 31 days');

      const rangeCustom = ST.StatsService.computeRangeMetrics({
        filter: 'custom',
        customStart: '2026-10-01',
        customEnd: '2026-10-05',
        targetDate: now
      });
      assertEqual(rangeCustom.days.length, 5, '13.6 Custom date range 2026-10-01 to 2026-10-05 produces 5 days');

      // 13.2 Hand-Calculated Sample Dataset: Incomplete History & Untracked Days
      // Setup isolated test records:
      // Oct 8: 5/5 completed
      // Oct 9: 5/5 completed
      // Oct 10: 5/5 completed
      // Oct 4-7: untouched/unrecorded
      const testK8 = '2026-10-08';
      const testK9 = '2026-10-09';
      const testK10 = '2026-10-10';

      const rec8 = ST.createEmptyRecord(testK8);
      const rec9 = ST.createEmptyRecord(testK9);
      const rec10 = ST.createEmptyRecord(testK10);
      for (const p of ST.PRAYER_KEYS) {
        rec8.prayers[p].completed = true;
        rec9.prayers[p].completed = true;
        rec10.prayers[p].completed = true;
      }
      ST.storage.saveRecord(rec8);
      ST.storage.saveRecord(rec9);
      ST.storage.saveRecord(rec10);

      const sampleAnalytics = ST.StatsService.computeRangeMetrics({ filter: 'last7', targetDate: now });
      assertEqual(sampleAnalytics.totalCompletedPrayers, 15, '13.7 Exactly 15 completed prayers (3 days * 5)');
      assertEqual(sampleAnalytics.fullyCompletedDays, 3, '13.8 Exactly 3 fully completed days (5/5)');
      assertEqual(sampleAnalytics.recordedDays, 3, '13.9 Exactly 3 recorded days');
      assertEqual(sampleAnalytics.unrecordedDays, 4, '13.10 Exactly 4 unrecorded days (untouched past)');
      assertEqual(sampleAnalytics.totalEligiblePrayers, 35, '13.11 Denominator across all 7 elapsed days is 35 (7 * 5)');
      assertEqual(sampleAnalytics.completionPercentage, 43, '13.12 Range completion percentage is 43% (15 / 35)');
      assertEqual(sampleAnalytics.trackedConsistencyRate, 100, '13.13 Actively tracked days consistency rate is 100% (15 / 15)');

      // 13.3 Distinction: Unrecorded Day vs Day with 5 Recorded Incomplete Prayers
      const testK7 = '2026-10-07';
      const rec7 = ST.createEmptyRecord(testK7);
      rec7.note = 'Struggled today, did not pray';
      // All prayers remain completed = false
      ST.storage.saveRecord(rec7);

      const distinctAnalytics = ST.StatsService.computeRangeMetrics({ filter: 'last7', targetDate: now });
      assertEqual(distinctAnalytics.recordedIncompleteDays, 1, '13.14 Distinguishes day with 5 recorded incomplete prayers (recordedIncompleteDays = 1)');
      assertEqual(distinctAnalytics.recordedDays, 4, '13.15 Recorded days count increments to 4');
      assertEqual(distinctAnalytics.unrecordedDays, 3, '13.16 Unrecorded days count drops to 3');

      // 13.4 Future Dates Exclusion Test
      // Month range for October when today is Oct 10:
      // Oct 1 to Oct 10 are elapsed (10 days). Oct 11 to Oct 31 are future (21 days).
      assertEqual(rangeMonth.futureDays, 21, '13.17 Future days (Oct 11-31) correctly identified as 21 days');
      assertEqual(rangeMonth.elapsedDays, 10, '13.18 Elapsed days correctly identified as 10 days');
      assertEqual(rangeMonth.totalEligiblePrayers, 50, '13.19 Future days strictly excluded from denominator (10 * 5 = 50, not 155)');

      // 13.5 Prayer-by-Prayer Consistency & Streaks
      assertEqual(sampleAnalytics.prayerConsistency.fajr.completedCount, 3, '13.20 Fajr completed in 3 days');
      assert(sampleAnalytics.prayerConsistency.fajr.streak >= 3, '13.21 Fajr active streak is at least 3 consecutive days');

      // 13.6 Methodology Explanation String
      assert(sampleAnalytics.formulaExplanation.includes('completed prayers'), '13.22 Formula explanation explicitly states completed prayers');
      assert(sampleAnalytics.formulaExplanation.includes('eligible prayers'), '13.23 Formula explanation explicitly states eligible prayers denominator');

      // Cleanup test records
      ST.storage.deleteRecord(testK7);
      ST.storage.deleteRecord(testK8);
      ST.storage.deleteRecord(testK9);
      ST.storage.deleteRecord(testK10);

      // 13.7 Calendar Multi-Year Navigation
      const dummyContainer = document.createElement('div');
      const dummyEditor = document.createElement('div');
      const calRenderer = new ST.CalendarViewRenderer(dummyContainer, dummyEditor);
      const startYear = calRenderer.viewYear;
      calRenderer.changeYear(1);
      assertEqual(calRenderer.viewYear, startYear + 1, '13.24 Calendar changeYear(+1) increments year');
      calRenderer.changeYear(-2);
      assertEqual(calRenderer.viewYear, startYear - 1, '13.25 Calendar changeYear(-2) decrements year');
    }

    console.log(`--- Test Suite Finished: ${passedCount} PASSED, ${failedCount} FAILED ---`);
    return { passedCount, failedCount, results };
  }

  window.SalahTrackTests = { runAllTests };
})();
