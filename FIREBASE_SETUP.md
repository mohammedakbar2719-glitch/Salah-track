# SalahTrack — Firebase Integration & Setup Guide

This guide walks you through connecting your Firebase project to **SalahTrack** for Cloud Firestore synchronization and Firebase Authentication.

---

## 1. Create Your Firebase Project

1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g. `salahtrack-app`) and complete the creation steps (Google Analytics is optional).

---

## 2. Register a Web App

1. On your Firebase Project Overview dashboard, click the **Web icon** (`</>`) to add a web application.
2. Enter an App nickname (e.g., `SalahTrack Web`).
3. Click **Register app**.
4. Firebase will display your `firebaseConfig` object, looking like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "salahtrack-app.firebaseapp.com",
  projectId: "salahtrack-app",
  storageBucket: "salahtrack-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef..."
};
```

---

## 3. Enable Authentication Methods

1. In the Firebase Console left sidebar, click **Build** > **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab:
   * **Email/Password**: Click **Email/Password**, enable the first toggle (*Email/Password*), and click **Save**.
   * **Google**: Click **Google**, enable the toggle, select your project support email, and click **Save**.

---

## 4. Set Up Cloud Firestore Database

1. In the left sidebar, click **Build** > **Firestore Database**.
2. Click **Create database**.
3. Select a database location closest to your users (e.g. `us-central1` or `eur3`).
4. Select **Start in production mode** (we will apply strict custom security rules next).
5. Click **Create**.

---

## 5. Deploy Firestore Security Rules

1. In the Firestore Database section, open the **Rules** tab.
2. Replace all existing text with the exact contents of our [`firestore.rules`](file:///c:/Users/mubin/OneDrive/Desktop/Salah%20Tracker/firestore.rules) file.
3. Click **Publish**.

### Security Rules Summary
* **Default Deny:** All collections outside `users/{userId}` are denied.
* **Strict User Ownership:** Only the authenticated user (`request.auth.uid == userId`) can read or write `users/{userId}/prayerDays/{dateKey}`.
* **Document Schema Validation:** Validates `date` format (`YYYY-MM-DD`), schema version (2), allowed field keys, string length limits, and boolean types for the five daily prayers (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`).
* **Zero Public Access:** Data cannot be inspected or modified by any other user.

---

## 6. Configure SalahTrack

You have two convenient ways to provide your configuration:

### Option A: Via Settings UI (Recommended)
1. Open SalahTrack in your browser.
2. Go to **Settings** > **Cloud Sync & Account**.
3. Click **Configure Firebase Project**.
4. Paste your `apiKey`, `authDomain`, and `projectId`.
5. Click **Save & Connect**.

### Option B: In Code
1. Open [`js/firebase-config.js`](file:///c:/Users/mubin/OneDrive/Desktop/Salah%20Tracker/js/firebase-config.js).
2. Paste your credentials into the `DEFAULT_CONFIG` object.

---

## 7. Migration & Guest Mode

* **Guest / Local-First by Default:** If you choose not to sign in, SalahTrack continues to operate 100% offline using local browser persistence.
* **Cloud Migration:** When you sign in with Google or Email/Password for the first time, SalahTrack automatically prompts:
  > *"Would you like to sync your existing local prayer records to your cloud account?"*
  Selecting yes safely migrates all previous entries to `users/{uid}/prayerDays/{dateKey}` without data loss.
