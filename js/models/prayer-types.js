/**
 * SalahTrack — Prayer Definitions & Status Constants
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  // 1. The Five Canonical Obligatory Prayers in Exact Sequence
  ST.PRAYER_KEYS = Object.freeze(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);

  ST.PRAYERS = Object.freeze({
    fajr: {
      id: 'fajr',
      nameEn: 'Fajr',
      nameAr: 'الفجر',
      period: 'Dawn',
      defaultOrder: 1,
      icon: 'dawn',
      rakaat: 2
    },
    dhuhr: {
      id: 'dhuhr',
      nameEn: 'Dhuhr',
      nameAr: 'الظهر',
      period: 'Midday',
      defaultOrder: 2,
      icon: 'sun',
      rakaat: 4
    },
    asr: {
      id: 'asr',
      nameEn: 'Asr',
      nameAr: 'العصر',
      period: 'Afternoon',
      defaultOrder: 3,
      icon: 'afternoon',
      rakaat: 4
    },
    maghrib: {
      id: 'maghrib',
      nameEn: 'Maghrib',
      nameAr: 'المغرب',
      period: 'Sunset',
      defaultOrder: 4,
      icon: 'sunset',
      rakaat: 3
    },
    isha: {
      id: 'isha',
      nameEn: 'Isha',
      nameAr: 'العشاء',
      period: 'Night',
      defaultOrder: 5,
      icon: 'moon',
      rakaat: 4
    }
  });

  // 2. Canonical Prayer Completion States
  // An unrecorded prayer is strictly 'none' and NEVER labeled "Missed"
  ST.STATUS_TYPES = Object.freeze({
    NONE: 'none',             // Not recorded (neutral, unpenalized)
    PRAYED: 'prayed',         // Prayed (fulfilled)
    PRAYED_LATE: 'prayed_late', // Prayed late (optional user distinction)
    JAMAAH: 'jamaah',         // In congregation (Jama'ah)
    EXCUSED: 'excused'        // Religiously exempt (Hayd/Illness)
  });

  ST.STATUS_LABELS = Object.freeze({
    none: 'Not Recorded',
    prayed: 'Prayed',
    prayed_late: 'Prayed Late',
    jamaah: 'In Jama’ah',
    excused: 'Excused'
  });

  // Helper check for whether a status counts as fulfilled
  ST.isPrayerFulfilled = function(status) {
    return status === ST.STATUS_TYPES.PRAYED ||
           status === ST.STATUS_TYPES.PRAYED_LATE ||
           status === ST.STATUS_TYPES.JAMAAH ||
           status === 'completed' || // Backward compatibility
           status === 'on_time';     // Backward compatibility
  };

})(window.SalahTrack);
