/**
 * SalahTrack — Firebase Configuration Module
 * 
 * Instructions:
 * 1. Create a Firebase project in the Firebase Console (https://console.firebase.google.com/).
 * 2. Add a Web App to your project.
 * 3. Copy your firebaseConfig credentials and paste them below, or enter them directly in App Settings.
 * 
 * IMPORTANT: Never commit service-account credentials or private admin keys here.
 * The Web API key below is public and protected by Firebase Auth & Firestore Security Rules.
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  const STORAGE_KEY = 'salahtrack_firebase_config_v1';

  // Default placeholder template (User fills in their real credentials)
  const DEFAULT_CONFIG = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };

  const FirebaseConfigManager = {
    getConfig() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.apiKey && parsed.apiKey !== "YOUR_API_KEY_HERE") {
            return Object.assign({}, DEFAULT_CONFIG, parsed);
          }
        }
      } catch (e) {
        console.warn('SalahTrack: Could not parse stored Firebase config', e);
      }
      return DEFAULT_CONFIG;
    },

    saveConfig(configObj) {
      if (!configObj || typeof configObj !== 'object') return false;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configObj));
        return true;
      } catch (e) {
        return false;
      }
    },

    clearConfig() {
      localStorage.removeItem(STORAGE_KEY);
    },

    isConfigured() {
      const cfg = this.getConfig();
      return !!(cfg && cfg.apiKey && cfg.projectId && cfg.apiKey.trim().length > 5);
    }
  };

  ST.FirebaseConfigManager = FirebaseConfigManager;
})(window.SalahTrack);
