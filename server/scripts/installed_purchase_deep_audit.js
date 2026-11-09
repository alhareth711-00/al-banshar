const path = require('path');
const fs = require('fs');

// Target installed client database
const appData = process.env.APPDATA;
const installedDbPath = path.join(appData, 'AlBanshar', 'db', 'quick_lube.db');
if (!fs.existsSync(installedDbPath)) {
  console.error('[FAIL] Installed DB does not exist at:', installedDbPath);
  process.exit(1);
}

process.env.DB_PATH = installedDbPath;

const Database = require('better-sqlite3');
const db = require('../db/database');
const purchaseModel = require('../models/purchaseModel');
const purchaseReturnModel = require('../models/purchaseReturnModel');
const supplierModel = require('../models/supplierModel');
const { roundMoney, safeNum, calcWAC } = require('../utils/mathPrecision');

const AUDIT_RESULTS = {
  timestamp: new Date().toISOString(),
  db_path: installedDbPath,
  scenarios: [],
  guards: [],
  critical_issues: [],
  warnings: [],
};

function logHeader(title) {
  console.log('\n============================================================');
  console.log(`>>> ${title}`);
  console.log('============================================================');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ [FAIL]: ${message}`);
    AUDIT_RESULTS.critical_issues.push(message);
    throw new Error(message);
  } else {
    console.log(`  ✅ [PASS]: ${message}`);
  }
}

async function runPurchaseDeepAudit() {
  logHeader('بدء الفحص المعملي العميق لدورة مشتريات وسلاسل إمداد الزيوت وحساب WAC');
  console.log('المسار المفحوص:', installedDbPath);

  // -------------------------------------------------------------
  // STEP 0: Check Suppliers & Products
  // -------------------------------------------------------------
  logHeader('الخطوة 0: فحص الموردين والأصناف الجاهزة للاختبار');
  // Reset initial test state idempotently in correct FK order
  db.prepare("DELETE FROM purchase_return_items WHERE return_id IN (SELECT id FROM purchase_returns WHERE reason LIKE '%فحص معملي%')").run();
  db.prepare("DELETE FROM purchase_returns WHERE reason LIKE '%فحص معملي%'").run();
  db.prepare("DELETE FROM purchase_items WHERE purchase_id IN (SELECT id FROM purchases WHERE notes LIKE '%فحص معملي%')").run();
  
  const testPurchases = db.prepare("SELECT id FROM purchases WHERE notes LIKE '%فحص معملي%'").all();
  for (const tp of testPurchases) {
    const jes = db.prepare("SELECT id FROM journal_entries WHERE ref_type = 'purchase' AND ref_id = ?").all(tp.id);
    for (const je of jes) {
      db.prepare("DELETE FROM journal_lines WHERE journal_entry_id = ?").run(je.id);
      db.prepare("DELETE FROM journal_entries WHERE id = ?").run(je.id);
    }
  }

  db.prepare("DELETE FROM purchases WHERE notes LIKE '%فحص معملي%'").run();
  db.prepare("DELETE FROM supplier_payment_vouchers WHERE notes LIKE '%فحص معملي%'").run();
  db.prepare("DELETE FROM official_vouchers WHERE notes LIKE '%فحص معملي%'").run();
  db.prepare("DELETE FROM stock_movements WHERE notes LIKE '%فاتورة (PUR-%' OR notes LIKE '%مرتجع بضاعة لمورد%'").run();
  db.prepare("DELETE FROM daily_transactions WHERE description LIKE '%(PUR-%' OR description LIKE '%سداد دفعة حساب للمورد%'").run();
  db.prepare("UPDATE inventory SET stock_qty = 10, cost_price = 22000 WHERE id = 1").run();
  db.prepare("UPDATE inventory SET stock_qty = 23, cost_price = 5800 WHERE id = 2").run();
  db.prepare("UPDATE suppliers SET balance_due = 120000 WHERE id = 1").run();

  let supplier = db.prepare('SELECT * FROM suppliers WHERE id = 1').get();
  assert(Boolean(supplier), 'المورد المعتمد (شركة بازرعة تويوتا) موجود');
  console.log(`  🏢 المورد المختار: ${supplier.name} (رصيد الديون الحالي: ${supplier.balance_due} ر.ي)`);

  const oilItem = db.prepare("SELECT * FROM inventory WHERE id = 1").get();
  assert(Boolean(oilItem), 'صنف زيت تويوتا 20W-50 موجود');
  console.log(`  🛢️ صنف الزيت المختار: ${oilItem.name} (المخزون الحالي: ${oilItem.stock_qty}، التكلفة الحالية: ${oilItem.cost_price} ر.ي)`);

  const filterItem = db.prepare("SELECT * FROM inventory WHERE id = 2").get();
  assert(Boolean(filterItem), 'صنف فلتر تويوتا موجود');
  console.log(`  🔩 صنف الفلتر المختار: ${filterItem.name} (المخزون الحالي: ${filterItem.stock_qty}، التكلفة الحالية: ${filterItem.cost_price} ر.ي)`);

  const createdPurchases = [];
  const createdVouchers = [];
  const createdReturns = [];

  // -------------------------------------------------------------
  // SCENARIO 1: Cash Purchase with Carton Unpacking, Landed Freight, & WAC
  // -------------------------------------------------------------
  logHeader('السيناريو 1: شراء كراتين زيت مع تفكيك الكرتون واحتساب التكلفة الواصلة (Landed WAC)');
  const initialQty = oilItem.stock_qty; // e.g. 10
  const initialCost = oilItem.cost_price; // e.g. 22000

  // We buy 2 cartons, each carton has 3 cans = 6 cans.
  // Carton cost is 60,000 YER (i.e. 20,000 YER per can base).
  // Total base goods cost = 2 * 60,000 = 120,000 YER.
  // Shipping cost = 3,000 YER paid cash from drawer.
  // Effective cost per unit = 20,000 + (3000 / 6) = 20,500 YER.
  // Expected WAC = ((initialQty * initialCost) + (6 * 20500)) / (initialQty + 6)
  const incomingQty = 6;
  const incomingUnitCost = 20000;
  const shippingCost = 3000;
  const landedUnitCost = roundMoney(incomingUnitCost + (shippingCost / incomingQty)); // 20,500
  const expectedWAC = calcWAC(initialQty, initialCost, incomingQty, landedUnitCost);

  console.log(`  📐 الحساب النظري الدقيق:`);
  console.log(`     - رصيد سابق: ${initialQty} دبة × ${initialCost} ر.ي`);
  console.log(`     - توريد جديد: ${incomingQty} دبة بتكلفة واصلة ${landedUnitCost} ر.ي (شامل الشحن)`);
  console.log(`     - متوسط التكلفة المرجح المتوقع (Expected WAC): ${expectedWAC} ر.ي`);

  const purchase1Data = {
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    payment_method: 'cash',
    paid_from_cash_drawer: true,
    shipping_cost: shippingCost,
    invoice_ref: 'BILL-LAB-001',
    items: [
      {
        inventory_id: oilItem.id,
        is_carton: true,
        carton_qty: 2,
        units_per_carton: 3,
        carton_cost: 60000,
        unit_sell: 26000,
      }
    ],
    notes: 'فاتورة فحص معملي - سيناريو 1 كراتين زيت كاش مع شحن واصل',
  };

  const p1 = purchaseModel.create(purchase1Data);
  createdPurchases.push(p1.id);
  assert(Boolean(p1 && p1.id), 'تم إنشاء فاتورة المشتريات النقدية ورقمها: ' + p1.purchase_number);
  assert(p1.shipping_cost === 3000, 'تم إثبات مصاريف الشحن والتفريغ: 3,000 ر.ي');

  // 1.1 Verify Inventory Stock Increment (Unpacked into single cans)
  const updatedOil = db.prepare('SELECT stock_qty, cost_price FROM inventory WHERE id = ?').get(oilItem.id);
  assert(updatedOil.stock_qty === initialQty + incomingQty, `تم تفكيك الكراتين وزيادة المخزون: كان ${initialQty} وأصبح ${updatedOil.stock_qty} دبة`);

  // 1.2 Verify WAC in Inventory Table
  assert(updatedOil.cost_price === expectedWAC, `تم تحديث متوسط التكلفة المرجح (WAC) بدقة متناهية: أصبح ${updatedOil.cost_price} ر.ي (تطابق تام مع ${expectedWAC})`);

  // 1.3 Verify Stock Movements Record
  const stockMove = db.prepare("SELECT * FROM stock_movements WHERE ref_type = 'purchase' AND ref_id = ?").get(p1.id);
  assert(Boolean(stockMove && stockMove.qty_in === incomingQty), 'تم تسجيل حركة التوريد المخزني بجدول stock_movements');
  assert(stockMove.wac_cost_after === expectedWAC, `حركة المخزون وثقت تكلفة WAC اللاحقة: ${stockMove.wac_cost_after} ر.ي`);

  // 1.4 Verify Double-Entry Journal Entry (Debits == Credits)
  const jEntries1 = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'purchase' AND ref_id = ?").all(p1.id);
  assert(jEntries1.length > 0, 'تم إنشاء قيود اليومية الآلية لفاتورة المشتريات والشحن');
  for (const je of jEntries1) {
    assert(je.total_debit === je.total_credit, `توازن القيد المحاسبي (${je.entry_number}): مدين ${je.total_debit} = دائن ${je.total_credit}`);
    assert(je.is_balanced === 1, 'حالة القيد متوازن رسمياً');
  }
  AUDIT_RESULTS.scenarios.push({ name: 'شراء كراتين زيت كاش مع شحن وWAC', status: 'PASS', purchase_id: p1.id });

  // -------------------------------------------------------------
  // SCENARIO 2: Credit Purchase on Account with Due Date
  // -------------------------------------------------------------
  logHeader('السيناريو 2: شراء فلاتر وزيوت بالآجل مع تسجيل الاستحقاق ومديونية المورد');
  const supplierDebtBefore = db.prepare('SELECT balance_due FROM suppliers WHERE id = ?').get(supplier.id).balance_due;
  const initialFilterStock = filterItem.stock_qty;

  const purchase2Data = {
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    payment_method: 'credit',
    paid_amount: 0,
    due_date: '2026-12-07',
    invoice_ref: 'BILL-BAZ-9988',
    paper_bill_number: 'فاتورة-ورقية-450',
    items: [
      {
        inventory_id: filterItem.id,
        qty: 5,
        unit_cost: 5000,
        unit_sell: 7000,
      }
    ],
    notes: 'فاتورة فحص معملي - سيناريو 2 شراء فلاتر آجل',
  };

  const p2 = purchaseModel.create(purchase2Data);
  createdPurchases.push(p2.id);
  assert(Boolean(p2 && p2.id), 'تم إنشاء فاتورة المشتريات الآجلة: ' + p2.purchase_number);
  assert(p2.remaining_debt === 25000, 'إثبات دين الفاتورة الآجل: 25,000 ر.ي');

  // 2.1 Verify Supplier Balance Due incremented
  const supplierDebtAfter = db.prepare('SELECT balance_due FROM suppliers WHERE id = ?').get(supplier.id).balance_due;
  assert(supplierDebtAfter === supplierDebtBefore + 25000, `تمت زيادة رصيد مديونية المورد بدقة: كان ${supplierDebtBefore} وأصبح ${supplierDebtAfter} ر.ي`);

  // 2.2 Verify General Ledger Payable Line (Account 2101 Credited)
  const apLine = db.prepare(`
    SELECT jl.* FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE je.ref_type = 'purchase' AND je.ref_id = ? AND jl.account_code = '2101'
  `).get(p2.id);
  assert(Boolean(apLine && apLine.credit === 25000), 'تم تسجيل قيد دائن لذمم الموردين (حساب 2101) بقيمة 25,000 ر.ي');

  // 2.3 Verify Overdue Payables Report includes this bill
  const overdues = purchaseModel.getOverduePayables();
  const foundInPayables = overdues.find(b => b.id === p2.id);
  assert(Boolean(foundInPayables), 'الفاتورة الآجلة تظهر بنجاح في كشف ومتابعة مستحقات الموردين وتواريخ السداد');
  AUDIT_RESULTS.scenarios.push({ name: 'شراء آجل وإثبات مديونية المورد وتاريخ الاستحقاق', status: 'PASS', purchase_id: p2.id });

  // -------------------------------------------------------------
  // SCENARIO 3: Supplier Payment Voucher with FIFO Bill Settle
  // -------------------------------------------------------------
  logHeader('السيناريو 3: سداد دفعة للمورد بسند صرف رسمي وتسوية الفواتير FIFO');
  const payAmount = 15000;
  const payRes = supplierModel.paySupplierDebt(supplier.id, {
    amount: payAmount,
    payment_method: 'cash',
    notes: 'سداد دفعة فحص معملي',
    purchase_id: p2.id, // Direct link to bill p2
  });

  assert(Boolean(payRes && payRes.voucher), 'تم إصدار سند صرف رسمي للمورد برقم: ' + payRes.voucher.voucher_number);
  createdVouchers.push(payRes.voucher.id);

  // 3.1 Verify Supplier balance decreased
  const supplierDebtAfterPay = db.prepare('SELECT balance_due FROM suppliers WHERE id = ?').get(supplier.id).balance_due;
  assert(supplierDebtAfterPay === supplierDebtAfter - payAmount, `انخفض دين المورد بعد السداد من ${supplierDebtAfter} إلى ${supplierDebtAfterPay} ر.ي`);

  // 3.2 Verify Target Bill remaining_debt decreased
  const p2Updated = db.prepare('SELECT remaining_debt, paid_amount FROM purchases WHERE id = ?').get(p2.id);
  assert(p2Updated.remaining_debt === 10000, `انخفض دين الفاتورة الآجلة ذاتها إلى 10,000 ر.ي، والمدفوع أصبح ${p2Updated.paid_amount} ر.ي`);

  // 3.3 Verify Payment Voucher Journal Entry (Debit 2101, Credit 1101)
  const voucherJv = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'supplier_payment' AND ref_id = ? ORDER BY id DESC LIMIT 1").get(supplier.id);
  assert(Boolean(voucherJv && voucherJv.is_balanced === 1), 'تم توليد قيد سند الصرف وهو متوازن 100%');
  assert(voucherJv.total_debit === payAmount && voucherJv.total_credit === payAmount, `مبلغ القيد مطابق تماماً لمبلغ السداد (${payAmount} ر.ي)`);
  AUDIT_RESULTS.scenarios.push({ name: 'سداد دفعة للمورد بسند صرف رسمي وتخفيض الدين', status: 'PASS', voucher_id: payRes.voucher.id });

  // -------------------------------------------------------------
  // SCENARIO 4: Purchase Return (Return Defective Goods to Supplier)
  // -------------------------------------------------------------
  logHeader('السيناريو 4: مردودات مشتريات (إرجاع بضاعة للمورد ورد القيمة والمخزون)');
  const filterStockBeforeReturn = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(filterItem.id).stock_qty;
  const debtBeforeReturn = db.prepare('SELECT balance_due FROM suppliers WHERE id = ?').get(supplier.id).balance_due;

  const returnData = {
    purchase_id: p2.id,
    supplier_id: supplier.id,
    supplier_name: supplier.name,
    reason: 'إرجاع فلتر تالف وغير مطابق للمواصفات (فحص معملي)',
    refund_type: 'supplier_balance', // خصم من رصيد دين المورد
    items: [
      {
        inventory_id: filterItem.id,
        qty: 1,
        unit_cost: 5000,
      }
    ],
  };

  const pReturn = purchaseReturnModel.create(returnData);
  createdReturns.push(pReturn.id);
  assert(Boolean(pReturn && pReturn.id), 'تم إنشاء سند مرتجع المشتريات ورقمها: ' + pReturn.return_number);

  // 4.1 Verify Inventory Stock Decremented for returned item
  const filterStockAfterReturn = db.prepare('SELECT stock_qty FROM inventory WHERE id = ?').get(filterItem.id).stock_qty;
  assert(filterStockAfterReturn === filterStockBeforeReturn - 1, `تم خصم الفلتر المرتجع من المخزن: كان ${filterStockBeforeReturn} وأصبح ${filterStockAfterReturn}`);

  // 4.2 Verify Supplier debt decreased by return amount (5000 YER)
  const debtAfterReturn = db.prepare('SELECT balance_due FROM suppliers WHERE id = ?').get(supplier.id).balance_due;
  assert(debtAfterReturn === debtBeforeReturn - 5000, `تم تخفيض دين المورد بقيمة المرتجع: كان ${debtBeforeReturn} وأصبح ${debtAfterReturn} ر.ي`);

  // 4.3 Verify Reverse Journal Entry
  const returnJv = db.prepare("SELECT * FROM journal_entries WHERE ref_type = 'purchase_return' AND ref_id = ?").get(pReturn.id);
  assert(Boolean(returnJv && returnJv.is_balanced === 1), 'تم توليد قيد مرتجع المشتريات المتوازن (مدين ذمم موردين 2101 / دائن مخزون 1302)');
  AUDIT_RESULTS.scenarios.push({ name: 'مردودات مشتريات وتخفيض المخزون والدين', status: 'PASS', return_id: pReturn.id });

  // -------------------------------------------------------------
  // STEP 5: Edge Cases & Safeguards Guard
  // -------------------------------------------------------------
  logHeader('الخطوة 5: فحص دروع الحماية وسلاسل الإمداد');

  // Guard 1: Consignment Inventory Guard (MOD-CONSIGNMENT)
  // Create temporary consignment item to test protection
  let consignmentBlocked = false;
  try {
    const consItemRes = db.prepare(`
      INSERT INTO inventory (sku, name, brand, category, item_type, cost_price, sell_price, stock_qty, is_consignment, consignment_supplier_name)
      VALUES ('CONS-AUDIT-TEST', 'زيت توتال أمانة تجريبي', 'توتال', 'oil', 'product', 20000, 25000, 5, 1, 'مورد أمانة تجريبي')
    `).run();
    const consItemId = consItemRes.lastInsertRowid;

    // Attempt to buy it via normal commercial purchase
    purchaseModel.create({
      supplier_id: supplier.id,
      items: [{ inventory_id: consItemId, qty: 2, unit_cost: 20000 }],
    });
  } catch (err) {
    consignmentBlocked = true;
    console.log(`  🛡️ تم حظر شراء بضاعة الأمانة تجارياً بنجاح: "${err.message}"`);
  }
  assert(consignmentBlocked, 'درع بضاعة الأمانة (MOD-CONSIGNMENT) منع شراء صنف أمانة عبر المشتريات التجارية');
  AUDIT_RESULTS.guards.push({ name: 'درع حظر شراء بضاعة الأمانة تجارياً', status: 'PASS' });

  // Guard 2: Supplier with Debt Deletion Guard
  let deleteSupplierBlocked = false;
  try {
    supplierModel.delete(supplier.id);
  } catch (err) {
    deleteSupplierBlocked = true;
    console.log(`  🛡️ تم حظر حذف مورد له رصيد دائن بنجاح: "${err.message}"`);
  }
  assert(deleteSupplierBlocked, 'درع الحسابات منع حذف مورد مرتبط بفواتير وأرصدة ديون نشطة');
  AUDIT_RESULTS.guards.push({ name: 'منع حذف الموردين المرتبطين بحسابات وديون', status: 'PASS' });

  // Clean up temporary consignment item (zero stock first to satisfy DB asset protection trigger)
  db.prepare("UPDATE inventory SET stock_qty = 0 WHERE sku = 'CONS-AUDIT-TEST'").run();
  db.prepare("DELETE FROM inventory WHERE sku = 'CONS-AUDIT-TEST'").run();

  console.log('\n📝 أرقام معرفات العمليات المنشأة للفحص:');
  console.log('   - فواتير المشتريات:', createdPurchases);
  console.log('   - سندات الصرف:', createdVouchers);
  console.log('   - مردودات المشتريات:', createdReturns);

  return {
    success: true,
    createdPurchases,
    createdVouchers,
    createdReturns,
  };
}

runPurchaseDeepAudit()
  .then(res => {
    console.log('\n============================================================');
    console.log('🎉 اكتمل الفحص المعملي العميق لدورة المشتريات و WAC بنجاح 100%!');
    console.log('============================================================');

    fs.writeFileSync(
      path.join(__dirname, 'last_purchase_audit_result.json'),
      JSON.stringify({ ...AUDIT_RESULTS, meta: res }, null, 2),
      'utf8'
    );
  })
  .catch(err => {
    console.error('\n💥 فشل في الفحص:', err.message);
    process.exit(1);
  });
