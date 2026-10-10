# SalahTrack — Project Architecture & Implementation Plan

> **Document Version:** 1.0.0  
> **Status:** Draft for Review & Approval  
> **Author:** Antigravity (Senior Product Designer, Frontend Engineer, UX Researcher & Software Architect)  
> **Date:** October 10, 2026  

---

## 1. Executive Summary & Product Vision

### 1.1 Product Mission
**SalahTrack** is a peaceful, distraction-free, privacy-first web application designed to help Muslims maintain, track, and reflect upon their five daily obligatory prayers (*Fajr*, *Dhuhr*, *Asr*, *Maghrib*, *Isha*). 

Prayer is an intimate spiritual act between a believer and Allah. The product experience must honor this sanctity:
* **Frictionless:** Recording a prayer takes a single tap (< 2 seconds).
* **Respectful & Non-Shaming:** Missed prayers do not trigger alarmist red badges, negative streaks, or guilt-inducing warnings. Instead, the tone is gentle, dignified, and forward-looking (*"Every prayer is a new beginning"*).
* **Truthful:** No synthetic records, fake streak gamification, or misleading analytics. Every chart and number reflects verified user activity.
* **Private by Default:** All prayer records remain exclusively on the user’s local device unless cloud synchronization is explicitly configured by the user.

### 1.2 UX Research & Target User Insights

| User Segment | Primary Need | UX Friction to Avoid |
| :--- | :--- | :--- |
| **Consistent Worshipper** | Fast confirmation, clean weekly overview, zero visual clutter. | Requiring multi-step dialogs just to mark a prayer complete. |
| **Habit Rebuilder** | Encouraging, non-judgmental tracking, ability to log past prayers without penalty. | Red error banners, guilt-driven broken streak counters, shame-based gamification. |
| **Privacy-Conscious User** | Reassurance that personal devotional habits are not uploaded to ad networks or third parties. | Forced account creation, telemetry trackers, invasive permissions. |
| **Exempt User (e.g. Sister during Hayd/Nifas)** | Ability to mark days or prayer times as excused/exempt so historical consistency metrics are not penalized. | Rigid 5/5 requirement that misrepresents religious practice. |

---

## 2. Design System & Aesthetics

### 2.1 Aesthetic Principles: *Peaceful Islamic Minimalism*
The visual language avoids generic corporate dashboards, garish neon colors, heavy glassmorphism, and AI-templated card overload. Instead, it draws inspiration from classical Islamic manuscripts, refined geometric architectural proportion, and calm organic materials.

* **Palette:**
  * **Deep Emerald & Forest Greens:** Primary accent, signaling tranquility, life, and spiritual heritage.
  * **Warm Ivory & Parchment:** Background in light mode, preventing harsh screen glare and evoking aged paper.
  * **Muted Brass & Subtle Gold:** Secondary accent for active states, completion highlights, and celebratory micro-interactions.
  * **Deep Obsidian & Slate Green:** Dark mode background, maintaining deep contrast while retaining organic warmth.
* **Typography:**
  * **Display / Headings:** Elegant serif or classical letterforms (e.g., *Cinzel* / *Playfair Display* / *Amiri* for Arabic titles).
  * **Body & Interface:** Crisp, highly legible humanist sans-serif (*Plus Jakarta Sans* or *Inter*) with generous letter spacing and line heights.
* **Geometric & Ornamental Details:**
  * Subtle 8-point Islamic star motif (*Khatam*) and geometric arch outlines used sparingly as delicate SVG watermarks or divider accents (opacity < 6%).
* **Motion & Feedback:**
  * Restrained spring transitions (150ms–250ms), soft organic scale pulses upon prayer completion, and tactile haptic-style micro-animations.

### 2.2 Color Token Specifications

```css
:root {
  /* Core Brand Tokens */
  --color-primary: #114232;          /* Deep Forest Emerald */
  --color-primary-light: #1c5d47;
  --color-primary-dark: #0a291f;
  --color-accent-gold: #c5a059;       /* Muted Brass / Antique Gold */
  --color-accent-gold-soft: #f4ecdc;
  
  /* Light Theme Surfaces & Text */
  --color-bg-main: #fbf9f5;          /* Warm Parchment / Ivory */
  --color-bg-surface: #ffffff;       /* Pure Card Surface */
  --color-bg-subtle: #f3efe6;        /* Subtle Border & Chip Fill */
  --color-text-primary: #19231d;     /* Deep Slate Charcoal */
  --color-text-secondary: #57655e;   /* Muted Green-Grey */
  --color-text-tertiary: #87958e;
  --color-border: #e6dfd3;
  --color-success: #1b6a4a;
  
  /* Elevations & Shadows */
  --shadow-sm: 0 1px 3px rgba(17, 66, 50, 0.05);
  --shadow-md: 0 4px 12px rgba(17, 66, 50, 0.08);
  --shadow-lg: 0 8px 24px rgba(17, 66, 50, 0.12);
}

[data-theme="dark"] {
  /* Dark Theme Surfaces & Text */
  --color-bg-main: #0c1410;          /* Deep Obsidian Green */
  --color-bg-surface: #131e18;       /* Dark Emerald Surface */
  --color-bg-subtle: #1c2b23;
  --color-text-primary: #f2f5f3;
  --color-text-secondary: #9cb1a6;
  --color-text-tertiary: #6b8075;
  --color-border: #23352c;
  --color-accent-gold: #d4af37;
  --color-accent-gold-soft: #2e2815;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
}
```

---

## 3. Product Requirements Document (PRD)

### 3.1 Core Features

| ID | Feature | Description & Acceptance Criteria |
| :--- | :--- | :--- |
| **F-01** | **Daily Prayer Tracker** | Fast 1-tap toggling for the 5 obligatory prayers: *Fajr*, *Dhuhr*, *Asr*, *Maghrib*, *Isha*. Tap updates status immediately with instant visual and audio/subtle haptic feedback. |
| **F-02** | **Detailed Status States** | Each prayer supports rich status states: `Completed` (default 1-tap), `On-Time`, `In Jama'ah` (congregation), `Late/Qadha`, or `Excused`. A long-press or settings menu lets power users specify detail without slowing down standard users. |
| **F-03** | **Daily Progress Ring & Metrics** | Real-time calculation of today’s progress: `completedCount / totalObligatory` (e.g. 4/5, 80%). Animated circular ring or calm progress bar with respectful contextual messages (e.g., *"4 of 5 prayers fulfilled today"*). |
| **F-04** | **Historical Calendar & Navigation** | Day-by-day navigation (`< Today >`), direct date-picker input, and a monthly interactive calendar grid displaying historical completion rates per day with discrete dots. Users can view and retroactively edit any past date. |
| **F-05** | **Verifiable Statistics Engine** | Accurate metrics calculated strictly from saved entries: <br>• **Weekly:** 7-day completion rate with day-by-day visual bars.<br>• **Monthly:** Current month vs. previous month completion rates.<br>• **Lifetime:** Total prayers logged, most consistent prayer, overall rate.<br>• **No fake streaks:** Consistency measured encouragingly without punitive streak resets. |
| **F-06** | **Daily Reflection & Notes** | Collapsible rich text or markdown-friendly notes area for each day (e.g., Quran verses read, Khushu' reflections, personal Dua). Auto-saved to current date record. |
| **F-07** | **Theme & Accessibility Controls** | Light, Dark, and System theme toggle with zero flash of unstyled content (FOUC). Full WCAG AA contrast compliance, keyboard focus rings, and screen-reader accessibility labels. |
| **F-08** | **Data Sovereignty & Portability** | • Export full history as formatted `JSON` and `CSV`.<br>• Import and restore history from `JSON` with schema validation.<br>• Wipe data with a two-step confirmation modal. |
| **F-09** | **Future-Ready Cloud & API Adapter** | Modular storage layer with decoupled interface allowing seamless plug-in of Firebase Authentication, Cloud Firestore real-time sync, and external prayer times calculation (Adhan API / offline math). |

---

## 4. Application Architecture & File Structure

### 4.1 Architectural Decision: Vanilla Modular JavaScript (Zero Build Burden)
We recommend **Semantic HTML5, Modern Modular CSS, and Native ES6 JavaScript Modules (`type="module"`)**:
1. **Zero build dependencies:** No mandatory `node_modules`, `webpack`, or `vite` overhead for local testing; opens directly in any modern browser or simple static server.
2. **Beginner maintainable:** Code is readable, organized into distinct single-responsibility files, and easy to modify.
3. **PWA-ready:** Directly cacheable via Service Workers for 100% offline functionality.
4. **Clean abstraction:** All business logic, state handling, and storage interfaces are strictly isolated from DOM rendering. If a migration to React, Vue, or Next.js is desired in the future, the core state, storage, and analytics modules can be reused with zero changes.

### 4.2 Proposed File Structure

```text
Salah Tracker/
│
├── index.html                   # Semantic HTML5 single-page application shell
├── manifest.webmanifest         # PWA metadata for installation on iOS/Android/Desktop
├── sw.js                        # Offline service worker cache controller
├── PROJECT_PLAN.md              # Master project specification & roadmap (this document)
│
├── css/
│   ├── variables.css            # Design tokens (colors, typography, spacing, shadows)
│   ├── base.css                 # CSS reset, box sizing, root typography, layout grid
│   ├── components.css           # Prayer cards, progress indicators, calendar, modals
│   ├── stats.css                # Visual charts, metrics cards, weekly trend bars
│   └── themes.css               # Light, dark, and high-contrast theme overrides
│
├── js/
│   ├── app.js                   # Main application entry point & view orchestration
│   ├── state.js                 # Centralized reactive state store with event subscribers
│   │
│   ├── models/
│   │   ├── prayer-types.js      # Prayer definitions (names, Arabic script, default order)
│   │   └── prayer-record.js     # Record schema validator and factory functions
│   │
│   ├── storage/
│   │   ├── storage-interface.js # Abstract Storage Adapter contract
│   │   ├── local-storage.js     # Default LocalStorage / IndexedDB implementation
│   │   └── firestore-adapter.js # Plug-and-play stub for Firebase Auth & Firestore sync
│   │
│   ├── services/
│   │   ├── stats-service.js     # Weekly, monthly, lifetime analytics computations
│   │   ├── prayer-times.js      # Future prayer times provider (Adhan API / offline math)
│   │   └── export-service.js    # JSON / CSV export and JSON validation importer
│   │
│   ├── utils/
│   │   ├── date-utils.js        # Gregorian and Hijri date formatting and calculations
│   │   └── dom-utils.js         # Safe DOM rendering, sanitization, and modal helpers
│   │
│   └── components/
│       ├── prayer-card.js       # Individual prayer toggle card component
│       ├── progress-ring.js     # Animated SVG progress ring / status bar
│       ├── calendar-view.js     # Interactive month calendar grid component
│       ├── stats-view.js        # Analytics cards and charts renderer
│       ├── notes-view.js        # Daily spiritual reflection textarea component
│       └── settings-modal.js    # Settings, theme, and data management modal
│
└── assets/
    ├── icons/                   # Crisp SVG icons (fajr, dhuhr, asr, maghrib, isha, check, etc.)
    └── patterns/                # Lightweight Islamic geometric SVG background accents
```

---

## 5. Data Model & Completion Logic

### 5.1 Canonical Data Schema

```typescript
// Keyed in Storage by ISO Date string: "YYYY-MM-DD"
interface DailyPrayerRecord {
  date: string;               // e.g. "2026-10-10"
  prayers: {
    fajr: PrayerStatusDetail;
    dhuhr: PrayerStatusDetail;
    asr: PrayerStatusDetail;
    maghrib: PrayerStatusDetail;
    isha: PrayerStatusDetail;
  };
  note?: string;              // Optional daily spiritual reflection
  isExempt?: boolean;         // True if user is religiously exempt on this date
  updatedAt: string;          // ISO 8601 Timestamp
}

interface PrayerStatusDetail {
  completed: boolean;         // Core boolean (true = fulfilled)
  status: 'completed' | 'on_time' | 'jamaah' | 'late' | 'excused' | 'none';
  completedAt?: string;       // ISO 8601 Timestamp of completion
}

interface UserSettings {
  theme: 'system' | 'light' | 'dark';
  firstDayOfWeek: 0 | 1 | 6;   // 0 = Sunday, 1 = Monday, 6 = Saturday
  allowDetailedStatus: boolean; // Enables Jama'ah / On-Time distinctions
  calculationMethod?: string;  // Future prayer time calculation method
  location?: {                 // Future prayer time coordinates
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}
```

### 5.2 Completion Logic Rules
1. **Daily Completion Score:**  
   $$\text{Daily Completion} = \frac{\sum \text{Completed Obligatory Prayers}}{\text{Total Obligatory Prayers (default 5)}} \times 100\%$$
   * If a day is marked `isExempt: true`, the day is treated neutrally and excluded from calculating missed ratios.
2. **Weekly Performance:** Calculated as the actual count of completed prayers in the 7-day rolling window divided by 35 (or active obligatory count).
3. **Lifetime & Monthly Calculations:**  
   * Derived by scanning actual saved day records in the date index.
   * Days with no entry prior to the user's first logged date are ignored (users are not back-penalized for dates before they started using the app).
4. **Editable Past Days:**  
   * Changing a prayer state on a past date triggers an immediate cache invalidation and recalculation of analytics for that period.

---

## 6. Edge Cases, Security & Privacy Analysis

### 6.1 Edge Cases & Mitigation Strategies

| Scenario | Risk | Mitigation Strategy |
| :--- | :--- | :--- |
| **Midnight Rollover** | User keeps the app open past 11:59 PM; actions might log to the previous day without notice. | App listens to visibility change and periodic tick. When calendar day changes, user is gently alerted or date auto-advances if viewing "Today". |
| **Timezone Shifts & Travel** | ISO strings without careful local date splitting can cause dates to jump or offset by $\pm 1$ day. | Always store keys in explicit local date format (`YYYY-MM-DD`) derived from the local timezone rather than raw UTC `toISOString().split('T')[0]`. |
| **Storage Quota & Eviction** | Browser clears `localStorage` during storage cleanup or in private browsing mode. | Implement `navigator.storage.persist()` request; prominently display export/backup options; store lightweight JSON backups. |
| **Exemptions (Hayd / Illness)** | Rigid 5/5 expectation discourages sisters or sick individuals, distorting streaks. | Provide an optional "Exempt / Excused" toggle per day that preserves historical consistency gracefully. |
| **Malformed Import File** | User imports an invalid JSON or malicious file. | Rigorous JSON schema validation on import with error reporting; reject unvalidated fields before storing. |

### 6.2 Security & Data Privacy Assurance
1. **Zero External Tracking:** No Google Analytics, no third-party ad pixels, and no telemetry cookies.
2. **XSS Protection:** All user-entered daily notes and custom text are strictly sanitized using safe DOM text bindings (`textContent` instead of `innerHTML`).
3. **Content Security Policy (CSP):** Strict CSP meta tag forbidding untrusted script execution.
4. **Cloud Migration Security:** If Firebase is enabled in the future, Firestore security rules will enforce:
   ```javascript
   match /users/{userId}/prayers/{date} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
   }
   ```

---

## 7. Implementation Plan in Testable Phases

### Phase 1: Design Tokens, Layout & Accessibility Shell
* Setup semantic `index.html` structure (Header with Hijri/Gregorian date, Main Dashboard, Navigation, Modals).
* Build design token system in `css/variables.css` & `css/base.css` with emerald/ivory/gold palettes.
* Implement light and dark theme switching with system auto-detection and persistence.
* **Verification:** Visual review in desktop, tablet, and mobile viewport widths.

### Phase 2: State Management & Core Daily Tracker
* Implement reactive `state.js` store and `local-storage.js` adapter.
* Build the 5 prayer cards (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`) with quick 1-tap completion toggles.
* Render real-time circular progress indicator and completed count badge (e.g., "3 of 5 completed").
* Implement optional daily spiritual reflection note-taking with auto-save.
* **Verification:** Toggling prayers updates progress instantly and persists across page reloads.

### Phase 3: Date Navigation & Interactive Calendar
* Implement `< Previous Day`, `Next Day`, and `Today` quick navigation bar.
* Build interactive monthly calendar drawer/modal with completion indicators per date.
* Enable full retroactive editing of past dates with immediate state sync.
* Support marking a day as exempt or excused.
* **Verification:** Navigate to yesterday, log 5 prayers, return to today, verify yesterday's data remains preserved.

### Phase 4: True-Data Statistics & Analytics Engine
* Build `stats-service.js` calculating weekly trends (7-day bar breakdown), monthly totals, and lifetime counts.
* Render clean, non-gamified statistics view.
* Show breakdown by prayer (e.g. Fajr consistency vs. Dhuhr consistency).
* **Verification:** Input known prayer patterns across 14 test days and verify statistical accuracy down to 0.1%.

### Phase 5: Settings, Data Sovereignty & Portability
* Build Settings modal with theme selector, first-day-of-week choice, and detailed prayer status toggle.
* Implement full JSON export and CSV export functionality.
* Implement robust JSON file import with schema validation and safety checks.
* Implement "Clear All Data" with double confirmation modal.
* **Verification:** Export dataset, clear storage, re-import JSON, and verify 100% data fidelity.

### Phase 6: PWA Support & Future-Ready Architecture Stubs
* Add `manifest.webmanifest` and service worker (`sw.js`) for full offline mobile installation.
* Add abstract `storage-interface.js` and `firestore-adapter.js` documentation stub.
* Add `prayer-times.js` adapter stub with interface for AlAdhan API or offline calculation (Adhan.js).
* **Verification:** App installs cleanly as standalone PWA and runs in airplane mode.

---

## 8. External Services vs. Local Capabilities

| Feature Component | Local (Zero Configuration) | External Service / Configuration Required |
| :--- | :---: | :---: |
| **Daily Prayer Logging** | **Yes (100% Local)** | None |
| **Progress & Statistics Engine** | **Yes (100% Local)** | None |
| **Calendar & Past Records** | **Yes (100% Local)** | None |
| **Daily Reflection Notes** | **Yes (100% Local)** | None |
| **Light / Dark Themes** | **Yes (100% Local)** | None |
| **JSON / CSV Export & Import** | **Yes (100% Local)** | None |
| **Offline PWA Installation** | **Yes (100% Local)** | None |
| **Multi-Device Sync (Future)** | No | Requires Firebase Project config (`apiKey`, `projectId`) |
| **Automatic Adhan / Prayer Times (Future)** | No | Requires Geolocation permission and AlAdhan API or Adhan.js library |
| **Push Notifications (Future)** | No | Requires Notification permission & Web Push service |

---

## 9. Next Steps & Approval Request
This plan delivers a production-grade, dignified, and architecturally resilient Salah tracker tailored to the user's specific guidelines.

**Awaiting user approval before proceeding to Phase 1 implementation.**
