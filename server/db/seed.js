const db = require('./database');
const { formatDate, addDaysToDate } = require('../utils/helpers');

function seedDatabase(force = false) {
  // Check if database already has vehicles or inventory
  const vehicleCount = db.prepare('SELECT COUNT(*) as count FROM customers_vehicles').get().count;
  const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get().count;

  console.log('[Seed] Seeding database with realistic Yemeni market demo data...');

  // Helper to ensure expense categories exist
  seedExpenseCategories();
  seedSuppliersAndPurchases();

  if (!force && vehicleCount > 0 && inventoryCount > 0) {
    console.log(`[Seed] Database already contains ${vehicleCount} vehicles and ${inventoryCount} inventory items. Skipping vehicle/inventory seed.`);
    return;
  }


  const today = formatDate();
  const dateOverdue1 = addDaysToDate(today, -18); // 18 days ago
  const dateOverdue2 = addDaysToDate(today, -5);  // 5 days ago
  const dateApproaching = addDaysToDate(today, 4); // in 4 days
  const dateFuture1 = addDaysToDate(today, 28);    // in 28 days
  const dateFuture2 = addDaysToDate(today, 45);    // in 45 days

  const runSeed = db.transaction(() => {
    // 1. Insert Workers
    const insertWorker = db.prepare(`
      INSERT INTO workers (id, name, role, phone, daily_base_wage, commission_rate, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

    insertWorker.run(1, 'معاذ عبده الصبري', 'فني غيار زيوت وفلاتر', '770112233', 6000, 15.0);
    insertWorker.run(2, 'همدان قاسم الشميري', 'فني بنشر وترصيص كفرات', '772334455', 6000, 20.0);
    insertWorker.run(3, 'يحيى مسعد الريمي', 'كهربائي بطاريات وفحص كمبيوتر', '774556677', 7000, 15.0);

    // 2. Insert Inventory Items (Yemeni Market Brands & Real Specs)
    const insertInv = db.prepare(`
      INSERT INTO inventory (
        id, sku, name, category, brand, viscosity, pack_size,
        tire_battery_spec, warranty_months, cost_price, sell_price,
        stock_qty, min_stock_alert
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Oils
    // Notice item 1 and item 6 have stock below min_stock_alert for testing low stock alerts!
    insertInv.run(1, 'OIL-TOY-20W50-4L', 'زيت تويوتا أصلي معدني 20W-50 (دبة 4 لتر)', 'oil', 'تويوتا', '20W-50', '4L', null, 0, 22000, 26000, 3, 5); // LOW STOCK (3 <= 5)
    insertInv.run(2, 'OIL-TOY-20W50-1L', 'زيت تويوتا أصلي معدني 20W-50 (علبة 1 لتر)', 'oil', 'تويوتا', '20W-50', '1L', null, 0, 5800, 7000, 28, 10);
    insertInv.run(3, 'OIL-TOY-5W30-4L', 'زيت تويوتا تخليقي بالكامل 5W-30 (دبة 4 لتر)', 'oil', 'تويوتا', '5W-30', '4L', null, 0, 34000, 40000, 14, 4);
    insertInv.run(4, 'OIL-CAS-MAG-10W40-4L', 'زيت كاسترول ماجنتك نصف تخليقي 10W-40 (دبة 4 لتر)', 'oil', 'كاسترول', '10W-40', '4L', null, 0, 26000, 31000, 16, 5);
    insertInv.run(5, 'OIL-CAS-MAG-10W40-1L', 'زيت كاسترول ماجنتك 10W-40 (علبة 1 لتر)', 'oil', 'كاسترول', '10W-40', '1L', null, 0, 6800, 8200, 20, 8);
    insertInv.run(6, 'OIL-CAS-GTX-20W50-1L', 'زيت كاسترول GTX معدني 20W-50 (علبة 1 لتر)', 'oil', 'كاسترول', '20W-50', '1L', null, 0, 5500, 6800, 2, 6); // LOW STOCK (2 <= 6)
    insertInv.run(7, 'OIL-SHL-HX7-10W40-4L', 'زيت شل هيلكس HX7 نصف تخليقي 10W-40 (دبة 4 لتر)', 'oil', 'شل', '10W-40', '4L', null, 0, 25000, 29500, 12, 4);
    insertInv.run(8, 'OIL-SHL-ULT-5W30-4L', 'زيت شل هيلكس الترا تخليقي بالكامل 5W-30 (دبة 4 لتر)', 'oil', 'شل', '5W-30', '4L', null, 0, 36000, 42000, 9, 3);
    insertInv.run(9, 'OIL-TOT-7000-10W40-4L', 'زيت توتال كوارتز 7000 10W-40 (دبة 4 لتر)', 'oil', 'توتال', '10W-40', '4L', null, 0, 24500, 29000, 11, 4);
    insertInv.run(10, 'OIL-TOT-9000-5W30-5L', 'زيت توتال كوارتز 9000 تخليقي 5W-30 (دبة 5 لتر)', 'oil', 'توتال', '5W-30', '5L', null, 0, 42000, 49000, 8, 3);
    insertInv.run(11, 'OIL-SQR-20W50-4L', 'زيت صقر الوطني الممتاز 20W-50 (دبة 4 لتر)', 'oil', 'صقر', '20W-50', '4L', null, 0, 17500, 21000, 22, 6);
    insertInv.run(12, 'OIL-SQR-20W50-1L', 'زيت صقر الوطني 20W-50 (علبة 1 لتر)', 'oil', 'صقر', '20W-50', '1L', null, 0, 4500, 5500, 35, 10);
    insertInv.run(13, 'OIL-SHL-BULK', 'زيت محرك شل فلت معبأ من البرميل (باللتر)', 'oil', 'شل', '15W-40', 'bulk_liter', null, 0, 4800, 6200, 185.5, 40);

    // Filters
    insertInv.run(14, 'FLT-TOY-OIL-01', 'فلتر زيت تويوتا أصلي تايلندي (هايلوكس/برادو/لاند)', 'filter', 'تويوتا', null, 'unit', null, 0, 3200, 4500, 30, 8);
    insertInv.run(15, 'FLT-HYU-OIL-01', 'فلتر زيت هيونداي/كيا كوري أصلي (سنتافي/توسان/سبورتاج)', 'filter', 'هيونداي', null, 'unit', null, 0, 3000, 4200, 25, 6);
    insertInv.run(16, 'FLT-TOY-AIR-HLX', 'فلتر هواء محرك تويوتا هايلوكس دبل أصلي', 'filter', 'تويوتا', null, 'unit', null, 0, 4500, 6500, 15, 5);
    insertInv.run(17, 'FLT-ACC-CABIN', 'فلتر مكيف كربوني مضاد للروائح والغبار', 'filter', 'عام', null, 'unit', null, 0, 3500, 5000, 18, 4);

    // Tires & Batteries
    insertInv.run(18, 'TIRE-BRD-2656517', 'إطار بريدجستون دويلر ياباني 265/65R17', 'tire', 'بريدجستون', null, 'unit', '265/65R17', 12, 82000, 96000, 8, 4);
    insertInv.run(19, 'TIRE-HNK-2055516', 'إطار هانكوك كوري ممتاز 205/55R16', 'tire', 'هانكوك', null, 'unit', '205/55R16', 12, 48000, 57000, 14, 4);
    insertInv.run(20, 'BAT-BQR-70AH', 'بطارية باقر 70 أمبير كوري جافة صيانة مجانية', 'battery', 'باقر', null, 'unit', '70Ah', 12, 68000, 79000, 7, 3);
    insertInv.run(21, 'BAT-AML-55AH', 'بطارية أمل 55 أمبير ياباني تجميع وطني', 'battery', 'أمل', null, 'unit', '55Ah', 12, 49000, 58000, 9, 3);

    // Accessories
    insertInv.run(22, 'ACC-RAD-4L', 'ماء رديتر ميتسوبيشي أخضر مركز أصلي 4 لتر', 'accessory', 'ميتسوبيشي', null, '4L', null, 0, 5500, 7500, 16, 4);
    insertInv.run(23, 'ACC-BRK-DOT4', 'زيت فرامل بوش DOT4 ألماني أصلي 500 مل', 'accessory', 'بوش', null, 'unit', null, 0, 2200, 3200, 25, 6);

    // 3. Insert 5 Real Yemeni Vehicles & Customers
    const insertVeh = db.prepare(`
      INSERT INTO customers_vehicles (
        id, plate_number, plate_type, car_make_model, customer_name, phone,
        preferred_oil_brand, preferred_viscosity, last_odometer,
        next_due_odometer, next_due_date, balance_due, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Vehicle 1: Overdue! (Last service was ~60 days ago, due 18 days ago)
    insertVeh.run(1, '1-45892 خصوصي', 'خصوصي', 'تويوتا هايلوكس غمارتين دبل 2020', 'أحمد عبد الله الوادعي', '777123456', 'تويوتا', '20W-50', 125000, 128000, dateOverdue1, 0, addDaysToDate(today, -65));

    // Vehicle 2: Overdue with remaining debt!
    insertVeh.run(2, '1-78912 خصوصي', 'خصوصي', 'تويوتا برادو TXL 2016', 'محمد صادق الحبيشي', '771890123', 'كاسترول', '10W-40', 185000, 190000, dateOverdue2, 5000, addDaysToDate(today, -60));

    // Vehicle 3: Future due (Santa Fe)
    insertVeh.run(3, '1-33419 خصوصي', 'خصوصي', 'هيونداي سنتافي بانوراما 2019', 'خالد سعيد المقرمي', '733456789', 'شل', '5W-30', 94000, 102000, dateFuture1, 0, addDaysToDate(today, -20));

    // Vehicle 4: Future due (Sportage)
    insertVeh.run(4, '1-55241 خصوصي', 'خصوصي', 'كيا سبورتاج دبل 2018', 'عمار قائد الحميري', '780998877', 'توتال', '10W-40', 112000, 117000, dateFuture2, 0, addDaysToDate(today, -15));

    // Vehicle 5: Due soon! (HiAce Bus - high usage taxi)
    insertVeh.run(5, '2-12044 أجرة', 'أجرة', 'تويوتا باص هايس سقف عالي 2015', 'فؤاد صالح السعيدي', '711223344', 'صقر', '20W-50', 340000, 343000, dateApproaching, 12000, addDaysToDate(today, -25));

    // 4. Insert Past Historical Invoices
    const insertInvHead = db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, vehicle_id, worker_id, current_odometer, next_odometer,
        next_service_date, items_total, labor_total, scrap_battery_deduction, discount,
        net_total, payment_method, wallet_ref_number, paid_amount, remaining_debt,
        notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertInvItem = db.prepare(`
      INSERT INTO invoice_items (
        invoice_id, inventory_id, item_type, description, qty, unit_price, labor_fee, warranty_serial, subtotal
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Past Invoice 1 for Hilux (65 days ago)
    insertInvHead.run(
      1, 'INV-20260810-001', 1, 1, 125000, 128000, dateOverdue1,
      33000, 1500, 0, 500, 34000, 'cash', null, 34000, 0,
      'غيار زيت وفلتر زيت أصلي', addDaysToDate(today, -65)
    );
    insertInvItem.run(1, 1, 'product', 'زيت تويوتا أصلي 20W-50 دبة 4L', 1, 26000, 1000, null, 27000);
    insertInvItem.run(1, 2, 'product', 'زيت تويوتا أصلي 20W-50 علبة 1L', 1, 7000, 500, null, 7500);

    // Past Invoice 2 for Prado (60 days ago) - remaining 5000 debt
    insertInvHead.run(
      2, 'INV-20260815-002', 2, 1, 185000, 190000, dateOverdue2,
      43400, 2000, 0, 400, 45000, 'credit', null, 40000, 5000,
      'غيار زيت كاسترول ماجنتك وفلتر زيت مع رقعة تيوبلس', addDaysToDate(today, -60)
    );
    insertInvItem.run(2, 4, 'product', 'زيت كاسترول ماجنتك 10W-40 دبة 4L', 1, 31000, 1000, null, 32000);
    insertInvItem.run(2, 5, 'product', 'زيت كاسترول ماجنتك 10W-40 علبة 1L', 1, 8200, 500, null, 8700);
    insertInvItem.run(2, 14, 'product', 'فلتر زيت تويوتا أصلي', 1, 4500, 500, null, 5000);

    // 5. Insert Today's Realistic Invoices (For Daily Closing Report Testing)
    // Today Invoice 1: HiAce Taxi serviced today by Muadh (Oil Tech)
    insertInvHead.run(
      3, `INV-${today.replace(/-/g, '')}-001`, 5, 1, 340000, 343000, dateApproaching,
      26500, 2000, 0, 500, 28000, 'cash', null, 28000, 0,
      'غيار زيت صقر وفلتر زيت للباص', `${today} 09:30:00`
    );
    insertInvItem.run(3, 11, 'product', 'زيت صقر الوطني 20W-50 دبة 4L', 1, 21000, 1500, null, 22500);
    insertInvItem.run(3, 12, 'product', 'زيت صقر الوطني 20W-50 علبة 1L', 1, 5500, 500, null, 6000);

    // Today Invoice 2: Battery replacement with scrap battery trade-in by Yahya (Battery Tech) paid via Kuraimi E-Wallet!
    insertInvHead.run(
      4, `INV-${today.replace(/-/g, '')}-002`, 3, 3, 94000, 102000, dateFuture1,
      79000, 3000, 10000, 0, 72000, 'kuraimi', 'KUR-8849120', 72000, 0,
      'استبدال بطارية باقر 70Ah مع خصم البطارية الراجيع المسترجعة 10,000 ريال', `${today} 11:15:00`
    );
    insertInvItem.run(4, 20, 'product', 'بطارية باقر 70 أمبير جافة صيانة مجانية', 1, 79000, 3000, 'WAR-BQR-2026-778', 82000);

    // Today Invoice 3: Tire patch & wheel balancing by Hamdan (Tire Tech) paid via Jeeb E-Wallet & Cash
    insertInvHead.run(
      5, `INV-${today.replace(/-/g, '')}-003`, 4, 2, 112000, 117000, dateFuture2,
      0, 10000, 0, 0, 10000, 'jeeb', 'JB-332194', 10000, 0,
      'رقعة بنشر تيوبلس حراري مع ترصيص أرضي 4 عجلات', `${today} 14:40:00`
    );
    insertInvItem.run(5, null, 'service', 'رقعة بنشر حراري تيوبلس', 1, 0, 2500, null, 2500);
    insertInvItem.run(5, null, 'service', 'ترصيص أرضي ليزر (4 كفرات)', 4, 0, 7500, null, 7500);

    // 6. Insert Today's Daily Transactions (Expenses, Advance, Debt Collection)
    const insertTx = db.prepare(`
      INSERT INTO daily_transactions (tx_type, worker_id, vehicle_id, amount, payment_method, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Operational Expense 1: Lunch for team
    insertTx.run('expense', null, null, 5000, 'cash', 'غداء الفنيين والعمال في المركز', `${today} 13:00:00`);
    // Operational Expense 2: Shop cleaning supplies & rags
    insertTx.run('expense', null, null, 2500, 'cash', 'شراء خرق قطنية وصابون غسيل أيدي للمغسلة والبنشر', `${today} 10:00:00`);
    // Worker Advance: Advance to Muadh (Oil Tech)
    insertTx.run('worker_advance', 1, null, 4000, 'cash', 'سلفة يومية للفني معاذ الصبري خصماً من الراتب والعمولة', `${today} 15:30:00`);
    // Debt Collection: Customer paid partial debt in cash
    insertTx.run('debt_collection', null, 5, 5000, 'cash', 'تسديد دفعة من الحساب الآجل لباص فؤاد السعيدي', `${today} 16:15:00`);

    console.log('[Seed] Demo data successfully seeded!');
  });

  runSeed();
}

function seedExpenseCategories() {
  const catCount = db.prepare('SELECT COUNT(*) as count FROM expense_categories').get().count;
  if (catCount > 0) return;

  console.log('[Seed] Seeding default customizable expense categories...');
  const insertCat = db.prepare('INSERT INTO expense_categories (name, icon, is_system) VALUES (?, ?, ?)');
  const defaultCategories = [
    ['غداء وضيافة العمال', 'Coffee', 1],
    ['فواتير كهرباء وماء وماطور', 'Zap', 1],
    ['أدوات وعدد ومستلزمات بنشر', 'Wrench', 1],
    ['إيجار المحل', 'Home', 1],
    ['نقل ومشاوير بضاعة', 'Truck', 1],
    ['صيانة أجهزة ورافعات', 'Cpu', 1],
    ['نظافة وبلدية', 'Trash2', 1],
    ['مصاريف نثرية عامة', 'FileText', 1],
  ];

  for (const [name, icon, isSys] of defaultCategories) {
    try {
      insertCat.run(name, icon, isSys);
    } catch (e) {
      // ignore duplicates
    }
  }
}

function seedSuppliersAndPurchases() {
  const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
  if (supplierCount > 0) return;

  console.log('[Seed] Seeding suppliers and initial purchase bills...');
  const insertSupp = db.prepare(`
    INSERT INTO suppliers (id, name, phone, company_name, balance_due, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertSupp.run(1, 'شركة بازرعة للسيارات والمحركات', '771002233', 'وكيل تويوتا المعتمد في اليمن', 120000, 'وكيل زيوت وفلاتر تويوتا الأصلية');
  insertSupp.run(2, 'مؤسسة النصر لتجارة وتوزيع الزيوت', '773344112', 'موزع كاسترول وشل وتوتال', 0, 'وكيل زيوت كاسترول ماجنتك وشل هيلكس');
  insertSupp.run(3, 'وكالة باقر الوطنية للبطاريات', '775599881', 'موزع بطاريات باقر وأمل', 85000, 'بطاريات جافة ومائية وكفرات هانكوك');
  insertSupp.run(4, 'محلات العالمية لقطع الغيار والفلاتر', '772211990', 'مستورد فلاتر وإكسسوارات', 0, 'فلاتر هواء ومكيف وزيوت فرامل');

  // Seed sample initial purchase invoice
  const today = formatDate();
  const insertPur = db.prepare(`
    INSERT INTO purchases (
      id, purchase_number, supplier_id, supplier_name, invoice_ref,
      total_amount, paid_amount, remaining_debt, payment_method,
      paid_from_cash_drawer, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPurItem = db.prepare(`
    INSERT INTO purchase_items (
      purchase_id, inventory_id, qty, unit_cost, unit_sell, subtotal
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Past Purchase 1: Toyota oils and filters from Bazara (Total 320,000, Paid 200,000 cash from drawer, 120,000 remaining on account)
  insertPur.run(
    1, 'PUR-20261015-001', 1, 'شركة بازرعة للسيارات والمحركات', 'BAZ-88412',
    320000, 200000, 120000, 'cash', 1, 'توريد دفعة زيوت تويوتا 20W-50 وفلاتر أصلية', `${today} 08:00:00`
  );
  insertPurItem.run(1, 1, 10, 22000, 26000, 220000); // 10 cans 4L Toyota
  insertPurItem.run(1, 14, 20, 3200, 4500, 64000);   // 20 oil filters Toyota
  insertPurItem.run(1, 2, 5, 5800, 7000, 29000);     // 5 cans 1L Toyota

  // Past Purchase 2: Baqer batteries (Total 285,000, Paid 200,000 via Kuraimi, 85,000 remaining)
  insertPur.run(
    2, 'PUR-20261018-002', 3, 'وكالة باقر الوطنية للبطاريات', 'BQR-5519',
    285000, 200000, 85000, 'kuraimi', 0, 'توريد بطاريات باقر 70Ah وأمل 55Ah مع شهادات الضمان', `${today} 12:30:00`
  );
  insertPurItem.run(2, 20, 3, 68000, 79000, 204000); // 3 Baqer 70Ah
  insertPurItem.run(2, 21, 1, 49000, 58000, 49000);  // 1 Amal 55Ah
}

module.exports = { seedDatabase };
