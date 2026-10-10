/**
 * SalahTrack — Export & Import Service
 * Data sovereignty: Full JSON & CSV exports, safe JSON restoration
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const ExportService = {
    exportJSON() {
      const records = ST.storage.getAllRecords();
      const settings = ST.storage.getSettings();
      const payload = {
        app: 'SalahTrack',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings,
        records
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salahtrack_backup_${ST.DateUtils.formatDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    exportCSV() {
      const records = ST.storage.getAllRecords();
      const sortedKeys = Object.keys(records).sort();

      const headers = ['Date', 'Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'IsExempt', 'Notes', 'UpdatedAt'];
      const rows = [headers];

      for (const dateKey of sortedKeys) {
        const rec = records[dateKey];
        rows.push([
          rec.date,
          rec.prayers?.fajr?.completed ? (rec.prayers?.fajr?.status || 'Yes') : 'No',
          rec.prayers?.dhuhr?.completed ? (rec.prayers?.dhuhr?.status || 'Yes') : 'No',
          rec.prayers?.asr?.completed ? (rec.prayers?.asr?.status || 'Yes') : 'No',
          rec.prayers?.maghrib?.completed ? (rec.prayers?.maghrib?.status || 'Yes') : 'No',
          rec.prayers?.isha?.completed ? (rec.prayers?.isha?.status || 'Yes') : 'No',
          rec.isExempt ? 'Yes' : 'No',
          `"${(rec.note || '').replace(/"/g, '""')}"`,
          rec.updatedAt || ''
        ]);
      }

      const csvContent = rows.map(r => r.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salahtrack_records_${ST.DateUtils.formatDateKey(new Date())}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    async importJSON(file) {
      return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file selected'));
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            let importedRecords = null;

            if (data.records && typeof data.records === 'object') {
              importedRecords = data.records;
            } else if (typeof data === 'object') {
              // Plain records dictionary
              importedRecords = data;
            }

            if (!importedRecords) {
              return reject(new Error('Unrecognized JSON format. Could not find prayer records.'));
            }

            const count = ST.storage.importRecords(importedRecords);
            if (count === false || count === 0) {
              return reject(new Error('No valid prayer records found in file.'));
            }

            // Restore settings if present
            if (data.settings && typeof data.settings === 'object') {
              ST.storage.saveSettings(data.settings);
            }

            resolve(count);
          } catch (err) {
            reject(new Error('Invalid JSON file format: ' + err.message));
          }
        };

        reader.onerror = () => reject(new Error('Error reading file from disk.'));
        reader.readAsText(file);
      });
    }
  };

  ST.ExportService = ExportService;
})(window.SalahTrack);
