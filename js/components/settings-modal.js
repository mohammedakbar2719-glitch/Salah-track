/**
 * SalahTrack — Settings View & Prayer Times / Reminders Manager
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class SettingsViewRenderer {
    constructor(containerEl) {
      this.container = containerEl;
      this.authMode = 'signin';
    }

    render() {
      if (!this.container) return;
      const settings = ST.state.settings;
      const ptConfig = ST.prayerTimesService ? ST.prayerTimesService.getConfig() : {};
      const remConfig = ST.reminderService ? ST.reminderService.getConfig() : {};
      const notifPermission = ST.reminderService ? ST.reminderService.getPermissionStatus() : 'unsupported';
      const currentUser = ST.firestoreAdapter.currentUser;
      const isFirebaseReady = ST.FirebaseConfigManager.isConfigured();
      const tzInfo = ST.prayerTimesService ? ST.prayerTimesService.getTimezoneInfo() : { timeZone: 'Local', offset: 'UTC' };
      const activeMethod = (ST.CALCULATION_METHODS && ptConfig.methodId) ? (ST.CALCULATION_METHODS[ptConfig.methodId] || ST.CALCULATION_METHODS.MWL) : { name: 'Standard' };

      this.container.innerHTML = `
        <!-- Account & Cloud Synchronization Section -->
        <div class="settings-section-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md);">
            <h3 class="settings-section-title" style="margin-bottom:0;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Account & Cloud Sync</span>
            </h3>
            <span class="brand-badge" style="display:inline-block;">
              ${currentUser ? 'Signed In' : (isFirebaseReady ? 'Guest Mode' : 'Local Only')}
            </span>
          </div>

          ${currentUser ? `
            <div style="background-color:var(--color-bg-subtle); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-md); margin-bottom:var(--space-md); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:42px; height:42px; border-radius:50%; background-color:var(--color-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px;">
                  ${(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:600; font-size:var(--text-base); color:var(--color-text-primary);">
                    ${currentUser.displayName || 'Muslim Believer'}
                  </div>
                  <div style="font-size:var(--text-xs); color:var(--color-text-muted);">
                    ${currentUser.email || currentUser.uid}
                  </div>
                </div>
              </div>

              <div style="display:flex; align-items:center; gap:8px;">
                <button class="btn btn-secondary" id="btn-auth-signout" style="padding:6px 14px; font-size:var(--text-xs);">
                  Sign Out
                </button>
                <button class="btn btn-danger" id="btn-auth-delete-account" style="padding:6px 14px; font-size:var(--text-xs);">
                  Delete Account
                </button>
              </div>
            </div>
          ` : `
            <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:var(--space-md); line-height:1.5;">
              Sync your prayers across phone, tablet, and computer using secure Firebase Cloud Firestore.
            </p>

            ${!isFirebaseReady ? `
              <div class="callout-box" style="margin-top:0; margin-bottom:var(--space-md); border-color:var(--color-accent-gold-border); background-color:var(--color-accent-gold-soft);">
                <div class="callout-icon">${ST.DOM.getIcon('info')}</div>
                <div class="callout-content" style="flex:1;">
                  <strong>Firebase Project Not Configured:</strong> Connect your Firebase project to enable cross-device cloud sync and authentication.
                  <div style="margin-top:6px;">
                    <button class="btn btn-primary" id="btn-open-firebase-config" style="padding:6px 12px; font-size:var(--text-xs);">
                      Configure Firebase Project
                    </button>
                  </div>
                </div>
              </div>
            ` : `
              <div id="auth-form-container" style="display:flex; flex-direction:column; gap:10px; margin-bottom:var(--space-md);">
                <button class="btn btn-secondary" id="btn-auth-google" style="justify-content:center; font-weight:600;">
                  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  <span>Continue with Google</span>
                </button>

                <div style="display:flex; align-items:center; gap:8px; margin:4px 0;">
                  <span style="flex:1; height:1px; background-color:var(--color-border);"></span>
                  <span style="font-size:11px; color:var(--color-text-muted); text-transform:uppercase;">or with email</span>
                  <span style="flex:1; height:1px; background-color:var(--color-border);"></span>
                </div>

                <div id="auth-error-banner" style="display:none; padding:8px 12px; background-color:var(--color-danger-bg); color:var(--color-danger); border:1px solid var(--color-danger); border-radius:var(--radius-md); font-size:var(--text-xs);"></div>

                <input type="email" id="auth-email-input" class="select-input" placeholder="Email address" style="width:100%;">
                <input type="password" id="auth-password-input" class="select-input" placeholder="Password (minimum 6 characters)" style="width:100%;">

                <div style="display:flex; gap:8px; margin-top:4px;">
                  <button class="btn btn-primary" id="btn-auth-email-submit" style="flex:1;">
                    ${this.authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>
                  <button class="btn btn-secondary" id="btn-auth-toggle-mode" style="font-size:var(--text-xs);">
                    ${this.authMode === 'signin' ? 'Register' : 'Have an account?'}
                  </button>
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:space-between; font-size:var(--text-xs); color:var(--color-text-muted); border-top:1px solid var(--color-border-subtle); padding-top:8px;">
                <span>Connected to Cloud Firestore</span>
                <button id="btn-open-firebase-config" style="color:var(--color-primary); text-decoration:underline;">Reconfigure</button>
              </div>
            `}
          `}
        </div>

        <!-- Prayer Times & Astronomical Calculation Section -->
        <div class="settings-section-card">
          <h3 class="settings-section-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Prayer Times & Astronomical Calculation</span>
          </h3>

          <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:var(--space-md); line-height:1.5;">
            Calculated locally on your device using reputable solar position algorithms. Your coordinates remain 100% private.
          </p>

          <!-- Selected Method & Timezone Display -->
          <div style="display:flex; flex-wrap:wrap; gap:8px 16px; margin-bottom:var(--space-md); padding:10px 14px; background-color:var(--color-bg-subtle); border:1px solid var(--color-border); border-radius:var(--radius-md); font-size:var(--text-xs);">
            <div><span style="color:var(--color-text-muted);">Active Timezone:</span> <strong id="pt-display-timezone">${tzInfo.timeZone} (${tzInfo.offset})</strong></div>
            <div><span style="color:var(--color-text-muted);">Selected Method:</span> <strong id="pt-display-method">${activeMethod.name}</strong></div>
          </div>

          <!-- Location Selector -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Active City Location</span>
              <span class="settings-desc">Currently: <strong>${ptConfig.cityName || 'Custom'}</strong> (${ptConfig.latitude.toFixed(2)}°, ${ptConfig.longitude.toFixed(2)}°)</span>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary" id="btn-request-location" style="font-size:var(--text-xs); padding:6px 12px;" title="Requests your browser GPS with your explicit consent">
                📍 Use My Location
              </button>
            </div>
          </div>

          <!-- City Presets -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Choose City Preset</span>
              <span class="settings-desc">Fast coordinates & authority setup</span>
            </div>
            <select class="select-input" id="setting-city-preset">
              <option value="">-- Select City Preset --</option>
              ${ST.CITY_PRESETS.map(p => `
                <option value="${p.name}" ${ptConfig.cityName === p.name ? 'selected' : ''}>${p.name}</option>
              `).join('')}
            </select>
          </div>

          <!-- Manual Coordinates Input (No GPS) -->
          <div class="settings-row" style="align-items:flex-start;">
            <div class="settings-label-block">
              <span class="settings-label">Manual Coordinates (No GPS)</span>
              <span class="settings-desc">Enter custom latitude & longitude directly</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <div style="display:flex; gap:6px;">
                <input type="number" step="0.0001" id="setting-manual-lat" class="select-input" placeholder="Lat (-90 to 90)" value="${ptConfig.latitude.toFixed(4)}" style="width:105px; font-size:var(--text-xs);">
                <input type="number" step="0.0001" id="setting-manual-lng" class="select-input" placeholder="Lng (-180 to 180)" value="${ptConfig.longitude.toFixed(4)}" style="width:105px; font-size:var(--text-xs);">
              </div>
              <button class="btn btn-secondary" id="btn-apply-manual-coords" style="font-size:var(--text-xs); padding:5px 8px; justify-content:center;">Apply Coordinates</button>
            </div>
          </div>

          <!-- Calculation Method -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Calculation Authority</span>
              <span class="settings-desc">Determines Fajr & Isha celestial angles</span>
            </div>
            <select class="select-input" id="setting-calc-method">
              ${Object.values(ST.CALCULATION_METHODS).map(m => `
                <option value="${m.id}" ${ptConfig.methodId === m.id ? 'selected' : ''}>${m.name}</option>
              `).join('')}
            </select>
          </div>

          <!-- Asr Juristic School -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Asr Juristic Method</span>
              <span class="settings-desc">Shadow length ratio convention</span>
            </div>
            <select class="select-input" id="setting-asr-school">
              <option value="STANDARD" ${ptConfig.asrMethod === 'STANDARD' ? 'selected' : ''}>Standard (Shafi’i, Maliki, Hanbali) — 1x Shadow</option>
              <option value="HANAFI" ${ptConfig.asrMethod === 'HANAFI' ? 'selected' : ''}>Hanafi — 2x Shadow</option>
            </select>
          </div>

          <!-- Minute Adjustments Toggle & Inputs -->
          <div style="margin-top:var(--space-md); padding-top:var(--space-md); border-top:1px solid var(--color-border-subtle);">
            <span class="settings-label" style="display:block; margin-bottom:4px;">Minute Adjustments (Local Mosque Alignment)</span>
            <span class="settings-desc" style="display:block; margin-bottom:12px;">Add or subtract minutes (±60m) to match your local mosque timetable.</span>

            <div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:6px; text-align:center;">
              ${ST.PRAYER_KEYS.map(pKey => {
                const pConfig = ST.PRAYERS[pKey];
                const adj = (ptConfig.adjustments && ptConfig.adjustments[pKey]) || 0;
                return `
                  <div>
                    <label style="font-size:11px; font-weight:600; display:block; margin-bottom:2px;">${pConfig.nameEn}</label>
                    <input type="number" class="select-input" data-pt-adj="${pKey}" value="${adj}" min="-60" max="60" style="width:100%; text-align:center; padding:6px 2px;">
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="callout-box" style="margin-top:var(--space-md);">
            <div class="callout-icon">${ST.DOM.getIcon('info')}</div>
            <div class="callout-content">
              <strong>Local Mosque Note:</strong> Astronomical calculations determine the celestial entry of prayer windows. Local mosque timetables may incorporate visual observation or community consensus.
            </div>
          </div>

          <div class="callout-box" style="margin-top:var(--space-xs); border-color:var(--color-primary-border); background-color:var(--color-primary-subtle);">
            <div class="callout-icon" style="color:var(--color-primary);">${ST.DOM.getIcon('info')}</div>
            <div class="callout-content">
              <strong>Travel & Timezone Handling:</strong> SalahTrack automatically anchors astronomical calculations to your device's current timezone offset (${tzInfo.offset}). When traveling across timezones, tap <em>Use My Location</em> or select your destination city above. Past tracked prayer records retain their original historical local dates and are never modified by timezone transitions.
            </div>
          </div>
        </div>

        <!-- Prayer Reminders & Notifications Section -->
        <div class="settings-section-card">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:var(--space-md);">
            <h3 class="settings-section-title" style="margin-bottom:0;">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span>Prayer Reminders & Alerts</span>
            </h3>
            <span class="brand-badge" style="display:inline-block;">
              ${notifPermission === 'granted' ? 'Allowed' : (notifPermission === 'denied' ? 'Blocked' : 'Default')}
            </span>
          </div>

          <!-- Master Reminder Toggle -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Enable Reminders</span>
              <span class="settings-desc">Receive notifications when prayer windows enter</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-reminders-master" ${remConfig.enabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          ${notifPermission !== 'granted' ? `
            <div class="callout-box" style="margin:var(--space-sm) 0; border-color:var(--color-primary-border); background-color:var(--color-primary-subtle);">
              <div class="callout-icon" style="color:var(--color-primary);">${ST.DOM.getIcon('info')}</div>
              <div class="callout-content" style="flex:1;">
                <strong>Browser Permission Required:</strong> Allow notifications to receive desktop and mobile popups.
                <div style="margin-top:6px;">
                  <button class="btn btn-primary" id="btn-request-notif-perm" style="padding:6px 12px; font-size:var(--text-xs);">
                    Request Notification Permission
                  </button>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Pre-Prayer Reminder Window -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Pre-Prayer Reminder</span>
              <span class="settings-desc">Advance notification to prepare for prayer</span>
            </div>
            <select class="select-input" id="setting-pre-reminder-mins">
              <option value="0" ${remConfig.preReminderMinutes === 0 ? 'selected' : ''}>At Exact Prayer Time</option>
              <option value="5" ${remConfig.preReminderMinutes === 5 ? 'selected' : ''}>5 Minutes Before</option>
              <option value="10" ${remConfig.preReminderMinutes === 10 ? 'selected' : ''}>10 Minutes Before</option>
              <option value="15" ${remConfig.preReminderMinutes === 15 ? 'selected' : ''}>15 Minutes Before</option>
              <option value="30" ${remConfig.preReminderMinutes === 30 ? 'selected' : ''}>30 Minutes Before</option>
            </select>
          </div>

          <!-- Peaceful Audio Chime -->
          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Audio Chime (Web Audio)</span>
              <span class="settings-desc">Plays a gentle synthesized tone upon entry</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-rem-sound" ${remConfig.soundEnabled ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <!-- Individual Prayer Reminder Toggles -->
          <div style="margin-top:var(--space-md); padding-top:var(--space-md); border-top:1px solid var(--color-border-subtle);">
            <span class="settings-label" style="display:block; margin-bottom:8px;">Individual Prayer Alert Toggles</span>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${ST.PRAYER_KEYS.map(pKey => {
                const pConfig = ST.PRAYERS[pKey];
                const isChecked = remConfig.prayers && remConfig.prayers[pKey] !== false;
                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:var(--text-sm); font-weight:500;">
                      ${pConfig.nameEn} <span style="font-family:var(--font-arabic); color:var(--color-text-muted);">(${pConfig.nameAr})</span>
                    </span>
                    <label class="toggle-switch" style="width:40px; height:22px;">
                      <input type="checkbox" data-rem-prayer="${pKey}" ${isChecked ? 'checked' : ''}>
                      <span class="toggle-slider"></span>
                    </label>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Honest Browser Limitations Disclosure -->
          <div class="callout-box" style="margin-top:var(--space-md);">
            <div class="callout-icon">${ST.DOM.getIcon('info')}</div>
            <div class="callout-content">
              <strong>Browser Notification Limitation:</strong> Browsers throttle or freeze background JavaScript execution when your device is locked or the tab is closed to save battery. Reminders fire reliably when SalahTrack is active in a tab. For guaranteed alarms while phone screens are off and apps killed, native OS alarm clocks are recommended.
            </div>
          </div>
        </div>

        <!-- Appearance Section -->
        <div class="settings-section-card">
          <h3 class="settings-section-title">
            ${ST.DOM.getIcon('sun')}
            <span>Appearance & Theme</span>
          </h3>

          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Color Theme</span>
              <span class="settings-desc">Choose your preferred visual presentation</span>
            </div>
            <select class="select-input" id="setting-theme-select">
              <option value="system" ${settings.theme === 'system' ? 'selected' : ''}>System Default</option>
              <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Warm Ivory (Light)</option>
              <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Obsidian Emerald (Dark)</option>
            </select>
          </div>
        </div>

        <!-- Tracking Preferences Section -->
        <div class="settings-section-card">
          <h3 class="settings-section-title">
            ${ST.DOM.getIcon('calendar')}
            <span>Tracking & Features</span>
          </h3>

          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">First Day of Week</span>
              <span class="settings-desc">Select how weekly calendar grids begin</span>
            </div>
            <select class="select-input" id="setting-first-day-select">
              <option value="0" ${settings.firstDayOfWeek === 0 ? 'selected' : ''}>Sunday</option>
              <option value="1" ${settings.firstDayOfWeek === 1 ? 'selected' : ''}>Monday</option>
              <option value="6" ${settings.firstDayOfWeek === 6 ? 'selected' : ''}>Saturday</option>
            </select>
          </div>

          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Detailed Prayer Statuses</span>
              <span class="settings-desc">Enable selecting "Prayed Late" and "In Jama’ah"</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-detailed-status-toggle" ${settings.allowDetailedStatus ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="settings-row">
            <div class="settings-label-block">
              <span class="settings-label">Qada Prayer Tracker</span>
              <span class="settings-desc">Dedicated tab to track and make up past missed prayers</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="setting-qada-toggle" ${settings.enableQadaTracker ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Data Sovereignty & Portability -->
        <div class="settings-section-card">
          <h3 class="settings-section-title">
            ${ST.DOM.getIcon('stats')}
            <span>Data Sovereignty & Privacy</span>
          </h3>

          <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:var(--space-md); line-height:1.5;">
            Your personal worship records belong exclusively to you. You can export complete backups anytime.
          </p>

          <div style="display:flex; flex-wrap:wrap; gap:var(--space-sm); margin-bottom:var(--space-md);">
            <button class="btn btn-secondary" id="btn-export-json">
              Export Backup (JSON)
            </button>
            <button class="btn btn-secondary" id="btn-export-csv">
              Export Records (CSV)
            </button>
            <label class="btn btn-secondary" style="cursor:pointer; margin:0;">
              Restore Backup (JSON)
              <input type="file" id="input-import-json" accept=".json" style="display:none;">
            </label>
          </div>

          <div class="settings-row" style="border-top:1px solid var(--color-border-subtle); padding-top:var(--space-md);">
            <div class="settings-label-block">
              <span class="settings-label" style="color:var(--color-danger);">Reset All Records</span>
              <span class="settings-desc">Permanently erase all local prayer records</span>
            </div>
            <button class="btn btn-danger" id="btn-reset-data" style="padding:6px 14px; font-size:var(--text-xs);">
              Reset Data
            </button>
          </div>
        </div>
      `;

      this._bindEventListeners();
    }

    _bindEventListeners() {
      // 1. Prayer Times Handlers
      const cityPresetSelect = this.container.querySelector('#setting-city-preset');
      if (cityPresetSelect) {
        cityPresetSelect.onchange = (e) => {
          const selectedCity = ST.CITY_PRESETS.find(p => p.name === e.target.value);
          if (selectedCity) {
            ST.prayerTimesService.saveConfig({
              cityName: selectedCity.name,
              latitude: selectedCity.lat,
              longitude: selectedCity.lng,
              methodId: selectedCity.method,
              asrMethod: selectedCity.asr
            });
            ST.DOM.showToast(`Updated location to ${selectedCity.name}`, null, null);
            this.render();
          }
        };
      }

      const calcMethodSelect = this.container.querySelector('#setting-calc-method');
      if (calcMethodSelect) {
        calcMethodSelect.onchange = (e) => {
          ST.prayerTimesService.saveConfig({ methodId: e.target.value });
          ST.DOM.showToast('Calculation authority updated', null, null);
          this.render();
        };
      }

      const asrSchoolSelect = this.container.querySelector('#setting-asr-school');
      if (asrSchoolSelect) {
        asrSchoolSelect.onchange = (e) => {
          ST.prayerTimesService.saveConfig({ asrMethod: e.target.value });
          ST.DOM.showToast('Asr juristic method updated', null, null);
          this.render();
        };
      }

      const reqLocationBtn = this.container.querySelector('#btn-request-location');
      if (reqLocationBtn) {
        reqLocationBtn.onclick = async () => {
          try {
            reqLocationBtn.disabled = true;
            reqLocationBtn.textContent = 'Acquiring GPS...';
            await ST.prayerTimesService.requestCurrentLocation();
            ST.DOM.showToast('Location updated via GPS coordinates!', null, null);
            this.render();
          } catch (err) {
            alert(err.message);
          } finally {
            reqLocationBtn.disabled = false;
            reqLocationBtn.textContent = '📍 Use My Location';
          }
        };
      }

      const applyManualCoordsBtn = this.container.querySelector('#btn-apply-manual-coords');
      if (applyManualCoordsBtn) {
        applyManualCoordsBtn.onclick = () => {
          const latInput = this.container.querySelector('#setting-manual-lat');
          const lngInput = this.container.querySelector('#setting-manual-lng');
          const lat = latInput ? latInput.value : '';
          const lng = lngInput ? lngInput.value : '';
          try {
            ST.prayerTimesService.setManualCoordinates(lat, lng, 'Custom Coordinates');
            ST.DOM.showToast('Manual coordinates saved!', null, null);
            this.render();
          } catch (err) {
            alert(err.message);
          }
        };
      }

      // Minute adjustments
      this.container.querySelectorAll('[data-pt-adj]').forEach(input => {
        input.onchange = () => {
          const pKey = input.getAttribute('data-pt-adj');
          const val = parseInt(input.value, 10) || 0;
          const currentAdj = Object.assign({}, ST.prayerTimesService.getConfig().adjustments);
          currentAdj[pKey] = val;
          ST.prayerTimesService.saveConfig({ adjustments: currentAdj });
          ST.DOM.showToast(`${pKey} adjustment saved (${val > 0 ? '+' : ''}${val}m)`, null, null);
        };
      });

      // 2. Reminder Handlers
      const remMasterToggle = this.container.querySelector('#setting-reminders-master');
      if (remMasterToggle) {
        remMasterToggle.onchange = (e) => {
          ST.reminderService.saveConfig({ enabled: e.target.checked });
          ST.DOM.showToast('Reminder status saved', null, null);
        };
      }

      const reqNotifBtn = this.container.querySelector('#btn-request-notif-perm');
      if (reqNotifBtn) {
        reqNotifBtn.onclick = async () => {
          try {
            const res = await ST.reminderService.requestPermission();
            if (res === 'granted') {
              ST.DOM.showToast('Notification permission granted!', null, null);
            } else {
              ST.DOM.showToast('Permission status: ' + res, null, null);
            }
            this.render();
          } catch (err) {
            alert('Notification permission request failed: ' + err.message);
          }
        };
      }

      const preRemMinsSelect = this.container.querySelector('#setting-pre-reminder-mins');
      if (preRemMinsSelect) {
        preRemMinsSelect.onchange = (e) => {
          ST.reminderService.saveConfig({ preReminderMinutes: parseInt(e.target.value, 10) });
          ST.DOM.showToast('Pre-prayer timing updated', null, null);
        };
      }

      const remSoundToggle = this.container.querySelector('#setting-rem-sound');
      if (remSoundToggle) {
        remSoundToggle.onchange = (e) => {
          ST.reminderService.saveConfig({ soundEnabled: e.target.checked });
          if (e.target.checked) ST.reminderService.playGentleChime();
          ST.DOM.showToast('Chime audio setting updated', null, null);
        };
      }

      this.container.querySelectorAll('[data-rem-prayer]').forEach(cb => {
        cb.onchange = () => {
          const pKey = cb.getAttribute('data-rem-prayer');
          const currentPrayers = Object.assign({}, ST.reminderService.getConfig().prayers);
          currentPrayers[pKey] = cb.checked;
          ST.reminderService.saveConfig({ prayers: currentPrayers });
          ST.DOM.showToast(`${pKey} reminder ${cb.checked ? 'enabled' : 'disabled'}`, null, null);
        };
      });

      // Theme selector
      const themeSelect = this.container.querySelector('#setting-theme-select');
      if (themeSelect) {
        themeSelect.onchange = (e) => {
          ST.state.updateSettings({ theme: e.target.value });
          ST.DOM.showToast('Theme updated', null, null);
        };
      }

      // First day of week
      const firstDaySelect = this.container.querySelector('#setting-first-day-select');
      if (firstDaySelect) {
        firstDaySelect.onchange = (e) => {
          ST.state.updateSettings({ firstDayOfWeek: parseInt(e.target.value, 10) });
          ST.DOM.showToast('First day of week updated', null, null);
        };
      }

      // Detailed status toggle
      const detailedToggle = this.container.querySelector('#setting-detailed-status-toggle');
      if (detailedToggle) {
        detailedToggle.onchange = (e) => {
          ST.state.updateSettings({ allowDetailedStatus: e.target.checked });
          ST.DOM.showToast('Detailed status preference saved', null, null);
        };
      }

      // Qada toggle
      const qadaToggle = this.container.querySelector('#setting-qada-toggle');
      if (qadaToggle) {
        qadaToggle.onchange = (e) => {
          ST.state.updateSettings({ enableQadaTracker: e.target.checked });
          ST.DOM.showToast('Qada tracker preference saved', null, null);
          if (ST.app && ST.app.updateQadaVisibility) ST.app.updateQadaVisibility();
        };
      }

      // Export JSON
      const exportJsonBtn = this.container.querySelector('#btn-export-json');
      if (exportJsonBtn) {
        exportJsonBtn.onclick = () => {
          ST.ExportService.exportJSON();
          ST.DOM.showToast('JSON backup exported', null, null);
        };
      }

      // Export CSV
      const exportCsvBtn = this.container.querySelector('#btn-export-csv');
      if (exportCsvBtn) {
        exportCsvBtn.onclick = () => {
          ST.ExportService.exportCSV();
          ST.DOM.showToast('CSV records exported', null, null);
        };
      }

      // Import JSON
      const importFileInput = this.container.querySelector('#input-import-json');
      if (importFileInput) {
        importFileInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const count = await ST.ExportService.importJSON(file);
            ST.state.setDate(new Date());
            ST.DOM.showToast(`Successfully restored ${count} prayer records!`, null, null);
            this.render();
          } catch (err) {
            alert('Failed to import backup: ' + err.message);
          }
          importFileInput.value = '';
        };
      }

      // Reset Data
      const resetBtn = this.container.querySelector('#btn-reset-data');
      if (resetBtn) {
        resetBtn.onclick = () => {
          ST.DOM.showConfirmModal({
            title: 'Erase All Prayer Records?',
            message: 'Are you sure you want to permanently erase your local prayer history? This cannot be undone unless you have a backup.',
            confirmText: 'Yes, Delete Everything',
            danger: true,
            onConfirm: () => {
              ST.storage.clearAllData();
              ST.state.setDate(new Date());
              ST.DOM.showToast('All local data cleared', null, null);
              this.render();
            }
          });
        };
      }

      // Firebase Config Modal opener
      const configBtn = this.container.querySelector('#btn-open-firebase-config');
      if (configBtn) {
        configBtn.onclick = () => this.openFirebaseConfigModal();
      }

      // Auth Handlers
      const googleBtn = this.container.querySelector('#btn-auth-google');
      if (googleBtn) {
        googleBtn.onclick = async () => {
          try {
            googleBtn.disabled = true;
            await ST.firestoreAdapter.signInWithGoogle();
            ST.DOM.showToast('Signed in with Google successfully!', null, null);
          } catch (err) {
            this.showAuthError(ST.firestoreAdapter.formatAuthError(err));
          } finally {
            googleBtn.disabled = false;
          }
        };
      }

      const emailSubmitBtn = this.container.querySelector('#btn-auth-email-submit');
      if (emailSubmitBtn) {
        emailSubmitBtn.onclick = async () => {
          const email = (this.container.querySelector('#auth-email-input').value || '').trim();
          const pass = (this.container.querySelector('#auth-password-input').value || '').trim();

          if (!email || !pass) {
            this.showAuthError('Please enter both email and password.');
            return;
          }

          try {
            emailSubmitBtn.disabled = true;
            if (this.authMode === 'signin') {
              await ST.firestoreAdapter.signInWithEmail(email, pass);
              ST.DOM.showToast('Signed in successfully!', null, null);
            } else {
              await ST.firestoreAdapter.signUpWithEmail(email, pass);
              ST.DOM.showToast('Account created successfully!', null, null);
            }
          } catch (err) {
            this.showAuthError(ST.firestoreAdapter.formatAuthError(err));
          } finally {
            emailSubmitBtn.disabled = false;
          }
        };
      }

      const toggleModeBtn = this.container.querySelector('#btn-auth-toggle-mode');
      if (toggleModeBtn) {
        toggleModeBtn.onclick = () => {
          this.authMode = this.authMode === 'signin' ? 'signup' : 'signin';
          this.render();
        };
      }

      const signoutBtn = this.container.querySelector('#btn-auth-signout');
      if (signoutBtn) {
        signoutBtn.onclick = async () => {
          await ST.firestoreAdapter.signOut();
          ST.DOM.showToast('Signed out. Local guest mode active.', null, null);
          this.render();
        };
      }

      const deleteAccBtn = this.container.querySelector('#btn-auth-delete-account');
      if (deleteAccBtn) {
        deleteAccBtn.onclick = () => {
          ST.DOM.showConfirmModal({
            title: 'Delete Account & Purge Data?',
            message: 'Are you sure you want to permanently delete your account? All synced records will be permanently removed.',
            confirmText: 'Yes, Delete My Account',
            danger: true,
            onConfirm: async () => {
              try {
                await ST.firestoreAdapter.deleteAccount();
                ST.DOM.showToast('Account deleted. Reverted to fresh local mode.', null, null);
                this.render();
              } catch (err) {
                alert('Account deletion failed: ' + err.message);
              }
            }
          });
        };
      }
    }

    showAuthError(msg) {
      const banner = this.container.querySelector('#auth-error-banner');
      if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
      }
    }

    openFirebaseConfigModal() {
      const modal = document.getElementById('status-modal');
      if (!modal) return;

      const current = ST.FirebaseConfigManager.getConfig();

      const titleEl = modal.querySelector('.modal-title');
      const bodyEl = modal.querySelector('.modal-body');
      if (titleEl) titleEl.textContent = 'Configure Firebase Project';

      if (bodyEl) {
        bodyEl.innerHTML = `
          <p style="font-size:var(--text-xs); color:var(--color-text-secondary); margin-bottom:var(--space-md); line-height:1.4;">
            Paste your Firebase Web App credentials from the <a href="https://console.firebase.google.com" target="_blank" style="text-decoration:underline; color:var(--color-primary);">Firebase Console</a>. See <strong>FIREBASE_SETUP.md</strong> for step-by-step instructions.
          </p>

          <div style="display:flex; flex-direction:column; gap:8px;">
            <label style="font-size:11px; font-weight:600;">API Key (apiKey)</label>
            <input type="text" id="cfg-apiKey" class="select-input" value="${current.apiKey || ''}" placeholder="AIzaSy...">

            <label style="font-size:11px; font-weight:600;">Auth Domain (authDomain)</label>
            <input type="text" id="cfg-authDomain" class="select-input" value="${current.authDomain || ''}" placeholder="your-app.firebaseapp.com">

            <label style="font-size:11px; font-weight:600;">Project ID (projectId)</label>
            <input type="text" id="cfg-projectId" class="select-input" value="${current.projectId || ''}" placeholder="your-app-id">

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:12px;">
              <button class="btn btn-secondary" id="cfg-cancel-btn">Cancel</button>
              <button class="btn btn-primary" id="cfg-save-btn">Save & Initialize</button>
            </div>
          </div>
        `;

        bodyEl.querySelector('#cfg-cancel-btn').onclick = () => modal.classList.remove('open');
        bodyEl.querySelector('#cfg-save-btn').onclick = async () => {
          const updated = {
            apiKey: (bodyEl.querySelector('#cfg-apiKey').value || '').trim(),
            authDomain: (bodyEl.querySelector('#cfg-authDomain').value || '').trim(),
            projectId: (bodyEl.querySelector('#cfg-projectId').value || '').trim()
          };

          ST.FirebaseConfigManager.saveConfig(updated);
          modal.classList.remove('open');

          ST.DOM.showToast('Firebase configuration saved. Initializing...', null, null);
          const success = await ST.firestoreAdapter.init();
          if (success) {
            ST.DOM.showToast('Connected to Firebase successfully!', null, null);
          } else {
            ST.DOM.showToast('Saved. Reloading or reconnecting when online.', null, null);
          }
          this.render();
        };
      }

      modal.querySelector('#status-modal-close').onclick = () => modal.classList.remove('open');
      modal.classList.add('open');
    }
  }

  ST.SettingsViewRenderer = SettingsViewRenderer;
})(window.SalahTrack);
