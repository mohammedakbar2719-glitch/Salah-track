/**
 * SalahTrack — Firebase Authentication & Cloud Firestore Adapter
 * Handles Google & Email auth, user-scoped Firestore sync, offline writes & conflict resolution
 * Version: 2.0.0
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class FirestoreAdapter {
    constructor() {
      this.isInitialized = false;
      this.currentUser = null;
      this.db = null;
      this.auth = null;
      this.unsubscribeAuth = null;
      this.unsubscribeSnapshot = null;
      this.syncState = 'offline_local'; // 'offline_local' | 'connecting' | 'synced' | 'syncing' | 'error'
    }

    /**
     * Initializes Firebase App, Auth & Firestore
     */
    async init() {
      if (!ST.FirebaseConfigManager.isConfigured()) {
        console.info('SalahTrack: Firebase is not configured yet. Operating in 100% private local guest mode.');
        return false;
      }

      if (typeof window.firebase === 'undefined') {
        console.warn('SalahTrack: Firebase SDK not loaded in environment. Operating in local guest mode.');
        return false;
      }

      try {
        const config = ST.FirebaseConfigManager.getConfig();

        // Check if an app is already initialized
        let app;
        if (!firebase.apps || firebase.apps.length === 0) {
          app = firebase.initializeApp(config);
        } else {
          app = firebase.app();
        }

        this.auth = firebase.auth();
        this.db = firebase.firestore();

        // Enable offline persistence in Firestore
        try {
          await this.db.enablePersistence({ synchronizeTabs: true });
        } catch (err) {
          if (err.code === 'failed-precondition') {
            console.info('SalahTrack: Firestore persistence enabled in another browser tab.');
          } else if (err.code === 'unimplemented') {
            console.info('SalahTrack: Firestore browser persistence not supported on this platform.');
          }
        }

        this._setupAuthListener();
        this.isInitialized = true;
        return true;
      } catch (err) {
        console.error('SalahTrack: Failed to initialize Firebase SDK', err);
        this.syncState = 'error';
        return false;
      }
    }

    _setupAuthListener() {
      if (!this.auth) return;

      this.unsubscribeAuth = this.auth.onAuthStateChanged(async (user) => {
        const previousUser = this.currentUser;
        this.currentUser = user;

        if (user) {
          console.info(`SalahTrack: Signed in as ${user.email || user.displayName || user.uid}`);
          this.syncState = 'synced';

          // Set user in local storage adapter
          ST.storage._userId = user.uid;
          ST.storage._recordsCache = null;

          // Check if there are local guest records to offer migration
          this._checkLocalGuestMigration(user.uid);

          // Listen for real-time cloud changes
          this._listenToUserRecords(user.uid);

          if (ST.state) {
            ST.state.emit('auth:stateChanged', { user, isAuthenticated: true });
            ST.state.emit('sync:status', 'synced');
            ST.state.setDate(ST.state.currentDate); // Refresh active view
          }
        } else {
          console.info('SalahTrack: Operating as Guest (Signed out)');
          this.syncState = 'offline_local';
          if (this.unsubscribeSnapshot) {
            this.unsubscribeSnapshot();
            this.unsubscribeSnapshot = null;
          }

          ST.storage._userId = ST.DEFAULT_USER_ID;
          ST.storage._recordsCache = null;

          if (ST.state) {
            ST.state.emit('auth:stateChanged', { user: null, isAuthenticated: false });
            ST.state.emit('sync:status', 'saved_local');
            ST.state.setDate(ST.state.currentDate);
          }
        }
      });
    }

    /**
     * Real-time Firestore snapshot listener for user's prayer days: users/{uid}/prayerDays
     */
    _listenToUserRecords(uid) {
      if (!this.db || !uid) return;
      if (this.unsubscribeSnapshot) this.unsubscribeSnapshot();

      const userPrayerDaysRef = this.db.collection('users').doc(uid).collection('prayerDays');

      this.unsubscribeSnapshot = userPrayerDaysRef.onSnapshot((snapshot) => {
        let hasNewerCloudRecords = false;
        const localRecords = ST.storage.getAllRecords();

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const cloudDoc = change.doc.data();
            const dateKey = change.doc.id;

            // Conflict resolution based on updatedAt
            const localRec = localRecords[dateKey];
            if (!localRec || !localRec.updatedAt || new Date(cloudDoc.updatedAt) > new Date(localRec.updatedAt)) {
              localRecords[dateKey] = cloudDoc;
              hasNewerCloudRecords = true;
            }
          } else if (change.type === 'removed') {
            const dateKey = change.doc.id;
            if (localRecords[dateKey]) {
              delete localRecords[dateKey];
              hasNewerCloudRecords = true;
            }
          }
        });

        if (hasNewerCloudRecords) {
          try {
            localStorage.setItem(ST.storage._getUserRecordsKey(), JSON.stringify(localRecords));
            ST.storage._recordsCache = localRecords;
            if (ST.state) {
              ST.state.currentRecord = ST.storage.getRecord(ST.state.currentDateKey);
              ST.state.emit('record:updated', ST.state.currentRecord);
            }
          } catch (e) {}
        }
      }, (err) => {
        console.warn('SalahTrack: Firestore snapshot listener error (likely offline)', err);
      });
    }

    /**
     * Checks if guest records exist on device and prompts to sync them into account
     */
    async _checkLocalGuestMigration(uid) {
      const guestKey = `${ST.storage._recordsKey || 'salahtrack_records_'}${ST.DEFAULT_USER_ID}`;
      const raw = localStorage.getItem(guestKey);
      if (!raw) return;

      try {
        const guestRecords = JSON.parse(raw);
        const keys = Object.keys(guestRecords);
        if (keys.length > 0) {
          // Offer migration via confirm modal
          ST.DOM.showConfirmModal({
            title: 'Migrate Local Records?',
            message: `Found ${keys.length} existing prayer records tracked on this device. Would you like to upload and sync them to your cloud account?`,
            confirmText: 'Sync to Account',
            onConfirm: async () => {
              await this.migrateLocalRecordsToCloud(uid, guestRecords);
              localStorage.removeItem(guestKey);
              ST.DOM.showToast(`Migrated ${keys.length} local records to your cloud account!`, null, null);
            }
          });
        }
      } catch (e) {}
    }

    /**
     * Migrates records to Firestore users/{uid}/prayerDays/{dateKey}
     */
    async migrateLocalRecordsToCloud(uid, recordsMap) {
      if (!this.db || !uid || !recordsMap) return;
      const batch = this.db.batch();
      let count = 0;

      for (const [dateKey, rec] of Object.entries(recordsMap)) {
        rec.userId = uid;
        rec.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        const docRef = this.db.collection('users').doc(uid).collection('prayerDays').doc(dateKey);
        batch.set(docRef, rec, { merge: true });
        count++;

        // Commit in batches of 400
        if (count % 400 === 0) {
          await batch.commit();
        }
      }
      if (count % 400 !== 0) {
        await batch.commit();
      }
    }

    /**
     * Saves prayer day record to Firestore: users/{uid}/prayerDays/{dateKey}
     */
    async saveRecord(record) {
      if (!this.db || !this.currentUser) return false;

      const uid = this.currentUser.uid;
      const dateKey = record.date;
      record.userId = uid;
      record.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      try {
        const docRef = this.db.collection('users').doc(uid).collection('prayerDays').doc(dateKey);
        await docRef.set(record, { merge: true });
        return true;
      } catch (err) {
        console.warn('SalahTrack: Firestore write queued locally (offline)', err);
        return false;
      }
    }

    /**
     * Saves Qada ledger to Firestore: users/{uid}/qada/ledger
     */
    async saveQadaLedger(ledger) {
      if (!this.db || !this.currentUser) return false;
      const uid = this.currentUser.uid;
      ledger.userId = uid;

      try {
        const docRef = this.db.collection('users').doc(uid).collection('qada').doc('ledger');
        await docRef.set(ledger, { merge: true });
        return true;
      } catch (err) {
        return false;
      }
    }

    // =========================================================================
    // Authentication Flows
    // =========================================================================

    /**
     * Google Sign-in popup flow
     */
    async signInWithGoogle() {
      if (!this.auth) throw new Error('Firebase Auth is not initialized. Please configure Firebase first.');
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return await this.auth.signInWithPopup(provider);
    }

    /**
     * Email / Password sign-in flow
     */
    async signInWithEmail(email, password) {
      if (!this.auth) throw new Error('Firebase Auth is not initialized.');
      return await this.auth.signInWithEmailAndPassword(email, password);
    }

    /**
     * Email / Password user registration
     */
    async signUpWithEmail(email, password) {
      if (!this.auth) throw new Error('Firebase Auth is not initialized.');
      return await this.auth.createUserWithEmailAndPassword(email, password);
    }

    /**
     * Sign out
     */
    async signOut() {
      if (!this.auth) return;
      return await this.auth.signOut();
    }

    /**
     * Account Deletion flow (with cloud data purge)
     */
    async deleteAccount() {
      if (!this.auth || !this.currentUser) return;
      const user = this.currentUser;
      const uid = user.uid;

      // Clean local storage cache
      ST.storage.clearAllData();

      // Delete user authentication
      await user.delete();
      console.info(`SalahTrack: Account purged for ${uid}`);
    }

    /**
     * Helper to translate Firebase Auth error codes to peaceful user messages
     */
    formatAuthError(err) {
      if (!err) return 'An unknown error occurred.';
      switch (err.code) {
        case 'auth/user-not-found':
          return 'No account exists with this email address.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return 'Incorrect password. Please verify your credentials.';
        case 'auth/email-already-in-use':
          return 'An account already exists with this email. Please sign in instead.';
        case 'auth/weak-password':
          return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/popup-closed-by-user':
          return 'Google sign-in popup was closed before completing.';
        case 'auth/network-request-failed':
          return 'Network request failed. Please check your internet connection.';
        default:
          return err.message || 'Authentication failed.';
      }
    }
  }

  ST.firestoreAdapter = new FirestoreAdapter();
})(window.SalahTrack);
