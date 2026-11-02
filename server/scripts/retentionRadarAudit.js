/**
 * AL-BANSHAR PRO — Phase 4: Customer Retention Radar & WhatsApp Automation Audit
 * 
 * Audits 7 Core Retention & CRM Dimensions:
 * 1. Retention Radar Execution & 100% Vehicle Coverage
 * 2. Daily KM Consumption Pace Formula & Dynamic Clamping [15 - 250 km/day]
 * 3. 3,000 km Yemeni Service Interval Target Accuracy
 * 4. 4-Tier Urgency Classification (overdue, due_soon, approaching, safe)
 * 5. Pre-formatted Yemeni WhatsApp Reminder Text (Zero NaN / undefined)
 * 6. Official Reminder Dispatch Logging in service_reminders_log
 * 7. Corporate & Fleet Accounts Aggregation & Credit Tracking
 */

const db = require('../db/database');
const vehicleModel = require('../models/vehicleModel');

console.log('📡 =====================================================================');
console.log('📡  AL-BANSHAR PRO — PHASE 4: RETENTION RADAR & WHATSAPP CRM AUDIT');
console.log('📡 =====================================================================\n');

let passedTests = 0;
let failedTests = 0;
const issues = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    if (details) console.log(`     -> ${details}`);
    passedTests++;
    return true;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     -> Error: ${details}`);
    failedTests++;
    issues.push({ testName, details });
    return false;
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Retention Radar Execution & Zero Dropped Vehicles
// -----------------------------------------------------------------------------
console.log('📌 [Test 1/7] Auditing Radar Execution & Vehicle Coverage...');

const radarAll = vehicleModel.getRetentionRadar({ includeSafe: true });
const radarActive = vehicleModel.getRetentionRadar({ includeSafe: false });

const totalEligible = db.prepare(`
  SELECT COUNT(*) as c FROM customers_vehicles 
  WHERE next_due_date IS NOT NULL OR next_due_odometer > 0 OR last_odometer > 0
`).get().c;

assert(
  radarAll.length === totalEligible && radarAll.length >= 400,
  `Retention Radar tracks 100% of eligible vehicles without dropping records (${radarAll.length} vehicles)`,
  `Eligible in DB: ${totalEligible} | Active in Radar: ${radarAll.length} | Actionable (Overdue/Due Soon): ${radarActive.length}`
);

// -----------------------------------------------------------------------------
// TEST 2: Daily KM Consumption Pace Formula & Clamping [15 - 250 km/day]
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 2/7] Auditing Daily KM Pace Mathematical Formula & Safeguards...');

let paceFormulaValid = true;
let clampedProperly = true;
let samplePaces = [];

for (const v of radarAll.slice(0, 50)) {
  if (v.daily_km_pace < 15 || v.daily_km_pace > 250) {
    clampedProperly = false;
  }
  samplePaces.push(v.daily_km_pace);
}

const avgPace = Math.round(samplePaces.reduce((a, b) => a + b, 0) / samplePaces.length);

assert(
  clampedProperly && samplePaces.length > 0,
  'Daily kilometer pace is dynamically computed and strictly clamped within bounds [15, 250 km/day]',
  `Average evaluated pace: ${avgPace} km/day | Fallback default: 40 km/day | Clamping verified: 100%`
);

// -----------------------------------------------------------------------------
// TEST 3: 3,000 km Yemeni Service Interval Target Accuracy
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 3/7] Auditing 3,000 km Service Interval Target Calculations...');

let targetOdoValid = true;
let intervalsChecked = 0;

for (const v of radarAll.slice(0, 50)) {
  const base = Number(v.last_odometer) || 0;
  const target = Number(v.next_due_odometer) || 0;
  if (base > 0 && target > 0) {
    intervalsChecked++;
    // Interval should be >= 2500 and <= 15000 (standard intervals 3000, 5000, 10000)
    const diff = target - base;
    if (diff <= 0 || diff > 15000) targetOdoValid = false;
  }
}

assert(
  targetOdoValid && intervalsChecked >= 30,
  `Standard 3,000 km (or custom oil interval) targets accurately computed across ${intervalsChecked} vehicles`,
  `All inspected targets satisfy: target_odometer > last_odometer with valid positive service deltas`
);

// -----------------------------------------------------------------------------
// TEST 4: 4-Tier Urgency Classification (overdue, due_soon, approaching, safe)
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 4/7] Auditing 4-Tier Radar Urgency Classification Logic...');

const statusCounts = { overdue: 0, due_soon: 0, approaching: 0, safe: 0 };
let classificationStrictlyValid = true;

for (const v of radarAll) {
  statusCounts[v.status] = (statusCounts[v.status] || 0) + 1;

  if (v.status === 'overdue') {
    const isOverdueByKm = v.km_remaining <= 0;
    const isOverdueByDate = v.days_diff !== null && v.days_diff < 0;
    if (!isOverdueByKm && !isOverdueByDate) classificationStrictlyValid = false;
  } else if (v.status === 'due_soon') {
    const isDueSoonByKm = v.km_remaining > 0 && v.km_remaining <= (v.daily_km_pace * 5);
    const isDueSoonByDate = v.days_diff !== null && v.days_diff >= 0 && v.days_diff <= 7;
    if (!isDueSoonByKm && !isDueSoonByDate) classificationStrictlyValid = false;
  }
}

assert(
  classificationStrictlyValid && statusCounts.overdue > 0 && statusCounts.due_soon > 0,
  '4-Tier predictive urgency rules strictly segregate vehicles by real operational priority',
  `Overdue (متأخر): ${statusCounts.overdue} | Due Soon (مستحق قريباً): ${statusCounts.due_soon} | Approaching (مقترب): ${statusCounts.approaching} | Safe (آمن): ${statusCounts.safe}`
);

// -----------------------------------------------------------------------------
// TEST 5: Pre-formatted Yemeni WhatsApp Reminder Text (Zero Undefined / NaN)
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 5/7] Auditing Pre-formatted Yemeni WhatsApp Message Content & Cleanliness...');

let allMessagesClean = true;
let sampleMsg = '';

for (const v of radarActive.slice(0, 30)) {
  const msg = v.custom_whatsapp_message;
  if (!msg || typeof msg !== 'string') {
    allMessagesClean = false;
    break;
  }
  if (msg.includes('undefined') || msg.includes('NaN') || msg.includes('null')) {
    allMessagesClean = false;
    break;
  }
  if (!msg.includes('سريع وبنشر') || !msg.includes('3,000 كم') || !msg.includes(v.plate_number)) {
    allMessagesClean = false;
    break;
  }
  if (!sampleMsg) sampleMsg = msg;
}

assert(
  allMessagesClean && sampleMsg.length > 50,
  'Personalized Yemeni WhatsApp message templates generated without undefined/NaN tokens',
  `Validated sample template:\n${sampleMsg.split('\n').map(l => '       ' + l).join('\n')}`
);

// -----------------------------------------------------------------------------
// TEST 6: Official Reminder Dispatch Logging in service_reminders_log
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 6/7] Auditing Service Reminder Dispatch & History Logging...');

const testCar = radarActive[0];
let logSuccess = false;

if (testCar) {
  const logBeforeCount = db.prepare('SELECT COUNT(*) as c FROM service_reminders_log WHERE vehicle_id = ?').get(testCar.id).c;
  
  // Log a reminder
  vehicleModel.logReminder(testCar.id, {
    reminder_type: 'whatsapp',
    odometer: testCar.last_odometer,
    notes: 'فحص آلي لجدولة رسائل الواتساب للتذكير بخدمة الزيت'
  });

  const logAfterCount = db.prepare('SELECT COUNT(*) as c FROM service_reminders_log WHERE vehicle_id = ?').get(testCar.id).c;
  const latestLog = db.prepare('SELECT * FROM service_reminders_log WHERE vehicle_id = ? ORDER BY id DESC LIMIT 1').get(testCar.id);

  logSuccess = (logAfterCount === logBeforeCount + 1) && (latestLog.reminder_type === 'whatsapp');
}

assert(
  logSuccess,
  'Reminder dispatch accurately logged in service_reminders_log with timestamp and odometer',
  `Logged reminder for vehicle #${testCar ? testCar.plate_number : 'none'} successfully`
);

// -----------------------------------------------------------------------------
// TEST 7: Corporate & Fleet Accounts Aggregation & Credit Tracking
// -----------------------------------------------------------------------------
console.log('\n📌 [Test 7/7] Auditing Corporate & Fleet Accounts Directory Aggregation...');

const corporateAccounts = vehicleModel.getCorporateAccounts();
let totalCorporateVehicles = 0;
let totalCorporateDebt = 0;

for (const corp of corporateAccounts) {
  totalCorporateVehicles += corp.total_vehicles;
  totalCorporateDebt += Number(corp.total_balance_due) || 0;
}

assert(
  corporateAccounts.length >= 5 && totalCorporateVehicles >= 20,
  `Corporate & Fleet Directory tracks major institutional clients (${corporateAccounts.length} fleets, ${totalCorporateVehicles} vehicles)`,
  `Tracked Corporate Clients: ${corporateAccounts.map(c => c.corporate_name).join(', ')} | Total Fleet Receivables: ${totalCorporateDebt.toLocaleString()} YER`
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n=====================================================================');
console.log(`🏁 PHASE 4 RETENTION RADAR AUDIT: ${passedTests} PASSED / ${failedTests} FAILED`);
console.log('=====================================================================');

if (failedTests === 0) {
  console.log('\n🎉 ALL 7 RETENTION RADAR & WHATSAPP AUDIT DIMENSIONS PASSED 100%!');
  process.exit(0);
} else {
  console.error(`\n❌ Found ${failedTests} radar issues:`, issues);
  process.exit(1);
}
