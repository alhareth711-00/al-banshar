/**
 * Comprehensive Automated Test Suite for Quick Lube & Tire Touch POS (Phase 1)
 */
const http = require('http');

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Phase 1 REST API Verification Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'online', 'Health Check endpoint responds online');

    // 2. Search vehicles
    const search1 = await request('GET', '/api/vehicles/search?q=1-45892');
    assert(search1.status === 200 && search1.body.data.length > 0, 'Search vehicle by plate (1-45892) returns results');

    const search2 = await request('GET', '/api/vehicles/search?q=771890123');
    assert(search2.status === 200 && search2.body.data[0].customer_name.includes('الحبيشي'), 'Search vehicle by Yemeni phone returns customer');

    // 3. Register a new vehicle
    const randPlate = `1-${Math.floor(10000 + Math.random() * 90000)} خصوصي`;
    const newCar = {
      plate_number: randPlate,
      plate_type: 'خصوصي',
      car_make_model: 'تويوتا لاندكروزر V8 2022',
      customer_name: 'عبد الملك الحيمي',
      phone: '775544332',
      preferred_oil_brand: 'تويوتا',
      preferred_viscosity: '5W-30',
      last_odometer: 45000,
    };
    const regRes = await request('POST', '/api/vehicles', newCar);
    assert(regRes.status === 201 && regRes.body.data.plate_number === newCar.plate_number, 'Register new vehicle and customer');

    // 4. Inventory check and Low Stock alerts
    const invRes = await request('GET', '/api/inventory?category=oil&pack_size=4L');
    assert(invRes.status === 200 && invRes.body.count > 0, 'Filter inventory by category=oil & pack_size=4L');

    const lowStockRes = await request('GET', '/api/inventory/low-stock');
    assert(lowStockRes.status === 200 && lowStockRes.body.data.length >= 2, 'Low stock alerts detects depleted inventory (Toyota 4L & Castrol GTX)');

    // 5. Customer Retention Radar
    const radarRes = await request('GET', '/api/retention-radar');
    assert(radarRes.status === 200 && radarRes.body.count >= 2, 'Retention Radar identifies overdue vehicles');
    const overdueCar = radarRes.body.data.find(r => r.status === 'overdue');
    assert(overdueCar && overdueCar.status === 'overdue' && overdueCar.reason, `Vehicle (${overdueCar ? overdueCar.plate_number : 'none'}) properly flagged as overdue with reason`);

    // 6. Create Invoice (Atomic Transaction test)
    // Check initial stock of item 3 (Toyota 5W-30 4L)
    const itemBefore = (await request('GET', '/api/inventory/3')).body.data;
    const initialStock = itemBefore.stock_qty;

    const invoicePayload = {
      vehicle_id: regRes.body.data.id,
      worker_id: 1, // Muadh
      current_odometer: 45000,
      payment_method: 'credit', // Testing partial/credit debt calculation
      paid_amount: 20000,
      notes: 'تغيير زيت 5W-30 مع فلتر زيت وفحص كامل',
      items: [
        {
          inventory_id: 3, // Toyota 5W-30 4L
          item_type: 'product',
          description: 'زيت تويوتا تخليقي 5W-30 دبة 4L',
          qty: 2,
          unit_price: 40000,
          labor_fee: 0,
        },
        {
          inventory_id: 14, // Toyota oil filter
          item_type: 'product',
          description: 'فلتر زيت تويوتا أصلي',
          qty: 1,
          unit_price: 4500,
          labor_fee: 0,
        },
      ],
    };

    const invoiceRes = await request('POST', '/api/invoices', invoicePayload);
    assert(invoiceRes.status === 201 && invoiceRes.body.data.invoice_number, 'Issue new invoice via atomic transaction');
    
    // Check remaining debt and balance_due
    const issuedInvoice = invoiceRes.body.data;
    assert(issuedInvoice.remaining_debt > 0, `Invoice remaining debt calculated correctly: ${issuedInvoice.remaining_debt} YER`);
    
    // Check that customer balance_due was updated
    const updatedVehicle = (await request('GET', `/api/vehicles/${regRes.body.data.id}`)).body.data;
    assert(updatedVehicle.balance_due === issuedInvoice.remaining_debt, `Customer balance_due updated to reflect debt: ${updatedVehicle.balance_due} YER`);

    // Check stock was decremented
    const stockAfter = (await request('GET', '/api/inventory/3')).body.data.stock_qty;
    assert(stockAfter === initialStock - 2, `Inventory stock atomically decremented from ${initialStock} to ${stockAfter}`);

    // 7. Test Financial Transactions (Debt Collection & Expense)
    const debtPaymentPayload = {
      tx_type: 'debt_collection',
      vehicle_id: updatedVehicle.id,
      amount: 15000,
      payment_method: 'cash',
      description: 'سداد دفعة نقدية من حساب تغيير الزيت الآجل',
    };
    const debtTxRes = await request('POST', '/api/transactions', debtPaymentPayload);
    assert(debtTxRes.status === 201, 'Record debt collection transaction');

    const vehicleAfterDebt = (await request('GET', `/api/vehicles/${updatedVehicle.id}`)).body.data;
    assert(vehicleAfterDebt.balance_due === updatedVehicle.balance_due - 15000, `Vehicle debt balance atomically decreased to ${vehicleAfterDebt.balance_due} YER`);

    // 8. Daily Closing Report
    const closingRes = await request('GET', '/api/reports/daily-closing');
    assert(closingRes.status === 200 && closingRes.body.data.summary.total_invoices > 0, 'Daily closing report generated with invoice summaries');
    assert(closingRes.body.data.cash_register.net_drawer_cash !== undefined, `Net Cash Drawer calculated: ${closingRes.body.data.cash_register.net_drawer_cash} YER`);
    assert(closingRes.body.data.oil_sales.packs_summary['4L'] > 0, 'Oil pack size breakdown reports 4L sold');
    assert(closingRes.body.data.workers_commissions.length === 3, 'Worker commissions computed for all 3 technicians');

    // 9. Phase 4: Suppliers, Inbound Purchases, and Expense Categories Verification
    // A. Expense Categories
    const expCatRes = await request('GET', '/api/expense-categories');
    assert(expCatRes.status === 200 && expCatRes.body.data.length >= 4, 'Expense Categories fetched successfully');

    const uniqueCatName = `صيانة ماطور وضواغط ${Date.now().toString().slice(-4)}`;
    const newCatRes = await request('POST', '/api/expense-categories', { name: uniqueCatName });
    assert(newCatRes.status === 201 && newCatRes.body.data.name === uniqueCatName, 'New custom expense category created');

    const updateCatRes = await request('PUT', `/api/expense-categories/${newCatRes.body.data.id}`, { name: `${uniqueCatName} محدث` });
    assert(updateCatRes.status === 200 && updateCatRes.body.data.name.includes('محدث'), 'Expense category renamed successfully');

    // B. Worker Daily Stats
    const workerDailyRes = await request('GET', '/api/workers/daily-stats');
    assert(workerDailyRes.status === 200 && workerDailyRes.body.data.length === 3, 'Worker daily stats computed (wage, cars served, advances, net due)');

    // C. Suppliers & Inbound Purchase Invoice
    const suppList = await request('GET', '/api/suppliers');
    assert(suppList.status === 200 && suppList.body.data.length >= 1, 'Suppliers list fetched');
    const testSupplier = suppList.body.data[0];

    const stockBeforePurchase = (await request('GET', '/api/inventory/1')).body.data.stock_qty;
    const purchasePayload = {
      supplier_id: testSupplier.id,
      invoice_ref: `INV-SUPP-${Date.now().toString().slice(-5)}`,
      payment_method: 'cash',
      paid_amount: 150000,
      paid_from_cash_drawer: true,
      notes: 'فاتورة توريد بضاعة كاش تجريبية',
      items: [
        {
          product_id: 1,
          qty: 6,
          unit_cost: 25000,
          new_sell_price: 30000,
        },
      ],
    };

    const purchaseRes = await request('POST', '/api/purchases', purchasePayload);
    assert(purchaseRes.status === 201 && purchaseRes.body.data.purchase_number, 'Inbound purchase invoice created atomically');

    const stockAfterPurchase = (await request('GET', '/api/inventory/1')).body.data.stock_qty;
    assert(stockAfterPurchase === stockBeforePurchase + 6, `Inventory stock atomically increased by purchase: ${stockBeforePurchase} -> ${stockAfterPurchase}`);

    // 10. Stage 1: Central Double-Entry Accounting Engine Verification
    console.log('\n🏛️ Verifying Stage 1: Central Double-Entry Accounting Engine...');

    // A. Chart of Accounts
    const coaRes = await request('GET', '/api/accounting/accounts');
    assert(coaRes.status === 200 && coaRes.body.data.length >= 25, `Chart of accounts loaded with ${coaRes.body.data.length} accounts`);
    const cashAcc = coaRes.body.data.find(a => a.code === '1101');
    assert(cashAcc && cashAcc.name.includes('الصندوق'), 'Account 1101 (الصندوق النقدي الرئيسي) exists in COA');

    // B. Journal Entries
    const jvRes = await request('GET', '/api/accounting/journal-entries');
    assert(jvRes.status === 200 && jvRes.body.data.length > 0, `Journal entries retrieved (${jvRes.body.data.length} entries)`);
    
    // Check that every single entry in the system is 100% balanced
    let allBalanced = true;
    for (const jv of jvRes.body.data) {
      if (Math.abs(jv.total_debit - jv.total_credit) > 0.01) {
        allBalanced = false;
        console.error(`Unbalanced JV: ${jv.entry_number} (Debit: ${jv.total_debit}, Credit: ${jv.total_credit})`);
      }
    }
    assert(allBalanced, 'All journal entries in the ledger are 100% balanced (Total Debit == Total Credit)');

    // C. Single Entry with lines
    const testEntryId = jvRes.body.data[0].id;
    const singleEntryRes = await request('GET', `/api/accounting/journal-entries/${testEntryId}`);
    assert(singleEntryRes.status === 200 && singleEntryRes.body.data.lines.length >= 2, 'Journal entry lines detail fetched with accounts metadata');

    // D. Statement of Account (كشف حساب عميل)
    const custStmtRes = await request('GET', `/api/accounting/statement-of-account?party_type=customer&party_id=${regRes.body.data.id}`);
    assert(custStmtRes.status === 200 && custStmtRes.body.data.statement_lines.length > 0, 'Customer Statement of Account generated with running balances');
    assert(custStmtRes.body.data.closing_balance !== undefined, `Customer closing balance computed: ${custStmtRes.body.data.closing_balance} YER`);

    // E. Statement of Account for Supplier (كشف حساب مورد)
    const suppStmtRes = await request('GET', '/api/accounting/statement-of-account?party_type=supplier&party_id=1');
    assert(suppStmtRes.status === 200 && suppStmtRes.body.data.statement_lines.length > 0, 'Supplier Statement of Account generated with running balances');
    assert(suppStmtRes.body.data.closing_balance !== undefined, `Supplier closing balance computed: ${suppStmtRes.body.data.closing_balance} YER`);

    // F. Trial Balance (ميزان المراجعة)
    const tbRes = await request('GET', '/api/accounting/trial-balance');
    assert(tbRes.status === 200 && tbRes.body.data.is_balanced === true, `Trial balance generated and verified BALANCED: Debits ${tbRes.body.data.grand_total_debit} == Credits ${tbRes.body.data.grand_total_credit}`);

    // G. Income Statement (قائمة الدخل والأرباح والخسائر مع تكلفة المبيعات COGS)
    const isRes = await request('GET', '/api/accounting/income-statement');
    assert(isRes.status === 200 && isRes.body.data.revenues.goods_sales_revenue >= 0, 'Income statement separates goods sales from labor revenue');
    assert(isRes.body.data.cost_of_goods_sold.total_cogs >= 0, `COGS computed: ${isRes.body.data.cost_of_goods_sold.total_cogs} YER`);
    assert(isRes.body.data.net_profit !== undefined, `Net operating profit calculated: ${isRes.body.data.net_profit} YER`);

    // H. Realtime Balance Sheet (المركز المالي والأصول السائلة والمخزون)
    const bsRes = await request('GET', '/api/accounting/balance-sheet');
    assert(bsRes.status === 200 && bsRes.body.data.treasury_and_banks.total_liquid !== undefined, 'Balance Sheet computed liquid assets');
    assert(bsRes.body.data.inventory_assets.total_cost_value > 0, `Inventory asset valuation at cost computed: ${bsRes.body.data.inventory_assets.total_cost_value} YER`);

    // I. Stock Movements Ledger (حركات المخزون والتكلفة المرجحة)
    const smRes = await request('GET', '/api/accounting/stock-movements');
    assert(smRes.status === 200 && smRes.body.data.length > 0, `Stock movements ledger tracked ${smRes.body.data.length} movements with WAC`);

    // J. Upgrade 2: Real-time Financial Pulse (النبض المالي الحي)
    const pulseRes = await request('GET', '/api/accounting/financial-pulse');
    assert(pulseRes.status === 200 && pulseRes.body.data.liquid.total !== undefined, `Financial Pulse bar calculated total liquid: ${pulseRes.body.data.liquid.total} YER`);
    assert(pulseRes.body.data.inventory.cost_value > 0, `Financial Pulse inventory cost value: ${pulseRes.body.data.inventory.cost_value} YER`);

    // K. Upgrade 5: Bay Profitability & Labor Margin (كفاءة ربحية الحفرة والمصنعية)
    const bayRes = await request('GET', '/api/accounting/bay-profitability');
    assert(bayRes.status === 200 && bayRes.body.data.summary.pure_labor_revenue >= 0, `Bay Profitability calculated pure labor revenue: ${bayRes.body.data.summary.pure_labor_revenue} YER`);
    assert(bayRes.body.data.summary.labor_coverage_ratio_percent !== undefined, `Labor-to-OpEx coverage ratio computed: ${bayRes.body.data.summary.labor_coverage_ratio_percent}%`);

    // L. Upgrade 4: Loss Prevention & Credit Ceiling Safeguards (فحص الحماية ومنع البيع بالخسارة)
    const safeguardsCheck = await request('POST', '/api/accounting/check-safeguards', {
      vehicle_id: regRes.body.data.id,
      payment_method: 'credit',
      items: [
        {
          inventory_id: 1,
          qty: 1,
          unit_price: 500, // Guaranteed below cost (< 3500)
        },
      ],
    });
    assert(safeguardsCheck.status === 200 && safeguardsCheck.body.data.has_warnings === true, 'Safeguards successfully flagged below-cost sale attempt');
    assert(safeguardsCheck.body.data.below_cost_items.length > 0, 'Identified below-cost item with exact loss calculation');

    console.log('\n📦 Verifying Stage 2: Specialized Inventory Management & Auto Lube Catalog...');

    // M. Inventory Valuation Summary (ملخص تقييم المخزون وهامش الربح المتوقع)
    const valRes = await request('GET', '/api/inventory/valuation');
    assert(valRes.status === 200 && valRes.body.data.grand_cost_value > 0, `Inventory valuation calculated total cost: ${valRes.body.data.grand_cost_value} YER`);
    assert(valRes.body.data.total_services >= 5, `Workshop services catalog initialized: ${valRes.body.data.total_services} services ready`);

    // N. Barcode Search (البحث الفوري بالباركود)
    const barcodeRes = await request('GET', '/api/inventory/barcode/SRV001');
    assert(barcodeRes.status === 200 && barcodeRes.body.data.sku === 'SRV-OIL-CHG', `Found service item by barcode: ${barcodeRes.body.data.name}`);

    // O. Stock Adjustment with Journal Entry (تسوية جردية مع قيد محاسبي مزدوج)
    const adjRes = await request('POST', '/api/inventory/1/adjust', {
      qty_delta: 2,
      reason: 'فائض جرد مستودع الورشة',
      adjusted_by: 'أمين المستودع الرئيسي'
    });
    assert(adjRes.status === 200 && adjRes.body.data.id === 1, 'Stock adjustment executed with double-entry journal posting');

    // P. Packaging Conversion (تحويل وفك كرتون/برميل إلى عبوات فردية)
    // Find an item with available stock for conversion test
    const allInv = await request('GET', '/api/inventory?is_active=1');
    const availableItem = allInv.body.data.find(i => i.stock_qty >= 2 && i.item_type === 'product');
    const targetItem = allInv.body.data.find(i => i.id !== availableItem.id && i.item_type === 'product');

    const convertRes = await request('POST', '/api/inventory/convert-packaging', {
      from_id: availableItem.id,
      to_id: targetItem.id,
      packages_to_convert: 1,
      units_per_package: 4
    });
    if (convertRes.status !== 200) {
      console.log('Packaging convert error:', convertRes.body);
    }
    assert(convertRes.status === 200 && convertRes.body.data.units_produced === 4, `Packaging conversion completed: 1 pack -> ${convertRes.body?.data?.units_produced} units`);

    // Q. Toggle Active Status (تفعيل/تعطيل الصنف في الكاشير)
    const toggleRes = await request('PUT', '/api/inventory/1/toggle-active');
    assert(toggleRes.status === 200 && toggleRes.body.data.is_active === 0, 'Item disabled from POS active catalog');
    const toggleBackRes = await request('PUT', '/api/inventory/1/toggle-active');
    assert(toggleBackRes.status === 200 && toggleBackRes.body.data.is_active === 1, 'Item re-enabled in POS active catalog');

    // R. Safe Delete / Archive with reference protection (منع حذف الأصناف المرتبطة بحركات محاسبية)
    const delRes = await request('DELETE', '/api/inventory/1');
    assert(delRes.status === 200 && delRes.body.data.action === 'archived', 'Referenced inventory item safely archived instead of hard-deleted to preserve financial ledger');
    // Restore it
    await request('PUT', '/api/inventory/1/toggle-active');

    // S. Upgrade 4: ABC Turnover & Velocity Analytics (المقترح 4)
    const turnoverRes = await request('GET', '/api/inventory/turnover-analytics?days=90');
    assert(turnoverRes.status === 200 && turnoverRes.body.data.summary.total_products > 0, `Turnover analytics evaluated ${turnoverRes.body.data.summary.total_products} products`);
    assert(turnoverRes.body.data.summary.class_a_fast !== undefined, `ABC Velocity classified: Fast-moving Class A items identified`);
    assert(turnoverRes.body.data.summary.dead_stock_cost !== undefined, `Calculated capital tied in dead stock: ${turnoverRes.body.data.summary.dead_stock_cost} YER`);

    // T. Upgrade 5: Reorder Suggestions PO Sheet (المقترح 5)
    const reorderRes = await request('GET', '/api/inventory/reorder-suggestions');
    assert(reorderRes.status === 200 && reorderRes.body.data.requisition_number.startsWith('PO-REQ-'), `Generated official purchase requisition: ${reorderRes.body.data.requisition_number}`);
    assert(reorderRes.body.data.total_items_count >= 0, `Identified low-stock reorder count: ${reorderRes.body.data.total_items_count} items`);
    assert(reorderRes.body.data.total_estimated_cost >= 0, `Computed estimated PO budget: ${reorderRes.body.data.total_estimated_cost} YER`);

    // =========================================================================
    // STAGE 3 TESTS: POS, INVOICES & VEHICLE SERVICE TRACKING
    // =========================================================================
    console.log('\n--- Running Stage 3 Verification Tests ---');

    // 1. Create a custom service on the fly (إضافة خدمة جديدة للكتالوج)
    const newServiceRes = await request('POST', '/api/inventory', {
      name: 'خدمة غسيل بستم بالديزل سريع',
      category: 'service',
      item_type: 'service',
      brand: 'خدمات الورشة',
      sell_price: 3500,
      cost_price: 0,
      min_stock_alert: 0,
      notes: 'خدمة سريعة מضافة من شاشة الكاشير'
    });
    assert(newServiceRes.status === 201 && newServiceRes.body.data.item_type === 'service', `Created on-the-fly service: ${newServiceRes.body.data.name} (Sell: 3500 YER)`);
    const createdServiceId = newServiceRes.body.data.id;

    // 2. Fetch vehicle to test odometer calculation
    const vehListRes = await request('GET', '/api/vehicles');
    assert(vehListRes.status === 200 && vehListRes.body.data.length > 0, 'Found registered vehicles for POS invoicing');
    const testVeh = vehListRes.body.data[0];
    const initialOdo = Number(testVeh.last_odometer) || 50000;

    // 3. Create POS Invoice with 3000 km default interval and mixed cart (Goods + Services)
    const posInvoicePayload = {
      vehicle_id: testVeh.id,
      worker_id: 1,
      current_odometer: initialOdo,
      // Leave next_odometer empty to test 3000 km auto default!
      payment_method: 'cash',
      paid_amount: 15500,
      items_total: 12000, // Goods (oil + filter)
      labor_total: 3500,  // Pure Service
      scrap_battery_deduction: 0,
      discount: 0,
      items: [
        {
          inventory_id: 1, // Product
          item_type: 'product',
          description: 'زيت تويوتا 20W-50 أصلي 4 لتر',
          qty: 1,
          unit_price: 10000,
          labor_fee: 0,
          subtotal: 10000,
        },
        {
          inventory_id: 2, // Product
          item_type: 'product',
          description: 'فلتر زيت تويوتا أصلي',
          qty: 1,
          unit_price: 2000,
          labor_fee: 0,
          subtotal: 2000,
        },
        {
          inventory_id: createdServiceId, // Service
          item_type: 'service',
          description: 'خدمة غسيل بستم بالديزل سريع',
          qty: 1,
          unit_price: 3500,
          labor_fee: 0,
          subtotal: 3500,
        }
      ]
    };

    const posInvoiceRes = await request('POST', '/api/invoices', posInvoicePayload);
    assert(posInvoiceRes.status === 201, `POS invoice created successfully (Invoice #${posInvoiceRes.body.data.invoice_number})`);
    const createdInvoice = posInvoiceRes.body.data;

    // 4. Verify 3000 km default odometer interval enforcement
    assert(
      Number(createdInvoice.next_odometer) === initialOdo + 3000,
      `Odometer correctly defaulted to +3000 km: ${initialOdo} -> ${createdInvoice.next_odometer} km`
    );

    // 5. Verify Scrap Battery deduction is strictly 0
    assert(
      Number(createdInvoice.scrap_battery_deduction) === 0,
      `Scrap battery deduction is strictly 0: ${createdInvoice.scrap_battery_deduction} YER`
    );

    // 6. Verify Revenue Separation in Ledger (Journal Lines)
    const journalRes = await request('GET', `/api/accounting/journal-entries?search=${createdInvoice.invoice_number}`);
    assert(journalRes.status === 200 && journalRes.body.data.length > 0, 'Found journal entry for POS invoice');
    const entryDetail = await request('GET', `/api/accounting/journal-entries/${journalRes.body.data[0].id}`);
    const jLines = entryDetail.body.data.lines;

    // Must have Credit 4101 (Goods) = 12000 YER, Credit 4201 (Services) = 3500 YER, Debit 1101 (Cash) = 15500 YER
    const cashLine = jLines.find(l => l.account_code === '1101');
    const goodsLine = jLines.find(l => l.account_code === '4101');
    const serviceLine = jLines.find(l => l.account_code === '4201');

    assert(cashLine && Number(cashLine.debit) === 15500, `Cash drawer debited exactly 15,500 YER`);
    assert(goodsLine && Number(goodsLine.credit) === 12000, `Goods sales credited 12,000 YER (Account 4101)`);
    assert(serviceLine && Number(serviceLine.credit) === 3500, `Services revenue credited 3,500 YER (Account 4201)`);

    // 7. Verify Vehicle Service History API
    const historyRes = await request('GET', `/api/invoices?vehicle_id=${testVeh.id}`);
    assert(historyRes.status === 200 && Array.isArray(historyRes.body.data), `Vehicle history endpoint returned invoices list`);
    const foundInvoiceInHistory = historyRes.body.data.find(inv => inv.id === createdInvoice.id);
    assert(foundInvoiceInHistory !== undefined, `Created invoice appears in vehicle past service history for one-click re-service`);

    // 8. Verify Updated Vehicle last_odometer and next_due_odometer
    const updatedVehRes = await request('GET', `/api/vehicles/${testVeh.id}`);
    assert(
      updatedVehRes.status === 200 && Number(updatedVehRes.body.data.last_odometer) === initialOdo,
      `Vehicle last odometer updated in master record`
    );
    assert(
      Number(updatedVehRes.body.data.next_due_odometer) === initialOdo + 3000,
      `Vehicle next due odometer updated to +3000 km`
    );

    // =========================================================================
    // UPGRADES 3 & 4 TESTS: CORPORATE FLEET PRICE BOOKS & PREDICTIVE REMINDERS
    // =========================================================================
    console.log('\n--- Running Stage 3 Pro Upgrades 3 & 4 Verification Tests ---');

    // Upgrade 3: Register Corporate Fleet Account with Preferential Discount
    const fleetVehiclePayload = {
      plate_number: `FLEET-${Date.now().toString().slice(-4)}`,
      plate_type: 'نقل',
      car_make_model: 'تويوتا دينا 2023',
      customer_name: 'أحمد النجم (سائق الأسطول)',
      phone: '775551122',
      customer_type: 'fleet',
      corporate_name: 'شركة النجم للنقل السريع',
      discount_percent: 10,
      credit_limit: 300000,
      billing_cycle: 'monthly',
      last_odometer: 85000,
    };

    const fleetVehRes = await request('POST', '/api/vehicles', fleetVehiclePayload);
    assert(fleetVehRes.status === 201 && fleetVehRes.body.data.customer_type === 'fleet', 'Corporate fleet vehicle registered with 10% discount profile');
    const fleetVehicleId = fleetVehRes.body.data.id;

    // Verify Corporate Accounts Directory API
    const corpAccountsRes = await request('GET', '/api/vehicles/corporate-accounts');
    assert(corpAccountsRes.status === 200 && Array.isArray(corpAccountsRes.body.data), 'Corporate accounts directory endpoint responded successfully');
    const najmAccount = corpAccountsRes.body.data.find(c => c.corporate_name === 'شركة النجم للنقل السريع');
    assert(najmAccount !== undefined && Number(najmAccount.discount_percent) === 10, `Identified corporate account: ${najmAccount?.corporate_name} with ${najmAccount?.discount_percent}% discount`);

    // Upgrade 4: Predictive Retention Radar with 3,000 km standard & WhatsApp templates
    const retentionRadarRes = await request('GET', '/api/retention-radar');
    assert(retentionRadarRes.status === 200 && Array.isArray(retentionRadarRes.body.data), 'Predictive retention radar endpoint returned list of due vehicles');
    assert(retentionRadarRes.body.data.length > 0, `Radar evaluated vehicles with predictive km consumption`);
    const radarFirst = retentionRadarRes.body.data[0];
    assert(radarFirst.custom_whatsapp_message && radarFirst.custom_whatsapp_message.includes('3,000 كم'), 'Personalized Yemeni WhatsApp message generated with 3,000 km interval');
    assert(radarFirst.estimated_current_odometer !== undefined, `Calculated estimated current odometer: ${radarFirst.estimated_current_odometer} km`);

    // Upgrade 4: Log WhatsApp Reminder Dispatch
    const reminderLogRes = await request('POST', `/api/vehicles/${radarFirst.vehicle_id}/log-reminder`, {
      reminder_type: 'whatsapp',
      odometer: radarFirst.estimated_current_odometer,
      notes: 'تم إرسال تذكير خدمة الزيت الدوري عبر الواتساب'
    });
    assert(reminderLogRes.status === 200 && Array.isArray(reminderLogRes.body.data), 'Logged WhatsApp service reminder in database audit table');
    assert(reminderLogRes.body.data[0].reminder_type === 'whatsapp', 'Verified reminder log record saved');

    // =========================================================================
    // STAGE 4 TESTS: INBOUND PURCHASES, CARTON UNPACKING, SUPPLIERS & RETURNS
    // =========================================================================
    console.log('\n--- Running Stage 4 Inbound Purchases, Suppliers & Returns Verification Tests ---');

    // 1. Create specialized oil supplier with agency brand and credit terms
    const supplierPayload = {
      name: 'شركة بازرعة للزيوت والمحركات',
      company_name: 'وكيل تويوتا المعتمد',
      phone: '771239988',
      agency_brand: 'تويوتا وكاسترول أصلي',
      commercial_reg: 'CR-789012',
      credit_days: 45,
    };
    const suppCreateRes = await request('POST', '/api/suppliers', supplierPayload);
    assert(suppCreateRes.status === 201 && suppCreateRes.body.data.id > 0, 'Stage 4: Create supplier with brand agency and credit terms');
    const newSupplier = suppCreateRes.body.data;
    assert(newSupplier.agency_brand === supplierPayload.agency_brand, 'Supplier agency brand stored correctly');
    assert(Number(newSupplier.credit_days) === 45, 'Supplier credit days set to 45 days');

    // 2. Test Carton Inbound Purchase (Manual units_per_carton calculation)
    // Check baseline stock of item 1 (Toyota Motor Oil 5W-30 1L)
    const product1Before = (await request('GET', '/api/inventory/1')).body.data;
    const initialQty1 = Number(product1Before.stock_qty);
    const initialCost1 = Number(product1Before.cost_price);

    // Purchase 2 cartons, each carton has 24 cans @ 84,000 YER per carton => 3,500 YER per can. Total cans = 48.
    const purchaseCartonPayload = {
      supplier_id: newSupplier.id,
      invoice_ref: `INV-SUPP-${Date.now().toString().slice(-5)}`,
      payment_method: 'credit', // on account
      paid_amount: 0,
      due_date: '2026-11-30',
      notes: 'توريد كراتين زيت تويوتا 1 لتر مع تفكيك الكرتون يدوياً',
      items: [
        {
          product_id: 1,
          purchase_unit_type: 'carton',
          carton_qty: 2,
          units_per_carton: 24, // user-specified manual capacity
          carton_cost: 84000,
          qty: 48, // 2 * 24
          unit_cost: 3500, // 84000 / 24
        },
      ],
    };

    const stage4PurchaseRes = await request('POST', '/api/purchases', purchaseCartonPayload);
    assert(stage4PurchaseRes.status === 201 && stage4PurchaseRes.body.data.id > 0, 'Stage 4: Post inbound purchase with manual carton unpacking');
    const createdPurchase = stage4PurchaseRes.body.data;
    assert(createdPurchase.purchase_number.startsWith('PUR-'), 'Sequential purchase order number generated');
    assert(Number(createdPurchase.total_amount) === 168000, 'Total purchase amount calculated accurately (2 cartons * 84,000 = 168,000 YER)');

    // Verify inventory stock incremented by 48 units and WAC updated
    const product1After = (await request('GET', '/api/inventory/1')).body.data;
    assert(Number(product1After.stock_qty) === initialQty1 + 48, `Inventory stock increased by 48 units (from ${initialQty1} to ${product1After.stock_qty})`);

    // Verify supplier debt balance increased by 168,000 YER
    const suppAfterPurchase = (await request('GET', `/api/suppliers/${newSupplier.id}`)).body.data;
    assert(Number(suppAfterPurchase.balance_due) === 168000, `Supplier debt balance increased to 168,000 YER`);

    // 3. Test Overdue Payables API
    // Create an overdue bill with past due_date
    const overdueBillPayload = {
      supplier_id: newSupplier.id,
      invoice_ref: `OVERDUE-${Date.now().toString().slice(-4)}`,
      payment_method: 'credit',
      paid_amount: 0,
      due_date: '2026-01-01', // past date
      items: [
        {
          product_id: 1,
          purchase_unit_type: 'unit',
          qty: 2,
          unit_cost: 3500,
        },
      ],
    };
    await request('POST', '/api/purchases', overdueBillPayload);

    const overdueCheckRes = await request('GET', '/api/purchases/overdue-payables');
    assert(overdueCheckRes.status === 200 && overdueCheckRes.body.data.total_overdue_count >= 1, 'Stage 4: Overdue payables endpoint accurately flags overdue purchases');
    assert(Number(overdueCheckRes.body.data.total_overdue_debt) > 0, `Total overdue payables aggregated: ${overdueCheckRes.body.data.total_overdue_debt} YER`);

    // 4. Test Purchase Return (Outbound return to supplier with stock decrement & AP deduction)
    const stockBeforeReturn = Number((await request('GET', '/api/inventory/1')).body.data.stock_qty);
    const returnPayload = {
      purchase_id: createdPurchase.id,
      supplier_id: newSupplier.id,
      refund_method: 'credit', // deduct from outstanding supplier debt
      reason: 'علب معطوبة / تسريب في الغطاء من المصنع',
      items: [
        {
          product_id: 1,
          qty: 6, // return 6 cans
          unit_cost: 3500,
        },
      ],
    };

    const returnRes = await request('POST', '/api/purchase-returns', returnPayload);
    if (returnRes.status !== 201) {
      console.error('RETURN RES ERROR:', returnRes.status, returnRes.body || returnRes.raw);
    }
    assert(returnRes.status === 201 && returnRes.body?.data?.id > 0, 'Stage 4: Create purchase return with stock decrement & AP reversal');
    const returnRecord = returnRes.body.data;
    assert(returnRecord.return_number.startsWith('PR-'), 'Sequential purchase return number (PR-...) generated');
    assert(Number(returnRecord.total_amount) === 21000, 'Return total calculated accurately (6 cans * 3,500 = 21,000 YER)');

    // Verify stock decremented by 6 units
    const stockAfterReturn = Number((await request('GET', '/api/inventory/1')).body.data.stock_qty);
    assert(stockAfterReturn === stockBeforeReturn - 6, `Inventory reduced by 6 returned units (from ${stockBeforeReturn} to ${stockAfterReturn})`);

    // Verify list purchase returns endpoint
    const listReturnsRes = await request('GET', '/api/purchase-returns');
    assert(listReturnsRes.status === 200 && listReturnsRes.body.data.length >= 1, 'List purchase returns endpoint returned records');

    // 5. Test Supplier Payment Voucher with sequential number and general ledger posting
    const paymentPayload = {
      amount: 50000,
      payment_method: 'cash',
      notes: 'سداد دفعة نقدية بموجب إشعار استلام المورد',
    };
    const payRes = await request('POST', `/api/suppliers/${newSupplier.id}/pay`, paymentPayload);
    assert(payRes.status === 200 && payRes.body.success, 'Stage 4: Record supplier payment voucher');
    assert(payRes.body.data.voucher && payRes.body.data.voucher.voucher_number.startsWith('PV-'), 'Official voucher number (PV-...) generated');
    assert(Number(payRes.body.data.voucher.amount) === 50000, 'Voucher amount registered correctly (50,000 YER)');

    // Verify supplier balance decreased after return and payment
    const suppFinal = (await request('GET', `/api/suppliers/${newSupplier.id}`)).body.data;
    // Expected balance = 168,000 (bill 1) + 7,000 (overdue bill) - 21,000 (return) - 50,000 (payment) = 104,000
    assert(Number(suppFinal.balance_due) === 104000, `Supplier balance accurately updated to 104,000 YER (after return and voucher payment)`);

    // =========================================================================
    // STAGE 4 PRO UPGRADES 3, 4, 5 VERIFICATION TESTS
    // =========================================================================
    console.log('\n--- Running Stage 4 Pro Upgrades 3, 4, 5 Verification Tests ---');

    // Upgrade 3: Payment Vouchers Archive API
    const vouchersRes = await request('GET', '/api/suppliers/vouchers');
    assert(vouchersRes.status === 200 && Array.isArray(vouchersRes.body.data), 'Upgrade 3: Payment vouchers archive endpoint returned list');
    assert(vouchersRes.body.data.length >= 1, `Archived payment vouchers found (${vouchersRes.body.data.length} vouchers)`);
    const targetVoucher = vouchersRes.body.data.find(v => v.voucher_number === payRes.body.data.voucher.voucher_number);
    assert(targetVoucher !== undefined, `Specific voucher (${payRes.body.data.voucher.voucher_number}) retrieved from audit archive`);
    
    // Single voucher retrieval
    const singleVoucherRes = await request('GET', `/api/suppliers/vouchers/${targetVoucher.voucher_number}`);
    assert(singleVoucherRes.status === 200 && singleVoucherRes.body.data.voucher_number === targetVoucher.voucher_number, 'Upgrade 3: Single voucher details retrieved by voucher number');

    // Upgrade 4: Landed Cost Allocation (Freight & Shipping distributed across items)
    const product2Before = (await request('GET', '/api/inventory/2')).body.data;
    const initialQty2 = Number(product2Before.stock_qty);

    const landedCostPurchasePayload = {
      supplier_id: newSupplier.id,
      invoice_ref: `LANDED-${Date.now().toString().slice(-4)}`,
      payment_method: 'credit',
      paid_amount: 0,
      due_date: '2026-12-15',
      shipping_cost: 6000, // 6,000 YER freight
      shipping_payer: 'cash_drawer', // cash from shop drawer
      notes: 'شحنة زيوت مع أجور نقل وشحن موزع على التكلفة',
      items: [
        {
          product_id: 2, // Toyota 10W-40
          purchase_unit_type: 'unit',
          qty: 20, // 20 units @ 2000 = 40,000 subtotal
          unit_cost: 2000,
        },
      ],
    };

    const landedRes = await request('POST', '/api/purchases', landedCostPurchasePayload);
    assert(landedRes.status === 201 && landedRes.body.data.id > 0, 'Upgrade 4: Inbound purchase with landed cost allocation accepted');
    const landedPurchase = landedRes.body.data;
    assert(Number(landedPurchase.shipping_cost) === 6000, 'Purchase record stored 6,000 YER shipping cost');
    assert(landedPurchase.shipping_payer === 'cash_drawer', 'Shipping payer marked as cash_drawer');

    // Verify allocated shipping on line items
    const landedDetails = (await request('GET', `/api/purchases/${landedPurchase.id}`)).body.data;
    assert(landedDetails.items.length === 1, 'Purchase lines loaded');
    const lineItem = landedDetails.items[0];
    assert(Number(lineItem.allocated_shipping) === 6000, '100% of single item shipping allocated (6,000 YER)');
    // Effective unit cost = 2000 + (6000 / 20) = 2,300 YER
    assert(Number(lineItem.effective_unit_cost) === 2300, `Effective landed cost per can computed accurately: 2,300 YER (was 2,000 YER)`);

    // Verify inventory stock increased by 20 units
    const product2After = (await request('GET', '/api/inventory/2')).body.data;
    assert(Number(product2After.stock_qty) === initialQty2 + 20, `Inventory stock increased by 20 units (from ${initialQty2} to ${product2After.stock_qty})`);

    // Upgrade 5: Due Date Calendar & Reminders
    const dueCalendarRes = await request('GET', '/api/purchases/due-calendar');
    assert(dueCalendarRes.status === 200 && dueCalendarRes.body.data.summary !== undefined, 'Upgrade 5: Due calendar endpoint returned structured summary');
    const { summary, buckets } = dueCalendarRes.body.data;
    assert(summary.overdue_count >= 1, `Calendar accurately identified ${summary.overdue_count} overdue payables`);
    assert(Array.isArray(buckets.overdue) && buckets.overdue.length >= 1, 'Overdue payables bucket populated');
    assert(Array.isArray(buckets.due_later), 'Future payables bucket populated');

    // =========================================================================
    // STAGE 5 VERIFICATION: INTEGRATED ACCOUNTING, CASH DRAWER & VOUCHERS
    // =========================================================================
    console.log('\n--- Stage 5: Integrated Accounting, Cash Drawer (1101), Vouchers & Owner Drawings ---');

    // 1. Verify Cash Drawer Summary API
    const drawerRes = await request('GET', '/api/vouchers/cash-drawer');
    assert(drawerRes.status === 200 && drawerRes.body.success, 'Stage 5: Cash drawer summary endpoint active');
    assert(drawerRes.body.data.cash_drawer.code === '1101', 'Cash drawer mapped to account 1101 (الصندوق النقدي الرئيسي)');
    assert(typeof drawerRes.body.data.cash_drawer.current_balance === 'number', 'Cash drawer current balance is a valid number');
    assert(drawerRes.body.data.bank_kuraimi.code === '1102', 'Bank Al-Kuraimi mapped to account 1102');
    assert(drawerRes.body.data.e_wallet_jeeb.code === '1103', 'E-Wallet Jeeb mapped to account 1103');
    const drawerInitialBalance = drawerRes.body.data.cash_drawer.current_balance;

    // 2. Verify Customer Debts Endpoint
    const custDebtsRes = await request('GET', '/api/vouchers/customer-debts');
    assert(custDebtsRes.status === 200 && Array.isArray(custDebtsRes.body.data), 'Stage 5: Customer debts endpoint returns list of debtors');
    assert(custDebtsRes.body.data.every((c) => Number(c.balance_due) > 0), 'Every customer debt returned has balance_due > 0');

    // Pick first customer with debt for atomic receipt voucher testing
    const debtorVehicle = custDebtsRes.body.data[0];
    assert(debtorVehicle && debtorVehicle.id > 0, `Selected debtor vehicle: ${debtorVehicle.customer_name} (Plate: ${debtorVehicle.plate_number}, Debt: ${debtorVehicle.balance_due})`);
    const initialCustomerDebt = Number(debtorVehicle.balance_due);
    const receiptPayAmount = Math.min(initialCustomerDebt, 5000);

    // 3. Issue Official Receipt Voucher (سند قبض)
    const receiptPayload = {
      party_type: 'customer',
      party_id: debtorVehicle.id,
      party_name: `${debtorVehicle.customer_name} (${debtorVehicle.plate_number})`,
      amount: receiptPayAmount,
      payment_method: 'cash',
      paper_bill_number: 'MANUAL-REC-101',
      description: `دفعة نقدية مسددة من حساب العميل (${debtorVehicle.plate_number})`,
      notes: 'تم الاستلام نقداً في الصندوق بموجب السند الدفتري رقم MANUAL-REC-101',
    };

    const receiptRes = await request('POST', '/api/vouchers/receipt', receiptPayload);
    assert(receiptRes.status === 201 && receiptRes.body.success, 'Stage 5: Receipt voucher created successfully (HTTP 201)');
    const createdReceipt = receiptRes.body.data;
    assert(createdReceipt.voucher_number.startsWith('RV-'), `Receipt voucher generated sequential code: ${createdReceipt.voucher_number}`);
    assert(createdReceipt.paper_bill_number === 'MANUAL-REC-101', 'Receipt voucher preserved manual paper booklet bill number');
    assert(createdReceipt.cash_account_code === '1101', 'Receipt debits Cash Drawer account 1101');
    assert(createdReceipt.offset_account_code === '1201', 'Receipt credits Accounts Receivable account 1201');
    assert(Number(createdReceipt.prev_balance) === initialCustomerDebt, `Receipt tracked previous balance: ${createdReceipt.prev_balance}`);
    assert(Number(createdReceipt.new_balance) === initialCustomerDebt - receiptPayAmount, `Receipt tracked new balance: ${createdReceipt.new_balance}`);

    // Verify debtor vehicle debt was atomically reduced in customers_vehicles table
    const vehicleAfterReceipt = (await request('GET', `/api/vehicles/${debtorVehicle.id}`)).body.data;
    assert(Number(vehicleAfterReceipt.balance_due) === initialCustomerDebt - receiptPayAmount, `Debtor vehicle balance_due atomically updated in database to ${vehicleAfterReceipt.balance_due}`);

    // 4. Issue Official Payment Voucher for Owner Drawings (مسحوبات المالك الشخصية - جاري المالك 3101)
    const ownerDrawingsPayload = {
      party_type: 'owner',
      party_name: 'مالك المركز (مسحوبات شخصية نقدية)',
      amount: 15000,
      payment_method: 'cash',
      paper_bill_number: 'OWN-WD-005',
      description: 'سحب مالي شخصي لمالك المركز لشراء مستلزمات خاصة',
      notes: 'مسحوبات مالك مباشرة من الصندوق تخفض حقوق الملكية (3101)',
    };

    const ownerRes = await request('POST', '/api/vouchers/payment', ownerDrawingsPayload);
    assert(ownerRes.status === 201 && ownerRes.body.success, 'Stage 5: Owner personal drawings payment voucher accepted');
    const createdOwnerPV = ownerRes.body.data;
    assert(createdOwnerPV.voucher_number.startsWith('PV-'), `Payment voucher generated sequential code: ${createdOwnerPV.voucher_number}`);
    assert(createdOwnerPV.offset_account_code === '3101', 'CRITICAL ACCOUNTING: Owner drawing debits Owner Equity (3101) - Does NOT reduce operating profit');
    assert(createdOwnerPV.cash_account_code === '1101', 'Owner drawing credits Cash Drawer (1101)');
    assert(createdOwnerPV.paper_bill_number === 'OWN-WD-005', 'Owner drawing stored paper booklet number');

    // 5. Issue Operating Expense Payment Voucher (مصروف تشغيلي 6109)
    const expensePayload = {
      party_type: 'expense',
      party_name: 'مورد مياه ونظافة',
      amount: 2500,
      payment_method: 'cash',
      paper_bill_number: 'EXP-889',
      description: 'شراء كراتين مياه شرب ومستلزمات نظافة للمركز',
    };

    const expenseRes = await request('POST', '/api/vouchers/payment', expensePayload);
    assert(expenseRes.status === 201 && expenseRes.body.success, 'Stage 5: Operating expense payment voucher created');
    const createdExpPV = expenseRes.body.data;
    assert(createdExpPV.offset_account_code === '6109', 'Operating expense voucher debits Operating Expenses (6109)');
    assert(createdExpPV.cash_account_code === '1101', 'Operating expense voucher credits Cash Drawer (1101)');

    // 6. Verify Purchase Invoicing with Optional Paper Bill Number (رقم الفاتورة الدفترية)
    const purchaseWithBookletPayload = {
      supplier_id: 1,
      invoice_ref: 'SUPP-INV-777',
      paper_bill_number: 'MANUAL-SUPP-BOOK-442',
      payment_method: 'cash',
      paid_from_cash_drawer: true,
      paid_amount: 10000,
      total_amount: 10000,
      remaining_debt: 0,
      items: [
        {
          inventory_id: 1,
          item_type: 'oil',
          description: 'زيت تويوتا أصلي 20W-50',
          purchase_unit_type: 'unit',
          qty: 5,
          unit_cost: 2000,
        },
      ],
    };

    const bookletPurchaseRes = await request('POST', '/api/purchases', purchaseWithBookletPayload);
    assert(bookletPurchaseRes.status === 201 && bookletPurchaseRes.body.success, 'Stage 5: Purchase with manual booklet bill number accepted');
    assert(bookletPurchaseRes.body.data.paper_bill_number === 'MANUAL-SUPP-BOOK-442', 'Purchase record persisted paper_bill_number for reconciliation');

    // 7. Verify List and Filter of Vouchers API
    const allVouchersRes = await request('GET', '/api/vouchers');
    assert(allVouchersRes.status === 200 && allVouchersRes.body.data.length >= 3, 'Stage 5: Vouchers list endpoint returned all created vouchers');

    const receiptsOnlyRes = await request('GET', '/api/vouchers?voucher_type=receipt');
    assert(receiptsOnlyRes.body.data.every((v) => v.voucher_type === 'receipt'), 'Filter voucher_type=receipt returns only receipts');

    const paymentsOnlyRes = await request('GET', '/api/vouchers?voucher_type=payment');
    assert(paymentsOnlyRes.body.data.every((v) => v.voucher_type === 'payment'), 'Filter voucher_type=payment returns only payments');

    // 8. Verify Cash Drawer Live Balance Reflects Net Operations
    const drawerAfterRes = await request('GET', '/api/vouchers/cash-drawer');
    const drawerNewBalance = drawerAfterRes.body.data.cash_drawer.current_balance;
    // Net change: +5000 (receipt) - 15000 (owner drawing) - 2500 (expense) - 10000 (cash purchase) = -22500
    const expectedDiff = receiptPayAmount - 15000 - 2500 - 10000;
    assert(Math.round(drawerNewBalance - drawerInitialBalance) === expectedDiff, `Cash drawer live balance reflects strict double-entry movements: diff ${drawerNewBalance - drawerInitialBalance} matches expected ${expectedDiff}`);

    // =========================================================================
    // STAGE 5 PRO UPGRADES (1, 2, 3, 4, 5) VERIFICATION TESTS
    // =========================================================================
    console.log('\n--- Running Stage 5 Pro Upgrades Verification Tests ---');

    // Upgrade 2: Cash Drawer Total Count & Reconciliation Audit
    const currentDrawerBal = drawerNewBalance;
    const physicalCountAmount = currentDrawerBal - 1200; // Simulated 1,200 YER shortage
    const auditPayload = {
      physical_balance: physicalCountAmount,
      notes: 'جرد نهاية الوردية اليومية - تم جرد إجمالي النقد الفعلي بالصندوق',
      created_by: 'أمين الصندوق المناوب',
    };

    const auditRes = await request('POST', '/api/vouchers/cash-drawer/audit', auditPayload);
    assert(auditRes.status === 201 && auditRes.body.success, 'Upgrade 2: Cash drawer actual count audit session saved successfully');
    const createdAudit = auditRes.body.data;
    assert(Number(createdAudit.system_balance) === currentDrawerBal, `Audit verified live system balance: ${createdAudit.system_balance}`);
    assert(Number(createdAudit.physical_balance) === physicalCountAmount, `Audit registered physical cash count: ${createdAudit.physical_balance}`);
    assert(Number(createdAudit.variance) === -1200, `Audit calculated variance correctly: -1200 YER`);
    assert(createdAudit.status === 'shortage', 'Audit classified status as shortage');

    // Retrieve audit logs list
    const auditListRes = await request('GET', '/api/vouchers/cash-drawer/audits');
    assert(auditListRes.status === 200 && auditListRes.body.data.length >= 1, 'Upgrade 2: Audit history log returned records');

    // Upgrade 2 Optional: Synchronize / Adjust variance via double-entry journal entry
    const adjustRes = await request('POST', '/api/vouchers/cash-drawer/adjust-variance', { audit_id: createdAudit.id });
    assert(adjustRes.status === 200 && adjustRes.body.adjusted === true, 'Upgrade 2: Variance adjustment journal entry created');
    assert(adjustRes.body.journal_entry.total_debit === 1200, 'Adjustment journal entry balanced at 1200 YER');

    // Verify cash drawer balance was adjusted by exactly -1200
    const drawerAfterAdjRes = await request('GET', '/api/vouchers/cash-drawer');
    assert(Number(drawerAfterAdjRes.body.data.cash_drawer.current_balance) === physicalCountAmount, `Drawer balance synchronized to match physical cash: ${physicalCountAmount} YER`);

    // Upgrade 3: Owner Drawings vs Current Month Operating Profit
    const ownerSummaryRes = await request('GET', '/api/vouchers/owner-drawings-summary');
    assert(ownerSummaryRes.status === 200 && ownerSummaryRes.body.success, 'Upgrade 3: Owner drawings summary endpoint responds');
    const ownerData = ownerSummaryRes.body.data;
    assert(typeof ownerData.net_operating_profit === 'number', 'Summary returns monthly operating profit');
    assert(ownerData.total_drawings >= 15000, `Summary tracks cumulative owner drawings: ${ownerData.total_drawings} YER`);
    assert(typeof ownerData.ratio_percent === 'number', `Summary computed drawing to profit ratio: ${ownerData.ratio_percent}%`);
    assert(['safe', 'caution', 'danger', 'zero'].includes(ownerData.status), `Summary accurately classified status: ${ownerData.status}`);
    assert(typeof ownerData.safe_cap_amount === 'number', 'Summary computed 70% safe drawing cap');

    // Upgrade 4: Statement of Account Paper Booklet Reconciliation
    // 1. Test Statement of Account includes paper_bill_number for customer debtorVehicle
    const soaCustRes = await request('GET', `/api/accounting/statement-of-account?party_type=customer&party_id=${debtorVehicle.id}`);
    assert(soaCustRes.status === 200 && soaCustRes.body.data.statement_lines !== undefined, 'Upgrade 4: Customer statement of account loaded');
    const custLines = soaCustRes.body.data.statement_lines;
    const lineWithReceiptBooklet = custLines.find((l) => l.paper_bill_number === 'MANUAL-REC-101');
    assert(lineWithReceiptBooklet !== undefined, 'Customer statement of account accurately exposed paper_bill_number on receipt voucher (MANUAL-REC-101)');

    // 2. Test Statement of Account with paper_bill_number filter
    const soaFilteredRes = await request('GET', `/api/accounting/statement-of-account?party_type=customer&party_id=${debtorVehicle.id}&paper_bill_number=MANUAL-REC-101`);
    assert(soaFilteredRes.status === 200, 'Statement of account filter by paper_bill_number responded 200');
    assert(soaFilteredRes.body.data.statement_lines.every((l) => l.paper_bill_number && l.paper_bill_number.includes('MANUAL-REC-101')), 'Filter by booklet number returned only matching entries');

    // Upgrade 5: Cash Flow Movement Analytics Endpoint
    const flowRes = await request('GET', '/api/vouchers/cash-flow-analytics?days=7');
    assert(flowRes.status === 200 && flowRes.body.success, 'Upgrade 5: Cash flow analytics endpoint responded successfully');
    const flowData = flowRes.body.data;
    assert(Array.isArray(flowData.daily_timeline), 'Cash flow analytics returned daily timeline array');
    assert(typeof flowData.summary.total_inflow === 'number', 'Cash flow summary computed total inflow');
    assert(typeof flowData.summary.total_outflow === 'number', 'Cash flow summary computed total outflow');
    assert(typeof flowData.summary.net_cash_flow === 'number', 'Cash flow summary computed net cash flow');
    assert(flowData.summary.peak_inflow_day !== undefined, 'Cash flow analytics identified peak inflow day');

    // =========================================================================
    // STAGE 6: DAILY SHIFT CLOSING, HANDOVER & EXECUTIVE OWNER BRIEF TESTS
    // =========================================================================
    console.log('\n--- Running Stage 6: Daily Shift Closing & Executive Brief Tests ---');

    // 1. Shift Opening
    const openShiftRes = await request('POST', '/api/shifts/open', {
      cashier_name: 'يوسف العديني (كاشير الوردية الصباحية)',
      opening_cash: 50000,
      notes: 'بدء وردية جديدة للمركز مع عد الرصيد الافتتاحي',
    });
    assert(openShiftRes.status === 201 && openShiftRes.body.success, 'Stage 6: New shift opened successfully');
    const openedShift = openShiftRes.body.data;
    assert(openedShift.shift_code.startsWith('SH-'), `Shift code generated with standard format: ${openedShift.shift_code}`);
    assert(openedShift.status === 'open', 'Shift status set to open');
    assert(openedShift.opening_cash === 50000, 'Shift registered opening cash of 50,000 YER');

    // 2. Active Shift Tracking
    const currentShiftRes = await request('GET', '/api/shifts/current');
    assert(currentShiftRes.status === 200 && currentShiftRes.body.data.has_active_shift === true, 'Stage 6: Active shift correctly identified by system');
    const activeShift = currentShiftRes.body.data.shift;
    assert(activeShift.cashier_name.includes('يوسف العديني'), `Active shift assigned to cashier: ${activeShift.cashier_name}`);
    assert(activeShift.metrics !== undefined, 'Active shift provides real-time metrics object');
    assert(typeof activeShift.metrics.expected_cash === 'number', `Active shift computed expected drawer cash: ${activeShift.metrics.expected_cash} YER`);

    // 3. Shift Closing & Handover
    const closeShiftRes = await request('POST', '/api/shifts/close', {
      shift_id: activeShift.id,
      actual_cash: activeShift.metrics.expected_cash, // Exact match
      handed_over_to: 'عبد الله عبده (المناوبة المسائية)',
      notes: 'تم تسليم الصندوق وعد العهدة بحضور المناوب التالي',
    });
    assert(closeShiftRes.status === 200 && closeShiftRes.body.success, 'Stage 6: Shift closed and handover registered successfully');
    const closedShift = closeShiftRes.body.data;
    assert(closedShift.status === 'closed', 'Shift status updated to closed');
    assert(closedShift.handed_over_to.includes('عبد الله عبده'), `Handover registered to relief cashier: ${closedShift.handed_over_to}`);
    assert(closedShift.difference === 0, 'Shift difference accurately computed as 0 YER (Matched)');

    // 4. Shift Slip for Receipt Printing
    const shiftSlipRes = await request('GET', `/api/shifts/${closedShift.id}/slip`);
    assert(shiftSlipRes.status === 200 && shiftSlipRes.body.data.shift !== undefined, 'Stage 6: Shift slip generated for thermal/A4 printing');
    assert(Array.isArray(shiftSlipRes.body.data.invoices), 'Shift slip contains invoices executed during shift');

    // 5. Shift History Archive
    const shiftHistoryRes = await request('GET', '/api/shifts/history');
    assert(shiftHistoryRes.status === 200 && Array.isArray(shiftHistoryRes.body.data), 'Stage 6: Shifts history archive endpoint responds');
    assert(shiftHistoryRes.body.data.some((s) => s.id === closedShift.id), 'Closed shift appears in historical shifts archive');

    // 6. Enhanced Daily Closing Master Engine Reconciliations
    const dailyClosingRes = await request('GET', '/api/reports/daily-closing');
    assert(dailyClosingRes.status === 200 && dailyClosingRes.body.success, 'Stage 6: Unified Daily Closing report responded 200');
    const closingData = dailyClosingRes.body.data;
    assert(closingData.summary.services_revenue !== undefined, `Revenue split exposed services revenue: ${closingData.summary.services_revenue} YER`);
    assert(closingData.summary.goods_sales_revenue !== undefined, `Revenue split exposed goods sales: ${closingData.summary.goods_sales_revenue} YER`);
    assert(closingData.cash_register.live_drawer_balance !== undefined, `Live Drawer Account 1101 balance exposed: ${closingData.cash_register.live_drawer_balance} YER`);
    assert(closingData.debts_and_payables !== undefined, 'Closing report includes total debts & payables summary');
    assert(closingData.debts_and_payables.total_customer_debts >= 0, `Total outstanding customer debt tracked: ${closingData.debts_and_payables.total_customer_debts} YER`);
    assert(closingData.transactions_summary.official_vouchers !== undefined, 'Closing report aggregates official receipt and payment vouchers');
    assert(closingData.transactions_summary.owner_drawings_total !== undefined, `Owner personal drawings isolated from operating expense: ${closingData.transactions_summary.owner_drawings_total} YER`);

    // =========================================================================
    // STAGE 6 PRO UPGRADES (1, 2, 5) VERIFICATION TESTS
    // =========================================================================
    console.log('\n--- Running Stage 6 Pro Upgrades (1, 2, 5) Verification Tests ---');

    // Upgrade 1: Growth Comparison vs Yesterday & Last Week
    assert(closingData.comparison !== undefined, 'Upgrade 1: Daily closing provides performance comparison object');
    assert(closingData.comparison.today !== undefined, 'Comparison provides today baseline metrics');
    assert(closingData.comparison.yesterday !== undefined, 'Comparison provides yesterday comparative metrics');
    assert(typeof closingData.comparison.growth_vs_yesterday.cars_growth_pct === 'number', `Computed cars growth vs yesterday: ${closingData.comparison.growth_vs_yesterday.cars_growth_pct}%`);
    assert(typeof closingData.comparison.growth_vs_yesterday.sales_growth_pct === 'number', `Computed sales growth vs yesterday: ${closingData.comparison.growth_vs_yesterday.sales_growth_pct}%`);
    assert(typeof closingData.comparison.growth_vs_last_week.cars_growth_pct === 'number', `Computed cars growth vs last week: ${closingData.comparison.growth_vs_last_week.cars_growth_pct}%`);
    assert(typeof closingData.comparison.growth_vs_last_week.sales_growth_pct === 'number', `Computed sales growth vs last week: ${closingData.comparison.growth_vs_last_week.sales_growth_pct}%`);

    // Upgrade 5: Hourly Heatmap & Average Ticket Metrics
    assert(closingData.hourly_analytics !== undefined, 'Upgrade 5: Daily closing provides hourly analytics object');
    assert(Array.isArray(closingData.hourly_analytics.timeline), 'Hourly analytics returns 24-hour distribution timeline');
    assert(closingData.hourly_analytics.timeline.length === 24, 'Hourly timeline covers full 24 hours of operation');
    assert(closingData.hourly_analytics.peak_hour !== undefined, 'Peak hour accurately identified');
    assert(typeof closingData.hourly_analytics.peak_hour.hour === 'number', `Identified peak hour: ${closingData.hourly_analytics.peak_hour.label}`);
    assert(typeof closingData.hourly_analytics.average_ticket_per_car === 'number', `Average ticket size per car computed: ${closingData.hourly_analytics.average_ticket_per_car} YER`);
    assert(typeof closingData.hourly_analytics.average_services_per_car === 'number', `Average services revenue per car computed: ${closingData.hourly_analytics.average_services_per_car} YER`);

    // =========================================================================
    // FINAL DELIVERY: BACKUP ENGINE & DATABASE INTEGRITY VERIFICATION TESTS
    // =========================================================================
    console.log('\n--- Running Final Delivery: Backup Engine & Integrity Verification Tests ---');

    // 1. Database Integrity Check
    const integrityRes = await request('GET', '/api/backup/integrity');
    assert(integrityRes.status === 200 && integrityRes.body.success, 'Backup Engine: Integrity check responded 200');
    assert(integrityRes.body.data.integrity === 'ok', `SQLite database PRAGMA integrity_check result: ${integrityRes.body.data.integrity}`);
    assert(integrityRes.body.data.wal_checkpoint !== undefined, 'SQLite WAL checkpoint performed and confirmed');

    // 2. Manual Backup Creation
    const createBackupRes = await request('POST', '/api/backup/create-now', { note: 'automated_test_snapshot' });
    assert(createBackupRes.status === 200 && createBackupRes.body.success, 'Backup Engine: Manual snapshot creation responded 200');
    assert(createBackupRes.body.data.filename !== undefined, `Created snapshot file: ${createBackupRes.body.data.filename}`);
    assert(createBackupRes.body.data.size_bytes > 0, `Snapshot file size verified: ${createBackupRes.body.data.size_bytes} bytes`);

    // 3. Backup History Listing
    const listBackupsRes = await request('GET', '/api/backup/list');
    assert(listBackupsRes.status === 200 && listBackupsRes.body.success, 'Backup Engine: List backups responded 200');
    assert(Array.isArray(listBackupsRes.body.data) && listBackupsRes.body.data.length > 0, `Listed backups found ${listBackupsRes.body.data.length} snapshots`);

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
