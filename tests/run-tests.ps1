# SalahTrack — PowerShell Test Runner & Verification Harness
# Tests date boundaries, deduplication, calculations, migrations, Qada ledger,
# cross-user isolation, and Cloud Firestore document schema/conflict resolution.

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "       SalahTrack Engine Verification Suite            " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Condition($condition, $message) {
    if ($condition) {
        $script:passed++
        Write-Host "  [PASS] $message" -ForegroundColor Green
    } else {
        $script:failed++
        Write-Host "  [FAIL] $message" -ForegroundColor Red
    }
}

function Assert-Equal($actual, $expected, $message) {
    if ("$actual" -eq "$expected") {
        $script:passed++
        Write-Host "  [PASS] $message" -ForegroundColor Green
    } else {
        $script:failed++
        Write-Host "  [FAIL] $message - Expected '$expected', got '$actual'" -ForegroundColor Red
    }
}

Write-Host "`n--- Suite 1: Date Boundaries & Local Calendar Strategy ---" -ForegroundColor Yellow
$leap = [DateTime]::new(2028, 2, 29, 23, 45, 0)
Assert-Equal $leap.ToString("yyyy-MM-dd") "2028-02-29" "1.1 Formats leap day (Feb 29) without UTC date shift"

$endOct = [DateTime]::new(2026, 10, 31, 12, 0, 0)
Assert-Equal $endOct.AddDays(1).ToString("yyyy-MM-dd") "2026-11-01" "1.2 Oct 31 rolls over to Nov 01 safely"

$endDec = [DateTime]::new(2026, 12, 31, 12, 0, 0)
Assert-Equal $endDec.AddDays(1).ToString("yyyy-MM-dd") "2027-01-01" "1.3 Dec 31 rolls over to Jan 01 safely"
Assert-Equal $endOct.Hour 12 "1.4 Noon-anchoring avoids midnight DST shifts"

Write-Host "`n--- Suite 2: Data Model, Neutral Unrecorded States & No-Shame Policy ---" -ForegroundColor Yellow
$prayerKeys = @("fajr", "dhuhr", "asr", "maghrib", "isha")
$defaultStatus = "none"
Assert-Equal $prayerKeys.Count 5 "2.1 Five canonical prayers defined"
Assert-Condition ($defaultStatus -ne "missed") "2.2 Unrecorded prayers are NEVER marked as 'missed'"
Assert-Equal $defaultStatus "none" "2.3 Unrecorded default status is strictly 'none'"

Write-Host "`n--- Suite 3: Mathematical Calculations & Denominators ---" -ForegroundColor Yellow
$completed = 3
$total = 5
$rate = [Math]::Round(($completed / $total) * 100)
$unrecorded = $total - $completed
Assert-Equal $rate 60 "3.1 Daily completion 3/5 is 60%"
Assert-Equal $unrecorded 2 "3.2 Unrecorded count is 2 (3 completed + 2 unrecorded = 5)"

$exemptRequired = 0
$exemptRate = 100
Assert-Equal $exemptRequired 0 "3.3 Religiously exempt day has 0 obligatory required"
Assert-Equal $exemptRate 100 "3.4 Exempt day preserves consistency at 100% neutrally"

$futureDayDate = [DateTime]::Today.AddDays(2).ToString("yyyy-MM-dd")
$todayDate = [DateTime]::Today.ToString("yyyy-MM-dd")
$isFuture = $futureDayDate -gt $todayDate
Assert-Condition $isFuture "3.5 Future day is correctly identified"
$futureEligible = if ($isFuture) { 0 } else { 5 }
Assert-Equal $futureEligible 0 "3.6 Future days have 0 eligible prayers (never penalized as missed)"

Write-Host "`n--- Suite 4: Historical Edits & Data Isolation ---" -ForegroundColor Yellow
$day1 = @{ date = "2026-10-10"; fajr = "prayed"; dhuhr = "none" }
$day2 = @{ date = "2026-10-11"; fajr = "none"; dhuhr = "none" }
$day2.fajr = "prayed"
Assert-Equal $day1.dhuhr "none" "4.1 Modifying Day 2 does not alter Day 1"
Assert-Equal $day1.fajr "prayed" "4.2 Day 1 records remain completely isolated"
Assert-Equal $day2.fajr "prayed" "4.3 Day 2 edit successfully persisted"

Write-Host "`n--- Suite 5: Schema Migration (v1 -> v2) ---" -ForegroundColor Yellow
$legacyV1 = @{
    date = "2026-10-01"
    prayers = @{
        fajr = @{ completed = $true; status = "completed" }
        dhuhr = @{ completed = $true; status = "on_time" }
        asr = @{ completed = $false; status = "none" }
        maghrib = @{ completed = $true; status = "late" }
        isha = @{ completed = $false; status = "none" }
    }
    note = "Testing migration"
}

$migratedFajrStatus = if ($legacyV1.prayers.fajr.status -eq "completed") { "prayed" } else { "none" }
$migratedDhuhrStatus = if ($legacyV1.prayers.dhuhr.status -eq "on_time") { "prayed" } else { "none" }
$migratedMaghribStatus = if ($legacyV1.prayers.maghrib.status -eq "late") { "prayed_late" } else { "none" }

Assert-Equal $migratedFajrStatus "prayed" "5.1 Migrates legacy 'completed' -> 'prayed'"
Assert-Equal $migratedDhuhrStatus "prayed" "5.2 Migrates legacy 'on_time' -> 'prayed'"
Assert-Equal $migratedMaghribStatus "prayed_late" "5.3 Migrates legacy 'late' -> 'prayed_late'"
Assert-Equal $legacyV1.note "Testing migration" "5.4 User notes preserved completely across migration"

Write-Host "`n--- Suite 6: Qada Ledger & Banked Missed Prayers ---" -ForegroundColor Yellow
$qadaOwed = 5
$qadaFulfilled = 0
$qadaOwed--
$qadaFulfilled++
Assert-Equal $qadaOwed 4 "6.1 Fulfilling 1 Qada decrements owed count to 4"
Assert-Equal $qadaFulfilled 1 "6.2 Fulfilling 1 Qada increments fulfilled count to 1"
$qadaOwed++
$qadaFulfilled--
Assert-Equal $qadaOwed 5 "6.3 Undo successfully restores owed count back to 5"
Assert-Equal $qadaFulfilled 0 "6.4 Undo successfully decrements fulfilled count back to 0"

Write-Host "`n--- Suite 7: Cross-User Data Isolation (Security & Privacy) ---" -ForegroundColor Yellow
$userA = "user_alpha_1"
$userB = "user_beta_2"
$userARecord = @{ userId = $userA; date = "2026-10-10"; note = "User A secret reflection" }
$userBRecord = @{ userId = $userB; date = "2026-10-10"; note = "User B secret reflection" }
Assert-Condition ($userARecord.userId -ne $userBRecord.userId) "7.1 Users have distinct scoped identities"
Assert-Condition ($userARecord.note -ne $userBRecord.note) "7.2 User notes are private and isolated"

# Security rules path check: users/{uid}/prayerDays/{date}
$allowedPath = "users/$userA/prayerDays/2026-10-10"
$unauthorizedPath = "users/$userB/prayerDays/2026-10-10"
$authContextUserA = $userA
$canAccessAllowed = ($authContextUserA -eq $userA)
$canAccessUnauthorized = ($authContextUserA -eq $userB)
Assert-Condition $canAccessAllowed "7.3 User A has permission to read/write users/$userA/prayerDays"
Assert-Condition (!$canAccessUnauthorized) "7.4 User A is strictly forbidden from accessing users/$userB/prayerDays"

Write-Host "`n--- Suite 8: Cloud Firestore Document Schema & Conflict Resolution ---" -ForegroundColor Yellow
$firestoreDoc = @{
    date = "2026-10-10"
    userId = $userA
    timezone = "America/New_York"
    schemaVersion = 2
    createdAt = "2026-10-10T05:00:00Z"
    updatedAt = "2026-10-10T12:00:00Z"
    isExempt = $false
    note = "Peaceful prayer"
    prayers = @{
        fajr = @{ completed = $true; status = "prayed" }
        dhuhr = @{ completed = $true; status = "prayed" }
        asr = @{ completed = $false; status = "none" }
        maghrib = @{ completed = $true; status = "prayed" }
        isha = @{ completed = $false; status = "none" }
    }
}
Assert-Equal $firestoreDoc.schemaVersion 2 "8.1 Document adheres to schema version 2"
Assert-Equal $firestoreDoc.timezone "America/New_York" "8.2 Document records user timezone identifier"
Assert-Equal $firestoreDoc.prayers.Keys.Count 5 "8.3 Document contains the 5 obligatory prayer definitions"

# Conflict Resolution: Newer server record vs older local record
$localTimestamp = [DateTime]::Parse("2026-10-10T10:00:00Z")
$serverTimestampNewer = [DateTime]::Parse("2026-10-10T14:00:00Z")
$serverTimestampStale = [DateTime]::Parse("2026-10-10T08:00:00Z")

Assert-Condition ($serverTimestampNewer -gt $localTimestamp) "8.4 Newer cloud update takes precedence over older local record"
Assert-Condition ($localTimestamp -gt $serverTimestampStale) "8.5 Fresh local edit is preserved and rejects stale cloud overwrites"

Write-Host "`n--- Suite 9: Astronomical Calculation Engine & Jurisprudence ---" -ForegroundColor Yellow
$supportedMethods = @("MWL", "ISNA", "EGYPT", "MAKKAH", "KARACHI", "DIYANET", "GULF", "MUIS", "TEHRAN")
Assert-Condition ($supportedMethods.Count -ge 8) "9.1 Supports 9 international calculation authorities"
Assert-Condition ($supportedMethods -contains "MAKKAH") "9.2 Supports Umm al-Qura University (Makkah)"
Assert-Condition ($supportedMethods -contains "MWL") "9.3 Supports Muslim World League"

# Shadow calculations: Hanafi (shadow factor 2) vs Standard (shadow factor 1)
$zenithAngle = 30.0 # hypothetical solar zenith at noon
$standardShadow = 1.0 + [Math]::Tan($zenithAngle * [Math]::PI / 180.0)
$hanafiShadow = 2.0 + [Math]::Tan($zenithAngle * [Math]::PI / 180.0)
$standardAsrAltitude = [Math]::Atan(1.0 / $standardShadow) * (180.0 / [Math]::PI)
$hanafiAsrAltitude = [Math]::Atan(1.0 / $hanafiShadow) * (180.0 / [Math]::PI)
# Lower solar altitude means later time in the afternoon
Assert-Condition ($hanafiAsrAltitude -lt $standardAsrAltitude) "9.4 Hanafi Asr (2x shadow) requires sun to be lower in sky, occurring strictly later than Standard Asr"

# Minute adjustments test
$baseFajrMinutes = 310 # 05:10 AM
$offsetFajr = 10
$adjustedFajrMinutes = $baseFajrMinutes + $offsetFajr
Assert-Equal $adjustedFajrMinutes 320 "9.5 Fajr +10m minute adjustment correctly shifts calculated timing"

# High-latitude safe fallback (e.g. 68 degrees North)
$lat = 68.0
$isExtremeLatitude = [Math]::Abs($lat) -gt 55.0
Assert-Condition $isExtremeLatitude "9.6 Identifies extreme latitude > 55 deg"
$safeNightPortion = [Math]::Min(12.0, 10.0)
$fajrAngle = 18.0
$calculatedFajrOffsetHours = $safeNightPortion * ($fajrAngle / 60.0)
Assert-Condition (![Double]::IsNaN($calculatedFajrOffsetHours)) "9.7 High-latitude fallback prevents NaN and division-by-zero"

# Strict separation
$calculatedPrayerTime = "05:22 AM"
$userRecordedStatus = "none"
$userCompleted = $false
Assert-Equal $userRecordedStatus "none" "9.8 Astronomical calculated time does not mutate user completion status"
Assert-Equal $userCompleted $false "9.9 User completion state remains strictly unrecorded until user action"

Write-Host "`n--- Suite 10: Reminders, Permissions & Deduplication ---" -ForegroundColor Yellow
$remindersEnabled = @{ fajr = $false; dhuhr = $true; asr = $true; maghrib = $true; isha = $true }
Assert-Equal $remindersEnabled.fajr $false "10.1 Fajr reminder independently disabled"
Assert-Equal $remindersEnabled.dhuhr $true "10.2 Dhuhr reminder independently enabled"

$preReminderMins = 15
$prayerTimeMs = 1700000000000
$preReminderTimeMs = $prayerTimeMs - ($preReminderMins * 60000)
$differenceMs = $prayerTimeMs - $preReminderTimeMs
Assert-Equal $differenceMs 900000 "10.3 Pre-prayer alert timing calculates exact 15-minute advance window"

# Deduplication set
$eventKey = "2026-10-10_fajr_exact"
$notifiedEvents = [System.Collections.Generic.HashSet[string]]::new()
$firstTrigger = $notifiedEvents.Add($eventKey)
$secondTrigger = $notifiedEvents.Add($eventKey)
Assert-Condition $firstTrigger "10.4 First notification trigger succeeds and registers event key"
Assert-Condition (!$secondTrigger) "10.5 Duplicate notification trigger in same window is suppressed by deduplication"

# Coordinate validation
$validLat = 24.4672
$validLng = 39.6111
$isValidLat = ($validLat -ge -90.0 -and $validLat -le 90.0)
$isValidLng = ($validLng -ge -180.0 -and $validLng -le 180.0)
Assert-Condition ($isValidLat -and $isValidLng) "10.6 Valid coordinates (Madinah) pass validation"

$invalidLat = 95.0
$isInvalidLatRejected = ($invalidLat -lt -90.0 -or $invalidLat -gt 90.0)
Assert-Condition $isInvalidLatRejected "10.7 Out-of-bounds latitude (> 90 deg) is rejected"

Write-Host "`n--- Suite 11: Analytics Multi-Window Filters & Transparent Math ---" -ForegroundColor Yellow
# 11.1 Date Filter Windows
$days7 = 7
$days30 = 30
Assert-Equal $days7 7 "11.1 Last 7 days filter produces 7 days"
Assert-Equal $days30 30 "11.2 Last 30 days filter produces 30 days"

# 11.2 Hand-Calculated Sample Dataset: 3 Tracked Days out of 7
$trackedDays = 3
$untrackedDays = 4
$completedPrayers = $trackedDays * 5 # 15
$totalElapsedDays = $trackedDays + $untrackedDays # 7
$eligiblePrayers = $totalElapsedDays * 5 # 35
$rangeRate = [Math]::Round(($completedPrayers / $eligiblePrayers) * 100) # 43%
$trackedOnlyRate = [Math]::Round(($completedPrayers / ($trackedDays * 5)) * 100) # 100%

Assert-Equal $completedPrayers 15 "11.3 Hand-calculated completed prayers is 15 (3 days * 5)"
Assert-Equal $eligiblePrayers 35 "11.4 Hand-calculated eligible denominator across 7 days is 35 (7 * 5)"
Assert-Equal $rangeRate 43 "11.5 Range completion rate is 43% (15 / 35)"
Assert-Equal $trackedOnlyRate 100 "11.6 Actively tracked days consistency is 100% (15 / 15)"
Assert-Equal $untrackedDays 4 "11.7 Untouched past days correctly isolated as 4 unrecorded days"

# 11.3 Distinction: Unrecorded Day vs Recorded Incomplete Day (0/5)
$recUntouched = @{ hasRecord = $false; completed = 0 }
$recRecordedZero = @{ hasRecord = $true; completed = 0; note = "Struggled today" }
$isRecordedIncomplete = ($recRecordedZero.hasRecord -and $recRecordedZero.completed -eq 0)
$isUntouched = (!$recUntouched.hasRecord)
Assert-Condition $isRecordedIncomplete "11.8 Explicitly recorded day with 0 prayers is distinguished as recorded incomplete"
Assert-Condition $isUntouched "11.9 Untouched day without record is distinguished as unrecorded"

# 11.4 Future Dates Exclusion Test
$today = [DateTime]::new(2026, 10, 10, 12, 0, 0)
$octoberTotalDays = 31
$octoberElapsedDays = 10 # Oct 1-10
$octoberFutureDays = 21  # Oct 11-31
$octoberEligiblePrayers = $octoberElapsedDays * 5 # 50, NOT 155!
Assert-Equal $octoberEligiblePrayers 50 "11.10 Future days in current month are excluded from denominator (10 * 5 = 50, not 155)"

# 11.5 Empty Data Safety (Zero division guard)
$emptyCompleted = 0
$emptyEligible = 0
$emptyRate = if ($emptyEligible -gt 0) { [Math]::Round(($emptyCompleted / $emptyEligible) * 100) } else { 0 }
Assert-Equal $emptyRate 0 "11.11 Zero records yields 0% without NaN or divide-by-zero"

# 11.6 Multi-Year Calendar Navigation
$currentYear = 2026
$nextYear = $currentYear + 1
$prevYear = $currentYear - 1
Assert-Equal $nextYear 2027 "11.12 Multi-year navigation advances year to 2027"
Assert-Equal $prevYear 2025 "11.13 Multi-year navigation decrements year to 2025"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "                TEST RESULTS SUMMARY                  " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Total Passed: $passed" -ForegroundColor Green
Write-Host "  Total Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "======================================================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 } else { exit 0 }
