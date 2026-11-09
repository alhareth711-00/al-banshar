const assert = require('assert');
const XLSX = require('xlsx');
const db = require('./db/database');
const excelEngine = require('./utils/excelImportEngine');

console.log('🧪 Starting Excel / CSV Catalog Import End-to-End Tests...\n');

// Pre-cleanup in case of previous runs
db.prepare("DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE ref_type = 'opening_balance' AND description LIKE '%SKU-TEST-%')").run();
db.prepare("DELETE FROM journal_entries WHERE ref_type = 'opening_balance' AND description LIKE '%SKU-TEST-%'").run();
db.prepare("UPDATE inventory SET stock_qty = 0 WHERE sku LIKE 'SKU-TEST-%'").run();
db.prepare("DELETE FROM inventory WHERE sku LIKE 'SKU-TEST-%'").run();

// 1. Test Template Generation
const templateBuf = excelEngine.generateTemplateBuffer();
assert(templateBuf && templateBuf.length > 1000, 'Template buffer must be valid');
console.log('✅ Test 1: Template buffer generated successfully (size:', templateBuf.length, 'bytes)');

// 2. Test Reading and Validating Custom Spreadsheet with Mock Items
const testWb = XLSX.utils.book_new();
const testData = [
  ['اسم الصنف', 'الفئة', 'الماركة', 'اللزوجة أو المقاس', 'رمز SKU', 'الباركود', 'سعر التكلفة', 'سعر البيع', 'الرصيد الافتتاحي'],
  ['زيت شل هيلكس HX7 10W-40', 'زيت', 'شل', '10W-40', 'SKU-TEST-SHL1040', '998877665544', 3800, 4800, 24],
  ['فلتر نيسان باترول تجاري', 'فلتر', 'نيسان', '', 'SKU-TEST-FLTNIS', '112233445566', 1200, 1800, 15],
  ['صنف بفئة خاطئة', 'غير_معروفة', 'عام', '', 'SKU-ERR', '334455', 100, 200, 1],
  ['أجرة مصنعية غيار زيت وفلتر', 'خدمة', 'عام', '', 'SRV-OIL-CHG', 'SRV001', 0, 1000, 0], // Existing in DB (must be skipped)
];
const testWs = XLSX.utils.aoa_to_sheet(testData);
XLSX.utils.book_append_sheet(testWb, testWs, 'Sheet1');
const testBuf = XLSX.write(testWb, { type: 'buffer', bookType: 'xlsx' });

const preview = excelEngine.parseAndValidate(testBuf, db);
console.log('✅ Test 2: Preview Summary:', preview.summary);

assert.strictEqual(preview.summary.totalRows, 4, 'Should parse 4 rows');
assert.strictEqual(preview.summary.validNewCount, 2, 'Should have 2 valid new items');
assert.strictEqual(preview.summary.skippedDuplicateCount, 1, 'Should skip 1 existing duplicate item');
assert.strictEqual(preview.summary.errorCount, 1, 'Should detect 1 error row');

// Verify opening stock calculations:
// Row 1: 24 * 3800 = 91,200
// Row 2: 15 * 1200 = 18,000
// Total: 109,200
assert.strictEqual(preview.summary.totalOpeningCost, 109200, 'Opening cost calculation must be exact');

// 3. Test Commit / Import Transaction
const validItems = preview.rows.filter((r) => r.status === 'valid_new');
const commitResult = excelEngine.commitImport(validItems, db);
console.log('✅ Test 3: Commit Result:', commitResult);

assert.strictEqual(commitResult.importedCount, 2, 'Should import 2 items');
assert.strictEqual(commitResult.openingEntriesCount, 2, 'Should post 2 journal entries');
assert.strictEqual(commitResult.totalCommittedCost, 109200, 'Total committed opening cost match');

// 4. Verify in Database
const rowInDb = db.prepare('SELECT * FROM inventory WHERE sku = ?').get('SKU-TEST-SHL1040');
assert(rowInDb, 'Imported item must exist in DB');
assert.strictEqual(rowInDb.stock_qty, 24, 'Stock quantity must match');
assert.strictEqual(rowInDb.cost_price, 3800, 'Cost price must match');
console.log('✅ Test 4: Database row verified:', rowInDb.name, '| Stock:', rowInDb.stock_qty);

// 5. Verify General Ledger Balance (Trial Balance Parity: Total Debits == Total Credits)
const ledgerTotals = db.prepare(`
  SELECT 
    ROUND(SUM(debit), 2) as total_debit,
    ROUND(SUM(credit), 2) as total_credit
  FROM journal_lines
`).get();
console.log('✅ Test 5: General Ledger Parity check -> Total Debits:', ledgerTotals.total_debit, '| Total Credits:', ledgerTotals.total_credit);
assert.strictEqual(ledgerTotals.total_debit, ledgerTotals.total_credit, 'General ledger debits must strictly equal credits!');

// Cleanup test items to keep db clean
db.prepare("DELETE FROM journal_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE ref_type = 'opening_balance' AND ref_number LIKE 'OB-INV-%' AND description LIKE '%SKU-TEST-%')").run();
db.prepare("DELETE FROM journal_entries WHERE ref_type = 'opening_balance' AND description LIKE '%SKU-TEST-%'").run();
db.prepare("UPDATE inventory SET stock_qty = 0 WHERE sku LIKE 'SKU-TEST-%'").run();
db.prepare("DELETE FROM inventory WHERE sku LIKE 'SKU-TEST-%'").run();
console.log('🧹 Test cleanup completed.');

console.log('\n🎉 ALL 5 EXCEL IMPORT TESTS PASSED 100% PERFECTLY!\n');
