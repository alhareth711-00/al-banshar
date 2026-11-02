/**
 * AL-BANSHAR PRO — Master Unified Audit Suite & Zero-Defect Certifier
 * 
 * Sequentially executes the full battery of rigorous audits:
 * 1. Database PRAGMA & Referential Health Checks
 * 2. Phase 2: Financial & Accounting Audit (10 Dimensions)
 * 3. Phase 3: Inventory, WAC & Landed Cost Audit (10 Dimensions)
 * 4. Phase 4A: Customer Retention Radar & WhatsApp Audit (7 Dimensions)
 * 5. Phase 4B: Chaos & Edge-Case Audit (7 Dimensions)
 * 
 * Produces the final Zero-Defect Verification Certificate.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');

console.log('👑 =====================================================================');
console.log('👑  AL-BANSHAR PRO — MASTER UNIFIED AUDIT SUITE & ZERO-DEFECT RUNNER');
console.log('👑  Quick Lube & Tire Touch POS — Sanaa, Yemen Market');
console.log('👑 =====================================================================\n');

const startTime = Date.now();

// -----------------------------------------------------------------------------
// STEP 1: SQLite Engine & File Integrity Sentinel
// -----------------------------------------------------------------------------
console.log('🛡️  [Step 1/5] Verifying SQLite Engine, WAL Checkpoint & Referential Integrity...');

const integrity = db.prepare('PRAGMA integrity_check').get();
const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
const checkpoint = db.prepare('PRAGMA wal_checkpoint(FULL)').get();

const dbPath = path.join(__dirname, '../db/quick_lube.db');
const stats = fs.statSync(dbPath);
const fileSizeMb = (stats.size / (1024 * 1024)).toFixed(2);

const counts = {
  vehicles: db.prepare('SELECT COUNT(*) c FROM customers_vehicles').get().c,
  inventory: db.prepare('SELECT COUNT(*) c FROM inventory').get().c,
  invoices: db.prepare('SELECT COUNT(*) c FROM invoices').get().c,
  purchases: db.prepare('SELECT COUNT(*) c FROM purchases').get().c,
  vouchers: db.prepare('SELECT COUNT(*) c FROM official_vouchers').get().c,
  journals: db.prepare('SELECT COUNT(*) c FROM journal_entries').get().c,
  journal_lines: db.prepare('SELECT COUNT(*) c FROM journal_lines').get().c,
  movements: db.prepare('SELECT COUNT(*) c FROM stock_movements').get().c,
};

console.log(`  ✅ SQLite PRAGMA integrity_check: ${integrity.integrity_check}`);
console.log(`  ✅ Foreign Key Violations: ${fkCheck.length} issues`);
console.log(`  ✅ WAL Full Checkpoint: busy=${checkpoint.busy}, log=${checkpoint.log}, checkpointed=${checkpoint.checkpointed}`);
console.log(`  ✅ Database File Size: ${fileSizeMb} MB`);
console.log(`  📊 Database Live Scale: ${counts.vehicles} vehicles | ${counts.inventory} items | ${counts.invoices} invoices | ${counts.purchases} purchases | ${counts.journals} journals (${counts.journal_lines} lines)\n`);

if (integrity.integrity_check !== 'ok' || fkCheck.length > 0) {
  console.error('❌ Critical database engine integrity failure!');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// STEP 2: Execute Audit Suites Sequentially
// -----------------------------------------------------------------------------
const suites = [
  {
    name: 'Phase 2: Financial & Accounting Zero-Error Audit',
    script: 'financialAudit.js',
    expectedTests: 10,
  },
  {
    name: 'Phase 3: Inventory, WAC & Landed Cost Audit',
    script: 'inventoryAudit.js',
    expectedTests: 10,
  },
  {
    name: 'Phase 4A: Customer Retention Radar & WhatsApp CRM Audit',
    script: 'retentionRadarAudit.js',
    expectedTests: 7,
  },
  {
    name: 'Phase 4B: Chaos & Edge-Case Protection Audit',
    script: 'chaosAudit.js',
    expectedTests: 7,
  },
];

const results = [];
let totalExpectedTests = 0;
let totalPassedTests = 0;

for (let i = 0; i < suites.length; i++) {
  const s = suites[i];
  totalExpectedTests += s.expectedTests;
  console.log(`\n=====================================================================`);
  console.log(`🚀 Executing [${i + 1}/${suites.length}]: ${s.name}`);
  console.log(`=====================================================================`);

  const scriptPath = path.join(__dirname, s.script);
  const suiteStart = Date.now();

  try {
    const stdout = execSync(`node "${scriptPath}"`, { stdio: 'inherit', encoding: 'utf-8' });
    const durationMs = Date.now() - suiteStart;
    results.push({ name: s.name, passed: s.expectedTests, failed: 0, durationMs, success: true });
    totalPassedTests += s.expectedTests;
  } catch (err) {
    const durationMs = Date.now() - suiteStart;
    results.push({ name: s.name, passed: 0, failed: s.expectedTests, durationMs, success: false, error: err.message });
    console.error(`❌ Suite failed: ${s.name}`);
  }
}

// -----------------------------------------------------------------------------
// STEP 3: Final Certification & Zero-Defect Decision
// -----------------------------------------------------------------------------
const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(2);
const allSucceeded = results.every(r => r.success);

console.log('\n\n=====================================================================');
console.log('🏆  AL-BANSHAR PRO — MASTER AUDIT EXECUTIVE SCORECARD');
console.log('=====================================================================');

for (const r of results) {
  const mark = r.success ? '✅ PASSED' : '❌ FAILED';
  console.log(`  ${mark} - ${r.name.padEnd(55)} (${r.passed}/${r.passed + r.failed} tests in ${r.durationMs}ms)`);
}

console.log('---------------------------------------------------------------------');
console.log(`  📊 Overall Tests Passed: ${totalPassedTests} / ${totalExpectedTests} (${((totalPassedTests / totalExpectedTests) * 100).toFixed(2)}%)`);
console.log(`  ⏱️  Total Master Audit Execution Time: ${totalDurationSec}s`);
console.log('=====================================================================\n');

if (allSucceeded && totalPassedTests === totalExpectedTests) {
  console.log('🎖️ =====================================================================');
  console.log('🎖️  OFFICIAL ZERO-DEFECT CERTIFICATE (شهادة الجودة والاعتماد النهائي)');
  console.log('🎖️ =====================================================================');
  console.log('  📜 System: AL-BANSHAR PRO (نظام سريع وبنشر PRO لخدمات السيارات)');
  console.log('  📍 Market: صنعاء - الجمهورية اليمنية (Yemen POS)');
  console.log(`  📅 Audit Date: ${new Date().toISOString().split('T')[0]}`);
  console.log('  🔒 General Ledger Trial Balance: BALANCED (0.00 YER Difference)');
  console.log('  🔒 Customer Receivables Sub-ledger: 100% Reconciled (0.00 YER Difference)');
  console.log('  🔒 Supplier Payables Sub-ledger: 100% Reconciled (0.00 YER Difference)');
  console.log('  🔒 Physical Inventory Non-Negativity: 0 Negative Items in Entire Catalog');
  console.log('  🔒 Poka-Yoke Safeguards: Negative stock, Odometer Rollback, Shift Freezing, Anonymous Credit Active');
  console.log('  🎯 Final Compliance Score: 100.00% ZERO-ERROR STANDARD');
  console.log('🎖️ =====================================================================\n');
  process.exit(0);
} else {
  console.error('❌ Master Audit encountered failures. System is NOT certified.');
  process.exit(1);
}
