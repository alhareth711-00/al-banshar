/**
 * Central Enterprise Accounting Engine
 * Standard Double-Entry General Ledger, Automated Posting Rules,
 * COGS Calculation, Weighted Average Cost (WAC), and Statements of Account.
 */

const { roundMoney, safeNum, safeDiv, calcWAC } = require('./mathPrecision');
const { formatDate } = require('./helpers');

/**
 * Initializes and seeds default Chart of Accounts if not present.
 */
function seedChartOfAccounts(db) {
  const count = db.prepare('SELECT COUNT(*) as count FROM chart_of_accounts').get().count;
  if (count > 0) return;

  console.log('[Accounting] Initializing standard Chart of Accounts...');

  const accounts = [
    // 1000 - Assets (الأصول)
    { code: '1101', name: 'الصندوق النقدي الرئيسي (الدرج)', type: 'asset', sub_type: 'cash_drawer', normal_balance: 'debit', description: 'النقدية الحاضرة في درج كاشير المركز' },
    { code: '1102', name: 'حساب بنك الكريمي', type: 'asset', sub_type: 'bank', normal_balance: 'debit', description: 'حساب مصرف الكريمي للتمويل الأصغر الإسلامي' },
    { code: '1103', name: 'محفظة جيب الإلكترونية', type: 'asset', sub_type: 'e_wallet', normal_balance: 'debit', description: 'محفظة جيب (بنك اليمن الدولي)' },
    { code: '1104', name: 'محفظة جوالي الإلكترونية', type: 'asset', sub_type: 'e_wallet', normal_balance: 'debit', description: 'محفظة جوالي (بنك اليمن والكويت)' },
    { code: '1105', name: 'محفظة ون كاش الإلكترونية', type: 'asset', sub_type: 'e_wallet', normal_balance: 'debit', description: 'محفظة ون كاش (بنك القطيبي)' },
    { code: '1201', name: 'ذمم العملاء (حسابات الزبائن الآجلة)', type: 'asset', sub_type: 'receivable', normal_balance: 'debit', description: 'الديون المستحقة للمركز طرف أصحاب السيارات' },
    { code: '1202', name: 'سلف وذمم الفنيين والعمال', type: 'asset', sub_type: 'receivable', normal_balance: 'debit', description: 'المسحوبات والسلف اليومية الممنوحة للفنيين' },
    { code: '1301', name: 'مخزون الزيوت والمحركات', type: 'asset', sub_type: 'inventory', normal_balance: 'debit', description: 'قيمة مخزون زيوت السيارات بمختلف اللزوجات' },
    { code: '1302', name: 'مخزون الفلاتر', type: 'asset', sub_type: 'inventory', normal_balance: 'debit', description: 'قيمة مخزون فلاتر الزيت والهواء والمكيف' },
    { code: '1303', name: 'مخزون الإطارات والجنوط', type: 'asset', sub_type: 'inventory', normal_balance: 'debit', description: 'قيمة مخزون إطارات السيارات بمختلف المقاسات' },
    { code: '1304', name: 'مخزون البطاريات والرجيع', type: 'asset', sub_type: 'inventory', normal_balance: 'debit', description: 'قيمة مخزون البطاريات الجديدة والرجيع المسترجع' },
    { code: '1305', name: 'مخزون الإكسسوارات والمواد الاستهلاكية', type: 'asset', sub_type: 'inventory', normal_balance: 'debit', description: 'قيمة سوائل التبريد والفرامل ومستلزمات البنشر' },

    // 2000 - Liabilities (الخصوم والالتزامات)
    { code: '2101', name: 'ذمم الموردين (حسابات الموردين الدائنة)', type: 'liability', sub_type: 'payable', normal_balance: 'credit', description: 'المستحقات الآجلة لموردي ووكلاء الزيوت والإطارات' },
    { code: '2201', name: 'مستحقات وأجور العمال المستحقة', type: 'liability', sub_type: 'payable', normal_balance: 'credit', description: 'أجور وعمولات الفنيين المستحقة غير المصروفة' },

    // 3000 - Equity (حقوق الملكية)
    { code: '3101', name: 'رأس المال التشغيلي / جاري المالك', type: 'equity', sub_type: 'capital', normal_balance: 'credit', description: 'أموال مالك المركز المستثمرة في النشاط' },
    { code: '3201', name: 'الأرباح والخسائر المدورة', type: 'equity', sub_type: 'retained_earnings', normal_balance: 'credit', description: 'صافي الأرباح المتراكمة من النشاط' },

    // 4000 - Revenues (الإيرادات)
    { code: '4101', name: 'إيراد مبيعات الأصناف والبضائع', type: 'revenue', sub_type: 'goods_sales', normal_balance: 'credit', description: 'إيرادات بيع الزيوت والفلاتر والإطارات والبطاريات' },
    { code: '4201', name: 'إيراد الخدمات والتركيب', type: 'revenue', sub_type: 'service_revenue', normal_balance: 'credit', description: 'إيرادات خدمات تغيير الزيت، البنشر، والترصيص (ربح صافٍ)' },
    { code: '4301', name: 'إيراد مبيعات البطاريات الرجيع والخردة', type: 'revenue', sub_type: 'scrap_revenue', normal_balance: 'credit', description: 'عوائد بيع بطاريات السكراب المسترجعة' },

    // 5000 - Cost of Goods Sold (تكلفة البضاعة المباعة)
    { code: '5101', name: 'تكلفة البضاعة المباعة (COGS)', type: 'expense', sub_type: 'cost_of_goods_sold', normal_balance: 'debit', description: 'التكلفة الشرائية للزيوت والفلاتر والإطارات المباعة' },

    // 6000 - Operating & Administrative Expenses (المصروفات التشغيلية)
    { code: '6101', name: 'إيجار المحل والمركز', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'الإيجار الدوري لمقر المركز' },
    { code: '6102', name: 'فواتير الكهرباء والماء والماطور', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'فواتير الكهرباء والديزل للمولد والماء' },
    { code: '6103', name: 'غداء وضيافة العمال', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'وجبات غداء وشاي وضيافة الفنيين' },
    { code: '6104', name: 'أدوات وعدد ومستلزمات بنشر', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'رقع تيوبلس، غراء، بلوف، صوابين، وخرق' },
    { code: '6105', name: 'نقل ومشاوير وتنزيل بضاعة', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'أجور تحميل وتنزيل ونقل البضائع من الموردين' },
    { code: '6106', name: 'صيانة رافعات وأجهزة المركز', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'صيانة ماطور الهواء، الرافعة الهيدروليكية، وماكينة الترصيص' },
    { code: '6107', name: 'نظافة وعوائد بلدية ورسوم', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'رسوم النظافة والبلدية ومستلزمات الغسيل' },
    { code: '6108', name: 'أجور ورواتب الفنيين الأساسية', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'الأجور اليومية والشهرية الأساسية لطاقم العمل' },
    { code: '6109', name: 'مصاريف تشغيلية ونثرية عامة', type: 'expense', sub_type: 'operating_expense', normal_balance: 'debit', description: 'أي مصاريف نثرية أو طارئة أخرى' },
    { code: '6201', name: 'خصومات مسموح بها للعملاء', type: 'expense', sub_type: 'discount_allowed', normal_balance: 'debit', description: 'التخفيضات والخصومات الممنوحة في فواتير المبيعات' },
  ];

  const stmt = db.prepare(`
    INSERT INTO chart_of_accounts (code, name, type, sub_type, normal_balance, description)
    VALUES (@code, @name, @type, @sub_type, @normal_balance, @description)
  `);

  const runSeed = db.transaction(() => {
    for (const acc of accounts) {
      stmt.run(acc);
    }
  });

  runSeed();
  console.log(`[Accounting] Successfully configured ${accounts.length} enterprise accounts.`);
}

/**
 * Returns account code for a given payment method.
 */
function getPaymentMethodAccountCode(paymentMethod) {
  switch (paymentMethod) {
    case 'kuraimi': return '1102';
    case 'jeeb':    return '1103';
    case 'jawali':  return '1104';
    case 'onecash': return '1105';
    case 'credit':  return '1201'; // Customer Receivable
    case 'cash':
    default:        return '1101'; // Cash Drawer
  }
}

/**
 * Returns inventory asset account code for a given inventory category.
 */
function getInventoryAccountCode(category) {
  switch (category) {
    case 'oil':       return '1301';
    case 'filter':    return '1302';
    case 'tire':      return '1303';
    case 'battery':   return '1304';
    case 'accessory': return '1305';
    default:          return '1301';
  }
}

/**
 * Maps expense category name to appropriate expense account code.
 */
function getExpenseAccountCode(categoryName = '') {
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('إيجار') || cat.includes('ايجار')) return '6101';
  if (cat.includes('كهرباء') || cat.includes('ماء') || cat.includes('ماطور') || cat.includes('ديزل')) return '6102';
  if (cat.includes('غداء') || cat.includes('شاي') || cat.includes('ضيافة')) return '6103';
  if (cat.includes('أدوات') || cat.includes('عدد') || cat.includes('بنشر') || cat.includes('رقع')) return '6104';
  if (cat.includes('نقل') || cat.includes('مشوار') || cat.includes('تحميل')) return '6105';
  if (cat.includes('صيانة') || cat.includes('رافعة') || cat.includes('جهاز') || cat.includes('كمبيوتر')) return '6106';
  if (cat.includes('نظافة') || cat.includes('بلدية') || cat.includes('رسوم')) return '6107';
  if (cat.includes('راتب') || cat.includes('أجر') || cat.includes('يومية')) return '6108';
  return '6109'; // General operating expense
}

/**
 * Generates unique formatted sequential Journal Entry number.
 * e.g., JV-20261020-001
 */
function generateJournalNumber(db, prefix = 'JV') {
  const today = formatDate().replace(/-/g, '');
  const pattern = `${prefix}-${today}-%`;

  const last = db.prepare(`
    SELECT entry_number FROM journal_entries 
    WHERE entry_number LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(pattern);

  let seq = 1;
  if (last && last.entry_number) {
    const parts = last.entry_number.split('-');
    const parsed = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(parsed)) seq = parsed + 1;
  }

  return `${prefix}-${today}-${String(seq).padStart(3, '0')}`;
}

/**
 * Inserts a balanced Double-Entry Journal Entry with its lines.
 * Strictly enforces that Total Debit === Total Credit.
 */
function createJournalEntry(db, { entry_date, ref_type, ref_id, ref_number, description, lines }) {
  if (!lines || !Array.isArray(lines) || lines.length < 2) {
    throw new Error('القيد المحاسبي يجب أن يتكون من طرفين (مدين ودائن) على الأقل.');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const d = roundMoney(safeNum(line.debit, 0));
    const c = roundMoney(safeNum(line.credit, 0));
    line.debit = d;
    line.credit = c;
    totalDebit = roundMoney(totalDebit + d);
    totalCredit = roundMoney(totalCredit + c);
  }

  // Strict double-entry balance check (within 0.01 tolerance)
  const diff = Math.abs(roundMoney(totalDebit - totalCredit));
  if (diff > 0.01) {
    throw new Error(`القيد المحاسبي غير متوازن! إجمالي المدين: ${totalDebit} لا يساوي إجمالي الدائن: ${totalCredit} (الفارق: ${diff})`);
  }

  const entryNumber = generateJournalNumber(db);
  const entryDate = entry_date ? entry_date.slice(0, 10) : formatDate();

  const insertEntryStmt = db.prepare(`
    INSERT INTO journal_entries (
      entry_number, entry_date, ref_type, ref_id, ref_number,
      description, total_debit, total_credit, is_balanced, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', 'localtime')
    )
  `);

  const entryRes = insertEntryStmt.run(
    entryNumber,
    entryDate,
    ref_type,
    ref_id || null,
    ref_number || null,
    description.trim(),
    totalDebit,
    totalCredit
  );

  const entryId = entryRes.lastInsertRowid;

  const insertLineStmt = db.prepare(`
    INSERT INTO journal_lines (
      journal_entry_id, account_code, debit, credit,
      party_type, party_id, description, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);

  for (const line of lines) {
    // Only insert lines with non-zero amounts
    if (line.debit > 0 || line.credit > 0) {
      insertLineStmt.run(
        entryId,
        line.account_code,
        line.debit,
        line.credit,
        line.party_type || null,
        line.party_id || null,
        (line.description || description).trim()
      );
    }
  }

  return { id: entryId, entry_number: entryNumber, total_debit: totalDebit, total_credit: totalCredit };
}

/**
 * -------------------------------------------------------------------------
 * Automated Financial Postings
 * -------------------------------------------------------------------------
 */

/**
 * Posts sales invoice to general ledger and records stock movements.
 */
function postInvoice(db, { invoice, items }) {
  const lines = [];

  const paidAmount = roundMoney(safeNum(invoice.paid_amount, 0));
  const remainingDebt = roundMoney(safeNum(invoice.remaining_debt, 0));
  const itemsTotal = roundMoney(safeNum(invoice.items_total, 0));
  const laborTotal = roundMoney(safeNum(invoice.labor_total, 0));
  const scrapDeduction = roundMoney(safeNum(invoice.scrap_battery_deduction, 0));
  const discount = roundMoney(safeNum(invoice.discount, 0));

  // 1. Debit Payments
  if (paidAmount > 0) {
    const paymentAccount = getPaymentMethodAccountCode(invoice.payment_method);
    lines.push({
      account_code: paymentAccount,
      debit: paidAmount,
      credit: 0,
      description: `مقبوضات فاتورة بيع رقم (${invoice.invoice_number}) طريقة: ${invoice.payment_method}`,
    });
  }

  // 2. Debit Customer Debt (Receivable)
  if (remainingDebt > 0) {
    lines.push({
      account_code: '1201', // Customer Receivable
      debit: remainingDebt,
      credit: 0,
      party_type: 'customer',
      party_id: invoice.vehicle_id,
      description: `مبيعات آجلة (دين مستحق) فاتورة رقم (${invoice.invoice_number})`,
    });
  }

  // 3. Debit Scrap Battery Trade-In (Asset received)
  if (scrapDeduction > 0) {
    lines.push({
      account_code: '1304', // Battery / Scrap Asset
      debit: scrapDeduction,
      credit: 0,
      description: `قيمة بطارية مسترجعة (بدل تالف) فاتورة (${invoice.invoice_number})`,
    });
  }

  // 4. Debit Discount Allowed (Expense/Contra-revenue)
  if (discount > 0) {
    lines.push({
      account_code: '6201', // Discount Allowed
      debit: discount,
      credit: 0,
      description: `خصم ممنوح للعميل فاتورة (${invoice.invoice_number})`,
    });
  }

  // 5. Credit Goods Sales Revenue
  if (itemsTotal > 0) {
    lines.push({
      account_code: '4101', // Goods Sales Revenue
      debit: 0,
      credit: itemsTotal,
      description: `إيراد مبيعات بضائع فاتورة (${invoice.invoice_number})`,
    });
  }

  // 6. Credit Labor / Service Revenue (100% Margin)
  if (laborTotal > 0) {
    lines.push({
      account_code: '4201', // Labor Service Revenue
      debit: 0,
      credit: laborTotal,
      description: `إيراد خدمات وتركيب فاتورة (${invoice.invoice_number})`,
    });
  }

  // 7. Calculate and record COGS (Cost of Goods Sold) & Stock Movements
  let totalCOGS = 0;
  const inventoryCategoryCosts = {};

  for (const item of items) {
    if (item.inventory_id) {
      const inv = db.prepare('SELECT id, name, category, item_type, cost_price, stock_qty FROM inventory WHERE id = ?').get(item.inventory_id);
      // Pure labor services have no physical stock movements and no inventory COGS
      if (inv && inv.category !== 'service' && inv.item_type !== 'service') {
        const qty = safeNum(item.qty, 1);
        const costPrice = roundMoney(safeNum(inv.cost_price, 0));
        const lineCost = roundMoney(qty * costPrice);
        totalCOGS = roundMoney(totalCOGS + lineCost);

        const invAccount = getInventoryAccountCode(inv.category);
        inventoryCategoryCosts[invAccount] = roundMoney((inventoryCategoryCosts[invAccount] || 0) + lineCost);

        // Record granular stock movement
        const currentStock = safeNum(inv.stock_qty, 0);
        db.prepare(`
          INSERT INTO stock_movements (
            inventory_id, movement_type, ref_type, ref_id,
            qty_in, qty_out, unit_cost, total_cost, unit_price,
            balance_qty_after, wac_cost_after, notes, created_at
          ) VALUES (?, 'sale', 'invoice', ?, 0, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `).run(
          inv.id,
          invoice.id,
          qty,
          costPrice,
          lineCost,
          safeNum(item.unit_price, 0),
          currentStock, // After decrement in invoice creation
          costPrice,
          `صرف بيع فاتورة (${invoice.invoice_number})`
        );
      }
    }
  }

  // 8. Add COGS Journal Lines (COGS Debit, Inventory Credit)
  if (totalCOGS > 0) {
    lines.push({
      account_code: '5101', // COGS
      debit: totalCOGS,
      credit: 0,
      description: `تكلفة البضاعة المباعة لفاتورة (${invoice.invoice_number})`,
    });

    for (const [accCode, cost] of Object.entries(inventoryCategoryCosts)) {
      lines.push({
        account_code: accCode,
        debit: 0,
        credit: cost,
        description: `تخفيض المخزون بتكلفة البضاعة المباعة فاتورة (${invoice.invoice_number})`,
      });
    }
  }

  // Record Entry
  return createJournalEntry(db, {
    entry_date: invoice.created_at || formatDate(),
    ref_type: 'invoice',
    ref_id: invoice.id,
    ref_number: invoice.invoice_number,
    description: `قيد فاتورة مبيعات (${invoice.invoice_number}) - سيارة: ${invoice.plate_number || invoice.vehicle_id}`,
    lines,
  });
}

/**
 * Posts inbound purchase bill to general ledger with Weighted Average Cost (WAC).
 */
function postPurchase(db, { purchase, items }) {
  const lines = [];

  const totalAmount = roundMoney(safeNum(purchase.total_amount, 0));
  const paidAmount = roundMoney(safeNum(purchase.paid_amount, 0));
  const remainingDebt = roundMoney(safeNum(purchase.remaining_debt, 0));
  const shippingCost = roundMoney(safeNum(purchase.shipping_cost, 0));
  const shippingPayer = purchase.shipping_payer || 'cash_drawer';
  const paymentMethod = purchase.payment_method || 'cash';

  // Group purchases by inventory category account
  const categoryDebits = {};

  for (const item of items) {
    const invId = item.inventory_id || item.product_id;
    const inv = db.prepare('SELECT id, name, category, cost_price, stock_qty FROM inventory WHERE id = ?').get(invId);
    if (inv) {
      const inQty = safeNum(item.qty, 1);
      const inUnitCost = roundMoney(safeNum(item.effective_unit_cost || item.unit_cost, 0));
      const lineTotal = roundMoney(inQty * inUnitCost);

      const invAcc = getInventoryAccountCode(inv.category);
      categoryDebits[invAcc] = roundMoney((categoryDebits[invAcc] || 0) + lineTotal);

      // Calculate new WAC defensively
      const prevQty = Math.max(0, safeNum(inv.stock_qty, 0) - inQty); // stock was already incremented in model
      const prevCost = safeNum(inv.cost_price, inUnitCost);
      const newWac = calcWAC(prevQty, prevCost, inQty, inUnitCost);

      // Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, unit_price,
          balance_qty_after, wac_cost_after, notes, created_at
        ) VALUES (?, 'purchase', 'purchase', ?, ?, 0, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        inv.id,
        purchase.id,
        inQty,
        inUnitCost,
        lineTotal,
        safeNum(item.unit_sell, 0),
        inv.stock_qty,
        newWac,
        `توريد شراء فاتورة (${purchase.purchase_number}) المورد: ${purchase.supplier_name}${shippingCost > 0 ? ` [شحن موزع: ${item.allocated_shipping || 0}]` : ''}`
      );
    }
  }

  // 1. Debit Inventory Asset Accounts
  const totalLandedCost = roundMoney(totalAmount + (shippingPayer === 'cash_drawer' ? shippingCost : 0));
  let itemsSum = 0;
  for (const amount of Object.values(categoryDebits)) {
    itemsSum = roundMoney(itemsSum + amount);
  }
  const diff = roundMoney(totalLandedCost - itemsSum);
  if (Math.abs(diff) > 0.01) {
    // If there is freight/discount difference between header and lines, adjust first inventory account
    const firstCat = Object.keys(categoryDebits)[0] || '1301';
    categoryDebits[firstCat] = roundMoney((categoryDebits[firstCat] || 0) + diff);
  }

  for (const [accCode, amount] of Object.entries(categoryDebits)) {
    lines.push({
      account_code: accCode,
      debit: amount,
      credit: 0,
      description: `توريد مخزون فاتورة مشتريات (${purchase.purchase_number})`,
    });
  }

  // 2. Credit Payment (Cash / Bank)
  if (paidAmount > 0) {
    const paymentAcc = getPaymentMethodAccountCode(paymentMethod);
    lines.push({
      account_code: paymentAcc,
      debit: 0,
      credit: paidAmount,
      description: `سداد قيمة مشتريات فاتورة (${purchase.purchase_number}) طريقة: ${paymentMethod}`,
    });
  }

  // 3. Credit Cash Drawer if shipping cost paid cash from drawer
  if (shippingCost > 0 && shippingPayer === 'cash_drawer') {
    lines.push({
      account_code: '1101', // Cash drawer
      debit: 0,
      credit: shippingCost,
      description: `سداد أجور شحن ونقل بضاعة كاش للفاتورة (${purchase.purchase_number})`,
    });
  }

  // 4. Credit Supplier Accounts Payable
  if (remainingDebt > 0) {
    lines.push({
      account_code: '2101', // Supplier Payable
      debit: 0,
      credit: remainingDebt,
      party_type: 'supplier',
      party_id: purchase.supplier_id,
      description: `مشتريات آجلة ذمة مورد فاتورة (${purchase.purchase_number}) المورد: ${purchase.supplier_name}`,
    });
  }

  return createJournalEntry(db, {
    entry_date: purchase.created_at || formatDate(),
    ref_type: 'purchase',
    ref_id: purchase.id,
    ref_number: purchase.purchase_number,
    description: `قيد فاتورة مشتريات مخزون (${purchase.purchase_number}) - المورد: ${purchase.supplier_name}`,
    lines,
  });
}

/**
 * Posts purchase return (مرتجع مشتريات) to general ledger and records reverse stock movements.
 */
function postPurchaseReturn(db, { purchaseReturn, items }) {
  const lines = [];

  const totalAmount = roundMoney(safeNum(purchaseReturn.total_amount, 0));
  const refundAmount = roundMoney(safeNum(purchaseReturn.refund_amount, 0));
  const debtReduction = roundMoney(safeNum(purchaseReturn.debt_reduction_amount, 0));
  const refundMethod = purchaseReturn.refund_method || 'credit';

  // 1. Debit Refund Received (Cash/Bank) if shop received cash refund
  if (refundAmount > 0) {
    const paymentAcc = getPaymentMethodAccountCode(refundMethod);
    lines.push({
      account_code: paymentAcc,
      debit: refundAmount,
      credit: 0,
      description: `استرداد نقدي لمرتجع مشتريات (${purchaseReturn.return_number}) المورد: ${purchaseReturn.supplier_name}`,
    });
  }

  // 2. Debit Supplier Accounts Payable (Reduces our debt to supplier)
  if (debtReduction > 0) {
    lines.push({
      account_code: '2101', // Supplier Accounts Payable
      debit: debtReduction,
      credit: 0,
      party_type: 'supplier',
      party_id: purchaseReturn.supplier_id,
      description: `تخفيض ذمة مورد إثر مرتجع مشتريات (${purchaseReturn.return_number}) المورد: ${purchaseReturn.supplier_name}`,
    });
  }

  // 3. Credit Inventory Asset Accounts & Log Stock Movements (qty_out)
  const categoryCredits = {};

  for (const item of items) {
    const invId = item.inventory_id || item.product_id;
    const inv = db.prepare('SELECT id, name, category, cost_price, stock_qty FROM inventory WHERE id = ?').get(invId);
    if (inv) {
      const outQty = safeNum(item.qty, 1);
      const unitCost = roundMoney(safeNum(item.unit_cost, inv.cost_price || 0));
      const lineTotal = roundMoney(outQty * unitCost);

      const invAcc = getInventoryAccountCode(inv.category);
      categoryCredits[invAcc] = roundMoney((categoryCredits[invAcc] || 0) + lineTotal);

      // Record stock movement (outbound)
      db.prepare(`
        INSERT INTO stock_movements (
          inventory_id, movement_type, ref_type, ref_id,
          qty_in, qty_out, unit_cost, total_cost, unit_price,
          balance_qty_after, wac_cost_after, notes, created_at
        ) VALUES (?, 'purchase_return', 'purchase_return', ?, 0, ?, ?, ?, 0, ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        inv.id,
        purchaseReturn.id,
        outQty,
        unitCost,
        lineTotal,
        inv.stock_qty,
        inv.cost_price,
        `مرتجع بضاعة لمورد (${purchaseReturn.return_number}) سبب: ${purchaseReturn.reason || 'تالف أو غير مطابق'}`
      );
    }
  }

  // Balance difference if any
  let itemsSum = 0;
  for (const amount of Object.values(categoryCredits)) {
    itemsSum = roundMoney(itemsSum + amount);
  }
  const diff = roundMoney(totalAmount - itemsSum);
  if (Math.abs(diff) > 0.01) {
    const firstCat = Object.keys(categoryCredits)[0] || '1301';
    categoryCredits[firstCat] = roundMoney((categoryCredits[firstCat] || 0) + diff);
  }

  for (const [accCode, amount] of Object.entries(categoryCredits)) {
    lines.push({
      account_code: accCode,
      debit: 0,
      credit: amount,
      description: `خصم مخزون إثر مرتجع مشتريات (${purchaseReturn.return_number})`,
    });
  }

  return createJournalEntry(db, {
    entry_date: purchaseReturn.created_at || formatDate(),
    ref_type: 'purchase_return',
    ref_id: purchaseReturn.id,
    ref_number: purchaseReturn.return_number,
    description: `قيد مرتجع مشتريات (${purchaseReturn.return_number}) - المورد: ${purchaseReturn.supplier_name}`,
    lines,
  });
}

/**
 * Posts operating expense transaction.
 */
function postExpense(db, tx) {
  const amount = roundMoney(safeNum(tx.amount, 0));
  const paymentAcc = getPaymentMethodAccountCode(tx.payment_method);
  const expenseAcc = getExpenseAccountCode(tx.description);

  const lines = [
    {
      account_code: expenseAcc,
      debit: amount,
      credit: 0,
      description: tx.description,
    },
    {
      account_code: paymentAcc,
      debit: 0,
      credit: amount,
      description: `صرف مصروف تشغيلي: ${tx.description}`,
    },
  ];

  return createJournalEntry(db, {
    entry_date: tx.created_at || formatDate(),
    ref_type: 'expense',
    ref_id: tx.id,
    description: `قيد مصروف تشغيلي: ${tx.description}`,
    lines,
  });
}

/**
 * Posts customer debt collection receipt.
 */
function postDebtCollection(db, tx) {
  const amount = roundMoney(safeNum(tx.amount, 0));
  const paymentAcc = getPaymentMethodAccountCode(tx.payment_method);

  const lines = [
    {
      account_code: paymentAcc,
      debit: amount,
      credit: 0,
      description: `قبض دفعة دين: ${tx.description}`,
    },
    {
      account_code: '1201', // Customer Receivable
      debit: 0,
      credit: amount,
      party_type: 'customer',
      party_id: tx.vehicle_id,
      description: `سند قبض تخفيض دين عميل: ${tx.description}`,
    },
  ];

  return createJournalEntry(db, {
    entry_date: tx.created_at || formatDate(),
    ref_type: 'debt_collection',
    ref_id: tx.id,
    description: `قيد سند قبض دفعة دين عميل - ${tx.description}`,
    lines,
  });
}

/**
 * Posts supplier debt payment voucher (سند صرف دفعة مورد).
 */
function postSupplierPayment(db, { supplier_id, supplier_name, amount, payment_method, notes }) {
  const payAmount = roundMoney(safeNum(amount, 0));
  const paymentAcc = getPaymentMethodAccountCode(payment_method);

  const lines = [
    {
      account_code: '2101', // Supplier Payable
      debit: payAmount,
      credit: 0,
      party_type: 'supplier',
      party_id: supplier_id,
      description: `سداد دفعة حساب للمورد: ${supplier_name} ${notes ? `(${notes})` : ''}`,
    },
    {
      account_code: paymentAcc,
      debit: 0,
      credit: payAmount,
      description: `صرف دفعة للمورد: ${supplier_name}`,
    },
  ];

  return createJournalEntry(db, {
    entry_date: formatDate(),
    ref_type: 'supplier_payment',
    ref_id: supplier_id,
    description: `قيد سند صرف دفعة حساب للمورد: ${supplier_name}`,
    lines,
  });
}

/**
 * Posts technician advance transaction.
 */
function postWorkerAdvance(db, tx) {
  const amount = roundMoney(safeNum(tx.amount, 0));
  const paymentAcc = getPaymentMethodAccountCode(tx.payment_method);

  const lines = [
    {
      account_code: '1202', // Worker Advance Receivable
      debit: amount,
      credit: 0,
      party_type: 'worker',
      party_id: tx.worker_id,
      description: `سلفة نقدية للفني: ${tx.description}`,
    },
    {
      account_code: paymentAcc,
      debit: 0,
      credit: amount,
      description: `صرف سلفة نقدية: ${tx.description}`,
    },
  ];

  return createJournalEntry(db, {
    entry_date: tx.created_at || formatDate(),
    ref_type: 'worker_advance',
    ref_id: tx.id,
    description: `قيد سلفة فني: ${tx.description}`,
    lines,
  });
}

/**
 * Posts official receipt or payment voucher (سند قبض أو سند صرف رسمي).
 */
function postOfficialVoucher(db, voucher) {
  const lines = [];
  const amount = roundMoney(safeNum(voucher.amount, 0));
  const cashAcc = voucher.cash_account_code || getPaymentMethodAccountCode(voucher.payment_method);
  const offsetAcc = voucher.offset_account_code || (voucher.voucher_type === 'receipt' ? '1201' : '5109');

  if (voucher.voucher_type === 'receipt') {
    // Receipt: Inflow to Cash/Bank, Credit to Customer Receivable / Revenue / Offset
    lines.push({
      account_code: cashAcc,
      debit: amount,
      credit: 0,
      description: `مقبوضات سند قبض (${voucher.voucher_number}) من: ${voucher.party_name}`,
    });
    lines.push({
      account_code: offsetAcc,
      debit: 0,
      credit: amount,
      party_type: voucher.party_type || null,
      party_id: voucher.party_id || null,
      description: `سند قبض رسمي (${voucher.voucher_number}) - ${voucher.description}`,
    });
  } else {
    // Payment: Outflow from Cash/Bank, Debit to Supplier / Expense / Owner Drawings / Offset
    lines.push({
      account_code: offsetAcc,
      debit: amount,
      credit: 0,
      party_type: voucher.party_type || null,
      party_id: voucher.party_id || null,
      description: `سند صرف رسمي (${voucher.voucher_number}) إلى: ${voucher.party_name} - ${voucher.description}`,
    });
    lines.push({
      account_code: cashAcc,
      debit: 0,
      credit: amount,
      description: `مدفوعات سند صرف (${voucher.voucher_number}) طريقة: ${voucher.payment_method}`,
    });
  }

  const refType = voucher.voucher_type === 'receipt'
    ? 'debt_collection'
    : (voucher.party_type === 'supplier'
        ? 'supplier_payment'
        : (voucher.party_type === 'worker' ? 'worker_advance' : 'expense'));

  return createJournalEntry(db, {
    entry_date: voucher.created_at ? voucher.created_at.split(' ')[0] : formatDate(),
    ref_type: refType,
    ref_id: voucher.id,
    ref_number: voucher.voucher_number,
    description: `قيد ${voucher.voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف'} رقم (${voucher.voucher_number}) طرف: ${voucher.party_name}`,
    lines,
  });
}

/**
 * -------------------------------------------------------------------------
 * Financial Reports & Statements of Account
 * -------------------------------------------------------------------------
 */

/**
 * Generates official Statement of Account (كشف حساب تفصيلي مع الرصيد التراكمي).
 */
function getStatementOfAccount(db, { party_type, party_id, start_date, end_date, paper_bill_number }) {
  if (!party_type || !party_id) {
    throw new Error('نوع الطرف (party_type) والمعرف (party_id) مطلوبان لتوليد كشف الحساب.');
  }

  // Determine party name and info
  let partyName = '';
  let partyPhone = '';
  let accountCode = '1201';

  if (party_type === 'customer') {
    const v = db.prepare('SELECT customer_name, phone, car_make_model, plate_number FROM customers_vehicles WHERE id = ?').get(party_id);
    if (!v) throw new Error('العميل / السيارة غير موجودة');
    partyName = `${v.customer_name} (${v.plate_number} - ${v.car_make_model})`;
    partyPhone = v.phone;
    accountCode = '1201';
  } else if (party_type === 'supplier') {
    const s = db.prepare('SELECT name, phone, company_name FROM suppliers WHERE id = ?').get(party_id);
    if (!s) throw new Error('المورد غير موجود');
    partyName = s.company_name ? `${s.name} - ${s.company_name}` : s.name;
    partyPhone = s.phone;
    accountCode = '2101';
  } else if (party_type === 'worker') {
    const w = db.prepare('SELECT name, phone, role FROM workers WHERE id = ?').get(party_id);
    if (!w) throw new Error('الفني / العامل غير موجود');
    partyName = `${w.name} (${w.role})`;
    partyPhone = w.phone;
    accountCode = '1202';
  }

  // Calculate opening balance before start_date
  let openingBalance = 0;
  if (start_date) {
    const prevRows = db.prepare(`
      SELECT jl.debit, jl.credit
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = ? 
        AND jl.party_type = ? 
        AND jl.party_id = ?
        AND date(je.entry_date) < date(?)
    `).all(accountCode, party_type, party_id, start_date);

    for (const r of prevRows) {
      if (party_type === 'customer' || party_type === 'worker') {
        // Debit increases customer/worker debt, credit decreases it
        openingBalance = roundMoney(openingBalance + r.debit - r.credit);
      } else {
        // Supplier is liability: credit increases payable, debit decreases it
        openingBalance = roundMoney(openingBalance + r.credit - r.debit);
      }
    }
  }

  // Fetch transactions in date range
  let query = `
    SELECT 
      je.id AS entry_id,
      je.entry_number,
      je.entry_date,
      je.ref_type,
      je.ref_number,
      jl.description,
      jl.debit,
      jl.credit,
      jl.created_at,
      COALESCE(
        (SELECT paper_bill_number FROM purchases WHERE purchase_number = je.ref_number LIMIT 1),
        (SELECT paper_bill_number FROM official_vouchers WHERE voucher_number = je.ref_number LIMIT 1),
        NULL
      ) AS paper_bill_number
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE jl.account_code = ? 
      AND jl.party_type = ? 
      AND jl.party_id = ?
  `;
  const params = [accountCode, party_type, party_id];

  if (start_date) {
    query += ' AND date(je.entry_date) >= date(?)';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND date(je.entry_date) <= date(?)';
    params.push(end_date);
  }

  query += ' ORDER BY je.entry_date ASC, je.id ASC';
  let transactions = db.prepare(query).all(...params);

  // Optional filter by paper_bill_number (Upgrade 4)
  if (paper_bill_number && paper_bill_number.trim()) {
    const pTerm = paper_bill_number.trim().toLowerCase();
    transactions = transactions.filter((t) =>
      t.paper_bill_number && t.paper_bill_number.toLowerCase().includes(pTerm)
    );
  }

  // Compute running balance
  let runningBalance = openingBalance;
  let totalDebits = 0;
  let totalCredits = 0;

  const rows = transactions.map((t) => {
    totalDebits = roundMoney(totalDebits + t.debit);
    totalCredits = roundMoney(totalCredits + t.credit);

    if (party_type === 'customer' || party_type === 'worker') {
      runningBalance = roundMoney(runningBalance + t.debit - t.credit);
    } else {
      runningBalance = roundMoney(runningBalance + t.credit - t.debit);
    }

    return {
      ...t,
      running_balance: runningBalance,
    };
  });

  return {
    party_type,
    party_id,
    party_name: partyName,
    party_phone: partyPhone,
    account_code: accountCode,
    start_date: start_date || 'منذ البداية',
    end_date: end_date || formatDate(),
    opening_balance: openingBalance,
    total_debits: totalDebits,
    total_credits: totalCredits,
    closing_balance: runningBalance,
    transactions_count: rows.length,
    statement_lines: rows,
  };
}

/**
 * Computes Trial Balance (ميزان المراجعة).
 */
function getTrialBalance(db, asOfDate) {
  const date = asOfDate || formatDate();

  const accounts = db.prepare(`
    SELECT 
      coa.code,
      coa.name,
      coa.type,
      coa.sub_type,
      coa.normal_balance,
      COALESCE(SUM(jl.debit), 0) AS total_debit,
      COALESCE(SUM(jl.credit), 0) AS total_credit
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON coa.code = jl.account_code
    LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND date(je.entry_date) <= date(?)
    GROUP BY coa.code
    ORDER BY coa.code ASC
  `).all(date);

  let grandDebit = 0;
  let grandCredit = 0;

  const trialRows = accounts.map((acc) => {
    const debit = roundMoney(acc.total_debit);
    const credit = roundMoney(acc.total_credit);
    grandDebit = roundMoney(grandDebit + debit);
    grandCredit = roundMoney(grandCredit + credit);

    let netDebit = 0;
    let netCredit = 0;

    if (acc.normal_balance === 'debit') {
      const net = roundMoney(debit - credit);
      if (net >= 0) netDebit = net;
      else netCredit = Math.abs(net);
    } else {
      const net = roundMoney(credit - debit);
      if (net >= 0) netCredit = net;
      else netDebit = Math.abs(net);
    }

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      sub_type: acc.sub_type,
      normal_balance: acc.normal_balance,
      total_debit: debit,
      total_credit: credit,
      net_debit: netDebit,
      net_credit: netCredit,
    };
  });

  const isBalanced = Math.abs(roundMoney(grandDebit - grandCredit)) <= 0.01;

  return {
    as_of_date: date,
    grand_total_debit: grandDebit,
    grand_total_credit: grandCredit,
    is_balanced: isBalanced,
    accounts: trialRows,
  };
}

/**
 * Generates standard Financial Income Statement (قائمة الدخل والأرباح والخسائر).
 * Separates Goods Sales, Cost of Goods Sold (COGS), Service/Labor Revenues (100% margin),
 * Operating Expenses, and Net Profit.
 */
function getIncomeStatement(db, { start_date, end_date } = {}) {
  const start = start_date || '2000-01-01';
  const end = end_date || formatDate();

  // Helper to sum account movements
  const getAccountMovement = (code) => {
    const res = db.prepare(`
      SELECT COALESCE(SUM(jl.debit), 0) AS total_debit, COALESCE(SUM(jl.credit), 0) AS total_credit
      FROM journal_lines jl
      JOIN journal_entries je ON jl.journal_entry_id = je.id
      WHERE jl.account_code = ? AND date(je.entry_date) BETWEEN date(?) AND date(?)
    `).get(code, start, end);
    return { debit: roundMoney(res.total_debit), credit: roundMoney(res.total_credit) };
  };

  // 1. Goods Sales Revenue (4101)
  const goodsSales = getAccountMovement('4101');
  const totalGoodsRevenue = roundMoney(goodsSales.credit - goodsSales.debit);

  // 2. Cost of Goods Sold (5101)
  const cogsMov = getAccountMovement('5101');
  const totalCOGS = roundMoney(cogsMov.debit - cogsMov.credit);

  // 3. Gross Profit on Goods
  const grossProfitGoods = roundMoney(totalGoodsRevenue - totalCOGS);
  const goodsMarginPercentage = totalGoodsRevenue > 0 ? roundMoney((grossProfitGoods / totalGoodsRevenue) * 100) : 0;

  // 4. Labor / Service Revenue (4201)
  const laborMov = getAccountMovement('4201');
  const totalLaborRevenue = roundMoney(laborMov.credit - laborMov.debit);

  // 5. Scrap Battery Trade-in Revenue (4301)
  const scrapMov = getAccountMovement('4301');
  const totalScrapRevenue = roundMoney(scrapMov.credit - scrapMov.debit);

  // Total Gross Operating Income
  const grossOperatingIncome = roundMoney(grossProfitGoods + totalLaborRevenue + totalScrapRevenue);

  // 6. Discounts Allowed (6201)
  const discMov = getAccountMovement('6201');
  const totalDiscounts = roundMoney(discMov.debit - discMov.credit);

  // 7. Operating Expenses Breakdown
  const expenseAccounts = db.prepare(`
    SELECT coa.code, coa.name,
      COALESCE(SUM(jl.debit - jl.credit), 0) AS amount
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON coa.code = jl.account_code
    LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id AND date(je.entry_date) BETWEEN date(?) AND date(?)
    WHERE coa.type = 'expense' AND coa.code NOT IN ('5101', '6201')
    GROUP BY coa.code
    HAVING amount > 0
    ORDER BY amount DESC
  `).all(start, end);

  let totalOperatingExpenses = 0;
  for (const exp of expenseAccounts) {
    exp.amount = roundMoney(exp.amount);
    totalOperatingExpenses = roundMoney(totalOperatingExpenses + exp.amount);
  }

  // 8. Net Operating Profit
  const netProfit = roundMoney(grossOperatingIncome - totalOperatingExpenses - totalDiscounts);

  return {
    period: { start_date: start, end_date: end },
    revenues: {
      goods_sales_revenue: totalGoodsRevenue,
      labor_service_revenue: totalLaborRevenue,
      scrap_revenue: totalScrapRevenue,
      total_gross_revenues: roundMoney(totalGoodsRevenue + totalLaborRevenue + totalScrapRevenue),
    },
    cost_of_goods_sold: {
      total_cogs: totalCOGS,
      gross_profit_on_goods: grossProfitGoods,
      margin_percentage: goodsMarginPercentage,
    },
    gross_operating_income: grossOperatingIncome,
    deductions: {
      discounts_allowed: totalDiscounts,
    },
    operating_expenses: {
      total: totalOperatingExpenses,
      breakdown: expenseAccounts,
    },
    net_profit: netProfit,
    net_profit_status: netProfit >= 0 ? 'ربح صافٍ' : 'خسارة',
  };
}

/**
 * Returns Realtime Balance Sheet of Liquid Assets, Receivables, Payables, and Stock Value.
 */
function getRealtimeBalanceSheet(db) {
  // 1. Cash and E-Wallets
  const liquidAccounts = db.prepare(`
    SELECT coa.code, coa.name, coa.sub_type,
      COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON coa.code = jl.account_code
    WHERE coa.code IN ('1101', '1102', '1103', '1104', '1105')
    GROUP BY coa.code
    ORDER BY coa.code ASC
  `).all();

  let totalLiquid = 0;
  let cashDrawer = 0;
  let totalWallets = 0;

  for (const a of liquidAccounts) {
    a.balance = roundMoney(a.balance);
    totalLiquid = roundMoney(totalLiquid + a.balance);
    if (a.code === '1101') cashDrawer = a.balance;
    else totalWallets = roundMoney(totalWallets + a.balance);
  }

  // 2. Receivables (Customer debts & worker advances)
  const custDebtRes = db.prepare("SELECT COALESCE(SUM(balance_due), 0) as total FROM customers_vehicles").get();
  const totalCustomerDebts = roundMoney(custDebtRes.total);

  const workerAdvancesRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM daily_transactions 
    WHERE tx_type = 'worker_advance' AND date(created_at) = date('now', 'localtime')
  `).get();
  const totalWorkerAdvancesToday = roundMoney(workerAdvancesRes.total);

  // 3. Inventory Current Asset Valuation (at cost)
  const inventoryValuation = db.prepare(`
    SELECT 
      category,
      COUNT(*) AS items_count,
      COALESCE(SUM(stock_qty), 0) AS total_units,
      COALESCE(SUM(stock_qty * cost_price), 0) AS total_cost_value,
      COALESCE(SUM(stock_qty * sell_price), 0) AS total_sell_value
    FROM inventory
    GROUP BY category
  `).all();

  let totalInventoryCostValue = 0;
  let totalInventorySellValue = 0;
  for (const iv of inventoryValuation) {
    iv.total_cost_value = roundMoney(iv.total_cost_value);
    iv.total_sell_value = roundMoney(iv.total_sell_value);
    totalInventoryCostValue = roundMoney(totalInventoryCostValue + iv.total_cost_value);
    totalInventorySellValue = roundMoney(totalInventorySellValue + iv.total_sell_value);
  }

  // 4. Payables (Suppliers)
  const supplierPayablesRes = db.prepare("SELECT COALESCE(SUM(balance_due), 0) as total FROM suppliers").get();
  const totalSupplierPayables = roundMoney(supplierPayablesRes.total);

  // Total Assets & Liabilities
  const totalAssets = roundMoney(totalLiquid + totalCustomerDebts + totalInventoryCostValue);
  const totalLiabilities = totalSupplierPayables;
  const netWorkingCapital = roundMoney(totalAssets - totalLiabilities);

  return {
    treasury_and_banks: {
      cash_drawer: cashDrawer,
      e_wallets_and_banks: totalWallets,
      total_liquid: totalLiquid,
      accounts: liquidAccounts,
    },
    receivables: {
      customer_debts: totalCustomerDebts,
      worker_advances_today: totalWorkerAdvancesToday,
      total_receivables: totalCustomerDebts,
    },
    inventory_assets: {
      total_cost_value: totalInventoryCostValue,
      total_sell_value: totalInventorySellValue,
      expected_future_profit: roundMoney(totalInventorySellValue - totalInventoryCostValue),
      categories: inventoryValuation,
    },
    liabilities: {
      supplier_payables: totalSupplierPayables,
      total_liabilities: totalLiabilities,
    },
    net_working_capital: netWorkingCapital,
  };
}

/**
 * -------------------------------------------------------------------------
 * Upgrade 2 & 5: Real-time Financial Pulse & Bay Profitability Analysis
 * -------------------------------------------------------------------------
 */

/**
 * Upgrade 2: Real-time Financial Pulse (النبض المالي الحي)
 */
function getFinancialPulse(db) {
  const today = formatDate();

  // 1. Liquid Assets (Cash Drawer + E-Wallets)
  const liquidAccounts = db.prepare(`
    SELECT coa.code, coa.name, coa.sub_type,
      COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON coa.code = jl.account_code
    WHERE coa.code IN ('1101', '1102', '1103', '1104', '1105')
    GROUP BY coa.code
    ORDER BY coa.code ASC
  `).all();

  let totalLiquid = 0;
  let cashDrawer = 0;
  let totalWallets = 0;
  for (const a of liquidAccounts) {
    a.balance = roundMoney(a.balance);
    totalLiquid = roundMoney(totalLiquid + a.balance);
    if (a.code === '1101') cashDrawer = a.balance;
    else totalWallets = roundMoney(totalWallets + a.balance);
  }

  // 2. Inventory Asset Value at Cost (WAC)
  const invRes = db.prepare(`
    SELECT 
      COALESCE(SUM(stock_qty * cost_price), 0) AS total_cost_value,
      COALESCE(SUM(stock_qty * sell_price), 0) AS total_sell_value,
      COUNT(*) AS total_items,
      SUM(CASE WHEN stock_qty <= min_stock_alert THEN 1 ELSE 0 END) AS low_stock_count
    FROM inventory
  `).get();

  // 3. Outstanding Customer Debts
  const debtRes = db.prepare(`
    SELECT 
      COALESCE(SUM(balance_due), 0) AS total_debts,
      COUNT(CASE WHEN balance_due > 0 THEN 1 END) AS debtors_count
    FROM customers_vehicles
  `).get();

  // 4. Today's Invoices & Revenues
  const todayInvoices = db.prepare(`
    SELECT 
      COUNT(*) AS total_invoices,
      COALESCE(SUM(items_total), 0) AS goods_revenue,
      COALESCE(SUM(labor_total), 0) AS pure_labor_revenue,
      COALESCE(SUM(net_total), 0) AS net_sales,
      COALESCE(SUM(discount), 0) AS discounts
    FROM invoices
    WHERE date(created_at) = date(?)
  `).get(today);

  // Today's COGS from journal lines
  const todayCogsRes = db.prepare(`
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS cogs
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE jl.account_code = '5101' AND date(je.entry_date) = date(?)
  `).get(today);
  const todayCOGS = roundMoney(todayCogsRes.cogs);

  // Today's Operating Expenses
  const todayExpRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses
    FROM daily_transactions
    WHERE tx_type = 'expense' AND date(created_at) = date(?)
  `).get(today);
  const todayExpenses = roundMoney(todayExpRes.expenses);

  const goodsProfit = roundMoney(todayInvoices.goods_revenue - todayCOGS);
  const grossOperatingProfit = roundMoney(goodsProfit + todayInvoices.pure_labor_revenue);
  const todayNetProfit = roundMoney(grossOperatingProfit - todayExpenses - todayInvoices.discounts);

  return {
    date: today,
    liquid: {
      total: totalLiquid,
      cash_drawer: cashDrawer,
      wallets: totalWallets,
      accounts: liquidAccounts,
    },
    inventory: {
      cost_value: roundMoney(invRes.total_cost_value),
      sell_value: roundMoney(invRes.total_sell_value),
      total_items: invRes.total_items,
      low_stock_count: invRes.low_stock_count || 0,
    },
    debts: {
      total_customer_debts: roundMoney(debtRes.total_debts),
      debtors_count: debtRes.debtors_count || 0,
    },
    today: {
      total_invoices: todayInvoices.total_invoices,
      goods_revenue: roundMoney(todayInvoices.goods_revenue),
      pure_labor_revenue: roundMoney(todayInvoices.pure_labor_revenue),
      cogs: todayCOGS,
      goods_gross_profit: goodsProfit,
      operating_expenses: todayExpenses,
      discounts: roundMoney(todayInvoices.discounts),
      net_profit: todayNetProfit,
    },
  };
}

/**
 * Upgrade 5: Bay Profitability & Services Margin (كفاءة ربحية الحفرة والخدمات)
 */
function getBayProfitability(db, { start_date, end_date } = {}) {
  const start = start_date || '2000-01-01';
  const end = end_date || formatDate();

  // Pure Labor & Services Revenue
  const laborSummary = db.prepare(`
    SELECT 
      COUNT(DISTINCT i.id) AS invoices_with_service,
      COUNT(DISTINCT i.vehicle_id) AS vehicles_served,
      COALESCE(SUM(i.labor_total), 0) AS total_labor_revenue,
      COALESCE(SUM(i.items_total), 0) AS total_goods_revenue
    FROM invoices i
    WHERE date(i.created_at) BETWEEN date(?) AND date(?)
  `).get(start, end);

  // COGS for the period
  const cogsRes = db.prepare(`
    SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS cogs
    FROM journal_lines jl
    JOIN journal_entries je ON jl.journal_entry_id = je.id
    WHERE jl.account_code = '5101' AND date(je.entry_date) BETWEEN date(?) AND date(?)
  `).get(start, end);
  const totalCogs = roundMoney(cogsRes.cogs);
  const goodsGrossProfit = roundMoney(laborSummary.total_goods_revenue - totalCogs);

  // Operating Expenses for the period
  const expRes = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS expenses
    FROM daily_transactions
    WHERE tx_type = 'expense' AND date(created_at) BETWEEN date(?) AND date(?)
  `).get(start, end);
  const totalExpenses = roundMoney(expRes.expenses);

  // Labor-to-OpEx Coverage Ratio = (Pure Labor Revenue / Operating Expenses) * 100
  const laborCoverageRatio = totalExpenses > 0
    ? roundMoney((laborSummary.total_labor_revenue / totalExpenses) * 100)
    : 100;

  // Breakdown of top services performed from invoice items
  const serviceItems = db.prepare(`
    SELECT 
      description,
      COUNT(*) AS times_performed,
      COALESCE(SUM(labor_fee), 0) AS total_revenue
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    WHERE (ii.item_type = 'service' OR ii.labor_fee > 0)
      AND date(i.created_at) BETWEEN date(?) AND date(?)
    GROUP BY description
    ORDER BY total_revenue DESC
    LIMIT 10
  `).all(start, end);

  // Average labor revenue per car
  const avgLaborPerCar = laborSummary.vehicles_served > 0
    ? roundMoney(laborSummary.total_labor_revenue / laborSummary.vehicles_served)
    : 0;

  return {
    period: { start_date: start, end_date: end },
    summary: {
      pure_labor_revenue: roundMoney(laborSummary.total_labor_revenue),
      goods_gross_profit: goodsGrossProfit,
      total_gross_income: roundMoney(laborSummary.total_labor_revenue + goodsGrossProfit),
      operating_expenses: totalExpenses,
      labor_coverage_ratio_percent: laborCoverageRatio,
      vehicles_served: laborSummary.vehicles_served,
      avg_labor_per_car: avgLaborPerCar,
    },
    top_services: serviceItems.map(s => ({
      description: s.description,
      times_performed: s.times_performed,
      total_revenue: roundMoney(s.total_revenue),
    })),
  };
}

/**
 * Upgrade 4: Loss Prevention & Credit Ceiling Safeguards (فحص منع البيع بالخسارة وسقف الدين)
 */
function checkInvoiceSafeguards(db, { vehicle_id, items = [], payment_method = 'cash', paid_amount = null }) {
  const warnings = [];
  const belowCostItems = [];

  // 1. Check Below-Cost Selling
  for (const item of items) {
    if (item.inventory_id) {
      const inv = db.prepare('SELECT id, name, cost_price, sell_price, stock_qty FROM inventory WHERE id = ?').get(item.inventory_id);
      if (inv) {
        const unitPrice = safeNum(item.unit_price, 0);
        const costPrice = roundMoney(inv.cost_price);
        if (unitPrice > 0 && unitPrice < costPrice) {
          const lossPerUnit = roundMoney(costPrice - unitPrice);
          belowCostItems.push({
            inventory_id: inv.id,
            name: inv.name,
            cost_price: costPrice,
            unit_price: unitPrice,
            loss_per_unit: lossPerUnit,
          });
          warnings.push({
            type: 'below_cost',
            message: `تنبيه ربحية: الصنف "${inv.name}" يُباع بسعر (${unitPrice} ر.ي) وهو أقل من التكلفة (${costPrice} ر.ي) بخسارة (${lossPerUnit} ر.ي) للقطعة!`,
          });
        }
      }
    }
  }

  // 2. Check Customer Credit Limit
  let creditLimitExceeded = false;
  let currentDebt = 0;
  let creditLimit = 50000;
  let projectedDebt = 0;

  if (vehicle_id) {
    const vehicle = db.prepare('SELECT id, customer_name, balance_due, credit_limit FROM customers_vehicles WHERE id = ?').get(vehicle_id);
    if (vehicle) {
      currentDebt = roundMoney(safeNum(vehicle.balance_due, 0));
      creditLimit = roundMoney(safeNum(vehicle.credit_limit, 50000));

      const itemsTotal = items.reduce((acc, i) => acc + (safeNum(i.qty, 1) * safeNum(i.unit_price, 0)), 0);
      const laborTotal = items.reduce((acc, i) => acc + safeNum(i.labor_fee, 0), 0);
      const netTotal = itemsTotal + laborTotal;
      const paid = paid_amount !== null && paid_amount !== undefined && paid_amount !== ''
        ? safeNum(paid_amount, 0)
        : (payment_method === 'credit' ? 0 : netTotal);
      const newDebt = Math.max(0, netTotal - paid);
      projectedDebt = roundMoney(currentDebt + newDebt);

      if (projectedDebt > creditLimit && newDebt > 0) {
        creditLimitExceeded = true;
        warnings.push({
          type: 'credit_limit_exceeded',
          message: `تنبيه سقف الدين: إجمالي دين العميل المتوقع (${projectedDebt.toLocaleString()} ر.ي) يتجاوز سقف الائتمان (${creditLimit.toLocaleString()} ر.ي) بمقدار (${roundMoney(projectedDebt - creditLimit).toLocaleString()} ر.ي)!`,
        });
      }
    }
  }

  return {
    has_warnings: warnings.length > 0,
    warnings,
    below_cost_items: belowCostItems,
    credit_guard: {
      current_debt: currentDebt,
      credit_limit: creditLimit,
      projected_debt: projectedDebt,
      is_exceeded: creditLimitExceeded,
    },
  };
}

module.exports = {
  seedChartOfAccounts,
  getPaymentMethodAccountCode,
  getInventoryAccountCode,
  getExpenseAccountCode,
  generateJournalNumber,
  createJournalEntry,
  postInvoice,
  postPurchase,
  postPurchaseReturn,
  postExpense,
  postDebtCollection,
  postSupplierPayment,
  postWorkerAdvance,
  postOfficialVoucher,
  getStatementOfAccount,
  getTrialBalance,
  getIncomeStatement,
  getRealtimeBalanceSheet,
  getFinancialPulse,
  getBayProfitability,
  checkInvoiceSafeguards,
};
