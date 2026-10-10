/**
 * SalahTrack — Prayer Card Component
 * Clearly displays calculated prayer times while keeping user-recorded state distinct.
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class PrayerCardRenderer {
    constructor(containerEl) {
      this.container = containerEl;
    }

    render(record, allowDetailedStatus = true) {
      if (!this.container) return;
      this.container.innerHTML = '';

      if (record.isExempt) {
        const exemptNotice = document.createElement('div');
        exemptNotice.className = 'callout-box';
        exemptNotice.style.margin = '0 0 16px 0';
        exemptNotice.innerHTML = `
          <div class="callout-icon">${ST.DOM.getIcon('info')}</div>
          <div class="callout-content">
            <strong>Religiously Exempt Day (Hayd / Illness):</strong> This day is recognized as exempt. Unrecorded prayers are never penalized in your consistency records.
          </div>
        `;
        this.container.appendChild(exemptNotice);
      }

      // Compute calculated prayer times for this record's local date
      const recordDate = ST.DateUtils.parseDateKey(record.date);
      const calculatedTimes = ST.prayerTimesService ? ST.prayerTimesService.getTimes(recordDate) : null;

      for (const pKey of ST.PRAYER_KEYS) {
        const config = ST.PRAYERS[pKey];
        const prayerData = record.prayers[pKey] || { completed: false, status: ST.STATUS_TYPES.NONE };
        const isCompleted = ST.isPrayerFulfilled(prayerData.status);
        const timeSlot = calculatedTimes ? calculatedTimes[pKey] : null;

        const card = document.createElement('div');
        card.className = `prayer-card ${isCompleted ? 'is-completed' : ''} ${prayerData.status === 'excused' ? 'is-excused' : ''}`;
        card.id = `prayer-card-${pKey}`;

        // Left Section
        const leftDiv = document.createElement('div');
        leftDiv.className = 'prayer-card-left';

        const iconPill = document.createElement('div');
        iconPill.className = 'prayer-icon-pill';
        iconPill.innerHTML = ST.DOM.getIcon(config.icon);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'prayer-card-info';

        const namesRow = document.createElement('div');
        namesRow.className = 'prayer-names-row';

        const nameEn = document.createElement('span');
        nameEn.className = 'prayer-name-en';
        nameEn.textContent = config.nameEn;

        const nameAr = document.createElement('span');
        nameAr.className = 'prayer-name-ar';
        nameAr.textContent = config.nameAr;

        namesRow.appendChild(nameEn);
        namesRow.appendChild(nameAr);

        // Meta & Timings Row
        const metaRow = document.createElement('div');
        metaRow.className = 'prayer-meta-row';

        // 1. Calculated Prayer Time Chip (Clearly distinguished from recorded state)
        if (timeSlot) {
          const timeChip = document.createElement('span');
          timeChip.style.fontSize = 'var(--text-xs)';
          timeChip.style.fontWeight = '600';
          timeChip.style.color = 'var(--color-text-primary)';
          timeChip.style.backgroundColor = 'var(--color-bg-subtle)';
          timeChip.style.border = '1px solid var(--color-border)';
          timeChip.style.padding = '2px 8px';
          timeChip.style.borderRadius = 'var(--radius-sm)';
          timeChip.title = `Calculated prayer time for ${config.nameEn} based on celestial calculations`;
          timeChip.innerHTML = `<span style="color:var(--color-accent-gold); margin-right:4px;">⏱</span>${timeSlot.formatted}`;
          metaRow.appendChild(timeChip);
        }

        const periodSpan = document.createElement('span');
        periodSpan.style.fontSize = 'var(--text-xs)';
        periodSpan.style.color = 'var(--color-text-muted)';
        periodSpan.textContent = `${config.period} • ${config.rakaat} Raka'at`;
        metaRow.appendChild(periodSpan);

        // 2. Status Chip (User-recorded state)
        const statusLabel = ST.STATUS_LABELS[prayerData.status] || (isCompleted ? 'Prayed' : 'Not Recorded');
        const statusChip = document.createElement('button');
        statusChip.className = 'prayer-status-chip';
        statusChip.textContent = statusLabel;
        statusChip.title = allowDetailedStatus ? 'Click to select specific prayer status' : 'Status';
        statusChip.setAttribute('aria-label', `Change status for ${config.nameEn}. Current: ${statusLabel}`);

        if (allowDetailedStatus) {
          statusChip.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openStatusSelector(pKey, prayerData.status);
          });
        }
        metaRow.appendChild(statusChip);

        infoDiv.appendChild(namesRow);
        infoDiv.appendChild(metaRow);

        leftDiv.appendChild(iconPill);
        leftDiv.appendChild(infoDiv);

        // Right Section: Fast 1-Tap Toggle Button
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'prayer-toggle-btn';
        toggleBtn.setAttribute('aria-label', `Mark ${config.nameEn} as ${isCompleted ? 'unrecorded' : 'prayed'}`);
        toggleBtn.innerHTML = ST.DOM.getIcon('check');

        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          ST.state.togglePrayer(pKey);

          const actionMsg = !isCompleted ? `${config.nameEn} marked as prayed` : `${config.nameEn} reverted to not recorded`;
          ST.DOM.showToast(actionMsg, 'Undo', () => {
            ST.state.undoLastAction();
          });
        });

        card.appendChild(leftDiv);
        card.appendChild(toggleBtn);
        this.container.appendChild(card);
      }
    }

    openStatusSelector(prayerKey, currentStatus) {
      const config = ST.PRAYERS[prayerKey];
      const modal = document.getElementById('status-modal');
      if (!modal) return;

      const titleEl = modal.querySelector('.modal-title');
      const bodyEl = modal.querySelector('.modal-body');
      if (titleEl) titleEl.textContent = `${config.nameEn} (${config.nameAr}) — Select Status`;

      if (bodyEl) {
        bodyEl.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-secondary status-option-btn" data-status="${ST.STATUS_TYPES.PRAYED}" style="justify-content:flex-start;">
              ${ST.DOM.getIcon('check')} Prayed
            </button>
            <button class="btn btn-secondary status-option-btn" data-status="${ST.STATUS_TYPES.PRAYED_LATE}" style="justify-content:flex-start;">
              ${ST.DOM.getIcon('info')} Prayed Late (Completed after window)
            </button>
            <button class="btn btn-secondary status-option-btn" data-status="${ST.STATUS_TYPES.JAMAAH}" style="justify-content:flex-start;">
              ${ST.DOM.getIcon('star')} In Jama’ah (Congregation / Mosque)
            </button>
            <button class="btn btn-secondary status-option-btn" data-status="${ST.STATUS_TYPES.NONE}" style="justify-content:flex-start; color:var(--color-text-muted);">
              ${ST.DOM.getIcon('close')} Not Recorded
            </button>
          </div>
        `;

        bodyEl.querySelectorAll('.status-option-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const chosen = btn.getAttribute('data-status');
            ST.state.setPrayerStatus(prayerKey, chosen);
            modal.classList.remove('open');
            ST.DOM.showToast(`${config.nameEn} status updated`, 'Undo', () => {
              ST.state.undoLastAction();
            });
          });
        });
      }

      modal.querySelector('#status-modal-close').onclick = () => modal.classList.remove('open');
      modal.classList.add('open');
    }
  }

  ST.PrayerCardRenderer = PrayerCardRenderer;
})(window.SalahTrack);
